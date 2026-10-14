/**
 * localStorage 存档读写
 * @author zjh
 * @date 2026-10-14
 */

import type { CreatureInstance } from '../data/creatures'
import { syncUidSeq } from '../data/creatures'

export const SAVE_KEY = 'embertrail-v1-save'

export interface GameFlags {
  [key: string]: boolean | number | string
}

export interface SaveData {
  version: 1
  mapId: string
  playerX: number
  playerY: number
  party: CreatureInstance[]
  flags: GameFlags
  playSeconds: number
  savedAt: string
}

/**
 * 写入本地存档
 * @author zjh
 * @date 2026-10-14
 */
export function saveGame(data: Omit<SaveData, 'version' | 'savedAt'>): void {
  const payload: SaveData = {
    version: 1,
    savedAt: new Date().toISOString(),
    ...data,
  }
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
}

export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as SaveData
    if (data.version !== 1 || !Array.isArray(data.party) || data.party.length === 0) {
      return null
    }
    syncUidSeq(data.party)
    return data
  } catch {
    return null
  }
}

export function hasSave(): boolean {
  return loadGame() !== null
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY)
}
