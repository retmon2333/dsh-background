import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { Buffer } from "node:buffer";
import { fileURLToPath } from "node:url";
import z from "@deepseek-ai/schemastery";
//#region src/types.ts
const HEX = /^#[0-9A-Fa-f]{6}$/;
/** Defaults used when the scope is still loading / first install. */
const BACKGROUND_DEFAULTS = {
	enabled: true,
	mode: "image",
	/** Host `apply()` fills the absolute path to `assets/default-wallpaper.jpg`. */
	imagePath: "",
	folderPath: "",
	folderOrder: "random",
	intervalSeconds: 5,
	crossfadeSeconds: 2,
	fit: "cover",
	opacity: 100,
	blur: 0,
	overlayOpacity: 20,
	overlayColor: "#000000",
	surface: 40,
	extendChrome: true,
	extendComposer: true,
	effectEnabled: true,
	effectKind: "sakura",
	effectDensity: 45,
	effectSpeed: 40
};
/** Normalize a color to #RRGGBB or fall back. */
function normalizeOverlayColor(value, fallback = "#000000") {
	const trimmed = value.trim();
	if (HEX.test(trimmed)) return trimmed.toLowerCase();
	if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) return `#${trimmed.toLowerCase()}`;
	return fallback;
}
//#endregion
//#region src/schema.ts
/**
* Host-side schemastery schema for the durable settings section.
*/
/** Durable settings schema. Every field carries a schema default. */
const BackgroundSettingsSchema = z.object({
	enabled: z.boolean().default(BACKGROUND_DEFAULTS.enabled),
	mode: z.union(["image", "folder"]).default(BACKGROUND_DEFAULTS.mode),
	imagePath: z.string().default(BACKGROUND_DEFAULTS.imagePath),
	folderPath: z.string().default(BACKGROUND_DEFAULTS.folderPath),
	folderOrder: z.union(["sequential", "random"]).default(BACKGROUND_DEFAULTS.folderOrder),
	intervalSeconds: z.number().min(1).max(300).default(BACKGROUND_DEFAULTS.intervalSeconds),
	crossfadeSeconds: z.number().min(.1).max(5).default(BACKGROUND_DEFAULTS.crossfadeSeconds),
	fit: z.union([
		"center",
		"cover",
		"contain",
		"stretch"
	]).default(BACKGROUND_DEFAULTS.fit),
	opacity: z.number().min(0).max(100).default(BACKGROUND_DEFAULTS.opacity),
	blur: z.number().min(0).max(20).default(BACKGROUND_DEFAULTS.blur),
	overlayOpacity: z.number().min(0).max(100).default(BACKGROUND_DEFAULTS.overlayOpacity),
	overlayColor: z.string().default(BACKGROUND_DEFAULTS.overlayColor),
	surface: z.number().min(20).max(100).default(BACKGROUND_DEFAULTS.surface),
	extendChrome: z.boolean().default(BACKGROUND_DEFAULTS.extendChrome),
	extendComposer: z.boolean().default(BACKGROUND_DEFAULTS.extendComposer),
	effectEnabled: z.boolean().default(BACKGROUND_DEFAULTS.effectEnabled),
	effectKind: z.union(["sakura", "snow"]).default(BACKGROUND_DEFAULTS.effectKind),
	effectDensity: z.number().min(1).max(100).default(BACKGROUND_DEFAULTS.effectDensity),
	effectSpeed: z.number().min(1).max(100).default(BACKGROUND_DEFAULTS.effectSpeed)
});
//#endregion
//#region src/index.ts
const name = "dsh-background";
/** Package root (parent of `lib/`). */
const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** Default single-image wallpaper shipped beside the package (`assets/`). */
const DEFAULT_WALLPAPER_FILENAME = "default-wallpaper.jpg";
/** Absolute path of the default wallpaper file. */
function defaultWallpaperPath() {
	return path.join(PLUGIN_ROOT, "assets", DEFAULT_WALLPAPER_FILENAME);
}
/** Settings namespace owned by this plugin (no dots allowed by the brand). */
const NS = settingsNamespace("dsh-background");
const ROUTE_LIST = "/dsh-background/folder/list";
/** Must NOT end with `/` — webserver prefix match is `p` or `p/<rest>`. */
const ROUTE_IMAGE_PREFIX = "/dsh-background/folder/image";
const ROUTE_FILE = "/dsh-background/file";
const ROUTE_UPLOAD = "/dsh-background/upload";
const ROUTE_PICK_IMAGE = "/dsh-background/pick-image";
const ROUTE_PICK_FOLDER = "/dsh-background/pick-folder";
const IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([
	".jpg",
	".jpeg",
	".png",
	".webp",
	".gif",
	".avif",
	".bmp"
]);
const MIME_TYPES = {
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".webp": "image/webp",
	".gif": "image/gif",
	".avif": "image/avif",
	".bmp": "image/bmp"
};
function sendJson(response, status, value) {
	response.writeHead(status, {
		"cache-control": "no-store",
		"content-type": "application/json; charset=utf-8"
	});
	response.end(JSON.stringify(value));
}
function requireGet(request, response) {
	if (request.method === "GET") return true;
	response.writeHead(405, { allow: "GET" });
	response.end();
	return false;
}
function sectionOf(settings) {
	return settings.get(NS) ?? BACKGROUND_DEFAULTS;
}
/** List top-level image files of one folder, sorted by name. */
async function listFolderImages(folder) {
	const entries = await readdir(folder, { withFileTypes: true });
	const images = [];
	for (const entry of entries) {
		if (!entry.isFile()) continue;
		const ext = path.extname(entry.name).toLowerCase();
		if (!IMAGE_EXTENSIONS.has(ext)) continue;
		const full = path.join(folder, entry.name);
		try {
			const info = await stat(full);
			const version = Math.round(info.mtimeMs);
			images.push({
				name: entry.name,
				size: info.size,
				mtimeMs: version,
				url: `${ROUTE_IMAGE_PREFIX}/${encodeURIComponent(entry.name)}?v=${version}`
			});
		} catch {}
	}
	images.sort((a, b) => a.name.localeCompare(b.name, void 0, { numeric: true }));
	return images;
}
function handleList(settings) {
	return async (request, response) => {
		if (!requireGet(request, response)) return;
		const folder = sectionOf(settings).folderPath;
		if (folder === "") {
			sendJson(response, 400, {
				error: "folder-not-configured",
				images: []
			});
			return;
		}
		try {
			sendJson(response, 200, {
				folder,
				images: await listFolderImages(folder)
			});
		} catch (error) {
			const code = error?.code;
			sendJson(response, 404, {
				error: code === "ENOENT" || code === "ENOTDIR" ? "folder-missing" : "folder-unreadable",
				folder,
				images: []
			});
		}
	};
}
function pipeFile(request, response, full, info, ext) {
	const etag = `"bg-${info.mtimeMs}-${info.size}"`;
	if (request.headers["if-none-match"] === etag) {
		response.writeHead(304, { etag });
		response.end();
		return;
	}
	response.writeHead(200, {
		"content-type": MIME_TYPES[ext] ?? "application/octet-stream",
		"content-length": info.size,
		etag,
		"cache-control": "no-cache"
	});
	createReadStream(full).on("error", () => {
		try {
			response.destroy();
		} catch {}
	}).pipe(response);
}
function handleFolderImage(settings) {
	return async (request, response) => {
		if (!requireGet(request, response)) return;
		const folder = sectionOf(settings).folderPath;
		if (folder === "") {
			response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
			response.end("folder-not-configured");
			return;
		}
		const url = new URL(request.url ?? "/", "http://localhost");
		if (!url.pathname.startsWith(`${ROUTE_IMAGE_PREFIX}/`)) {
			response.writeHead(404);
			response.end("not-found");
			return;
		}
		const rest = url.pathname.slice(29);
		let name;
		try {
			name = decodeURIComponent(rest);
		} catch {
			response.writeHead(400);
			response.end("bad-name");
			return;
		}
		if (name === "" || name !== path.basename(name) || name.includes("..") || name.includes("/") || name.includes("\\")) {
			response.writeHead(403);
			response.end("bad-name");
			return;
		}
		const ext = path.extname(name).toLowerCase();
		if (!IMAGE_EXTENSIONS.has(ext)) {
			response.writeHead(403);
			response.end("bad-type");
			return;
		}
		const root = `${path.resolve(folder)}${path.sep}`;
		const full = path.resolve(folder, name);
		if (!full.startsWith(root)) {
			response.writeHead(403);
			response.end("bad-name");
			return;
		}
		let info;
		try {
			info = await stat(full);
		} catch {
			response.writeHead(404);
			response.end("not-found");
			return;
		}
		if (!info.isFile()) {
			response.writeHead(404);
			response.end("not-found");
			return;
		}
		pipeFile(request, response, full, info, ext);
	};
}
function handleFile(settings) {
	return async (request, response) => {
		if (!requireGet(request, response)) return;
		const imagePath = sectionOf(settings).imagePath;
		if (imagePath === "") {
			response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
			response.end("image-not-configured");
			return;
		}
		const full = path.resolve(imagePath);
		const ext = path.extname(full).toLowerCase();
		if (!IMAGE_EXTENSIONS.has(ext)) {
			response.writeHead(403);
			response.end("bad-type");
			return;
		}
		let info;
		try {
			info = await stat(full);
		} catch {
			response.writeHead(404);
			response.end("not-found");
			return;
		}
		if (!info.isFile()) {
			response.writeHead(404);
			response.end("not-found");
			return;
		}
		pipeFile(request, response, full, info, ext);
	};
}
/** Hidden TopMost WinForms owner so dialogs appear above Electron. */
function winFormsOwnerPreamble() {
	return [
		"Add-Type -AssemblyName System.Windows.Forms",
		"$owner = New-Object System.Windows.Forms.Form",
		"$owner.TopMost = $true",
		"$owner.ShowInTaskbar = $false",
		"$owner.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedToolWindow",
		"$owner.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual",
		"$owner.Location = New-Object System.Drawing.Point(-32000, -32000)",
		"$owner.Size = New-Object System.Drawing.Size(1, 1)",
		"$owner.Opacity = 0",
		"[void]$owner.Show()"
	];
}
function runPowerShellDialog(scriptLines) {
	if (process.platform !== "win32") return Promise.resolve(null);
	const script = scriptLines.join("; ");
	return new Promise((resolve) => {
		const child = spawn("powershell.exe", [
			"-NoProfile",
			"-STA",
			"-Command",
			script
		], { windowsHide: true });
		let out = "";
		let settled = false;
		const finish = (value) => {
			if (settled) return;
			settled = true;
			resolve(value);
		};
		const timer = setTimeout(() => {
			try {
				child.kill();
			} catch {}
			finish(null);
		}, 18e4);
		child.stdout.setEncoding("utf8");
		child.stdout.on("data", (chunk) => {
			out += chunk;
		});
		child.on("error", () => {
			clearTimeout(timer);
			finish(null);
		});
		child.on("close", () => {
			clearTimeout(timer);
			const trimmed = out.trim();
			finish(trimmed === "" ? null : trimmed);
		});
	});
}
/** Native image file dialog (Windows Forms); returns absolute path or null. */
async function nativePickImage() {
	return runPowerShellDialog([
		...winFormsOwnerPreamble(),
		"$f = New-Object System.Windows.Forms.OpenFileDialog",
		"$f.Filter = 'Images|*.jpg;*.jpeg;*.png;*.webp;*.gif;*.bmp;*.avif|All|*.*'",
		"$f.Title = 'Select background image'",
		"$f.CheckFileExists = $true",
		"$ok = $f.ShowDialog($owner)",
		"$owner.Close()",
		"if ($ok -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($f.FileName) }"
	]);
}
/** Native folder dialog; returns absolute path or null. */
async function nativePickFolder() {
	return runPowerShellDialog([
		...winFormsOwnerPreamble(),
		"$f = New-Object System.Windows.Forms.FolderBrowserDialog",
		"$f.Description = 'Select image folder'",
		"$f.ShowNewFolderButton = $false",
		"$ok = $f.ShowDialog($owner)",
		"$owner.Close()",
		"if ($ok -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($f.SelectedPath) }"
	]);
}
function handlePickImage() {
	return async (request, response) => {
		if (!requireGet(request, response)) return;
		try {
			sendJson(response, 200, { path: await nativePickImage() });
		} catch {
			sendJson(response, 500, {
				path: null,
				error: "pick-failed"
			});
		}
	};
}
function handlePickFolder() {
	return async (request, response) => {
		if (!requireGet(request, response)) return;
		try {
			sendJson(response, 200, { path: await nativePickFolder() });
		} catch {
			sendJson(response, 500, {
				path: null,
				error: "pick-failed"
			});
		}
	};
}
const MAX_UPLOAD_BYTES = 26214400;
/** Hard cap on the total size of the uploads directory (defends against unauthenticated disk-fill). */
const MAX_UPLOAD_DIR_BYTES = 104857600;
/**
* Identify a decoded image from its leading bytes (magic numbers).
* Returns the canonical extension, or null if the payload is not a supported image.
* This is the real content gate for uploads — the client filename is only a hint.
*/
function sniffImageFormat(bytes) {
	if (bytes.length < 12) return null;
	const b = bytes;
	if (b[0] === 255 && b[1] === 216 && b[2] === 255) return ".jpg";
	if (b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71 && b[4] === 13 && b[5] === 10 && b[6] === 26 && b[7] === 10) return ".png";
	if (b[0] === 71 && b[1] === 73 && b[2] === 70 && b[3] === 56 && (b[4] === 55 || b[4] === 57) && b[5] === 97) return ".gif";
	if (b[0] === 82 && b[1] === 73 && b[2] === 70 && b[3] === 70 && b[8] === 87 && b[9] === 69 && b[10] === 66 && b[11] === 80) return ".webp";
	if (b[0] === 66 && b[1] === 77) return ".bmp";
	if (b[4] === 102 && b[5] === 116 && b[6] === 121 && b[7] === 112) {
		const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
		if (brand === "avif" || brand === "avis" || brand === "mif1") return ".avif";
	}
	return null;
}
function handleUpload() {
	return async (request, response) => {
		if (request.method !== "POST") {
			response.writeHead(405, { allow: "POST" });
			response.end();
			return;
		}
		const chunks = [];
		let total = 0;
		try {
			for await (const chunk of request) {
				const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
				total += buf.length;
				if (total > MAX_UPLOAD_BYTES) {
					sendJson(response, 413, { error: "too-large" });
					return;
				}
				chunks.push(buf);
			}
		} catch {
			sendJson(response, 400, { error: "read-failed" });
			return;
		}
		const payload = Buffer.concat(chunks);
		const ext = sniffImageFormat(payload);
		if (ext === null) {
			sendJson(response, 400, { error: "not-an-image" });
			return;
		}
		const dir = path.join(os.homedir(), ".dsh", "dsh-background", "uploads");
		mkdirSync(dir, { recursive: true });
		let existing = 0;
		try {
			for (const entry of await readdir(dir, { withFileTypes: true })) {
				if (!entry.isFile()) continue;
				const info = await stat(path.join(dir, entry.name));
				existing += info.size;
			}
		} catch {}
		if (existing + payload.length > MAX_UPLOAD_DIR_BYTES) {
			sendJson(response, 507, { error: "quota-exceeded" });
			return;
		}
		const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
		const full = path.join(dir, safe);
		writeFileSync(full, payload);
		sendJson(response, 200, { path: full });
	};
}
/** Register routes; returns the combined disposer. */
function mountRoutes(webServer, settings) {
	const disposers = [
		webServer.register({
			kind: "exact",
			path: ROUTE_LIST,
			handler: handleList(settings)
		}),
		webServer.register({
			kind: "prefix",
			path: ROUTE_IMAGE_PREFIX,
			handler: handleFolderImage(settings)
		}),
		webServer.register({
			kind: "exact",
			path: ROUTE_FILE,
			handler: handleFile(settings)
		}),
		webServer.register({
			kind: "exact",
			path: ROUTE_PICK_IMAGE,
			handler: handlePickImage()
		}),
		webServer.register({
			kind: "exact",
			path: ROUTE_PICK_FOLDER,
			handler: handlePickFolder()
		}),
		webServer.register({
			kind: "exact",
			path: ROUTE_UPLOAD,
			handler: handleUpload()
		})
	];
	return () => {
		for (const dispose of disposers) dispose();
	};
}
/**
* Host plugin body: register the durable settings namespace and mount the
* image routes once both the settings service and the web server exist.
*/
function apply(ctx, config = {}) {
	const wallpaper = defaultWallpaperPath();
	mkdirSync(path.dirname(wallpaper), { recursive: true });
	ctx.inject(["settings", "webServer"], (c) => {
		c.settings.register(NS, BackgroundSettingsSchema, { base: {
			...BACKGROUND_DEFAULTS,
			mode: "image",
			imagePath: wallpaper,
			...config
		} });
		c.effect(() => mountRoutes(c.webServer, c.settings), "dsh-background: http routes");
	});
}
//#endregion
export { BACKGROUND_DEFAULTS, BackgroundSettingsSchema, DEFAULT_WALLPAPER_FILENAME, apply, defaultWallpaperPath, name, normalizeOverlayColor };
