/**
 * Presenter: watches the durable settings scope, paints a fixed wallpaper
 * stack (dual image layers + colored wash), and runs the folder carousel
 * with crossfade. The slideshow timer is scheduled independently so slider
 * updates do not keep resetting it.
 */
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import {
  BACKGROUND_DEFAULTS,
  normalizeOverlayColor,
  type BackgroundSettings,
} from '../types.ts'
import { PLUGIN_STYLES } from './style.ts'
import { EffectLayer } from './effects.ts'

const SOURCE = 'dsh-background'
const ROUTE_LIST = '/dsh-background/folder/list'
const ROUTE_FILE = '/dsh-background/file'
const ROUTE_PICK_IMAGE = '/dsh-background/pick-image'
const ROUTE_PICK_FOLDER = '/dsh-background/pick-folder'
const ROUTE_UPLOAD = '/dsh-background/upload'

export type FolderImage = {
  name: string
  size: number
  mtimeMs: number
  url: string
}

export type BackgroundUiState = {
  settings: BackgroundSettings
  scopeStatus: 'loading' | 'ready' | 'unavailable'
  images: FolderImage[]
  folder: string
  folderError: string | null
  currentUrl: string | null
  listing: boolean
}

function fitToBackgroundSize(fit: BackgroundSettings['fit']): string {
  switch (fit) {
    case 'center': return 'auto'
    case 'contain': return 'contain'
    case 'stretch': return '100% 100%'
    case 'cover':
    default: return 'cover'
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeOverlayColor(hex)
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  }
}

/** Theme-aware translucent fill for conversation / sidebar panels. */
function surfaceToken(settings: BackgroundSettings): string {
  const alpha = Math.max(0.15, Math.min(1, settings.surface / 100))
  const dark = document.body?.hasAttribute('data-ds-dark-theme') ?? false
  return dark
    ? `rgba(24, 24, 28, ${alpha})`
    : `rgba(255, 255, 255, ${alpha})`
}

function shuffleIndices(length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j]!, indices[i]!]
  }
  return indices
}

function clampInterval(seconds: number): number {
  return Math.max(1, Math.min(300, seconds))
}

function clampCrossfade(seconds: number): number {
  return Math.max(0.1, Math.min(5, seconds))
}

export class BackgroundController {
  private readonly scope: SettingsScope<BackgroundSettings>
  private readonly listeners = new Set<() => void>()
  private state: BackgroundUiState = {
    settings: BACKGROUND_DEFAULTS,
    scopeStatus: 'loading',
    images: [],
    folder: '',
    folderError: null,
    currentUrl: null,
    listing: false,
  }

  private styleEl: HTMLStyleElement | undefined
  private rootEl: HTMLDivElement | undefined
  private imageEls: [HTMLDivElement, HTMLDivElement] | undefined
  private overlayEl: HTMLDivElement | undefined
  private front = 0
  private displayedUrl: string | null = null
  private timer: ReturnType<typeof setInterval> | undefined
  private timerKey = ''
  private carouselIndex = 0
  private randomOrder: number[] = []
  private listSeq = 0
  private listedFolder = ''
  private unsubScope: (() => void) | undefined
  private themeObserver: MutationObserver | undefined
  private effects = new EffectLayer()
  private fadeToken = 0
  private fading = false
  private pendingUrl: string | null = null

  constructor(scope: SettingsScope<BackgroundSettings>) {
    this.scope = scope
  }

