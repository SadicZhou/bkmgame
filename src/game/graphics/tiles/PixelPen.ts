/**
 * 像素画笔：在 CanvasTexture 上逐像素绘制地图块，带可复现的随机数（同一 seed 每次画出同一张图）
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'

/** 0xRRGGBB → CSS 颜色 */
function css(color: number, alpha = 1): string {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`
}

export class PixelPen {
  private seed: number
  readonly ctx: CanvasRenderingContext2D
  readonly w: number
  readonly h: number

  constructor(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
    this.ctx = ctx
    this.w = w
    this.h = h
    this.seed = seed >>> 0 || 1
  }

  /** 0~1 伪随机（mulberry32） */
  rand(): number {
    this.seed = (this.seed + 0x6d2b79f5) >>> 0
    let t = this.seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** [min, max] 整数 */
  int(min: number, max: number): number {
    return min + Math.floor(this.rand() * (max - min + 1))
  }

  rect(x: number, y: number, w: number, h: number, color: number, alpha = 1): void {
    this.ctx.fillStyle = css(color, alpha)
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
  }

  px(x: number, y: number, color: number, alpha = 1): void {
    this.rect(x, y, 1, 1, color, alpha)
  }

  fill(color: number): void {
    this.rect(0, 0, this.w, this.h, color)
  }

  /** 在区域内随机撒 count 个 size×size 的点 */
  speckle(color: number, count: number, size = 1, x0 = 0, y0 = 0, w = this.w, h = this.h, alpha = 1): void {
    for (let i = 0; i < count; i++) this.rect(x0 + this.int(0, w - size), y0 + this.int(0, h - size), size, size, color, alpha)
  }

  /** 像素风实心圆（逐行填充，边缘不做抗锯齿） */
  disc(cx: number, cy: number, r: number, color: number, alpha = 1): void {
    for (let y = -r; y <= r; y++) {
      const half = Math.floor(Math.sqrt(r * r - y * y))
      this.rect(cx - half, cy + y, half * 2 + 1, 1, color, alpha)
    }
  }

  /** 环绕取模的单像素：越界的部分从对边画回来，用于无缝平铺的图块 */
  wpx(x: number, y: number, color: number, alpha = 1): void {
    const wx = ((Math.round(x) % this.w) + this.w) % this.w
    const wy = ((Math.round(y) % this.h) + this.h) % this.h
    this.px(wx, wy, color, alpha)
  }

  /**
   * 环绕的柔和色斑：越靠中心点越密、边缘逐渐稀疏，做明暗过渡且不会出现圆形硬边
   * @author zjh
   * @date 2026-10-15
   */
  ditherDisc(cx: number, cy: number, r: number, color: number, alpha = 1): void {
    const r2 = r * r
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        const d2 = x * x + y * y
        if (d2 > r2 || this.rand() > (1 - d2 / r2) * 0.7) continue
        this.wpx(cx + x, cy + y, color, alpha)
      }
    }
  }

  /** 竖直草叶：底部 (x, baseY) 向上 len 像素，顶端 lean 偏移，尖端用 tip 色 */
  blade(x: number, baseY: number, len: number, color: number, tip: number, lean = 0): void {
    for (let i = 0; i < len; i++) {
      const ox = Math.round((lean * i) / Math.max(1, len - 1))
      this.px(x + ox, baseY - i, i >= len - 2 ? tip : color)
    }
  }
}

/**
 * 生成一张 Canvas 纹理（已存在则跳过）
 * @author zjh
 * @date 2026-10-14
 */
export function paintCanvas(scene: Phaser.Scene, key: string, w: number, h: number, seed: number, draw: (p: PixelPen) => void): void {
  if (scene.textures.exists(key)) return
  const tex = scene.textures.createCanvas(key, w, h)
  if (!tex) return
  const ctx = tex.getContext()
  ctx.imageSmoothingEnabled = false
  draw(new PixelPen(ctx, w, h, seed))
  tex.refresh()
}
