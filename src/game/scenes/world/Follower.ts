/**
 * 跟随伙伴：走在玩家身后一格，每步小跳一下；面对它按确认会冒爱心。
 * 不占格子（不挡路、不挡 NPC），骑乘时隐藏。
 * @author zjh
 * @date 2026-10-15
 */

import Phaser from 'phaser'
import { battleName, spriteKey, type CreatureInstance } from '../../data/creatures'
import type { MapDef } from '../../data/maps'
import { setCreatureScale, stageSize } from '../../graphics/CreatureArt'
import type { Facing } from '../../state/GameState'
import { showEmote } from './NpcEmote'

/** 跟随时的体型（48px 基准的倍率） */
const FOLLOW_SCALE = 0.62
/** 纵向锚点：图的脚底大约在 85% 处 */
const ORIGIN_Y = 0.85
/** 脚底相对格子中心向下的偏移 */
const FOOT_DY = 10
/** 每步小跳的高度（px） */
const HOP_PX = 3

const BEHIND: Record<Facing, [number, number]> = { down: [0, -1], up: [0, 1], left: [1, 0], right: [-1, 0] }

/** 面对伙伴时的回应（按亲密度从低到高挑） */
const GREET_LINES = ['{n}歪着头看了看你。', '{n}开心地蹭了蹭你的手。', '{n}绕着你转了一圈，尾巴摇个不停！']

export class Follower {
  private img: Phaser.GameObjects.Image | null = null
  private shadow: Phaser.GameObjects.Ellipse | null = null
  private creature: CreatureInstance | null = null
  private tile = { x: 0, y: 0 }
  private hidden = false
  private readonly scene: Phaser.Scene
  private readonly map: MapDef
  /** 该格能否站伙伴（用于出生时找身后的空格） */
  private readonly standable: (x: number, y: number) => boolean

  constructor(scene: Phaser.Scene, map: MapDef, standable: (x: number, y: number) => boolean) {
    this.scene = scene
    this.map = map
    this.standable = standable
  }

  /** 当前跟随的伙伴 */
  get current(): CreatureInstance | null {
    return this.creature
  }

  /**
   * 按指定伙伴重建精灵（null = 不跟随），出生在玩家身后一格（没有空位则与玩家重叠）
   * @author zjh
   * @date 2026-10-15
   */
  reset(c: CreatureInstance | null, player: { x: number; y: number }, facing: Facing): void {
    this.destroy()
    this.creature = c
    if (!c) return
    const [bx, by] = BEHIND[facing]
    const behind = { x: player.x + bx, y: player.y + by }
    this.tile = this.standable(behind.x, behind.y) ? behind : { ...player }
    const key = spriteKey(c)
    if (!this.scene.textures.exists(key)) return
    this.shadow = this.scene.add.ellipse(0, 0, 18, 6, 0x000000, 0.2).setDepth(8)
    const img = this.scene.add.image(0, 0, key).setOrigin(0.5, ORIGIN_Y)
    setCreatureScale(img, FOLLOW_SCALE * stageSize(key))
    // 立绘朝左：伙伴在玩家右边（往左走）保持原样，否则翻转朝右
    img.setFlipX(this.tile.x < player.x)
    this.img = img
    this.placeAt(this.tile.x, this.tile.y)
    this.setHidden(this.hidden)
  }

  /** 是否站在某格（用于面对它互动） */
  at(x: number, y: number): boolean {
    return !!this.img && !this.hidden && this.tile.x === x && this.tile.y === y
  }

  setHidden(on: boolean): void {
    this.hidden = on
    this.img?.setVisible(!on)
    this.shadow?.setVisible(!on)
  }

  /**
   * 玩家走了一步：伙伴走到玩家刚离开的格子（距离过远时直接瞬移过去）
   * @author zjh
   * @date 2026-10-15
   */
  stepTo(x: number, y: number, ms: number): void {
    const img = this.img
    if (!img) return
    const dx = x - this.tile.x
    const dy = y - this.tile.y
    if (dx === 0 && dy === 0) return
    this.tile = { x, y }
    if (dx !== 0) img.setFlipX(dx > 0)
    if (Math.abs(dx) + Math.abs(dy) > 1 || this.hidden) {
      this.placeAt(x, y)
      return
    }
    const ts = this.map.tileSize
    this.scene.tweens.add({ targets: img, x: x * ts + ts / 2, y: y * ts + ts / 2 + FOOT_DY, duration: ms })
    const lift = { px: 0 }
    this.scene.tweens.add({
      targets: lift,
      px: HOP_PX,
      duration: ms / 2,
      yoyo: true,
      ease: 'Sine.easeOut',
      onUpdate: () => img.setOrigin(0.5, ORIGIN_Y + lift.px / img.displayHeight),
      onComplete: () => img.setOrigin(0.5, ORIGIN_Y),
    })
  }

  /** 瞬移到某格（下坐骑、传送后） */
  snapBehind(player: { x: number; y: number }, facing: Facing): void {
    const [bx, by] = BEHIND[facing]
    const behind = { x: player.x + bx, y: player.y + by }
    this.tile = this.standable(behind.x, behind.y) ? behind : { ...player }
    this.placeAt(this.tile.x, this.tile.y)
  }

  /**
   * 面对伙伴按确认：冒爱心，返回一句回应
   * @author zjh
   * @date 2026-10-15
   */
  greet(): string {
    const c = this.creature
    if (!c || !this.img) return ''
    showEmote(this.scene, '♥', this.img, -this.img.displayHeight * ORIGIN_Y - 4)
    this.scene.tweens.add({ targets: this.img, scaleY: this.img.scaleY * 1.08, yoyo: true, duration: 120, repeat: 1 })
    const line = GREET_LINES[Math.min(GREET_LINES.length - 1, Math.floor(c.friendship / 100))]
    return line.replace('{n}', battleName(c))
  }

  /** 每帧：影子跟随，按与玩家的上下关系调整遮挡 */
  update(playerY: number): void {
    if (!this.img || !this.shadow) return
    this.shadow.setPosition(this.img.x, this.img.y + 3)
    this.img.setDepth(this.img.y - FOOT_DY > playerY + 1 ? 10.5 : 9.5)
  }

  destroy(): void {
    this.img?.destroy()
    this.shadow?.destroy()
    this.img = null
    this.shadow = null
  }

  private placeAt(x: number, y: number): void {
    const ts = this.map.tileSize
    this.img?.setPosition(x * ts + ts / 2, y * ts + ts / 2 + FOOT_DY)
  }
}
