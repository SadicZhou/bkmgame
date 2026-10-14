/**
 * 标题 / 新游戏 / 读档
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { GameState } from '../state/GameState'
import { Sfx } from '../systems/AudioBeeps'

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title')
  }

  create(): void {
    const { width, height } = this.scale

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

    this.add.image(width / 2 - 80, 188, 'spr-flarehorn').setScale(1.55)
    this.add.image(width / 2, 200, 'spr-tideback').setScale(1.35)
    this.add.image(width / 2 + 80, 188, 'spr-leafkit').setScale(1.55)

    const has = GameState.hasSaveFile()
    this.makeButton(width / 2, 280, '开始新旅程', () => {
      GameState.newGame()
      Sfx.confirm()
      this.scene.start('World')
    })

    const loadBtn = this.makeButton(width / 2, 340, '读取存档', () => {
      if (GameState.tryLoad()) {
        Sfx.confirm()
        this.scene.start('World')
      } else {
        Sfx.cancel()
      }
    })
    if (!has) {
      loadBtn.setAlpha(0.4)
    }

    this.add
      .text(width / 2, height - 36, '方向键/WASD 移动 · 空格对话 · Esc 菜单 · 触控可用', {
        fontSize: '12px',
        color: '#6a8f7c',
      })
      .setOrigin(0.5)
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, 220, 44, 0x2a5a42, 1).setStrokeStyle(2, 0xa8e6c0)
    const text = this.add
      .text(0, 0, label, { fontSize: '18px', color: '#e8f5ee' })
      .setOrigin(0.5)
    const c = this.add.container(x, y, [bg, text])
    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => bg.setFillStyle(0x3a7a58))
      .on('pointerout', () => bg.setFillStyle(0x2a5a42))
      .on('pointerdown', onClick)
    return c
  }
}
