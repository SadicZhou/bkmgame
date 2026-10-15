/**
 * 伙伴详情里的「跟随伙伴 / 坐骑」两行，以及队伍列表上的标记
 * @author zjh
 * @date 2026-10-15
 */

import { battleName, type CreatureInstance } from '../data/creatures'
import { MOUNTS, MOUNT_SKILLS } from '../data/mounts'
import { Companions } from '../state/Companions'
import { GameState } from '../state/GameState'
import { Sfx } from '../systems/AudioBeeps'
import type { ListRow } from './ListPanel'

/** 队伍列表右侧的标记：跟随「随」、坐骑「骑」 */
export function companionMark(c: CreatureInstance): string {
  const marks = [Companions.follower()?.uid === c.uid ? '随' : '', Companions.mount()?.uid === c.uid ? '骑' : ''].join('')
  return marks ? `[${marks}] ` : ''
}

/** 坐骑能力说明（含未解锁提示与速度） */
export function mountDetail(speciesId: string): string {
  const m = MOUNTS[speciesId]
  if (!m) return '它的体型不适合骑乘。'
  const info = MOUNT_SKILLS[m.skill]
  const locked = info.unlockFlag && !GameState.hasFlag(info.unlockFlag) ? `\n未解锁：${info.lockedHint}` : ''
  return `骑乘能力「${info.label}」：${info.desc}\n移动速度 ×${m.speed}。在户外按 R（或触屏「骑乘」）上下坐骑。${locked}`
}

/**
 * 伙伴详情的同行设置行
 * @param done 操作完成后的回调（提示文字），由菜单负责刷新
 * @author zjh
 * @date 2026-10-15
 */
export function companionRows(c: CreatureInstance, done: (msg: string) => void): ListRow[] {
  const name = battleName(c)
  const following = Companions.follower()?.uid === c.uid
  const rows: ListRow[] = [
    {
      label: following ? '取消跟随' : '设为跟随伙伴',
      detail: following ? `${name}正跟在你身后。` : `让${name}走在你身后；面朝它按确认可以和它互动。`,
      onSelect: () => {
        Companions.setFollower(following ? null : c.uid)
        Sfx.confirm()
        done(following ? `${name}回到了队伍里` : `${name}跟在了你身后！`)
      },
    },
  ]
  if (!MOUNTS[c.speciesId]) return rows
  const isMount = Companions.mount()?.uid === c.uid
  rows.push({
    label: isMount ? '取消坐骑' : '设为坐骑',
    detail: mountDetail(c.speciesId),
    onSelect: () => {
      if (Companions.riding()) {
        Sfx.cancel()
        done('骑乘中不能更换坐骑，先按 R 下来吧')
        return
      }
      Companions.setMount(isMount ? null : c.uid)
      Sfx.confirm()
      done(isMount ? `${name}不再担任坐骑` : `${name}成为了你的坐骑！到户外按 R 骑上它`)
    },
  })
  return rows
}
