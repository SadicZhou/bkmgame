/**
 * 随机大事件（异象）与小事件定义（见 docs/planning/08）
 * @author zjh
 * @date 2026-10-14
 */

import type { Weather } from './weather'

export type PhenomenonGoal = 'track' | 'collect'

export interface PhenomenonDef {
  id: string
  name: string
  mapId: string
  uniqueSpeciesId: string
  /** 达成该旗标后才可能发生 */
  unlockFlag: string
  weather?: Weather[]
  time?: 'day' | 'night' | 'full_moon'
  goal: PhenomenonGoal
  /** 小目标物件名称（足迹 / 碎片） */
  goalLabel: string
  /** 异象中心：唯一精灵现身的位置 */
  center: { x: number; y: number }
  omenText: string
  rumorText: string
  /** 现身时的台词 */
  appearLines: string[]
  /** 地图上的氛围色 */
  tint: number
  /** 需先收服其余全部异象（不含自身） */
  requireOthersCaught?: boolean
}

export const PHENOMENA: PhenomenonDef[] = [
  {
    id: 'meteor_shower',
    name: '流星雨',
    mapId: 'meadow',
    uniqueSpeciesId: 'starmarten',
    unlockFlag: 'boss_beaten',
    weather: ['sunny'],
    time: 'night',
    goal: 'collect',
    goalLabel: '星辰碎片',
    center: { x: 13, y: 8 },
    omenText: '【异象】夜空中划过数道流星，似乎坠向了青苔草地……',
    rumorText: '晴朗的夜里，青苔草地上空常有流星。听说有人在陨坑边看见过一只发光的小兽。',
    appearLines: ['陨坑中央，一团星光轻轻跳了起来——', '是坠星貂！它歪着头打量你。'],
    tint: 0x8a9cff,
  },
  {
    id: 'flower_bloom',
    name: '花海盛放',
    mapId: 'meadow',
    uniqueSpeciesId: 'bloomdeer',
    unlockFlag: 'boss_beaten',
    weather: ['sunny'],
    time: 'day',
    goal: 'track',
    goalLabel: '花瓣足迹',
    center: { x: 6, y: 3 },
    omenText: '【异象】一阵花香随风飘来，青苔草地的花一夜之间全开了！',
    rumorText: '晴天的白天，青苔草地偶尔会突然开满花。花瓣会给你指路。',
    appearLines: ['花瓣在你面前打着旋落下——', '一只鹿角开满鲜花的鹿静静地望着你。是花冠鹿！'],
    tint: 0xffb7d5,
  },
  {
    id: 'lava_eruption',
    name: '地火喷涌',
    mapId: 'pass',
    uniqueSpeciesId: 'magmashell',
    unlockFlag: 'boss_beaten',
    time: 'day',
    goal: 'collect',
    goalLabel: '熔晶',
    center: { x: 6, y: 4 },
    omenText: '【异象】大地轰鸣！余烬山道的地火从岩缝里喷涌而出！',
    rumorText: '登山客说，白天的余烬山道偶尔会地火喷涌，熔岩里有个硬壳在打哈欠。',
    appearLines: ['滚烫的岩浆中，一块晶莹的龟甲缓缓浮起——', '熔晶龟睁开了眼睛，打了个大大的哈欠。'],
    tint: 0xff7a40,
  },
  {
    id: 'stone_awaken',
    name: '石林苏醒',
    mapId: 'pass',
    uniqueSpeciesId: 'rockidol',
    unlockFlag: 'whale_beaten',
    weather: ['sand'],
    goal: 'track',
    goalLabel: '石纹足迹',
    center: { x: 8, y: 8 },
    omenText: '【异象】沙暴中，余烬山道的岩壁发出低沉的回响——石林苏醒了！',
    rumorText: '沙暴天走山道时，有人听见石头在呼吸。据说有座古岩像会从石衣里睁眼。',
    appearLines: ['碎石落尽，一座沉默的石像缓缓转过头——', '古岩像的眼窝里亮起两点暖光。'],
    tint: 0xc8a878,
  },
  {
    id: 'mist_tide',
    name: '千年雾潮',
    mapId: 'lake',
    uniqueSpeciesId: 'mistcarp',
    unlockFlag: 'whale_beaten',
    weather: ['fog'],
    goal: 'collect',
    goalLabel: '雾珠',
    center: { x: 10, y: 11 },
    omenText: '【异象】湖面涌起千年未散的浓雾，潮声像从很远的地方传来……',
    rumorText: '起雾的雾泉湖畔，偶尔能看见一道银影跃过龙门。渔人叫它雾隐鲤。',
    appearLines: ['雾帘掀开，一尾银鲤逆着潮光跃起——', '雾隐鲤在空中转了个身，又轻轻落回你面前。'],
    tint: 0xa8d8e8,
  },
  {
    id: 'tide_reverse',
    name: '潮汐倒流',
    mapId: 'lake',
    uniqueSpeciesId: 'tideshark',
    unlockFlag: 'whale_beaten',
    weather: ['rain'],
    time: 'night',
    goal: 'track',
    goalLabel: '倒流涟漪',
    center: { x: 8, y: 12 },
    omenText: '【异象】夜雨中，雾泉湖的潮水忽然倒着流——远处传来歌声。',
    rumorText: '雨夜的湖畔别走太近水边。有人听过鲛歌，第二天就忘了回家的路。',
    appearLines: ['倒流的涟漪中央，一道灰色身影浮起——', '潮歌鲛轻轻哼了一声，湖面跟着颤了一下。'],
    tint: 0x5080b0,
  },
  {
    id: 'bird_migration',
    name: '百鸟迁徙',
    mapId: 'forest',
    uniqueSpeciesId: 'plumeowl',
    unlockFlag: 'deer_beaten',
    weather: ['sunny'],
    time: 'day',
    goal: 'track',
    goalLabel: '落羽',
    center: { x: 15, y: 11 },
    omenText: '【异象】回音林上空忽然挤满了鸟影——百鸟迁徙开始了！',
    rumorText: '晴天的回音林，有时会有成群的鸟从头顶掠过。最高的枝上，据说蹲着一只千羽鸮。',
    appearLines: ['落羽像小雪一样飘下来——', '千羽鸮抖了抖翅膀，林子里响起成百上千声回应。'],
    tint: 0xc8e0ff,
  },
  {
    id: 'ancient_whisper',
    name: '古树低语',
    mapId: 'forest',
    uniqueSpeciesId: 'treesprite',
    unlockFlag: 'deer_beaten',
    time: 'full_moon',
    goal: 'collect',
    goalLabel: '年轮碎片',
    center: { x: 15, y: 3 },
    omenText: '【异象】满月下，林心古树发出低低的呼吸声……有人从树心里走了出来。',
    rumorText: '满月夜去林心，别出声。古树会说悄悄话，有时还会把孩子送出来走走。',
    appearLines: ['树皮裂开一条细缝，一个小小的身影跳到地上——', '树灵童揉了揉眼睛，朝你眨了眨。'],
    tint: 0x80c878,
  },
  {
    id: 'thunder_night',
    name: '雷暴之夜',
    mapId: 'dunes',
    uniqueSpeciesId: 'thundercorn',
    unlockFlag: 'rhino_beaten',
    weather: ['storm'],
    time: 'night',
    goal: 'collect',
    goalLabel: '雷晶',
    center: { x: 10, y: 5 },
    omenText: '【异象】星砂荒原的夜空被雷撕开——雷暴之夜降临了！',
    rumorText: '雷雨夜别在荒原乱跑。有人见过一只独角兽把落雷接在角上。',
    appearLines: ['又一道雷劈下来，却停在半空——', '雷角麟甩了甩头，角尖还亮着电光。'],
    tint: 0xf5d442,
  },
  {
    id: 'sand_mirage',
    name: '沙海蜃楼',
    mapId: 'dunes',
    uniqueSpeciesId: 'miragefox',
    unlockFlag: 'rhino_beaten',
    weather: ['sand'],
    time: 'day',
    goal: 'track',
    goalLabel: '蜃影足迹',
    center: { x: 6, y: 7 },
    omenText: '【异象】沙暴中浮起一座不存在的湖——沙海蜃楼！',
    rumorText: '沙暴天的荒原会骗人。脚印走到一半就分叉，尽头据说是一只蜃影狐。',
    appearLines: ['蜃楼碎成沙粒，一只狐狸从光里走出来——', '蜃影狐歪着头，身后又闪过一个模糊的影子。'],
    tint: 0xe8c0a0,
  },
  {
    id: 'aurora_night',
    name: '极光之夜',
    mapId: 'frostpeak',
    uniqueSpeciesId: 'aurorafox',
    unlockFlag: 'crane_beaten',
    weather: ['sunny'],
    time: 'night',
    goal: 'collect',
    goalLabel: '极光碎片',
    center: { x: 8, y: 4 },
    omenText: '【异象】霜铃峰的夜空垂下彩带——极光之夜！',
    rumorText: '晴朗的夜里上霜铃峰，有时能看见极光。彩带尽头据说蹲着一只极光狐。',
    appearLines: ['彩带落在雪地上，凝成一只狐狸的轮廓——', '极光狐抖了抖尾巴，雪粒都变成了小星星。'],
    tint: 0xa0e0ff,
  },
  {
    id: 'solar_eclipse',
    name: '日蚀',
    mapId: 'meadow',
    uniqueSpeciesId: 'eclipsesprite',
    unlockFlag: 'game_clear',
    time: 'day',
    goal: 'track',
    goalLabel: '暗影足迹',
    center: { x: 10, y: 7 },
    requireOthersCaught: true,
    omenText: '【异象】白昼忽然暗了下来——日蚀！所有影子都在动。',
    rumorText: '有人说，把十二种异象都记下之后，太阳会被咬一口。那时青苔草地上会出现蚀影。',
    appearLines: ['影子叠成一团，站了起来——', '蚀影没有眼睛，却好像一直在看着你。'],
    tint: 0x403858,
  },
]

