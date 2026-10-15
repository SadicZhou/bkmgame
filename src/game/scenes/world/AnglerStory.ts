/**
 * 钓鱼少年澈：每日钓鱼大赛（出题 → 达标 → 领奖，雨天限定题）、打破澈的纪录、钓鱼记录集齐大奖
 * 规则见 docs/v3.2-lake-polish-design.md 第 4.4 节、docs/v3.3-polish-design.md 第 3 节。
 * @author zjh
 * @date 2026-10-15
 */

import { SPECIES } from '../../data/creatures'
import { ENCOUNTERS } from '../../data/encounters'
import { CONTEST_COINS, FISH_ORDER, MASTER_REWARD, RAIN_CONTEST, RECORD_BREAK_COINS } from '../../data/fishing'
import { ITEMS } from '../../data/items'
import { GameState } from '../../state/GameState'
import { rodKindOf } from '../../systems/Fishing'
import {
  anglerRecord,
  contestFor,
  contestItem,
  fishLogComplete,
  fishLogCount,
  recordFlag,
  todayContest,
  unclaimedRecords,
  type FishContest,
} from '../../systems/FishLog'
import { weatherOf } from '../../systems/WorldClock'
import type { StoryHost } from './StoryEvents'

/** 题库：当前钓竿在湖畔能钓到的非稀有鱼 */
function contestPool(): string[] {
  const rod = rodKindOf((id) => GameState.itemCount(id)) ?? 'rod'
  const entries = ENCOUNTERS.lake?.[rod] ?? []
  return entries.filter((e) => SPECIES[e.speciesId].rarity !== 'rare' && !e.weather).map((e) => e.speciesId)
}

/** 题目描述 */
function contestText(c: FishContest): string {
  const target = `${c.minSize} cm 以上的「${SPECIES[c.speciesId].name}」`
  return c.rain ? `【雨天限定】趁雨还没停，钓到 ${target}！` : `钓到 ${target}。`
}

/** 大赛奖励：雨天限定题奖励更高 */
function contestReward(c: FishContest, day: number): { coins: number; itemId: string } {
  return c.rain ? { coins: RAIN_CONTEST.coins, itemId: RAIN_CONTEST.itemId } : { coins: CONTEST_COINS, itemId: contestItem(day) }
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

  const broken = unclaimedRecords(w, GameState.hasFlag)
  if (broken.length) {
    const names = broken.map((id) => `${SPECIES[id].name}（${w.fishLog?.[id]?.best} cm > ${anglerRecord(id)} cm）`)
    const coins = RECORD_BREAK_COINS * broken.length
    say(['什么？！你打破了我的纪录：', ...names, '……好吧，我认输！这是给新纪录保持者的奖励。'], () => {
      for (const id of broken) GameState.setFlag(recordFlag(id), true)
      GameState.coins += coins
      host.refreshHud()
      host.toast(`打破纪录 ×${broken.length}，获得 ${coins} 焰币！`)
    })
    return
  }

  const contest = todayContest(w, day)
  if (contest?.claimed) {
    say([`今天的大赛结束啦，明天再来挑战吧！`, `（钓鱼记录 ${fishLogCount(w)}/${FISH_ORDER.length}。听说起雾的日子，湖面会浮起一盏小灯……）`])
    return
  }
  if (contest?.done) {
    const reward = contestReward(contest, day)
    say([`真的钓到了 ${contest.minSize} cm 以上的${SPECIES[contest.speciesId].name}！今天的冠军就是你！`], () => {
      contest.claimed = true
      GameState.coins += reward.coins
      GameState.addItem(reward.itemId, 1)
      host.refreshHud()
      host.toast(`获得 ${reward.coins} 焰币和${ITEMS[reward.itemId].name}！`)
    })
    return
  }
  if (contest) {
    const stopped = contest.rain && weatherOf(w, 'lake') !== 'rain'
    say([`今天的题目：${contestText(contest)}`, stopped ? '雨停了……等下次下雨再钓吧，今天之内都算数！' : '钓上来以后记得回来告诉我！'])
    return
  }

  const pool = contestPool()
  if (!pool.length) return
  const rain = weatherOf(w, 'lake') === 'rain'
  const next = contestFor(day, pool, rain)
  w.fishContest = next
  const reward = contestReward(next, day)
  say([
    rain ? '下雨天鱼儿特别活跃！今天是「雨天限定」大赛！' : '欢迎来到雾泉湖「钓鱼大赛」！每天一道题。',
    `今天的题目：${contestText(next)}`,
    `赢了可以拿到 ${reward.coins} 焰币和${rain ? ITEMS[reward.itemId].name : '奖品'}哦。`,
  ])
}
