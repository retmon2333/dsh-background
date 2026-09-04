window.__ModuleLoader__.load({
	id: "dsh-background",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
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
		//#region src/client/style.ts
		/** Injected stylesheet for the backdrop layers and settings page. */
		const PLUGIN_STYLES = `
[data-dsh-bg-root] {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
}

[data-dsh-bg-image],
[data-dsh-bg-overlay] {
  position: absolute;
  inset: 0;
}

[data-dsh-bg-image] {
  background-repeat: no-repeat;
  background-position: center center;
  opacity: 0;
  will-change: opacity;
  z-index: 1;
}

[data-dsh-bg-overlay] {
  z-index: 3;
  pointer-events: none;
}

[data-dsh-bg-effect] {
  z-index: 5;
}

body[data-dsh-background='on'] {
  background-image: none !important;
  background-color: transparent !important;
  isolation: isolate;
}

/* Conversation / frame / trajectory / other main panes */
body[data-dsh-background='on'] {
  --dsw-alias-bg-base: var(--dsh-bg-surface) !important;
  --dsw-alias-bg-layer-1: var(--dsh-bg-surface) !important;
  --dsw-alias-bg-layer-2: var(--dsh-bg-surface) !important;
  --dsw-alias-bg-layer-3: var(--dsh-bg-surface) !important;
}

/* Sidebar only when extendChrome is on */
body[data-dsh-background='on'][data-dsh-background-extend='on'] {
  --dsw-specific-sidebar-fill: var(--dsh-bg-surface) !important;
}

/* Composer / message input card when extendComposer is on */
body[data-dsh-background='on'][data-dsh-background-composer='on'] {
  --dsw-specific-input-major: var(--dsh-bg-surface) !important;
  --dsw-specific-tip: var(--dsh-bg-surface) !important;
}

/* When extendComposer is on, Markdown / code-block surfaces also turn
   translucent so the wallpaper shows through them. Bases are picked per
   theme, then blended with the user's surface opacity. */
body[data-dsh-background='on'][data-dsh-background-composer='on'] {
  --dsh-bg-code: color-mix(in srgb, var(--dsh-bg-surface) 55%, #202024) !important;
  --dsh-bg-code-banner: color-mix(in srgb, var(--dsh-bg-surface) 42%, #202024) !important;
  --dsh-bg-code-soft: color-mix(in srgb, var(--dsh-bg-surface) 30%, #43454a) !important;
  --dsh-bg-bubble: color-mix(in srgb, var(--dsh-bg-surface) 55%, #2c2c2e) !important;
  --dsh-bg-bubble-strong: color-mix(in srgb, var(--dsh-bg-surface) 40%, #43454a) !important;
  --dsh-bg-card: color-mix(in srgb, var(--dsh-bg-surface) 40%, #353638) !important;
  --dsw-alias-markdown-code-block: var(--dsh-bg-code);
  --dsw-alias-markdown-code-block-banner: var(--dsh-bg-code-banner);
  --dsw-alias-markdown-code-segment-selected: var(--dsh-bg-code-banner);
  --dsw-alias-markdown-code-segment-unselected: var(--dsh-bg-code);
  --dsw-alias-markdown-inline-code: var(--dsh-bg-code-banner);
  --dsw-alias-markdown-citation: var(--dsh-bg-code-soft);
  --dsw-alias-markdown-tag: var(--dsh-bg-code-soft);
  --dsw-alias-markdown-placeholder: var(--dsh-bg-code-soft);
  --dsw-specific-bubble: var(--dsh-bg-bubble);
  --dsw-specific-bubble-highlight: var(--dsh-bg-bubble-strong);
  --dsw-alias-bg-module-platform: var(--dsh-bg-card);
}
body[data-dsh-background='on'][data-dsh-background-composer='on']:not([data-ds-dark-theme]) {
  --dsh-bg-code: color-mix(in srgb, var(--dsh-bg-surface) 55%, #eef1f5) !important;
  --dsh-bg-code-banner: color-mix(in srgb, var(--dsh-bg-surface) 42%, #eef1f5) !important;
  --dsh-bg-code-soft: color-mix(in srgb, var(--dsh-bg-surface) 30%, #aeb4bb) !important;
  --dsh-bg-bubble: color-mix(in srgb, var(--dsh-bg-surface) 55%, #edf3fe) !important;
  --dsh-bg-bubble-strong: color-mix(in srgb, var(--dsh-bg-surface) 40%, #d3e2ff) !important;
  --dsh-bg-card: color-mix(in srgb, var(--dsh-bg-surface) 40%, #f5f6f7) !important;
}

/* Wallpaper crossfade is driven by inline styles from the user setting;
   do not force-disable transitions here via prefers-reduced-motion. */

.dsh-bg-section {
  --dsh-bg-ease: cubic-bezier(0.22, 1, 0.36, 1);
  width: min(100%, 760px);
  padding: 4px 2px 48px;
  color: var(--dsw-alias-label-primary, inherit);
  box-sizing: border-box;
}

.dsh-bg-section * { box-sizing: border-box; }

.dsh-bg-section__header { margin-bottom: 20px; }

.dsh-bg-section__title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.dsh-bg-section h2 {
  margin: 0;
  font-size: 22px;
  line-height: 1.25;
  letter-spacing: -0.02em;
  font-weight: 600;
}

.dsh-bg-section__intro {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.65;
  color: var(--dsw-alias-label-secondary, rgba(127,127,127,.9));
  max-width: 46em;
}

.dsh-bg-section__enable-label {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, rgba(127,127,127,.85));
  text-align: right;
}

.dsh-bg-section__banner {
  margin: 0 0 16px;
  padding: 11px 14px;
  border-radius: 10px;
  background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12));
  color: var(--dsw-alias-label-secondary, inherit);
  font-size: 13px;
  line-height: 1.5;
}

.dsh-bg-section__group {
  margin: 0 0 18px;
  padding: 18px 18px 10px;
  border-radius: 14px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.18));
  background:
    linear-gradient(
      165deg,
      color-mix(in srgb, var(--dsw-alias-bg-layer-1, transparent) 88%, transparent),
      transparent 70%
    );
  transition: border-color 220ms var(--dsh-bg-ease), box-shadow 220ms var(--dsh-bg-ease);
}

.dsh-bg-section__group:hover {
  border-color: var(--dsw-alias-border-l2, rgba(127,127,127,.28));
}

.dsh-bg-section__group-title {
  margin: 0 0 14px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--dsw-alias-label-secondary, rgba(127,127,127,.75));
}

.dsh-bg-section__group-body > :last-child {
  margin-bottom: 8px;
}

.dsh-bg-section__dual {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 20px;
}

@media (max-width: 640px) {
  .dsh-bg-section__dual {
    grid-template-columns: 1fr;
  }
}

.dsh-bg-section__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 14px 0;
}

.dsh-bg-section__row--inset {
  margin: 8px 0 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.1)) 70%, transparent);
}

.dsh-bg-section__row label,
.dsh-bg-section__field > span:first-child {
  display: block;
  font-size: 13px;
  font-weight: 500;
}

.dsh-bg-section__hint {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary, rgba(127,127,127,.85));
}

.dsh-bg-section__hint--flush {
  margin: -4px 0 12px;
}

.dsh-bg-section__controls {
  transition: opacity 280ms var(--dsh-bg-ease), filter 280ms var(--dsh-bg-ease);
}

.dsh-bg-section__controls[data-disabled='true'] {
  opacity: 0.42;
  filter: grayscale(0.4);
  pointer-events: none;
  user-select: none;
}

.dsh-bg-section__field { margin: 12px 0 16px; }

.dsh-bg-section__path-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.dsh-bg-section__path-row input[type='text'] {
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.35));
  background: var(--dsw-alias-bg-layer-1, transparent);
  color: inherit;
  font: inherit;
  font-size: 13px;
  transition: border-color 180ms var(--dsh-bg-ease), box-shadow 180ms var(--dsh-bg-ease);
}

.dsh-bg-section__path-row input[type='text']:focus {
  outline: none;
  border-color: var(--dsw-alias-brand-primary, #4d93f8);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary, #4d93f8) 22%, transparent);
}

.dsh-bg-section button,
.dsh-bg-section__seg button {
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.35));
  background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.1));
  color: inherit;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 180ms var(--dsh-bg-ease),
    border-color 180ms var(--dsh-bg-ease),
    transform 180ms var(--dsh-bg-ease);
}

.dsh-bg-section button:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.18));
}

.dsh-bg-section button:active {
  transform: scale(0.98);
}

.dsh-bg-section__seg {
  display: inline-flex;
  gap: 4px;
  margin-top: 8px;
  flex-wrap: wrap;
  padding: 3px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12)) 80%, transparent);
}

.dsh-bg-section__seg button {
  border: 1px solid transparent;
  background: transparent;
  height: 30px;
  padding: 0 12px;
  border-radius: 9px;
}

.dsh-bg-section__seg button[aria-pressed='true'] {
  border-color: transparent;
  background: var(--dsw-alias-bg-layer-1, #fff);
  box-shadow: 0 1px 2px rgba(0,0,0,.06);
  color: var(--dsw-alias-brand-primary, #4d93f8);
  font-weight: 550;
}

.dsh-bg-section__range {
  margin: 10px 0 14px;
}

.dsh-bg-section__range-meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 13px;
  gap: 12px;
}

.dsh-bg-section__range output {
  color: var(--dsw-alias-label-secondary, rgba(127,127,127,.85));
  font-variant-numeric: tabular-nums;
  font-size: 12px;
}

.dsh-bg-section__range input[type='range'] {
  width: 100%;
  margin-top: 10px;
  accent-color: var(--dsw-alias-brand-primary, #4d93f8);
}

.dsh-bg-section__toggle {
  position: relative;
  width: 44px;
  height: 26px;
  flex: 0 0 auto;
}

.dsh-bg-section__toggle input {
  position: absolute;
  opacity: 0;
  inset: 0;
  margin: 0;
  cursor: pointer;
}

.dsh-bg-section__toggle span {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.35));
  background: rgba(127,127,127,.2);
  transition: background 220ms var(--dsh-bg-ease), border-color 220ms var(--dsh-bg-ease);
  pointer-events: none;
}

.dsh-bg-section__toggle span::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,.18);
  transition: transform 220ms var(--dsh-bg-ease);
}

.dsh-bg-section__toggle input:checked + span {
  background: var(--dsw-alias-brand-primary, #4d93f8);
  border-color: transparent;
}

.dsh-bg-section__toggle input:checked + span::after {
  transform: translateX(18px);
}

.dsh-bg-section__preview {
  margin-top: 10px;
  max-width: 100%;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.22));
  background: transparent;
  line-height: 0;
  box-shadow: 0 8px 28px rgba(0,0,0,.06);
}

.dsh-bg-section__preview img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 260px;
  object-fit: cover;
  object-position: center;
  background: transparent;
}

.dsh-bg-section__meta {
  margin-top: 6px;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, rgba(127,127,127,.85));
}

.dsh-bg-section__color {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.dsh-bg-section__color input[type='color'] {
  width: 42px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.35));
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
}

.dsh-bg-section__color input[type='text'] {
  width: 110px;
  height: 36px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.35));
  background: var(--dsw-alias-bg-layer-1, transparent);
  color: inherit;
  font: inherit;
  font-size: 13px;
}
`;
		//#endregion
		//#region src/client/effects.ts
		var EffectLayer = class {
			canvas;
			ctx;
			particles = [];
			raf = 0;
			running = false;
			kind = "sakura";
			density = 40;
			speed = 35;
			width = 0;
			height = 0;
			lastTs = 0;
			onResize;
			lastKey = "";
			mount(parent) {
				if (this.canvas !== void 0) return;
				const canvas = document.createElement("canvas");
				canvas.dataset.dshBgEffect = "";
				canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;";
				parent.appendChild(canvas);
				this.canvas = canvas;
				this.ctx = canvas.getContext("2d") ?? void 0;
				this.onResize = () => {
					this.resize();
				};
				window.addEventListener("resize", this.onResize);
				this.resize();
			}
			unmount() {
				this.stop();
				if (this.onResize !== void 0) {
					window.removeEventListener("resize", this.onResize);
					this.onResize = void 0;
				}
				this.canvas?.remove();
				this.canvas = void 0;
				this.ctx = void 0;
				this.particles = [];
				this.lastKey = "";
			}
			setConfig(enabled, kind, density, speed = 35) {
				const nextDensity = Math.max(1, Math.min(100, density));
				const nextSpeed = Math.max(1, Math.min(100, Number(speed)));
				const key = `${enabled ? 1 : 0}:${kind}:${nextDensity}:${nextSpeed}`;
				if (key === this.lastKey) return;
				this.lastKey = key;
				if (!enabled) {
					this.kind = kind;
					this.density = nextDensity;
					this.speed = nextSpeed;
					this.stop();
					this.clear();
					this.particles = [];
					return;
				}
				const kindChanged = this.kind !== kind;
				const densityChanged = this.density !== nextDensity;
				const speedChanged = this.speed !== nextSpeed;
				const wasEmpty = this.particles.length === 0;
				this.kind = kind;
				this.density = nextDensity;
				this.speed = nextSpeed;
				if (wasEmpty || kindChanged) this.rebuild();
				else {
					if (densityChanged) this.adjustCount();
					if (speedChanged) this.rescaleSpeeds();
				}
				this.start();
			}
			speedScale() {
				return .35 + this.speed / 100 * 3.85;
			}
			resize() {
				if (this.canvas === void 0) return;
				const dpr = Math.min(window.devicePixelRatio || 1, 2);
				const nextW = window.innerWidth;
				const nextH = window.innerHeight;
				const sizeChanged = nextW !== this.width || nextH !== this.height;
				this.width = nextW;
				this.height = nextH;
				this.canvas.width = Math.floor(this.width * dpr);
				this.canvas.height = Math.floor(this.height * dpr);
				this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
				if (this.running && sizeChanged) this.adjustCount();
			}
			countForDensity() {
				const area = this.width * this.height / 921600;
				const soft = Math.max(.75, Math.min(1.85, Math.sqrt(Math.max(.25, area))));
				const mult = this.kind === "snow" ? 1.55 : 1.05;
				const cap = this.kind === "snow" ? 320 : 220;
				return Math.max(14, Math.min(cap, Math.round(this.density * mult * soft)));
			}
			pickDepth() {
				const r = Math.random();
				if (r < .5) return 0;
				if (r < .82) return 1;
				return 2;
			}
			spawn(partial = false) {
				const scale = this.speedScale();
				const depth = this.pickDepth();
				const depthMul = depth === 0 ? .6 : depth === 1 ? .9 : 1.3;
				let baseSpeedY;
				let baseSpeedX;
				let size;
				let alpha;
				if (this.kind === "snow") {
					baseSpeedY = (25 + Math.random() * 60) * depthMul;
					baseSpeedX = (Math.random() - .5) * (12 + depth * 8);
					size = (1.4 + Math.random() * 2.4) * (depth === 0 ? .7 : depth === 1 ? 1 : 1.5);
					alpha = (.32 + Math.random() * .4) * (.7 + depth * .18);
				} else {
					baseSpeedY = (28 + Math.random() * 55) * depthMul;
					baseSpeedX = (Math.random() - .5) * (16 + depth * 10);
					size = (5 + Math.random() * 7) * (depth === 0 ? .65 : depth === 1 ? 1 : 1.3);
					alpha = .5 + Math.random() * .4;
				}
				const baseRotSpeed = (Math.random() - .5) * (this.kind === "snow" ? .5 : 1.4);
				return {
					x: Math.random() * this.width,
					y: partial ? Math.random() * this.height : -30 - Math.random() * this.height * .35,
					size,
					depth,
					tint: Math.random(),
					phase: Math.random() * Math.PI * 2,
					wobble: Math.random() * Math.PI * 2,
					wobbleSpeed: .8 + Math.random() * 1.6,
					baseSpeedY,
					baseSpeedX,
					baseRotSpeed,
					speedY: baseSpeedY * scale,
					speedX: baseSpeedX * scale,
					rot: Math.random() * Math.PI * 2,
					rotSpeed: baseRotSpeed * scale,
					alpha
				};
			}
			rebuild() {
				const n = this.countForDensity();
				this.particles = Array.from({ length: n }, () => this.spawn(true));
			}
			adjustCount() {
				const n = this.countForDensity();
				if (this.particles.length < n) while (this.particles.length < n) this.particles.push(this.spawn(true));
				else if (this.particles.length > n) this.particles.length = n;
			}
			rescaleSpeeds() {
				const scale = this.speedScale();
				for (const p of this.particles) {
					p.speedY = p.baseSpeedY * scale;
					p.speedX = p.baseSpeedX * scale;
					p.rotSpeed = p.baseRotSpeed * scale;
				}
			}
			start() {
				if (this.running || this.ctx === void 0) return;
				this.running = true;
				this.lastTs = performance.now();
				const tick = (ts) => {
					if (!this.running) return;
					const dt = Math.min(.05, (ts - this.lastTs) / 1e3);
					this.lastTs = ts;
					this.step(dt);
					this.draw();
					this.raf = requestAnimationFrame(tick);
				};
				this.raf = requestAnimationFrame(tick);
			}
			stop() {
				this.running = false;
				if (this.raf !== 0) {
					cancelAnimationFrame(this.raf);
					this.raf = 0;
				}
			}
			clear() {
				if (this.ctx === void 0) return;
				this.ctx.clearRect(0, 0, this.width, this.height);
			}
			step(dt) {
				const scale = this.speedScale();
				for (const p of this.particles) {
					const swayAmp = (this.kind === "snow" ? 8 + p.depth * 5 : 14 + p.depth * 8) * scale;
					const sway = this.kind === "snow" ? Math.sin(p.y * .012 + p.phase) * swayAmp : Math.sin(p.y * .008 + p.phase) * swayAmp + Math.cos(p.wobble) * 6 * scale;
					p.y += p.speedY * dt;
					p.x += (p.speedX + sway) * dt;
					p.rot += p.rotSpeed * dt;
					p.wobble += p.wobbleSpeed * dt;
					p.phase += dt * .4;
					if (p.y > this.height + 40) {
						const next = this.spawn(false);
						Object.assign(p, next, { y: -24 - Math.random() * 40 });
					}
					if (p.x < -50) p.x = this.width + 24;
					if (p.x > this.width + 50) p.x = -24;
				}
			}
			drawSnowflake(ctx, p) {
				const r = p.size;
				if (p.depth === 0) {
					ctx.fillStyle = `rgba(245, 250, 255, ${p.alpha})`;
					ctx.beginPath();
					ctx.arc(0, 0, r, 0, Math.PI * 2);
					ctx.fill();
					return;
				}
				ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, p.alpha + .2)})`;
				ctx.fillStyle = `rgba(245, 250, 255, ${p.alpha})`;
				ctx.lineWidth = Math.max(.7, r * .2);
				ctx.lineCap = "round";
				ctx.beginPath();
				ctx.arc(0, 0, r * .2, 0, Math.PI * 2);
				ctx.fill();
				const arms = 6;
				for (let i = 0; i < arms; i++) {
					const a = i / arms * Math.PI * 2;
					const cos = Math.cos(a);
					const sin = Math.sin(a);
					ctx.beginPath();
					ctx.moveTo(0, 0);
					ctx.lineTo(cos * r, sin * r);
					if (p.depth === 2) {
						const mid = r * .55;
						const br = r * .28;
						ctx.moveTo(cos * mid, sin * mid);
						ctx.lineTo(cos * mid - sin * br, sin * mid + cos * br);
						ctx.moveTo(cos * mid, sin * mid);
						ctx.lineTo(cos * mid + sin * br, sin * mid - cos * br);
					}
					ctx.stroke();
				}
			}
			petalColors(tint) {
				if (tint < .25) return {
					outer: "#ffd6e0",
					inner: "#ff9eb5",
					edge: "#ffe8ef"
				};
				if (tint < .55) return {
					outer: "#ffb7c5",
					inner: "#ff7a9a",
					edge: "#ffd0db"
				};
				if (tint < .8) return {
					outer: "#ffc4ce",
					inner: "#f28aa4",
					edge: "#ffe0e6"
				};
				return {
					outer: "#ffe4ec",
					inner: "#ffb0c2",
					edge: "#fff5f8"
				};
			}
			/** Single sakura petal path (notched ellipse). */
			drawPetalShape(ctx, w, h) {
				ctx.beginPath();
				ctx.moveTo(0, -h);
				ctx.bezierCurveTo(w * .95, -h * .55, w * .9, h * .15, 0, h);
				ctx.bezierCurveTo(-w * .9, h * .15, -w * .95, -h * .55, 0, -h);
				ctx.closePath();
			}
			drawSakura(ctx, p) {
				const colors = this.petalColors(p.tint);
				const flip = Math.cos(p.wobble);
				const scaleX = .35 + Math.abs(flip) * .65;
				const scaleY = .85 + Math.sin(p.wobble * .7) * .15;
				ctx.scale(scaleX, scaleY);
				const w = p.size * .55;
				const h = p.size;
				if (p.depth === 0) {
					ctx.globalAlpha = p.alpha;
					ctx.fillStyle = colors.outer;
					this.drawPetalShape(ctx, w, h);
					ctx.fill();
					ctx.globalAlpha = 1;
					return;
				}
				ctx.globalAlpha = p.alpha;
				ctx.fillStyle = colors.outer;
				this.drawPetalShape(ctx, w, h);
				ctx.fill();
				ctx.globalAlpha = p.alpha * .8;
				ctx.fillStyle = colors.inner;
				this.drawPetalShape(ctx, w * .42, h * .72);
				ctx.fill();
				if (p.depth === 2) {
					ctx.globalAlpha = p.alpha * .5;
					ctx.fillStyle = colors.edge;
					ctx.beginPath();
					ctx.ellipse(0, -h * .55, w * .28, h * .18, 0, 0, Math.PI * 2);
					ctx.fill();
				}
				ctx.globalAlpha = 1;
			}
			draw() {
				const ctx = this.ctx;
				if (ctx === void 0) return;
				ctx.clearRect(0, 0, this.width, this.height);
				for (const p of this.particles) {
					ctx.save();
					ctx.translate(p.x, p.y);
					ctx.rotate(p.rot);
					ctx.globalAlpha = p.alpha;
					if (this.kind === "snow") this.drawSnowflake(ctx, p);
					else this.drawSakura(ctx, p);
					ctx.restore();
				}
			}
		};
		//#endregion
		//#region src/client/controller.ts
		const SOURCE = "dsh-background";
		const ROUTE_LIST = "/dsh-background/folder/list";
		const ROUTE_FILE = "/dsh-background/file";
		const ROUTE_PICK_IMAGE = "/dsh-background/pick-image";
		const ROUTE_PICK_FOLDER = "/dsh-background/pick-folder";
		const ROUTE_UPLOAD = "/dsh-background/upload";
		function fitToBackgroundSize(fit) {
			switch (fit) {
				case "center": return "auto";
				case "contain": return "contain";
				case "stretch": return "100% 100%";
				default: return "cover";
			}
		}
		function hexToRgb(hex) {
			const normalized = normalizeOverlayColor(hex);
			return {
				r: Number.parseInt(normalized.slice(1, 3), 16),
				g: Number.parseInt(normalized.slice(3, 5), 16),
				b: Number.parseInt(normalized.slice(5, 7), 16)
			};
		}
		/** Theme-aware translucent fill for conversation / sidebar panels. */
		function surfaceToken(settings) {
			const alpha = Math.max(.15, Math.min(1, settings.surface / 100));
			return document.body?.hasAttribute("data-ds-dark-theme") ?? false ? `rgba(24, 24, 28, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
		}
		function shuffleIndices(length) {
			const indices = Array.from({ length }, (_, i) => i);
			for (let i = indices.length - 1; i > 0; i -= 1) {
				const j = Math.floor(Math.random() * (i + 1));
				[indices[i], indices[j]] = [indices[j], indices[i]];
			}
			return indices;
		}
		function clampInterval(seconds) {
			return Math.max(1, Math.min(300, seconds));
		}
		function clampCrossfade(seconds) {
			return Math.max(.1, Math.min(5, seconds));
		}
		var BackgroundController = class {
			scope;
			listeners = /* @__PURE__ */ new Set();
			state = {
				settings: BACKGROUND_DEFAULTS,
				scopeStatus: "loading",
				images: [],
				folder: "",
				folderError: null,
				currentUrl: null,
				listing: false
			};
			styleEl;
			rootEl;
			imageEls;
			overlayEl;
			front = 0;
			displayedUrl = null;
			timer;
			timerKey = "";
			carouselIndex = 0;
			randomOrder = [];
			listSeq = 0;
			listedFolder = "";
			unsubScope;
			themeObserver;
			effects = new EffectLayer();
			fadeToken = 0;
			fading = false;
			pendingUrl = null;
			/** Bumped whenever the single-image path changes, so the /file URL stays unique. */
			imageRev = 0;
			constructor(scope) {
				this.scope = scope;
			}
			getSnapshot = () => this.state;
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
			/** Bind DOM + settings subscription; returns disposer. */
			start() {
				this.ensureDom();
				this.unsubScope = this.scope.subscribe(() => {
					this.onScope();
				});
				this.onScope();
				if (document.body !== null) {
					this.themeObserver = new MutationObserver(() => {
						this.syncPresentation(false);
					});
					this.themeObserver.observe(document.body, {
						attributes: true,
						attributeFilter: ["data-ds-dark-theme"]
					});
				}
				return () => {
					this.themeObserver?.disconnect();
					this.themeObserver = void 0;
					this.unsubScope?.();
					this.unsubScope = void 0;
					this.clearTimer();
					this.effects.unmount();
					this.teardownDom();
				};
			}
			async setField(field, value) {
				await this.scope.set(field, value);
			}
			async refreshFolderList() {
				const folderPath = this.state.settings.folderPath;
				if (folderPath === "") {
					this.listedFolder = "";
					this.publish({
						...this.state,
						images: [],
						folder: "",
						folderError: null,
						listing: false
					});
					this.syncPresentation(false);
					return;
				}
				const seq = ++this.listSeq;
				this.publish({
					...this.state,
					listing: true,
					folderError: null
				});
				try {
					const response = await fetch(ROUTE_LIST, { cache: "no-store" });
					const body = await response.json();
					if (seq !== this.listSeq) return;
					if (!response.ok) {
						this.publish({
							...this.state,
							listing: false,
							images: [],
							folder: body.folder ?? folderPath,
							folderError: body.error ?? "folder-error"
						});
						this.syncPresentation(false);
						return;
					}
					const images = body.images ?? [];
					const folderChanged = this.listedFolder !== folderPath;
					this.listedFolder = folderPath;
					if (folderChanged) {
						this.carouselIndex = 0;
						this.randomOrder = shuffleIndices(images.length);
					} else if (this.randomOrder.length !== images.length) this.randomOrder = shuffleIndices(images.length);
					this.publish({
						...this.state,
						listing: false,
						images,
						folder: body.folder ?? folderPath,
						folderError: images.length === 0 ? "empty" : null
					});
					this.syncPresentation(false);
				} catch {
					if (seq !== this.listSeq) return;
					this.publish({
						...this.state,
						listing: false,
						images: [],
						folderError: "folder-error"
					});
					this.syncPresentation(false);
				}
			}
			/** Host-native image file dialog; null = cancelled or unavailable. */
			async pickImageFile() {
				const response = await fetch(ROUTE_PICK_IMAGE, { cache: "no-store" });
				const body = await response.json();
				if (!response.ok || typeof body.path !== "string" || body.path === "") return null;
				return body.path;
			}
			/** Host-native folder dialog; null = cancelled or unavailable. */
			async pickFolderPath() {
				try {
					const response = await fetch(ROUTE_PICK_FOLDER, { cache: "no-store" });
					const body = await response.json();
					if (!response.ok || typeof body.path !== "string" || body.path === "") return null;
					return body.path;
				} catch {
					return null;
				}
			}
			/** Browser file-input fallback: upload bytes to host, return absolute path. */
			async uploadImageFile(file) {
				const response = await fetch(ROUTE_UPLOAD, {
					method: "POST",
					headers: {
						"content-type": file.type || "application/octet-stream",
						"x-filename": file.name
					},
					body: file
				});
				const body = await response.json();
				if (!response.ok || typeof body.path !== "string") return null;
				return body.path;
			}
			publish(next) {
				this.state = next;
				for (const listener of this.listeners) listener();
			}
			onScope() {
				const snap = this.scope.getSnapshot();
				const settings = snap.status === "ready" && snap.value !== void 0 ? snap.value : BACKGROUND_DEFAULTS;
				const prev = this.state.settings;
				if (settings.mode === "image" && prev.imagePath !== settings.imagePath) this.imageRev += 1;
				this.publish({
					...this.state,
					settings,
					scopeStatus: snap.status
				});
				const folderPathChanged = prev.folderPath !== settings.folderPath;
				const modeChanged = prev.mode !== settings.mode;
				const enabledChanged = settings.enabled !== prev.enabled;
				if (settings.enabled && settings.mode === "folder" && settings.folderPath !== "") {
					if (folderPathChanged || modeChanged || enabledChanged || this.state.images.length === 0) this.refreshFolderList();
					else this.syncPresentation(false);
				} else this.syncPresentation(false);
			}
			ensureDom() {
				if (this.styleEl === void 0) {
					const style = document.createElement("style");
					style.dataset.plugin = SOURCE;
					style.textContent = PLUGIN_STYLES;
					document.head.appendChild(style);
					this.styleEl = style;
				}
				if (this.rootEl === void 0) {
					const root = document.createElement("div");
					root.dataset.dshBgRoot = "";
					root.setAttribute("aria-hidden", "true");
					const a = document.createElement("div");
					a.dataset.dshBgImage = "0";
					const b = document.createElement("div");
					b.dataset.dshBgImage = "1";
					const overlay = document.createElement("div");
					overlay.dataset.dshBgOverlay = "";
					root.append(a, b, overlay);
					(document.body ?? document.documentElement).prepend(root);
					this.rootEl = root;
					this.imageEls = [a, b];
					this.overlayEl = overlay;
					this.front = 0;
					this.displayedUrl = null;
					this.effects.mount(root);
				}
			}
			teardownDom() {
				document.body?.removeAttribute("data-dsh-background");
				document.body?.removeAttribute("data-dsh-background-extend");
				document.body?.removeAttribute("data-dsh-background-composer");
				document.body?.style.removeProperty("--dsh-bg-surface");
				this.rootEl?.remove();
				this.rootEl = void 0;
				this.imageEls = void 0;
				this.overlayEl = void 0;
				this.styleEl?.remove();
				this.styleEl = void 0;
				this.displayedUrl = null;
				this.front = 0;
			}
			clearTimer() {
				if (this.timer !== void 0) {
					clearInterval(this.timer);
					this.timer = void 0;
				}
				this.timerKey = "";
			}
			/** Arm slideshow timer only when schedule inputs change. */
			ensureCarouselTimer() {
				const { settings, images } = this.state;
				const shouldRun = settings.enabled && settings.mode === "folder" && images.length > 1;
				const interval = clampInterval(settings.intervalSeconds);
				const fade = clampCrossfade(settings.crossfadeSeconds);
				const key = shouldRun ? `run:${interval}:${fade}:${images.length}:${settings.folderOrder}` : "off";
				if (key === this.timerKey) return;
				if (this.timer !== void 0) {
					clearInterval(this.timer);
					this.timer = void 0;
				}
				this.timerKey = key;
				if (!shouldRun) return;
				const ms = Math.max(interval, clampCrossfade(settings.crossfadeSeconds) + .15) * 1e3;
				this.timer = setInterval(() => {
					this.advanceCarousel();
				}, ms);
			}
			fileUrl(settings) {
				if (settings.imagePath === "") return null;
				return `${ROUTE_FILE}?v=${this.imageRev}`;
			}
			currentFolderUrl() {
				const { images, settings } = this.state;
				if (images.length === 0) return null;
				if (settings.folderOrder === "random") {
					if (this.randomOrder.length !== images.length) this.randomOrder = shuffleIndices(images.length);
					return images[this.randomOrder[this.carouselIndex % this.randomOrder.length] ?? 0]?.url ?? null;
				}
				return images[this.carouselIndex % images.length]?.url ?? null;
			}
			advanceCarousel() {
				if (this.fading) return;
				const n = this.state.images.length;
				if (n === 0 || this.state.settings.mode !== "folder") return;
				this.carouselIndex = (this.carouselIndex + 1) % n;
				if (this.state.settings.folderOrder === "random" && this.carouselIndex === 0) this.randomOrder = shuffleIndices(n);
				this.syncPresentation(true);
			}
			styleLayer(el, settings) {
				el.style.backgroundSize = fitToBackgroundSize(settings.fit);
				el.style.filter = settings.blur > 0 ? `blur(${Math.min(20, settings.blur)}px)` : "none";
				const scale = settings.blur > 0 ? 1 + Math.min(20, settings.blur) / 400 : 1;
				el.style.transform = scale === 1 ? "none" : `scale(${scale})`;
			}
			paintUrl(url, crossfade) {
				this.ensureDom();
				const settings = this.state.settings;
				const imageOpacity = Math.max(0, Math.min(1, settings.opacity / 100));
				const layers = this.imageEls;
				if (layers === void 0) return;
				if (url === null) {
					this.fadeToken += 1;
					this.fading = false;
					this.pendingUrl = null;
					for (const el of layers) {
						el.style.transition = "none";
						el.style.backgroundImage = "none";
						el.style.opacity = "0";
						el.style.zIndex = "0";
					}
					this.displayedUrl = null;
					return;
				}
				if (url === this.displayedUrl || this.fading && url === this.pendingUrl) {
					const front = layers[this.front];
					this.styleLayer(front, settings);
					if (!this.fading) {
						front.style.transition = "none";
						front.style.opacity = String(imageOpacity);
						front.style.zIndex = "2";
						const back = layers[1 - this.front];
						back.style.opacity = "0";
						back.style.zIndex = "1";
					}
					return;
				}
				const applySwap = (withFade) => {
					const next = 1 - this.front;
					const incoming = layers[next];
					const outgoing = layers[this.front];
					this.styleLayer(incoming, settings);
					this.styleLayer(outgoing, settings);
					incoming.style.backgroundImage = `url("${url}")`;
					const duration = withFade ? clampCrossfade(settings.crossfadeSeconds) : 0;
					if (duration <= 0) {
						this.fading = false;
						this.pendingUrl = null;
						incoming.style.transition = "none";
						outgoing.style.transition = "none";
						incoming.style.zIndex = "2";
						outgoing.style.zIndex = "1";
						incoming.style.opacity = String(imageOpacity);
						outgoing.style.opacity = "0";
						outgoing.style.backgroundImage = "none";
						this.front = next;
						this.displayedUrl = url;
						return;
					}
					const token = ++this.fadeToken;
					this.fading = true;
					this.pendingUrl = url;
					incoming.style.transition = "none";
					incoming.style.opacity = "0";
					incoming.style.zIndex = "2";
					outgoing.style.zIndex = "1";
					requestAnimationFrame(() => {
						requestAnimationFrame(() => {
							if (token !== this.fadeToken) return;
							incoming.style.transition = `opacity ${duration}s ease-in-out`;
							outgoing.style.transition = `opacity ${duration}s ease-in-out`;
							incoming.style.opacity = String(imageOpacity);
							outgoing.style.opacity = "0";
							this.front = next;
							this.displayedUrl = url;
							window.setTimeout(() => {
								if (token !== this.fadeToken) return;
								this.fading = false;
								this.pendingUrl = null;
								outgoing.style.transition = "none";
								outgoing.style.backgroundImage = "none";
							}, Math.ceil(duration * 1e3) + 40);
						});
					});
				};
				if (!crossfade) {
					applySwap(false);
					return;
				}
				this.fading = true;
				this.pendingUrl = url;
				const probe = new Image();
				const token = ++this.fadeToken;
				probe.onload = () => {
					if (token !== this.fadeToken) return;
					applySwap(true);
				};
				probe.onerror = () => {
					if (token !== this.fadeToken) return;
					applySwap(true);
				};
				probe.src = url;
			}
			syncPresentation(crossfade) {
				this.ensureDom();
				const { settings } = this.state;
				if (!(settings.enabled && (settings.mode === "image" && settings.imagePath !== "" || settings.mode === "folder" && this.state.images.length > 0))) {
					this.clearTimer();
					document.body?.removeAttribute("data-dsh-background");
					document.body?.removeAttribute("data-dsh-background-extend");
					document.body?.removeAttribute("data-dsh-background-composer");
					document.body?.style.removeProperty("--dsh-bg-surface");
					this.paintUrl(null, false);
					if (this.overlayEl) this.overlayEl.style.opacity = "0";
					this.effects.setConfig(false, settings.effectKind, settings.effectDensity, settings.effectSpeed);
					this.publish({
						...this.state,
						currentUrl: null
					});
					return;
				}
				const url = settings.mode === "image" ? this.fileUrl(settings) : this.currentFolderUrl();
				const rgb = hexToRgb(settings.overlayColor);
				const overlayAlpha = Math.max(0, Math.min(1, settings.overlayOpacity / 100));
				this.paintUrl(url, crossfade && settings.mode === "folder");
				if (this.overlayEl) {
					this.overlayEl.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${overlayAlpha})`;
					this.overlayEl.style.opacity = "1";
				}
				document.body?.setAttribute("data-dsh-background", "on");
				document.body?.style.setProperty("--dsh-bg-surface", surfaceToken(settings));
				if (settings.extendChrome) document.body?.setAttribute("data-dsh-background-extend", "on");
				else document.body?.removeAttribute("data-dsh-background-extend");
				if (settings.extendComposer !== false) document.body?.setAttribute("data-dsh-background-composer", "on");
				else document.body?.removeAttribute("data-dsh-background-composer");
				this.ensureCarouselTimer();
				this.effects.setConfig(settings.effectEnabled && settings.enabled, settings.effectKind, settings.effectDensity, settings.effectSpeed);
				this.publish({
					...this.state,
					currentUrl: url
				});
			}
		};
		//#endregion
		//#region src/client/BackgroundSection.tsx
		/**
		* Settings → Background page.
		*/
		function RangeRow(props) {
			const { label, value, min, max, step = 1, format, onChange, disabled } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-bg-section__range",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-bg-section__range-meta",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("output", { children: format(value) })]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "range",
					min,
					max,
					step,
					value,
					disabled,
					onChange: (event) => {
						onChange(Number(event.currentTarget.value));
					}
				})]
			});
		}
		function Seg(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-bg-section__seg",
				role: "group",
				children: props.options.map((opt) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					"aria-pressed": props.value === opt.id,
					disabled: props.disabled,
					onClick: () => {
						props.onChange(opt.id);
					},
					children: opt.label
				}, opt.id))
			});
		}
		function Group(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dsh-bg-section__group",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
					className: "dsh-bg-section__group-title",
					children: props.title
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-bg-section__group-body",
					children: props.children
				})]
			});
		}
		function BackgroundSection({ controller, pickDirectory, t }) {
			const state = (0, react.useSyncExternalStore)(controller.subscribe, controller.getSnapshot);
			const settings = state.settings;
			const enabled = settings.enabled;
			const [pathDraft, setPathDraft] = (0, react.useState)(settings.mode === "image" ? settings.imagePath : settings.folderPath);
			const [picking, setPicking] = (0, react.useState)(false);
			const fileRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				setPathDraft(settings.mode === "image" ? settings.imagePath : settings.folderPath);
			}, [
				settings.mode,
				settings.imagePath,
				settings.folderPath
			]);
			const text = (key) => t(key);
			const patch = (field, value) => {
				controller.setField(field, value);
			};
			const browseFolder = async () => {
				setPicking(true);
				try {
					let dir = await controller.pickFolderPath();
					if (dir === null) dir = await Promise.race([pickDirectory(), new Promise((resolve) => {
						window.setTimeout(() => {
							resolve(null);
						}, 12e4);
					})]);
					if (dir === null) return;
					setPathDraft(dir);
					await controller.setField("folderPath", dir);
					await controller.refreshFolderList();
				} catch {} finally {
					setPicking(false);
				}
			};
			const browseImage = async () => {
				setPicking(true);
				try {
					let path = null;
					try {
						path = await controller.pickImageFile();
					} catch {
						fileRef.current?.click();
						return;
					}
					if (path === null) return;
					setPathDraft(path);
					await controller.setField("imagePath", path);
				} finally {
					setPicking(false);
				}
			};
			const onFilePicked = (file) => {
				if (file === void 0) return;
				controller.uploadImageFile(file).then((path) => {
					if (path === null) return;
					setPathDraft(path);
					return controller.setField("imagePath", path);
				});
			};
			const commitPath = () => {
				const next = pathDraft.trim();
				if (settings.mode === "image") patch("imagePath", next);
				else patch("folderPath", next);
			};
			const previewUrl = state.currentUrl;
			const blurValue = Math.min(20, settings.blur);
			const effectSpeed = settings.effectSpeed ?? 40;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-bg-section",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: "dsh-bg-section__header",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-bg-section__title-row",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: text("title") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dsh-bg-section__intro",
								children: text("intro")
							})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "dsh-bg-section__toggle",
								title: text("enabled"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									id: "dsh-bg-enabled",
									type: "checkbox",
									checked: enabled,
									onChange: (event) => {
										patch("enabled", event.currentTarget.checked);
									}
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {})]
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-bg-section__enable-label",
							children: text("enabled")
						})]
					}),
					!enabled && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-bg-section__banner",
						children: text("disabledBanner")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-bg-section__controls",
						"data-disabled": enabled ? "false" : "true",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Group, {
								title: text("groupSource"),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-bg-section__field",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: text("mode") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Seg, {
											value: settings.mode,
											disabled: !enabled,
											onChange: (id) => {
												patch("mode", id);
											},
											options: [{
												id: "image",
												label: text("modeImage")
											}, {
												id: "folder",
												label: text("modeFolder")
											}]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-bg-section__field",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: settings.mode === "image" ? text("imagePath") : text("folderPath") }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: "dsh-bg-section__hint",
												children: settings.mode === "image" ? text("imagePathHint") : text("folderPathHint")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "dsh-bg-section__path-row",
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
														type: "text",
														value: pathDraft,
														disabled: !enabled,
														spellCheck: false,
														onChange: (event) => {
															setPathDraft(event.currentTarget.value);
														},
														onBlur: commitPath,
														onKeyDown: (event) => {
															if (event.key === "Enter") event.currentTarget.blur();
														}
													}),
													settings.mode === "image" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														disabled: !enabled || picking,
														onClick: () => {
															browseImage();
														},
														children: text("browseImage")
													}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														disabled: !enabled || picking,
														onClick: () => {
															browseFolder();
														},
														children: text("browseFolder")
													}),
													settings.mode === "image" && settings.imagePath !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														disabled: !enabled,
														onClick: () => {
															setPathDraft("");
															patch("imagePath", "");
														},
														children: text("clearImage")
													})
												]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												ref: fileRef,
												type: "file",
												accept: "image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif",
												style: { display: "none" },
												onChange: (event) => {
													onFilePicked(event.currentTarget.files?.[0]);
													event.currentTarget.value = "";
												}
											})
										]
									}),
									previewUrl !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-bg-section__field",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: text("preview") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "dsh-bg-section__preview",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
												src: previewUrl,
												alt: ""
											})
										})]
									})
								]
							}),
							settings.mode === "folder" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Group, {
								title: text("groupPlayback"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-bg-section__dual",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-bg-section__field",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: text("folderOrder") }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Seg, {
												value: settings.folderOrder,
												disabled: !enabled,
												onChange: (id) => {
													patch("folderOrder", id);
												},
												options: [{
													id: "sequential",
													label: text("orderSequential")
												}, {
													id: "random",
													label: text("orderRandom")
												}]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: "dsh-bg-section__meta",
												children: state.folderError === "empty" || state.folderError === "folder-error" ? state.folderError === "empty" ? text("noImages") : text("folderError") : `${state.images.length} ${text("imageCount")}`
											})
										]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-bg-section__field",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: text("fit") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Seg, {
											value: settings.fit,
											disabled: !enabled,
											onChange: (id) => {
												patch("fit", id);
											},
											options: [
												{
													id: "center",
													label: text("fitCenter")
												},
												{
													id: "cover",
													label: text("fitCover")
												},
												{
													id: "contain",
													label: text("fitContain")
												},
												{
													id: "stretch",
													label: text("fitStretch")
												}
											]
										})]
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-bg-section__dual",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RangeRow, {
										label: text("interval"),
										value: Math.min(300, settings.intervalSeconds),
										min: 1,
										max: 300,
										step: 1,
										disabled: !enabled,
										format: (v) => `${v} ${text("intervalUnit")}`,
										onChange: (v) => {
											patch("intervalSeconds", v);
										}
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RangeRow, {
										label: text("crossfade"),
										value: settings.crossfadeSeconds,
										min: .1,
										max: 5,
										step: .1,
										disabled: !enabled,
										format: (v) => `${v.toFixed(1)} ${text("crossfadeUnit")}`,
										onChange: (v) => {
											patch("crossfadeSeconds", Math.round(v * 10) / 10);
										}
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Group, {
								title: text("groupLook"),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-bg-section__row dsh-bg-section__row--inset",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											htmlFor: "dsh-bg-extend",
											children: text("extendChrome")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											className: "dsh-bg-section__hint",
											children: text("extendChromeHint")
										})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: "dsh-bg-section__toggle",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												id: "dsh-bg-extend",
												type: "checkbox",
												checked: settings.extendChrome,
												disabled: !enabled,
												onChange: (event) => {
													patch("extendChrome", event.currentTarget.checked);
												}
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {})]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-bg-section__row dsh-bg-section__row--inset",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											htmlFor: "dsh-bg-extend-composer",
											children: text("extendComposer")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											className: "dsh-bg-section__hint",
											children: text("extendComposerHint")
										})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: "dsh-bg-section__toggle",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												id: "dsh-bg-extend-composer",
												type: "checkbox",
												checked: settings.extendComposer !== false,
												disabled: !enabled,
												onChange: (event) => {
													patch("extendComposer", event.currentTarget.checked);
												}
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {})]
										})]
									}),
									settings.mode === "image" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-bg-section__field",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: text("fit") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Seg, {
											value: settings.fit,
											disabled: !enabled,
											onChange: (id) => {
												patch("fit", id);
											},
											options: [
												{
													id: "center",
													label: text("fitCenter")
												},
												{
													id: "cover",
													label: text("fitCover")
												},
												{
													id: "contain",
													label: text("fitContain")
												},
												{
													id: "stretch",
													label: text("fitStretch")
												}
											]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-bg-section__dual",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RangeRow, {
											label: text("opacity"),
											value: settings.opacity,
											min: 0,
											max: 100,
											disabled: !enabled,
											format: (v) => `${v}%`,
											onChange: (v) => {
												patch("opacity", v);
											}
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RangeRow, {
											label: text("blur"),
											value: blurValue,
											min: 0,
											max: 20,
											disabled: !enabled,
											format: (v) => `${v} px`,
											onChange: (v) => {
												patch("blur", v);
											}
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-bg-section__dual",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RangeRow, {
											label: text("overlayOpacity"),
											value: settings.overlayOpacity,
											min: 0,
											max: 100,
											disabled: !enabled,
											format: (v) => `${v}%`,
											onChange: (v) => {
												patch("overlayOpacity", v);
											}
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RangeRow, {
											label: text("surface"),
											value: settings.surface,
											min: 20,
											max: 100,
											disabled: !enabled,
											format: (v) => `${v}%`,
											onChange: (v) => {
												patch("surface", v);
											}
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dsh-bg-section__hint dsh-bg-section__hint--flush",
										children: text("surfaceHint")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-bg-section__field",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: text("overlayColor") }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-bg-section__color",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "color",
												disabled: !enabled,
												value: normalizeOverlayColor(settings.overlayColor),
												onChange: (event) => {
													patch("overlayColor", normalizeOverlayColor(event.currentTarget.value));
												}
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "text",
												disabled: !enabled,
												spellCheck: false,
												value: settings.overlayColor,
												onChange: (event) => {
													const raw = event.currentTarget.value;
													patch("overlayColor", normalizeOverlayColor(raw, settings.overlayColor));
												}
											})]
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Group, {
								title: text("groupEffect"),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-bg-section__row dsh-bg-section__row--inset",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											htmlFor: "dsh-bg-effect",
											children: text("effectEnabled")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											className: "dsh-bg-section__hint",
											children: text("effectHint")
										})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: "dsh-bg-section__toggle",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												id: "dsh-bg-effect",
												type: "checkbox",
												checked: settings.effectEnabled,
												disabled: !enabled,
												onChange: (event) => {
													patch("effectEnabled", event.currentTarget.checked);
												}
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {})]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-bg-section__field",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: text("effect") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Seg, {
											value: settings.effectKind,
											disabled: !enabled || !settings.effectEnabled,
											onChange: (id) => {
												patch("effectKind", id);
											},
											options: [{
												id: "sakura",
												label: text("effectSakura")
											}, {
												id: "snow",
												label: text("effectSnow")
											}]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-bg-section__dual",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RangeRow, {
											label: text("effectDensity"),
											value: settings.effectDensity,
											min: 1,
											max: 100,
											disabled: !enabled || !settings.effectEnabled,
											format: (v) => `${v}%`,
											onChange: (v) => {
												patch("effectDensity", v);
											}
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RangeRow, {
											label: text("effectSpeed"),
											value: effectSpeed,
											min: 1,
											max: 100,
											disabled: !enabled || !settings.effectEnabled,
											format: (v) => `${v}%`,
											onChange: (v) => {
												patch("effectSpeed", v);
											}
										})]
									})
								]
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		const zh = {
			nav: "背景",
			title: "界面背景",
			intro: "用本机图片或文件夹作为 Harness Web 壁纸，可调填充、透明、模糊与遮罩。",
			enabled: "启用背景",
			enabledHint: "关闭后还原默认界面，下方选项会变为不可用。",
			mode: "来源",
			modeImage: "单张图片",
			modeFolder: "图片文件夹",
			imagePath: "图片绝对路径",
			imagePathHint: "点击「选择图片」打开系统文件对话框（仅图片），或粘贴本机绝对路径。",
			browseFolder: "选择文件夹…",
			browseImage: "选择图片…",
			clearImage: "清除路径",
			folderPath: "文件夹路径",
			folderPathHint: "通过系统目录选择器选取，或手动粘贴绝对路径。",
			folderOrder: "播放顺序",
			orderSequential: "顺序",
			orderRandom: "随机",
			interval: "切换间隔",
			intervalUnit: "秒",
			crossfade: "叠化时间",
			crossfadeUnit: "秒",
			fit: "填充方式",
			fitCenter: "居中",
			fitCover: "覆盖",
			fitContain: "包含",
			fitStretch: "拉伸",
			opacity: "图片透明度",
			blur: "模糊度",
			overlayOpacity: "遮罩透明度",
			overlayColor: "遮罩颜色",
			surface: "面板透明度",
			surfaceHint: "对话列（以及开启扩展后的左侧栏）的半透明程度。",
			extendChrome: "扩展到左侧栏",
			extendChromeHint: "开启后左侧栏也半透明，壁纸透出；对话列始终会按面板透明度透出壁纸。",
			extendComposer: "扩展到消息输入框",
			extendComposerHint: "开启后消息输入框、对话内的代码块与 Markdown 面板也半透明，壁纸透出。",
			preview: "当前图片",
			noImages: "该文件夹下没有可用图片。",
			folderError: "无法读取文件夹。",
			imageCount: "张图片",
			disabledBanner: "背景已禁用，界面已还原。打开上方开关以继续调整。",
			effect: "特效",
			effectEnabled: "启用特效",
			effectHint: "在壁纸上方缓慢飘落樱花或雪花。",
			effectSakura: "樱花",
			effectSnow: "雪花",
			effectDensity: "特效密度",
			effectSpeed: "飘落速度",
			groupSource: "来源与预览",
			groupPlayback: "播放",
			groupLook: "画面",
			groupEffect: "特效"
		};
		const en = {
			nav: "Background",
			title: "Background",
			intro: "Use a local image or folder as the Harness Web wallpaper. Tune fit, opacity, blur, and wash overlay.",
			enabled: "Enable background",
			enabledHint: "When off, the stock UI is restored and the controls below are disabled.",
			mode: "Source",
			modeImage: "Single image",
			modeFolder: "Image folder",
			imagePath: "Image absolute path",
			imagePathHint: "Use “Choose image” for a system image file dialog, or paste an absolute path.",
			browseFolder: "Choose folder…",
			browseImage: "Choose image…",
			clearImage: "Clear path",
			folderPath: "Folder path",
			folderPathHint: "Use the system directory picker, or paste an absolute path.",
			folderOrder: "Order",
			orderSequential: "Sequential",
			orderRandom: "Random",
			interval: "Interval",
			intervalUnit: "sec",
			crossfade: "Crossfade",
			crossfadeUnit: "sec",
			fit: "Fit",
			fitCenter: "Center",
			fitCover: "Cover",
			fitContain: "Contain",
			fitStretch: "Stretch",
			opacity: "Image opacity",
			blur: "Blur",
			overlayOpacity: "Overlay opacity",
			overlayColor: "Overlay color",
			surface: "Panel opacity",
			surfaceHint: "How translucent the conversation column (and sidebar when extended) becomes.",
			extendChrome: "Extend into sidebar",
			extendChromeHint: "Also translucify the left sidebar so the wallpaper shows through. The conversation column always uses panel opacity.",
			extendComposer: "Extend into composer",
			extendComposerHint: "When on, the message input card plus in-conversation code blocks and Markdown surfaces become translucent so the wallpaper shows through.",
			preview: "Current image",
			noImages: "No images in this folder.",
			folderError: "Could not read the folder.",
			imageCount: "images",
			disabledBanner: "Background is off and the stock UI is restored. Turn the switch on to edit options.",
			effect: "Effects",
			effectEnabled: "Enable effects",
			effectHint: "Slow-falling sakura petals or snow over the wallpaper.",
			effectSakura: "Sakura",
			effectSnow: "Snow",
			effectDensity: "Density",
			effectSpeed: "Fall speed",
			groupSource: "Source & preview",
			groupPlayback: "Playback",
			groupLook: "Look",
			groupEffect: "Effects"
		};
		//#endregion
		//#region src/client/index.ts
		/** Locale + settings namespace keys. */
		const LOCALE_NS = "settings.background";
		const SETTINGS_NS = "dsh-background";
		const inject = [
			"slots",
			"locale",
			"settingsScope",
			"workspaces"
		];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(LOCALE_NS, {
				zh,
				en
			}), "dsh-background: locales");
			const controller = new BackgroundController(ctx.settingsScope.bind({ namespace: SETTINGS_NS }));
			ctx.effect(() => controller.start(), "dsh-background: presenter");
			const pickDirectory = () => ctx.workspaces.pickDirectory();
			const injected = () => ({
				controller,
				pickDirectory
			});
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "background",
				order: 32,
				label: () => ctx.locale.bind(LOCALE_NS)("nav"),
				locale: LOCALE_NS,
				inject: injected
			}, BackgroundSection));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map