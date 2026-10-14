/**
 * 原创伙伴数据（非宝可梦 IP）：物种、招式、学招表、进化链
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

/** 学招表条目：达到 level 时学会 moveId */
export interface LearnEntry {
  level: number
  moveId: string
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
  learnset: LearnEntry[]
  /** 击败后获得经验基数 */
  expYield: number
  /** 进化目标与等级（可选） */
  evolvesTo?: string
  evolveLevel?: number
  /** 图鉴描述 */
  desc: string
  /** 是否可被收服（BOSS 不可） */
  catchable: boolean
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
  /** 已掌握招式 id（最多 4 个）；旧存档可能缺失，读档时补齐 */
  moves?: string[]
}

/** 单只伙伴最多掌握的招式数 */
export const MAX_MOVES = 4

/** 类型克制：攻方打防方倍率 */
const TYPE_CHART: Record<ElementType, Partial<Record<ElementType, number>>> = {
  flame: { leaf: 1.5, tide: 0.75, stone: 0.75 },
  tide: { flame: 1.5, stone: 1.5, leaf: 0.75 },
  leaf: { tide: 1.5, stone: 1.5, flame: 0.75 },
  stone: { flame: 1.5, leaf: 0.75, tide: 0.75 },
}

export const MOVES: Record<string, MoveDef> = {
  tackle: { id: 'tackle', name: '冲撞', power: 14, type: 'stone' },
  spark_kick: { id: 'spark_kick', name: '火星踢', power: 18, type: 'flame' },
  ember_spit: { id: 'ember_spit', name: '余烬唾', power: 22, type: 'flame' },
  flare_dash: { id: 'flare_dash', name: '焰流冲', power: 30, type: 'flame' },
  blaze_burst: { id: 'blaze_burst', name: '炽焰爆', power: 38, type: 'flame' },
  splash: { id: 'splash', name: '水花拍', power: 16, type: 'tide' },
  bubble_roll: { id: 'bubble_roll', name: '泡泡滚', power: 24, type: 'tide' },
  tide_crash: { id: 'tide_crash', name: '潮涌撞', power: 30, type: 'tide' },
  torrent: { id: 'torrent', name: '激流', power: 38, type: 'tide' },
  leaf_tap: { id: 'leaf_tap', name: '叶拍', power: 17, type: 'leaf' },
  vine_snap: { id: 'vine_snap', name: '藤响', power: 23, type: 'leaf' },
  petal_storm: { id: 'petal_storm', name: '花瓣风暴', power: 30, type: 'leaf' },
  grove_beam: { id: 'grove_beam', name: '林冠光', power: 38, type: 'leaf' },
  pebble: { id: 'pebble', name: '碎石弹', power: 19, type: 'stone' },
  shell_bash: { id: 'shell_bash', name: '甲撞', power: 25, type: 'stone' },
  rock_slide: { id: 'rock_slide', name: '岩崩', power: 30, type: 'stone' },
  quake: { id: 'quake', name: '震地', power: 38, type: 'stone' },
}

