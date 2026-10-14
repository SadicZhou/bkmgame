/**
 * 道具数据：回复类、复活类、安抚（收服）类
 * @author zjh
 * @date 2026-10-14
 */

export type ItemKind = 'heal' | 'revive' | 'catch'

export interface ItemDef {
  id: string
  name: string
  kind: ItemKind
  /** heal：回复 HP 数值；revive：复活后 HP 比例；catch：收服倍率 */
  value: number
  price: number
  desc: string
}

export const ITEMS: Record<string, ItemDef> = {
  potion: {
    id: 'potion',
    name: '伤药',
    kind: 'heal',
    value: 25,
    price: 30,
    desc: '回复 1 只伙伴 25 点 HP。',
  },
  super_potion: {
    id: 'super_potion',
    name: '好伤药',
    kind: 'heal',
    value: 60,
    price: 80,
    desc: '回复 1 只伙伴 60 点 HP。',
  },
  revive: {
    id: 'revive',
    name: '复苏草',
    kind: 'revive',
    value: 0.5,
    price: 120,
    desc: '让倒下的伙伴恢复一半 HP。',
  },
  soothe_berry: {
    id: 'soothe_berry',
    name: '安抚果',
    kind: 'catch',
    value: 1,
    price: 50,
    desc: '野生战使用，安抚对手使其加入队伍。对手 HP 越低越容易成功。',
  },
  honey_berry: {
    id: 'honey_berry',
    name: '蜜安抚果',
    kind: 'catch',
    value: 1.8,
    price: 150,
    desc: '更香甜的安抚果，成功率约为普通安抚果的 1.8 倍。',
  },
}

/** 商店货架顺序 */
export const SHOP_STOCK: string[] = ['potion', 'super_potion', 'revive', 'soothe_berry', 'honey_berry']

/** 背包展示顺序 */
export const ITEM_ORDER: string[] = SHOP_STOCK

/** 队伍上限 */
export const PARTY_LIMIT = 6

/**
 * 计算安抚成功率：对手 HP 越低越高
 * @author zjh
 * @date 2026-10-14
 */
export function catchChance(hp: number, maxHp: number, itemRate: number): number {
  const ratio = maxHp > 0 ? hp / maxHp : 1
  const base = (1 - ratio * 0.75) * 0.6 * itemRate + 0.1
  return Math.max(0.05, Math.min(0.95, base))
}
