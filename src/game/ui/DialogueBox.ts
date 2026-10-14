/**
 * 底部对话框：打字机逐字显示，确认键先补全当前行、再翻到下一行
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { Sfx } from '../systems/AudioBeeps'

/** 每个字符显示间隔（毫秒） */
const CHAR_MS = 28

export class DialogueBox {
  private readonly scene: Phaser.Scene
  private readonly root: Phaser.GameObjects.Container
  private readonly text: Phaser.GameObjects.Text
  private readonly hint: Phaser.GameObjects.Text
  private lines: string[] = []
  private index = 0
  private shown = 0
  private timer?: Phaser.Time.TimerEvent
  private onClose?: () => void
  private hintTween?: Phaser.Tweens.Tween

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    const { width: w, height: h } = scene.scale
    const box = scene.add.rectangle(w / 2, h - 70, w - 24, 104, 0x102018, 0.94)
    box.setStrokeStyle(2, 0xa8e6c0)
    this.text = scene.add.text(26, h - 112, '', {
      fontSize: '16px',
      color: '#e8f5ee',
      wordWrap: { width: w - 64, useAdvancedWrap: true },
      lineSpacing: 6,
    })
    this.hint = scene.add
      .text(w - 30, h - 30, '▼', { fontSize: '14px', color: '#7ec8a3' })
      .setOrigin(1, 1)
    this.root = scene.add
      .container(0, 0, [box, this.text, this.hint])
      .setScrollFactor(0)
      .setDepth(600)
      .setVisible(false)
    box.setInteractive().on('pointerdown', () => this.advance())
  }

  get isOpen(): boolean {
    return this.root.visible
  }

  /**
   * 打开对话
   * @author zjh
   * @date 2026-10-14
   */
  open(lines: string[], onClose?: () => void): void {
    if (!lines.length) {
      onClose?.()
      return
    }
    this.lines = lines
    this.index = 0
    this.onClose = onClose
    this.root.setVisible(true)
    this.startLine()
  }

  private get current(): string {
    return this.lines[this.index] ?? ''
  }

  private startLine(): void {
    this.shown = 0
    this.text.setText('')
    this.hint.setVisible(false)
    this.hintTween?.stop()
    this.timer?.remove()
    this.timer = this.scene.time.addEvent({
      delay: CHAR_MS,
      loop: true,
      callback: () => {
        this.shown++
        this.text.setText(this.current.slice(0, this.shown))
        if (this.shown % 3 === 0) Sfx.talk()
        if (this.shown >= this.current.length) this.finishLine()
      },
    })
  }

  private finishLine(): void {
    this.timer?.remove()
    this.timer = undefined
    this.shown = this.current.length
    this.text.setText(this.current)
    this.hint.setVisible(true).setY(this.scene.scale.height - 30)
    this.hintTween = this.scene.tweens.add({
      targets: this.hint,
      y: this.scene.scale.height - 26,
      yoyo: true,
      repeat: -1,
      duration: 350,
    })
  }

  /** 确认键：打字中则补全，否则翻页 */
  advance(): void {
    if (!this.isOpen) return
    if (this.shown < this.current.length) {
      this.finishLine()
      return
    }
    this.index++
    if (this.index >= this.lines.length) {
      this.close()
      return
    }
    this.startLine()
  }

  close(): void {
    this.timer?.remove()
    this.hintTween?.stop()
    this.root.setVisible(false)
    const cb = this.onClose
    this.onClose = undefined
    cb?.()
  }
}
