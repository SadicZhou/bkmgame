/**
 * 天气与昼夜叠加层：夜晚蓝调、雨丝、雾气、沙尘、雪花、心火光点、雷闪
 * 全部元素固定在屏幕上（scrollFactor 0），由场景每帧调用 update 推进。
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import type { Weather } from '../data/weather'

interface Drop {
  obj: Phaser.GameObjects.Rectangle
  vx: number
  vy: number
}

/** 各天气的粒子外观：数量、尺寸、颜色、速度（像素/秒） */
const DROP_STYLE: Partial<Record<Weather, { n: number; w: number; h: number; color: number; alpha: number; vx: number; vy: number }>> = {
  rain: { n: 70, w: 1, h: 10, color: 0xa8d0ff, alpha: 0.55, vx: -60, vy: 520 },
  storm: { n: 90, w: 1, h: 12, color: 0xc0dcff, alpha: 0.6, vx: -120, vy: 640 },
  sand: { n: 60, w: 6, h: 1, color: 0xe8c080, alpha: 0.5, vx: 380, vy: 30 },
  snow: { n: 55, w: 3, h: 3, color: 0xffffff, alpha: 0.8, vx: -20, vy: 60 },
  heartfire: { n: 28, w: 3, h: 3, color: 0xff9ab8, alpha: 0.7, vx: 0, vy: -40 },
}

/** 整屏色调：夜晚 / 天气 */
const TINT: Partial<Record<Weather, { color: number; alpha: number }>> = {
  rain: { color: 0x203048, alpha: 0.18 },
  storm: { color: 0x101828, alpha: 0.3 },
  fog: { color: 0xdde6ee, alpha: 0.22 },
  sand: { color: 0xc89048, alpha: 0.18 },
  snow: { color: 0xdde8ff, alpha: 0.12 },
  heartfire: { color: 0xff7aa0, alpha: 0.1 },
}

export class WeatherLayer {
  private readonly scene: Phaser.Scene
  private readonly w: number
  private readonly h: number
  private readonly depth: number
  private readonly nightRect: Phaser.GameObjects.Rectangle
  private readonly tintRect: Phaser.GameObjects.Rectangle
  private readonly extraTint: Phaser.GameObjects.Rectangle
  private drops: Drop[] = []
  private fogBlobs: Phaser.GameObjects.Ellipse[] = []
  private weather: Weather | null = null
  private flashTimer = 0

  constructor(scene: Phaser.Scene, depth = 30, area?: { w: number; h: number }) {
    this.scene = scene
    this.depth = depth
    this.w = area?.w ?? scene.scale.width
    this.h = area?.h ?? scene.scale.height
    this.tintRect = this.fullRect(0x000000, 0)
    this.nightRect = this.fullRect(0x0a1440, 0)
    this.extraTint = this.fullRect(0x000000, 0)
  }

  private fullRect(color: number, alpha: number): Phaser.GameObjects.Rectangle {
    return this.scene.add.rectangle(0, 0, this.w, this.h, color, alpha).setOrigin(0).setScrollFactor(0).setDepth(this.depth)
  }

  /**
   * 切换天气与昼夜；weather 为 null 表示室内 / 城镇无天气效果
   * @author zjh
   * @date 2026-10-14
   */
  set(weather: Weather | null, night: boolean, fullMoon = false): void {
    this.nightRect.setFillStyle(fullMoon ? 0x1a2460 : 0x0a1440, night ? (fullMoon ? 0.28 : 0.4) : 0)
    if (weather === this.weather) return
    this.weather = weather
    this.clearDrops()
    const tint = weather ? TINT[weather] : undefined
    this.tintRect.setFillStyle(tint?.color ?? 0, tint?.alpha ?? 0)
    const style = weather ? DROP_STYLE[weather] : undefined
    if (style) {
      for (let i = 0; i < style.n; i++) {
        const obj = this.scene.add
          .rectangle(Math.random() * this.w, Math.random() * this.h, style.w, style.h, style.color, style.alpha)
          .setScrollFactor(0)
          .setDepth(this.depth)
        const jitter = 0.7 + Math.random() * 0.6
        this.drops.push({ obj, vx: style.vx * jitter, vy: style.vy * jitter })
      }
    }
    if (weather === 'fog') {
      for (let i = 0; i < 6; i++) {
        const e = this.scene.add
          .ellipse(Math.random() * this.w, Math.random() * this.h, 260, 90, 0xffffff, 0.1)
          .setScrollFactor(0)
          .setDepth(this.depth)
        this.fogBlobs.push(e)
      }
    }
  }

  /** 额外色调（异象地图染色），alpha 0 为关闭 */
  setExtraTint(color: number, alpha: number): void {
    this.extraTint.setFillStyle(color, alpha)
  }

  private clearDrops(): void {
    this.drops.forEach((d) => d.obj.destroy())
    this.fogBlobs.forEach((e) => e.destroy())
    this.drops = []
    this.fogBlobs = []
  }

  /** 每帧推进粒子；dt 为毫秒 */
  update(dt: number): void {
    const s = dt / 1000
    for (const d of this.drops) {
      d.obj.x += d.vx * s
      d.obj.y += d.vy * s
      if (d.obj.y > this.h + 10) d.obj.y = -10
      if (d.obj.y < -10) d.obj.y = this.h + 10
      if (d.obj.x > this.w + 10) d.obj.x = -10
      if (d.obj.x < -10) d.obj.x = this.w + 10
    }
    for (const e of this.fogBlobs) {
      e.x += 12 * s
      if (e.x > this.w + 140) e.x = -140
    }
    if (this.weather === 'storm') {
      this.flashTimer -= dt
      if (this.flashTimer <= 0) {
        this.flashTimer = 4000 + Math.random() * 6000
        this.scene.cameras.main.flash(120, 220, 230, 255)
      }
    }
  }

  destroy(): void {
    this.clearDrops()
    this.nightRect.destroy()
    this.tintRect.destroy()
    this.extraTint.destroy()
  }
}
