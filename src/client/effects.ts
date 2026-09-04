/**
 * Slow-falling sakura / snow overlay on the wallpaper root.
 * Soft depth layers, crystal flakes, and tumbling petals.
 */

export type EffectKind = 'sakura' | 'snow'

type Particle = {
  x: number
  y: number
  size: number
  speedY: number
  speedX: number
  rot: number
  rotSpeed: number
  alpha: number
  /** 0 = far (small/slow), 1 = mid, 2 = near (large/fast). */
  depth: 0 | 1 | 2
  /** Petal / flake color variation 0–1. */
  tint: number
  /** Horizontal sway phase. */
  phase: number
  /** Extra tumble for sakura (scaleX oscillation). */
  wobble: number
  wobbleSpeed: number
  /** Base speeds before effectSpeed scale (keeps motion continuous when speed changes). */
  baseSpeedY: number
  baseSpeedX: number
  baseRotSpeed: number
}

export class EffectLayer {
  private canvas: HTMLCanvasElement | undefined
  private ctx: CanvasRenderingContext2D | undefined
  private particles: Particle[] = []
  private raf = 0
  private running = false
  private kind: EffectKind = 'sakura'
  private density = 40
  private speed = 35
  private width = 0
  private height = 0
  private lastTs = 0
  private onResize: (() => void) | undefined
  private lastKey = ''

  mount(parent: HTMLElement): void {
    if (this.canvas !== undefined) return
    const canvas = document.createElement('canvas')
    canvas.dataset.dshBgEffect = ''
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;'
    parent.appendChild(canvas)
    this.canvas = canvas
    this.ctx = canvas.getContext('2d') ?? undefined
    this.onResize = () => { this.resize() }
    window.addEventListener('resize', this.onResize)
    this.resize()
  }

  unmount(): void {
    this.stop()
    if (this.onResize !== undefined) {
      window.removeEventListener('resize', this.onResize)
      this.onResize = undefined
    }
    this.canvas?.remove()
    this.canvas = undefined
    this.ctx = undefined
    this.particles = []
    this.lastKey = ''
  }

  setConfig(enabled: boolean, kind: EffectKind, density: number, speed = 35): void {
    const nextDensity = Math.max(1, Math.min(100, density))
    const nextSpeed = Math.max(1, Math.min(100, Number(speed)))
    const key = `${enabled ? 1 : 0}:${kind}:${nextDensity}:${nextSpeed}`
    if (key === this.lastKey) return
    this.lastKey = key

    if (!enabled) {
      this.kind = kind
      this.density = nextDensity
      this.speed = nextSpeed
      this.stop()
      this.clear()
      this.particles = []
      return
    }

    const kindChanged = this.kind !== kind
    const densityChanged = this.density !== nextDensity
    const speedChanged = this.speed !== nextSpeed
    const wasEmpty = this.particles.length === 0

    this.kind = kind
    this.density = nextDensity
    this.speed = nextSpeed

    if (wasEmpty || kindChanged) {
      this.rebuild()
    } else {
      if (densityChanged) this.adjustCount()
      if (speedChanged) this.rescaleSpeeds()
    }
    this.start()
  }

  private speedScale(): number {
    // Slider 1→100 maps to ~0.35× … 4.2× so fall speed is clearly perceptible.
    return 0.35 + (this.speed / 100) * 3.85
  }

  private resize(): void {
    if (this.canvas === undefined) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const nextW = window.innerWidth
    const nextH = window.innerHeight
    const sizeChanged = nextW !== this.width || nextH !== this.height
    this.width = nextW
    this.height = nextH
    this.canvas.width = Math.floor(this.width * dpr)
    this.canvas.height = Math.floor(this.height * dpr)
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
    // Keep positions; only top-up/trim count if density target changed with area.
    if (this.running && sizeChanged) this.adjustCount()
  }

  private countForDensity(): number {
    // Keep dense at 100% while LOD (far = dots) keeps draw cheap.
    // Target ~280 snowflakes on 2560×1319 at density 100.
    const area = (this.width * this.height) / (1280 * 720)
    const soft = Math.max(0.75, Math.min(1.85, Math.sqrt(Math.max(0.25, area))))
    const mult = this.kind === 'snow' ? 1.55 : 1.05
    const cap = this.kind === 'snow' ? 320 : 220
    return Math.max(14, Math.min(cap, Math.round(this.density * mult * soft)))
  }