/** 进化等级（短篇节奏：通关前大致可达） */
const EVO_LV = 9

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
    learnset: [
      { level: 1, moveId: 'tackle' },
      { level: 1, moveId: 'spark_kick' },
      { level: 4, moveId: 'ember_spit' },
      { level: 7, moveId: 'flare_dash' },
    ],
    expYield: 28,
    evolvesTo: 'blazehorn',
    evolveLevel: EVO_LV,
    desc: '额角藏着一粒火种，开心时会冒出小火星。',
    catchable: true,
  },
  blazehorn: {
    id: 'blazehorn',
    name: '炽角兔',
    type: 'flame',
    color: 0xff6b4a,
    accent: 0xffe066,
    baseHp: 40,
    baseAtk: 18,
    baseDef: 13,
    baseSpd: 16,
    learnset: [
      { level: 1, moveId: 'tackle' },
      { level: 1, moveId: 'spark_kick' },
      { level: 4, moveId: 'ember_spit' },
      { level: 7, moveId: 'flare_dash' },
      { level: 11, moveId: 'blaze_burst' },
    ],
    expYield: 45,
    desc: '双角燃起长焰，奔跑时会在身后留下焰迹。',
    catchable: true,
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
    learnset: [
      { level: 1, moveId: 'tackle' },
      { level: 1, moveId: 'splash' },
      { level: 4, moveId: 'bubble_roll' },
      { level: 7, moveId: 'tide_crash' },
    ],
    expYield: 30,
    evolvesTo: 'torrentshell',
    evolveLevel: EVO_LV,
    desc: '背甲能储存一小片湖水，晒太阳时会冒泡泡。',
    catchable: true,
  },
  torrentshell: {
    id: 'torrentshell',
    name: '涌潮龟',
    type: 'tide',
    color: 0x4a90d0,
    accent: 0xc8f0ff,
    baseHp: 48,
    baseAtk: 14,
    baseDef: 19,
    baseSpd: 10,
    learnset: [
      { level: 1, moveId: 'tackle' },
      { level: 1, moveId: 'splash' },
      { level: 4, moveId: 'bubble_roll' },
      { level: 7, moveId: 'tide_crash' },
      { level: 11, moveId: 'torrent' },
    ],
    expYield: 47,
    desc: '甲壳上的涡纹会随潮汐旋转，能喷出激流。',
    catchable: true,
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
    learnset: [
      { level: 1, moveId: 'tackle' },
      { level: 1, moveId: 'leaf_tap' },
      { level: 4, moveId: 'vine_snap' },
      { level: 7, moveId: 'petal_storm' },
    ],
    expYield: 27,
    evolvesTo: 'grovefox',
    evolveLevel: EVO_LV,
    desc: '尾巴是一片大叶子，害羞时会把脸藏进去。',
    catchable: true,
  },
  grovefox: {
    id: 'grovefox',
    name: '森冠狐',
    type: 'leaf',
    color: 0x4fae5a,
    accent: 0xf2e86b,
    baseHp: 38,
    baseAtk: 17,
    baseDef: 14,
    baseSpd: 18,
    learnset: [
      { level: 1, moveId: 'tackle' },
      { level: 1, moveId: 'leaf_tap' },
      { level: 4, moveId: 'vine_snap' },
      { level: 7, moveId: 'petal_storm' },
      { level: 11, moveId: 'grove_beam' },
    ],
    expYield: 44,
    desc: '头顶长出花冠，所到之处草木会轻轻摇摆。',
    catchable: true,
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
    learnset: [
      { level: 1, moveId: 'tackle' },
      { level: 1, moveId: 'pebble' },
      { level: 4, moveId: 'shell_bash' },
      { level: 7, moveId: 'rock_slide' },
    ],
    expYield: 29,
    evolvesTo: 'bouldermite',
    evolveLevel: EVO_LV,
    desc: '喜欢啃小石子，壳越啃越硬。',
    catchable: true,
  },
  bouldermite: {
    id: 'bouldermite',
    name: '磐甲虫',
    type: 'stone',
    color: 0x9c7c5c,
    accent: 0xe8dcd0,
    baseHp: 44,
    baseAtk: 19,
    baseDef: 19,
    baseSpd: 8,
    learnset: [
      { level: 1, moveId: 'tackle' },
      { level: 1, moveId: 'pebble' },
      { level: 4, moveId: 'shell_bash' },
      { level: 7, moveId: 'rock_slide' },
      { level: 11, moveId: 'quake' },
    ],
    expYield: 46,
    desc: '壳像一块小磐石，跺脚能让地面发颤。',
    catchable: true,
  },
  cindermoth: {
    id: 'cindermoth',
    name: '烬尘蛾',
    type: 'flame',
    color: 0xe8a05a,
    accent: 0xfff0a0,
    baseHp: 30,
    baseAtk: 15,
    baseDef: 10,
    baseSpd: 16,
    learnset: [
      { level: 1, moveId: 'tackle' },
      { level: 1, moveId: 'spark_kick' },
      { level: 5, moveId: 'ember_spit' },
      { level: 9, moveId: 'flare_dash' },
    ],
    expYield: 34,
    desc: '翅膀上的鳞粉像余烬一样发光，常在山道夜里飞舞。',
    catchable: true,
  },
  mistnewt: {
    id: 'mistnewt',
    name: '雾泉螈',
    type: 'tide',
    color: 0x8fd0c8,
    accent: 0xe0fff8,
    baseHp: 33,
    baseAtk: 13,
    baseDef: 13,
    baseSpd: 12,
    learnset: [
      { level: 1, moveId: 'tackle' },
      { level: 1, moveId: 'splash' },
      { level: 5, moveId: 'bubble_roll' },
      { level: 9, moveId: 'tide_crash' },
    ],
    expYield: 33,
    desc: '住在山间温泉边，身上总缭绕着薄雾。',
    catchable: true,
  },
  magmane: {
    id: 'magmane',
    name: '熔鬃狮',
    type: 'flame',
    color: 0xd9483b,
    accent: 0xffb030,
    baseHp: 50,
    baseAtk: 19,
    baseDef: 15,
    baseSpd: 14,
    learnset: [
      { level: 1, moveId: 'tackle' },
      { level: 1, moveId: 'ember_spit' },
      { level: 6, moveId: 'flare_dash' },
      { level: 10, moveId: 'rock_slide' },
      { level: 12, moveId: 'blaze_burst' },
    ],
    expYield: 80,
    desc: '守护余烬山巅火种的狮子，鬃毛是流动的熔岩。',
    catchable: false,
  },
}

