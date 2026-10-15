/**
 * 战斗消息框右侧的 2×2 指令按钮：渲染、键盘 / 点击选择、返回
 * 左侧消息文本显示「提示 + 当前选项说明」。
 * @author zjh
 * @date 2026-10-15
 */

import Phaser from 'phaser'
import { Sfx } from '../../systems/AudioBeeps'
import type { InputFrame } from '../../ui/InputKeys'

/** 指令按钮 */
export interface BattleOption {
  label: string
  /** 选中时左侧说明 */
  info?: string
  disabled?: boolean
  onSelect: () => void
}

const BTN_X = 400
const BTN_W = 148
const BTN_H = 40
const COL_GAP = 156
const ROW_GAP = 50
/** 显示指令时消息文本的换行宽度（给按钮让位） */
export const MENU_TEXT_WIDTH = 300

export class OptionMenu {
  private readonly scene: Phaser.Scene
  private readonly msgText: Phaser.GameObjects.Text
  private readonly boxY: number
  private readonly layer: Phaser.GameObjects.Container
  options: BattleOption[] = []
  index = 0
  private back?: () => void
  private prompt = ''

  constructor(scene: Phaser.Scene, msgText: Phaser.GameObjects.Text, boxY: number, depth: number) {
    this.scene = scene
    this.msgText = msgText
    this.boxY = boxY
    this.layer = scene.add.container(0, 0).setDepth(depth)
  }

  /** 是否正在显示指令 */
  get isOpen(): boolean {
    return this.options.length > 0
  }

  clear(): void {
    this.layer.removeAll(true)
    this.options = []
    this.back = undefined
  }

  /**
   * 显示一组指令；onBack 为空时不显示「返回」
   * @author zjh
   * @date 2026-10-15
   */
  show(prompt: string, options: BattleOption[], onBack?: () => void, index = 0): void {
    this.clear()
    this.options = options
    this.back = onBack
    this.index = Math.max(0, Math.min(index, options.length - 1))
    this.prompt = prompt
    this.msgText.setWordWrapWidth(MENU_TEXT_WIDTH)
    this.render()
  }

  /** 每帧导航：左右 ±1、上下 ±2 */
  handle(input: InputFrame): void {
    const n = this.options.length
    let next = this.index
    if (input.left) next = this.index - 1
    if (input.right) next = this.index + 1
    if (input.up) next = this.index - 2
    if (input.down) next = this.index + 2
    if (next !== this.index && next >= 0 && next < n) {
      this.index = next
      Sfx.step()
      this.render()
      return
    }
    if (input.confirm) this.choose(this.index)
    else if (input.cancel && this.back) {
      Sfx.cancel()
      this.back()
    }
  }

  /** 选中第 i 个指令（禁用项只播放提示音） */
  choose(i: number): void {
    const o = this.options[i]
    if (!o) return
    this.index = i
    if (o.disabled) {
      Sfx.cancel()
      return
    }
    Sfx.confirm()
    o.onSelect()
  }

  private render(): void {
    this.layer.removeAll(true)
    const sel = this.options[this.index]
    this.msgText.setText(sel?.info ? `${this.prompt}\n${sel.info}` : this.prompt)

    this.options.forEach((o, i) => {
      const x = BTN_X + (i % 2) * COL_GAP
      const y = this.boxY + 30 + Math.floor(i / 2) * ROW_GAP
      const selected = i === this.index
      const bg = this.scene.add
        .rectangle(x, y, BTN_W, BTN_H, selected ? 0x3a7a58 : 0x1c3a2c)
        .setStrokeStyle(2, selected ? 0xffd77a : 0x4a7a60)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (this.options[i] === o) this.choose(i)
        })
      const t = this.scene.add
        .text(x, y, o.label, { fontSize: '14px', color: o.disabled ? '#6a7f74' : '#e8f5ee' })
        .setOrigin(0.5)
      this.layer.add([bg, t])
    })

    if (this.back) {
      const back = this.scene.add
        .text(26, this.scene.scale.height - 12, '◀ 返回', { fontSize: '13px', color: '#7ec8a3' })
        .setOrigin(0, 1)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          Sfx.cancel()
          this.back?.()
        })
      this.layer.add(back)
    }
  }
}
