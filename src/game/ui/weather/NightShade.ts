/**
 * 夜晚遮罩：整屏深蓝半透明，在光源处擦出柔和光圈（玩家提灯、火盆、壁炉）。
 * 用 DynamicTexture 每帧重绘（夜里）：先铺满夜色，再用 fx-light 按光源位置与半径擦除。
 * 光源坐标为屏幕坐标，由场景每帧通过 setLights 传入；不传光源时就是普通的整屏夜色。
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'

export interface LightSource {
  x: number
  y: number
  /** 光圈半径（px） */
  r: number
}

/** fx-light 纹理半径 */
const STAMP_R = 64

/** 动态纹理需要唯一 key：同名会与其他场景的遮罩互相覆盖 */
let seq = 0

export class NightShade {
  private readonly rt: Phaser.Textures.DynamicTexture
  private readonly view: Phaser.GameObjects.Image
  private readonly stamp: Phaser.GameObjects.Image
  private color = 0x0a1440
  private alpha = 0
  private lights: LightSource[] = []
  private flicker = 0
  private destroyed = false

  constructor(scene: Phaser.Scene, w: number, h: number, depth: number) {
    const rt = scene.textures.addDynamicTexture(`night-shade-${++seq}`, w, h)
    if (!rt) throw new Error('无法创建夜晚遮罩纹理')
    this.rt = rt
    this.view = scene.add.image(0, 0, rt).setOrigin(0).setScrollFactor(0).setDepth(depth)
    this.stamp = scene.make.image({ key: 'fx-light', add: false })
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy())
  }

  /** 设置夜色；alpha 为 0 时隐藏 */
  set(color: number, alpha: number): void {
    this.color = color
    this.alpha = alpha
    this.view.setVisible(alpha > 0)
    this.update(0)
  }

  /** 更新光源（屏幕坐标） */
  setLights(lights: LightSource[]): void {
    this.lights = lights
  }

  /** 每帧重绘遮罩（只画一次时内容不会保留）；有光源时加一点火光跳动 */
  update(dt: number): void {
    if (this.alpha <= 0 || this.destroyed) return
    this.flicker += dt
    const rt = this.rt
    rt.clear()
    rt.fill(this.color, this.alpha)
    this.lights.forEach((l, i) => {
      const wobble = 1 + Math.sin(this.flicker / 140 + i * 1.7) * 0.03
      this.stamp.setScale((l.r / STAMP_R) * wobble)
      rt.erase(this.stamp, l.x, l.y)
    })
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.view.destroy()
    this.stamp.destroy()
    this.rt.destroy()
  }
}
