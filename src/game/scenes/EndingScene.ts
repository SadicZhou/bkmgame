/**
 * 通关结局：感谢画面 + 本次旅程统计；自动存档，可继续冒险或回标题
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { setCreatureScale } from '../graphics/CreatureArt'
import { addBackdrop } from '../graphics/SceneArt'
import { DEX_ORDER, battleName, spriteKey } from '../data/creatures'
import { GameState } from '../state/GameState'
import { Sfx } from '../systems/AudioBeeps'
import { InputKeys } from '../ui/InputKeys'
import { fadeIn, fadeToScene } from '../ui/Transition'

/** 秒 → 「X 小时 Y 分」 */
function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h} 小时 ${m} 分` : `${m} 分 ${sec % 60} 秒`
}

export class EndingScene extends Phaser.Scene {
  private keys!: InputKeys
  private choice = 0
  private buttons: { bg: Phaser.GameObjects.Rectangle; run: () => void }[] = []
  private leaving = false

  constructor() {
    super('Ending')
  }

  create(): void {
    const { width, height } = this.scale
    this.choice = 0
    this.buttons = []
    this.leaving = false
    GameState.setFlag('game_cleared', true)
    GameState.persist()

    if (!addBackdrop(this, 'bg-ending', 0.3)) this.add.rectangle(0, 0, width, height, 0x1a1020).setOrigin(0)
    // 缓缓上升的余烬
    for (let i = 0; i < 40; i++) {
      const e = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(1, 3),
        Phaser.Math.RND.pick([0xffb050, 0xff7050, 0xffe08a]),
        0.8,
      )
      this.tweens.add({
        targets: e,
        y: -10,
        alpha: 0.1,
        duration: Phaser.Math.Between(4000, 9000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
        onRepeat: () => {
          e.setPosition(Phaser.Math.Between(0, width), height + 10)
          e.setAlpha(0.8)
        },
      })
    }

    const title = this.add
      .text(width / 2, 60, '雾散灯明', {
        fontFamily: 'Georgia, "Songti SC", serif',
        fontSize: '40px',
        color: '#ffe08a',
      })
      .setOrigin(0.5)
      .setAlpha(0)
    this.tweens.add({ targets: title, alpha: 1, y: 70, duration: 1200 })

    const lines = [
      '山巅的火种重燃，湖心的灯台也再次亮起。',
      '沧澜鲸的长鸣让雾泉湖畔恢复了平静。',
      '可那些黑色灯罩是谁留下的？焰迹旅人的旅途，还在继续……',
    ]
    lines.forEach((l, i) => {
      const t = this.add
        .text(width / 2, 124 + i * 26, l, { fontSize: '16px', color: '#f0e6c8' })
        .setOrigin(0.5)
        .setAlpha(0)
      this.tweens.add({ targets: t, alpha: 1, delay: 800 + i * 700, duration: 800 })
    })

    // 队伍展示
    const party = GameState.party
    const gap = Math.min(96, (width - 80) / Math.max(1, party.length))
    const startX = width / 2 - (gap * (party.length - 1)) / 2
    party.forEach((c, i) => {
      const x = startX + i * gap
      const img = setCreatureScale(this.add.image(x, 252, spriteKey(c)), 1.4).setAlpha(0)
      this.add
        .text(x, 296, `${battleName(c)}\nLv.${c.level}`, { fontSize: '12px', color: '#e8f5ee', align: 'center' })
        .setOrigin(0.5, 0)
      this.tweens.add({ targets: img, alpha: 1, delay: 2600 + i * 200, duration: 500 })
      this.tweens.add({ targets: img, y: 246, yoyo: true, repeat: -1, duration: 600 + i * 80, delay: 3000 })
    })

    const dexCaught = GameState.dex.caught.filter((id) => DEX_ORDER.includes(id)).length
    const stats = `游玩时长 ${formatTime(GameState.totalSeconds())} ｜ 第 ${GameState.day()} 天 ｜ 图鉴 ${dexCaught}/${DEX_ORDER.length} ｜ 焰币 ${GameState.coins}`
    this.add.text(width / 2, 346, stats, { fontSize: '13px', color: '#b8f0d0' }).setOrigin(0.5)
    this.add
      .text(width / 2, 368, '（已自动存档）  制作：周建豪 · Embertrail', { fontSize: '11px', color: '#8a7a90' })
      .setOrigin(0.5)

    this.makeButton(width / 2 - 120, 420, '继续冒险', () => fadeToScene(this, 'World', 500))
    this.makeButton(width / 2 + 120, 420, '返回标题', () => fadeToScene(this, 'Title', 500))
    this.highlight()

    this.keys = new InputKeys(this)
    fadeIn(this, 900)
    Sfx.win()
  }

  update(): void {
    const input = this.keys.poll()
    if (this.leaving) return
    if (input.left || input.right) {
      this.choice = 1 - this.choice
      Sfx.step()
      this.highlight()
    } else if (input.confirm) {
      this.press(this.choice)
    }
  }

  private press(i: number): void {
    if (this.leaving) return
    this.leaving = true
    Sfx.confirm()
    this.buttons[i].run()
  }

  private highlight(): void {
    this.buttons.forEach((b, i) => {
      b.bg.setFillStyle(i === this.choice ? 0x7a3a28 : 0x3a2030)
      b.bg.setStrokeStyle(2, i === this.choice ? 0xffd77a : 0xa86a50)
    })
  }

  private makeButton(x: number, y: number, label: string, run: () => void): void {
    const idx = this.buttons.length
    const bg = this.add
      .rectangle(x, y, 190, 44, 0x3a2030)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        this.choice = idx
        this.highlight()
      })
      .on('pointerdown', () => this.press(idx))
    this.add.text(x, y, label, { fontSize: '18px', color: '#fff6e8' }).setOrigin(0.5)
    this.buttons.push({ bg, run })
  }
}
