/**
 * 大地图上的小表现：地图名横幅、短提示、踩草叶片、雾泉螈搭桥演出
 * @author zjh
 * @date 2026-10-15
 */

import Phaser from 'phaser'
import { setCreatureScale } from '../../graphics/CreatureArt'
import { tileAt, type MapDef } from '../../data/maps'
import { Sfx } from '../../systems/AudioBeeps'

/**
 * 进入地图时顶部滑入地图名
 * @author zjh
 * @date 2026-10-14
 */
export function showMapBanner(scene: Phaser.Scene, name: string): void {
  const w = scene.scale.width
  const banner = scene.add
    .text(w / 2, -30, `— ${name} —`, {
      fontSize: '18px',
      color: '#fff6e8',
      backgroundColor: '#1a2e28dd',
      padding: { x: 16, y: 8 },
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(800)
  scene.tweens.add({
    targets: banner,
    y: 64,
    duration: 350,
    ease: 'Back.easeOut',
    hold: 1100,
    yoyo: true,
    onComplete: () => banner.destroy(),
  })
}

/** 屏幕中上方的短提示；连续多条时向下错开 */
export class Toaster {
  private count = 0
  private readonly scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  show(msg: string): void {
    const offset = (this.count++ % 3) * 30
    const t = this.scene.add
      .text(this.scene.scale.width / 2, 60 + offset, msg, {
        fontSize: '14px',
        color: '#fff',
        backgroundColor: '#000000aa',
        padding: { x: 10, y: 6 },
      })
      .setScrollFactor(0)
      .setOrigin(0.5)
      // 高于 ListPanel（1100），在面板中操作时的反馈也能看清
      .setDepth(1200)
    this.scene.tweens.add({
      targets: t,
      alpha: 0,
      delay: 1300,
      duration: 400,
      onComplete: () => {
        t.destroy()
        this.count = Math.max(0, this.count - 1)
      },
    })
  }
}

/** 踩草时冒出几片小叶子（冰面上是冰晶） */
export function rustleAt(scene: Phaser.Scene, cx: number, cy: number, color: number): void {
  for (let i = 0; i < 3; i++) {
    const leaf = scene.add.rectangle(cx, cy + 6, 4, 4, color).setDepth(12)
    scene.tweens.add({
      targets: leaf,
      x: leaf.x + Phaser.Math.Between(-12, 12),
      y: leaf.y - Phaser.Math.Between(8, 16),
      alpha: 0,
      duration: 320,
      onComplete: () => leaf.destroy(),
    })
  }
}

/**
 * 雾泉螈搭桥：从岸边到湖心依次在每个浮桥格冒出一只雾泉螈，结束后回调（由调用方重绘地图）
 * @author zjh
 * @date 2026-10-15
 */
export function playBridgeCutscene(scene: Phaser.Scene, map: MapDef, done: () => void): void {
  const ts = map.tileSize
  const cells: { x: number; y: number }[] = []
  for (let y = map.height - 1; y >= 0; y--) {
    for (let x = 0; x < map.width; x++) if (tileAt(map, x, y) === 'bridge') cells.push({ x, y })
  }
  const key = scene.textures.exists('spr-mistnewt') ? 'spr-mistnewt' : 'fx-soft'
  cells.forEach((c, i) => {
    scene.time.delayedCall(350 + i * 380, () => {
      const cx = c.x * ts + ts / 2
      const cy = c.y * ts + ts / 2
      const newt = setCreatureScale(scene.add.image(cx, cy + 10, key), 0.55).setDepth(11).setAlpha(0)
      scene.tweens.add({ targets: newt, y: cy, alpha: 1, duration: 260, ease: 'Back.easeOut' })
      const splash = scene.add.ellipse(cx, cy + 6, 12, 5).setStrokeStyle(1, 0xffffff, 0.9).setDepth(10.9)
      scene.tweens.add({ targets: splash, scaleX: 2.4, scaleY: 2.4, alpha: 0, duration: 500, onComplete: () => splash.destroy() })
      Sfx.step()
    })
  })
  scene.time.delayedCall(350 + cells.length * 380 + 500, () => {
    Sfx.win()
    scene.cameras.main.flash(300, 220, 250, 255)
    done()
  })
}
