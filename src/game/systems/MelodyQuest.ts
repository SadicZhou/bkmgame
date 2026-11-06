/**
 * 支线 S3-1「回音石的歌」：听 6 音旋律后按序敲响音石，奖铃铛猫
 * @author zjh
 * @date 2026-11-06
 */

import { createCreature, type CreatureInstance } from '../data/creatures'
import { GameState } from '../state/GameState'

/** 六音石（含主线四音 + 清风 / 星铃），顺序即正确旋律 */
export const SONG_STONES = [
  { id: 'earth', name: '大地', sound: '咚' },
  { id: 'water', name: '流水', sound: '叮' },
  { id: 'leaf', name: '林叶', sound: '铃' },
  { id: 'bird', name: '飞鸟', sound: '啾' },
  { id: 'wind', name: '清风', sound: '嘘' },
  { id: 'chime', name: '星铃', sound: '叮铃' },
] as const

export type SongStoneId = (typeof SONG_STONES)[number]['id']

/** 支线新增的两块音石坐标（主线四音仍用 forestMap.ECHO_STONES） */
export const EXTRA_SONG_STONES = [
  { id: 'wind' as const, name: '清风', sound: '嘘', x: 15, y: 14 },
  { id: 'chime' as const, name: '星铃', sound: '叮铃', x: 15, y: 17 },
]

export const SONG_HEARD = 'side_song_heard'
export const SONG_DONE = 'side_song_done'
export const SONG_STEP_FLAG = 'side_song_step'
export const songLitFlag = (id: string) => `side_song_lit_${id}`

export type SongResult = 'need_hear' | 'done' | 'already' | 'wrong' | 'lit' | 'solved'

/**
 * 旋律文案（老铃铛播放）
 * @author zjh
 * @date 2026-11-06
 */
export function melodyLines(): string[] {
  const seq = SONG_STONES.map((s) => s.sound).join('—')
  return [
    '（古树上挂着一只生锈的老铃铛。你轻轻一碰——）',
    `铃铛自己唱了起来：${seq}。`,
    '（回音在空地四角与小路中央的音石间跳跃。记住顺序，再去敲响它们。）',
  ]
}

/** 听过旋律且未完成 */
export function songActive(): boolean {
  return GameState.hasFlag(SONG_HEARD) && !GameState.hasFlag(SONG_DONE)
}

export function songStep(): number {
  return Number(GameState.getFlag(SONG_STEP_FLAG) ?? 0) || 0
}

function resetSong(): void {
  for (const s of SONG_STONES) GameState.clearFlag(songLitFlag(s.id))
  GameState.setFlag(SONG_STEP_FLAG, 0)
}

/**
 * 听老铃铛：记下旋律，刷新出两块新音石
 * @author zjh
 * @date 2026-11-06
 */
export function hearMelody(): { lines: string[]; first: boolean } {
  if (GameState.hasFlag(SONG_DONE)) {
    return { first: false, lines: ['（老铃铛轻轻晃了一下，像在跟你打招呼。）'] }
  }
  const first = !GameState.hasFlag(SONG_HEARD)
  GameState.setFlag(SONG_HEARD, true)
  resetSong()
  return { first, lines: melodyLines() }
}

/**
 * 敲响一块音石（仅在听过旋律且未完成后生效）
 * @author zjh
 * @date 2026-11-06
 */
export function pressSongStone(stoneId: string): SongResult {
  if (GameState.hasFlag(SONG_DONE)) return 'done'
  if (!GameState.hasFlag(SONG_HEARD)) return 'need_hear'
  if (GameState.hasFlag(songLitFlag(stoneId))) return 'already'
  const step = songStep()
  if (SONG_STONES[step]?.id !== stoneId) {
    resetSong()
    return 'wrong'
  }
  GameState.setFlag(songLitFlag(stoneId), true)
  GameState.setFlag(SONG_STEP_FLAG, step + 1)
  if (step + 1 < SONG_STONES.length) return 'lit'
  GameState.setFlag(SONG_DONE, true)
  return 'solved'
}

/**
 * 解开后领取的铃铛猫 Lv25
 * @author zjh
 * @date 2026-11-06
 */
export function makeBellcat(rng: () => number = Math.random): CreatureInstance {
  return createCreature('bellcat', 25, { rng })
}

export function songStoneById(id: string) {
  return SONG_STONES.find((s) => s.id === id) ?? EXTRA_SONG_STONES.find((s) => s.id === id)
}
