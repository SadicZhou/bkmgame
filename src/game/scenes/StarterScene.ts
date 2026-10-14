/**
 * 初始伙伴三选一：焰角兔 / 碧波龟 / 翠叶狐
 * 左右选择，确认后二次确认再出发；Esc 返回标题。
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { setCreatureScale } from '../graphics/CreatureArt'
import { addBackdrop } from '../graphics/SceneArt'
import { SPECIES, STARTERS, TYPE_LABEL } from '../data/creatures'
import { TYPE_COLOR } from '../data/types'
import { GameState } from '../state/GameState'
import { Sfx } from '../systems/AudioBeeps'
import { InputKeys } from '../ui/InputKeys'
import { fadeIn, fadeToScene } from '../ui/Transition'

/** 三只初始伙伴的定位说明 */
const STARTER_ROLE: Record<string, string> = {
  flarehorn: '进攻型 · 速度快、攻击高\n适合喜欢速战速决的旅人',
  tideback: '防守型 · HP 与防御出众\n适合稳扎稳打的旅人',
  leafkit: '灵巧型 · 会寄生与回复\n适合喜欢周旋的旅人',
}

const CARD_W = 180
const CARD_H = 270

interface Card {
  bg: Phaser.GameObjects.Rectangle
  sprite: Phaser.GameObjects.Image
}

export class StarterScene extends Phaser.Scene {
  private keys!: InputKeys
  private cards: Card[] = []
  private choice = 0
  private confirming = false
  private leaving = false
  private hint!: Phaser.GameObjects.Text

  constructor() {
    super('Starter')
  }

  create(): void {
    const { width, height } = this.scale
    this.cards = []
    this.choice = 0
    this.confirming = false
    this.leaving = false

    if (!addBackdrop(this, 'bg-starter', 0.35)) {
      this.add.rectangle(0, 0, width, height, 0x1a2e28).setOrigin(0)
      this.add.circle(90, 70, 46, 0xffb7c5, 0.2)
      this.add.circle(width - 70, 90, 56, 0xffe08a, 0.18)
    }
    this.add.text(width / 2, 34, '选择你的第一位伙伴', { fontSize: '24px', color: '#fff6e8' }).setOrigin(0.5).setStroke('#2a1a10', 5)
    this.add
      .text(width / 2, 64, '旅长阿禾：「火种熄灭之前，总要有人陪你走这一程。」', { fontSize: '13px', color: '#e8f8ee' })
      .setOrigin(0.5)
      .setStroke('#2a1a10', 4)

    STARTERS.forEach((id, i) => this.makeCard(id, i))

    this.hint = this.add
      .text(width / 2, height - 30, '', { fontSize: '13px', color: '#ffd77a', align: 'center' })
      .setOrigin(0.5)
    this.highlight()

    this.keys = new InputKeys(this)
    fadeIn(this)
  }

  private makeCard(id: string, i: number): void {
    const sp = SPECIES[id]
    const x = this.scale.width / 2 + (i - 1) * (CARD_W + 16)
    const top = 96
    const bg = this.add
      .rectangle(x, top + CARD_H / 2, CARD_W, CARD_H, 0x22463a, 0.86)
      .setStrokeStyle(2, 0x4a7a60)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        if (this.leaving || this.choice === i) return
        this.choice = i
        this.confirming = false
        this.highlight()
      })
      .on('pointerdown', () => {
        this.choice = i
        this.confirm()
      })
    const color = TYPE_COLOR[sp.type]
    this.add.circle(x, top + 64, 44, Phaser.Display.Color.HexStringToColor(color).color, 0.25)
    const sprite = setCreatureScale(this.add.image(x, top + 64, `spr-${id}`), 2.2)
    this.add.text(x, top + 126, sp.name, { fontSize: '18px', color: '#fff6e8' }).setOrigin(0.5)
    this.add
      .text(x, top + 150, `[${TYPE_LABEL[sp.type]}]`, { fontSize: '13px', color })
      .setOrigin(0.5)
    this.add
      .text(x, top + 172, STARTER_ROLE[id] ?? '', { fontSize: '12px', color: '#d8eee2', align: 'center', lineSpacing: 2 })
      .setOrigin(0.5, 0)
    this.add
      .text(x, top + 212, sp.desc, { fontSize: '11px', color: '#9ec8b2', align: 'center', wordWrap: { width: CARD_W - 20, useAdvancedWrap: true } })
      .setOrigin(0.5, 0)
    this.cards.push({ bg, sprite })
  }

  update(): void {
    const input = this.keys.poll()
    if (this.leaving) return
    if (input.left || input.right) {
      const next = Phaser.Math.Clamp(this.choice + (input.left ? -1 : 1), 0, this.cards.length - 1)
      if (next !== this.choice) {
        this.choice = next
        this.confirming = false
        Sfx.step()
        this.highlight()
      }
    } else if (input.confirm) {
      this.confirm()
    } else if (input.cancel) {
      Sfx.cancel()
      if (this.confirming) {
        this.confirming = false
        this.highlight()
      } else {
        this.leaving = true
        fadeToScene(this, 'Title')
      }
    }
  }

  /** 第一次确认进入二次确认；第二次确认出发 */
  private confirm(): void {
    if (this.leaving) return
    if (!this.confirming) {
      this.confirming = true
      Sfx.confirm()
      this.highlight()
      return
    }
    this.leaving = true
    Sfx.win()
    const id = STARTERS[this.choice]
    GameState.newGame(id)
    this.cameras.main.flash(300, 255, 255, 255)
    fadeToScene(this, 'World', 500)
  }

  private highlight(): void {
    this.cards.forEach((c, i) => {
      const on = i === this.choice
      c.bg.setFillStyle(on ? 0x2e5c4a : 0x22463a)
      c.bg.setStrokeStyle(on ? 3 : 2, on ? 0xffd77a : 0x4a7a60)
      this.tweens.killTweensOf(c.sprite)
      c.sprite.setY(160)
      if (on) this.tweens.add({ targets: c.sprite, y: 152, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.easeInOut' })
    })
    const name = SPECIES[STARTERS[this.choice]].name
    this.hint.setText(
      this.confirming
        ? `确定和「${name}」一起出发吗？  再按 空格 / 点击 确认 · Esc 再想想`
        : '← → 选择 · 空格 / 点击 选定 · Esc 返回标题',
    )
  }
}
