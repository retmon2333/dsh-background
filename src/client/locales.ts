/** zh / en copy for the Background settings page. */

export type BackgroundKey =
  | 'nav'
  | 'title'
  | 'intro'
  | 'enabled'
  | 'enabledHint'
  | 'mode'
  | 'modeImage'
  | 'modeFolder'
  | 'imagePath'
  | 'imagePathHint'
  | 'browseFolder'
  | 'browseImage'
  | 'pickImage'
  | 'clearImage'
  | 'folderPath'
  | 'folderPathHint'
  | 'folderOrder'
  | 'orderSequential'
  | 'orderRandom'
  | 'interval'
  | 'intervalUnit'
  | 'crossfade'
  | 'crossfadeUnit'
  | 'fit'
  | 'fitCenter'
  | 'fitCover'
  | 'fitContain'
  | 'fitStretch'
  | 'opacity'
  | 'blur'
  | 'overlayOpacity'
  | 'overlayColor'
  | 'surface'
  | 'surfaceHint'
  | 'extendChrome'
  | 'extendChromeHint'
  | 'extendComposer'
  | 'extendComposerHint'
  | 'preview'
  | 'noImages'
  | 'folderError'
  | 'imageCount'
  | 'disabledBanner'
  | 'effect'
  | 'effectEnabled'
  | 'effectHint'
  | 'effectSakura'
  | 'effectSnow'
  | 'effectDensity'
  | 'effectSpeed'
  | 'groupSource'
  | 'groupPlayback'
  | 'groupLook'
  | 'groupEffect'

export const zh: Record<BackgroundKey, string> = {
  nav: '背景',
  title: '界面背景',
  intro: '用本机图片或文件夹作为 Harness Web 壁纸，可调填充、透明、模糊与遮罩。',
  enabled: '启用背景',
  enabledHint: '关闭后还原默认界面，下方选项会变为不可用。',
  mode: '来源',
  modeImage: '单张图片',
  modeFolder: '图片文件夹',
  imagePath: '图片绝对路径',
  imagePathHint: '点击「选择图片」打开系统文件对话框（仅图片），或粘贴本机绝对路径。',
  browseFolder: '选择文件夹…',
  browseImage: '选择图片…',
  pickImage: '从文件夹挑选',
  clearImage: '清除路径',
  folderPath: '文件夹路径',
  folderPathHint: '通过系统目录选择器选取，或手动粘贴绝对路径。',
  folderOrder: '播放顺序',
  orderSequential: '顺序',
  orderRandom: '随机',
  interval: '切换间隔',
  intervalUnit: '秒',
  crossfade: '叠化时间',
  crossfadeUnit: '秒',
  fit: '填充方式',
  fitCenter: '居中',
  fitCover: '覆盖',
  fitContain: '包含',
  fitStretch: '拉伸',
  opacity: '图片透明度',
  blur: '模糊度',
  overlayOpacity: '遮罩透明度',
  overlayColor: '遮罩颜色',
  surface: '面板透明度',
  surfaceHint: '对话列（以及开启扩展后的左侧栏）的半透明程度。',
  extendChrome: '扩展到左侧栏',
  extendChromeHint: '开启后左侧栏也半透明，壁纸透出；对话列始终会按面板透明度透出壁纸。',
  extendComposer: '扩展到消息输入框',
  extendComposerHint: '开启后底部连发消息的输入框（及附近提示条）也半透明，壁纸透出。',
  preview: '当前图片',
  noImages: '该文件夹下没有可用图片。',
  folderError: '无法读取文件夹。',
  imageCount: '张图片',
  disabledBanner: '背景已禁用，界面已还原。打开上方开关以继续调整。',
  effect: '特效',
  effectEnabled: '启用特效',
  effectHint: '在壁纸上方缓慢飘落樱花或雪花。',
  effectSakura: '樱花',
  effectSnow: '雪花',
  effectDensity: '特效密度',
  effectSpeed: '飘落速度',
  groupSource: '来源与预览',
  groupPlayback: '播放',
  groupLook: '画面',
  groupEffect: '特效',
}

export const en: Record<BackgroundKey, string> = {
  nav: 'Background',
  title: 'Background',
  intro: 'Use a local image or folder as the Harness Web wallpaper. Tune fit, opacity, blur, and wash overlay.',
  enabled: 'Enable background',
  enabledHint: 'When off, the stock UI is restored and the controls below are disabled.',
  mode: 'Source',
  modeImage: 'Single image',
  modeFolder: 'Image folder',
  imagePath: 'Image absolute path',
  imagePathHint: 'Use “Choose image” for a system image file dialog, or paste an absolute path.',
  browseFolder: 'Choose folder…',
  browseImage: 'Choose image…',
  pickImage: 'Pick from folder',
  clearImage: 'Clear path',
  folderPath: 'Folder path',
  folderPathHint: 'Use the system directory picker, or paste an absolute path.',
  folderOrder: 'Order',
  orderSequential: 'Sequential',
  orderRandom: 'Random',
  interval: 'Interval',
  intervalUnit: 'sec',
  crossfade: 'Crossfade',
  crossfadeUnit: 'sec',
  fit: 'Fit',
  fitCenter: 'Center',
  fitCover: 'Cover',
  fitContain: 'Contain',
  fitStretch: 'Stretch',
  opacity: 'Image opacity',
  blur: 'Blur',
  overlayOpacity: 'Overlay opacity',
  overlayColor: 'Overlay color',
  surface: 'Panel opacity',
  surfaceHint: 'How translucent the conversation column (and sidebar when extended) becomes.',
  extendChrome: 'Extend into sidebar',
  extendChromeHint: 'Also translucify the left sidebar so the wallpaper shows through. The conversation column always uses panel opacity.',
  extendComposer: 'Extend into composer',
  extendComposerHint: 'Also translucify the message input card (and nearby tip bars) so the wallpaper shows through.',
  preview: 'Current image',
  noImages: 'No images in this folder.',
  folderError: 'Could not read the folder.',
  imageCount: 'images',
  disabledBanner: 'Background is off and the stock UI is restored. Turn the switch on to edit options.',
  effect: 'Effects',
  effectEnabled: 'Enable effects',
  effectHint: 'Slow-falling sakura petals or snow over the wallpaper.',
  effectSakura: 'Sakura',
  effectSnow: 'Snow',
  effectDensity: 'Density',
  effectSpeed: 'Fall speed',
  groupSource: 'Source & preview',
  groupPlayback: 'Playback',
  groupLook: 'Look',
  groupEffect: 'Effects',
}
