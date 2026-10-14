/**
 * 战斗动画效果：冲撞、受击、倒下、闪光、抛果、进化、能力升降箭头、状态脉冲、未命中
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { Sfx } from '../systems/AudioBeeps'

type Img = Phaser.GameObjects.Image

export class BattleFx {
  private readonly scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  lunge(spr: Img, dir: 1 | -1): void {
    this.scene.tweens.add({ targets: spr, x: spr.x + dir * 24, yoyo: true, duration: 90 })
  }

  /**
   * 受击：闪烁 + 飘字；效果拔群时震屏
   * @author zjh
   * @date 2026-10-14
   */
  hurt(spr: Img, dmg: number, mult?: number): void {
    Sfx.hit()
    this.scene.time.delayedCall(120, () => {
      this.scene.tweens.add({ targets: spr, alpha: 0.2, yoyo: true, repeat: 2, duration: 70, onComplete: () => spr.setAlpha(1) })
      if (mult && mult > 1) this.scene.cameras.main.shake(180, 0.008)
      if (dmg > 0) this.floatText(spr.x, spr.y - 50, `-${dmg}`, mult && mult > 1 ? '#ffd040' : '#ffffff', mult && mult > 1 ? 22 : 18)
    })
  }

  floatText(x: number, y: number, text: string, color: string, size = 18): void {
    const t = this.scene.add
      .text(x, y, text, { fontSize: `${size}px`, color, stroke: '#000000', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(50)
    this.scene.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 700, onComplete: () => t.destroy() })
  }

  miss(spr: Img): void {
    Sfx.cancel()
    this.floatText(spr.x, spr.y - 50, 'MISS', '#a8c8ff', 16)
    this.scene.tweens.add({ targets: spr, x: spr.x + 18, yoyo: true, duration: 120 })
  }

  faint(spr: Img): void {
    Sfx.cancel()
    this.scene.tweens.add({ targets: spr, y: spr.y + 40, alpha: 0, duration: 420, ease: 'Quad.easeIn' })
  }

  tintFlash(spr: Img, color: number, ms = 300): void {
    spr.setTint(color)
    this.scene.time.delayedCall(ms, () => spr.clearTint())
  }

  sparkle(x: number, y: number, color: number, count = 10): void {
    for (let i = 0; i < count; i++) {
      const s = this.scene.add.star(x, y, 4, 2, 5, color).setDepth(40)
      const a = (i / count) * Math.PI * 2
      this.scene.tweens.add({
        targets: s,
        x: x + Math.cos(a) * 60,
        y: y + Math.sin(a) * 60,
        alpha: 0,
        angle: 180,
        duration: 600,
        onComplete: () => s.destroy(),
      })
    }
  }

  /** 能力升降：一串上升或下降的箭头 */
  statArrows(spr: Img, up: boolean): void {
    up ? Sfx.confirm() : Sfx.cancel()
    const color = up ? '#ff9a6a' : '#7ab0ff'
    for (let i = 0; i < 5; i++) {
      const x = spr.x - 40 + i * 20
      const y0 = spr.y + (up ? 30 : -40)
      const t = this.scene.add.text(x, y0, up ? '▲' : '▼', { fontSize: '16px', color }).setOrigin(0.5).setDepth(45)
      this.scene.tweens.add({
        targets: t,
        y: y0 + (up ? -60 : 60),
        alpha: 0,
        delay: i * 60,
        duration: 500,
        onComplete: () => t.destroy(),
      })
    }
    this.tintFlash(spr, up ? 0xffb090 : 0x90b0ff)
  }

  /** 异常状态脉冲 */
  statusPulse(spr: Img): void {
    Sfx.hit()
    this.scene.tweens.add({ targets: spr, scaleX: spr.scaleX * 1.08, scaleY: spr.scaleY * 0.92, yoyo: true, repeat: 1, duration: 110 })
    this.tintFlash(spr, 0xc8a0ff, 360)
  }

  throwBerry(from: { x: number; y: number }, to: { x: number; y: number }): void {
    Sfx.confirm()
    const berry = this.scene.add.image(from.x, from.y - 20, 'spr-berry').setScale(2).setDepth(45)
    const state = { t: 0 }
    const sx = berry.x
    const sy = berry.y
    this.scene.tweens.add({
      targets: state,
      t: 1,
      duration: 480,
      onUpdate: () => {
        berry.setPosition(sx + (to.x - sx) * state.t, sy + (to.y - sy) * state.t - Math.sin(state.t * Math.PI) * 120)
        berry.setAngle(state.t * 540)
      },
      onComplete: () => {
        this.scene.tweens.add({ targets: berry, alpha: 0, duration: 300, delay: 300, onComplete: () => berry.destroy() })
      },
    })
  }

  /**
   * 进化 / 觉醒：白闪 + 缩放 + 换贴图
   * @author zjh
   * @date 2026-10-14
   */
  evolve(spr: Img, newTexture: string, home: { x: number; y: number }, baseScale: number, glow = 0xffe066): void {
    this.scene.cameras.main.flash(500, 255, 255, 255)
    spr.setTintFill(0xffffff)
    this.scene.tweens.add({
      targets: spr,
      scale: { from: baseScale, to: baseScale * 1.2 },
      yoyo: true,
      repeat: 3,
      duration: 120,
      onComplete: () => {
        spr.setTexture(newTexture).clearTint().setScale(baseScale)
        this.sparkle(home.x, home.y, glow)
        Sfx.win()
      },
    })
  }
}
