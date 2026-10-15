/**
 * 大地图：走动、碰撞、传送；每步推进世界（昼夜 / 天气 / 异象 / 小事件 / 遇敌）
 * 世界规则见 systems/WorldTick；NPC 生成 / 互动 / 钓鱼 / 剧情演出拆在 scenes/world/；
 * 事件物件见 ui/WorldEventsView；小镇服务见 ui/TownServices。
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { anchorFeet, hasCharArt, idleFrame, registerCharAnims } from '../graphics/CharArt'
import { SPECIES, battleName, type CreatureInstance } from '../data/creatures'
import { decorBlocks } from '../data/decor'
import { ITEMS } from '../data/items'
import { MAPS, isSolid, isTallGrass, resolveTile, visibleNpcs, type HasFlag, type MapDef, type NpcDef, type TileKind, type WarpDef } from '../data/maps'
import { MINOR_EVENTS, PHENOMENON_RULES } from '../data/phenomena'
import { WEATHER_INFO } from '../data/weather'
import { GameState, type Facing, type PendingBattle } from '../state/GameState'
import { Sfx } from '../systems/AudioBeeps'
import { activePhenomenon } from '../systems/Phenomenon'
import { isFullMoon, timeLabel } from '../systems/WorldClock'
import { stepWorld, type StepResult } from '../systems/WorldTick'
import { decorLights, renderDecor } from '../ui/DecorLayer'
import { DialogueBox } from '../ui/DialogueBox'
import { InputKeys } from '../ui/InputKeys'
import { ListPanel } from '../ui/ListPanel'
import { renderMap } from '../ui/MapRenderer'
import { TouchPad } from '../ui/TouchPad'
import { TownServices } from '../ui/TownServices'
import { battleTransition, fadeIn, fadeToScene } from '../ui/Transition'
import { WeatherLayer } from '../ui/WeatherLayer'
import type { AmbientKind } from '../ui/weather/Ambient'
import { WorldEventsView } from '../ui/WorldEventsView'
import { WorldMenus } from '../ui/WorldMenus'
import { FishingController } from './world/FishingController'
import { LIGHT_UP_FLAG, beforeLightUp, needsLightUp, playLighthouseLightUp, playWhaleLeap } from './world/LakeCutscenes'
import { NpcInteract } from './world/NpcInteract'
import { spawnNpcs } from './world/NpcLayer'
import type { StoryHost } from './world/StoryEvents'
import { Toaster, playBridgeCutscene, rustleAt, showMapBanner } from './world/WorldFx'
import type { ReturnInfo, WorldHost } from './world/WorldHost'

const MOVE_MS = 140

/** 各地图的环境点缀：草地 / 小镇夜里有萤火虫，山道常有余烬 */
const AMBIENT_BY_MAP: Record<string, AmbientKind> = {
  town: 'fireflies',
  meadow: 'fireflies',
  pass: 'embers',
  lake: 'fireflies',
}

