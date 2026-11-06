/**
 * 支线 S3-1「回音石的歌」剧情
 * @author zjh
 * @date 2026-11-06
 */

import { GameState } from '../../state/GameState'
import { Sfx } from '../../systems/AudioBeeps'
import {
  EXTRA_SONG_STONES,
  hearMelody,
  makeBellcat,
  pressSongStone,
  songActive,
  songStoneById,
  SONG_STONES,
} from '../../systems/MelodyQuest'
import type { StoryFn, StoryHost } from './StoryEvents'

/**
 * 林心古树下的老铃铛
 * @author zjh
 * @date 2026-11-06
 */
function oldBell(host: StoryHost): void {
  const r = hearMelody()
  host.say(r.lines, () => {
    if (r.first) {
      host.toast('记住六音旋律，去敲空地的音石')
      host.refreshNpcs()
      host.redraw()
    }
  })
}

/**
 * 支线敲石反馈；主线已解开时由本逻辑接管四音石
 * @author zjh
 * @date 2026-11-06
 */
export function trySongStone(host: StoryHost, stoneId: string): boolean {
  if (!songActive() && !GameState.hasFlag(SONG_DONE)) return false
  if (!songActive()) {
    const stone = songStoneById(stoneId)
    if (stone) host.say([`${stone.name}音石还留着绿光，像在哼那支歌。`])
    return true
  }
  const stone = songStoneById(stoneId)
  if (!stone) return false
  const result = pressSongStone(stoneId)
  switch (result) {
    case 'need_hear':
      host.say(['（音石沉默着。去林心古树下听听那只老铃铛吧。）'])
      return true
    case 'done':
      host.say([`${stone.name}音石还留着绿光，像在哼那支歌。`])
      return true
    case 'already':
      host.say([`${stone.name}音石已经亮了。`])
      return true
    case 'wrong': {
      Sfx.cancel()
      host.say(
        [`（${stone.sound}……）`, '旋律断了——六块音石一齐熄灭。', '（再去听听老铃铛，也许能想起来。）'],
        () => host.redraw(),
      )
      return true
    }
    case 'lit': {
      Sfx.confirm()
      const n = SONG_STONES.findIndex((s) => s.id === stoneId) + 1
      host.say([`（${stone.sound}——）`, `${stone.name}音石亮起！（${n}/${SONG_STONES.length}）`], () => host.redraw())
      return true
    }
    case 'solved': {
      Sfx.win()
      const cat = makeBellcat()
      const where = GameState.addCreature(cat)
      host.say(
        [
          `（${stone.sound}——）`,
          '六块音石齐鸣，林子里忽然多出一声清脆的铃响。',
          '一只脖子挂着小铃铛的猫从树根后探出头，尾巴一甩——跟着你了。',
          where === 'party' ? '铃铛猫加入了队伍！' : '队伍已满，铃铛猫先寄存在旅人小屋。',
        ],
        () => {
          host.toast('支线「回音石的歌」完成')
          host.refreshHud()
          host.redraw()
        },
      )
      return true
    }
  }
}

function extraStone(id: string): StoryFn {
  return (host) => {
    trySongStone(host, id)
  }
}

export const SONG_STORIES: Record<string, StoryFn> = {
  old_bell: oldBell,
  ...Object.fromEntries(EXTRA_SONG_STONES.map((s) => [`stone_${s.id}`, extraStone(s.id)])),
}
