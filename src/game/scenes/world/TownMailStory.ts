/**
 * 支线 S0-2「小镇送信」：阿禾侧对话（接取 / 催进度 / 领奖）
 * @author zjh
 * @date 2026-11-09
 */

import { Sfx } from '../../systems/AudioBeeps'
import { TOWN_MAIL_REWARD_COUNT, talkTownMailElder } from '../../systems/TownMailQuest'
import type { StoryHost } from './StoryEvents'

/**
 * 插入阿禾对话；已完成则返回 false 交给后续剧情
 * @author zjh
 * @date 2026-11-09
 */
export function tryTownMailElder(host: StoryHost, name: string): boolean {
  const r = talkTownMailElder()
  if (r.kind === 'skip') return false
  const say = (lines: string[], after?: () => void) =>
    host.say(
      lines.map((l) => `${name}：${l}`),
      after,
    )
  if (r.kind === 'start') {
    say(r.lines, () => {
      host.toast('支线「小镇送信」开始')
      host.refreshHud()
    })
    return true
  }
  if (r.kind === 'wait') {
    say(r.lines)
    return true
  }
  say(r.lines, () => {
    Sfx.win()
    host.toast(`获得急救喷雾 ×${TOWN_MAIL_REWARD_COUNT}`)
    host.toast('支线「小镇送信」完成')
    host.refreshHud()
  })
  return true
}
