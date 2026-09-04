/**
 * Background settings plugin — browser half.
 * Registers Settings → Background and paints the wallpaper from host-served paths.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { BackgroundController } from './controller.ts'
import { BackgroundSection, type BackgroundSectionInjected } from './BackgroundSection.tsx'
import { en, zh, type BackgroundKey } from './locales.ts'
import type { BackgroundSettings } from '../types.ts'

/** Locale + settings namespace keys. */
const LOCALE_NS = 'settings.background'
const SETTINGS_NS = 'dsh-background'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'settings.background': BackgroundKey
  }
}

export const inject = ['slots', 'locale', 'settingsScope', 'workspaces']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(LOCALE_NS, { zh, en }), 'dsh-background: locales')

  const scope = ctx.settingsScope.bind<BackgroundSettings>({ namespace: SETTINGS_NS })
  const controller = new BackgroundController(scope)
  ctx.effect(() => controller.start(), 'dsh-background: presenter')

  const pickDirectory = (): Promise<string | null> => ctx.workspaces.pickDirectory()

  const injected = (): BackgroundSectionInjected => ({ controller, pickDirectory })

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'background',
    order: 32,
    label: () => ctx.locale.bind(LOCALE_NS)('nav'),
    locale: LOCALE_NS,
    inject: injected,
  }, BackgroundSection))
}
