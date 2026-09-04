/**
 * Shared settings shape + defaults (no schemastery — safe for the browser bundle).
 */

/** Resolved settings section owned by this plugin. */
export type BackgroundSettings = {
  enabled: boolean
  mode: 'image' | 'folder'
  imagePath: string
  folderPath: string
  folderOrder: 'sequential' | 'random'
  /** Seconds between slideshow advances (folder mode), 1–300. */
  intervalSeconds: number
  /** Crossfade duration in seconds when advancing (folder mode), 0.1–5. */
  crossfadeSeconds: number
  fit: 'center' | 'cover' | 'contain' | 'stretch'
  opacity: number
  blur: number
  overlayOpacity: number
  overlayColor: string
  surface: number
  extendChrome: boolean
  /** Translucify composer / message input so wallpaper shows through. */
  extendComposer: boolean
  /** Falling particle overlay. */
  effectEnabled: boolean
  effectKind: 'sakura' | 'snow'
  /** Particle density 1–100. */
  effectDensity: number
  /** Fall speed 1–100 (slow → fast). */
  effectSpeed: number
}

const HEX = /^#[0-9A-Fa-f]{6}$/

/** Defaults used when the scope is still loading / first install. */
export const BACKGROUND_DEFAULTS: BackgroundSettings = {
  enabled: true,
  mode: 'image',
  /** Host `apply()` fills the absolute path to `assets/default-wallpaper.jpg`. */
  imagePath: '',
  folderPath: '',
  folderOrder: 'random',
  intervalSeconds: 5,
  crossfadeSeconds: 2,
  fit: 'cover',
  opacity: 100,
  blur: 0,
  overlayOpacity: 20,
  overlayColor: '#000000',
  surface: 40,
  extendChrome: false,
  extendComposer: true,
  effectEnabled: true,
  effectKind: 'sakura',
  effectDensity: 45,
  effectSpeed: 40,
}

/** Normalize a color to #RRGGBB or fall back. */
export function normalizeOverlayColor(value: string, fallback = '#000000'): string {
  const trimmed = value.trim()
  if (HEX.test(trimmed)) return trimmed.toLowerCase()
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) return `#${trimmed.toLowerCase()}`
  return fallback
}
