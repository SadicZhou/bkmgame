/**
 * localStorage 存档读写（v3：寄存所 / 世界时钟 / 异象；兼容迁移 v1、v2）
 * 旧存档键不会被删除，迁移失败时仍可回退。
 * @author zjh
 * @date 2026-10-14
 */

import type { CreatureInstance } from '../data/creatures'
import { syncUidSeq } from '../data/creatures'
import { normalizeCreature } from './Growth'
import { createWorld, type WorldSave } from './WorldClock'

export const SAVE_KEY = 'embertrail-v3-save'
const V2_SAVE_KEY = 'embertrail-v2-save'
const V1_SAVE_KEY = 'embertrail-v1-save'

export interface GameFlags {
  [key: string]: boolean | number | string
}

export interface DexRecord {
  seen: string[]
  caught: string[]
}

export interface SaveData {
  version: 3
  mapId: string
  playerX: number
  playerY: number
  party: CreatureInstance[]
  storage: CreatureInstance[]
  flags: GameFlags
  playSeconds: number
  savedAt: string
  coins: number
  bag: Record<string, number>
  dex: DexRecord
  starterId: string
  world: WorldSave
}

/** 旧版存档（v1 / v2）共有的结构，仅用于迁移 */
interface LegacySave {
  version: 1 | 2
  mapId: string
  playerX: number
  playerY: number
  party: Parameters<typeof normalizeCreature>[0][]
  flags: GameFlags
  playSeconds: number
  savedAt: string
  coins?: number
  bag?: Record<string, number>
  dex?: DexRecord
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
  const payload: SaveData = { version: 3, savedAt: new Date().toISOString(), ...data }
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
}

/**
 * v1/v2 → v3 迁移：伙伴补齐天赋字段，补寄存所与世界状态；视为已选择焰角兔开局
 * @author zjh
 * @date 2026-10-14
 */
export function migrateLegacy(old: LegacySave): SaveData {
  const party = old.party.map(normalizeCreature)
  const ids = Array.from(new Set(party.map((c) => c.speciesId)))
  return {
    version: 3,
    mapId: old.mapId,
    playerX: old.playerX,
    playerY: old.playerY,
    party,
    storage: [],
    flags: { ...old.flags },
    playSeconds: old.playSeconds,
    savedAt: old.savedAt,
    coins: old.coins ?? 100,
    bag: old.bag ?? defaultBag(),
    dex: old.dex ?? { seen: ids, caught: ids },
    starterId: 'flarehorn',
    world: createWorld(),
  }
}

function hasParty(data: { party?: unknown }): boolean {
  return Array.isArray(data.party) && data.party.length > 0
}

/**
 * 读档：优先 v3，否则尝试迁移 v2 / v1
 * @author zjh
 * @date 2026-10-14
 */
export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as SaveData
      if (data.version !== 3 || !hasParty(data)) return null
      data.storage = data.storage ?? []
      data.world = { ...createWorld(), ...data.world }
      syncUidSeq([...data.party, ...data.storage])
      return data
    }
    for (const key of [V2_SAVE_KEY, V1_SAVE_KEY]) {
      const legacyRaw = localStorage.getItem(key)
      if (!legacyRaw) continue
      const legacy = JSON.parse(legacyRaw) as LegacySave
      if (!hasParty(legacy)) continue
      const migrated = migrateLegacy(legacy)
      syncUidSeq(migrated.party)
      return migrated
    }
    return null
  } catch {
    return null
  }
}

export function hasSave(): boolean {
  return loadGame() !== null
}

/** 清除所有版本的存档 */
export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY)
  localStorage.removeItem(V2_SAVE_KEY)
  localStorage.removeItem(V1_SAVE_KEY)
}
