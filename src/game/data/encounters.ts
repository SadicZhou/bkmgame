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
}
