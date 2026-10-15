/**
 * 章节卡：「第一章完」之类的过场——标题渐显、徽记亮起、下一段旅途提示，按确认回到世界
 * @author zjh
 * @date 2026-10-15
 */

import Phaser from 'phaser'
import { BADGES, type BadgeId } from '../data/badges'
import { addBackdrop } from '../graphics/SceneArt'
import { Sfx } from '../systems/AudioBeeps'
import { InputKeys } from '../ui/InputKeys'
import { fadeIn, fadeToScene } from '../ui/Transition'

export interface ChapterCardData {
  title: string
  subtitle: string
  badge: BadgeId
  /** 结束后进入的场景（默认回世界） */
  next?: string
}

/** 至少展示多久才允许跳过 */
const MIN_SHOW_MS = 1800

export class ChapterScene extends Phaser.Scene {
  private keys!: InputKeys
  private ready = false
  private leaving = false
  private next = 'World'

  constructor() {
    super('Chapter')
  }

  create(data: ChapterCardData): void {
    const { width, height } = this.scale
    this.ready = false
    this.leaving = false
    this.next = data.next ?? 'World'
    const badge = BADGES[data.badge]

    if (!addBackdrop(this, 'bg-ending', 0.55)) this.add.rectangle(0, 0, width, height, 0x14101c).setOrigin(0)

    const title = this.add
      .text(width / 2, height / 2 - 92, data.title, {
        fontFamily: 'Georgia, "Songti SC", serif',
        fontSize: '36px',
        color: '#ffe08a',
      })
      .setOrigin(0.5)
      .setAlpha(0)
    this.tweens.add({ targets: title, alpha: 1, y: height / 2 - 86, duration: 1000 })

    this.drawBadge(width / 2, height / 2 + 8, badge.color)
    const name = this.add
      .text(width / 2, height / 2 + 66, `获得「${badge.name}」 · ${badge.desc}`, { fontSize: '15px', color: '#f0e6c8' })
      .setOrigin(0.5)
      .setAlpha(0)
    this.tweens.add({ targets: name, alpha: 1, delay: 1100, duration: 600 })

    const sub = this.add
      .text(width / 2, height / 2 + 112, data.subtitle, { fontSize: '17px', color: '#b8f0d0' })
      .setOrigin(0.5)
      .setAlpha(0)
    this.tweens.add({ targets: sub, alpha: 1, delay: 1500, duration: 600 })

    const hint = this.add
      .text(width / 2, height - 36, '按确认继续', { fontSize: '12px', color: '#8a7a90' })
      .setOrigin(0.5)
      .setAlpha(0)
    this.tweens.add({ targets: hint, alpha: 1, delay: MIN_SHOW_MS, duration: 400, yoyo: true, repeat: -1, hold: 600 })

    this.time.delayedCall(MIN_SHOW_MS, () => (this.ready = true))
    this.input.on('pointerdown', () => this.leave())
    this.keys = new InputKeys(this)
    fadeIn(this, 700)
    this.time.delayedCall(900, () => Sfx.win())
  }

  update(): void {
    if (this.keys.poll().confirm) this.leave()
  }

  private leave(): void {
    if (!this.ready || this.leaving) return
    this.leaving = true
    Sfx.confirm()
    fadeToScene(this, this.next, 600)
  }

  /**
   * 徽记：外圈光晕 + 菱形徽章，缩放弹出后持续呼吸
   * @author zjh
   * @date 2026-10-15
   */
  private drawBadge(x: number, y: number, color: number): void {
    const glow = this.add.circle(x, y, 46, color, 0.18).setScale(0)
    const g = this.add.graphics({ x, y }).setScale(0)
    g.fillStyle(0x2a1a10, 1).fillPoints(diamond(34), true)
    g.fillStyle(color, 1).fillPoints(diamond(29), true)
    g.fillStyle(0xffffff, 0.55).fillPoints(diamond(12), true)
    g.lineStyle(2, 0xffe08a, 1).strokePoints(diamond(34), true)
    this.tweens.add({ targets: [glow, g], scale: 1, delay: 700, duration: 500, ease: 'Back.easeOut' })
    this.tweens.add({ targets: glow, scale: 1.25, alpha: 0.05, delay: 1300, duration: 1100, yoyo: true, repeat: -1 })
  }
}

/** 以原点为中心的菱形顶点 */
function diamond(r: number): Phaser.Math.Vector2[] {
  return [new Phaser.Math.Vector2(0, -r), new Phaser.Math.Vector2(r, 0), new Phaser.Math.Vector2(0, r), new Phaser.Math.Vector2(-r, 0)]
}
