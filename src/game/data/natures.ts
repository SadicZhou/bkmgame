/**
 * 九种性格：一项能力 +10%、另一项 −10%（平和无修正）
 * @author zjh
 * @date 2026-10-14
 */

export type StatKey = 'hp' | 'atk' | 'def' | 'spd'

export type NatureId =
  | 'calm'
  | 'brave'
  | 'stubborn'
  | 'steady'
  | 'naughty'
  | 'hasty'
  | 'lively'
  | 'tough'
  | 'gentle'

export interface NatureDef {
  id: NatureId
  name: string
  up?: StatKey
  down?: StatKey
  /** 亲密度成长倍率 */
  friendRate: number
  /** 羁绊台词语气示例 */
  line: string
}

export const STAT_LABEL: Record<StatKey, string> = { hp: 'HP', atk: '攻', def: '防', spd: '速' }

export const NATURES: Record<NatureId, NatureDef> = {
  calm: { id: 'calm', name: '平和', friendRate: 1, line: '我们出发吧。' },
  brave: { id: 'brave', name: '勇敢', up: 'atk', down: 'spd', friendRate: 1, line: '冲在最前面的是我！' },
  stubborn: { id: 'stubborn', name: '固执', up: 'atk', down: 'def', friendRate: 0.9, line: '哼，我自己也行。' },
  steady: { id: 'steady', name: '稳重', up: 'def', down: 'spd', friendRate: 1.1, line: '别急，慢慢来。' },
  naughty: { id: 'naughty', name: '淘气', up: 'def', down: 'atk', friendRate: 1.1, line: '嘿嘿，抓不到我～' },
  hasty: { id: 'hasty', name: '急躁', up: 'spd', down: 'def', friendRate: 0.9, line: '快点快点！' },
  lively: { id: 'lively', name: '活泼', up: 'spd', down: 'atk', friendRate: 1.2, line: '今天也超开心！' },
  tough: { id: 'tough', name: '坚韧', up: 'hp', down: 'spd', friendRate: 1, line: '这点伤不算什么。' },
  gentle: { id: 'gentle', name: '温柔', up: 'hp', down: 'atk', friendRate: 1.2, line: '你累了吗？靠着我吧。' },
}

export const NATURE_IDS = Object.keys(NATURES) as NatureId[]

/**
 * 性格对某项能力的倍率
 * @author zjh
 * @date 2026-10-14
 */
export function natureMultiplier(nature: NatureId, stat: StatKey): number {
  const n = NATURES[nature] ?? NATURES.calm
  if (n.up === stat) return 1.1
  if (n.down === stat) return 0.9
  return 1
}

/** 性格简述，如「活泼（速↑ 攻↓）」 */
export function natureLabel(nature: NatureId): string {
  const n = NATURES[nature] ?? NATURES.calm
  if (!n.up || !n.down) return `${n.name}（无修正）`
  return `${n.name}（${STAT_LABEL[n.up]}↑ ${STAT_LABEL[n.down]}↓）`
}
