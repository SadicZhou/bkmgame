/**
 * 雾泉湖畔演出：搭桥后沧澜鲸跃出水面；结局后回到湖畔时灯台重新点亮
 * @author zjh
 * @date 2026-10-15
 */

import Phaser from 'phaser'
import { setCreatureScale } from '../../graphics/CreatureArt'
import { DECOR } from '../../data/decor'
import type { HasFlag, MapDef } from '../../data/maps'
import { Sfx } from '../../systems/AudioBeeps'
import { BOSS_MAP_SCALE, bossSpecies } from './NpcLayer'

/** 看过灯台点亮演出的旗标 */
export const LIGHT_UP_FLAG = 'lighthouse_lit_seen'
/** 灯台点亮的前提 */
const LIT_FLAG = 'whale_beaten'

/** 进入湖畔时是否需要播放灯台点亮演出 */
export function needsLightUp(map: MapDef, hasFlag: HasFlag): boolean {
  return map.id === 'lake' && hasFlag(LIT_FLAG) && !hasFlag(LIGHT_UP_FLAG)
}

/** 演出前铺装饰用的旗标视图：把灯台当作还没点亮 */
export function beforeLightUp(hasFlag: HasFlag): HasFlag {
  return (k) => k !== LIT_FLAG && hasFlag(k)
}

/** 水面一圈扩散的白色涟漪 */
function ripple(scene: Phaser.Scene, x: number, y: number, delay: number, size = 18): void {
  const ring = scene.add.ellipse(x, y, size, size * 0.4).setStrokeStyle(2, 0xffffff, 0.9).setDepth(8.5).setAlpha(0)
  scene.tweens.add({
    targets: ring,
    delay,
    alpha: { from: 0.9, to: 0 },
    scaleX: 3.2,
    scaleY: 3.2,
    duration: 700,
    onComplete: () => ring.destroy(),
  })
}

/** 落水时四散的水珠 */
function splash(scene: Phaser.Scene, x: number, y: number): void {
  for (let i = 0; i < 14; i++) {
    const drop = scene.add.circle(x, y, Phaser.Math.Between(2, 4), 0xe8f8ff, 0.95).setDepth(12)
    const ang = Phaser.Math.FloatBetween(-Math.PI * 0.95, -Math.PI * 0.05)
    const dist = Phaser.Math.Between(18, 46)
    scene.tweens.add({
      targets: drop,
      x: x + Math.cos(ang) * dist,
      y: y + Math.sin(ang) * dist + 14,
      alpha: 0,
      duration: Phaser.Math.Between(420, 650),
      ease: 'Quad.easeOut',
      onComplete: () => drop.destroy(),
    })
  }
  for (let i = 0; i < 3; i++) ripple(scene, x, y + 6, i * 160, 24)
}

/**
 * 鲸跃：涟漪聚拢 → 沧澜鲸从水下弧线跃起 → 落水溅起水花 → 浮在湖心
 * @author zjh
 * @date 2026-10-15
 */
export function playWhaleLeap(scene: Phaser.Scene, map: MapDef, done: () => void): void {
  const boss = map.npcs.find((n) => n.role === 'boss')
  const species = boss ? bossSpecies(boss) : ''
  const key = `spr-${species}`
  if (!boss || !scene.textures.exists(key)) {
    done()
    return
  }
  const ts = map.tileSize
  const cx = boss.x * ts + ts / 2
  const cy = boss.y * ts + ts / 2
  const scale = BOSS_MAP_SCALE[species] ?? 0.8

  for (let i = 0; i < 4; i++) ripple(scene, cx, cy + 8, i * 220)
  const whale = setCreatureScale(scene.add.image(cx, cy + 30, key), scale).setDepth(11).setAlpha(0)
  const full = whale.scale
  whale.setScale(full * 0.5)

  scene.time.delayedCall(900, () => {
    Sfx.confirm()
    scene.cameras.main.shake(260, 0.004)
    scene.tweens.add({
      targets: whale,
      y: cy - 54,
      alpha: 1,
      scale: full,
      angle: -14,
      duration: 480,
      ease: 'Quad.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: whale,
          y: cy,
          angle: 0,
          duration: 380,
          ease: 'Quad.easeIn',
          onComplete: () => {
            Sfx.win()
            splash(scene, cx, cy + 10)
            scene.tweens.add({ targets: whale, y: cy - 3, yoyo: true, repeat: 1, duration: 420 })
            scene.time.delayedCall(1300, done)
          },
        })
      },
    })
  })
}

/**
 * 灯台点亮：在熄灭的灯台上叠一张点亮的灯台淡入，灯头光晕膨胀、三道光环扩散、白闪
 * @author zjh
 * @date 2026-10-15
 */
export function playLighthouseLightUp(scene: Phaser.Scene, map: MapDef, done: () => void): void {
  const lit = (DECOR[map.id] ?? []).find((d) => d.key === 'decor-lighthouse')
  if (!lit || !scene.textures.exists(lit.key)) {
    done()
    return
  }
  const ts = map.tileSize
  const bx = (lit.x + lit.w / 2) * ts
  const by = (lit.y + lit.h) * ts
  const lampX = bx + (lit.fxAt?.x ?? 0)
  const lampY = by + (lit.fxAt?.y ?? 0)

  const img = scene.add.image(bx, by, lit.key).setOrigin(0.5, 1).setDepth(5.5).setAlpha(0)
  const glow = scene.add.image(lampX, lampY, 'fx-soft').setTint(0xfff0b0).setBlendMode(Phaser.BlendModes.ADD).setDepth(6).setScale(0.2).setAlpha(0)

  scene.time.delayedCall(600, () => {
    Sfx.confirm()
    scene.tweens.add({ targets: glow, alpha: 0.8, scale: 6, duration: 900, ease: 'Sine.easeOut' })
    scene.tweens.add({ targets: img, alpha: 1, duration: 900, delay: 200 })
    for (let i = 0; i < 3; i++) {
      const ring = scene.add.image(lampX, lampY, 'fx-ring').setTint(0xffe8a0).setBlendMode(Phaser.BlendModes.ADD).setDepth(6).setAlpha(0)
      scene.tweens.add({ targets: ring, delay: 500 + i * 380, scale: { from: 1, to: 9 }, alpha: { from: 0.8, to: 0 }, duration: 1300 })
    }
  })
  scene.time.delayedCall(1700, () => {
    Sfx.win()
    scene.cameras.main.flash(500, 255, 246, 210)
  })
  scene.time.delayedCall(2900, done)
}
