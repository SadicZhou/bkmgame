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

export type MinorEventId = 'migration' | 'shimmer' | 'crystal'

export interface MinorEventDef {
  id: MinorEventId
  name: string
  duration: number
  desc: string
}

export const MINOR_EVENTS: Record<MinorEventId, MinorEventDef> = {
  migration: { id: 'migration', name: '迁徙潮', duration: 300, desc: '某种伙伴成群出现（出现率 ×5）。' },
  shimmer: { id: 'shimmer', name: '闪耀时刻', duration: 200, desc: '异色伙伴出现率 ×3。' },
  crystal: { id: 'crystal', name: '心火结晶', duration: 600, desc: '地图上出现发光的心火结晶，拾取可获得焰币或道具。' },
}

/** 小事件判定参数 */
export const MINOR_RULES = { rollInterval: 150, chance: 0.12 }
