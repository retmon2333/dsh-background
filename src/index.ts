/**
 * dsh-background — host half.
 *
 * Registers the `dsh-background` settings namespace and mounts same-origin HTTP
 * routes so the browser can list / load images from configured local paths:
 *
 *   GET /dsh-background/folder/list          → JSON { folder, images[] }
 *   GET /dsh-background/folder/image/<name>  → image bytes from folderPath
 *   GET /dsh-background/file                 → image bytes from imagePath
 */
import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { createReadStream, mkdirSync, writeFileSync } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { Buffer } from 'node:buffer'
import { fileURLToPath } from 'node:url'

import {
  BackgroundSettingsSchema,
  BACKGROUND_DEFAULTS,
  type BackgroundSettings,
} from './schema.ts'

export {
  BackgroundSettingsSchema,
  BACKGROUND_DEFAULTS,
  normalizeOverlayColor,
} from './schema.ts'
export type { BackgroundSettings } from './schema.ts'

export const name = 'dsh-background'

/** Package root (parent of `lib/`). */
const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Default single-image wallpaper shipped beside the package (`assets/`). */
export const DEFAULT_WALLPAPER_FILENAME = 'default-wallpaper.jpg'

/** Absolute path of the default wallpaper file. */
export function defaultWallpaperPath(): string {
  return path.join(PLUGIN_ROOT, 'assets', DEFAULT_WALLPAPER_FILENAME)
}

/** Settings namespace owned by this plugin (no dots allowed by the brand). */
const NS = settingsNamespace('dsh-background')

const ROUTE_LIST = '/dsh-background/folder/list'
/** Must NOT end with `/` — webserver prefix match is `p` or `p/<rest>`. */
const ROUTE_IMAGE_PREFIX = '/dsh-background/folder/image'
const ROUTE_FILE = '/dsh-background/file'
const ROUTE_UPLOAD = '/dsh-background/upload'
const ROUTE_PICK_IMAGE = '/dsh-background/pick-image'
const ROUTE_PICK_FOLDER = '/dsh-background/pick-folder'

const IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.bmp',
])

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(value))
}

function requireGet(request: IncomingMessage, response: ServerResponse): boolean {
  if (request.method === 'GET') return true
  response.writeHead(405, { allow: 'GET' })
  response.end()
  return false
}

function sectionOf(settings: { get(ns: typeof NS): BackgroundSettings | undefined }): BackgroundSettings {
  return settings.get(NS) ?? BACKGROUND_DEFAULTS
}

/** List top-level image files of one folder, sorted by name. */
async function listFolderImages(folder: string): Promise<Array<{
  name: string
  size: number
  mtimeMs: number
  url: string
}>> {
  const entries = await readdir(folder, { withFileTypes: true })
  const images: Array<{ name: string; size: number; mtimeMs: number; url: string }> = []
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!IMAGE_EXTENSIONS.has(ext)) continue
    const full = path.join(folder, entry.name)
    try {
      const info = await stat(full)
      const version = Math.round(info.mtimeMs)
      images.push({
        name: entry.name,
        size: info.size,
        mtimeMs: version,
        url: `${ROUTE_IMAGE_PREFIX}/${encodeURIComponent(entry.name)}?v=${version}`,
      })
    } catch {
      // Unreadable file: skip it.
    }
  }
  images.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  return images
}

function handleList(settings: { get(ns: typeof NS): BackgroundSettings | undefined }) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    if (!requireGet(request, response)) return
    const folder = sectionOf(settings).folderPath
    if (folder === '') {
      sendJson(response, 400, { error: 'folder-not-configured', images: [] })
      return
    }
    try {
      const images = await listFolderImages(folder)
      sendJson(response, 200, { folder, images })
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code
      const missing = code === 'ENOENT' || code === 'ENOTDIR'
      sendJson(response, 404, {
        error: missing ? 'folder-missing' : 'folder-unreadable',
        folder,
        images: [],
      })
    }
  }
}

function pipeFile(
  request: IncomingMessage,
  response: ServerResponse,
  full: string,
  info: { mtimeMs: number; size: number },
  ext: string,
): void {
  const etag = `"bg-${info.mtimeMs}-${info.size}"`
  if (request.headers['if-none-match'] === etag) {
    response.writeHead(304, { etag })
    response.end()
    return
  }
  response.writeHead(200, {
    'content-type': MIME_TYPES[ext] ?? 'application/octet-stream',
    'content-length': info.size,
    etag,
    'cache-control': 'no-cache',
  })
  createReadStream(full)
    .on('error', () => {
      try { response.destroy() } catch { /* client gone */ }
    })
    .pipe(response)
}

