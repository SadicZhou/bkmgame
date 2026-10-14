/**
 * 大地图：走动、碰撞、NPC 互动、传送；每步推进世界（昼夜 / 天气 / 异象 / 小事件 / 遇敌）
 * 世界规则见 systems/WorldTick；事件物件见 ui/WorldEventsView；小镇服务见 ui/TownServices。
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { NPC_FRAME, anchorFeet, hasCharArt, idleFrame, registerCharAnims } from '../graphics/CharArt'
import { setCreatureScale } from '../graphics/CreatureArt'
import { SPECIES, battleName, createCreature, type CreatureInstance } from '../data/creatures'
import { decorBlocks } from '../data/decor'
import { ITEMS } from '../data/items'
import { MAPS, isSolid, isTallGrass, npcLines, tileAt, type MapDef, type NpcDef, type TileKind, type WarpDef } from '../data/maps'
import { MINOR_EVENTS, PHENOMENON_RULES, type PhenomenonDef } from '../data/phenomena'
import { WEATHER_INFO } from '../data/weather'
import { GameState, type Facing } from '../state/GameState'
import { Sfx } from '../systems/AudioBeeps'
import { activePhenomenon, uniqueForBattle } from '../systems/Phenomenon'
import { isFullMoon, timeLabel } from '../systems/WorldClock'
import { stepWorld, type StepResult } from '../systems/WorldTick'
import { decorLights, renderDecor } from '../ui/DecorLayer'
import { DialogueBox } from '../ui/DialogueBox'
import { renderMap } from '../ui/MapRenderer'
import { InputKeys } from '../ui/InputKeys'
import { ListPanel } from '../ui/ListPanel'
import { TouchPad } from '../ui/TouchPad'
import { TownServices } from '../ui/TownServices'
import { battleTransition, fadeIn, fadeToScene } from '../ui/Transition'
import { WeatherLayer } from '../ui/WeatherLayer'
import type { AmbientKind } from '../ui/weather/Ambient'
import { WorldEventsView } from '../ui/WorldEventsView'
import { WorldMenus } from '../ui/WorldMenus'

const MOVE_MS = 140

/** NPC 头顶标记 */
const ROLE_MARK: Partial<Record<NonNullable<NpcDef['role']>, string>> = {
  healer: '+',
  clinic: '+',
  shop: '店',
  board: '告',
  storage: '存',
  granny: '忆',
}

/** 各地图的环境点缀：草地 / 小镇夜里有萤火虫，山道常有余烬 */
const AMBIENT_BY_MAP: Record<string, AmbientKind> = {
  town: 'fireflies',
  meadow: 'fireflies',
  pass: 'embers',
}

/** 唯一精灵等级范围 */
const UNIQUE_LEVEL = { min: 12, max: 50 }

export class WorldScene extends Phaser.Scene {
  private map!: MapDef
  private player!: Phaser.GameObjects.Sprite
  private keys!: InputKeys
  private touch!: TouchPad
  private dialogue!: DialogueBox
  private menus!: WorldMenus
  private services!: TownServices
  private weather!: WeatherLayer
  private eventView!: WorldEventsView
  private hudText!: Phaser.GameObjects.Text
  private tileX = 0
  private tileY = 0
  private moving = false
  /** 过渡中（切图/进战斗），屏蔽输入 */
  private busy = false
  private facing: Facing = 'down'
  /** 是否使用 AI 行走图（缺图时回退到代码绘制） */
  private charArt = false
  private playerShadow!: Phaser.GameObjects.Ellipse
  /** 火盆 / 壁炉位置（世界坐标），夜里照亮周围 */
  private fireLights: { x: number; y: number }[] = []

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
    // 进入地图 / 战斗结束后重新计算安全步数
    GameState.world.stepsSinceEncounter = 0
    this.cameras.main.setBackgroundColor(this.map.bgColor)
    this.cameras.main.setZoom(1)

    this.drawMap()
    this.spawnNpcs()
    this.eventView = new WorldEventsView(this, this.map)
    this.eventView.refresh()

    registerCharAnims(this)
    this.charArt = hasCharArt(this, 'char-player')
    this.playerShadow = this.add.ellipse(0, 0, 20, 7, 0x000000, 0.22).setDepth(8)
    this.player = this.charArt
      ? anchorFeet(this.add.sprite(0, 0, 'char-player', idleFrame(this.facing))).setDepth(10)
      : this.add.sprite(0, 0, `spr-player-${this.facing}`).setDepth(10)
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

    this.weather = new WeatherLayer(this, 400)
    this.weather.setAmbient(AMBIENT_BY_MAP[this.map.id] ?? null)
    this.fireLights = decorLights(this.map)
    this.refreshAtmosphere()

