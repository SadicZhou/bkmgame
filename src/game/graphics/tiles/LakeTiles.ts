/**
 * 雾泉湖畔图块（32×32）：冰面（裂纹 + 反光）、湖岸沙地、码头 / 浮桥木板（透明底，叠在水面动画上）
 * @author zjh
 * @date 2026-10-15
 */

import Phaser from 'phaser'
import { paintCanvas, type PixelPen } from './PixelPen'

const T = 32

/** 冰面：浅蓝底、白色斜向反光、细裂纹 */
function paintIce(scene: Phaser.Scene): void {
  for (let v = 0; v < 2; v++) {
    paintCanvas(scene, `tile-ice-${v}`, T, T, 611 + v * 17, (p) => {
      p.fill(0xbfe6f5)
      p.speckle(0xd8f2fb, 18, 2)
      p.speckle(0xa6d6ec, 10, 1)
      // 斜向高光条
      for (let i = 0; i < 10; i++) p.px(4 + i + v * 8, 18 - i, 0xffffff, 0.85)
      for (let i = 0; i < 5; i++) p.px(6 + i + v * 8, 22 - i, 0xffffff, 0.6)
      crack(p, p.int(4, 26), p.int(2, 8))
      p.px(p.int(3, 28), p.int(3, 28), 0xffffff)
    })
  }
}

/** 一条向下蜿蜒的细裂纹 */
function crack(p: PixelPen, x: number, y: number): void {
  for (let i = 0; i < 12 && y < T - 1; i++) {
    p.px(x, y, 0x8cc4dc)
    x += p.int(-1, 1)
    y += 1
  }
}

/** 湖岸沙地：浅沙色 + 小贝壳 + 卵石 */
function paintSand(scene: Phaser.Scene): void {
  for (let v = 0; v < 2; v++) {
    paintCanvas(scene, `tile-sand-${v}`, T, T, 651 + v * 11, (p) => {
      p.fill(0xeeddb0)
      p.speckle(0xe0cc98, 28, 2)
      p.speckle(0xf8ecc8, 14, 1)
      const sx = p.int(4, 24)
      const sy = p.int(4, 24)
      p.rect(sx, sy, 3, 2, 0xf5c8c0)
      p.px(sx + 1, sy, 0xffe8e0)
      p.rect(p.int(3, 26), p.int(3, 26), 2, 2, 0xb8a888)
    })
  }
}

/**
 * 浮桥（竖向，中间 22px 宽，两侧透明露出水面，带两根缆绳）
 * @author zjh
 * @date 2026-10-15
 */
function paintBridge(scene: Phaser.Scene): void {
  paintCanvas(scene, 'tile-bridge-0', T, T, 721, (p) => {
    const x0 = 5
    const w = 22
    p.rect(x0 - 1, 0, 1, T, 0x5a3a20, 0.5)
    p.rect(x0 + w, 0, 1, T, 0x5a3a20, 0.5)
    for (let row = 0; row < 4; row++) {
      const y = row * 8
      p.rect(x0, y, w, 7, row % 2 ? 0xb88a58 : 0xc6996a)
      p.rect(x0, y, w, 1, 0xdcb684)
      p.rect(x0, y + 7, w, 1, 0x7a5432)
      p.px(x0 + 2, y + 3, 0x6a4628)
      p.px(x0 + w - 3, y + 3, 0x6a4628)
      p.speckle(0xa87a4a, 4, 1, x0 + 3, y + 1, w - 6, 5)
    }
    p.rect(x0 - 3, 0, 2, T, 0xe8d8a8)
    p.rect(x0 + w + 1, 0, 2, T, 0xe8d8a8)
    for (let y = 3; y < T; y += 8) {
      p.rect(x0 - 3, y, 2, 2, 0x8a6a40)
      p.rect(x0 + w + 1, y, 2, 2, 0x8a6a40)
    }
  })
}

/**
 * 码头：整格竖向木板（相邻格无缝拼接），上沿是朝湖一侧的深色边与木桩
 * @author zjh
 * @date 2026-10-15
 */
function paintDock(scene: Phaser.Scene): void {
  paintCanvas(scene, 'tile-dock-0', T, T, 701, (p) => {
    for (let col = 0; col < 4; col++) {
      const x = col * 8
      p.rect(x, 0, 7, T, col % 2 ? 0xb88a58 : 0xc6996a)
      p.rect(x, 0, 1, T, 0xdcb684)
      p.rect(x + 7, 0, 1, T, 0x7a5432)
      p.speckle(0xa87a4a, 5, 1, x + 1, 2, 5, T - 4)
      p.px(x + 3, 6, 0x6a4628)
      p.px(x + 3, 25, 0x6a4628)
    }
    p.rect(0, 0, T, 2, 0x6a4628)
    p.rect(0, T - 2, T, 2, 0x8a6038)
    p.rect(1, 0, 4, 5, 0x5a3a20)
    p.rect(1, 0, 4, 1, 0x9a7048)
  })
}

/**
 * 生成湖畔图块
 * @author zjh
 * @date 2026-10-15
 */
export function paintLakeTiles(scene: Phaser.Scene): void {
  paintIce(scene)
  paintSand(scene)
  paintDock(scene)
  paintBridge(scene)
}
