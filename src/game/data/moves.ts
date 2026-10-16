/**
 * 技能表（见 docs/planning/06-技能系统.md）
 * v2 已有的 17 个技能 id 与威力保持不变。
 * @author zjh
 * @date 2026-10-14
 */

import type { ElementType } from './types'

export type MoveCategory = 'attack' | 'status'
export type StatusId = 'burn' | 'paralyze' | 'freeze'
export type VolatileId = 'seeded' | 'confused'
export type StageKey = 'atk' | 'def' | 'spd'

/** 需要专门结算逻辑的技能标记 */
export type MoveSpecial =
  | 'aqua_ring'
  | 'frost_wall'
  | 'sandstorm'
  | 'defog'
  | 'high_crit'
  | 'snow_sure_hit'
  | 'friendship_power'
  | 'bear_hug'

/** 技能附加效果 */
export interface MoveEffect {
  /** 触发概率 0~100 */
  chance: number
  target: 'self' | 'foe'
  status?: StatusId
  volatile?: VolatileId
  stages?: Partial<Record<StageKey, number>>
  /** 回复使用者最大 HP 的比例 */
  healRatio?: number
  /** 回复造成伤害的比例 */
  drainRatio?: number
  /** 反伤：造成伤害的比例 */
  recoilRatio?: number
}

export interface MoveDef {
  id: string
  name: string
  type: ElementType
  category: MoveCategory
  power: number
  /** 0~100；-1 表示必中 */
  accuracy: number
  pp: number
  priority: -1 | 0 | 1
  contact: boolean
  effect?: MoveEffect
  special?: MoveSpecial
  /** 双打时同时打到对手另一只，威力按本次伤害的 75% */
  spread?: boolean
  desc: string
}

/** 精简构造：攻击技 */
function atk(
  id: string,
  name: string,
  type: ElementType,
  power: number,
  accuracy: number,
  pp: number,
  desc: string,
  extra: Partial<MoveDef> = {},
): MoveDef {
  return { id, name, type, category: 'attack', power, accuracy, pp, priority: 0, contact: false, desc, ...extra }
}

/** 精简构造：变化技 */
function sta(
  id: string,
  name: string,
  type: ElementType,
  accuracy: number,
  pp: number,
  desc: string,
  extra: Partial<MoveDef> = {},
): MoveDef {
  return { id, name, type, category: 'status', power: 0, accuracy, pp, priority: 0, contact: false, desc, ...extra }
}

