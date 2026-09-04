/**
 * Host-side schemastery schema for the durable settings section.
 */
import z from '@deepseek-ai/schemastery'
import type { BackgroundSettings } from './types.ts'
import { BACKGROUND_DEFAULTS } from './types.ts'

export type { BackgroundSettings }
export { BACKGROUND_DEFAULTS, normalizeOverlayColor } from './types.ts'

/** Durable settings schema. Every field carries a schema default. */
export const BackgroundSettingsSchema: z<BackgroundSettings> = z.object({
  enabled: z.boolean().default(BACKGROUND_DEFAULTS.enabled),
  mode: z.union(['image', 'folder']).default(BACKGROUND_DEFAULTS.mode),
  imagePath: z.string().default(BACKGROUND_DEFAULTS.imagePath),
  folderPath: z.string().default(BACKGROUND_DEFAULTS.folderPath),
  folderOrder: z.union(['sequential', 'random']).default(BACKGROUND_DEFAULTS.folderOrder),
  intervalSeconds: z.number().min(1).max(300).default(BACKGROUND_DEFAULTS.intervalSeconds),
  crossfadeSeconds: z.number().min(0.1).max(5).default(BACKGROUND_DEFAULTS.crossfadeSeconds),
  fit: z.union(['center', 'cover', 'contain', 'stretch']).default(BACKGROUND_DEFAULTS.fit),
  opacity: z.number().min(0).max(100).default(BACKGROUND_DEFAULTS.opacity),
  blur: z.number().min(0).max(20).default(BACKGROUND_DEFAULTS.blur),
  overlayOpacity: z.number().min(0).max(100).default(BACKGROUND_DEFAULTS.overlayOpacity),
  overlayColor: z.string().default(BACKGROUND_DEFAULTS.overlayColor),
  surface: z.number().min(20).max(100).default(BACKGROUND_DEFAULTS.surface),
  extendChrome: z.boolean().default(BACKGROUND_DEFAULTS.extendChrome),
  extendComposer: z.boolean().default(BACKGROUND_DEFAULTS.extendComposer),
  effectEnabled: z.boolean().default(BACKGROUND_DEFAULTS.effectEnabled),
  effectKind: z.union(['sakura', 'snow']).default(BACKGROUND_DEFAULTS.effectKind),
  effectDensity: z.number().min(1).max(100).default(BACKGROUND_DEFAULTS.effectDensity),
  effectSpeed: z.number().min(1).max(100).default(BACKGROUND_DEFAULTS.effectSpeed),
})
