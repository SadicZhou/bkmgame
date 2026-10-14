/**
 * 地面图块（32×32，可通行）：草地变体、开花草地、泥土小路、山道碎石路、木地板、小屋门
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { paintCanvas, type PixelPen } from './PixelPen'

const T = 32

/** 草地主色 */
export const GRASS = { base: 0x6cc66f, dark: 0x58b05e, light: 0x8fdc84, tip: 0xb4ec9c }

/** 草地变体数量（MapRenderer 按坐标哈希挑选） */
export const GRASS_VARIANTS = 4

/** 在草地底色上画短草叶与明暗斑点 */
export function grassBase(p: PixelPen, density = 1): void {
  p.fill(GRASS.base)
  p.speckle(GRASS.dark, Math.round(26 * density), 2)
  p.speckle(GRASS.light, Math.round(14 * density), 1)
  for (let i = 0; i < Math.round(9 * density); i++) {
    p.blade(p.int(1, T - 2), p.int(4, T - 1), p.int(2, 3), GRASS.dark, GRASS.light, p.int(-1, 1))
  }
}

function paintGrass(scene: Phaser.Scene): void {
  for (let v = 0; v < GRASS_VARIANTS; v++) paintCanvas(scene, `tile-grass-${v}`, T, T, 11 + v * 7, (p) => grassBase(p))
  // 开花草地：白 / 黄 / 粉小花
  const petals = [0xffffff, 0xffe066, 0xffb7c5]
  for (let v = 0; v < 2; v++) {
    paintCanvas(scene, `tile-grass-flower-${v}`, T, T, 91 + v * 13, (p) => {
      grassBase(p)
      for (let i = 0; i < 3; i++) {
        const x = p.int(3, T - 5)
        const y = p.int(3, T - 5)
        const c = petals[(i + v) % petals.length]
        p.px(x, y - 1, c)
        p.px(x - 1, y, c)
        p.px(x + 1, y, c)
        p.px(x, y + 1, c)
        p.px(x, y, 0xffa040)
      }
    })
  }
}

/** 泥土小路：暖沙色 + 碎石 */
function paintPath(scene: Phaser.Scene): void {
  for (let v = 0; v < 2; v++) {
    paintCanvas(scene, `tile-path-${v}`, T, T, 201 + v * 5, (p) => {
      p.fill(0xe2c58f)
      p.speckle(0xd3b47c, 30, 2)
      p.speckle(0xeed7a6, 16, 1)
      for (let i = 0; i < 3; i++) {
        const x = p.int(2, T - 5)
        const y = p.int(2, T - 4)
        p.rect(x, y, 3, 2, 0xb99a6a)
        p.px(x, y, 0xf2dcaa)
      }
    })
  }
}

/** 山道碎石路：偏红棕，带裂纹 */
function paintMountainPath(scene: Phaser.Scene): void {
  for (let v = 0; v < 2; v++) {
    paintCanvas(scene, `tile-mountain-path-${v}`, T, T, 301 + v * 9, (p) => {
      p.fill(0xc49a72)
      p.speckle(0xb08660, 34, 2)
      p.speckle(0xd8b088, 16, 1)
      let x = p.int(4, 26)
      let y = p.int(4, 10)
      for (let i = 0; i < 10; i++) {
        p.px(x, y, 0x9a7050)
        x += p.int(-1, 1)
        y += 1
      }
      for (let i = 0; i < 2; i++) {
        const sx = p.int(2, T - 6)
        const sy = p.int(2, T - 5)
        p.rect(sx, sy, 4, 3, 0x9a7660)
        p.rect(sx, sy, 2, 1, 0xd8b896)
      }
    })
  }
}

/** 小屋木地板：横向木板 + 接缝与钉子 */
function paintFloor(scene: Phaser.Scene): void {
  paintCanvas(scene, 'tile-floor-0', T, T, 401, (p) => {
    p.fill(0xc9a06c)
    for (let row = 0; row < 4; row++) {
      const y = row * 8
      p.rect(0, y, T, 1, 0x9a7448)
      p.speckle(0xb88e5c, 8, 1, 0, y + 1, T, 7)
      p.rect(0, y + 1, T, 1, 0xdcb880, 0.6)
      const seam = (row * 13 + 7) % T
      p.rect(seam, y + 1, 1, 7, 0x9a7448)
      p.px(seam + 2, y + 4, 0x7a5a38)
    }
  })
}

/** 小屋门：木门 + 门框 + 把手 */
function paintDoor(scene: Phaser.Scene): void {
  paintCanvas(scene, 'tile-door-0', T, T, 501, (p) => {
    grassBase(p, 0.5)
    p.rect(5, 2, 22, 30, 0x6e4a2c)
    p.rect(7, 4, 18, 28, 0xa8784a)
    for (let x = 11; x < 25; x += 5) p.rect(x, 4, 1, 28, 0x8a6038)
    p.rect(7, 4, 18, 2, 0xc89868)
    p.rect(20, 17, 2, 2, 0xffd070)
    p.rect(3, 30, 26, 2, 0x8a6a48)
  })
}

/**
 * 生成全部地面图块
 * @author zjh
 * @date 2026-10-14
 */
export function paintGroundTiles(scene: Phaser.Scene): void {
  paintGrass(scene)
  paintPath(scene)
  paintMountainPath(scene)
  paintFloor(scene)
  paintDoor(scene)
}
