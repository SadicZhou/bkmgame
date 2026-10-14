/**
 * 原创伙伴数据（非宝可梦 IP）
 * @author zjh
 * @date 2026-10-14
 */

export type ElementType = 'flame' | 'tide' | 'leaf' | 'stone'

export interface MoveDef {
  id: string
  name: string
  power: number
  type: ElementType
}

export interface CreatureSpecies {
  id: string
  name: string
  type: ElementType
  /** 色块立绘主色 */
  color: number
  accent: number
  baseHp: number
  baseAtk: number
  baseDef: number
  baseSpd: number
  moves: MoveDef[]
  /** 击败后获得经验基数 */
  expYield: number
}

export interface CreatureInstance {
  uid: string
  speciesId: string
  nickname?: string
  level: number
  exp: number
  hp: number
  maxHp: number
  atk: number
  def: number
  spd: number
}

/** 类型克制：攻方打防方倍率 */
const TYPE_CHART: Record<ElementType, Partial<Record<ElementType, number>>> = {
  flame: { leaf: 1.5, tide: 0.75, stone: 0.75 },
  tide: { flame: 1.5, stone: 1.5, leaf: 0.75 },
  leaf: { tide: 1.5, stone: 1.5, flame: 0.75 },
  stone: { flame: 1.5, leaf: 0.75, tide: 0.75 },
}

export const MOVES: Record<string, MoveDef> = {
  spark_kick: { id: 'spark_kick', name: '火星踢', power: 18, type: 'flame' },
  ember_spit: { id: 'ember_spit', name: '余烬唾', power: 22, type: 'flame' },
  splash: { id: 'splash', name: '水花拍', power: 16, type: 'tide' },
  bubble_roll: { id: 'bubble_roll', name: '泡泡滚', power: 24, type: 'tide' },
  leaf_tap: { id: 'leaf_tap', name: '叶拍', power: 17, type: 'leaf' },
  vine_snap: { id: 'vine_snap', name: '藤响', power: 23, type: 'leaf' },
  pebble: { id: 'pebble', name: '碎石弹', power: 19, type: 'stone' },
  shell_bash: { id: 'shell_bash', name: '甲撞', power: 25, type: 'stone' },
  tackle: { id: 'tackle', name: '冲撞', power: 14, type: 'stone' },
}

export const SPECIES: Record<string, CreatureSpecies> = {
  flarehorn: {
    id: 'flarehorn',
    name: '焰角兔',
    type: 'flame',
    color: 0xff8f6b,
    accent: 0xffc857,
    baseHp: 32,
    baseAtk: 14,
    baseDef: 10,
    baseSpd: 13,
    moves: [MOVES.spark_kick, MOVES.ember_spit, MOVES.tackle],
    expYield: 28,
  },
  tideback: {
    id: 'tideback',
    name: '碧波龟',
    type: 'tide',
    color: 0x6eb8e8,
    accent: 0xa8e6ff,
    baseHp: 38,
    baseAtk: 11,
    baseDef: 15,
    baseSpd: 8,
    moves: [MOVES.splash, MOVES.bubble_roll, MOVES.tackle],
    expYield: 30,
  },
  leafkit: {
    id: 'leafkit',
    name: '翠叶狐',
    type: 'leaf',
    color: 0x7bc96b,
    accent: 0xc8f26b,
    baseHp: 30,
    baseAtk: 13,
    baseDef: 11,
    baseSpd: 15,
    moves: [MOVES.leaf_tap, MOVES.vine_snap, MOVES.tackle],
    expYield: 27,
  },
  rockmite: {
    id: 'rockmite',
    name: '岩甲虫',
    type: 'stone',
    color: 0xc4a484,
    accent: 0xd7ccc8,
    baseHp: 34,
    baseAtk: 15,
    baseDef: 14,
    baseSpd: 7,
    moves: [MOVES.pebble, MOVES.shell_bash, MOVES.tackle],
    expYield: 29,
  },
}

export const TYPE_LABEL: Record<ElementType, string> = {
  flame: '焰',
  tide: '潮',
  leaf: '叶',
  stone: '岩',
}

let uidSeq = 1

/**
 * 按等级生成伙伴实例
 * @author zjh
 * @date 2026-10-14
 */
export function createCreature(speciesId: string, level = 5): CreatureInstance {
  const s = SPECIES[speciesId]
  const scale = 1 + (level - 1) * 0.08
  const maxHp = Math.round(s.baseHp * scale)
  return {
    uid: `c${uidSeq++}-${Date.now().toString(36)}`,
    speciesId,
    level,
    exp: 0,
    hp: maxHp,
    maxHp,
    atk: Math.round(s.baseAtk * scale),
    def: Math.round(s.baseDef * scale),
    spd: Math.round(s.baseSpd * scale),
  }
}

/** 升级所需经验 */
export function expToNext(level: number): number {
  return Math.round(40 + level * 18)
}

/**
 * 战斗结算经验；若升级则回满血并小幅成长
 * @author zjh
 * @date 2026-10-14
 */
export function grantExp(creature: CreatureInstance, amount: number): string[] {
  const logs: string[] = []
  const species = SPECIES[creature.speciesId]
  creature.exp += amount
  logs.push(`${species.name} 获得 ${amount} 经验！`)

  while (creature.exp >= expToNext(creature.level)) {
    creature.exp -= expToNext(creature.level)
    creature.level += 1
    creature.maxHp = Math.round(creature.maxHp * 1.08)
    creature.atk = Math.round(creature.atk * 1.07)
    creature.def = Math.round(creature.def * 1.07)
    creature.spd = Math.round(creature.spd * 1.05)
    creature.hp = creature.maxHp
    logs.push(`${species.name} 升到了 ${creature.level} 级！`)
  }
  return logs
}

export function typeMultiplier(atkType: ElementType, defType: ElementType): number {
  return TYPE_CHART[atkType]?.[defType] ?? 1
}

export function displayName(c: CreatureInstance): string {
  return c.nickname ?? SPECIES[c.speciesId].name
}

/** 从存档恢复时同步序号，避免 uid 碰撞 */
export function syncUidSeq(party: CreatureInstance[]): void {
  for (const c of party) {
    const m = /^c(\d+)/.exec(c.uid)
    if (m) uidSeq = Math.max(uidSeq, Number(m[1]) + 1)
  }
}
