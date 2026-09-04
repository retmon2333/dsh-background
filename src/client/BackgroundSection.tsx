/**
 * Settings → Background page.
 */
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { BackgroundController } from './controller.ts'
import type { BackgroundKey } from './locales.ts'
import { normalizeOverlayColor, type BackgroundSettings } from '../types.ts'

export interface BackgroundSectionInjected {
  controller: BackgroundController
  pickDirectory: () => Promise<string | null>
}

export type BackgroundSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.background'>
  & InjectFace<BackgroundSectionInjected>

function RangeRow(props: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format: (v: number) => string
  onChange: (v: number) => void
  disabled?: boolean
}): ReactNode {
  const { label, value, min, max, step = 1, format, onChange, disabled } = props
  return (
    <div className="dsh-bg-section__range">
      <div className="dsh-bg-section__range-meta">
        <span>{label}</span>
        <output>{format(value)}</output>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => { onChange(Number(event.currentTarget.value)) }}
      />
    </div>
  )
}

function Seg(props: {
  value: string
  options: Array<{ id: string; label: string }>
  onChange: (id: string) => void
  disabled?: boolean
}): ReactNode {
  return (
    <div className="dsh-bg-section__seg" role="group">
      {props.options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          aria-pressed={props.value === opt.id}
          disabled={props.disabled}
          onClick={() => { props.onChange(opt.id) }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Group(props: {
  title: string
  children: ReactNode
}): ReactNode {
  return (
    <section className="dsh-bg-section__group">
      <h3 className="dsh-bg-section__group-title">{props.title}</h3>
      <div className="dsh-bg-section__group-body">{props.children}</div>
    </section>
  )
}

export function BackgroundSection({
  controller,
  pickDirectory,
  t,
}: BackgroundSectionProps): ReactNode {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  const settings = state.settings
  const enabled = settings.enabled
  const [pathDraft, setPathDraft] = useState(
    settings.mode === 'image' ? settings.imagePath : settings.folderPath,
  )
  const [picking, setPicking] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setPathDraft(settings.mode === 'image' ? settings.imagePath : settings.folderPath)
  }, [settings.mode, settings.imagePath, settings.folderPath])

  const text = (key: BackgroundKey): string => t(key)
  const patch = <K extends keyof BackgroundSettings>(field: K, value: BackgroundSettings[K]): void => {
    void controller.setField(field, value)
  }

  const browseFolder = async (): Promise<void> => {
    setPicking(true)
    try {
      let dir = await controller.pickFolderPath()
      if (dir === null) {
        dir = await Promise.race([
          pickDirectory(),
          new Promise<null>((resolve) => { window.setTimeout(() => { resolve(null) }, 120_000) }),
        ])
      }
      if (dir === null) return
      setPathDraft(dir)
      await controller.setField('folderPath', dir)
      await controller.refreshFolderList()
    } catch {
      // ignore picker errors
    } finally {
      setPicking(false)
    }
  }

  const browseImage = async (): Promise<void> => {
    setPicking(true)
    try {
      let path: string | null = null
      try {
        path = await controller.pickImageFile()
      } catch {
        fileRef.current?.click()
        return
      }
      if (path === null) return
      setPathDraft(path)
      await controller.setField('imagePath', path)
    } finally {
      setPicking(false)
    }
  }

  const onFilePicked = (file: File | undefined): void => {
    if (file === undefined) return
    void controller.uploadImageFile(file).then((path) => {
      if (path === null) return
      setPathDraft(path)
      return controller.setField('imagePath', path)
    })
  }

  const commitPath = (): void => {
    const next = pathDraft.trim()
    if (settings.mode === 'image') patch('imagePath', next)
    else patch('folderPath', next)
  }

  const previewUrl = state.currentUrl
  const blurValue = Math.min(20, settings.blur)
  const effectSpeed = settings.effectSpeed ?? 40

  return (
    <div className="dsh-bg-section">
      <header className="dsh-bg-section__header">
        <div className="dsh-bg-section__title-row">
          <div>
            <h2>{text('title')}</h2>
            <p className="dsh-bg-section__intro">{text('intro')}</p>
          </div>
          <label className="dsh-bg-section__toggle" title={text('enabled')}>
            <input
              id="dsh-bg-enabled"
              type="checkbox"
              checked={enabled}
              onChange={(event) => { patch('enabled', event.currentTarget.checked) }}
            />
            <span />
          </label>
        </div>
        <p className="dsh-bg-section__enable-label">{text('enabled')}</p>
      </header>

      {!enabled && (
        <p className="dsh-bg-section__banner">{text('disabledBanner')}</p>
      )}

      <div className="dsh-bg-section__controls" data-disabled={enabled ? 'false' : 'true'}>
        <Group title={text('groupSource')}>
          <div className="dsh-bg-section__field">
            <span>{text('mode')}</span>
            <Seg
              value={settings.mode}
              disabled={!enabled}
              onChange={(id) => { patch('mode', id as BackgroundSettings['mode']) }}
              options={[
                { id: 'image', label: text('modeImage') },
                { id: 'folder', label: text('modeFolder') },
              ]}
            />
          </div>

          <div className="dsh-bg-section__field">
            <span>{settings.mode === 'image' ? text('imagePath') : text('folderPath')}</span>
            <p className="dsh-bg-section__hint">
              {settings.mode === 'image' ? text('imagePathHint') : text('folderPathHint')}
            </p>
            <div className="dsh-bg-section__path-row">
              <input
                type="text"
                value={pathDraft}
                disabled={!enabled}
                spellCheck={false}
                onChange={(event) => { setPathDraft(event.currentTarget.value) }}
                onBlur={commitPath}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur()
                }}
              />
              {settings.mode === 'image' ? (
                <button type="button" disabled={!enabled || picking} onClick={() => { void browseImage() }}>
                  {text('browseImage')}
                </button>
              ) : (
                <button type="button" disabled={!enabled || picking} onClick={() => { void browseFolder() }}>
                  {text('browseFolder')}
                </button>
              )}
              {settings.mode === 'image' && settings.imagePath !== '' && (
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={() => {
                    setPathDraft('')
                    patch('imagePath', '')
                  }}
                >
                  {text('clearImage')}
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif"
              style={{ display: 'none' }}
              onChange={(event) => {
                onFilePicked(event.currentTarget.files?.[0])
                event.currentTarget.value = ''
              }}
            />
          </div>

          {previewUrl !== null && (
            <div className="dsh-bg-section__field">
              <span>{text('preview')}</span>
              <div className="dsh-bg-section__preview">
                <img src={previewUrl} alt="" />
              </div>
            </div>
          )}
        </Group>

        {settings.mode === 'folder' && (
          <Group title={text('groupPlayback')}>
            <div className="dsh-bg-section__dual">
              <div className="dsh-bg-section__field">
                <span>{text('folderOrder')}</span>
                <Seg
                  value={settings.folderOrder}
                  disabled={!enabled}
                  onChange={(id) => { patch('folderOrder', id as BackgroundSettings['folderOrder']) }}
                  options={[
                    { id: 'sequential', label: text('orderSequential') },
                    { id: 'random', label: text('orderRandom') },
                  ]}
                />
                <p className="dsh-bg-section__meta">
                  {state.folderError === 'empty' || state.folderError === 'folder-error'
                    ? (state.folderError === 'empty' ? text('noImages') : text('folderError'))
                    : `${state.images.length} ${text('imageCount')}`}
                </p>
              </div>
              <div className="dsh-bg-section__field">
                <span>{text('fit')}</span>
                <Seg
                  value={settings.fit}
                  disabled={!enabled}
                  onChange={(id) => { patch('fit', id as BackgroundSettings['fit']) }}
                  options={[
                    { id: 'center', label: text('fitCenter') },
                    { id: 'cover', label: text('fitCover') },
                    { id: 'contain', label: text('fitContain') },
                    { id: 'stretch', label: text('fitStretch') },
                  ]}
                />
              </div>
            </div>

            <div className="dsh-bg-section__dual">
              <RangeRow
                label={text('interval')}
                value={Math.min(300, settings.intervalSeconds)}
                min={1}
                max={300}
                step={1}
                disabled={!enabled}
                format={(v) => `${v} ${text('intervalUnit')}`}
                onChange={(v) => { patch('intervalSeconds', v) }}
              />
              <RangeRow
                label={text('crossfade')}
                value={settings.crossfadeSeconds}
                min={0.1}
                max={5}
                step={0.1}
                disabled={!enabled}
                format={(v) => `${v.toFixed(1)} ${text('crossfadeUnit')}`}
                onChange={(v) => { patch('crossfadeSeconds', Math.round(v * 10) / 10) }}
              />
            </div>
          </Group>
        )}

        <Group title={text('groupLook')}>
          <div className="dsh-bg-section__row dsh-bg-section__row--inset">
            <div>
              <label htmlFor="dsh-bg-extend">{text('extendChrome')}</label>
              <p className="dsh-bg-section__hint">{text('extendChromeHint')}</p>
            </div>
            <label className="dsh-bg-section__toggle">
              <input
                id="dsh-bg-extend"
                type="checkbox"
                checked={settings.extendChrome}
                disabled={!enabled}
                onChange={(event) => { patch('extendChrome', event.currentTarget.checked) }}
              />
              <span />
            </label>
          </div>

          <div className="dsh-bg-section__row dsh-bg-section__row--inset">
            <div>
              <label htmlFor="dsh-bg-extend-composer">{text('extendComposer')}</label>
              <p className="dsh-bg-section__hint">{text('extendComposerHint')}</p>
            </div>
            <label className="dsh-bg-section__toggle">
              <input
                id="dsh-bg-extend-composer"
                type="checkbox"
                checked={settings.extendComposer !== false}
                disabled={!enabled}
                onChange={(event) => { patch('extendComposer', event.currentTarget.checked) }}
              />
              <span />
            </label>
          </div>

          {settings.mode === 'image' && (
            <div className="dsh-bg-section__field">
              <span>{text('fit')}</span>
              <Seg
                value={settings.fit}
                disabled={!enabled}
                onChange={(id) => { patch('fit', id as BackgroundSettings['fit']) }}
                options={[
                  { id: 'center', label: text('fitCenter') },
                  { id: 'cover', label: text('fitCover') },
                  { id: 'contain', label: text('fitContain') },
                  { id: 'stretch', label: text('fitStretch') },
                ]}
              />
            </div>
          )}

          <div className="dsh-bg-section__dual">
            <RangeRow
              label={text('opacity')}
              value={settings.opacity}
              min={0}
              max={100}
              disabled={!enabled}
              format={(v) => `${v}%`}
              onChange={(v) => { patch('opacity', v) }}
            />
            <RangeRow
              label={text('blur')}
              value={blurValue}
              min={0}
              max={20}
              disabled={!enabled}
              format={(v) => `${v} px`}
              onChange={(v) => { patch('blur', v) }}
            />
          </div>

          <div className="dsh-bg-section__dual">
            <RangeRow
              label={text('overlayOpacity')}
              value={settings.overlayOpacity}
              min={0}
              max={100}
              disabled={!enabled}
              format={(v) => `${v}%`}
              onChange={(v) => { patch('overlayOpacity', v) }}
            />
            <RangeRow
              label={text('surface')}
              value={settings.surface}
              min={20}
              max={100}
              disabled={!enabled}
              format={(v) => `${v}%`}
              onChange={(v) => { patch('surface', v) }}
            />
          </div>
          <p className="dsh-bg-section__hint dsh-bg-section__hint--flush">{text('surfaceHint')}</p>

          <div className="dsh-bg-section__field">
            <span>{text('overlayColor')}</span>
            <div className="dsh-bg-section__color">
              <input
                type="color"
                disabled={!enabled}
                value={normalizeOverlayColor(settings.overlayColor)}
                onChange={(event) => {
                  patch('overlayColor', normalizeOverlayColor(event.currentTarget.value))
                }}
              />
              <input
                type="text"
                disabled={!enabled}
                spellCheck={false}
                value={settings.overlayColor}
                onChange={(event) => {
                  const raw = event.currentTarget.value
                  patch('overlayColor', normalizeOverlayColor(raw, settings.overlayColor))
                }}
              />
            </div>
          </div>
        </Group>

        <Group title={text('groupEffect')}>
          <div className="dsh-bg-section__row dsh-bg-section__row--inset">
            <div>
              <label htmlFor="dsh-bg-effect">{text('effectEnabled')}</label>
              <p className="dsh-bg-section__hint">{text('effectHint')}</p>
            </div>
            <label className="dsh-bg-section__toggle">
              <input
                id="dsh-bg-effect"
                type="checkbox"
                checked={settings.effectEnabled}
                disabled={!enabled}
                onChange={(event) => {
                  patch('effectEnabled', event.currentTarget.checked)
                }}
              />
              <span />
            </label>
          </div>

          <div className="dsh-bg-section__field">
            <span>{text('effect')}</span>
            <Seg
              value={settings.effectKind}
              disabled={!enabled || !settings.effectEnabled}
              onChange={(id) => { patch('effectKind', id as BackgroundSettings['effectKind']) }}
              options={[
                { id: 'sakura', label: text('effectSakura') },
                { id: 'snow', label: text('effectSnow') },
              ]}
            />
          </div>

          <div className="dsh-bg-section__dual">
            <RangeRow
              label={text('effectDensity')}
              value={settings.effectDensity}
              min={1}
              max={100}
              disabled={!enabled || !settings.effectEnabled}
              format={(v) => `${v}%`}
              onChange={(v) => { patch('effectDensity', v) }}
            />
            <RangeRow
              label={text('effectSpeed')}
              value={effectSpeed}
              min={1}
              max={100}
              disabled={!enabled || !settings.effectEnabled}
              format={(v) => `${v}%`}
              onChange={(v) => { patch('effectSpeed', v) }}
            />
          </div>
        </Group>
      </div>
    </div>
  )
}
