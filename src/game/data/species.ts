/**
 * 物种数据（v3.0 骨架种 + 首批唯一精灵），编号与 docs/planning/03-伙伴图鉴.md 一致
 * @author zjh
 * @date 2026-10-14
 */

import type { ElementType } from './types'

export type Rarity = 'common' | 'uncommon' | 'rare' | 'starter' | 'guardian' | 'legend' | 'unique'

/** 学招表条目：达到 level 时学会 moveId */
export interface LearnEntry {
  level: number
  moveId: string
}

export interface CreatureSpecies {
  id: string
  /** 图鉴编号（唯一精灵为 U01 等） */
  dexNo: string
  name: string
  type: ElementType
  rarity: Rarity
  baseHp: number
  baseAtk: number
  baseDef: number
  baseSpd: number
  learnset: LearnEntry[]
  /** 击败后获得经验基数 */
  expYield: number
  evolvesTo?: string
  evolveLevel?: number
  /** 普通特性候选（生成时二选一） */
  abilities: [string, string]
  /** 隐藏特性：S 级觉醒 / 异色 / 守护兽可获得 */
  hiddenAbility: string
  /** 收服倍率；0 = 不可收服 */
  catchRate: number
  desc: string
}

/** 稀有度标识与资质下限 */
export const RARITY_INFO: Record<Rarity, { mark: string; label: string; talentFloor: number }> = {
  common: { mark: '●', label: '常见', talentFloor: 0 },
  uncommon: { mark: '◆', label: '少见', talentFloor: 0 },
  rare: { mark: '★', label: '稀有', talentFloor: 5 },
  starter: { mark: '✿', label: '初始', talentFloor: 8 },
  guardian: { mark: '♛', label: '守护', talentFloor: 12 },
  legend: { mark: '✦', label: '传说', talentFloor: 15 },
  unique: { mark: '✧', label: '异象', talentFloor: 14 },
}

/** 把 [等级, 技能] 简写转为学招表 */
function learn(...pairs: [number, string][]): LearnEntry[] {
  return pairs.map(([level, moveId]) => ({ level, moveId }))
}

/** 物种构造：种族值按 HP/攻/防/速 顺序传入 */
function sp(
  base: Omit<CreatureSpecies, 'baseHp' | 'baseAtk' | 'baseDef' | 'baseSpd'>,
  stats: [number, number, number, number],
): CreatureSpecies {
  const [baseHp, baseAtk, baseDef, baseSpd] = stats
  return { ...base, baseHp, baseAtk, baseDef, baseSpd }
}

// ── 初始伙伴学招表（进化后共用，高阶技能在进化形态提前学会） ──
const FLAME_STARTER = (finisherLv: number) =>
  learn([1, 'tackle'], [1, 'spark_kick'], [3, 'growl'], [4, 'ember_spit'], [7, 'flare_dash'], [10, 'quick_jab'], [finisherLv, 'blaze_burst'], [14, 'wisp_fire'], [22, 'rally'], [30, 'double_edge'])
const TIDE_STARTER = (finisherLv: number) =>
  learn([1, 'tackle'], [1, 'splash'], [3, 'growl'], [4, 'bubble_roll'], [7, 'tide_crash'], [finisherLv, 'torrent'], [14, 'aqua_ring'], [20, 'iron_wall'], [30, 'body_slam'])
const LEAF_STARTER = (finisherLv: number) =>
  learn([1, 'tackle'], [1, 'leaf_tap'], [3, 'growl'], [4, 'vine_snap'], [7, 'petal_storm'], [10, 'leech_seed'], [finisherLv, 'grove_beam'], [18, 'synthesis'], [24, 'quick_jab'])

