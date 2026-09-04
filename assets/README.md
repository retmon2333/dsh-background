# Default wallpaper

Put your default background image here as:

```
default-wallpaper.jpg
```

Full path (this machine’s plugin root):

```
D:\xinxin_code\deepseek Hermes\background\assets\default-wallpaper.jpg
```

Supported: `.jpg` / `.jpeg` / `.png` / `.webp` (filename must stay `default-wallpaper.jpg`, or change the constant in `src/index.ts`).

After copying, rebuild (`pnpm build`) and fully restart `dsh web`. If settings were already saved from an earlier install, open **设置 → 背景**, switch to **单张图片**, and point to this file (or clear the `dsh-background` settings namespace to pick up the new default).
