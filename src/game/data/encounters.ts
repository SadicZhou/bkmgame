/**
 * 各地图遭遇表（见 docs/planning/04-遭遇系统.md 第 6 节）
 * @author zjh
 * @date 2026-10-14
 */

/** 单条遭遇条目 */
export interface EncounterEntry {
  speciesId: string
  weight: number
  minLv: number
  maxLv: number
  /** 仅昼 / 仅夜；不填为不限 */
  time?: 'day' | 'night'
}

/** 地图遭遇配置 */
export interface EncounterTable {
  /** 遭遇地形每步基础概率 */
  baseRate: number
  grass: EncounterEntry[]
  /** 冰面：每步固定概率 ICE_RATE */
  ice?: EncounterEntry[]
  /** 旧钓竿 */
  rod?: EncounterEntry[]
  /** 好钓竿 */
  goodRod?: EncounterEntry[]
}

/** 遭遇来源 */
export type EncounterSource = 'grass' | 'ice' | 'rod' | 'goodRod'

/** 冰面每步遇敌概率 */
export const ICE_RATE = 0.1

/**
 * 取出某来源的条目，换成以 grass 为主表的视图，便于复用 Encounter 的抽取逻辑
 * @author zjh
 * @date 2026-10-15
 */
export function tableFor(table: EncounterTable, source: EncounterSource): EncounterTable | null {
  if (source === 'grass') return table
  const entries = table[source]
  return entries?.length ? { baseRate: source === 'ice' ? ICE_RATE : 1, grass: entries } : null
}

export const ENCOUNTERS: Record<string, EncounterTable> = {
  meadow: {
    baseRate: 0.12,
    grass: [
      { speciesId: 'puffmouse', weight: 35, minLv: 2, maxLv: 4 },
      { speciesId: 'leafkit', weight: 25, minLv: 2, maxLv: 4 },
      { speciesId: 'skylark', weight: 20, minLv: 2, maxLv: 4 },
      { speciesId: 'rockmite', weight: 15, minLv: 2, maxLv: 3 },
      { speciesId: 'tideback', weight: 12, minLv: 2, maxLv: 3 },
      { speciesId: 'sproutcap', weight: 10, minLv: 3, maxLv: 5 },
    ],
  },
  pass: {
    baseRate: 0.12,
    grass: [
      { speciesId: 'rockmite', weight: 30, minLv: 8, maxLv: 10 },
      { speciesId: 'pebblepup', weight: 20, minLv: 8, maxLv: 10 },
      { speciesId: 'wickling', weight: 18, minLv: 8, maxLv: 11 },
      { speciesId: 'mistnewt', weight: 15, minLv: 8, maxLv: 10 },
      { speciesId: 'cindermoth', weight: 20, minLv: 9, maxLv: 11, time: 'night' },
    ],
  },
  lake: {
    baseRate: 0.12,
    grass: [
      { speciesId: 'skylark', weight: 30, minLv: 13, maxLv: 15 },
      { speciesId: 'mistnewt', weight: 20, minLv: 13, maxLv: 16 },
      { speciesId: 'tideback', weight: 15, minLv: 14, maxLv: 16 },
    ],
    ice: [{ speciesId: 'frostgoose', weight: 100, minLv: 14, maxLv: 17 }],
    rod: [
      { speciesId: 'bubblefin', weight: 80, minLv: 12, maxLv: 15 },
      { speciesId: 'mistnewt', weight: 20, minLv: 13, maxLv: 15 },
    ],
    goodRod: [
      { speciesId: 'coralfin', weight: 60, minLv: 16, maxLv: 18 },
      { speciesId: 'wavefin', weight: 30, minLv: 17, maxLv: 19 },
      { speciesId: 'tideback', weight: 10, minLv: 18, maxLv: 20 },
    ],
  },
}