function handleFolderImage(settings: { get(ns: typeof NS): BackgroundSettings | undefined }) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    if (!requireGet(request, response)) return
    const folder = sectionOf(settings).folderPath
    if (folder === '') {
      response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
      response.end('folder-not-configured')
      return
    }
    const url = new URL(request.url ?? '/', 'http://localhost')
    if (!url.pathname.startsWith(`${ROUTE_IMAGE_PREFIX}/`)) {
      response.writeHead(404)
      response.end('not-found')
      return
    }
    const rest = url.pathname.slice(ROUTE_IMAGE_PREFIX.length + 1)
    let name: string
    try {
      name = decodeURIComponent(rest)
    } catch {
      response.writeHead(400)
      response.end('bad-name')
      return
    }
    if (
      name === ''
      || name !== path.basename(name)
      || name.includes('..')
      || name.includes('/')
      || name.includes('\\')
    ) {
      response.writeHead(403)
      response.end('bad-name')
      return
    }
    const ext = path.extname(name).toLowerCase()
    if (!IMAGE_EXTENSIONS.has(ext)) {
      response.writeHead(403)
      response.end('bad-type')
      return
    }
    const root = `${path.resolve(folder)}${path.sep}`
    const full = path.resolve(folder, name)
    if (!full.startsWith(root)) {
      response.writeHead(403)
      response.end('bad-name')
      return
    }
    let info
    try {
      info = await stat(full)
    } catch {
      response.writeHead(404)
      response.end('not-found')
      return
    }
    if (!info.isFile()) {
      response.writeHead(404)
      response.end('not-found')
      return
    }
    pipeFile(request, response, full, info, ext)
  }
}

function handleFile(settings: { get(ns: typeof NS): BackgroundSettings | undefined }) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    if (!requireGet(request, response)) return
    const imagePath = sectionOf(settings).imagePath
    if (imagePath === '') {
      response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
      response.end('image-not-configured')
      return
    }
    const full = path.resolve(imagePath)
    const ext = path.extname(full).toLowerCase()
    if (!IMAGE_EXTENSIONS.has(ext)) {
      response.writeHead(403)
      response.end('bad-type')
      return
    }
    let info
    try {
      info = await stat(full)
    } catch {
      response.writeHead(404)
      response.end('not-found')
      return
    }
    if (!info.isFile()) {
      response.writeHead(404)
      response.end('not-found')
      return
    }
    pipeFile(request, response, full, info, ext)
  }
}

/** Hidden TopMost WinForms owner so dialogs appear above Electron. */
function winFormsOwnerPreamble(): string[] {
  return [
    'Add-Type -AssemblyName System.Windows.Forms',
    '$owner = New-Object System.Windows.Forms.Form',
    '$owner.TopMost = $true',
    '$owner.ShowInTaskbar = $false',
    '$owner.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedToolWindow',
    '$owner.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual',
    '$owner.Location = New-Object System.Drawing.Point(-32000, -32000)',
    '$owner.Size = New-Object System.Drawing.Size(1, 1)',
    '$owner.Opacity = 0',
    '[void]$owner.Show()',
  ]
}

function runPowerShellDialog(scriptLines: string[]): Promise<string | null> {
  if (process.platform !== 'win32') return Promise.resolve(null)
  const script = scriptLines.join('; ')
  return new Promise((resolve) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-STA', '-Command', script], {
      windowsHide: true,
    })
    let out = ''
    let settled = false
    const finish = (value: string | null): void => {
      if (settled) return
      settled = true
      resolve(value)
    }
    const timer = setTimeout(() => {
      try { child.kill() } catch { /* ignore */ }
      finish(null)
    }, 180_000)
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => { out += chunk })
    child.on('error', () => {
      clearTimeout(timer)
      finish(null)
    })
    child.on('close', () => {
      clearTimeout(timer)
      const trimmed = out.trim()
      finish(trimmed === '' ? null : trimmed)
    })
  })
}

/** Native image file dialog (Windows Forms); returns absolute path or null. */
async function nativePickImage(): Promise<string | null> {
  return runPowerShellDialog([
    ...winFormsOwnerPreamble(),
    '$f = New-Object System.Windows.Forms.OpenFileDialog',
    "$f.Filter = 'Images|*.jpg;*.jpeg;*.png;*.webp;*.gif;*.bmp;*.avif|All|*.*'",
    '$f.Title = \'Select background image\'',
    '$f.CheckFileExists = $true',
    '$ok = $f.ShowDialog($owner)',
    '$owner.Close()',
    'if ($ok -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($f.FileName) }',
  ])
}

/** Native folder dialog; returns absolute path or null. */
async function nativePickFolder(): Promise<string | null> {
  return runPowerShellDialog([
    ...winFormsOwnerPreamble(),
    '$f = New-Object System.Windows.Forms.FolderBrowserDialog',
    '$f.Description = \'Select image folder\'',
    '$f.ShowNewFolderButton = $false',
    '$ok = $f.ShowDialog($owner)',
    '$owner.Close()',
    'if ($ok -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($f.SelectedPath) }',
  ])
}

