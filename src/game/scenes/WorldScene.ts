/**
 * 大地图：走动、碰撞、传送；每步推进世界（昼夜 / 天气 / 异象 / 小事件 / 遇敌）
 * 世界规则见 systems/WorldTick；NPC 生成 / 互动 / 钓鱼 / 剧情演出拆在 scenes/world/；
 * 事件物件见 ui/WorldEventsView；小镇服务见 ui/TownServices。
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { anchorFeet, hasCharArt, idleFrame, playerSheet, registerCharAnims, stepBob } from '../graphics/CharArt'
import { SPECIES, battleName, type CreatureInstance } from '../data/creatures'
import { decorBlocks } from '../data/decor'
import { ITEMS } from '../data/items'
import { MAPS, isTallGrass, resolveTile, type HasFlag, type MapDef, type NpcDef, type TileKind, type WarpDef } from '../data/maps'
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
import { BOLTS, BOLT_SAFE, DUNE_GATE, boltPhase, boltStrikes, healWithKindler, isBoltTile, rodsLit, tickDuneStorm } from '../systems/Dunes'
import { cloudWindEnd } from '../systems/Cloud'
import { heatTick, towerBoltAt, towerWindEnd } from '../systems/Tower'
import { healThird } from '../systems/Postgame'
import { lightAllyLamps, nightTownActive } from '../systems/Night'
import { BOARD_FLAG, boardSpeed } from '../systems/Vehicle'
import { FROST_FLAGS, ICE_BLOCKS, SLIDE_GOALS, blockFlag, blockPos, chipCold, iceBlockAt, leadIsFlame, slideEnd, slideFlag, tickCold, tryPushIce } from '../systems/Frost'
import { CanyonField } from './world/CanyonField'
import { FishingController } from './world/FishingController'
import { LIGHT_UP_FLAG, beforeLightUp, needsLightUp, playLighthouseLightUp, playWhaleLeap } from './world/LakeCutscenes'
import { NpcInteract } from './world/NpcInteract'
import { NpcChatter } from './world/NpcChatter'
import { NpcRoster } from './world/NpcRoster'
import { NpcWalkers } from './world/NpcWalkers'
import { RideController } from './world/RideController'
import { FOREST_INTRO_LINES, type StoryHost } from './world/StoryEvents'
import { Toaster, playBridgeCutscene, rustleAt, showMapBanner } from './world/WorldFx'
import type { ReturnInfo, WorldHost } from './world/WorldHost'

const MOVE_MS = 140

/** 各地图的环境点缀：草地 / 小镇夜里有萤火虫，山道常有余烬 */
const AMBIENT_BY_MAP: Record<string, AmbientKind> = {
  town: 'fireflies',
  meadow: 'fireflies',
  pass: 'embers',
  lake: 'fireflies',
  forest: 'fireflies',
  canyon: 'embers',
  dunes: 'embers',
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
  /** 第 2 层烫脚计步，换图后重计 */
  private towerHeat = 0
  private facing: Facing = 'down'
  /** 是否使用 AI 行走图（缺图时回退到代码绘制） */
  private charArt = false
  private playerShadow!: Phaser.GameObjects.Ellipse
  /** 展开的折叠滑板，画在脚边 */
  private board!: Phaser.GameObjects.Image
  /** 火盆 / 壁炉 / 灯台位置（世界坐标），夜里照亮周围 */
  private fireLights: { x: number; y: number }[] = []
  private fishing!: FishingController
  private interact!: NpcInteract
  private walkers!: NpcWalkers
  private roster!: NpcRoster
  private chatter!: NpcChatter
  /** 骑乘与跟随伙伴 */
  private ride!: RideController
  private menuWasOpen = false
  /** 千岩峡谷的巨石（其他地图为空壳） */
  private field!: CanyonField
  /** 荒原落雷的黄圈 */
  private boltMarks: Phaser.GameObjects.Ellipse[] = []
  /** 冰湖上的冰块 */
  private iceGfx: Phaser.GameObjects.Ellipse[] = []
  /** 排队等出生格空出来的 NPC：每隔一段时间重试 */
  private rosterRetry = 0
  private toaster!: Toaster
  /** 本次进图要先播放灯台点亮演出（装饰按「未点亮」铺设） */
  private lightUpPending = false

  constructor() {
    super('World')
  }

  create(): void {
    this.map = MAPS[GameState.mapId] ?? MAPS.town
    GameState.snapshotSceneFlags(this.map.id)
    this.tileX = GameState.playerX
    this.tileY = GameState.playerY
    this.facing = GameState.facing
    this.moving = false
    this.busy = false
    this.menuWasOpen = false
    this.lightUpPending = needsLightUp(this.map, hasFlag)
    // 进入地图 / 战斗结束后重新计算安全步数
    GameState.world.stepsSinceEncounter = 0
    this.cameras.main.setBackgroundColor(nightTownActive(this.map.id, (k) => !!GameState.hasFlag(k)) ? 0x1c2438 : this.map.bgColor)
    this.cameras.main.setZoom(1)

    const decorFlag = this.decorFlag()
    renderMap(this, this.map, hasFlag)
    renderDecor(this, this.map, decorFlag)
    this.roster = new NpcRoster(this, this.map)
    const walkerBodies = this.roster.spawnAll(hasFlag)
    this.eventView = new WorldEventsView(this, this.map)
    this.eventView.refresh()
    this.walkers = new NpcWalkers(this, walkerBodies, {
      map: this.map,
      hasFlag,
      playerTile: () => ({ x: this.tileX, y: this.tileY }),
      blockedByOthers: (x, y) => !!this.staticNpcAt(x, y) || !!this.eventView.uniqueAt(x, y),
      isThreat: (npc) => !!npc.defeatedKey && !GameState.getFlag(npc.defeatedKey),
      canSpot: (npc) => this.canBeSpotted(npc),
      onSpotted: (npc) => this.spottedBy(npc),
    })
    this.roster.bind(this.walkers)
    this.chatter = new NpcChatter(this, this.walkers)
    this.rosterRetry = 0

    registerCharAnims(this)
    this.charArt = hasCharArt(this, 'char-player')
    if (!this.map.outdoor && GameState.hasFlag(BOARD_FLAG)) GameState.clearFlag(BOARD_FLAG)
    this.playerShadow = this.add.ellipse(0, 0, 20, 7, 0x000000, 0.22).setDepth(8)
    this.board = this.add.image(0, 0, 'item-fold_board').setDepth(9).setScale(0.85).setVisible(false)
    this.player = this.charArt
      ? anchorFeet(this.add.sprite(0, 0, playerSheet(this), idleFrame(this.facing))).setDepth(10)
      : this.add.sprite(0, 0, `spr-player-${this.facing}`).setDepth(10)
    this.placePlayerVisual()
    this.setupCamera()

    this.weather = new WeatherLayer(this, 400)
    this.weather.setAmbient(AMBIENT_BY_MAP[this.map.id] ?? null)
    this.fireLights = decorLights(this.map, decorFlag)
    this.toaster = new Toaster(this)
    this.ride = new RideController({
      scene: this,
      map: this.map,
      player: this.player,
      charArt: this.charArt,
      hasFlag,
      tile: () => ({ x: this.tileX, y: this.tileY }),
      facing: () => this.facing,
      toast: (m) => this.flashToast(m),
    })
    this.field = new CanyonField(this, this.map, (m) => this.flashToast(m))
    this.boltMarks = []
    if (this.map.id === 'dunes') {
      const ts = this.map.tileSize
      for (const b of BOLTS) {
        this.boltMarks.push(this.add.ellipse(b.x * ts + ts / 2, b.y * ts + ts / 2, ts * 0.72, ts * 0.72, 0xf5d442, 0.45).setDepth(4))
      }
    }
    this.placeIceBlocks()
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

    this.touch = new TouchPad(this, { ride: true })
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
      outdoor: () => this.map.outdoor,
      travel: (mapId, x, y) => {
        GameState.mapId = mapId
        GameState.playerX = x
        GameState.playerY = y
        this.restartMap()
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
    const next = chainId ? this.map.npcs.find((n) => n.id === chainId) : undefined
    const chain = () => {
      if (!next || !this.hasAbleCreature()) return
      if (next.id.startsWith('champ_') && healThird(GameState.party) > 0) this.flashToast('短暂休息，伙伴们恢复了三成体力。')
      this.interact.challenge(next)
    }
    const openNight = () => {
      if (!nightTownActive(this.map.id, (k) => !!GameState.hasFlag(k)) && this.map.id === 'town' && GameState.hasFlag('chapter7_done') && !GameState.hasFlag('night_started')) {
        this.busy = true
        const has = (k: string) => !!GameState.getFlag(k)
        const held = [
          has('kindler_joined') ? '绯守住了商店前的灯。' : '',
          has('anvil_beaten') ? '砧守住了旅店的灯。' : '',
          has('twins_beaten') ? '朔和望守住了阿禾家的灯。' : '',
        ].filter(Boolean)
        this.dialogue.open(
          [
            '小路：旅人！旅人！外面的灯……都灭了！',
            '（路灯从远到近，一盏盏暗了下去。）',
            '阿禾：……他来了。',
            '岚在广场开了救护站。麦把存货半价摆出来了。',
            ...held,
            '剩下的路灯，得你去点亮。',
          ],
          () => {
            GameState.setFlag('night_started', true)
            lightAllyLamps(has, (k) => GameState.setFlag(k, true))
            this.busy = false
            this.restartMap(0x1a2744)
          },
        )
        return
      }
      chain()
    }
    if (notices.length) this.dialogue.open(notices, openNight)
    else openNight()
  }

  /** 结局后第一次回到湖畔：灯台点亮，写旗标后带着点亮的灯台重进地图 */
  private playLightUp(): void {
    this.busy = true
    this.hudText.setVisible(false)
    playLighthouseLightUp(this, this.map, () => {
      GameState.setFlag(LIGHT_UP_FLAG, true)
      GameState.persist()
      this.busy = false
      this.dialogue.open(['（湖心的灯台重新亮了起来。）', '（温暖的光穿过薄雾，湖面上的冰一点点化开……）', ...FOREST_INTRO_LINES], () => {
        GameState.setFlag('forest_unlocked', true)
        this.restartMap(0xfff6d2)
      })
    })
  }

  /** 淡出后重进当前地图（剧情改变了地图状态时使用） */
  private restartMap(color = 0xffffff): void {
    this.busy = true
    const rgb = Phaser.Display.Color.IntegerToRGB(color)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart())
    this.cameras.main.fadeOut(400, rgb.r, rgb.g, rgb.b)
  }

  update(time: number, delta: number): void {
    this.playerShadow.setPosition(this.player.x, this.player.y + 13).setSize(this.ride.shadowWidth, 7)
    this.board.setPosition(this.player.x, this.player.y + 8).setVisible(!!GameState.hasFlag(BOARD_FLAG))
    // 菜单关上后同步跟随 / 坐骑（队伍、寄存都可能改变它们）
    if (this.menuWasOpen && !this.menus.isOpen) {
      this.ride.sync()
      if (this.ride.riding && GameState.hasFlag(BOARD_FLAG)) GameState.clearFlag(BOARD_FLAG)
    }
    this.menuWasOpen = this.menus.isOpen
    this.ride.update()
    this.updateBoltMarks()
    this.updateLights()
    this.weather?.update(delta)
    const input = this.keys.poll()
    if (!this.moving && input.dx === 0 && input.dy === 0) this.stopWalk()
    this.walkers.update(time, delta, !this.idle())
    this.chatter.update(delta, !this.idle())
    if (this.roster.hasPending && (this.rosterRetry -= delta) <= 0) {
      this.rosterRetry = 1000
      this.syncNpcs()
    }
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
    if (this.moving || this.field.busy) return

    if (input.ride) {
      this.ride.toggle()
      if (this.ride.riding && GameState.hasFlag(BOARD_FLAG)) GameState.clearFlag(BOARD_FLAG)
      return
    }
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

  /** 某格上的 NPC：闲逛 NPC 按当前位置算，其余按地图定义的位置 */
  private occupiedByNpc(x: number, y: number): NpcDef | null {
    return this.walkers.npcAt(x, y) ?? this.staticNpcAt(x, y)
  }

  /** 不闲逛的 NPC（站在地图定义的位置上） */
  private staticNpcAt(x: number, y: number): NpcDef | null {
    return this.roster.staticAt(x, y)
  }

  /**
   * 旗标（昼夜 / 天气 / 剧情）变化后同步 NPC：路人回家 / 出门、采集点消失等，不重进地图
   * @author zjh
   * @date 2026-10-15
   */
  private syncNpcs(): void {
    this.roster.sync(hasFlag, (x, y) => (x === this.tileX && y === this.tileY) || !!this.eventView.uniqueAt(x, y))
  }

  /** 没有对话、菜单、钓鱼、过场在进行 */
  private idle(): boolean {
    return !this.busy && !this.dialogue.isOpen && !this.menus.isOpen && !this.fishing.active
  }

  /** 训练家能否发起视线对战：未被击败、玩家站定且有可战伙伴 */
  private canBeSpotted(npc: NpcDef): boolean {
    if (!npc.defeatedKey || GameState.getFlag(npc.defeatedKey)) return false
    return this.idle() && !this.moving && this.hasAbleCreature()
  }

  /**
   * 被训练家看见：玩家停下 → 训练家冒「!」走过来 → 面对面开始对话 / 对战
   * @author zjh
   * @date 2026-10-15
   */
  private spottedBy(npc: NpcDef): void {
    if (this.busy) return
    this.busy = true
    this.stopWalk()
    Sfx.confirm()
    this.walkers.approach(npc, (at) => {
      this.setFacing(at.x < this.tileX ? 'left' : at.x > this.tileX ? 'right' : at.y < this.tileY ? 'up' : 'down')
      this.busy = false
      this.interact.handle(null, npc)
    })
  }

  private tryMove(dx: number, dy: number): void {
    this.setFacing(dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'up' : 'down')

    let nx = this.tileX + dx
    let ny = this.tileY + dy
    let tile = resolveTile(this.map, nx, ny, hasFlag)
    if (this.map.id === 'tower3' && tile === 'water' && GameState.hasFlag('tower_sluice')) tile = 'path'
    if (!tile || decorBlocks(this.map.id, nx, ny) || this.occupiedByNpc(nx, ny) || this.eventView.uniqueAt(nx, ny)) return
    if (this.field.blocks(nx, ny)) return
    // 冰块只存在于冰湖。默认停在 (10,7)，不能拿到别的地图上挡路
    if (this.map.id === 'icelake' && iceBlockAt(nx, ny, (k) => GameState.getFlag(k))) return
    const throughGate = this.map.id === 'dunes' && nx === DUNE_GATE.x && ny === DUNE_GATE.y && rodsLit((k) => GameState.getFlag(k))
    if (!throughGate && !this.field.opens(nx, ny) && !this.ride.canEnter(tile)) return
    if (GameState.hasFlag(BOARD_FLAG) && tile === 'ice') {
      this.flashToast('滑板在冰上站不稳。')
      return
    }
    if (this.map.id === 'cloudmill') {
      const blown = cloudWindEnd(this.tileX, this.tileY, dx, dy, (mill) => GameState.hasFlag(mill === 'a' ? 'cloud_mill_a' : 'cloud_mill_b'))
      if (blown) {
        if (blown.x === this.tileX && blown.y === this.tileY) {
          this.flashToast('风把你托回来了')
          return
        }
        nx = blown.x
        ny = blown.y
        tile = resolveTile(this.map, nx, ny, hasFlag) ?? tile
      }
    }
    if (this.map.id === 'tower8') {
      const blown = towerWindEnd(this.tileX, this.tileY, dx)
      if (blown) {
        nx = blown.x
        ny = blown.y
        tile = resolveTile(this.map, nx, ny, hasFlag) ?? tile
      }
    }
    if ((this.map.id === 'icelake' || this.map.id === 'tower7') && tile === 'ice') {
      const end = slideEnd(
        this.tileX,
        this.tileY,
        dx,
        dy,
        (x, y) => resolveTile(this.map, x, y, hasFlag),
        (x, y) =>
          (this.map.id === 'icelake' && !!iceBlockAt(x, y, (k) => GameState.getFlag(k))) ||
          !!this.occupiedByNpc(x, y) ||
          decorBlocks(this.map.id, x, y),
      )
      if (end.x === this.tileX && end.y === this.tileY) return
      nx = end.x
      ny = end.y
      tile = resolveTile(this.map, nx, ny, hasFlag) ?? tile
    }

    const fromX = this.tileX
    const fromY = this.tileY
    const tiles = Math.max(1, Math.abs(nx - fromX) + Math.abs(ny - fromY))
    const ms = boardSpeed(this.ride.moveMs(MOVE_MS * tiles), !!GameState.hasFlag(BOARD_FLAG) && !this.ride.riding)
    this.moving = true
    this.tileX = nx
    this.tileY = ny
    GameState.playerX = nx
    GameState.playerY = ny
    Sfx.step()
    this.ride.onStep(fromX, fromY, ms)

    const ts = this.map.tileSize
    this.tweens.add({
      targets: this.player,
      x: nx * ts + ts / 2,
      y: ny * ts + ts / 2,
      duration: ms,
      onComplete: () => {
        this.moving = false
        this.afterStep(tile, fromX, fromY)
      },
    })
    if (this.charArt) {
      this.player.play(this.ride.walkAnim(this.facing), true)
      stepBob(this, this.player, ms, this.ride.frameH)
    }
    // 代码绘制的小人没有行走帧，用轻微弹跳代替
    else this.tweens.add({ targets: this.player, scaleY: 0.9, yoyo: true, duration: ms / 2 })
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
    if (this.map.id === 'tower6' && towerBoltAt(this.tileX, this.tileY)) {
      for (const c of GameState.party) if (c.hp > 1) c.hp = Math.max(1, c.hp - 4)
      this.tileX = fromX
      this.tileY = fromY
      const ts = this.map.tileSize
      this.player.setPosition(fromX * ts + ts / 2, fromY * ts + ts / 2)
      this.flashToast('落雷劈在脚边，你退了回来。')
      this.refreshHud()
      return
    }
    if (this.map.id === 'tower2') {
      this.towerHeat += 1
      const msg = heatTick(this.towerHeat, GameState.party)
      if (msg) {
        this.flashToast(msg)
        this.refreshHud()
      }
    }
    if (this.map.id === 'dunes' && this.applyDuneStep()) return
    if (this.map.id === 'frostpeak') this.applyCold()
    if (this.map.id === 'icelake') this.markSlide()
    this.walkers.react()
    const spotter = this.walkers.spotter()
    if (spotter) {
      this.spottedBy(spotter)
      return
    }
    const grass = isTallGrass(tile)
    const ice = tile === 'ice'
    if (grass || ice) {
      const ts = this.map.tileSize
      const color = ice ? 0xe8f8ff : this.map.id === 'pass' ? 0xffb050 : 0x8fd99a
      rustleAt(this, this.tileX * ts + ts / 2, this.tileY * ts + ts / 2, color)
    }
    const source = this.ride.encounterSource(tile, !this.map.outdoor ? null : grass ? 'grass' : ice ? 'ice' : null)
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
    if (res.clock.phaseChanged || res.clock.weatherChanged) {
      this.refreshAtmosphere()
      GameState.snapshotSceneFlags(this.map.id)
      this.syncNpcs()
    }

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
    if (this.field.tryInteract(x, y, x - this.tileX, y - this.tileY)) return
    if (this.pushIce(x, y)) return
    const npc = this.occupiedByNpc(x, y)
    if (npc) this.walkers.greet(npc)
    if (this.interact.handle(this.eventView.uniqueAt(x, y), npc)) return
    if (this.ride.follower.at(x, y)) {
      this.dialogue.open([this.ride.follower.greet()])
      return
    }
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

  /** 画出冰湖上的冰块 */
  private placeIceBlocks(): void {
    for (const g of this.iceGfx) g.destroy()
    this.iceGfx = []
    if (this.map.id !== 'icelake') return
    const ts = this.map.tileSize
    for (const def of ICE_BLOCKS) {
      const pos = blockPos(def, (k) => GameState.getFlag(k))
      this.iceGfx.push(this.add.ellipse(pos.x * ts + ts / 2, pos.y * ts + ts / 2, ts * 0.72, ts * 0.72, 0xd8f4ff, 0.9).setDepth(6))
    }
  }

  /**
   * 怪力手套把面前的冰块推一格。不是冰块时返回 false
   * @author zjh
   * @date 2026-10-16
   */
  private pushIce(x: number, y: number): boolean {
    const get = (k: string) => GameState.getFlag(k)
    if (this.map.id !== 'icelake' || !iceBlockAt(x, y, get)) return false
    if (GameState.itemCount('strength_gloves') <= 0) {
      this.flashToast('没有怪力手套，推不动这块冰。')
      return true
    }
    const result = tryPushIce(
      x,
      y,
      x - this.tileX,
      y - this.tileY,
      get,
      (tx, ty) => resolveTile(this.map, tx, ty, hasFlag),
      (tx, ty) => !!this.occupiedByNpc(tx, ty),
    )
    if (!result.ok || result.id === undefined || result.nx === undefined || result.ny === undefined) {
      this.flashToast(result.reason ?? '这边推不过去。')
      return true
    }
    GameState.setFlag(blockFlag(result.id), `${result.nx},${result.ny}`)
    this.placeIceBlocks()
    this.flashToast('冰块推开了。')
    return true
  }

  /** 霜铃峰积寒冷，满了以后每 10 步掉一点体力 */
  private applyCold(): void {
    const next = tickCold(Number(GameState.getFlag('frost_cold') || 0), Number(GameState.getFlag('frost_full_steps') || 0), leadIsFlame(GameState.party))
    GameState.setFlag('frost_cold', next.cold)
    GameState.setFlag('frost_full_steps', next.fullSteps)
    if (next.justFull) this.flashToast('冷得发抖。去篝火边暖一暖。')
    if (next.chip && chipCold(GameState.party) > 0) {
      this.flashToast('寒风刺骨，伙伴们掉了一点体力。')
      this.refreshHud()
    }
  }

  /** 滑到发光的停靠点，三处都到了才开铃殿 */
  private markSlide(): void {
    const goal = SLIDE_GOALS.find((g) => g.x === this.tileX && g.y === this.tileY)
    if (!goal || GameState.hasFlag(slideFlag(goal.id))) return
    GameState.setFlag(slideFlag(goal.id), true)
    this.flashToast(`停靠点 ${goal.id} 亮了。`)
    if (SLIDE_GOALS.every((g) => GameState.hasFlag(slideFlag(g.id)))) {
      GameState.setFlag(FROST_FLAGS.slide, true)
      this.flashToast('冰湖的路通了。铃殿的北风散开了。')
    }
  }

  /**
   * 荒原一步：沙暴计时，落雷拍站在黄圈上会被弹回。返回 true 表示这一步不再遇敌
   * @author zjh
   * @date 2026-10-16
   */
  private applyDuneStep(): boolean {
    const num = (k: string) => Number(GameState.getFlag(k) || 0)
    const next = tickDuneStorm(num('dune_walk'), num('dune_storm'), Math.random)
    GameState.setFlag('dune_walk', next.walk)
    GameState.setFlag('dune_storm', next.left)
    if (next.started) this.flashToast('沙暴卷起来了，看不太远。')
    if (next.ended) this.flashToast('沙暴散了。')
    if (next.started || next.ended) this.refreshAtmosphere()
    const bolt = num('dune_bolt') + 1
    GameState.setFlag('dune_bolt', bolt)
    const lit = rodsLit((k) => GameState.getFlag(k))
    if (!lit && isBoltTile(this.tileX, this.tileY) && boltStrikes(bolt)) {
      this.tileX = BOLT_SAFE.x
      this.tileY = BOLT_SAFE.y
      GameState.playerX = BOLT_SAFE.x
      GameState.playerY = BOLT_SAFE.y
      this.placePlayerVisual()
      this.flashToast('落雷！你被弹回了安全的地方。')
      this.cameras.main.flash(180, 255, 230, 80)
      return true
    }
    return false
  }

  /** 黄圈随四拍亮灭；石门打开后落雷停 */
  private updateBoltMarks(): void {
    if (!this.boltMarks.length) return
    const lit = rodsLit((k) => GameState.getFlag(k))
    const phase = boltPhase(Number(GameState.getFlag('dune_bolt') || 0))
    const alpha = lit ? 0 : phase === 'flash' ? 0.4 : phase === 'strike' ? 0.9 : 0.08
    for (const mark of this.boltMarks) mark.setAlpha(alpha)
  }

  private enterBattle(pending: PendingBattle, flash = false): void {
    if (this.map.id === 'dunes' && GameState.hasFlag('kindler_joined') && !GameState.hasFlag('falcon_beaten')) {
      if (healWithKindler(GameState.party) > 0) this.flashToast('绯的焰灯蜥放出暖光，伙伴们恢复了一些体力。')
    }
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
      redraw: () => this.restartMap(),
      refreshNpcs: () => this.syncNpcs(),
      choose: (title, options, onPick) => {
        this.menus.panel.open({
          title,
          rows: options.map((o) => ({ label: o.label, onSelect: () => onPick(o.id) })),
          onCancel: () => this.menus.panel.close(),
        })
      },
      travel: (mapId, x, y) => {
        GameState.mapId = mapId
        GameState.playerX = x
        GameState.playerY = y
        this.restartMap()
      },
      goChapter: (card) => fadeToScene(this, 'Chapter', 400, card),
    }
  }

  private flashToast(msg: string): void {
    this.toaster.show(msg)
  }

  /** 夜晚光源：玩家提灯 + 地图上的火光 + 发光菇（世界坐标换算为屏幕坐标） */
  private updateLights(): void {
    const cam = this.cameras.main
    const toScreen = (x: number, y: number, r: number) => ({ x: x - cam.scrollX, y: y - cam.scrollY, r })
    this.weather.setLights([
      toScreen(this.player.x, this.player.y - 4, this.ride.lightRadius()),
      ...this.fireLights.map((l) => toScreen(l.x, l.y, 70)),
      ...this.roster.glows().map((l) => toScreen(l.x, l.y, 30)),
    ])
  }

  /** 昼夜滤镜 + 天气粒子 + 异象染色 */
  private refreshAtmosphere(): void {
    const steps = GameState.world.totalSteps
    let weather = this.fieldWeather()
    if (this.map.id === 'dunes' && Number(GameState.getFlag('dune_storm') || 0) > 0) weather = 'sand'
    this.weather.set(weather, !this.map.indoor && GameState.night(), isFullMoon(steps))
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
    const cold = this.map.id === 'frostpeak' ? ` ｜ 寒冷 ${Number(GameState.getFlag('frost_cold') || 0)}` : ''
    const board = GameState.hasFlag(BOARD_FLAG) ? ' ｜ 滑板' : ''
    let text = `${this.map.name} ｜ 第${GameState.day()}天 ${timeLabel(w.totalSteps)}${weatherText}${cold}${board}${leadText} ｜ 焰币 ${GameState.coins}`
    const def = activePhenomenon(w)
    if (def) {
      const total = PHENOMENON_RULES.goalCount[def.goal]
      const goal = w.phenomenon.token ? '已得信物' : `${def.goalLabel} ${w.phenomenon.goalDone}/${total}`
      text += `\n✧ 异象「${def.name}」@${MAPS[def.mapId].name} · ${goal}`
    }
    this.hudText.setText(text)
  }
}
