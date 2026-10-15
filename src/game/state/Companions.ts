/**
 * 同行伙伴：跟随伙伴、坐骑与骑乘状态。
 * 都存在存档旗标里（值为伙伴 uid），伙伴离开队伍（寄存 / 放生）后自动失效，无需迁移存档。
 * @author zjh
 * @date 2026-10-15
 */

import type { CreatureInstance } from '../data/creatures'
import { isMountSpecies } from '../data/mounts'
import { GameState } from './GameState'

export const COMPANION_FLAGS = {
  follow: 'pet_follow',
  mount: 'pet_mount',
  riding: 'pet_riding',
} as const

function inParty(key: string): CreatureInstance | null {
  const uid = GameState.getFlag(key)
  return typeof uid === 'string' ? GameState.party.find((c) => c.uid === uid) ?? null : null
}

export const Companions = {
  /** 跟随伙伴（不在队伍里时为 null） */
  follower(): CreatureInstance | null {
    return inParty(COMPANION_FLAGS.follow)
  },

  /** 指定 / 取消跟随伙伴 */
  setFollower(uid: string | null): void {
    if (uid) GameState.setFlag(COMPANION_FLAGS.follow, uid)
    else GameState.clearFlag(COMPANION_FLAGS.follow)
  },

  /** 坐骑（不在队伍里或不可骑乘时为 null） */
  mount(): CreatureInstance | null {
    const c = inParty(COMPANION_FLAGS.mount)
    return c && isMountSpecies(c.speciesId) ? c : null
  },

  /** 指定 / 取消坐骑；取消时一并下坐骑 */
  setMount(uid: string | null): void {
    if (uid) GameState.setFlag(COMPANION_FLAGS.mount, uid)
    else {
      GameState.clearFlag(COMPANION_FLAGS.mount)
      GameState.clearFlag(COMPANION_FLAGS.riding)
    }
  },

  /** 正在骑乘（且坐骑仍在队伍里） */
  riding(): boolean {
    return !!GameState.getFlag(COMPANION_FLAGS.riding) && !!this.mount()
  },

  setRiding(on: boolean): void {
    if (on) GameState.setFlag(COMPANION_FLAGS.riding, true)
    else GameState.clearFlag(COMPANION_FLAGS.riding)
  },
}
