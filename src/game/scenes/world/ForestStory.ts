/**
 * 第三章剧情节拍（回音林）：巡护员苔按进度给提示（组队战后顺便帮队伍回复），四音石的敲击反馈
 * 剧本见 docs/story/03-第三章-回音.md
 * @author zjh
 * @date 2026-10-15
 */

import { ECHO_STONES, FOREST_FLAGS } from '../../data/forestMap'
import { GameState } from '../../state/GameState'
import { Sfx } from '../../systems/AudioBeeps'
import { pressStone, stoneStep } from '../../systems/EchoStones'
import type { StoryHost } from './StoryEvents'

const has = (k: string) => GameState.hasFlag(k)

/**
 * 巡护员苔：初见 → 组队提示 → 迷宫与音石提示 → 深处提示 → 战后
 * @author zjh
 * @date 2026-10-15
 */
export function forestMoss(host: StoryHost, name: string): void {
  const say = (lines: string[], after?: () => void) => host.say(lines.map((l) => `${name}：${l}`), after)

  if (!has(FOREST_FLAGS.metMoss)) {
    host.say(
      [
        `${name}：哟，旅人！好久不见……不对，先别说话，你听。`,
        '（安静。只有风声。）',
        `${name}：听见了吗？什么都没有。蓬尾鼠不叫，旋叶蝠也不叫。我巡林五年，从没遇到过。`,
        `${name}：林子里有穿黑斗篷的人，带着一只黑色的鸟。我一个人追不上——你跟我一起！`,
      ],
      () => {
        GameState.setFlag(FOREST_FLAGS.metMoss, true)
        host.redraw()
      },
    )
    return
  }
  if (!has(FOREST_FLAGS.teamBattle)) {
    say(['前面拦路的就是熄灯会的巡林者。', '你的伙伴歇一歇——这一场交给我的森冠狐！'])
    return
  }

  host.healParty()
  if (!has(FOREST_FLAGS.stonesSolved)) {
    say([
      '我帮你的伙伴们回复好了。',
      '记住：回声从哪边来，路往往在另一边。最后一个岔口……跟着发光的伞灵菇走。',
      `空地四角有四块音石，古树根上刻着敲响的顺序。（已点亮 ${stoneStep(GameState)}/${ECHO_STONES.length}）`,
    ])
    return
  }
  if (!has(FOREST_FLAGS.kindler)) {
    say(['藤蔓退开了！伙伴们的叫声回来了一点。', '深处有个提着灯的红头发女孩……小心，她身边那只黑鸟不简单。'])
    return
  }
  if (!has(FOREST_FLAGS.deer)) {
    say(['林心古树就在最里面。', '林语鹿每隔几回合就会让回声响彻全场，把双方的强化、削弱都清掉——别指望一直叠能力。'])
    return
  }
  say(['整片林子都在唱歌呢。', '打开菜单看看「羁绊」吧——你的伙伴们，比你想的更在乎你。'])
}

/**
 * 敲响音石：亮起 / 全亮 / 敲错全灭，有变化时重绘地图
 * @author zjh
 * @date 2026-10-15
 */
function stoneStory(stoneId: string) {
  return (host: StoryHost): void => {
    const stone = ECHO_STONES.find((s) => s.id === stoneId)
    if (!stone) return
    const result = pressStone(GameState, stoneId)
    switch (result) {
      case 'done':
        host.say([`${stone.name}音石静静地亮着绿光。`])
        return
      case 'already':
        host.say([`${stone.name}音石已经亮了。`])
        return
      case 'wrong':
        Sfx.cancel()
        host.say([`（${stone.sound}……）`, '低沉的回声在林间荡开——四块音石全部熄灭了。', '（古树根上的刻字也许记着顺序。）'], () => host.redraw())
        return
      case 'lit':
        Sfx.confirm()
        host.say([`（${stone.sound}——）`, `${stone.name}音石亮起了绿光！`], () => host.redraw())
        return
      case 'solved':
        Sfx.win()
        host.say(
          [`（${stone.sound}——）`, '四块音石同时亮起，回声第一次在林间响了起来！', '北边深处传来沙沙声——缠住小路的藤蔓退开了。', '……远处，伙伴们的叫声回来了一点。'],
          () => host.redraw(),
        )
    }
  }
}

/** 回音林的剧情脚本表（并入 StoryEvents.STORIES） */
export const FOREST_STORIES: Record<string, (host: StoryHost, name: string) => void> = {
  forest_moss: forestMoss,
  ...Object.fromEntries(ECHO_STONES.map((s) => [`stone_${s.id}`, stoneStory(s.id)])),
}
