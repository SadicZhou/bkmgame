/**
 * 大地图：走动、碰撞、NPC 互动（对话/疗愈/商店/训练家/BOSS）、传送、遇敌
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { SPECIES, createCreature } from '../data/creatures'
import {
  MAPS,
  isSolid,
  isTallGrass,
  npcLines,
  tileAt,
  type MapDef,
  type NpcDef,
  type TileKind,
  type WarpDef,
} from '../data/maps'
import { GameState, type Facing } from '../state/GameState'
import { Sfx } from '../systems/AudioBeeps'
import { DialogueBox } from '../ui/DialogueBox'
import { InputKeys } from '../ui/InputKeys'
import { ListPanel } from '../ui/ListPanel'
import { TouchPad } from '../ui/TouchPad'
import { battleTransition, fadeIn, fadeToScene } from '../ui/Transition'
import { WorldMenus } from '../ui/WorldMenus'

const MOVE_MS = 140
/** 进入地图 / 战斗结束后，至少走几步才会再次遇敌 */
const SAFE_STEPS = 2

/** 地砖类型 → 贴图 key */
const TILE_TEXTURE: Record<TileKind, string> = {
  grass: 'tile-grass',
  path: 'tile-path',
  wall: 'tile-wall',
  water: 'tile-water',
  floor: 'tile-floor',
  tall: 'tile-tall-mark',
  door: 'tile-door',
  warp: 'tile-warp',
  rock: 'tile-rock',
  ash: 'tile-ash',
}

/** NPC 头顶标记 */
const ROLE_MARK: Partial<Record<NonNullable<NpcDef['role']>, string>> = {
  healer: '+',
  shop: '店',
}

export class WorldScene extends Phaser.Scene {
  private map!: MapDef
  private player!: Phaser.GameObjects.Sprite
  private keys!: InputKeys
  private touch!: TouchPad
  private dialogue!: DialogueBox
  private menus!: WorldMenus
  private hudText!: Phaser.GameObjects.Text
  private tileX = 0
  private tileY = 0
  private moving = false
  /** 过渡中（切图/进战斗），屏蔽输入 */
  private busy = false
  private facing: Facing = 'down'
  private safeSteps = SAFE_STEPS
  private npcMarks = new Map<string, Phaser.GameObjects.Text>()

  constructor() {
    super('World')
  }

  create(): void {
    this.map = MAPS[GameState.mapId] ?? MAPS.town
    this.tileX = GameState.playerX
    this.tileY = GameState.playerY
    this.facing = GameState.facing
    this.moving = false
    this.busy = false
    this.safeSteps = SAFE_STEPS
    this.npcMarks.clear()
    this.cameras.main.setBackgroundColor(this.map.bgColor)
    this.cameras.main.setZoom(1)

    this.drawMap()
    this.spawnNpcs()

    this.player = this.add.sprite(0, 0, `spr-player-${this.facing}`).setDepth(10)
    this.placePlayerVisual()

    // 地图小于画面时，扩大镜头边界让地图居中显示
    const ts = this.map.tileSize
    const mapW = this.map.width * ts
    const mapH = this.map.height * ts
    const { width: viewW, height: viewH } = this.scale
    this.cameras.main.setBounds(
      mapW < viewW ? -(viewW - mapW) / 2 : 0,
      mapH < viewH ? -(viewH - mapH) / 2 : 0,
      Math.max(mapW, viewW),
      Math.max(mapH, viewH),
    )
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15)

