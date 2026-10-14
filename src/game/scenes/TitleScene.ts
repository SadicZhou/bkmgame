/**
 * 标题 / 新游戏 / 读档（支持键盘上下选择）
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { DEX_ORDER, displayName } from '../data/creatures'
import { GameState } from '../state/GameState'
import { Sfx } from '../systems/AudioBeeps'
import { loadGame } from '../systems/SaveSystem'
import { InputKeys } from '../ui/InputKeys'
import { fadeIn, fadeToScene } from '../ui/Transition'

interface TitleButton {
  bg: Phaser.GameObjects.Rectangle
  enabled: boolean
  run: () => void
}

export class TitleScene extends Phaser.Scene {
  private keys!: InputKeys
  private buttons: TitleButton[] = []
  private choice = 0
  private leaving = false

  constructor() {
    super('Title')
  }

  create(): void {
    const { width, height } = this.scale
    this.buttons = []
    this.leaving = false

    this.add.rectangle(0, 0, width, height, 0x1a2e28).setOrigin(0)
    // 粉彩氛围块（可爱像素向）
    this.add.rectangle(width / 2, height * 0.32, width, height * 0.48, 0x3d6b5a, 0.85)
    this.add.circle(80, 60, 40, 0xffb7c5, 0.35)
    this.add.circle(width - 60, 100, 50, 0xffe08a, 0.28)

    this.add
      .text(width / 2, 64, '焰迹旅人', {
        fontFamily: 'Georgia, "Songti SC", serif',
        fontSize: '44px',
        color: '#fff6e8',
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, 112, 'Embertrail · 可爱像素短篇', {
        fontSize: '15px',
        color: '#b8f0d0',
      })
      .setOrigin(0.5)

    const mascots = ['spr-flarehorn', 'spr-tideback', 'spr-leafkit']
    mascots.forEach((key, i) => {
      const img = this.add.image(width / 2 + (i - 1) * 80, 192, key).setScale(i === 1 ? 1.35 : 1.55)
      this.tweens.add({ targets: img, y: 184, yoyo: true, repeat: -1, duration: 700 + i * 120, ease: 'Sine.easeInOut' })
    })

    const save = loadGame()
    this.makeButton(width / 2, 280, '开始新旅程', true, () => {
      GameState.newGame()
      fadeToScene(this, 'World')
    })
    this.makeButton(width / 2, 336, '读取存档', !!save, () => {
      if (GameState.tryLoad()) fadeToScene(this, 'World')
      else this.leaving = false
    })

    if (save) {
      const lead = save.party[0]
      const mins = Math.floor(save.playSeconds / 60)
      const cleared = save.flags.game_cleared ? ' ｜ ★ 已通关' : ''
      this.add
        .text(
          width / 2,
          372,
          `${displayName(lead)} Lv.${lead.level} 等 ${save.party.length} 只 ｜ 图鉴 ${save.dex.caught.length}/${DEX_ORDER.length} ｜ ${mins} 分钟${cleared}`,
          { fontSize: '12px', color: '#a8d8c0' },
        )
        .setOrigin(0.5)
      this.choice = 1
    } else {
      this.choice = 0
    }
    this.highlight()

    this.add
      .text(width / 2, height - 36, '方向键/WASD 移动 · 空格对话/确认 · Esc 菜单 · 触控可用', {
        fontSize: '12px',
        color: '#6a8f7c',
      })
      .setOrigin(0.5)

    this.keys = new InputKeys(this)
    fadeIn(this)
  }

  update(): void {
    const input = this.keys.poll()
    if (this.leaving) return
    if (input.up || input.down) {
      const next = input.up ? this.choice - 1 : this.choice + 1
      if (next >= 0 && next < this.buttons.length && this.buttons[next].enabled) {
        this.choice = next
        Sfx.step()
        this.highlight()
      }
    } else if (input.confirm) {
      this.press(this.choice)
    }
  }

  private press(i: number): void {
    const b = this.buttons[i]
    if (!b || this.leaving) return
    if (!b.enabled) {
      Sfx.cancel()
      return
    }
    this.leaving = true
    Sfx.confirm()
    b.run()
  }

  private highlight(): void {
    this.buttons.forEach((b, i) => {
      const on = i === this.choice
      b.bg.setFillStyle(on ? 0x3a7a58 : 0x2a5a42)
      b.bg.setStrokeStyle(2, on ? 0xffd77a : 0xa8e6c0)
    })
  }

  private makeButton(x: number, y: number, label: string, enabled: boolean, run: () => void): void {
    const idx = this.buttons.length
    const bg = this.add.rectangle(x, y, 220, 44, 0x2a5a42, 1).setStrokeStyle(2, 0xa8e6c0)
    const text = this.add.text(x, y, label, { fontSize: '18px', color: '#e8f5ee' }).setOrigin(0.5)
    if (!enabled) {
      bg.setAlpha(0.4)
      text.setAlpha(0.4)
    }
    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        if (!enabled) return
        this.choice = idx
        this.highlight()
      })
      .on('pointerdown', () => this.press(idx))
    this.buttons.push({ bg, enabled, run })
  }
}