  private pickDepth(): 0 | 1 | 2 {
    const r = Math.random()
    if (r < 0.5) return 0
    if (r < 0.82) return 1
    return 2
  }

  private spawn(partial = false): Particle {
    const scale = this.speedScale()
    const depth = this.pickDepth()
    const depthMul = depth === 0 ? 0.6 : depth === 1 ? 0.9 : 1.3

    let baseSpeedY: number
    let baseSpeedX: number
    let size: number
    let alpha: number

    if (this.kind === 'snow') {
      // ~25–85 px/s before scale → at max slider ~100–350 px/s (clearly visible).
      baseSpeedY = (25 + Math.random() * 60) * depthMul
      baseSpeedX = (Math.random() - 0.5) * (12 + depth * 8)
      size = (1.4 + Math.random() * 2.4) * (depth === 0 ? 0.7 : depth === 1 ? 1 : 1.5)
      alpha = (0.32 + Math.random() * 0.4) * (0.7 + depth * 0.18)
    } else {
      baseSpeedY = (28 + Math.random() * 55) * depthMul
      baseSpeedX = (Math.random() - 0.5) * (16 + depth * 10)
      size = (5 + Math.random() * 7) * (depth === 0 ? 0.65 : depth === 1 ? 1 : 1.3)
      alpha = 0.5 + Math.random() * 0.4
    }

    const baseRotSpeed = (Math.random() - 0.5) * (this.kind === 'snow' ? 0.5 : 1.4)
    return {
      x: Math.random() * this.width,
      y: partial ? Math.random() * this.height : -30 - Math.random() * this.height * 0.35,
      size,
      depth,
      tint: Math.random(),
      phase: Math.random() * Math.PI * 2,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.8 + Math.random() * 1.6,
      baseSpeedY,
      baseSpeedX,
      baseRotSpeed,
      speedY: baseSpeedY * scale,
      speedX: baseSpeedX * scale,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: baseRotSpeed * scale,
      alpha,
    }
  }

  private rebuild(): void {
    const n = this.countForDensity()
    this.particles = Array.from({ length: n }, () => this.spawn(true))
  }

  private adjustCount(): void {
    const n = this.countForDensity()
    if (this.particles.length < n) {
      while (this.particles.length < n) this.particles.push(this.spawn(true))
    } else if (this.particles.length > n) {
      this.particles.length = n
    }
  }

  private rescaleSpeeds(): void {
    const scale = this.speedScale()
    for (const p of this.particles) {
      p.speedY = p.baseSpeedY * scale
      p.speedX = p.baseSpeedX * scale
      p.rotSpeed = p.baseRotSpeed * scale
    }
  }

  private start(): void {
    if (this.running || this.ctx === undefined) return
    this.running = true
    this.lastTs = performance.now()
    const tick = (ts: number): void => {
      if (!this.running) return
      const dt = Math.min(0.05, (ts - this.lastTs) / 1000)
      this.lastTs = ts
      this.step(dt)
      this.draw()
      this.raf = requestAnimationFrame(tick)
    }
    this.raf = requestAnimationFrame(tick)
  }

  private stop(): void {
    this.running = false
    if (this.raf !== 0) {
      cancelAnimationFrame(this.raf)
      this.raf = 0
    }
  }

  private clear(): void {
    if (this.ctx === undefined) return
    this.ctx.clearRect(0, 0, this.width, this.height)
  }

  private step(dt: number): void {
    const scale = this.speedScale()
    for (const p of this.particles) {
      // Sway scales with fall speed so slow/fast settings feel consistent.
      const swayAmp = (this.kind === 'snow' ? 8 + p.depth * 5 : 14 + p.depth * 8) * scale
      const sway = this.kind === 'snow'
        ? Math.sin(p.y * 0.012 + p.phase) * swayAmp
        : Math.sin(p.y * 0.008 + p.phase) * swayAmp + Math.cos(p.wobble) * 6 * scale
      p.y += p.speedY * dt
      p.x += (p.speedX + sway) * dt
      p.rot += p.rotSpeed * dt
      p.wobble += p.wobbleSpeed * dt
      p.phase += dt * 0.4
      if (p.y > this.height + 40) {
        const next = this.spawn(false)
        Object.assign(p, next, { y: -24 - Math.random() * 40 })
      }
      if (p.x < -50) p.x = this.width + 24
      if (p.x > this.width + 50) p.x = -24
    }
  }