const LIST: MoveDef[] = [
  // ── 常 ──
  atk('tackle', '冲撞', 'normal', 14, 100, 35, '用身体撞向对手。', { contact: true }),
  atk('quick_jab', '快攻', 'normal', 12, 100, 30, '必定先手攻击。', { contact: true, priority: 1 }),
  sta('growl', '低吼', 'normal', 100, 30, '降低对手攻击 1 阶。', { effect: { chance: 100, target: 'foe', stages: { atk: -1 } } }),
  sta('rally', '鼓舞', 'normal', -1, 15, '提升自身攻击 2 阶。', { effect: { chance: 100, target: 'self', stages: { atk: 2 } } }),
  atk('body_slam', '猛撞', 'normal', 30, 100, 15, '30% 令对手麻痹。', { contact: true, effect: { chance: 30, target: 'foe', status: 'paralyze' } }),
  atk('double_edge', '舍身冲', 'normal', 42, 100, 10, '自身承受伤害 1/4 的反伤。', { contact: true, effect: { chance: 100, target: 'self', recoilRatio: 0.25 } }),

  // ── 焰 ──
  atk('spark_kick', '火星踢', 'flame', 18, 100, 25, '带着火星的踢击。', { contact: true }),
  atk('ember_spit', '余烬唾', 'flame', 22, 100, 25, '10% 令对手灼烧。', { effect: { chance: 10, target: 'foe', status: 'burn' } }),
  sta('wisp_fire', '鬼火', 'flame', 85, 15, '令对手灼烧。', { effect: { chance: 100, target: 'foe', status: 'burn' } }),
  atk('flare_dash', '焰流冲', 'flame', 30, 95, 15, '裹着火焰冲撞。', { contact: true }),
  atk('blaze_burst', '炽焰爆', 'flame', 38, 90, 10, '10% 令对手灼烧。', { effect: { chance: 10, target: 'foe', status: 'burn' } }),
  atk('dawn_flare', '晨曦烈焰', 'flame', 45, 90, 5, '30% 令对手灼烧。曦焰凤专属。', { effect: { chance: 30, target: 'foe', status: 'burn' } }),

  // ── 潮 ──
  atk('splash', '水花拍', 'tide', 16, 100, 35, '拍起水花攻击。'),
  atk('bubble_roll', '泡泡滚', 'tide', 24, 100, 25, '10% 降低对手速度 1 阶。', { effect: { chance: 10, target: 'foe', stages: { spd: -1 } } }),
  sta('aqua_ring', '潮愈', 'tide', -1, 10, '5 回合内每回合回复 1/16 HP。', { special: 'aqua_ring' }),
  atk('tide_crash', '潮涌撞', 'tide', 30, 95, 15, '乘着浪头撞击。', { contact: true }),
  atk('torrent', '激流', 'tide', 38, 90, 10, '喷出湍急的水流。'),
  atk('abyss_roar', '深海咆哮', 'tide', 45, 85, 5, '降低对手防御 1 阶。沧澜鲸专属。', { effect: { chance: 100, target: 'foe', stages: { def: -1 } } }),

  // ── 叶 ──
  atk('leaf_tap', '叶拍', 'leaf', 17, 100, 35, '用叶片拍打。', { contact: true }),
  atk('vine_snap', '藤响', 'leaf', 23, 100, 25, '甩动藤蔓抽打。', { contact: true }),
  sta('leech_seed', '寄生种', 'leaf', 90, 10, '令对手寄生，每回合被吸取 1/8 HP。', { effect: { chance: 100, target: 'foe', volatile: 'seeded' } }),
  sta('synthesis', '光合', 'leaf', -1, 5, '回复 50% HP（晴天 66%）。', { effect: { chance: 100, target: 'self', healRatio: 0.5 } }),
  atk('petal_storm', '花瓣风暴', 'leaf', 30, 95, 15, '卷起花瓣攻击。'),
  atk('grove_beam', '林冠光', 'leaf', 38, 90, 10, '汇聚林间光芒射出。'),
  atk('bell_chorus', '林铃合鸣', 'leaf', 45, 90, 5, '20% 降低对手攻击 1 阶。林语鹿专属。', { effect: { chance: 20, target: 'foe', stages: { atk: -1 } } }),

  // ── 岩 ──
  atk('pebble', '碎石弹', 'stone', 19, 100, 30, '弹出小石子。'),
  atk('shell_bash', '甲撞', 'stone', 25, 100, 20, '用硬壳撞击。', { contact: true }),
  sta('iron_wall', '铁壁', 'stone', -1, 15, '提升自身防御 2 阶。', { effect: { chance: 100, target: 'self', stages: { def: 2 } } }),
  sta('sandstorm', '沙暴', 'stone', -1, 5, '召唤 5 回合沙暴。', { special: 'sandstorm' }),
  atk('rock_slide', '岩崩', 'stone', 30, 90, 15, '20% 降低对手速度 1 阶。', { effect: { chance: 20, target: 'foe', stages: { spd: -1 } } }),
  atk('quake', '震地', 'stone', 38, 100, 10, '撼动大地。'),

  // ── 雷 ──
  atk('spark', '电火花', 'volt', 16, 100, 30, '10% 令对手麻痹。', { contact: true, effect: { chance: 10, target: 'foe', status: 'paralyze' } }),
  atk('volt_dash', '电光一闪', 'volt', 14, 100, 30, '必定先手攻击。', { contact: true, priority: 1 }),
  sta('thunder_wave', '电磁波', 'volt', 90, 15, '令对手麻痹。', { effect: { chance: 100, target: 'foe', status: 'paralyze' } }),
  atk('volt_fang', '雷牙', 'volt', 26, 95, 15, '10% 令对手麻痹。', { contact: true, effect: { chance: 10, target: 'foe', status: 'paralyze' } }),
  atk('thunderbolt', '雷霆', 'volt', 36, 100, 10, '10% 令对手麻痹。', { effect: { chance: 10, target: 'foe', status: 'paralyze' } }),
  atk('thunder_clap', '雷鸣破', 'volt', 45, 80, 5, '30% 令对手麻痹。雷鸣隼专属。', { effect: { chance: 30, target: 'foe', status: 'paralyze' } }),

  // ── 风 ──
  atk('gust', '疾风', 'gale', 16, 100, 35, '扇起一阵风。'),
  atk('aerial', '燕返', 'gale', 24, -1, 20, '必定命中。', { contact: true }),
  atk('feather_blade', '羽刃', 'gale', 28, 95, 15, '容易会心。', { contact: true, special: 'high_crit' }),
  sta('tailwind', '顺风', 'gale', -1, 10, '提升自身速度 2 阶。', { effect: { chance: 100, target: 'self', stages: { spd: 2 } } }),
  sta('defog', '吹散', 'gale', -1, 15, '清除对手的能力提升与场上天气。', { special: 'defog' }),
  atk('hurricane', '暴风', 'gale', 40, 75, 10, '20% 令对手混乱。', { effect: { chance: 20, target: 'foe', volatile: 'confused' } }),
  atk('tail_gust', '尾风', 'gale', 30, 95, 15, '风从身后推来。'),

  // ── 霜 ──
  atk('ice_shard', '冰粒', 'frost', 14, 100, 30, '必定先手攻击。', { priority: 1 }),
  atk('frost_breath', '冰息', 'frost', 22, 95, 25, '10% 令对手冻结。', { effect: { chance: 10, target: 'foe', status: 'freeze' } }),
  sta('cold_mist', '冷雾', 'frost', 95, 15, '降低对手速度 2 阶。', { effect: { chance: 100, target: 'foe', stages: { spd: -2 } } }),
  sta('frost_wall', '霜壁', 'frost', -1, 10, '3 回合内受到伤害减半。', { special: 'frost_wall' }),
  atk('icicle', '冰柱', 'frost', 30, 95, 15, '掷出冰柱。', { contact: true }),
  atk('blizzard', '暴风雪', 'frost', 40, 75, 5, '10% 令对手冻结；下雪时必中。双打时会卷到另一只对手。', { special: 'snow_sure_hit', spread: true, effect: { chance: 10, target: 'foe', status: 'freeze' } }),
  atk('bell_freeze', '铃冻', 'frost', 32, 100, 10, '30% 令对手冻结。霜铃鹤专属。', { effect: { chance: 30, target: 'foe', status: 'freeze' } }),

  // ── 灵 ──
  atk('glim_shot', '微光弹', 'spirit', 18, 100, 30, '射出一团微光。'),
  sta('dazzle', '幻光', 'spirit', 100, 15, '令对手混乱。', { effect: { chance: 100, target: 'foe', volatile: 'confused' } }),
  sta('meditate', '冥想', 'spirit', -1, 15, '提升自身攻击、防御各 1 阶。', { effect: { chance: 100, target: 'self', stages: { atk: 1, def: 1 } } }),
  atk('soul_drain', '灵魂吸取', 'spirit', 26, 100, 15, '回复造成伤害的 50%。', { effect: { chance: 100, target: 'self', drainRatio: 0.5 } }),
  atk('spirit_burst', '灵爆', 'spirit', 38, 90, 10, '10% 令对手混乱。', { effect: { chance: 10, target: 'foe', volatile: 'confused' } }),
  atk('heart_echo', '心火共鸣', 'spirit', 45, 100, 5, '威力随亲密度在 30～55 之间变化。', { special: 'friendship_power' }),
  sta('bear_hug', '熊抱', 'normal', 100, 10, '抱住对手，让对方接下来无法换人。', { special: 'bear_hug' }),

  // ── 唯一精灵专属 ──
  atk('falling_star', '坠星', 'normal', 40, -1, 5, '必定命中。坠星貂专属。'),
  atk('thousand_bloom', '千花绽', 'leaf', 36, 100, 10, '回复造成伤害的 25%。花冠鹿专属。', { effect: { chance: 100, target: 'self', drainRatio: 0.25 } }),
  atk('lava_tide', '熔岩潮', 'flame', 42, 100, 5, '使用后自身速度 −1。熔晶龟专属。', { effect: { chance: 100, target: 'self', stages: { spd: -1 } } }),

  // ── 挣扎：PP 全部耗尽时自动使用 ──
  atk('struggle', '挣扎', 'normal', 20, -1, 1, 'PP 耗尽时的最后一搏，自身损失 1/4 最大 HP。', { contact: true }),
]

export const MOVES: Record<string, MoveDef> = Object.fromEntries(LIST.map((m) => [m.id, m]))

/** 挣扎技能 id */
export const STRUGGLE_ID = 'struggle'