    this.hudText = this.add
      .text(12, 10, '', {
        fontSize: '13px',
        color: '#f0e6c8',
        backgroundColor: '#00000088',
        padding: { x: 8, y: 4 },
        lineSpacing: 3,
      })
      .setScrollFactor(0)
      .setDepth(501)
    this.refreshHud()

    this.touch = new TouchPad(this)
    this.keys = new InputKeys(this, this.touch)
    this.dialogue = new DialogueBox(this)
    const panel = new ListPanel(this)
    this.menus = new WorldMenus(panel, {
      toast: (m) => this.flashToast(m),
      refreshHud: () => this.refreshHud(),
      backToTitle: () => {
        this.menus.panel.close()
        this.busy = true
        fadeToScene(this, 'Title')
      },
    })
    this.services = new TownServices(panel, {
      say: (lines, after) => this.dialogue.open(lines, after),
      toast: (m) => this.flashToast(m),
      refreshHud: () => this.refreshHud(),
      onHeal: () => {
        this.cameras.main.flash(250, 255, 240, 255)
        Sfx.win()
      },
      onWorldChanged: () => {
        this.refreshAtmosphere()
        this.eventView.refresh()
      },
    })

    fadeIn(this)
    this.showMapBanner()
  }

  update(_time: number, delta: number): void {
    this.playerShadow.setPosition(this.player.x, this.player.y + 13)
    this.updateLights()
    this.weather?.update(delta)
    const input = this.keys.poll()
    if (!this.moving && input.dx === 0 && input.dy === 0) this.stopWalk()
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
    renderMap(this, this.map)
    renderDecor(this, this.map)
  }

  /**
   * 生成 NPC：BOSS 用伙伴立绘，告示板用木牌贴图，训练家未击败时头顶显示「!」
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
        const spr = setCreatureScale(this.add.image(cx, cy, `spr-${bossSpecies}`), 0.8).setDepth(9)
        this.tweens.add({ targets: spr, y: cy - 3, yoyo: true, repeat: -1, duration: 700 })
      } else if (npc.role === 'board') {
        this.add.image(cx, cy, 'spr-board').setDepth(9)
      } else {
        this.spawnPerson(npc, cx, cy)
      }

      const tall = npc.role !== 'boss' && npc.role !== 'board' && this.npcHasArt(npc)
      const markY = tall ? cy - 32 : cy - 22
      const mark = this.npcMarkText(npc)
      if (mark) {
        const t = this.add
          .text(cx, markY, mark, {
            fontSize: '13px',
            color: '#3a2a10',
            backgroundColor: '#ffe08a',
            padding: { x: 4, y: 1 },
          })
          .setOrigin(0.5)
          .setDepth(11)
        this.tweens.add({ targets: t, y: markY - 3, yoyo: true, repeat: -1, duration: 500 })
      }
    }
  }

  private npcHasArt(npc: NpcDef): boolean {
    return hasCharArt(this, 'char-npcs') && NPC_FRAME[npc.id] !== undefined
  }

  /**
   * 人类 NPC：有行走图时用对应帧 + 脚下阴影 + 呼吸起伏，否则用着色的代码小人
   * @author zjh
   * @date 2026-10-14
   */
  private spawnPerson(npc: NpcDef, cx: number, cy: number): void {
    if (!this.npcHasArt(npc)) {
      this.add.sprite(cx, cy, 'spr-npc').setTint(npc.color).setDepth(9)
      return
    }
    this.add.ellipse(cx, cy + 13, 20, 7, 0x000000, 0.22).setDepth(8)
    const spr = anchorFeet(this.add.sprite(cx, cy, 'char-npcs', NPC_FRAME[npc.id])).setDepth(9)
    this.tweens.add({
      targets: spr,
      scaleY: 1.035,
      yoyo: true,
      repeat: -1,
      duration: 900 + ((npc.x * 7 + npc.y * 13) % 5) * 120,
      ease: 'Sine.easeInOut',
    })
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
    const turned = f !== this.facing
    this.facing = f
    GameState.facing = f
    if (!this.charArt) this.player.setTexture(`spr-player-${f}`)
    else if (turned || !this.player.anims.isPlaying) {
      this.player.anims.stop()
      this.player.setFrame(idleFrame(f))
    }
  }

  /** 停下时回到当前方向的站立帧 */
  private stopWalk(): void {
    if (!this.charArt || !this.player.anims.isPlaying) return
    this.player.anims.stop()
    this.player.setFrame(idleFrame(this.facing))
  }

  private occupiedByNpc(x: number, y: number): NpcDef | null {
    return this.map.npcs.find((n) => n.x === x && n.y === y) ?? null
  }

  private tryMove(dx: number, dy: number): void {
    this.setFacing(dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'up' : 'down')

    const nx = this.tileX + dx
    const ny = this.tileY + dy
    const tile = tileAt(this.map, nx, ny)
    if (!tile || isSolid(tile) || decorBlocks(this.map.id, nx, ny) || this.occupiedByNpc(nx, ny) || this.eventView.uniqueAt(nx, ny)) return

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
    if (this.charArt) this.player.play(`walk-${this.facing}`, true)
    // 代码绘制的小人没有行走帧，用轻微弹跳代替
    else this.tweens.add({ targets: this.player, scaleY: 0.9, yoyo: true, duration: MOVE_MS / 2 })
  }

  /**
   * 落地后：传送点优先；否则推进世界一步并播放结果
   * @author zjh
   * @date 2026-10-14
   */
  private afterStep(tile: TileKind, fromX: number, fromY: number): void {
    const warp = this.map.warps.find((w) => w.x === this.tileX && w.y === this.tileY)
    if (warp) {
      this.useWarp(warp, fromX, fromY)
      return
    }
    const grass = isTallGrass(tile)
    if (grass) this.rustleGrass()
    const res = stepWorld(this.map.id, this.tileX, this.tileY, grass && this.map.outdoor)
    this.handleStep(res)
  }

  private handleStep(res: StepResult): void {
    const w = GameState.world
    const messages: string[] = []
    let redraw = false

    if (res.clock.phaseChanged) {
      this.flashToast(isFullMoon(w.totalSteps) ? '🌕 满月升起来了……' : GameState.night() ? '☾ 夜幕降临了' : '☀ 天亮了')
    }
    if (res.clock.weatherChanged && this.map.outdoor) {
      const wt = GameState.weatherAt(this.map.id)
      if (wt) this.flashToast(`${WEATHER_INFO[wt].icon} 天气变成了「${WEATHER_INFO[wt].label}」`)
    }
    if (res.clock.phaseChanged || res.clock.weatherChanged) this.refreshAtmosphere()

    if (res.phenomenonFaded) {
      this.flashToast(`「${res.phenomenonFaded.name}」渐渐消散了……`)
      redraw = true
    }
    if (res.phenomenonStarted) {
      messages.push(res.phenomenonStarted.omenText)
      redraw = true
    }
    if (res.minorStarted) {
      const m = MINOR_EVENTS[res.minorStarted.id]
      const where = MAPS[res.minorStarted.mapId]?.name ?? ''
      const extra = res.minorStarted.speciesId ? `（${SPECIES[res.minorStarted.speciesId].name}）` : ''
      this.flashToast(`【${m.name}】${where}${extra}`)
      redraw = true
    }
    if (res.minorEnded) redraw = true
    if (res.goal) {
      const { def, done, total, tokenGained } = res.goal
      Sfx.confirm()
      this.flashToast(`拾取了${def.goalLabel} ${done}/${total}`)
      if (tokenGained) messages.push(`${def.goalLabel}在你手中化作一枚发光的「异象信物」！`, '带着它去异象中心吧，这次相遇的安抚成功率会翻倍。')
      redraw = true
    }
    if (res.crystal) {
      Sfx.win()
      this.flashToast(res.crystal.kind === 'coins' ? `心火结晶化作了 ${res.crystal.amount} 焰币！` : `心火结晶里藏着 ${ITEMS[res.crystal.itemId].name}！`)
      redraw = true
    }

    if (redraw) {
      this.eventView.refresh()
      this.refreshAtmosphere()
    }
    this.refreshHud()

    const encounter = res.encounter
    if (messages.length) {
      this.cameras.main.flash(300, 255, 255, 255)
      this.dialogue.open(messages, encounter ? () => this.startWildBattle(encounter) : undefined)
    } else if (encounter) {
      this.startWildBattle(encounter)
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
   * 与面前 NPC / 唯一精灵互动
   * @author zjh
   * @date 2026-10-14
   */
  private tryInteract(): void {
    const { x, y } = this.facingTile()
    const unique = this.eventView.uniqueAt(x, y)
    if (unique) {
      this.approachUnique(unique)
      return
    }
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
      case 'clinic':
        say(npc.lines, () => this.services.openClinic())
        return
      case 'board':
        Sfx.confirm()
        this.dialogue.open(this.services.boardLines().map((l) => `【告示板】${l}`))
        return
      case 'storage':
        say(npc.lines, () => this.services.openStorage())
        return
      case 'granny':
        say(npc.lines, () => this.services.openGranny())
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
        if (!this.hasAbleCreature()) {
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

  private hasAbleCreature(): boolean {
    return GameState.party.some((c) => c.hp > 0)
  }

  /** 场地天气：只有户外地图有天气 */
  private fieldWeather() {
    return this.map.outdoor ? GameState.weatherAt(this.map.id) : null
  }

  private returnInfo() {
    return { weather: this.fieldWeather(), night: GameState.night(), returnMapId: this.map.id, returnX: this.tileX, returnY: this.tileY }
  }

  private startWildBattle(enemy: CreatureInstance): void {
    if (!this.hasAbleCreature()) return
    GameState.pendingBattle = { kind: 'wild', enemies: [enemy], ...this.returnInfo() }
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
      ...this.returnInfo(),
    }
    this.busy = true
    battleTransition(this)
  }

  /**
   * 走近唯一精灵：现身台词 → 异象战（等级随队伍最高等级，限 12~50）
   * @author zjh
   * @date 2026-10-14
   */
  private approachUnique(def: PhenomenonDef): void {
    if (!this.hasAbleCreature()) {
      this.dialogue.open(['它好奇地看着你，可你的伙伴们都累坏了……先去休息吧。'])
      return
    }
    const top = Math.max(...GameState.party.map((c) => c.level))
    const level = Phaser.Math.Clamp(top, UNIQUE_LEVEL.min, UNIQUE_LEVEL.max)
    const enemy = uniqueForBattle(GameState.world, def, level)
    GameState.markSeen(enemy.speciesId)
    const token = GameState.world.phenomenon.token ? ['（异象信物在你掌心发烫。）'] : []
    this.dialogue.open([...def.appearLines, ...token], () => {
      GameState.pendingBattle = {
        kind: 'unique',
        enemies: [enemy],
        phenomenonId: def.id,
        ...this.returnInfo(),
      }
      this.busy = true
      this.cameras.main.flash(400, 255, 255, 255)
      battleTransition(this)
    })
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

  /** 屏幕中上方的短提示；连续多条时向下错开 */
  private toastCount = 0
  private flashToast(msg: string): void {
    const offset = (this.toastCount++ % 3) * 30
    const t = this.add
      .text(this.scale.width / 2, 60 + offset, msg, {
        fontSize: '14px',
        color: '#fff',
        backgroundColor: '#000000aa',
        padding: { x: 10, y: 6 },
      })
      .setScrollFactor(0)
      .setOrigin(0.5)
      // 高于 ListPanel（1100），在面板中操作时的反馈也能看清
      .setDepth(1200)
    this.tweens.add({
      targets: t,
      alpha: 0,
      delay: 1300,
      duration: 400,
      onComplete: () => {
        t.destroy()
        this.toastCount = Math.max(0, this.toastCount - 1)
      },
    })
  }

  /** 夜晚光源：玩家提灯 + 地图上的火光（世界坐标换算为屏幕坐标） */
  private updateLights(): void {
    const cam = this.cameras.main
    const toScreen = (x: number, y: number, r: number) => ({ x: x - cam.scrollX, y: y - cam.scrollY, r })
    this.weather.setLights([
      toScreen(this.player.x, this.player.y - 4, 84),
      ...this.fireLights.map((l) => toScreen(l.x, l.y, 70)),
    ])
  }

  /** 昼夜滤镜 + 天气粒子 + 异象染色 */
  private refreshAtmosphere(): void {
    const steps = GameState.world.totalSteps
    this.weather.set(this.fieldWeather(), !this.map.indoor && GameState.night(), isFullMoon(steps))
    const tint = this.eventView.tint()
    this.weather.setExtraTint(tint.color, tint.alpha)
  }

  /**
   * HUD：地图 · 天数时段 · 天气 · 首发 · 焰币；第二行显示进行中的异象
   * @author zjh
   * @date 2026-10-14
   */
  private refreshHud(): void {
    const w = GameState.world
    const lead = GameState.party[0]
    const leadText = lead ? ` ｜ ${battleName(lead)} Lv.${lead.level} HP ${lead.hp}/${lead.maxHp}` : ''
    const wt = this.fieldWeather()
    const weatherText = wt ? ` ${WEATHER_INFO[wt].icon}${WEATHER_INFO[wt].label}` : ''
    let text = `${this.map.name} ｜ 第${GameState.day()}天 ${timeLabel(w.totalSteps)}${weatherText}${leadText} ｜ 焰币 ${GameState.coins}`
    const def = activePhenomenon(w)
    if (def) {
      const total = PHENOMENON_RULES.goalCount[def.goal]
      const goal = w.phenomenon.token ? '已得信物' : `${def.goalLabel} ${w.phenomenon.goalDone}/${total}`
      text += `\n✧ 异象「${def.name}」@${MAPS[def.mapId].name} · ${goal}`
    }
    this.hudText.setText(text)
  }
}