  private drawSnowflake(ctx: CanvasRenderingContext2D, p: Particle): void {
    const r = p.size
    // Far flakes: cheap soft dots (most particles). Near: simple 6-arm crystal, no shadowBlur.
    if (p.depth === 0) {
      ctx.fillStyle = `rgba(245, 250, 255, ${p.alpha})`
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fill()
      return
    }

    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, p.alpha + 0.2)})`
    ctx.fillStyle = `rgba(245, 250, 255, ${p.alpha})`
    ctx.lineWidth = Math.max(0.7, r * 0.2)
    ctx.lineCap = 'round'

    ctx.beginPath()
    ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2)
    ctx.fill()

    const arms = 6
    for (let i = 0; i < arms; i++) {
      const a = (i / arms) * Math.PI * 2
      const cos = Math.cos(a)
      const sin = Math.sin(a)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(cos * r, sin * r)
      if (p.depth === 2) {
        const mid = r * 0.55
        const br = r * 0.28
        ctx.moveTo(cos * mid, sin * mid)
        ctx.lineTo(cos * mid - sin * br, sin * mid + cos * br)
        ctx.moveTo(cos * mid, sin * mid)
        ctx.lineTo(cos * mid + sin * br, sin * mid - cos * br)
      }
      ctx.stroke()
    }
  }

  private petalColors(tint: number): { outer: string; inner: string; edge: string } {
    // Soft pinks through blush to near-white tips
    if (tint < 0.25) {
      return { outer: '#ffd6e0', inner: '#ff9eb5', edge: '#ffe8ef' }
    }
    if (tint < 0.55) {
      return { outer: '#ffb7c5', inner: '#ff7a9a', edge: '#ffd0db' }
    }
    if (tint < 0.8) {
      return { outer: '#ffc4ce', inner: '#f28aa4', edge: '#ffe0e6' }
    }
    return { outer: '#ffe4ec', inner: '#ffb0c2', edge: '#fff5f8' }
  }

  /** Single sakura petal path (notched ellipse). */
  private drawPetalShape(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.beginPath()
    ctx.moveTo(0, -h)
    ctx.bezierCurveTo(w * 0.95, -h * 0.55, w * 0.9, h * 0.15, 0, h)
    ctx.bezierCurveTo(-w * 0.9, h * 0.15, -w * 0.95, -h * 0.55, 0, -h)
    ctx.closePath()
  }

  private drawSakura(ctx: CanvasRenderingContext2D, p: Particle): void {
    const colors = this.petalColors(p.tint)
    const flip = Math.cos(p.wobble)
    const scaleX = 0.35 + Math.abs(flip) * 0.65
    const scaleY = 0.85 + Math.sin(p.wobble * 0.7) * 0.15

    ctx.scale(scaleX, scaleY)

    const w = p.size * 0.55
    const h = p.size

    // Far petals: single fill only.
    if (p.depth === 0) {
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = colors.outer
      this.drawPetalShape(ctx, w, h)
      ctx.fill()
      ctx.globalAlpha = 1
      return
    }

    ctx.globalAlpha = p.alpha
    ctx.fillStyle = colors.outer
    this.drawPetalShape(ctx, w, h)
    ctx.fill()

    ctx.globalAlpha = p.alpha * 0.8
    ctx.fillStyle = colors.inner
    this.drawPetalShape(ctx, w * 0.42, h * 0.72)
    ctx.fill()

    if (p.depth === 2) {
      ctx.globalAlpha = p.alpha * 0.5
      ctx.fillStyle = colors.edge
      ctx.beginPath()
      ctx.ellipse(0, -h * 0.55, w * 0.28, h * 0.18, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalAlpha = 1
  }

  private draw(): void {
    const ctx = this.ctx
    if (ctx === undefined) return
    ctx.clearRect(0, 0, this.width, this.height)

    for (const p of this.particles) {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.globalAlpha = p.alpha
      if (this.kind === 'snow') {
        this.drawSnowflake(ctx, p)
      } else {
        this.drawSakura(ctx, p)
      }
      ctx.restore()
    }
  }
}
