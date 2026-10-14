/**
 * 天气与昼夜叠加层（全部固定在屏幕上，由场景每帧调用 update）。层次从下到上（构造深度 + 小数偏移）：
 * 1. 天气色调  2. 天气粒子（weather/WeatherParticles）  3. 夜晚遮罩与光圈（weather/NightShade）
 * 4. 异象染色  5. 环境点缀：萤火虫 / 余烬（weather/Ambient）
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import type { Weather } from '../data/weather'
import { buildAmbient, type AmbientKind } from './weather/Ambient'
import { NightShade, type LightSource } from './weather/NightShade'
import { buildWeather, type FxArea, type WeatherFx } from './weather/WeatherParticles'

/** 整屏色调：天气 */
const TINT: Partial<Record<Weather, { color: number; alpha: number }>> = {
  rain: { color: 0x203048, alpha: 0.18 },
  storm: { color: 0x101828, alpha: 0.3 },
  fog: { color: 0xdde6ee, alpha: 0.2 },
  sand: { color: 0xc89048, alpha: 0.16 },
  snow: { color: 0xdde8ff, alpha: 0.12 },
  heartfire: { color: 0xff7aa0, alpha: 0.1 },
}

/** 各层相对构造深度的偏移 */
const LAYER = { tint: 0, fx: 0.1, night: 0.2, extra: 0.3, ambient: 0.4 }

export class WeatherLayer {
  private readonly scene: Phaser.Scene
  private readonly w: number
  private readonly h: number
  private readonly depth: number
  private readonly tintRect: Phaser.GameObjects.Rectangle
  private readonly night: NightShade
  private readonly extraTint: Phaser.GameObjects.Rectangle
  private fx: WeatherFx | null = null
  private ambientObj: Phaser.GameObjects.GameObject | null = null
  private weather: Weather | null = null
  private isNight = false
  private ambient: AmbientKind | null = null

  constructor(scene: Phaser.Scene, depth = 30, area?: { w: number; h: number }) {
    this.scene = scene
    this.depth = depth
    this.w = area?.w ?? scene.scale.width
    this.h = area?.h ?? scene.scale.height
    this.tintRect = this.fullRect(LAYER.tint)
    this.night = new NightShade(scene, this.w, this.h, depth + LAYER.night)
    this.extraTint = this.fullRect(LAYER.extra)
  }

  private area(offset: number): FxArea {
    return { w: this.w, h: this.h, depth: this.depth + offset }
  }

  private fullRect(offset: number): Phaser.GameObjects.Rectangle {
    return this.scene.add
      .rectangle(0, 0, this.w, this.h, 0x000000, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(this.depth + offset)
  }

  /**
   * 切换天气与昼夜；weather 为 null 表示室内 / 城镇无天气效果
   * @author zjh
   * @date 2026-10-14
   */
  set(weather: Weather | null, night: boolean, fullMoon = false): void {
    this.night.set(fullMoon ? 0x1a2460 : 0x0a1440, night ? (fullMoon ? 0.32 : 0.48) : 0)
    if (weather === this.weather && night === this.isNight) return
    this.weather = weather
    this.isNight = night
    const tint = weather ? TINT[weather] : undefined
    this.tintRect.setFillStyle(tint?.color ?? 0, tint?.alpha ?? 0)
    this.clearFx()
    this.fx = weather ? buildWeather(this.scene, weather, night, this.area(LAYER.fx)) : null
    this.rebuildAmbient()
  }

  /** 额外色调（异象地图染色），alpha 0 为关闭 */
  setExtraTint(color: number, alpha: number): void {
    this.extraTint.setFillStyle(color, alpha)
  }

  /** 环境点缀：萤火虫只在夜里出现，余烬常驻 */
  setAmbient(kind: AmbientKind | null): void {
    if (kind === this.ambient) return
    this.ambient = kind
    this.rebuildAmbient()
  }

  private rebuildAmbient(): void {
    this.ambientObj?.destroy()
    this.ambientObj = null
    const kind = this.ambient
    if (!kind || (kind === 'fireflies' && !this.isNight)) return
    this.ambientObj = buildAmbient(this.scene, kind, this.isNight, this.area(LAYER.ambient))
  }

  private clearFx(): void {
    if (!this.fx) return
    this.scene.tweens.killTweensOf(this.fx.objects)
    this.fx.objects.forEach((o) => o.destroy())
    this.fx = null
  }

  /** 夜晚光源（屏幕坐标），通常每帧传入玩家与火光位置 */
  setLights(lights: LightSource[]): void {
    this.night.setLights(lights)
  }

  /** 每帧推进；dt 为毫秒 */
  update(dt: number): void {
    this.fx?.update?.(dt)
    this.night.update(dt)
  }

  destroy(): void {
    this.clearFx()
    this.ambientObj?.destroy()
    this.night.destroy()
    this.tintRect.destroy()
    this.extraTint.destroy()
  }
}
