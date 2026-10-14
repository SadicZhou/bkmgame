/**
 * 人物与物件贴图：玩家四方向、NPC、告示板、安抚果、异象 / 小事件物件
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { ensure, starPoints } from './textureUtil'

/**
 * 生成全部人物与物件纹理
 * @author zjh
 * @date 2026-10-14
 */
export function paintObjects(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void {
  paintPlayer(scene, g)
  paintNpc(scene, g)
  paintBerry(scene, g)
  paintBoard(scene, g)
  paintEventObjects(scene, g)
}

/**
 * 玩家四方向贴图：spr-player-down / up / left / right
 * @author zjh
 * @date 2026-10-14
 */
function paintPlayer(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void {
  const dirs = ['down', 'up', 'left', 'right'] as const
  for (const dir of dirs) {
    ensure(scene, `spr-player-${dir}`, () => {
      g.clear()
      // 身体（圆润斗篷）
      g.fillStyle(0x5bb8a8, 1)
      g.fillRoundedRect(8, 16, 16, 14, 6)
      // 头
      g.fillStyle(0xffe0bd, 1)
      g.fillCircle(16, 12, 8)
      // 帽子
      g.fillStyle(0xffb347, 1)
      g.fillEllipse(16, 7, 18, 10)
      g.fillStyle(0xff8c42, 1)
      g.fillRoundedRect(8, 6, 16, 4, 2)

      if (dir === 'up') {
        // 背面：帽子盖住后脑 + 背包
        g.fillStyle(0xffb347, 1)
        g.fillEllipse(16, 11, 18, 12)
        g.fillStyle(0xc0704a, 1)
        g.fillRoundedRect(10, 18, 12, 9, 3)
      } else {
        const off = dir === 'left' ? -3 : dir === 'right' ? 3 : 0
        g.fillStyle(0xffffff, 1)
        if (dir !== 'right') g.fillCircle(13 + off, 13, 3)
        if (dir !== 'left') g.fillCircle(19 + off, 13, 3)
        g.fillStyle(0x3a2a2a, 1)
        if (dir !== 'right') g.fillCircle(13.5 + off, 13.5, 1.5)
        if (dir !== 'left') g.fillCircle(19.5 + off, 13.5, 1.5)
        g.fillStyle(0xe07a7a, 1)
        g.fillRoundedRect(14 + off, 17, 4, 2, 1)
      }
      g.generateTexture(`spr-player-${dir}`, 32, 32)
    })
  }
}

function paintNpc(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void {
  ensure(scene, 'spr-npc', () => {
    g.clear()
    g.fillStyle(0xf0a8c8, 1)
    g.fillRoundedRect(8, 16, 16, 14, 6)
    g.fillStyle(0xffe0bd, 1)
    g.fillCircle(16, 12, 8)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(13, 12, 3)
    g.fillCircle(19, 12, 3)
    g.fillStyle(0x3a2a2a, 1)
    g.fillCircle(13.5, 12.5, 1.5)
    g.fillCircle(19.5, 12.5, 1.5)
    g.fillStyle(0xff9bb0, 0.7)
    g.fillCircle(10, 15, 2)
    g.fillCircle(22, 15, 2)
    g.generateTexture('spr-npc', 32, 32)
  })
}

/** 旅人告示板 */
function paintBoard(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void {
  ensure(scene, 'spr-board', () => {
    g.clear()
    g.fillStyle(0x7a5030, 1)
    g.fillRect(7, 18, 3, 13)
    g.fillRect(22, 18, 3, 13)
    g.fillStyle(0xb08050, 1)
    g.fillRoundedRect(2, 4, 28, 18, 3)
    g.fillStyle(0xfff6e0, 1)
    g.fillRect(5, 7, 9, 7)
    g.fillRect(17, 8, 10, 6)
    g.fillStyle(0xff8f6b, 1)
    g.fillCircle(9, 7, 1.5)
    g.fillCircle(22, 8, 1.5)
    g.generateTexture('spr-board', 32, 32)
  })
}

/**
 * 异象 / 小事件物件：星辰碎片、花瓣足迹、熔晶、心火结晶
 * @author zjh
 * @date 2026-10-14
 */
function paintEventObjects(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void {
  ensure(scene, 'obj-star', () => {
    g.clear()
    g.fillStyle(0xfff080, 1)
    g.fillPoints(starPoints(10, 10, 9, 4), true)
    g.fillStyle(0xffffff, 0.9)
    g.fillCircle(10, 10, 2)
    g.generateTexture('obj-star', 20, 20)
  })
  ensure(scene, 'obj-petal', () => {
    g.clear()
    g.fillStyle(0xff9ac0, 1)
    g.fillEllipse(6, 10, 8, 12)
    g.fillEllipse(14, 10, 8, 12)
    g.fillStyle(0xffe0ee, 1)
    g.fillEllipse(10, 6, 6, 8)
    g.generateTexture('obj-petal', 20, 20)
  })
  ensure(scene, 'obj-lava', () => {
    g.clear()
    g.fillStyle(0xff6030, 1)
    g.fillTriangle(10, 1, 3, 10, 17, 10)
    g.fillTriangle(3, 10, 10, 19, 17, 10)
    g.fillStyle(0xffd080, 1)
    g.fillTriangle(10, 4, 7, 10, 13, 10)
    g.generateTexture('obj-lava', 20, 20)
  })
  ensure(scene, 'obj-crystal', () => {
    g.clear()
    g.fillStyle(0xffb040, 1)
    g.fillTriangle(10, 0, 4, 9, 16, 9)
    g.fillTriangle(4, 9, 10, 20, 16, 9)
    g.fillStyle(0xfff0b0, 1)
    g.fillTriangle(10, 3, 7, 9, 13, 9)
    g.generateTexture('obj-crystal', 20, 20)
  })
}

/** 安抚果（战斗抛掷动画用） */
function paintBerry(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void {
  ensure(scene, 'spr-berry', () => {
    g.clear()
    g.fillStyle(0xff7a9a, 1)
    g.fillCircle(8, 9, 6)
    g.fillStyle(0xffffff, 0.7)
    g.fillCircle(6, 7, 2)
    g.fillStyle(0x6ac46a, 1)
    g.fillEllipse(10, 3, 6, 3)
    g.generateTexture('spr-berry', 16, 16)
  })
}
