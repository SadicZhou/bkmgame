/**
 * 运行时全局游戏状态（跨场景共享）：队伍、位置、旗标、背包、金币、图鉴
 * @author zjh
 * @date 2026-10-14
 */

import { createCreature, type CreatureInstance } from '../data/creatures'
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

export interface PendingBattle {
  kind: BattleKind
  /** 对手队伍（野生战只有 1 只） */
  enemies: CreatureInstance[]
  trainerName?: string
  flagOnWin?: string
  /** BOSS 战胜利后进入结局 */
  isBoss?: boolean
  returnMapId: string
  returnX: number
  returnY: number
}

export type Facing = 'up' | 'down' | 'left' | 'right'

/** 全灭后的复活点 */
export const RESPAWN = { mapId: 'cabin', x: 4, y: 5 }

class GameStateStore {
  party: CreatureInstance[] = []
  mapId = 'town'
  playerX = 8
  playerY = 8
  facing: Facing = 'down'
  flags: GameFlags = {}
  playSeconds = 0
  coins = 100
  bag: Record<string, number> = {}
  dex: DexRecord = { seen: [], caught: [] }
  pendingBattle: PendingBattle | null = null
  startedAt = Date.now()

  /**
   * 新开局：焰角兔作为初始伙伴，附赠少量道具
   * @author zjh
   * @date 2026-10-14
   */
  newGame(): void {
    this.party = [createCreature('flarehorn', 5)]
    this.mapId = 'town'
    this.playerX = 8
    this.playerY = 8
    this.facing = 'down'
    this.flags = {}
    this.playSeconds = 0
    this.coins = 100
    this.bag = defaultBag()
    this.dex = { seen: ['flarehorn'], caught: ['flarehorn'] }
    this.pendingBattle = null
    this.startedAt = Date.now()
  }

  tryLoad(): boolean {
    const data = loadGame()
    if (!data) return false
    this.applySave(data)
    return true
  }

  applySave(data: SaveData): void {
    this.party = data.party.map(normalizeCreature)
    this.mapId = data.mapId
    this.playerX = data.playerX
    this.playerY = data.playerY
    this.facing = 'down'
    this.flags = { ...data.flags }
    this.playSeconds = data.playSeconds
    this.coins = data.coins
    this.bag = { ...data.bag }
    this.dex = { seen: [...data.dex.seen], caught: [...data.dex.caught] }
    this.pendingBattle = null
    this.startedAt = Date.now()
  }

  /** 累计游玩秒数（含本次会话未落盘部分） */
  totalSeconds(): number {
    return this.playSeconds + Math.floor((Date.now() - this.startedAt) / 1000)
  }

  persist(): void {
    this.playSeconds = this.totalSeconds()
    this.startedAt = Date.now()
    saveGame({
      mapId: this.mapId,
      playerX: this.playerX,
      playerY: this.playerY,
      party: this.party.map((c) => ({ ...c, moves: c.moves ? [...c.moves] : undefined })),
      flags: { ...this.flags },
      playSeconds: this.playSeconds,
      coins: this.coins,
      bag: { ...this.bag },
      dex: { seen: [...this.dex.seen], caught: [...this.dex.caught] },
    })
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
}

/** 单例：场景间共享 */
export const GameState = new GameStateStore()
