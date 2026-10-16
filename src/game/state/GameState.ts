/**
 * 运行时全局游戏状态（跨场景共享）：队伍、寄存所、位置、旗标、背包、金币、图鉴、世界时钟
 * @author zjh
 * @date 2026-10-14
 */

import { PARTY_LIMIT } from '../data/items'
import { createCreature, type CreatureInstance } from '../data/creatures'
import type { Weather } from '../data/weather'
import type { BattleKind } from '../systems/BattleLogic'
import { healParty, normalizeCreature } from '../systems/Growth'
import {
  clearSave,
  defaultBag,
  hasSave,
  loadGame,
  saveGame,
  type DexRecord,
  type GameFlags,
  type SaveData,
} from '../systems/SaveSystem'
import { createWorld, dayOf, isNight, weatherOf, type WorldSave } from '../systems/WorldClock'
import { migrateChapters } from './saveMigrate'

export interface PendingBattle {
  kind: BattleKind
  /** 对手队伍（野生战只有 1 只） */
  enemies: CreatureInstance[]
  trainerName?: string
  flagOnWin?: string
  /** 守护兽战（胜利后按 data/chapters 收尾） */
  isBoss?: boolean
  /** 连战：胜利后回到世界立即挑战的下一位 NPC id */
  chainNpcId?: string
  /** 连战：失败时需要清除的旗标（让整组连战重来） */
  chainResetFlags?: string[]
  /** 异象战对应的异象 id */
  phenomenonId?: string
  /** 临时组队：由同伴的队伍代替玩家出战（胜负都不影响玩家队伍，也不登记图鉴） */
  allyParty?: CreatureInstance[]
  allyName?: string
  /** 胜利后回到大地图时播放一次的台词 */
  winLines?: string[]
  /** 胜利后额外写入的旗标 */
  winFlags?: string[]
  /** 训练家再战（胜利后累计再战次数） */
  rematch?: boolean
  /** 战斗场地天气（室内 / 城镇为 null） */
  weather: Weather | null
  night: boolean
  returnMapId: string
  returnX: number
  returnY: number
}

export type Facing = 'up' | 'down' | 'left' | 'right'

/** 全灭后的复活点 */
export const RESPAWN = { mapId: 'cabin', x: 4, y: 5 }

/** 户外地图及其解锁旗标 */
export const OUTDOOR_MAPS: { mapId: string; requireFlag?: string }[] = [
  { mapId: 'meadow' },
  { mapId: 'pass', requireFlag: 'ranger_beaten' },
  { mapId: 'lake', requireFlag: 'lake_unlocked' },
  { mapId: 'forest', requireFlag: 'forest_unlocked' },
  { mapId: 'canyon', requireFlag: 'canyon_unlocked' },
  { mapId: 'dunes', requireFlag: 'dunes_unlocked' },
]

class GameStateStore {
  party: CreatureInstance[] = []
  storage: CreatureInstance[] = []
  mapId = 'town'
  playerX = 8
  playerY = 8
  facing: Facing = 'down'
  flags: GameFlags = {}
  playSeconds = 0
  coins = 100
  bag: Record<string, number> = {}
  dex: DexRecord = { seen: [], caught: [] }
  starterId = 'flarehorn'
  world: WorldSave = createWorld()
  pendingBattle: PendingBattle | null = null
  startedAt = Date.now()
  /** 连战中下一位对手（运行时，不存档） */
  chainNpcId: string | null = null
  /** 进入世界时要提示一次的说明（读档补齐、章节奖励等，不存档） */
  notices: string[] = []

  /**
   * 新开局：以选择的初始伙伴出发，附赠少量道具
   * @author zjh
   * @date 2026-10-14
   */
  newGame(starterId = 'flarehorn'): void {
    this.starterId = starterId
    this.party = [createCreature(starterId, 5)]
    this.storage = []
    this.mapId = 'town'
    this.playerX = 8
    this.playerY = 8
    this.facing = 'down'
    this.flags = {}
    this.playSeconds = 0
    this.coins = 100
    this.bag = defaultBag()
    this.dex = { seen: [starterId], caught: [starterId] }
    this.world = createWorld()
    this.pendingBattle = null
    this.startedAt = Date.now()
    this.chainNpcId = null
    this.notices = []
  }

  tryLoad(): boolean {
    const data = loadGame()
    if (!data) return false
    this.applySave(data)
    return true
  }

