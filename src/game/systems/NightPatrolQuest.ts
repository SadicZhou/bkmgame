/**
 * 支线 S1-2「山道夜巡」：夜里在余烬山道找回 3 处小火苗，奖高资质灯芯蜥
 * @author zjh
 * @date 2026-11-06
 */

import { calcStats, createCreature, type CreatureInstance } from '../data/creatures'
import { GameState } from '../state/GameState'
import { talentGrade } from './Talent'

export interface FlameSpot {
  id: string
  flag: string
  x: number
  y: number
  findLine: string
}

/** 三处小火苗（余烬山道可走格） */
export const FLAME_SPOTS: FlameSpot[] = [
  {
    id: '1',
    flag: 'got_patrol_flame_1',
    x: 5,
    y: 14,
    findLine: '灰烬草缝里跳出一点橙火，像尾巴尖在摇。',
  },
  {
    id: '2',
    flag: 'got_patrol_flame_2',
    x: 4,
    y: 12,
    findLine: '温泉旁的石头上蹲着一粒小火苗，见你就亮了一亮。',
  },
  {
    id: '3',
    flag: 'got_patrol_flame_3',
    x: 8,
    y: 2,
    findLine: '近山顶的岩缝里，第三点火苗正自己取暖。',
  },
]

export const PATROL_STARTED = 'side_patrol_started'
export const PATROL_DONE = 'side_patrol_done'
export const PATROL_NEED = FLAME_SPOTS.length

export function flamesFound(): number {
  return FLAME_SPOTS.filter((f) => GameState.hasFlag(f.flag)).length
}

/**
 * 捡起一处小火苗
 * @author zjh
 * @date 2026-11-06
 */
export function pickFlame(id: string): { lines: string[] } | { reason: string } {
  if (!GameState.hasFlag(PATROL_STARTED)) {
    return { reason: '（夜里山风很冷。先跟入口的灯芯蜥打个招呼吧。）' }
  }
  if (GameState.hasFlag(PATROL_DONE)) return { reason: '火苗都已经归队了。' }
  if (!GameState.night()) return { reason: '（白天火苗躲进石头缝里，看不见。）' }
  const spot = FLAME_SPOTS.find((f) => f.id === id)
  if (!spot) return { reason: '没有这处火苗。' }
  if (GameState.hasFlag(spot.flag)) return { reason: '这点火已经跟在你手边了。' }
  GameState.setFlag(spot.flag, true)
  const n = flamesFound()
  return {
    lines: [
      spot.findLine,
      `（你把小火苗拢进掌心。）找到了 ${n}/${PATROL_NEED} 处。`,
      n >= PATROL_NEED ? '三处都齐了！回入口找灯芯蜥吧。' : '山上还有火苗在晃。',
    ],
  }
}

/**
 * 与灯芯蜥对话：接取 / 催进度 / 交还领奖
 * @author zjh
 * @date 2026-11-06
 */
export function talkPatrolWick():
  | { kind: 'day' }
  | { kind: 'done' }
  | { kind: 'start'; lines: string[] }
  | { kind: 'wait'; lines: string[] }
  | { kind: 'reward'; lines: string[]; creature: CreatureInstance; where: 'party' | 'storage' } {
  if (!GameState.night()) return { kind: 'day' }
  if (GameState.hasFlag(PATROL_DONE)) return { kind: 'done' }
  if (!GameState.hasFlag(PATROL_STARTED)) {
    GameState.setFlag(PATROL_STARTED, true)
    return {
      kind: 'start',
      lines: [
        '灯芯蜥：吱——（尾巴火苗一晃一晃，像在点头。）',
        '（它用鼻子拱你的手，又望向山道深处。）',
        '夜里散落的小火苗该收回来了。帮我找齐三处，好吗？',
      ],
    }
  }
  const n = flamesFound()
  if (n < PATROL_NEED) {
    return {
      kind: 'wait',
      lines: [
        `灯芯蜥：吱……（还差 ${PATROL_NEED - n} 处火苗。）`,
        '（它尾巴尖的光朝山道深处一指。）',
      ],
    }
  }
  const creature = makePatrolWickling()
  const where = GameState.addCreature(creature)
  GameState.setFlag(PATROL_DONE, true)
  return {
    kind: 'reward',
    creature,
    where,
    lines: [
      '灯芯蜥：吱！吱吱！（三处小火苗扑回它尾巴尖，合成一簇更亮的光。）',
      '（它亲昵地蹭了蹭你，决定跟你走了。）',
      where === 'party' ? '高资质的灯芯蜥加入了队伍！' : '队伍已满，灯芯蜥先寄存在旅人小屋。',
    ],
  }
}

/**
 * 资质至少 A 的灯芯蜥
 * @author zjh
 * @date 2026-11-06
 */
export function makePatrolWickling(rng: () => number = Math.random): CreatureInstance {
  const c = createCreature('wickling', 12, { talentFloor: 15, rng, strong: true })
  while (talentGrade(c.talent) !== 'A' && talentGrade(c.talent) !== 'S') {
    for (const k of ['hp', 'atk', 'def', 'spd'] as const) {
      if (c.talent[k] < 20) c.talent[k] += 1
    }
  }
  const stats = calcStats(c)
  Object.assign(c, stats, { hp: stats.maxHp })
  c.appraised = true
  return c
}