const LIST: CreatureSpecies[] = [
  // ── 常 ──
  sp({ id: 'puffmouse', dexNo: '01', name: '绒团鼠', type: 'normal', rarity: 'common', learnset: learn([1, 'tackle'], [1, 'growl'], [4, 'quick_jab'], [8, 'body_slam'], [15, 'rally'], [20, 'double_edge']), expYield: 26, evolvesTo: 'bushtail', evolveLevel: 12, abilities: ['fluffy', 'timid'], hiddenAbility: 'lucky', catchRate: 1, desc: '浑身蓬松的小家伙，受惊时会缩成一个毛球滚走。' }, [30, 12, 10, 14]),
  sp({ id: 'bushtail', dexNo: '02', name: '蓬尾鼠', type: 'normal', rarity: 'common', learnset: learn([1, 'tackle'], [1, 'growl'], [4, 'quick_jab'], [8, 'body_slam'], [15, 'rally'], [20, 'double_edge']), expYield: 42, abilities: ['fluffy', 'timid'], hiddenAbility: 'lucky', catchRate: 1, desc: '大尾巴比身体还蓬，冬天会把自己裹成一团睡觉。' }, [40, 16, 13, 18]),

  // ── 焰 ──
  sp({ id: 'flarehorn', dexNo: '04', name: '焰角兔', type: 'flame', rarity: 'starter', learnset: FLAME_STARTER(15), expYield: 28, evolvesTo: 'blazehorn', evolveLevel: 9, abilities: ['blaze_heart', 'swift'], hiddenAbility: 'kindred', catchRate: 1, desc: '额角藏着一粒火种，开心时会冒出小火星。' }, [32, 14, 10, 13]),
  sp({ id: 'blazehorn', dexNo: '05', name: '炽角兔', type: 'flame', rarity: 'starter', learnset: FLAME_STARTER(11), expYield: 45, evolvesTo: 'pyrecrown', evolveLevel: 28, abilities: ['blaze_heart', 'swift'], hiddenAbility: 'kindred', catchRate: 1, desc: '双角燃起长焰，奔跑时会在身后留下焰迹。' }, [40, 18, 13, 16]),
  sp({ id: 'pyrecrown', dexNo: '06', name: '焰冕兔', type: 'flame', rarity: 'starter', learnset: FLAME_STARTER(11), expYield: 64, abilities: ['blaze_heart', 'swift'], hiddenAbility: 'kindred', catchRate: 1, desc: '头顶火焰化作王冠，传说只为最信任的旅人燃烧。' }, [50, 23, 16, 20]),
  sp({ id: 'wickling', dexNo: '07', name: '灯芯蜥', type: 'flame', rarity: 'uncommon', learnset: learn([1, 'tackle'], [1, 'spark_kick'], [4, 'growl'], [7, 'ember_spit'], [11, 'flare_dash'], [15, 'wisp_fire'], [21, 'blaze_burst']), expYield: 30, evolvesTo: 'lanternlizard', evolveLevel: 18, abilities: ['flame_body', 'guide'], hiddenAbility: 'blaze_heart', catchRate: 1, desc: '尾巴尖上一点小火苗，夜里像一盏会走路的灯。' }, [30, 15, 11, 12]),
  sp({ id: 'lanternlizard', dexNo: '08', name: '焰灯蜥', type: 'flame', rarity: 'uncommon', learnset: learn([1, 'tackle'], [1, 'spark_kick'], [4, 'growl'], [7, 'ember_spit'], [11, 'flare_dash'], [15, 'wisp_fire'], [21, 'blaze_burst']), expYield: 46, abilities: ['flame_body', 'guide'], hiddenAbility: 'blaze_heart', catchRate: 1, desc: '背上长出灯笼般的鳞囊，迷路的旅人会追着它的光回家。' }, [40, 20, 15, 14]),
  sp({ id: 'cindermoth', dexNo: '09', name: '烬尘蛾', type: 'flame', rarity: 'uncommon', learnset: learn([1, 'tackle'], [1, 'spark_kick'], [5, 'ember_spit'], [9, 'flare_dash'], [13, 'wisp_fire'], [17, 'gust'], [22, 'blaze_burst']), expYield: 34, evolvesTo: 'emberwing', evolveLevel: 20, abilities: ['ember_last', 'swift'], hiddenAbility: 'lucky', catchRate: 1, desc: '翅膀上的鳞粉像余烬一样发光，常在山道夜里飞舞。' }, [30, 15, 10, 16]),
  sp({ id: 'emberwing', dexNo: '10', name: '炎羽蛾', type: 'flame', rarity: 'uncommon', learnset: learn([1, 'tackle'], [1, 'spark_kick'], [5, 'ember_spit'], [9, 'flare_dash'], [13, 'wisp_fire'], [17, 'gust'], [22, 'blaze_burst'], [26, 'feather_blade']), expYield: 50, abilities: ['ember_last', 'swift'], hiddenAbility: 'lucky', catchRate: 1, desc: '振翅时洒落火星雨，荒原的夜空因它而有了流星。' }, [38, 19, 13, 21]),
  sp({ id: 'magmane', dexNo: '11', name: '熔鬃狮', type: 'flame', rarity: 'guardian', learnset: learn([1, 'tackle'], [1, 'ember_spit'], [6, 'flare_dash'], [10, 'rock_slide'], [12, 'blaze_burst']), expYield: 80, abilities: ['flame_body', 'intimidate'], hiddenAbility: 'guardian', catchRate: 0, desc: '守护余烬山巅火种的狮子，鬃毛是流动的熔岩。' }, [50, 19, 15, 14]),

  // ── 潮 ──
  sp({ id: 'tideback', dexNo: '12', name: '碧波龟', type: 'tide', rarity: 'starter', learnset: TIDE_STARTER(15), expYield: 30, evolvesTo: 'torrentshell', evolveLevel: 9, abilities: ['torrent_heart', 'hard_shell'], hiddenAbility: 'kindred', catchRate: 1, desc: '背甲能储存一小片湖水，晒太阳时会冒泡泡。' }, [38, 11, 15, 8]),
  sp({ id: 'torrentshell', dexNo: '13', name: '涌潮龟', type: 'tide', rarity: 'starter', learnset: TIDE_STARTER(11), expYield: 47, evolvesTo: 'abyssshell', evolveLevel: 28, abilities: ['torrent_heart', 'hard_shell'], hiddenAbility: 'kindred', catchRate: 1, desc: '甲壳上的涡纹会随潮汐旋转，能喷出激流。' }, [48, 14, 19, 10]),
  sp({ id: 'abyssshell', dexNo: '14', name: '沧甲龟', type: 'tide', rarity: 'starter', learnset: TIDE_STARTER(11), expYield: 66, abilities: ['torrent_heart', 'hard_shell'], hiddenAbility: 'kindred', catchRate: 1, desc: '背负一整片深湖，据说龟甲深处藏着沉没的古镇。' }, [58, 18, 24, 12]),
  sp({ id: 'mistnewt', dexNo: '17', name: '雾泉螈', type: 'tide', rarity: 'uncommon', learnset: learn([1, 'tackle'], [1, 'splash'], [5, 'bubble_roll'], [9, 'tide_crash'], [13, 'aqua_ring'], [18, 'torrent']), expYield: 33, evolvesTo: 'wavefin', evolveLevel: 20, abilities: ['bubble', 'torrent_heart'], hiddenAbility: 'regen', catchRate: 1, desc: '住在山间温泉边，身上总缭绕着薄雾。' }, [33, 13, 13, 12]),
  sp({ id: 'wavefin', dexNo: '18', name: '澜鳍螈', type: 'tide', rarity: 'uncommon', learnset: learn([1, 'tackle'], [1, 'splash'], [5, 'bubble_roll'], [9, 'tide_crash'], [13, 'aqua_ring'], [18, 'torrent'], [22, 'frost_breath']), expYield: 49, abilities: ['bubble', 'torrent_heart'], hiddenAbility: 'regen', catchRate: 1, desc: '鳍边薄如蝉翼，划水时会在湖面留下一道彩虹。' }, [42, 17, 17, 16]),

  // ── 叶 ──
  sp({ id: 'leafkit', dexNo: '20', name: '翠叶狐', type: 'leaf', rarity: 'starter', learnset: LEAF_STARTER(15), expYield: 27, evolvesTo: 'grovefox', evolveLevel: 9, abilities: ['overgrow', 'swift'], hiddenAbility: 'kindred', catchRate: 1, desc: '尾巴是一片大叶子，害羞时会把脸藏进去。' }, [30, 13, 11, 15]),
  sp({ id: 'grovefox', dexNo: '21', name: '森冠狐', type: 'leaf', rarity: 'starter', learnset: LEAF_STARTER(11), expYield: 44, evolvesTo: 'sylvanfox', evolveLevel: 28, abilities: ['overgrow', 'swift'], hiddenAbility: 'kindred', catchRate: 1, desc: '头顶长出花冠，所到之处草木会轻轻摇摆。' }, [38, 17, 14, 18]),
  sp({ id: 'sylvanfox', dexNo: '22', name: '万木狐', type: 'leaf', rarity: 'starter', learnset: LEAF_STARTER(11), expYield: 63, abilities: ['overgrow', 'swift'], hiddenAbility: 'kindred', catchRate: 1, desc: '九条叶尾各自生长着不同季节的花，走过的地方会开出一条小路。' }, [48, 22, 17, 23]),
  sp({ id: 'sproutcap', dexNo: '23', name: '芽芽菇', type: 'leaf', rarity: 'common', learnset: learn([1, 'tackle'], [1, 'leaf_tap'], [6, 'leech_seed'], [9, 'vine_snap'], [13, 'synthesis'], [18, 'petal_storm'], [24, 'grove_beam']), expYield: 27, evolvesTo: 'parashroom', evolveLevel: 16, abilities: ['regen', 'dispel'], hiddenAbility: 'fluffy', catchRate: 1, desc: '雨后从苔藓里冒出来，喜欢站在别人头上晒太阳。' }, [34, 12, 13, 8]),
  sp({ id: 'parashroom', dexNo: '24', name: '伞灵菇', type: 'leaf', rarity: 'common', learnset: learn([1, 'tackle'], [1, 'leaf_tap'], [6, 'leech_seed'], [9, 'vine_snap'], [13, 'synthesis'], [18, 'petal_storm'], [24, 'grove_beam']), expYield: 44, abilities: ['regen', 'dispel'], hiddenAbility: 'fluffy', catchRate: 1, desc: '伞盖下总有小动物躲雨，它会假装没看见。' }, [46, 16, 18, 10]),

  // ── 岩 ──
  sp({ id: 'rockmite', dexNo: '26', name: '岩甲虫', type: 'stone', rarity: 'common', learnset: learn([1, 'tackle'], [1, 'pebble'], [4, 'shell_bash'], [7, 'rock_slide'], [10, 'iron_wall'], [16, 'quake'], [20, 'sandstorm']), expYield: 29, evolvesTo: 'bouldermite', evolveLevel: 9, abilities: ['hard_shell', 'intimidate'], hiddenAbility: 'regen', catchRate: 1, desc: '喜欢啃小石子，壳越啃越硬。' }, [34, 15, 14, 7]),
  sp({ id: 'bouldermite', dexNo: '27', name: '磐甲虫', type: 'stone', rarity: 'common', learnset: learn([1, 'tackle'], [1, 'pebble'], [4, 'shell_bash'], [7, 'rock_slide'], [10, 'iron_wall'], [11, 'quake'], [20, 'sandstorm']), expYield: 46, abilities: ['hard_shell', 'intimidate'], hiddenAbility: 'regen', catchRate: 1, desc: '壳像一块小磐石，跺脚能让地面发颤。' }, [44, 19, 19, 8]),
  sp({ id: 'pebblepup', dexNo: '28', name: '砾团犬', type: 'stone', rarity: 'uncommon', learnset: learn([1, 'tackle'], [1, 'growl'], [4, 'pebble'], [8, 'quick_jab'], [11, 'shell_bash'], [15, 'rock_slide'], [20, 'iron_wall'], [25, 'quake']), expYield: 32, evolvesTo: 'cragdog', evolveLevel: 20, abilities: ['intimidate', 'hard_shell'], hiddenAbility: 'swift', catchRate: 1, desc: '把亮晶晶的小石子当宝贝，会叼来送给喜欢的人。' }, [34, 15, 14, 10]),
  sp({ id: 'cragdog', dexNo: '29', name: '岩鬃犬', type: 'stone', rarity: 'uncommon', learnset: learn([1, 'tackle'], [1, 'growl'], [4, 'pebble'], [8, 'quick_jab'], [11, 'shell_bash'], [15, 'rock_slide'], [20, 'iron_wall'], [25, 'quake']), expYield: 50, abilities: ['intimidate', 'hard_shell'], hiddenAbility: 'swift', catchRate: 1, desc: '鬃毛化作岩刺，在雪山上替迷路的人挡住寒风。' }, [44, 20, 19, 12]),

  // ── 风 ──
  sp({ id: 'skylark', dexNo: '33', name: '云雀羽', type: 'gale', rarity: 'common', learnset: learn([1, 'gust'], [1, 'growl'], [4, 'quick_jab'], [7, 'aerial'], [11, 'tailwind'], [15, 'feather_blade'], [22, 'hurricane']), expYield: 27, evolvesTo: 'skyfinch', evolveLevel: 16, abilities: ['swift', 'tailwind_born'], hiddenAbility: 'guide', catchRate: 1, desc: '清晨第一个唱歌的就是它，歌声能把晨雾吹散。' }, [28, 13, 9, 18]),
  sp({ id: 'skyfinch', dexNo: '34', name: '穹翼雀', type: 'gale', rarity: 'common', learnset: learn([1, 'gust'], [1, 'growl'], [4, 'quick_jab'], [7, 'aerial'], [11, 'tailwind'], [15, 'feather_blade'], [22, 'hurricane']), expYield: 44, abilities: ['swift', 'tailwind_born'], hiddenAbility: 'guide', catchRate: 1, desc: '翼展像一片小小的天空，飞过雪峰时不会留下影子。' }, [36, 18, 12, 23]),

  // ── 唯一精灵（异象） ──
  sp({ id: 'starmarten', dexNo: 'U01', name: '坠星貂', type: 'normal', rarity: 'unique', learnset: learn([1, 'quick_jab'], [1, 'growl'], [1, 'falling_star'], [1, 'body_slam'], [20, 'rally'], [30, 'double_edge']), expYield: 90, abilities: ['wish', 'wish'], hiddenAbility: 'wish', catchRate: 0.4, desc: '它是流星落地时溅起的那一点光。据说追着它跑一整夜，就能许下一个愿望。' }, [26, 28, 24, 32]),
  sp({ id: 'bloomdeer', dexNo: 'U02', name: '花冠鹿', type: 'leaf', rarity: 'unique', learnset: learn([1, 'leaf_tap'], [1, 'thousand_bloom'], [1, 'synthesis'], [1, 'leech_seed'], [25, 'grove_beam']), expYield: 90, abilities: ['bloom_scent', 'bloom_scent'], hiddenAbility: 'bloom_scent', catchRate: 0.4, desc: '花海盛放的清晨才会现身，鹿角上的花一年只开一次。' }, [30, 24, 28, 26]),
  sp({ id: 'magmashell', dexNo: 'U03', name: '熔晶龟', type: 'flame', rarity: 'unique', learnset: learn([1, 'ember_spit'], [1, 'lava_tide'], [1, 'iron_wall'], [1, 'shell_bash'], [25, 'blaze_burst']), expYield: 90, abilities: ['magma_armor', 'magma_armor'], hiddenAbility: 'magma_armor', catchRate: 0.4, desc: '山腹里的地火每百年喷涌一次，它就趴在火口打个哈欠，再睡一百年。' }, [34, 26, 36, 14]),
]

export const SPECIES: Record<string, CreatureSpecies> = Object.fromEntries(LIST.map((s) => [s.id, s]))

/** 主图鉴顺序（按编号；唯一精灵另列） */
export const DEX_ORDER: string[] = LIST.filter((s) => s.rarity !== 'unique').map((s) => s.id)

/** 异象录顺序 */
export const UNIQUE_ORDER: string[] = LIST.filter((s) => s.rarity === 'unique').map((s) => s.id)

/** 可选初始伙伴 */
export const STARTERS: string[] = ['flarehorn', 'tideback', 'leafkit']