/** 图鉴展示顺序 */
export const DEX_ORDER: string[] = [
  'flarehorn',
  'blazehorn',
  'tideback',
  'torrentshell',
  'leafkit',
  'grovefox',
  'rockmite',
  'bouldermite',
  'cindermoth',
  'mistnewt',
  'magmane',
]

export const TYPE_LABEL: Record<ElementType, string> = {
  flame: '焰',
  tide: '潮',
  leaf: '叶',
  stone: '岩',
}

let uidSeq = 1

/**
 * 按物种基础值与等级计算能力值
 * @author zjh
 * @date 2026-10-14
 */
export function calcStats(
  speciesId: string,
  level: number,
): { maxHp: number; atk: number; def: number; spd: number } {
  const s = SPECIES[speciesId]
  const scale = 1 + (level - 1) * 0.08
  return {
    maxHp: Math.round(s.baseHp * scale),
    atk: Math.round(s.baseAtk * scale),
    def: Math.round(s.baseDef * scale),
    spd: Math.round(s.baseSpd * scale),
  }
}

/**
 * 计算某等级应掌握的招式（取学招表中最近学会的 4 个）
 * @author zjh
 * @date 2026-10-14
 */
export function movesAtLevel(speciesId: string, level: number): string[] {
  const learned = SPECIES[speciesId].learnset
    .filter((e) => e.level <= level)
    .map((e) => e.moveId)
  return learned.slice(-MAX_MOVES)
}

/**
 * 按等级生成伙伴实例
 * @author zjh
 * @date 2026-10-14
 */
export function createCreature(speciesId: string, level = 5): CreatureInstance {
  const stats = calcStats(speciesId, level)
  return {
    uid: `c${uidSeq++}-${Date.now().toString(36)}`,
    speciesId,
    level,
    exp: 0,
    hp: stats.maxHp,
    ...stats,
    moves: movesAtLevel(speciesId, level),
  }
}

/** 获取实例招式定义列表（兼容旧存档无 moves 字段） */
export function getMoves(c: CreatureInstance): MoveDef[] {
  const ids = c.moves?.length ? c.moves : movesAtLevel(c.speciesId, c.level)
  return ids.map((id) => MOVES[id]).filter(Boolean)
}

/** 升级所需经验（短篇节奏，曲线较平缓） */
export function expToNext(level: number): number {
  return Math.round(20 + level * 10)
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
