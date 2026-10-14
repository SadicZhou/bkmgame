/**
 * 动画数值条：HP 条按比例变色（绿→黄→红），经验条固定蓝色
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'

export class HpBar {
  private readonly scene: Phaser.Scene
  private readonly fill: Phaser.GameObjects.Rectangle
  private readonly width: number
  private readonly fixedColor?: number
  private ratio = 1
  private tween?: Phaser.Tweens.Tween

  constructor(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    fixedColor?: number,
  ) {
    this.scene = scene
    this.width = width
    this.fixedColor = fixedColor
    const bg = scene.add.rectangle(x, y, width + 4, height + 4, 0x0a1410).setOrigin(0, 0.5)
    const track = scene.add.rectangle(x + 2, y, width, height, 0x2a3a32).setOrigin(0, 0.5)
    this.fill = scene.add.rectangle(x + 2, y, width, height, fixedColor ?? 0x5ad67a).setOrigin(0, 0.5)
    container.add([bg, track, this.fill])
  }

  private colorFor(r: number): number {
    if (this.fixedColor !== undefined) return this.fixedColor
    if (r > 0.5) return 0x5ad67a
    if (r > 0.2) return 0xf0c040
    return 0xe85a4a
  }

  private paint(r: number): void {
    this.fill.width = Math.max(0, this.width * r)
    this.fill.setFillStyle(this.colorFor(r))
  }

  /**
   * 设置数值；animate 时平滑过渡
   * @author zjh
   * @date 2026-10-14
   */
  set(value: number, max: number, animate = true): void {
    const target = max > 0 ? Phaser.Math.Clamp(value / max, 0, 1) : 0
    this.tween?.stop()
    if (!animate || Math.abs(target - this.ratio) < 0.001) {
      this.ratio = target
      this.paint(target)
      return
    }
    const state = { r: this.ratio }
    this.tween = this.scene.tweens.add({
      targets: state,
      r: target,
      duration: 380,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        this.ratio = state.r
        this.paint(state.r)
      },
    })
  }
}
