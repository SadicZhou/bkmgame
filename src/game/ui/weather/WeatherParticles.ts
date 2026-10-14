/**
 * 各天气的粒子与动效（固定在屏幕上，scrollFactor 0）：
 * - 晴：白天斜射光束 + 漂浮花粉（夜里不画光束）
 * - 雨 / 雷雨：斜雨丝 + 地面溅开的水圈；雷雨另有闪电（折线闪光 + 屏幕闪白 + 轻微震屏）
 * - 雾：大团柔光缓慢漂移
 * - 沙暴：横飞的沙粒 + 沙色雾团
 * - 雪：大小两层雪花，左右飘摆
 * - 心火：粉色光点从下方升起
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import type { Weather } from '../../data/weather'

export interface FxArea {
  w: number
  h: number
  depth: number
}

/** 一种天气生成的对象集合；update 可选（闪电计时等） */
export interface WeatherFx {
  objects: Phaser.GameObjects.GameObject[]
  update?: (dt: number) => void
}

type Config = Phaser.Types.GameObjects.Particles.ParticleEmitterConfig

/** 创建屏幕空间的粒子发射器，并预先模拟一段时间，避免开场画面是空的 */
function emitter(scene: Phaser.Scene, area: FxArea, texture: string, config: Config, advance = 3000) {
  return scene.add
    .particles(0, 0, texture, { advance, ...config })
    .setScrollFactor(0)
    .setDepth(area.depth)
}

/** 雨丝 + 水圈；heavy 为雷雨 */
function rain(scene: Phaser.Scene, a: FxArea, heavy: boolean): Phaser.GameObjects.GameObject[] {
  const vy = heavy ? 640 : 520
  const vx = heavy ? -130 : -60
  const drops = emitter(scene, a, 'fx-drop', {
    x: { min: 0, max: a.w + 120 },
    y: -12,
    speedY: { min: vy * 0.85, max: vy * 1.15 },
    speedX: vx,
    lifespan: ((a.h + 24) / vy) * 1000,
    rotate: Phaser.Math.RadToDeg(Math.atan2(-vx, vy)),
    scaleY: { min: 1, max: 1.6 },
    scaleX: 1.2,
    alpha: heavy ? 0.85 : 0.72,
    tint: heavy ? 0xdce8ff : 0xc4e0ff,
    frequency: heavy ? 6 : 10,
    quantity: 1,
  })
  const splash = emitter(scene, a, 'fx-ring', {
    x: { min: 0, max: a.w },
    y: { min: a.h * 0.25, max: a.h },
    lifespan: 380,
    scale: { start: 0.4, end: 1.5 },
    alpha: { start: 0.85, end: 0 },
    tint: 0xd8ecff,
    frequency: heavy ? 30 : 55,
  })
  return [drops, splash]
}

/** 雷雨闪电：随机间隔画一道折线闪电并闪白 */
function lightning(scene: Phaser.Scene, a: FxArea): { gfx: Phaser.GameObjects.Graphics; update: (dt: number) => void } {
  const gfx = scene.add.graphics().setScrollFactor(0).setDepth(a.depth + 0.5)
  let timer = 2500
  const strike = (): void => {
    gfx.clear()
    let x = Phaser.Math.Between(a.w * 0.15, a.w * 0.85)
    let y = 0
    const pts: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(x, y)]
    while (y < a.h * 0.6) {
      x += Phaser.Math.Between(-26, 26)
      y += Phaser.Math.Between(18, 34)
      pts.push(new Phaser.Math.Vector2(x, y))
    }
    gfx.lineStyle(7, 0xb8d4ff, 0.35).strokePoints(pts)
    gfx.lineStyle(2, 0xffffff, 1).strokePoints(pts)
    gfx.setAlpha(1)
    scene.tweens.add({ targets: gfx, alpha: 0, duration: 260, delay: 60 })
    scene.cameras.main.flash(140, 225, 235, 255)
    scene.cameras.main.shake(160, 0.003)
  }
  const update = (dt: number): void => {
    timer -= dt
    if (timer <= 0) {
      timer = 4000 + Math.random() * 6000
      strike()
    }
  }
  return { gfx, update }
}