export const PHENOMENON_BY_ID: Record<string, PhenomenonDef> = Object.fromEntries(PHENOMENA.map((p) => [p.id, p]))

/** 大事件判定参数 */
export const PHENOMENON_RULES = {
  rollInterval: 250,
  baseChance: 0.06,
  pityStep: 0.02,
  duration: 800,
  /** 失败后冷却天数 */
  cooldownDays: 3,
  goalCount: { track: 5, collect: 3 } as Record<PhenomenonGoal, number>,
}

export type MinorEventId = 'migration' | 'shimmer' | 'crystal' | 'merchant' | 'strong_herd' | 'gathering'

export interface MinorEventDef {
  id: MinorEventId
  name: string
  /** 默认持续步数；流浪商人会按「当前昼/夜剩余」覆盖 */
  duration: number
  desc: string
}

export const MINOR_EVENTS: Record<MinorEventId, MinorEventDef> = {
  migration: { id: 'migration', name: '迁徙潮', duration: 300, desc: '某种伙伴成群出现（出现率 ×5）。' },
  shimmer: { id: 'shimmer', name: '闪耀时刻', duration: 200, desc: '异色伙伴出现率 ×3。' },
  crystal: { id: 'crystal', name: '心火结晶', duration: 600, desc: '地图上出现发光的心火结晶，拾取可获得焰币或道具。' },
  merchant: {
    id: 'merchant',
    name: '流浪商人',
    duration: 600,
    desc: '一位行商在野外摆摊，出售资质卡与技能书等稀货。',
  },
  strong_herd: {
    id: 'strong_herd',
    name: '强壮群',
    duration: 300,
    desc: '本地图强壮个体出现率升至 40%。',
  },
  gathering: {
    id: 'gathering',
    name: '训练家集会',
    duration: 600,
    desc: '本地图已击败的训练家可立刻再战，再战焰币翻倍。',
  },
}

/** 流浪商人货架：id → 售价（焰币） */
export const MERCHANT_STOCK: { id: string; price: number }[] = [
  { id: 'talent_fruit', price: 320 },
  { id: 'honey_berry', price: 220 },
  { id: 'pp_honey', price: 160 },
  { id: 'book_tailwind', price: 480 },
  { id: 'book_defog', price: 480 },
  { id: 'star_charm', price: 900 },
]

/** 小事件判定参数 */
export const MINOR_RULES = { rollInterval: 150, chance: 0.12 }
