/**
 * 支线 S3-2「菇菇派对」：伞灵菇老奶奶托你在回音林采 8 种菇（白天 4 种 / 夜晚 4 种）
 * 贴图由 scripts/process-props.py 从 art-src/props/mushrooms.jpg 切出（public/assets/props/mush-<id>.png）。
 * @author zjh
 * @date 2026-10-15
 */

import type { NpcDef } from './maps'

/** 支线旗标 */
export const MUSH_FLAGS = {
  /** 已接下委托（采集点开始出现） */
  quest: 'mush_quest',
  /** 已交付并领取奖励 */
  done: 'mush_done',
  /** 称号「菇菇朋友」 */
  title: 'title_mushroom_friend',
} as const

export interface MushroomDef {
  id: string
  name: string
  /** 只在夜晚出现 */
  night: boolean
  x: number
  y: number
  /** 调查时的描述 */
  desc: string
}

/** 顺序与贴图网格一致：上排白天、下排夜晚 */
export const MUSHROOMS: MushroomDef[] = [
  { id: 'redcap', name: '红伞菇', night: false, x: 7, y: 10, desc: '红色伞盖上缀着白点，像一把把小雨伞。' },
  { id: 'chanter', name: '金鸡油菌', night: false, x: 22, y: 10, desc: '金灿灿的喇叭形菌盖，闻起来有杏子的香味。' },
  { id: 'porcini', name: '圆墩牛肝菌', night: false, x: 11, y: 16, desc: '胖墩墩的褐色菌伞，捏一下还挺结实。' },
  { id: 'oyster', name: '粉褶平菇', night: false, x: 21, y: 15, desc: '一层层粉色的菌褶，长在倒下的小木头上。' },
  { id: 'bluelamp', name: '蓝灯菇', night: true, x: 3, y: 13, desc: '在夜里发出幽幽的蓝光，像一盏盏小灯。' },
  { id: 'violet', name: '紫铃菇', night: true, x: 24, y: 13, desc: '细长的紫色菌柄，风一吹就轻轻摇晃。' },
  { id: 'moon', name: '月牙菇', night: true, x: 7, y: 17, desc: '菌盖弯成月牙形，泛着淡淡的绿光。' },
  { id: 'star', name: '星屑菇', night: true, x: 18, y: 12, desc: '金色菌盖上闪着细碎的光点，像落下来的星星。' },
]

/** 采到某种菇的旗标 */
export const mushFlag = (id: string) => `mush_got_${id}`

/** 贴图 key */
export const mushTexture = (id: string) => `prop-mush-${id}`

/**
 * 已采到的数量
 * @author zjh
 * @date 2026-10-15
 */
export function mushCount(hasFlag: (k: string) => boolean): number {
  return MUSHROOMS.filter((m) => hasFlag(mushFlag(m.id))).length
}

/**
 * 回音林里的采集点 NPC：接委托后出现；白天的菇夜里不见，夜里的菇白天不见；采过的消失
 * @author zjh
 * @date 2026-10-15
 */
export function mushroomSpots(): NpcDef[] {
  return MUSHROOMS.map((m) => ({
    id: `mush_${m.id}`,
    name: m.name,
    role: 'prop' as const,
    story: `mush_${m.id}`,
    texture: mushTexture(m.id),
    bob: m.night,
    x: m.x,
    y: m.y,
    color: 0xc84a3a,
    showIf: m.night ? [MUSH_FLAGS.quest, '@night'] : MUSH_FLAGS.quest,
    hideIf: m.night ? mushFlag(m.id) : [mushFlag(m.id), '@night'],
    lines: [],
  }))
}

/** 伞灵菇老奶奶 */
export const MUSH_GRANNY: NpcDef = {
  id: 'mushroom_granny',
  name: '伞灵菇老奶奶',
  story: 'mushroom_granny',
  x: 10,
  y: 14,
  color: 0xc84a3a,
  wander: 1,
  emote: '♪',
  chat: ['菇菇～', '今天也是好天气。'],
  lines: [],
}