function handlePickImage() {
  return async (request: IncomingMessage, response: ServerResponse) => {
    if (!requireGet(request, response)) return
    try {
      const picked = await nativePickImage()
      sendJson(response, 200, { path: picked })
    } catch {
      sendJson(response, 500, { path: null, error: 'pick-failed' })
    }
  }
}

function handlePickFolder() {
  return async (request: IncomingMessage, response: ServerResponse) => {
    if (!requireGet(request, response)) return
    try {
      const picked = await nativePickFolder()
      sendJson(response, 200, { path: picked })
    } catch {
      sendJson(response, 500, { path: null, error: 'pick-failed' })
    }
  }
}

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

/** Hard cap on the total size of the uploads directory (defends against unauthenticated disk-fill). */
const MAX_UPLOAD_DIR_BYTES = 100 * 1024 * 1024

/**
 * Identify a decoded image from its leading bytes (magic numbers).
 * Returns the canonical extension, or null if the payload is not a supported image.
 * This is the real content gate for uploads — the client filename is only a hint.
 */
function sniffImageFormat(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null
  const b = bytes
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return '.jpg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return '.png'
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61) return '.gif'
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return '.webp'
  if (b[0] === 0x42 && b[1] === 0x4d) return '.bmp'
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11])
    if (brand === 'avif' || brand === 'avis' || brand === 'mif1') return '.avif'
  }
  return null
}

function handleUpload() {
  return async (request: IncomingMessage, response: ServerResponse) => {
    if (request.method !== 'POST') {
      response.writeHead(405, { allow: 'POST' })
      response.end()
      return
    }

    const chunks: Buffer[] = []
    let total = 0
    try {
      for await (const chunk of request) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        total += buf.length
        if (total > MAX_UPLOAD_BYTES) {
          sendJson(response, 413, { error: 'too-large' })
          return
        }
        chunks.push(buf)
      }
    } catch {
      sendJson(response, 400, { error: 'read-failed' })
      return
    }

    const payload = Buffer.concat(chunks)
    // Gate on decoded content (magic numbers), not the client-supplied filename.
    const ext = sniffImageFormat(payload)
    if (ext === null) {
      sendJson(response, 400, { error: 'not-an-image' })
      return
    }

    const dir = path.join(os.homedir(), '.dsh', 'dsh-background', 'uploads')
    mkdirSync(dir, { recursive: true })

    // Defend the uploads dir against unauthenticated disk-fill DoS.
    let existing = 0
    try {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (!entry.isFile()) continue
        const info = await stat(path.join(dir, entry.name))
        existing += info.size
      }
    } catch { /* first write: dir missing or empty */ }

    if (existing + payload.length > MAX_UPLOAD_DIR_BYTES) {
      sendJson(response, 507, { error: 'quota-exceeded' })
      return
    }

    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
    const full = path.join(dir, safe)
    writeFileSync(full, payload)
    sendJson(response, 200, { path: full })
  }
}

/** Register routes; returns the combined disposer. */
function mountRoutes(
  webServer: { register(route: { kind: 'exact' | 'prefix'; path: string; handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void> }): () => void },
  settings: { get(ns: typeof NS): BackgroundSettings | undefined },
): () => void {
  const disposers = [
    webServer.register({ kind: 'exact', path: ROUTE_LIST, handler: handleList(settings) }),
    webServer.register({ kind: 'prefix', path: ROUTE_IMAGE_PREFIX, handler: handleFolderImage(settings) }),
    webServer.register({ kind: 'exact', path: ROUTE_FILE, handler: handleFile(settings) }),
    webServer.register({ kind: 'exact', path: ROUTE_PICK_IMAGE, handler: handlePickImage() }),
    webServer.register({ kind: 'exact', path: ROUTE_PICK_FOLDER, handler: handlePickFolder() }),
    webServer.register({ kind: 'exact', path: ROUTE_UPLOAD, handler: handleUpload() }),
  ]
  return () => {
    for (const dispose of disposers) dispose()
  }
}

/**
 * Host plugin body: register the durable settings namespace and mount the
 * image routes once both the settings service and the web server exist.
 */
export function apply(ctx: Context, config: Partial<BackgroundSettings> = {}): void {
  const wallpaper = defaultWallpaperPath()
  mkdirSync(path.dirname(wallpaper), { recursive: true })
  ctx.inject(['settings', 'webServer'], (c) => {
    c.settings.register(NS, BackgroundSettingsSchema, {
      base: {
        ...BACKGROUND_DEFAULTS,
        mode: 'image',
        imagePath: wallpaper,
        ...config,
      },
    })
    c.effect(() => mountRoutes(c.webServer, c.settings), 'dsh-background: http routes')
  })
}
