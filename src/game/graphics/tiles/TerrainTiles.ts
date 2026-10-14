/**
 * 地形图块（32×32，不可通行）：树林、果树、山崖、巨石、小屋木墙；以及水边岸线叠加层
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { grassBase } from './GroundTiles'
import { paintCanvas, type PixelPen } from './PixelPen'

const T = 32

/** 圆冠树：阴影 + 树干 + 三层树冠 + 高光；fruit 为可选果实颜色 */
function tree(p: PixelPen, fruit?: number): void {
  grassBase(p, 0.6)
  p.rect(6, 27, 20, 4, 0x2e6a3a, 0.45)
  p.rect(14, 20, 4, 9, 0x7a5236)
  p.rect(14, 20, 1, 9, 0x9a6a46)
  p.disc(16, 13, 12, 0x3f8f4f)
  p.disc(14, 11, 9, 0x55a85a)
  p.disc(12, 9, 5, 0x6cbf62)
  p.speckle(0x347a42, 14, 2, 6, 6, 20, 16)
  p.speckle(0x8fd77a, 8, 1, 6, 3, 14, 10)
  if (fruit !== undefined) {
    for (let i = 0; i < 4; i++) {
      const x = p.int(7, 23)
      const y = p.int(8, 19)
      p.rect(x, y, 2, 2, fruit)
      p.px(x, y, 0xffffff, 0.7)
    }
  }
}

/** 山崖：分层岩带，每层顶亮底暗，带裂纹 */
function cliff(p: PixelPen): void {
  p.fill(0x946a4e)
  for (let y = 0; y < T; y += 8) {
    const off = p.int(-2, 2)
    p.rect(0, y + off, T, 2, 0xb08060)
    p.rect(0, y + 6 + off, T, 2, 0x6e4c38)
    p.speckle(0x7e5840, 6, 2, 0, y + 2, T, 4)
  }
  for (let i = 0; i < 2; i++) {
    let x = p.int(4, 28)
    for (let y = p.int(0, 10); y < T; y += 1) {
      p.px(x, y, 0x5a3c2c)
      if (p.rand() < 0.3) x += p.int(-1, 1)
      if (p.rand() < 0.08) break
    }
  }
}

/** 巨石：碎石路底 + 圆石 + 高光与裂纹 */
function boulder(p: PixelPen): void {
  p.fill(0xc49a72)
  p.speckle(0xb08660, 24, 2)
  p.rect(5, 26, 22, 4, 0x6e4c38, 0.5)
  p.disc(16, 17, 11, 0x7e604c)
  p.disc(15, 15, 10, 0x9a7660)
  p.disc(13, 12, 5, 0xb69276)
  p.rect(10, 9, 3, 2, 0xd8b896)
  p.speckle(0x846450, 10, 2, 8, 12, 16, 12)
  p.px(18, 16, 0x5e4436)
  p.px(19, 17, 0x5e4436)
  p.px(19, 18, 0x5e4436)
}

/** 小屋木墙：竖木板 + 顶部横梁 + 踢脚线 */
function woodWall(p: PixelPen): void {
  p.fill(0xa8784a)
  for (let x = 0; x < T; x += 8) {
    p.rect(x, 0, 1, T, 0x7a5232)
    p.rect(x + 1, 0, 1, T, 0xc08e5c, 0.6)
    p.speckle(0x946638, 3, 1, x + 2, 6, 5, 20)
  }
  p.px(p.int(3, 6), p.int(10, 20), 0x6e4a2c)
  p.rect(0, 0, T, 5, 0x6e4a2c)
  p.rect(0, 4, T, 1, 0x8a6038)
  p.rect(0, T - 4, T, 4, 0x5a3a22)
}

type Side = 'n' | 's' | 'e' | 'w'

/** 岸线：沿某条边画沙岸 + 白色浪花（透明底，叠在水面上） */
function shore(p: PixelPen, side: Side): void {
  const at = (i: number, d: number): [number, number] =>
    side === 'n' ? [i, d] : side === 's' ? [i, T - 1 - d] : side === 'w' ? [d, i] : [T - 1 - d, i]
  for (let i = 0; i < T; i++) {
    const depth = 2 + (p.rand() < 0.3 ? 1 : 0)
    for (let d = 0; d < depth; d++) {
      const [x, y] = at(i, d)
      p.px(x, y, d === 0 ? 0xc8b07a : 0xe8d8a0)
    }
    const [fx, fy] = at(i, depth)
    p.px(fx, fy, 0xffffff, p.rand() < 0.7 ? 0.85 : 0.4)
    const [lx, ly] = at(i, depth + 1)
    p.px(lx, ly, 0xb8e8ff, 0.5)
  }
}

/**
 * 生成全部地形图块
 * @author zjh
 * @date 2026-10-14
 */
export function paintTerrainTiles(scene: Phaser.Scene): void {
  for (let v = 0; v < 3; v++) paintCanvas(scene, `tile-tree-${v}`, T, T, 601 + v * 17, (p) => tree(p))
  paintCanvas(scene, 'tile-tree-fruit', T, T, 677, (p) => tree(p, 0xff6a5a))
  for (let v = 0; v < 2; v++) paintCanvas(scene, `tile-cliff-${v}`, T, T, 701 + v * 3, cliff)
  for (let v = 0; v < 2; v++) paintCanvas(scene, `tile-boulder-${v}`, T, T, 801 + v * 29, boulder)
  paintCanvas(scene, 'tile-woodwall-0', T, T, 901, woodWall)
  for (const side of ['n', 's', 'e', 'w'] as const) paintCanvas(scene, `tile-shore-${side}`, T, T, 951, (p) => shore(p, side))
}
