/**
 * 运行时全局游戏状态（跨场景共享）
 * @author zjh
 * @date 2026-10-14
 */

import {
  createCreature,
  type CreatureInstance,
  syncUidSeq,
} from '../data/creatures'
import type { BattleKind } from '../systems/BattleLogic'
import {
  clearSave,
  hasSave,
  loadGame,
  saveGame,
  type GameFlags,
  type SaveData,
} from '../systems/SaveSystem'
import { healParty } from '../systems/BattleLogic'

export interface PendingBattle {
  kind: BattleKind
  enemy: CreatureInstance
  trainerName?: string
  flagOnWin?: string
  returnMapId: string
  returnX: number
  returnY: number
}

class GameStateStore {
  party: CreatureInstance[] = []
  mapId = 'town'
  playerX = 8
  playerY = 8
  flags: GameFlags = {}
  playSeconds = 0
  pendingBattle: PendingBattle | null = null
  startedAt = Date.now()

  /**
   * 新开局：焰角兔作为初始伙伴
   * @author zjh
   * @date 2026-10-14
   */
  newGame(): void {
    this.party = [createCreature('flarehorn', 5)]
    this.mapId = 'town'
    this.playerX = 8
    this.playerY = 8
    this.flags = {}
    this.playSeconds = 0
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
    this.party = data.party.map((c) => ({ ...c }))
    syncUidSeq(this.party)
    this.mapId = data.mapId
    this.playerX = data.playerX
    this.playerY = data.playerY
    this.flags = { ...data.flags }
    this.playSeconds = data.playSeconds
    this.pendingBattle = null
    this.startedAt = Date.now()
  }

  persist(): void {
    const elapsed = Math.floor((Date.now() - this.startedAt) / 1000)
    this.playSeconds += elapsed
    this.startedAt = Date.now()
    saveGame({
      mapId: this.mapId,
      playerX: this.playerX,
      playerY: this.playerY,
      party: this.party.map((c) => ({ ...c })),
      flags: { ...this.flags },
      playSeconds: this.playSeconds,
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
}

/** 单例：场景间共享 */
export const GameState = new GameStateStore()