  readonly getSnapshot = (): BackgroundUiState => this.state

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** Bind DOM + settings subscription; returns disposer. */
  start(): () => void {
    this.ensureDom()

    this.unsubScope = this.scope.subscribe(() => { this.onScope() })
    this.onScope()

    if (document.body !== null) {
      this.themeObserver = new MutationObserver(() => { this.syncPresentation(false) })
      this.themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-ds-dark-theme'],
      })
    }

    return () => {
      this.themeObserver?.disconnect()
      this.themeObserver = undefined
      this.unsubScope?.()
      this.unsubScope = undefined
      this.clearTimer()
      this.effects.unmount()
      this.teardownDom()
    }
  }

  async setField<K extends keyof BackgroundSettings>(
    field: K,
    value: BackgroundSettings[K],
  ): Promise<void> {
    await this.scope.set(field, value)
  }

  async refreshFolderList(): Promise<void> {
    const folderPath = this.state.settings.folderPath
    if (folderPath === '') {
      this.listedFolder = ''
      this.publish({
        ...this.state,
        images: [],
        folder: '',
        folderError: null,
        listing: false,
      })
      this.syncPresentation(false)
      return
    }
    const seq = ++this.listSeq
    this.publish({ ...this.state, listing: true, folderError: null })
    try {
      const response = await fetch(ROUTE_LIST, { cache: 'no-store' })
      const body = await response.json() as {
        folder?: string
        images?: FolderImage[]
        error?: string
      }
      if (seq !== this.listSeq) return
      if (!response.ok) {
        this.publish({
          ...this.state,
          listing: false,
          images: [],
          folder: body.folder ?? folderPath,
          folderError: body.error ?? 'folder-error',
        })
        this.syncPresentation(false)
        return
      }
      const images = body.images ?? []
      const folderChanged = this.listedFolder !== folderPath
      this.listedFolder = folderPath
      if (folderChanged) {
        this.carouselIndex = 0
        this.randomOrder = shuffleIndices(images.length)
      } else if (this.randomOrder.length !== images.length) {
        this.randomOrder = shuffleIndices(images.length)
      }
      this.publish({
        ...this.state,
        listing: false,
        images,
        folder: body.folder ?? folderPath,
        folderError: images.length === 0 ? 'empty' : null,
      })
      this.syncPresentation(false)
    } catch {
      if (seq !== this.listSeq) return
      this.publish({
        ...this.state,
        listing: false,
        images: [],
        folderError: 'folder-error',
      })
      this.syncPresentation(false)
    }
  }

  /** Host-native image file dialog; null = cancelled or unavailable. */
  async pickImageFile(): Promise<string | null> {
    const response = await fetch(ROUTE_PICK_IMAGE, { cache: 'no-store' })
    const body = await response.json() as { path?: string | null }
    if (!response.ok || typeof body.path !== 'string' || body.path === '') return null
    return body.path
  }

  /** Host-native folder dialog; null = cancelled or unavailable. */
  async pickFolderPath(): Promise<string | null> {
    try {
      const response = await fetch(ROUTE_PICK_FOLDER, { cache: 'no-store' })
      const body = await response.json() as { path?: string | null }
      if (!response.ok || typeof body.path !== 'string' || body.path === '') return null
      return body.path
    } catch {
      return null
    }
  }

  /** Browser file-input fallback: upload bytes to host, return absolute path. */
  async uploadImageFile(file: File): Promise<string | null> {
    const response = await fetch(ROUTE_UPLOAD, {
      method: 'POST',
      headers: {
        'content-type': file.type || 'application/octet-stream',
        'x-filename': file.name,
      },
      body: file,
    })
    const body = await response.json() as { path?: string; error?: string }
    if (!response.ok || typeof body.path !== 'string') return null
    return body.path
  }

  private publish(next: BackgroundUiState): void {
    this.state = next
    for (const listener of this.listeners) listener()
  }

  private onScope(): void {
    const snap = this.scope.getSnapshot()
    const settings = snap.status === 'ready' && snap.value !== undefined
      ? snap.value
      : BACKGROUND_DEFAULTS
    const prev = this.state.settings
    this.publish({
      ...this.state,
      settings,
      scopeStatus: snap.status,
    })

    const folderPathChanged = prev.folderPath !== settings.folderPath
    const modeChanged = prev.mode !== settings.mode
    const enabledChanged = settings.enabled !== prev.enabled
    if (settings.enabled && settings.mode === 'folder' && settings.folderPath !== '') {
      if (folderPathChanged || modeChanged || enabledChanged || this.state.images.length === 0) {
        void this.refreshFolderList()
      } else {
        this.syncPresentation(false)
      }
    } else {
      this.syncPresentation(false)
    }
  }

  private ensureDom(): void {
    if (this.styleEl === undefined) {
      const style = document.createElement('style')
      style.dataset.plugin = SOURCE
      style.textContent = PLUGIN_STYLES
      document.head.appendChild(style)
      this.styleEl = style
    }
    if (this.rootEl === undefined) {
      const root = document.createElement('div')
      root.dataset.dshBgRoot = ''
      root.setAttribute('aria-hidden', 'true')
      const a = document.createElement('div')
      a.dataset.dshBgImage = '0'
      const b = document.createElement('div')
      b.dataset.dshBgImage = '1'
      const overlay = document.createElement('div')
      overlay.dataset.dshBgOverlay = ''
      root.append(a, b, overlay)
      ;(document.body ?? document.documentElement).prepend(root)
      this.rootEl = root
      this.imageEls = [a, b]
      this.overlayEl = overlay
      this.front = 0
      this.displayedUrl = null
      this.effects.mount(root)
    }
  }

  private teardownDom(): void {
    document.body?.removeAttribute('data-dsh-background')
    document.body?.removeAttribute('data-dsh-background-extend')
    document.body?.removeAttribute('data-dsh-background-composer')
    document.body?.style.removeProperty('--dsh-bg-surface')
    this.rootEl?.remove()
    this.rootEl = undefined
    this.imageEls = undefined
    this.overlayEl = undefined
    this.styleEl?.remove()
    this.styleEl = undefined
    this.displayedUrl = null
    this.front = 0
  }

  private clearTimer(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer)
      this.timer = undefined
    }
    this.timerKey = ''
  }

  /** Arm slideshow timer only when schedule inputs change. */
  private ensureCarouselTimer(): void {
    const { settings, images } = this.state
    const shouldRun = settings.enabled
      && settings.mode === 'folder'
      && images.length > 1
    const interval = clampInterval(settings.intervalSeconds)
    const fade = clampCrossfade(settings.crossfadeSeconds)
    const key = shouldRun
      ? `run:${interval}:${fade}:${images.length}:${settings.folderOrder}`
      : 'off'
    if (key === this.timerKey) return
    if (this.timer !== undefined) {
      clearInterval(this.timer)
      this.timer = undefined
    }
    this.timerKey = key
    if (!shouldRun) {
      return
    }
    const ms = Math.max(interval, clampCrossfade(settings.crossfadeSeconds) + 0.15) * 1000
    this.timer = setInterval(() => { this.advanceCarousel() }, ms)
  }

  private fileUrl(settings: BackgroundSettings): string | null {
    if (settings.imagePath === '') return null
    return ROUTE_FILE
  }

  private currentFolderUrl(): string | null {
    const { images, settings } = this.state
    if (images.length === 0) return null
    if (settings.folderOrder === 'random') {
      if (this.randomOrder.length !== images.length) {
        this.randomOrder = shuffleIndices(images.length)
      }
      const idx = this.randomOrder[this.carouselIndex % this.randomOrder.length] ?? 0
      return images[idx]?.url ?? null
    }
    return images[this.carouselIndex % images.length]?.url ?? null
  }

  private advanceCarousel(): void {
    if (this.fading) return
    const n = this.state.images.length
    if (n === 0 || this.state.settings.mode !== 'folder') return
    this.carouselIndex = (this.carouselIndex + 1) % n
    if (this.state.settings.folderOrder === 'random' && this.carouselIndex === 0) {
      this.randomOrder = shuffleIndices(n)
    }
    this.syncPresentation(true)
  }

  private styleLayer(el: HTMLDivElement, settings: BackgroundSettings): void {
    el.style.backgroundSize = fitToBackgroundSize(settings.fit)
    el.style.filter = settings.blur > 0 ? `blur(${Math.min(20, settings.blur)}px)` : 'none'
    const scale = settings.blur > 0 ? 1 + Math.min(20, settings.blur) / 400 : 1
    el.style.transform = scale === 1 ? 'none' : `scale(${scale})`
  }

  private paintUrl(url: string | null, crossfade: boolean): void {
    this.ensureDom()
    const settings = this.state.settings
    const imageOpacity = Math.max(0, Math.min(1, settings.opacity / 100))
    const layers = this.imageEls
    if (layers === undefined) return

    if (url === null) {
      this.fadeToken += 1
      this.fading = false
      this.pendingUrl = null
      for (const el of layers) {
        el.style.transition = 'none'
        el.style.backgroundImage = 'none'
        el.style.opacity = '0'
        el.style.zIndex = '0'
      }
      this.displayedUrl = null
      return
    }

    // Same URL already shown, or mid-crossfade to this URL: restyle only (never hard-cut).
    if (url === this.displayedUrl || (this.fading && url === this.pendingUrl)) {
      const front = layers[this.front]!
      this.styleLayer(front, settings)
      if (!this.fading) {
        front.style.transition = 'none'
        front.style.opacity = String(imageOpacity)
        front.style.zIndex = '2'
        const back = layers[1 - this.front]!
        back.style.opacity = '0'
        back.style.zIndex = '1'
      }
      return
    }

    const applySwap = (withFade: boolean): void => {
      const next = (1 - this.front) as 0 | 1
      const incoming = layers[next]!
      const outgoing = layers[this.front]!
      this.styleLayer(incoming, settings)
      this.styleLayer(outgoing, settings)
      incoming.style.backgroundImage = `url("${url}")`

      // User's crossfadeSeconds is authoritative; do not suppress via prefers-reduced-motion.
      const duration = withFade ? clampCrossfade(settings.crossfadeSeconds) : 0

      if (duration <= 0) {
        this.fading = false
        this.pendingUrl = null
        incoming.style.transition = 'none'
        outgoing.style.transition = 'none'
        incoming.style.zIndex = '2'
        outgoing.style.zIndex = '1'
        incoming.style.opacity = String(imageOpacity)
        outgoing.style.opacity = '0'
        outgoing.style.backgroundImage = 'none'
        this.front = next
        this.displayedUrl = url
        return
      }

      const token = ++this.fadeToken
      this.fading = true
      this.pendingUrl = url
      incoming.style.transition = 'none'
      incoming.style.opacity = '0'
      incoming.style.zIndex = '2'
      outgoing.style.zIndex = '1'
      // Two frames: commit baseline, then start opacity transition.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (token !== this.fadeToken) return
          incoming.style.transition = `opacity ${duration}s ease-in-out`
          outgoing.style.transition = `opacity ${duration}s ease-in-out`
          incoming.style.opacity = String(imageOpacity)
          outgoing.style.opacity = '0'
          this.front = next
          this.displayedUrl = url
          window.setTimeout(() => {
            if (token !== this.fadeToken) return
            this.fading = false
            this.pendingUrl = null
            outgoing.style.transition = 'none'
            outgoing.style.backgroundImage = 'none'
          }, Math.ceil(duration * 1000) + 40)
        })
      })
    }

    if (!crossfade) {
      applySwap(false)
      return
    }

    // Preload so the fade does not start on an empty layer (looks like a hard cut).
    this.fading = true
    this.pendingUrl = url
    const probe = new Image()
    const token = ++this.fadeToken
    probe.onload = () => {
      if (token !== this.fadeToken) return
      applySwap(true)
    }
    probe.onerror = () => {
      if (token !== this.fadeToken) return
      applySwap(true)
    }
    probe.src = url
  }

  private syncPresentation(crossfade: boolean): void {
    this.ensureDom()
    const { settings } = this.state
    const active = settings.enabled && (
      (settings.mode === 'image' && settings.imagePath !== '')
      || (settings.mode === 'folder' && this.state.images.length > 0)
    )

    if (!active) {
      this.clearTimer()
      document.body?.removeAttribute('data-dsh-background')
      document.body?.removeAttribute('data-dsh-background-extend')
      document.body?.removeAttribute('data-dsh-background-composer')
      document.body?.style.removeProperty('--dsh-bg-surface')
      this.paintUrl(null, false)
      if (this.overlayEl) this.overlayEl.style.opacity = '0'
      this.effects.setConfig(false, settings.effectKind, settings.effectDensity, settings.effectSpeed)
      this.publish({ ...this.state, currentUrl: null })
      return
    }

    const url = settings.mode === 'image'
      ? this.fileUrl(settings)
      : this.currentFolderUrl()

    const rgb = hexToRgb(settings.overlayColor)
    const overlayAlpha = Math.max(0, Math.min(1, settings.overlayOpacity / 100))
    this.paintUrl(url, crossfade && settings.mode === 'folder')
    if (this.overlayEl) {
      this.overlayEl.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${overlayAlpha})`
      this.overlayEl.style.opacity = '1'
    }

    document.body?.setAttribute('data-dsh-background', 'on')
    document.body?.style.setProperty('--dsh-bg-surface', surfaceToken(settings))
    if (settings.extendChrome) {
      document.body?.setAttribute('data-dsh-background-extend', 'on')
    } else {
      document.body?.removeAttribute('data-dsh-background-extend')
    }
    if (settings.extendComposer !== false) {
      document.body?.setAttribute('data-dsh-background-composer', 'on')
    } else {
      document.body?.removeAttribute('data-dsh-background-composer')
    }

    this.ensureCarouselTimer()
    this.effects.setConfig(
      settings.effectEnabled && settings.enabled,
      settings.effectKind,
      settings.effectDensity,
      settings.effectSpeed,
    )
    this.publish({ ...this.state, currentUrl: url })
  }
}
