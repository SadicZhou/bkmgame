/**
 * 统一输入：键盘（方向键/WASD、空格/回车/Z、Esc/X、R 骑乘）+ 触控垫
 * 每帧调用一次 poll()，得到"持续按住"与"本帧刚按下"两类状态。
 * 按下沿通过 keydown 事件缓冲，避免一帧内按下又抬起的快速轻点被丢失。
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import type { TouchPad } from './TouchPad'

export interface InputFrame {
  /** 持续按住的方向（用于走路） */
  dx: number
  dy: number
  /** 本帧刚按下（用于菜单导航） */
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  confirm: boolean
  cancel: boolean
  /** 本帧刚按下骑乘键（R / 触屏「骑乘」） */
  ride: boolean
}

type Action = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'ride'

/** 键盘 code → 动作 */
const CODE_ACTION: Record<string, Action> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'confirm',
  Enter: 'confirm',
  NumpadEnter: 'confirm',
  KeyZ: 'confirm',
  Escape: 'cancel',
  KeyX: 'cancel',
  KeyR: 'ride',
}

type KeyMap = Record<string, Phaser.Input.Keyboard.Key>

export class InputKeys {
  private readonly keys: KeyMap | null
  private readonly touch?: TouchPad
  /** 按下沿队列：每帧只消费一个，连按不丢；上限防止积压 */
  private readonly pressed: Action[] = []
  private prevTouch = { up: false, down: false, left: false, right: false }

  constructor(scene: Phaser.Scene, touch?: TouchPad) {
    this.touch = touch
    const kb = scene.input.keyboard
    // addKeys 同时开启按键捕获，防止方向键/空格滚动页面
    this.keys = kb
      ? (kb.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE,ENTER,Z,ESC,X,R') as KeyMap)
      : null
    if (kb) {
      const onKey = (e: KeyboardEvent) => {
        const action = CODE_ACTION[e.code]
        if (action && !e.repeat && this.pressed.length < 6) this.pressed.push(action)
      }
      kb.on('keydown', onKey)
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.off('keydown', onKey))
    }
  }

  private isDown(...names: string[]): boolean {
    return !!this.keys && names.some((n) => this.keys![n]?.isDown)
  }

  /**
   * 读取本帧输入（每帧仅调用一次）
   * @author zjh
   * @date 2026-10-14
   */
  poll(): InputFrame {
    const t = this.touch?.input
    const tUp = !!t?.up
    const tDown = !!t?.down
    const tLeft = !!t?.left
    const tRight = !!t?.right
    const k = this.pressed.shift()

    const frame: InputFrame = {
      dx: 0,
      dy: 0,
      up: k === 'up' || (tUp && !this.prevTouch.up),
      down: k === 'down' || (tDown && !this.prevTouch.down),
      left: k === 'left' || (tLeft && !this.prevTouch.left),
      right: k === 'right' || (tRight && !this.prevTouch.right),
      confirm: k === 'confirm' || !!this.touch?.consumeAction(),
      cancel: k === 'cancel' || !!this.touch?.consumeMenu(),
      ride: k === 'ride' || !!this.touch?.consumeRide(),
    }
    this.prevTouch = { up: tUp, down: tDown, left: tLeft, right: tRight }

    // 持续按住，或本帧轻点过，都算一次移动意图
    if (this.isDown('LEFT', 'A') || tLeft || frame.left) frame.dx = -1
    else if (this.isDown('RIGHT', 'D') || tRight || frame.right) frame.dx = 1
    else if (this.isDown('UP', 'W') || tUp || frame.up) frame.dy = -1
    else if (this.isDown('DOWN', 'S') || tDown || frame.down) frame.dy = 1
    return frame
  }
}
