/**
 * 移动端虚拟方向键与动作键
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'

export interface TouchInput {
  left: boolean
  right: boolean
  up: boolean
  down: boolean
  action: boolean
  menu: boolean
}

/**
 * 在场景角落绘制简易触控垫
 * @author zjh
 * @date 2026-10-14
 */
export class TouchPad {
  readonly input: TouchInput = {
    left: false,
    right: false,
    up: false,
    down: false,
    action: false,
    menu: false,
  }

  private actionPulse = false
  private menuPulse = false
  private readonly root: Phaser.GameObjects.Container

  constructor(scene: Phaser.Scene) {
    const { width, height } = scene.scale
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(1000)

    const mkDir = (x: number, y: number, label: string, key: keyof TouchInput) => {
      const r = scene.add.circle(x, y, 28, 0x1a3a2a, 0.55).setStrokeStyle(2, 0x7ec8a3)
      const t = scene.add.text(x, y, label, { fontSize: '16px', color: '#e8f5ee' }).setOrigin(0.5)
      r.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.input[key] = true
        })
        .on('pointerup', () => {
          this.input[key] = false
        })
        .on('pointerout', () => {
          this.input[key] = false
        })
      this.root.add([r, t])
    }

    const baseX = 90
    const baseY = height - 90
    mkDir(baseX - 50, baseY, '←', 'left')
    mkDir(baseX + 50, baseY, '→', 'right')
    mkDir(baseX, baseY - 50, '↑', 'up')
    mkDir(baseX, baseY + 50, '↓', 'down')

    const mkPulse = (x: number, y: number, label: string, field: 'action' | 'menu') => {
      const r = scene.add.circle(x, y, 32, 0x3a2a1a, 0.55).setStrokeStyle(2, 0xe8a838)
      const t = scene.add.text(x, y, label, { fontSize: '14px', color: '#f0e6c8' }).setOrigin(0.5)
      r.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (field === 'action') this.actionPulse = true
        else this.menuPulse = true
      })
      this.root.add([r, t])
    }

    mkPulse(width - 70, height - 120, '对话', 'action')
    mkPulse(width - 70, height - 50, '菜单', 'menu')

    // 仅窄屏默认显示；宽屏半透明提示可点
    const isTouch = scene.sys.game.device.input.touch
    this.root.setAlpha(isTouch ? 0.95 : 0.35)
  }

  /** 每帧消费一次性按键 */
  consumeAction(): boolean {
    if (this.actionPulse) {
      this.actionPulse = false
      return true
    }
    return false
  }

  consumeMenu(): boolean {
    if (this.menuPulse) {
      this.menuPulse = false
      return true
    }
    return false
  }

  destroy(): void {
    this.root.destroy(true)
  }
}
