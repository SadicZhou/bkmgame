/**
 * localStorage 存档读写（v2：新增背包 / 金币 / 图鉴；兼容读取 v1）
 * @author zjh
 * @date 2026-10-14
 */

import type { CreatureInstance } from '../data/creatures'
import { syncUidSeq } from '../data/creatures'

export const SAVE_KEY = 'embertrail-v2-save'
/** 旧版存档键，读取时自动迁移 */
const LEGACY_SAVE_KEY = 'embertrail-v1-save'

export interface GameFlags {
  [key: string]: boolean | number | string
}

export interface DexRecord {
  seen: string[]
  caught: string[]
}

export interface SaveData {
  version: 2
  mapId: string
  playerX: number
  playerY: number
  party: CreatureInstance[]
  flags: GameFlags
  playSeconds: number
  savedAt: string
  coins: number
  bag: Record<string, number>
  dex: DexRecord
}

/** v1 存档结构（仅用于迁移） */
interface LegacySaveV1 {
  version: 1
  mapId: string
  playerX: number
  playerY: number
  party: CreatureInstance[]
  flags: GameFlags
  playSeconds: number
  savedAt: string
}

/** 新开局默认背包 */
export function defaultBag(): Record<string, number> {
  return { potion: 3, soothe_berry: 3 }
}

/**
 * 写入本地存档
 * @author zjh
 * @date 2026-10-14
 */
export function saveGame(data: Omit<SaveData, 'version' | 'savedAt'>): void {
  const payload: SaveData = {
    version: 2,
    savedAt: new Date().toISOString(),
    ...data,
  }
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
}

/**
 * v1 → v2 迁移：补背包、金币与图鉴（图鉴按当前队伍初始化）
 * @author zjh
 * @date 2026-10-14
 */
function migrateV1(old: LegacySaveV1): SaveData {
  const ids = Array.from(new Set(old.party.map((c) => c.speciesId)))
  return {
    ...old,
    version: 2,
    coins: 100,
    bag: defaultBag(),
    dex: { seen: ids, caught: ids },
  }
}

function isValid(data: { party?: unknown }): boolean {
  return Array.isArray(data.party) && data.party.length > 0
}

export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as SaveData
      if (data.version !== 2 || !isValid(data)) return null
      syncUidSeq(data.party)
      return data
    }
    const legacyRaw = localStorage.getItem(LEGACY_SAVE_KEY)
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as LegacySaveV1
      if (legacy.version !== 1 || !isValid(legacy)) return null
      syncUidSeq(legacy.party)
      return migrateV1(legacy)
    }
    return null
  } catch {
    return null
  }
}

export function hasSave(): boolean {
  return loadGame() !== null
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY)
  localStorage.removeItem(LEGACY_SAVE_KEY)
}