    this.hudText = this.add
      .text(12, 10, '', {
        fontSize: '14px',
        color: '#f0e6c8',
        backgroundColor: '#00000088',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(501)
    this.refreshHud()

    this.touch = new TouchPad(this)
    this.keys = new InputKeys(this, this.touch)
    this.dialogue = new DialogueBox(this)
    this.menus = new WorldMenus(new ListPanel(this), {
      toast: (m) => this.flashToast(m),
      refreshHud: () => this.refreshHud(),
      backToTitle: () => {
        this.menus.panel.close()
        this.busy = true
        fadeToScene(this, 'Title')
      },
    })

    fadeIn(this)
    this.showMapBanner()
  }

  update(): void {
    const input = this.keys.poll()
    if (this.busy) return

    if (this.dialogue.isOpen) {
      if (input.confirm) this.dialogue.advance()
      return
    }
    if (this.menus.isOpen) {
      this.menus.panel.handle(input)
      return
    }
    if (this.moving) return

    if (input.cancel) {
      this.menus.openMain()
      return
    }
    if (input.confirm) {
      this.tryInteract()
      return
    }
    if (input.dx !== 0 || input.dy !== 0) this.tryMove(input.dx, input.dy)
  }

  private drawMap(): void {
    const ts = this.map.tileSize
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const kind = this.map.tiles[y * this.map.width + x]
        const key = kind === 'path' && this.map.pathTexture ? this.map.pathTexture : TILE_TEXTURE[kind]
        this.add.image(x * ts + ts / 2, y * ts + ts / 2, key)
      }
    }
  }

  /**
   * 生成 NPC：BOSS 用伙伴立绘，训练家未击败时头顶显示「!」
   * @author zjh
   * @date 2026-10-14
   */
  private spawnNpcs(): void {
    const ts = this.map.tileSize
    for (const npc of this.map.npcs) {
      const cx = npc.x * ts + ts / 2
      const cy = npc.y * ts + ts / 2
      if (npc.role === 'boss') {
        const bossSpecies = npc.team?.[npc.team.length - 1]?.speciesId ?? 'magmane'
        const spr = this.add.image(cx, cy, `spr-${bossSpecies}`).setScale(0.8).setDepth(9)
        this.tweens.add({ targets: spr, y: cy - 3, yoyo: true, repeat: -1, duration: 700 })
      } else {
        this.add.sprite(cx, cy, 'spr-npc').setTint(npc.color).setDepth(9)
      }

      const mark = this.npcMarkText(npc)
      if (mark) {
        const t = this.add
          .text(cx, cy - 22, mark, {
            fontSize: '13px',
            color: '#3a2a10',
            backgroundColor: '#ffe08a',
            padding: { x: 4, y: 1 },
          })
          .setOrigin(0.5)
          .setDepth(11)
        this.tweens.add({ targets: t, y: cy - 25, yoyo: true, repeat: -1, duration: 500 })
        this.npcMarks.set(npc.id, t)
      }
    }
  }

  private npcMarkText(npc: NpcDef): string | null {
    if ((npc.role === 'trainer' || npc.role === 'boss') && npc.defeatedKey) {
      return GameState.getFlag(npc.defeatedKey) ? null : '!'
    }
    return npc.role ? ROLE_MARK[npc.role] ?? null : null
  }

  private placePlayerVisual(): void {
    const ts = this.map.tileSize
    this.player.setPosition(this.tileX * ts + ts / 2, this.tileY * ts + ts / 2)
  }

  private setFacing(f: Facing): void {
    this.facing = f
    GameState.facing = f
    this.player.setTexture(`spr-player-${f}`)
  }

  private occupiedByNpc(x: number, y: number): NpcDef | null {
    return this.map.npcs.find((n) => n.x === x && n.y === y) ?? null
  }

  private tryMove(dx: number, dy: number): void {
    this.setFacing(dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'up' : 'down')

    const nx = this.tileX + dx
    const ny = this.tileY + dy
    const tile = tileAt(this.map, nx, ny)
    if (!tile || isSolid(tile) || this.occupiedByNpc(nx, ny)) return

    const fromX = this.tileX
    const fromY = this.tileY
    this.moving = true
    this.tileX = nx
    this.tileY = ny
    GameState.playerX = nx
    GameState.playerY = ny
    Sfx.step()

    const ts = this.map.tileSize
    this.tweens.add({
      targets: this.player,
      x: nx * ts + ts / 2,
      y: ny * ts + ts / 2,
      duration: MOVE_MS,
      onComplete: () => {
        this.moving = false
        this.afterStep(tile, fromX, fromY)
      },
    })
    // 走路时轻微弹跳
    this.tweens.add({ targets: this.player, scaleY: 0.9, yoyo: true, duration: MOVE_MS / 2 })
  }

  /**
   * 落地后：检查传送点（含关卡锁）与遇敌
   * @author zjh
   * @date 2026-10-14
   */
  private afterStep(tile: TileKind, fromX: number, fromY: number): void {
    const warp = this.map.warps.find((w) => w.x === this.tileX && w.y === this.tileY)
    if (warp) {
      this.useWarp(warp, fromX, fromY)
      return
    }

    if (this.safeSteps > 0) this.safeSteps--
    if (isTallGrass(tile)) this.rustleGrass()
    if (isTallGrass(tile) && this.safeSteps <= 0 && this.map.wildChance > 0) {
      if (Math.random() < this.map.wildChance) this.startWildBattle()
    }
  }

  private useWarp(warp: WarpDef, fromX: number, fromY: number): void {
    if (warp.requireFlag && !GameState.getFlag(warp.requireFlag)) {
      // 未解锁：退回上一格并提示
      this.tileX = fromX
      this.tileY = fromY
      GameState.playerX = fromX
      GameState.playerY = fromY
      this.placePlayerVisual()
      Sfx.cancel()
      this.dialogue.open(warp.lockedLines ?? ['前面暂时过不去。'])
      return
    }
    GameState.mapId = warp.targetMap
    GameState.playerX = warp.targetX
    GameState.playerY = warp.targetY
    Sfx.confirm()
    this.busy = true
    const cam = this.cameras.main
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart())
    cam.fadeOut(220, 0, 0, 0)
  }

  /** 踩草时冒出几片小叶子 */
  private rustleGrass(): void {
    const ts = this.map.tileSize
    const color = this.map.id === 'pass' ? 0xffb050 : 0x8fd99a
    for (let i = 0; i < 3; i++) {
      const leaf = this.add
        .rectangle(this.tileX * ts + ts / 2, this.tileY * ts + ts / 2 + 6, 4, 4, color)
        .setDepth(12)
      this.tweens.add({
        targets: leaf,
        x: leaf.x + Phaser.Math.Between(-12, 12),
        y: leaf.y - Phaser.Math.Between(8, 16),
        alpha: 0,
        duration: 320,
        onComplete: () => leaf.destroy(),
      })
    }
  }

  private facingTile(): { x: number; y: number } {
    const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[this.facing]
    return { x: this.tileX + d[0], y: this.tileY + d[1] }
  }

  /**
   * 与面前 NPC 互动
   * @author zjh
   * @date 2026-10-14
   */
  private tryInteract(): void {
    const { x, y } = this.facingTile()
    const npc = this.occupiedByNpc(x, y)
    if (!npc) return
    const say = (lines: string[], after?: () => void) =>
      this.dialogue.open(lines.map((l) => `${npc.name}：${l}`), after)

    switch (npc.role) {
      case 'healer':
        GameState.healAll()
        this.refreshHud()
        this.cameras.main.flash(250, 255, 240, 255)
        Sfx.win()
        say(npc.lines)
        return
      case 'shop':
        say(npc.lines, () => this.menus.openShop(() => say(['欢迎再来！'])))
        return
      case 'trainer':
      case 'boss': {
        const beaten = npc.defeatedKey ? GameState.getFlag(npc.defeatedKey) : true
        if (beaten) {
          say(npc.afterLines ?? npc.lines)
          return
        }
        if (!GameState.party.some((c) => c.hp > 0)) {
          say(['你的伙伴们都累坏了，先去休息吧。'])
          return
        }
        say(npc.challengeLines ?? ['来对战吧！'], () => this.startTrainerBattle(npc))
        return
      }
      default:
        say(npcLines(npc, (k) => !!GameState.getFlag(k)))
    }
  }

  private startWildBattle(): void {
    const pool = this.map.wildPool
    if (!pool.length || !GameState.party.some((c) => c.hp > 0)) return
    const pick = pool[Math.floor(Math.random() * pool.length)]
    const lv = Phaser.Math.Between(pick.minLv, pick.maxLv)
    GameState.pendingBattle = {
      kind: 'wild',
      enemies: [createCreature(pick.speciesId, lv)],
      returnMapId: this.map.id,
      returnX: this.tileX,
      returnY: this.tileY,
    }
    this.busy = true
    battleTransition(this)
  }

  private startTrainerBattle(npc: NpcDef): void {
    if (!npc.team?.length) return
    GameState.pendingBattle = {
      kind: npc.role === 'boss' ? 'boss' : 'trainer',
      enemies: npc.team.map((m) => createCreature(m.speciesId, m.level)),
      trainerName: npc.name,
      flagOnWin: npc.defeatedKey,
      isBoss: npc.role === 'boss',
      returnMapId: this.map.id,
      returnX: this.tileX,
      returnY: this.tileY,
    }
    this.busy = true
    battleTransition(this)
  }

  /** 进入地图时顶部滑入地图名 */
  private showMapBanner(): void {
    const w = this.scale.width
    const banner = this.add
      .text(w / 2, -30, `— ${this.map.name} —`, {
        fontSize: '18px',
        color: '#fff6e8',
        backgroundColor: '#1a2e28dd',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(800)
    this.tweens.add({
      targets: banner,
      y: 64,
      duration: 350,
      ease: 'Back.easeOut',
      hold: 1100,
      yoyo: true,
      onComplete: () => banner.destroy(),
    })
  }

  private flashToast(msg: string): void {
    const t = this.add
      .text(this.scale.width / 2, 48, msg, {
        fontSize: '14px',
        color: '#fff',
        backgroundColor: '#000000aa',
        padding: { x: 10, y: 6 },
      })
      .setScrollFactor(0)
      .setOrigin(0.5)
      .setDepth(900)
    this.tweens.add({
      targets: t,
      alpha: 0,
      delay: 900,
      duration: 400,
      onComplete: () => t.destroy(),
    })
  }

  private refreshHud(): void {
    const lead = GameState.party[0]
    const sp = lead ? SPECIES[lead.speciesId] : null
    const leadText = sp && lead ? ` ｜ ${sp.name} Lv.${lead.level} HP ${lead.hp}/${lead.maxHp}` : ''
    this.hudText.setText(`${this.map.name}${leadText} ｜ 焰币 ${GameState.coins}`)
  }
}