const hasFlag = GameState.hasFlag

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
  /** 过渡中（切图/进战斗/演出），屏蔽输入 */
  private busy = false
  private facing: Facing = 'down'
  /** 是否使用 AI 行走图（缺图时回退到代码绘制） */
  private charArt = false
  private playerShadow!: Phaser.GameObjects.Ellipse
  /** 火盆 / 壁炉 / 灯台位置（世界坐标），夜里照亮周围 */
  private fireLights: { x: number; y: number }[] = []
  private fishing!: FishingController
  private interact!: NpcInteract
  private toaster!: Toaster
  /** 本次进图要先播放灯台点亮演出（装饰按「未点亮」铺设） */
  private lightUpPending = false

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
    this.lightUpPending = needsLightUp(this.map, hasFlag)
    // 进入地图 / 战斗结束后重新计算安全步数
    GameState.world.stepsSinceEncounter = 0
    this.cameras.main.setBackgroundColor(this.map.bgColor)
    this.cameras.main.setZoom(1)

    const decorFlag = this.decorFlag()
    renderMap(this, this.map, hasFlag)
    renderDecor(this, this.map, decorFlag)
    spawnNpcs(this, this.map, hasFlag)
    this.eventView = new WorldEventsView(this, this.map)
    this.eventView.refresh()

    registerCharAnims(this)
    this.charArt = hasCharArt(this, 'char-player')
    this.playerShadow = this.add.ellipse(0, 0, 20, 7, 0x000000, 0.22).setDepth(8)
    this.player = this.charArt
      ? anchorFeet(this.add.sprite(0, 0, 'char-player', idleFrame(this.facing))).setDepth(10)
      : this.add.sprite(0, 0, `spr-player-${this.facing}`).setDepth(10)
    this.placePlayerVisual()
    this.setupCamera()

    this.weather = new WeatherLayer(this, 400)
    this.weather.setAmbient(AMBIENT_BY_MAP[this.map.id] ?? null)
    this.fireLights = decorLights(this.map, decorFlag)
    this.toaster = new Toaster(this)
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
    this.createPanels()
    const host = this.worldHost()
    this.fishing = new FishingController(host)
    this.interact = new NpcInteract(host, () => this.storyHost())

    fadeIn(this)
    showMapBanner(this, this.map.name)
    this.time.delayedCall(450, () => this.resumeStory())
  }

  /** 装饰层使用的旗标视图（灯台点亮演出前把灯台当作熄灭） */
  private decorFlag(): HasFlag {
    return this.lightUpPending ? beforeLightUp(hasFlag) : hasFlag
  }

  /** 地图小于画面时，扩大镜头边界让地图居中显示 */
  private setupCamera(): void {
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
  }

  private createPanels(): void {
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
  }

  /** 提供给 scenes/world/ 子模块的能力 */
  private worldHost(): WorldHost {
    return {
      scene: this,
      map: this.map,
      dialogue: this.dialogue,
      menus: this.menus,
      services: this.services,
      playerXY: () => ({ x: this.player.x, y: this.player.y }),
      toast: (m) => this.flashToast(m),
      refreshHud: () => this.refreshHud(),
      hasAbleCreature: () => this.hasAbleCreature(),
      returnInfo: () => this.returnInfo(),
      enterBattle: (pending, flash) => this.enterBattle(pending, flash),
      startWildBattle: (enemy) => this.startWildBattle(enemy),
    }
  }

  /**
   * 进入地图后：灯台点亮演出 → 待提示的说明（读档补齐、章节奖励）→ 连战的下一场
   * @author zjh
   * @date 2026-10-15
   */
  private resumeStory(): void {
    if (this.lightUpPending) {
      this.playLightUp()
      return
    }
    const notices = GameState.notices.splice(0)
    const chainId = GameState.chainNpcId
    GameState.chainNpcId = null
    const next = chainId ? visibleNpcs(this.map, hasFlag).find((n) => n.id === chainId) : undefined
    const chain = () => {
      if (next && this.hasAbleCreature()) this.interact.challenge(next)
    }
    if (notices.length) this.dialogue.open(notices, chain)
    else chain()
  }

  /** 结局后第一次回到湖畔：灯台点亮，写旗标后带着点亮的灯台重进地图 */
  private playLightUp(): void {
    this.busy = true
    this.hudText.setVisible(false)
    playLighthouseLightUp(this, this.map, () => {
      GameState.setFlag(LIGHT_UP_FLAG, true)
      GameState.persist()
      this.busy = false
      this.dialogue.open(['（湖心的灯台重新亮了起来。）', '（温暖的光穿过薄雾，湖面上的冰一点点化开……）'], () => this.restartMap(0xfff6d2))
    })
  }

  /** 淡出后重进当前地图（剧情改变了地图状态时使用） */
  private restartMap(color = 0xffffff): void {
    this.busy = true
    const rgb = Phaser.Display.Color.IntegerToRGB(color)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart())
    this.cameras.main.fadeOut(400, rgb.r, rgb.g, rgb.b)
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
    if (this.fishing.active) {
      this.fishing.update(input.confirm)
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
    return visibleNpcs(this.map, hasFlag).find((n) => n.x === x && n.y === y) ?? null
  }

  private tryMove(dx: number, dy: number): void {
    this.setFacing(dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'up' : 'down')

    const nx = this.tileX + dx
    const ny = this.tileY + dy
    const tile = resolveTile(this.map, nx, ny, hasFlag)
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
    const ice = tile === 'ice'
    if (grass || ice) {
      const ts = this.map.tileSize
      const color = ice ? 0xe8f8ff : this.map.id === 'pass' ? 0xffb050 : 0x8fd99a
      rustleAt(this, this.tileX * ts + ts / 2, this.tileY * ts + ts / 2, color)
    }
    const source = !this.map.outdoor ? null : grass ? 'grass' : ice ? 'ice' : null
    this.handleStep(stepWorld(this.map.id, this.tileX, this.tileY, source))
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

  private facingTile(): { x: number; y: number } {
    const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[this.facing]
    return { x: this.tileX + d[0], y: this.tileY + d[1] }
  }

  /** 面前有唯一精灵 / NPC 则互动，否则尝试钓鱼 */
  private tryInteract(): void {
    const { x, y } = this.facingTile()
    if (this.interact.handle(this.eventView.uniqueAt(x, y), this.occupiedByNpc(x, y))) return
    this.fishing.tryFish(x, y)
  }

  private hasAbleCreature(): boolean {
    return GameState.party.some((c) => c.hp > 0)
  }

  /** 场地天气：只有户外地图有天气 */
  private fieldWeather() {
    return this.map.outdoor ? GameState.weatherAt(this.map.id) : null
  }

  private returnInfo(): ReturnInfo {
    return { weather: this.fieldWeather(), night: GameState.night(), returnMapId: this.map.id, returnX: this.tileX, returnY: this.tileY }
  }

  private enterBattle(pending: PendingBattle, flash = false): void {
    GameState.pendingBattle = pending
    this.busy = true
    if (flash) this.cameras.main.flash(400, 255, 255, 255)
    battleTransition(this)
  }

  private startWildBattle(enemy: CreatureInstance): void {
    if (!this.hasAbleCreature()) return
    this.enterBattle({ kind: 'wild', enemies: [enemy], ...this.returnInfo() })
  }

  /** 剧情脚本可调用的能力 */
  private storyHost(): StoryHost {
    return {
      say: (lines, after) => this.dialogue.open(lines, after),
      healParty: () => {
        GameState.healAll()
        this.refreshHud()
        this.cameras.main.flash(250, 255, 240, 255)
      },
      toast: (m) => this.flashToast(m),
      refreshHud: () => this.refreshHud(),
      playBridge: () => {
        this.busy = true
        this.hudText.setVisible(false)
        playBridgeCutscene(this, this.map, () =>
          playWhaleLeap(this, this.map, () => {
            GameState.persist()
            this.restartMap()
          }),
        )
      },
    }
  }

  private flashToast(msg: string): void {
    this.toaster.show(msg)
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
