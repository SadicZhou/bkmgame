/**
 * 大地图：走动、碰撞、NPC 对话、传送、遇敌
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { createCreature, SPECIES } from '../data/creatures'
import {
  MAPS,
  isSolid,
  isTallGrass,
  tileAt,
  type MapDef,
  type NpcDef,
} from '../data/maps'
import { GameState } from '../state/GameState'
import { Sfx } from '../systems/AudioBeeps'
import { TouchPad } from '../ui/TouchPad'

const MOVE_MS = 140

export class WorldScene extends Phaser.Scene {
  private map!: MapDef
  private player!: Phaser.GameObjects.Sprite
  private cursor!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: {
    W: Phaser.Input.Keyboard.Key
    A: Phaser.Input.Keyboard.Key
    S: Phaser.Input.Keyboard.Key
    D: Phaser.Input.Keyboard.Key
  }
  private space!: Phaser.Input.Keyboard.Key
  private esc!: Phaser.Input.Keyboard.Key
  private tileX = 0
  private tileY = 0
  private moving = false
  private facing: 'up' | 'down' | 'left' | 'right' = 'down'
  private dialogueOpen = false
  private menuOpen = false
  private dialogueBox!: Phaser.GameObjects.Container
  private menuBox!: Phaser.GameObjects.Container
  private dialogueLines: string[] = []
  private dialogueIndex = 0
  private dialogueNpc: NpcDef | null = null
  private hudText!: Phaser.GameObjects.Text
  private touch!: TouchPad
  private encounterCooldown = 0

  constructor() {
    super('World')
  }

  create(): void {
    this.map = MAPS[GameState.mapId] ?? MAPS.town
    this.tileX = GameState.playerX
    this.tileY = GameState.playerY
    this.cameras.main.setBackgroundColor(this.map.bgColor)

    this.drawMap()
    this.spawnNpcs()

    this.player = this.add.sprite(0, 0, 'spr-player').setDepth(10)
    this.placePlayerVisual()

    this.cameras.main.setBounds(
      0,
      0,
      this.map.width * this.map.tileSize,
      this.map.height * this.map.tileSize,
    )
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15)

    if (this.input.keyboard) {
      this.cursor = this.input.keyboard.createCursorKeys()
      this.wasd = this.input.keyboard.addKeys('W,A,S,D') as typeof this.wasd
      this.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
      this.esc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    }

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

    this.buildDialogueUi()
    this.buildMenuUi()
    this.touch = new TouchPad(this)

    this.events.on('resume', () => {
      this.refreshHud()
      this.encounterCooldown = 20
    })
  }

  update(): void {
    if (this.dialogueOpen) {
      if ((this.space && Phaser.Input.Keyboard.JustDown(this.space)) || this.touch.consumeAction()) {
        this.advanceDialogue()
      }
      return
    }
    if (this.menuOpen) {
      if ((this.esc && Phaser.Input.Keyboard.JustDown(this.esc)) || this.touch.consumeMenu()) {
        this.closeMenu()
      }
      return
    }

    if ((this.esc && Phaser.Input.Keyboard.JustDown(this.esc)) || this.touch.consumeMenu()) {
      this.openMenu()
      return
    }

    if ((this.space && Phaser.Input.Keyboard.JustDown(this.space)) || this.touch.consumeAction()) {
      this.tryInteract()
    }

    if (this.moving) return
    if (this.encounterCooldown > 0) this.encounterCooldown--

    let dx = 0
    let dy = 0
    if (this.cursor?.left.isDown || this.wasd?.A.isDown || this.touch.input.left) dx = -1
    else if (this.cursor?.right.isDown || this.wasd?.D.isDown || this.touch.input.right) dx = 1
    else if (this.cursor?.up.isDown || this.wasd?.W.isDown || this.touch.input.up) dy = -1
    else if (this.cursor?.down.isDown || this.wasd?.S.isDown || this.touch.input.down) dy = 1

    if (dx !== 0 || dy !== 0) this.tryMove(dx, dy)
  }

  private drawMap(): void {
    const ts = this.map.tileSize
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const kind = this.map.tiles[y * this.map.width + x]
        const key =
          kind === 'tall'
            ? 'tile-tall-mark'
            : kind === 'grass'
              ? 'tile-grass'
              : kind === 'path'
                ? 'tile-path'
                : kind === 'wall'
                  ? 'tile-wall'
                  : kind === 'water'
                    ? 'tile-water'
                    : kind === 'floor'
                      ? 'tile-floor'
                      : kind === 'door'
                        ? 'tile-door'
                        : kind === 'warp'
                          ? 'tile-warp'
                          : 'tile-grass'
        this.add.image(x * ts + ts / 2, y * ts + ts / 2, key)
      }
    }

    // 地图名已在 HUD 显示，避免与触控垫重叠
  }

  private spawnNpcs(): void {
    const ts = this.map.tileSize
    for (const npc of this.map.npcs) {
      const spr = this.add.sprite(npc.x * ts + ts / 2, npc.y * ts + ts / 2, 'spr-npc')
      spr.setTint(npc.color)
      spr.setDepth(9)
    }
  }

  private placePlayerVisual(): void {
    const ts = this.map.tileSize
    this.player.setPosition(this.tileX * ts + ts / 2, this.tileY * ts + ts / 2)
  }

  private occupiedByNpc(x: number, y: number): NpcDef | null {
    return this.map.npcs.find((n) => n.x === x && n.y === y) ?? null
  }

  private tryMove(dx: number, dy: number): void {
    if (dx < 0) this.facing = 'left'
    if (dx > 0) this.facing = 'right'
    if (dy < 0) this.facing = 'up'
    if (dy > 0) this.facing = 'down'

    const nx = this.tileX + dx
    const ny = this.tileY + dy
    const tile = tileAt(this.map, nx, ny)
    if (!tile || isSolid(tile) || this.occupiedByNpc(nx, ny)) return

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
        this.afterStep(tile)
      },
    })
  }

  private afterStep(tile: string): void {
    const warp = this.map.warps.find((w) => w.x === this.tileX && w.y === this.tileY)
    if (warp) {
      GameState.mapId = warp.targetMap
      GameState.playerX = warp.targetX
      GameState.playerY = warp.targetY
      Sfx.confirm()
      this.scene.restart()
      return
    }

    if (isTallGrass(tile as never) && this.encounterCooldown <= 0 && this.map.wildChance > 0) {
      if (Math.random() < this.map.wildChance) {
        this.startWildBattle()
      }
    }
  }

  private facingTile(): { x: number; y: number } {
    let x = this.tileX
    let y = this.tileY
    if (this.facing === 'left') x--
    if (this.facing === 'right') x++
    if (this.facing === 'up') y--
    if (this.facing === 'down') y++
    return { x, y }
  }

  private tryInteract(): void {
    const { x, y } = this.facingTile()
    const npc = this.occupiedByNpc(x, y)
    if (!npc) return
    Sfx.talk()

    // 疗愈师：对话时回血
    if (npc.id === 'healer') {
      GameState.healAll()
      this.refreshHud()
    }

    // 训练家对战（未击败）
    if (npc.battleSpeciesId && npc.defeatedKey && !GameState.getFlag(npc.defeatedKey)) {
      this.openDialogue(npc, [
        `${npc.name}：草地巡护，接受挑战吧！`,
        '……战斗开始！',
      ])
      this.dialogueNpc = npc
      return
    }

    if (npc.battleSpeciesId && npc.defeatedKey && GameState.getFlag(npc.defeatedKey)) {
      this.openDialogue(npc, [`${npc.name}：你已经赢过我了，去高草里继续磨练吧。`])
      return
    }

    this.openDialogue(npc, npc.lines.map((l) => `${npc.name}：${l}`))
  }

  private startWildBattle(): void {
    const pool = this.map.wildPool
    if (!pool.length) return
    const pick = pool[Math.floor(Math.random() * pool.length)]
    const lv = Phaser.Math.Between(pick.minLv, pick.maxLv)
    const enemy = createCreature(pick.speciesId, lv)
    GameState.pendingBattle = {
      kind: 'wild',
      enemy,
      returnMapId: this.map.id,
      returnX: this.tileX,
      returnY: this.tileY,
    }
    this.scene.start('Battle')
  }

  private startTrainerBattle(npc: NpcDef): void {
    if (!npc.battleSpeciesId) return
    const enemy = createCreature(npc.battleSpeciesId, npc.battleLevel ?? 6)
    GameState.pendingBattle = {
      kind: 'trainer',
      enemy,
      trainerName: npc.name,
      flagOnWin: npc.defeatedKey,
      returnMapId: this.map.id,
      returnX: this.tileX,
      returnY: this.tileY,
    }
    this.scene.start('Battle')
  }

  private buildDialogueUi(): void {
    const w = this.scale.width
    const box = this.add.rectangle(w / 2, this.scale.height - 70, w - 24, 100, 0x102018, 0.92)
    box.setStrokeStyle(2, 0xa8e6c0)
    const text = this.add
      .text(24, this.scale.height - 110, '', {
        fontSize: '15px',
        color: '#e8f5ee',
        wordWrap: { width: w - 60 },
      })
      .setName('dlgText')
    const hint = this.add
      .text(w - 28, this.scale.height - 28, '▼', { fontSize: '14px', color: '#7ec8a3' })
      .setOrigin(1, 1)
    this.dialogueBox = this.add
      .container(0, 0, [box, text, hint])
      .setScrollFactor(0)
      .setDepth(600)
      .setVisible(false)
  }

  private openDialogue(npc: NpcDef, lines: string[]): void {
    this.dialogueNpc = npc
    this.dialogueLines = lines
    this.dialogueIndex = 0
    this.dialogueOpen = true
    this.dialogueBox.setVisible(true)
    this.showDialogueLine()
  }

  private showDialogueLine(): void {
    const t = this.dialogueBox.getByName('dlgText') as Phaser.GameObjects.Text
    t.setText(this.dialogueLines[this.dialogueIndex] ?? '')
  }

  private advanceDialogue(): void {
    this.dialogueIndex++
    if (this.dialogueIndex >= this.dialogueLines.length) {
      const npc = this.dialogueNpc
      this.closeDialogue()
      // 对话结束后触发训练家战
      if (
        npc?.battleSpeciesId &&
        npc.defeatedKey &&
        !GameState.getFlag(npc.defeatedKey) &&
        this.dialogueLines.some((l) => l.includes('战斗开始'))
      ) {
        this.startTrainerBattle(npc)
      }
      return
    }
    Sfx.talk()
    this.showDialogueLine()
  }

  private closeDialogue(): void {
    this.dialogueOpen = false
    this.dialogueBox.setVisible(false)
    this.dialogueNpc = null
  }

  private buildMenuUi(): void {
    const w = this.scale.width
    const h = this.scale.height
    const bg = this.add.rectangle(w / 2, h / 2, 280, 260, 0x102018, 0.95).setStrokeStyle(2, 0xe8a838)
    const title = this.add.text(w / 2, h / 2 - 100, '菜单', { fontSize: '20px', color: '#f0e6c8' }).setOrigin(0.5)

    const mk = (oy: number, label: string, fn: () => void) => {
      const r = this.add
        .rectangle(w / 2, h / 2 + oy, 200, 36, 0x2a5a42)
        .setStrokeStyle(1, 0xa8e6c0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', fn)
      const t = this.add.text(w / 2, h / 2 + oy, label, { fontSize: '16px', color: '#e8f5ee' }).setOrigin(0.5)
      return [r, t]
    }

    this.menuBox = this.add
      .container(0, 0, [
        bg,
        title,
        ...mk(-40, '保存进度', () => {
          GameState.persist()
          Sfx.confirm()
          this.closeMenu()
          this.flashToast('已保存到本地')
        }),
        ...mk(10, '查看队伍', () => {
          Sfx.confirm()
          this.showParty()
        }),
        ...mk(60, '返回标题', () => {
          Sfx.cancel()
          this.scene.start('Title')
        }),
        ...mk(110, '关闭', () => this.closeMenu()),
      ])
      .setScrollFactor(0)
      .setDepth(700)
      .setVisible(false)
  }

  private openMenu(): void {
    this.menuOpen = true
    this.menuBox.setVisible(true)
    Sfx.confirm()
  }

  private closeMenu(): void {
    this.menuOpen = false
    this.menuBox.setVisible(false)
  }

  private showParty(): void {
    const lines = GameState.party.map((c, i) => {
      const sp = SPECIES[c.speciesId]
      return `${i + 1}. ${sp.name} Lv.${c.level}  HP ${c.hp}/${c.maxHp}`
    })
    this.closeMenu()
    this.openDialogue(
      { id: 'party', name: '队伍', x: 0, y: 0, color: 0xffffff, lines: [] },
      ['【队伍】', ...lines],
    )
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
      .setDepth(800)
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
    this.hudText.setText(
      sp
        ? `${this.map.name} ｜ ${sp.name} Lv.${lead.level}  HP ${lead.hp}/${lead.maxHp}`
        : this.map.name,
    )
  }
}
