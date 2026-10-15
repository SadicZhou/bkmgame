/**
 * 路人闲聊：两个停着的路人相距 1～2 格时，偶尔面对面停下来，
 * 先后冒出短句（chat）或表情（emote）气泡，聊完各自继续闲逛。
 * @author zjh
 * @date 2026-10-15
 */

import Phaser from 'phaser'
import type { NpcDef } from '../../data/maps'
import { showEmote } from './NpcEmote'
import type { NpcWalkers } from './NpcWalkers'

/** 两次检查之间的间隔 */
const CHECK_MS = 2500
/** 每次检查时发起闲聊的概率 */
const CHAT_CHANCE = 0.45
/** 第二个人回话的延迟 */
const REPLY_DELAY = 1100
/** 一轮闲聊两人原地停留的时长 */
const HOLD_MS = 3200
/** 同一个人两次闲聊的最短间隔 */
const CHAT_COOLDOWN = 12000
const BUBBLE_HOLD = 1300

/** 取一句闲聊；没有 chat 就用 emote */
function lineOf(npc: NpcDef): string {
  return npc.chat?.length ? Phaser.Utils.Array.GetRandom(npc.chat) : npc.emote ?? '…'
}

export class NpcChatter {
  private readonly scene: Phaser.Scene
  private readonly walkers: NpcWalkers
  private timer = CHECK_MS

  constructor(scene: Phaser.Scene, walkers: NpcWalkers) {
    this.scene = scene
    this.walkers = walkers
  }

  /**
   * 每帧推进；paused（对话 / 菜单 / 过场）时不发起新的闲聊
   * @author zjh
   * @date 2026-10-15
   */
  update(delta: number, paused: boolean): void {
    if (paused || (this.timer -= delta) > 0) return
    this.timer = CHECK_MS
    if (Math.random() > CHAT_CHANCE) return
    const pairs = this.walkers.chatPairs()
    if (!pairs.length) return
    const [a, b] = Phaser.Utils.Array.GetRandom(pairs)
    this.start(a, b)
  }

  /** 让指定两人闲聊一轮（测试 / 调试也可直接调用）；成功返回 true */
  start(a: NpcDef, b: NpcDef): boolean {
    const sprites = this.walkers.faceOff(a, b, HOLD_MS, CHAT_COOLDOWN)
    if (!sprites) return false
    const [sa, sb] = sprites
    showEmote(this.scene, lineOf(a), sa, -38, BUBBLE_HOLD)
    this.scene.time.delayedCall(REPLY_DELAY, () => {
      if (sb.active) showEmote(this.scene, lineOf(b), sb, -38, BUBBLE_HOLD)
    })
    return true
  }
}