/** 晴天光束：几道斜向的暖白光带，透明度缓慢呼吸 */
function sunRays(scene: Phaser.Scene, a: FxArea): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setScrollFactor(0).setDepth(a.depth).setBlendMode(Phaser.BlendModes.ADD)
  const rays = [
    [0.12, 46],
    [0.34, 28],
    [0.58, 60],
    [0.8, 24],
  ]
  for (const [fx, width] of rays) {
    const x = a.w * fx
    g.fillStyle(0xfff0c0, 0.12)
    g.fillPoints(
      [
        new Phaser.Math.Vector2(x, 0),
        new Phaser.Math.Vector2(x + width, 0),
        new Phaser.Math.Vector2(x + width - a.h * 0.45, a.h),
        new Phaser.Math.Vector2(x - a.h * 0.45, a.h),
      ],
      true,
    )
  }
  scene.tweens.add({ targets: g, alpha: { from: 0.55, to: 1 }, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
  return g
}

/** 大团柔光雾 / 沙尘雾 */
function haze(scene: Phaser.Scene, a: FxArea, tint: number, alpha: number, speed: number): Phaser.GameObjects.Particles.ParticleEmitter {
  return emitter(
    scene,
    a,
    'fx-soft',
    {
      x: -120,
      y: { min: 0, max: a.h },
      speedX: { min: speed * 0.6, max: speed * 1.2 },
      speedY: { min: -4, max: 4 },
      lifespan: ((a.w + 240) / speed) * 1000,
      scale: { min: 12, max: 20 },
      alpha: { start: alpha, end: alpha * 0.6 },
      tint,
      frequency: (a.w + 240) / speed / 9 * 1000,
    },
    ((a.w + 240) / speed) * 1000,
  )
}

/**
 * 生成某天气的全部动效对象
 * @author zjh
 * @date 2026-10-14
 */
export function buildWeather(scene: Phaser.Scene, weather: Weather, night: boolean, a: FxArea): WeatherFx {
  switch (weather) {
    case 'sunny': {
      const pollen = emitter(scene, a, 'fx-dot', {
        x: { min: 0, max: a.w },
        y: { min: 0, max: a.h },
        lifespan: 5000,
        speedX: { min: 6, max: 18 },
        speedY: { min: -10, max: 4 },
        scale: { min: 0.7, max: 1.3 },
        alpha: { onEmit: () => 0, onUpdate: (_p, _k, t) => Math.sin(t * Math.PI) * 0.95 },
        tint: [0xfff4b0, 0xffffff],
        frequency: 260,
      })
      return { objects: night ? [pollen] : [sunRays(scene, a), pollen] }
    }
    case 'rain':
      return { objects: rain(scene, a, false) }
    case 'storm': {
      const bolt = lightning(scene, a)
      return { objects: [...rain(scene, a, true), bolt.gfx], update: bolt.update }
    }
    case 'fog':
      return { objects: [haze(scene, a, 0xffffff, 0.18, 14), haze(scene, a, 0xe6eef6, 0.12, 22)] }
    case 'sand': {
      const grains = emitter(scene, a, 'fx-dot', {
        x: -10,
        y: { min: 0, max: a.h },
        speedX: { min: 320, max: 460 },
        speedY: { min: 10, max: 40 },
        lifespan: ((a.w + 20) / 320) * 1000,
        scaleX: { min: 2, max: 4 },
        scaleY: 0.8,
        alpha: { min: 0.55, max: 0.9 },
        tint: [0xe8c080, 0xd8a868, 0xf4dca8],
        frequency: 8,
      })
      return { objects: [haze(scene, a, 0xd8a868, 0.24, 60), grains] }
    }
    case 'snow': {
      const sway = { onUpdate: (p: Phaser.GameObjects.Particles.Particle, _k: string, t: number) => Math.sin(t * 10 + p.x * 0.05) * 30 }
      const small = emitter(scene, a, 'fx-dot', {
        x: { min: -20, max: a.w + 20 },
        y: -6,
        speedY: { min: 50, max: 80 },
        speedX: { min: -15, max: 15 },
        accelerationX: sway,
        lifespan: ((a.h + 12) / 50) * 1000,
        scale: { min: 0.6, max: 1 },
        alpha: 0.85,
        frequency: 45,
      }, 9000)
      const big = emitter(scene, a, 'fx-soft', {
        x: { min: -20, max: a.w + 20 },
        y: -10,
        speedY: { min: 28, max: 45 },
        speedX: { min: -10, max: 10 },
        accelerationX: sway,
        lifespan: ((a.h + 20) / 28) * 1000,
        scale: { min: 0.35, max: 0.55 },
        alpha: 0.9,
        frequency: 140,
      }, 15000)
      return { objects: [small, big] }
    }
    case 'heartfire':
      return {
        objects: [
          emitter(scene, a, 'fx-soft', {
            x: { min: 0, max: a.w },
            y: a.h + 8,
            speedY: { min: -25, max: -55 },
            speedX: { min: -10, max: 10 },
            lifespan: 7000,
            scale: { start: 1.1, end: 0.3 },
            alpha: { onEmit: () => 0, onUpdate: (_p, _k, t) => Math.sin(t * Math.PI) },
            tint: [0xff6a9a, 0xff90b8, 0xff9050],
            frequency: 55,
          }),
        ],
      }
  }
}
