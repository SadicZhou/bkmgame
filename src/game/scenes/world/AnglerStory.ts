/**
 * 钓鱼少年澈：每日钓鱼大赛（出题 → 达标 → 领奖）与钓鱼记录集齐大奖
 * 规则见 docs/v3.2-lake-polish-design.md 第 4.4 节。
 * @author zjh
 * @date 2026-10-15
 */

import { SPECIES } from '../../data/creatures'
import { ENCOUNTERS } from '../../data/encounters'
import { CONTEST_COINS, FISH_ORDER, MASTER_REWARD } from '../../data/fishing'
import { ITEMS } from '../../data/items'
import { GameState } from '../../state/GameState'
import { rodKindOf } from '../../systems/Fishing'
import { contestFor, contestItem, fishLogComplete, fishLogCount, todayContest } from '../../systems/FishLog'
import type { StoryHost } from './StoryEvents'

/** 题库：当前钓竿在湖畔能钓到的非稀有鱼 */
function contestPool(): string[] {
  const rod = rodKindOf((id) => GameState.itemCount(id)) ?? 'rod'
  const entries = ENCOUNTERS.lake?.[rod] ?? []
  return entries.filter((e) => SPECIES[e.speciesId].rarity !== 'rare' && !e.weather).map((e) => e.speciesId)
}

/**
 * 与澈对话
 * @author zjh
 * @date 2026-10-15
 */
export function anglerStory(host: StoryHost, name: string): void {
  const say = (lines: string[], after?: () => void) => host.say(lines.map((l) => `${name}：${l}`), after)
  const w = GameState.world
  const day = GameState.day()

  if (!GameState.itemCount('old_rod') && !GameState.itemCount('good_rod')) {
    say(['你还没有钓竿呀？去找泉守汐姐姐吧！', '等你有了钓竿，来参加我的「钓鱼大赛」！'])
    return
  }

  if (fishLogComplete(w) && !GameState.hasFlag(MASTER_REWARD.flag)) {
    say(['哇……湖里 6 种鱼你全都钓到了！连雾灯鳐都有！', '这是「钓鱼大师」的奖励，收下吧！'], () => {
      GameState.setFlag(MASTER_REWARD.flag, true)
      GameState.coins += MASTER_REWARD.coins
      GameState.addItem(MASTER_REWARD.itemId, MASTER_REWARD.count)
      host.refreshHud()
      host.toast(`获得 ${MASTER_REWARD.coins} 焰币和${ITEMS[MASTER_REWARD.itemId].name} ×${MASTER_REWARD.count}！`)
    })
    return
  }

  const contest = todayContest(w, day)
  if (contest?.claimed) {
    say([`今天的大赛结束啦，明天再来挑战吧！`, `（钓鱼记录 ${fishLogCount(w)}/${FISH_ORDER.length}。听说起雾的日子，湖面会浮起一盏小灯……）`])
    return
  }
  if (contest?.done) {
    const itemId = contestItem(day)
    say([`真的钓到了 ${contest.minSize} cm 以上的${SPECIES[contest.speciesId].name}！今天的冠军就是你！`], () => {
      contest.claimed = true
      GameState.coins += CONTEST_COINS
      GameState.addItem(itemId, 1)
      host.refreshHud()
      host.toast(`获得 ${CONTEST_COINS} 焰币和${ITEMS[itemId].name}！`)
    })
    return
  }
  if (contest) {
    say([`今天的题目：钓到 ${contest.minSize} cm 以上的「${SPECIES[contest.speciesId].name}」。`, '钓上来以后记得回来告诉我！'])
    return
  }

  const pool = contestPool()
  if (!pool.length) return
  const next = contestFor(day, pool)
  w.fishContest = next
  say([
    '欢迎来到雾泉湖「钓鱼大赛」！每天一道题。',
    `今天的题目：钓到 ${next.minSize} cm 以上的「${SPECIES[next.speciesId].name}」！`,
    `赢了可以拿到 ${CONTEST_COINS} 焰币和奖品哦。`,
  ])
}
