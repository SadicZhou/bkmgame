/**
 * 支线 S3-2「菇菇派对」剧情：
 * 伞灵菇老奶奶 委托 → 林中采集 8 种菇（白天 4 / 夜晚 4，采过即消失）→ 交付得「资质果」×1 与称号「菇菇朋友」
 * @author zjh
 * @date 2026-10-15
 */

import { MUSHROOMS, MUSH_FLAGS, mushCount, mushFlag, type MushroomDef } from '../../data/mushrooms'
import { GameState } from '../../state/GameState'
import { Sfx } from '../../systems/AudioBeeps'
import type { StoryHost } from './StoryEvents'

const has = (k: string) => GameState.hasFlag(k)
const TOTAL = MUSHROOMS.length

/** 还差的白天 / 夜晚菇数量提示 */
function remainHint(): string {
  const left = MUSHROOMS.filter((m) => !has(mushFlag(m.id)))
  const day = left.filter((m) => !m.night).length
  const night = left.length - day
  const parts = [day ? `白天的 ${day} 种` : '', night ? `夜里的 ${night} 种` : ''].filter(Boolean)
  return `还差${parts.join('、')}。`
}

/**
 * 伞灵菇老奶奶：委托 → 进度 → 交付奖励 → 之后的闲聊
 * @author zjh
 * @date 2026-10-15
 */
function granny(host: StoryHost, name: string): void {
  const say = (lines: string[], after?: () => void) => host.say(lines.map((l) => `${name}：${l}`), after)
  if (has(MUSH_FLAGS.done)) {
    say(['菇菇朋友，你来啦～', '林子里的菇菇们说，最近夜里亮堂多了。', '要是伙伴们饿了，就回来找奶奶喝菇菇汤。'])
    return
  }
  if (!has(MUSH_FLAGS.quest)) {
    say(
      [
        '哎呀，是旅人呀。奶奶在准备一场「菇菇派对」……',
        '可是腿脚不好，林子里的菇菇采不齐。',
        '白天有红伞菇、金鸡油菌、圆墩牛肝菌、粉褶平菇；',
        '夜里还有会发光的蓝灯菇、紫铃菇、月牙菇和星屑菇。',
        '你能帮奶奶把这 8 种都采来吗？夜里的菇，要等天黑了才冒头哦。',
      ],
      () => {
        GameState.setFlag(MUSH_FLAGS.quest, true)
        Sfx.confirm()
        host.toast('接下了支线「菇菇派对」！')
        host.refreshNpcs()
        host.say(['（采集点会在回音林的空地上出现。夜里的菇需要等到夜晚——在旅人小屋休息可以直接等到天黑。）'])
      },
    )
    return
  }
  const n = mushCount(has)
  if (n < TOTAL) {
    say([`采到 ${n}/${TOTAL} 种啦，真能干！`, remainHint()])
    return
  }
  say(
    ['哇……8 种菇菇全齐了！闻闻，香不香？', '这是奶奶珍藏的「资质果」，给你的伙伴尝尝吧。', '从今天起，你就是奶奶的「菇菇朋友」啦！'],
    () => {
      GameState.addItem('talent_fruit', 1)
      GameState.setFlag(MUSH_FLAGS.title, true)
      GameState.setFlag(MUSH_FLAGS.done, true)
      Sfx.win()
      host.toast('获得了「资质果」×1 和称号「菇菇朋友」！')
      host.say(['（资质果可以在背包里对伙伴使用：指定一项资质 +2。）'])
    },
  )
}

/**
 * 采集点：采下并淡出；8 种齐了提示回去找奶奶
 * @author zjh
 * @date 2026-10-15
 */
function pick(m: MushroomDef) {
  return (host: StoryHost): void => {
    if (has(mushFlag(m.id))) return
    GameState.setFlag(mushFlag(m.id), true)
    Sfx.confirm()
    const n = mushCount(has)
    const tail = n >= TOTAL ? ['8 种菇菇都齐了！回去找伞灵菇老奶奶吧。'] : [`（菇菇 ${n}/${TOTAL}）`]
    host.say([`（${m.desc}）`, `采到了「${m.name}」！`, ...tail])
    host.refreshNpcs()
  }
}

export const MUSHROOM_STORIES: Record<string, (host: StoryHost, name: string) => void> = {
  mushroom_granny: granny,
  ...Object.fromEntries(MUSHROOMS.map((m) => [`mush_${m.id}`, pick(m)])),
}
