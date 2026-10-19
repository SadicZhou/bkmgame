/**
 * 灰烬之塔：烫脚、四音、落雷格、风道，以及楼梯在「打赢 + 解开」之后才开
 * @author zjh
 * @date 2026-10-19
 */

import { SPECIES } from '../data/creatures'
import type { CreatureInstance } from '../data/creatures'

/** 第 6 层落雷格。中间一列是安全的 */
export const TOWER_BOLTS = [
  { x: 3, y: 3 },
  { x: 4, y: 3 },
  { x: 6, y: 3 },
  { x: 7, y: 3 },
  { x: 3, y: 4 },
  { x: 7, y: 4 },
]

/**
 * 这一格会不会劈雷
 * @author zjh
 * @date 2026-10-19
 */
export function towerBoltAt(x: number, y: number): boolean {
  return TOWER_BOLTS.some((b) => b.x === x && b.y === y)
}

/**
 * 第 8 层：站在风道上往右走，会被送到平台
 * @author zjh
 * @date 2026-10-19
 */
export function towerWindEnd(x: number, y: number, dx: number): { x: number; y: number } | null {
  if (y !== 3 || dx !== 1) return null
  if (x < 2 || x > 6) return null
  return { x: 7, y: 3 }
}

/**
 * 第 2 层每 10 步掉 3% 体力。焰系首发不受影响。最低留 1
 * @author zjh
 * @date 2026-10-19
 */
export function heatTick(step: number, party: CreatureInstance[]): string | null {
  if (step <= 0 || step % 10 !== 0) return null
  const lead = party.find((c) => c.hp > 0)
  if (lead && SPECIES[lead.speciesId].type === 'flame') return null
  let hurt = false
  for (const c of party) {
    if (c.hp <= 1) continue
    c.hp = Math.max(1, c.hp - Math.max(1, Math.floor(c.maxHp * 0.03)))
    hurt = true
  }
  return hurt ? '地面发烫，伙伴们损失了一点体力。' : null
}

const NOTE_ORDER = [1, 2, 3, 4]

/**
 * 第 4 层按 1→2→3→4 敲。敲错就全部复位
 * @author zjh
 * @date 2026-10-19
 */
export function pressNote(n: number, has: (key: string) => boolean, set: (key: string, on: boolean) => void): string {
  const next = NOTE_ORDER.find((i) => !has(`tower_note_${i}`)) ?? 0
  if (n !== next) {
    for (const i of NOTE_ORDER) set(`tower_note_${i}`, false)
    set('tower_notes_solved', false)
    return '音序错了，石头重新安静下来。'
  }
  set(`tower_note_${n}`, true)
  if (NOTE_ORDER.every((i) => has(`tower_note_${i}`))) {
    set('tower_notes_solved', true)
    return '四音齐鸣，藤蔓让开了。'
  }
  return `第 ${n} 音应了。`
}

/**
 * 第 4、5 层的楼梯要「守关打赢」并且谜题解开
 * @author zjh
 * @date 2026-10-19
 */
export function openTowerStairs(has: (key: string) => boolean, set: (key: string) => void): void {
  if (has('tower_f4') && has('tower_notes_solved')) set('tower_floor_4')
  if (has('tower_f5') && has('tower_rock_moved')) set('tower_floor_5')
}
