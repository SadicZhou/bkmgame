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

  if (GameState.hasFlag('game_clear') && !GameState.hasFlag('fish_nation_done')) {
    nation(say, host)
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

/** 全国四钓点：每处一道题，答对记一处 */
const NATION_SPOTS = [
  { story: 'fish_q_lake', flag: 'fish_spot_lake', place: '雾泉', question: '只在起雾时浮上湖面的是哪一种？', answer: '雾灯鳐', options: ['泡泡鱼', '雾灯鳐', '沧澜鲸'] },
  { story: 'fish_q_cloud', flag: 'fish_spot_cloud', place: '云海', question: '在云海里游的稀有伙伴叫什么？', answer: '云鳍鱼', options: ['泡泡鱼', '云鳍鱼', '珊冠鱼'] },
  { story: 'fish_q_ice', flag: 'fish_spot_ice', place: '冰湖', question: '只在下雪的夜里出现的稀有伙伴叫什么？', answer: '冰晶狐', options: ['雪团兔', '冰晶狐', '霜铃鹤'] },
  { story: 'fish_q_mine', flag: 'fish_spot_mine', place: '矿道', question: '只在晴天的峡谷里出现的稀有伙伴叫什么？', answer: '琥珀精', options: ['岩甲虫', '琥珀精', '磐角犀'] },
] as const

/**
 * 通关后的全国钓鱼大赛：四处答完，澈交出金钓竿
 * @author zjh
 * @date 2026-10-19
 */
function nation(say: (lines: string[]) => void, host: StoryHost): void {
  const done = NATION_SPOTS.filter((s) => GameState.hasFlag(s.flag))
  if (done.length === NATION_SPOTS.length) {
    GameState.addItem('gold_rod', 1)
    GameState.setFlag('fish_nation_done', true)
    say(['四处都答对了！这根金钓竿给你。', '带着它，稀有伙伴会更愿意露面。'])
    host.toast('获得了重要物品「金钓竿」')
    return
  }
  GameState.setFlag('fish_nation', true)
  const left = NATION_SPOTS.filter((s) => !GameState.hasFlag(s.flag))
    .map((s) => s.place)
    .join('、')
  say(['湖上的大赛你已经玩过啦。全国的还没开始。', '雾泉、云海、冰湖、矿道地下河，四处各一题。', `还剩：${left}。（${done.length}/4）`])
}

/**
 * 钓点木牌出题；答对记下这一处
 * @author zjh
 * @date 2026-10-19
 */
export function fishSpotStory(host: StoryHost, storyId: string): void {
  const spot = NATION_SPOTS.find((s) => s.story === storyId)
  if (!spot || GameState.hasFlag(spot.flag)) return
  host.say([`钓点木牌：${spot.place}。`, `钓点木牌：${spot.question}`], () => {
    host.choose(
      spot.place,
      spot.options.map((label) => ({ id: label, label })),
      (id) => {
        if (id !== spot.answer) {
          host.say(['钓点木牌：不对。再想想。'])
          return
        }
        GameState.setFlag(spot.flag, true)
        const n = NATION_SPOTS.filter((s) => GameState.hasFlag(s.flag)).length
        host.say([`钓点木牌：对了。${spot.place}这一处算你过了。（${n}/4）`])
      },
    )
  })
}
