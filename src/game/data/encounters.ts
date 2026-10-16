/**
 * 各地图遭遇表（见 docs/planning/04-遭遇系统.md 第 6 节）
 * @author zjh
 * @date 2026-10-14
 */

import type { Weather } from './weather'

/** 单条遭遇条目 */
export interface EncounterEntry {
  speciesId: string
  weight: number
  minLv: number
  maxLv: number
  /** 仅昼 / 仅夜；不填为不限 */
  time?: 'day' | 'night'
  /** 只在这些天气出现；不填为不限 */
  weather?: Weather[]
  /** 需要该剧情旗标才会出现 */
  requireFlag?: string
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

/** 云阶各岛共用的风系遭遇 */
function cloudGrass(): EncounterTable {
  return {
    baseRate: 0.12,
    grass: [
      { speciesId: 'skyfinch', weight: 30, minLv: 34, maxLv: 37 },
      { speciesId: 'cloudsheep', weight: 25, minLv: 34, maxLv: 36, weather: ['sunny'] },
      { speciesId: 'whirlbat', weight: 20, minLv: 34, maxLv: 37, time: 'night' },
      { speciesId: 'chimekite', weight: 15, minLv: 36, maxLv: 39 },
      { speciesId: 'voltbadger', weight: 10, minLv: 36, maxLv: 39, weather: ['storm'] },
    ],
  }
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
    ice: [
      { speciesId: 'frostgoose', weight: 100, minLv: 14, maxLv: 17 },
      { speciesId: 'icecrown', weight: 8, minLv: 22, maxLv: 24, time: 'night', requireFlag: 'whale_beaten' },
    ],
    rod: [
      { speciesId: 'bubblefin', weight: 80, minLv: 12, maxLv: 15 },
      { speciesId: 'mistnewt', weight: 20, minLv: 13, maxLv: 15 },
      { speciesId: 'lanternray', weight: 6, minLv: 16, maxLv: 18, weather: ['fog'] },
    ],
    goodRod: [
      { speciesId: 'coralfin', weight: 60, minLv: 16, maxLv: 18 },
      { speciesId: 'wavefin', weight: 30, minLv: 17, maxLv: 19 },
      { speciesId: 'tideback', weight: 10, minLv: 18, maxLv: 20 },
      { speciesId: 'lanternray', weight: 12, minLv: 18, maxLv: 21, weather: ['fog'] },
    ],
  },
  forest: {
    baseRate: 0.12,
    grass: [
      { speciesId: 'bushtail', weight: 30, minLv: 18, maxLv: 21 },
      { speciesId: 'sproutcap', weight: 30, minLv: 18, maxLv: 20 },
      { speciesId: 'parashroom', weight: 15, minLv: 21, maxLv: 23 },
      { speciesId: 'leafkit', weight: 12, minLv: 18, maxLv: 21 },
      { speciesId: 'whirlbat', weight: 20, minLv: 19, maxLv: 22, time: 'night' },
      { speciesId: 'wisp', weight: 4, minLv: 20, maxLv: 22, time: 'night' },
      { speciesId: 'echofrog', weight: 10, minLv: 19, maxLv: 22, weather: ['rain'] },
    ],
  },
  canyon: {
    baseRate: 0.12,
    grass: [
      { speciesId: 'bouldermite', weight: 30, minLv: 22, maxLv: 25 },
      { speciesId: 'pebblepup', weight: 25, minLv: 22, maxLv: 25 },
      { speciesId: 'drillmole', weight: 20, minLv: 23, maxLv: 26 },
      { speciesId: 'crystalbat', weight: 15, minLv: 24, maxLv: 27, time: 'night' },
      { speciesId: 'cragdog', weight: 10, minLv: 25, maxLv: 27 },
      { speciesId: 'amberling', weight: 3, minLv: 25, maxLv: 27, weather: ['sunny'] },
    ],
  },
  dunes: {
    baseRate: 0.13,
    grass: [
      { speciesId: 'sparkpuff', weight: 30, minLv: 26, maxLv: 29 },
      { speciesId: 'pebblepup', weight: 18, minLv: 26, maxLv: 28 },
      { speciesId: 'bouldermite', weight: 16, minLv: 26, maxLv: 29 },
      { speciesId: 'voltbadger', weight: 12, minLv: 28, maxLv: 31 },
      { speciesId: 'emberwing', weight: 10, minLv: 27, maxLv: 30, time: 'night' },
      { speciesId: 'dunefin', weight: 10, minLv: 27, maxLv: 30, weather: ['sand'] },
      { speciesId: 'starcat', weight: 3, minLv: 28, maxLv: 31, time: 'night' },
    ],
  },
  frostpeak: {
    baseRate: 0.12,
    grass: [
      { speciesId: 'frostgoose', weight: 30, minLv: 30, maxLv: 33 },
      { speciesId: 'skyfinch', weight: 25, minLv: 30, maxLv: 33 },
      { speciesId: 'snowbun', weight: 20, minLv: 30, maxLv: 32, weather: ['snow'] },
      { speciesId: 'cragdog', weight: 15, minLv: 31, maxLv: 34 },
      { speciesId: 'icecrown', weight: 12, minLv: 32, maxLv: 35 },
      { speciesId: 'frostfox', weight: 3, minLv: 33, maxLv: 35, time: 'night', weather: ['snow'] },
    ],
  },
  cloudstart: cloudGrass(),
  cloudfeather: cloudGrass(),
  cloudmill: cloudGrass(),
  cloudbridge: cloudGrass(),
}
