/**
 * 九种属性与克制表（见 docs/planning/02-属性克制.md）
 * @author zjh
 * @date 2026-10-14
 */

export type ElementType =
  | 'normal'
  | 'flame'
  | 'tide'
  | 'leaf'
  | 'stone'
  | 'volt'
  | 'gale'
  | 'frost'
  | 'spirit'

export const ALL_TYPES: ElementType[] = [
  'normal',
  'flame',
  'tide',
  'leaf',
  'stone',
  'volt',
  'gale',
  'frost',
  'spirit',
]

export const TYPE_LABEL: Record<ElementType, string> = {
  normal: '常',
  flame: '焰',
  tide: '潮',
  leaf: '叶',
  stone: '岩',
  volt: '雷',
  gale: '风',
  frost: '霜',
  spirit: '灵',
}

/** 属性主题色（UI 标签用） */
export const TYPE_COLOR: Record<ElementType, string> = {
  normal: '#d8c8b0',
  flame: '#ff8f6b',
  tide: '#6eb8e8',
  leaf: '#7bc96b',
  stone: '#c4a484',
  volt: '#f5d442',
  gale: '#b8e0f0',
  frost: '#c8e8ff',
  spirit: '#c8a8f0',
}

/** 攻方 → 防方倍率；未列出即 1.0。不设免疫，最低 0.5 */
const CHART: Record<ElementType, Partial<Record<ElementType, number>>> = {
  normal: { stone: 0.75, spirit: 0.5 },
  flame: { flame: 0.75, tide: 0.75, leaf: 1.5, stone: 0.75, frost: 1.5 },
  tide: { flame: 1.5, tide: 0.75, leaf: 0.75, stone: 1.5, frost: 0.75 },
  leaf: { flame: 0.75, tide: 1.5, leaf: 0.75, stone: 1.5, gale: 0.75 },
  stone: { flame: 1.5, tide: 0.75, leaf: 0.75, volt: 1.5, frost: 1.5 },
  volt: { tide: 1.5, leaf: 0.75, stone: 0.5, volt: 0.75, gale: 1.5 },
  gale: { leaf: 1.5, stone: 0.75, volt: 0.75, spirit: 1.5 },
  frost: { flame: 0.75, tide: 0.75, leaf: 1.5, gale: 1.5, frost: 0.75 },
  spirit: { normal: 1.5, flame: 0.75, spirit: 1.5 },
}

/**
 * 属性克制倍率
 * @author zjh
 * @date 2026-10-14
 */
export function typeMultiplier(atk: ElementType, def: ElementType): number {
  return CHART[atk]?.[def] ?? 1
}
