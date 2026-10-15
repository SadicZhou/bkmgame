/**
 * 第二章剧情节拍（雾泉湖畔·泉守汐）：按旗标推进对话、发放钓竿、触发浮桥演出
 * 1 求助并给旧钓竿 → 2 先去钓一条 → 3 码头斥候 → 4 雾泉螈搭浮桥 → 5 湖心沧澜鲸 → 战后致谢
 * @author zjh
 * @date 2026-10-15
 */

import { BRIDGE_FLAG } from '../../data/lakeMap'
import { GameState } from '../../state/GameState'

/** WorldScene 提供给剧情脚本的能力 */
export interface StoryHost {
  say(lines: string[], after?: () => void): void
  healParty(): void
  toast(msg: string): void
  /** 播放雾泉螈搭桥演出，结束后重绘地图 */
  playBridge(): void
}

type StoryFn = (host: StoryHost, name: string) => void

const has = (k: string) => GameState.hasFlag(k)

/**
 * 泉守汐：每次对话都会顺便为队伍回复（她本就是温泉守望者）
 * @author zjh
 * @date 2026-10-15
 */
function lakeShio(host: StoryHost, name: string): void {
  const say = (lines: string[], after?: () => void) => host.say(lines.map((l) => `${name}：${l}`), after)
  host.healParty()

  if (!has('lake_met_shio')) {
    say(
      [
        '焰迹旅人！你来得正好——我从山道一路追到这里。',
        '湖心的灯台被人罩上了黑色灯罩，湖面结了一层不自然的冰。',
        '雾泉螈们都吓得躲进湖底，守护湖泊的沧澜鲸也痛苦得不肯靠岸……',
        '这把旧钓竿给你。湖里的伙伴受了惊，也许钓上来能问出点什么。',
      ],
      () => {
        GameState.setFlag('lake_met_shio', true)
        GameState.addItem('old_rod', 1)
        host.toast('获得了重要物品「旧钓竿」！')
        host.say(['（面朝湖面按确认就能甩竿。浮漂一沉、冒出「！」时，马上再按一次确认！）'])
      },
    )
    return
  }
  if (!has('lake_first_fish')) {
    say(['先在岸边试试钓竿吧。', '浮漂往下一沉就收竿——别着急，失败了也可以马上再来。'])
    return
  }
  if (!has('scout2_beaten')) {
    say(['你钓上来的小家伙一直往码头的方向吐泡泡……', '码头上那两个穿深蓝斗篷的人，就是罩住灯台的「熄灯会」！', '他们会连着上阵，中间没空回复——准备好了再去。'])
    return
  }
  if (!has(BRIDGE_FLAG)) {
    say(
      ['你把熄灯会赶走了！', '看——雾泉螈们都从湖底浮上来了。', '它们说，愿意搭一座桥，送你去湖心。'],
      () => {
        GameState.setFlag(BRIDGE_FLAG, true)
        host.playBridge()
      },
    )
    return
  }
  if (!has('whale_beaten')) {
    say(['沧澜鲸就在湖心灯台前。', '它不是敌人，只是被灯罩折磨得失控了……请让它平静下来。'])
    return
  }
  say(['湖面的冰化了，灯台又亮了。', '沧澜鲸说，好钓竿是它送给你的谢礼——湖底深处的伙伴也会被吸引过来哦。'])
}

const STORIES: Record<string, StoryFn> = { lake_shio: lakeShio }

/**
 * 执行 NPC 的剧情脚本；没有对应脚本返回 false
 * @author zjh
 * @date 2026-10-15
 */
export function runStory(id: string, host: StoryHost, npcName: string): boolean {
  const fn = STORIES[id]
  if (!fn) return false
  fn(host, npcName)
  return true
}
