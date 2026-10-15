/**
 * 钓鱼表现：甩竿 → 浮漂轻晃 → 浮漂下沉 + 头顶「！」→ 收竿
 * 只负责动画与计时，判定规则在 systems/Fishing。
 * @author zjh
 * @date 2026-10-15
 */

import Phaser from 'phaser'
import { Sfx } from '../systems/AudioBeeps'
import { FISHING, judgeReel, rollBiteDelay, type ReelResult } from '../systems/Fishing'

type Phase = 'idle' | 'casting' | 'waiting' | 'bite'

export interface FishingHooks {
  /** 结束：上钩 / 太早 / 溜走 */
  onEnd: (result: ReelResult) => void
}

const CAST_MS = 400
const DEPTH = 12

export class FishingOverlay {
  private phase: Phase = 'idle'
  private biteAt = 0
  private objs: Phaser.GameObjects.GameObject[] = []
  private timers: Phaser.Time.TimerEvent[] = []
  private bobber?: Phaser.GameObjects.Container
  private line?: Phaser.GameObjects.Graphics
  private from = { x: 0, y: 0 }
  private hooks?: FishingHooks
  private readonly scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  get active(): boolean {
    return this.phase !== 'idle'
  }

  /**
   * 甩竿：from 为玩家位置，to 为目标水面中心（世界坐标）
   * @author zjh
   * @date 2026-10-15
   */
  start(from: { x: number; y: number }, to: { x: number; y: number }, hooks: FishingHooks): void {
    if (this.active) return
    this.hooks = hooks
    this.phase = 'casting'
    this.from = { x: from.x, y: from.y - 14 }
    Sfx.step()

    this.line = this.scene.add.graphics().setDepth(DEPTH)
    this.objs.push(this.line)
    const bob = this.scene.add.container(this.from.x, this.from.y).setDepth(DEPTH + 0.1)
    bob.add([this.scene.add.circle(0, 0, 4, 0xffffff), this.scene.add.rectangle(0, -2, 8, 4, 0xe84848)])
    this.bobber = bob
    this.objs.push(bob)

    this.scene.tweens.add({
      targets: bob,
      x: to.x,
      y: to.y,
      duration: CAST_MS,
      ease: 'Quad.easeOut',
      onUpdate: () => this.drawLine(),
      onComplete: () => this.beginWait(to),
    })
  }

  /** 玩家按确认 */
  confirm(): void {
    if (this.phase === 'waiting') this.finish('early')
    else if (this.phase === 'bite') this.finish(judgeReel(this.scene.time.now - this.biteAt))
  }

  /** 每帧刷新钓线（浮漂在晃） */
  update(): void {
    if (this.active) this.drawLine()
  }

  private beginWait(to: { x: number; y: number }): void {
    if (this.phase !== 'casting' || !this.bobber) return
    this.phase = 'waiting'
    this.ripple(to.x, to.y)
    this.scene.tweens.add({ targets: this.bobber, y: to.y + 2, yoyo: true, repeat: -1, duration: 520, ease: 'Sine.easeInOut' })
    this.timers.push(this.scene.time.delayedCall(rollBiteDelay(), () => this.bite(to)))
  }

  /** 咬钩：浮漂下沉、头顶「！」，开启 0.6 秒窗口 */
  private bite(to: { x: number; y: number }): void {
    if (this.phase !== 'waiting' || !this.bobber) return
    this.phase = 'bite'
    this.biteAt = this.scene.time.now
    this.scene.tweens.killTweensOf(this.bobber)
    this.scene.tweens.add({ targets: this.bobber, y: to.y + 6, duration: 90 })
    this.ripple(to.x, to.y)
    Sfx.confirm()
    const mark = this.scene.add
      .text(this.from.x, this.from.y - 26, '！', { fontSize: '20px', color: '#ff5040', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(DEPTH + 1)
    this.objs.push(mark)
    this.scene.tweens.add({ targets: mark, scale: { from: 0.4, to: 1.15 }, duration: 120, yoyo: true, hold: 200 })
    this.timers.push(this.scene.time.delayedCall(FISHING.windowMs, () => this.phase === 'bite' && this.finish('escaped')))
  }

  /** 水面涟漪 */
  private ripple(x: number, y: number): void {
    const r = this.scene.add.ellipse(x, y + 3, 10, 4).setStrokeStyle(1, 0xffffff, 0.9).setDepth(DEPTH - 0.1)
    this.scene.tweens.add({ targets: r, scaleX: 2.6, scaleY: 2.6, alpha: 0, duration: 600, onComplete: () => r.destroy() })
  }

  private drawLine(): void {
    if (!this.line || !this.bobber) return
    this.line.clear()
    this.line.lineStyle(1, 0xf8f8f0, 0.9)
    this.line.lineBetween(this.from.x, this.from.y, this.bobber.x, this.bobber.y - 2)
  }

  private finish(result: ReelResult): void {
    this.cleanup()
    if (result === 'hooked') Sfx.win()
    else Sfx.cancel()
    this.hooks?.onEnd(result)
  }

  /** 清理全部对象与计时器（也用于场景切换前） */
  cleanup(): void {
    this.phase = 'idle'
    for (const t of this.timers) t.remove(false)
    this.timers = []
    for (const o of this.objs) {
      this.scene.tweens.killTweensOf(o)
      o.destroy()
    }
    this.objs = []
    this.bobber = undefined
    this.line = undefined
  }
}
