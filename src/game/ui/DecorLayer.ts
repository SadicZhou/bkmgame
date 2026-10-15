/**
 * 地图装饰层：按 data/decor 摆放房屋 / 温泉 / 火盆 / 家具，并附加蒸汽与火焰动效。
 * 立体物件深度 5（在人物 9~10 之下，占地格不可通行，不会与人物重叠）；地毯深度 0.6。
 * 缺图时跳过该物件。
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { DECOR, decorVisible, type DecorFx } from '../data/decor'
import type { HasFlag, MapDef } from '../data/maps'

/** 温泉蒸汽：白色柔光团缓慢上升、变大、淡出 */
function steam(scene: Phaser.Scene, x: number, y: number): void {
  scene.add
    .particles(x, y, 'fx-soft', {
      x: { min: -20, max: 20 },
      y: { min: -6, max: 10 },
      lifespan: 2200,
      speedY: { min: -12, max: -22 },
      speedX: { min: -4, max: 4 },
      scale: { start: 0.8, end: 2.2 },
      alpha: { start: 0.5, end: 0 },
      frequency: 260,
    })
    .setDepth(6)
}

/** 火焰：跳动的暖色光晕 + 上飘的余烬 */
function flame(scene: Phaser.Scene, x: number, y: number): void {
  const glow = scene.add.image(x, y, 'fx-soft').setTint(0xffb050).setBlendMode(Phaser.BlendModes.ADD).setScale(3).setAlpha(0.45).setDepth(6)
  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.3, to: 0.55 },
    scale: { from: 2.6, to: 3.4 },
    duration: 380,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })
  scene.add
    .particles(x, y, 'fx-dot', {
      x: { min: -5, max: 5 },
      lifespan: { min: 600, max: 1100 },
      speedY: { min: -18, max: -40 },
      speedX: { min: -8, max: 8 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0.2 },
      tint: [0xffe08a, 0xffb050, 0xff8040],
      frequency: 180,
      blendMode: Phaser.BlendModes.ADD,
    })
    .setDepth(6)
}

/** 灯台：大片暖白光晕缓慢呼吸，外圈一道淡淡的光环向外扩散 */
function beacon(scene: Phaser.Scene, x: number, y: number): void {
  const glow = scene.add.image(x, y, 'fx-soft').setTint(0xfff0b0).setBlendMode(Phaser.BlendModes.ADD).setScale(4).setAlpha(0.5).setDepth(6)
  scene.tweens.add({ targets: glow, alpha: { from: 0.35, to: 0.6 }, scale: { from: 3.6, to: 4.6 }, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
  const ring = scene.add.image(x, y, 'fx-ring').setTint(0xffe8a0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(6)
  scene.tweens.add({ targets: ring, scale: { from: 1, to: 6 }, alpha: { from: 0.6, to: 0 }, duration: 1800, repeat: -1 })
}

const FX: Record<DecorFx, (scene: Phaser.Scene, x: number, y: number) => void> = { steam, flame, beacon }

/** 会发光的动效（夜里作为光源） */
const LIGHT_FX = new Set<DecorFx>(['flame', 'beacon'])

/**
 * 当前地图的火光 / 灯光位置（世界坐标），夜里用作光源
 * @author zjh
 * @date 2026-10-14
 */
export function decorLights(map: MapDef, hasFlag: HasFlag): { x: number; y: number }[] {
  const ts = map.tileSize
  return (DECOR[map.id] ?? [])
    .filter((d) => d.fx && LIGHT_FX.has(d.fx) && decorVisible(d, hasFlag))
    .map((d) => ({ x: (d.x + d.w / 2) * ts + (d.fxAt?.x ?? 0), y: (d.y + d.h) * ts + (d.fxAt?.y ?? 0) }))
}

/**
 * 铺设当前地图的装饰物（按剧情旗标切换显示，如灯台熄灭 / 点亮）
 * @author zjh
 * @date 2026-10-14
 */
export function renderDecor(scene: Phaser.Scene, map: MapDef, hasFlag: HasFlag): void {
  const ts = map.tileSize
  for (const d of DECOR[map.id] ?? []) {
    if (!scene.textures.exists(d.key) || !decorVisible(d, hasFlag)) continue
    const bx = (d.x + d.w / 2) * ts
    if (d.flat) {
      scene.add.image(bx, (d.y + d.h / 2) * ts, d.key).setDepth(0.6)
      continue
    }
    const by = (d.y + d.h) * ts
    scene.add.image(bx, by, d.key).setOrigin(0.5, 1).setDepth(5)
    if (d.fx) FX[d.fx](scene, bx + (d.fxAt?.x ?? 0), by + (d.fxAt?.y ?? 0))
  }
}