  applySave(data: SaveData): void {
    this.party = data.party.map(normalizeCreature)
    this.storage = data.storage.map(normalizeCreature)
    this.mapId = data.mapId
    this.playerX = data.playerX
    this.playerY = data.playerY
    this.facing = 'down'
    this.flags = { ...data.flags }
    this.playSeconds = data.playSeconds
    this.coins = data.coins
    this.bag = { ...data.bag }
    this.dex = { seen: [...data.dex.seen], caught: [...data.dex.caught] }
    this.starterId = data.starterId
    this.world = structuredClone(data.world)
    this.pendingBattle = null
    this.startedAt = Date.now()
    this.chainNpcId = null
    this.notices = migrateChapters(this)
  }

  /** 累计游玩秒数（含本次会话未落盘部分） */
  totalSeconds(): number {
    return this.playSeconds + Math.floor((Date.now() - this.startedAt) / 1000)
  }

  persist(): void {
    this.playSeconds = this.totalSeconds()
    this.startedAt = Date.now()
    saveGame(
      structuredClone({
        mapId: this.mapId,
        playerX: this.playerX,
        playerY: this.playerY,
        party: this.party,
        storage: this.storage,
        flags: this.flags,
        playSeconds: this.playSeconds,
        coins: this.coins,
        bag: this.bag,
        dex: this.dex,
        starterId: this.starterId,
        world: this.world,
      }),
    )
  }

  hasSaveFile(): boolean {
    return hasSave()
  }

  wipeSave(): void {
    clearSave()
  }

  healAll(): void {
    healParty(this.party)
  }

  setFlag(key: string, value: boolean | number | string = true): void {
    this.flags[key] = value
  }

  getFlag(key: string): boolean | number | string | undefined {
    return this.flags[key]
  }

  clearFlag(key: string): void {
    delete this.flags[key]
  }

  /** 进图时记下的时间 / 天气旗标（@night / @rain），同一张图里保持不变，不存档 */
  sceneFlags: Record<string, boolean> = {}

  hasFlag = (key: string): boolean => (key.startsWith('@') ? !!this.sceneFlags[key] : !!this.flags[key])

  /**
   * 进入地图时刷新 @night / @rain；城镇没有自己的天气，跟随青苔草地
   * @author zjh
   * @date 2026-10-15
   */
  snapshotSceneFlags(mapId: string): void {
    const weather = this.weatherAt(mapId) ?? this.weatherAt('meadow')
    this.sceneFlags = { '@night': this.night(), '@rain': weather === 'rain' || weather === 'storm' }
  }

  itemCount(id: string): number {
    return this.bag[id] ?? 0
  }

  addItem(id: string, n = 1): void {
    this.bag[id] = this.itemCount(id) + n
  }

  /** 消耗 1 个道具，数量不足返回 false */
  consumeItem(id: string): boolean {
    if (this.itemCount(id) <= 0) return false
    this.bag[id] -= 1
    if (this.bag[id] <= 0) delete this.bag[id]
    return true
  }

  markSeen(speciesId: string): void {
    if (!this.dex.seen.includes(speciesId)) this.dex.seen.push(speciesId)
  }

  markCaught(speciesId: string): void {
    this.markSeen(speciesId)
    if (!this.dex.caught.includes(speciesId)) this.dex.caught.push(speciesId)
  }

  /** 把指定伙伴设为首发 */
  setLead(index: number): void {
    if (index <= 0 || index >= this.party.length) return
    const [c] = this.party.splice(index, 1)
    this.party.unshift(c)
  }

  /**
   * 新伙伴入队；队伍已满时送往寄存所
   * @author zjh
   * @date 2026-10-14
   */
  addCreature(c: CreatureInstance): 'party' | 'storage' {
    if (this.party.length < PARTY_LIMIT) {
      this.party.push(c)
      return 'party'
    }
    this.storage.push(c)
    return 'storage'
  }

  /** 当前天数 */
  day(): number {
    return dayOf(this.world.totalSteps)
  }

  night(): boolean {
    return isNight(this.world.totalSteps)
  }

  /** 指定地图天气（室内 / 城镇为 null） */
  weatherAt(mapId: string): Weather | null {
    return weatherOf(this.world, mapId)
  }

  /** 已解锁的户外地图 */
  unlockedOutdoorMaps(): string[] {
    return OUTDOOR_MAPS.filter((m) => !m.requireFlag || this.getFlag(m.requireFlag)).map((m) => m.mapId)
  }
}

/** 单例：场景间共享 */
export const GameState = new GameStateStore()
