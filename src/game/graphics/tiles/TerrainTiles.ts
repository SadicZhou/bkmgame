/**
 * 地形图块：树（大树冠 40×46，相邻树冠互相重叠成林）、32×32 小树（道具用）、山崖、巨石、小屋木墙；以及水边岸线叠加层
 * 明暗统一按左上方光源，轮廓用比暗部更深一档的同色系描边。
 * @author zjh
 * @date 2026-10-15
 */

import Phaser from 'phaser'
import { grassBase } from './GroundTiles'
import { paintCanvas, type PixelPen } from './PixelPen'

const T = 32

/** 大树冠贴图尺寸（MapRenderer 以底边中点对齐格子底部） */
export const TREE_W = 40
export const TREE_H = 46
/** 树冠贴图底边比格子底边低多少像素（投影落在下一格上） */
export const TREE_FOOT = 4

/** 树的色板：描边 / 暗部 / 中间调 / 受光 / 高光 */
interface TreePalette {
  line: number
  dark: number
  mid: number
  light: number
  hi: number
}

const TREE_PALETTES: TreePalette[] = [
  { line: 0x1d4a32, dark: 0x2e7844, mid: 0x40944e, light: 0x5aaf5c, hi: 0x86cf70 },
  { line: 0x1a4436, dark: 0x2a6c4a, mid: 0x388858, light: 0x50a666, hi: 0x7ac884 },
  { line: 0x284f2e, dark: 0x3c7e40, mid: 0x549c48, light: 0x72b956, hi: 0x9cd56e },
]

/** 树冠由几团叶簇组成：[dx, dy, r]，按从后到前的顺序绘制 */
const CLUMPS: [number, number, number][] = [
  [0, -9, 8],
  [-9, -3, 8],
  [9, -3, 8],
  [0, 0, 11],
  [-7, 6, 7],
  [7, 6, 7],
  [0, 7, 8],
]

/** 像素风椭圆（逐行填充） */
function ellipse(p: PixelPen, cx: number, cy: number, rx: number, ry: number, color: number, alpha = 1): void {
  for (let y = -ry; y <= ry; y++) {
    const half = Math.floor(rx * Math.sqrt(1 - (y * y) / (ry * ry || 1)))
    p.rect(cx - half, cy + y, half * 2 + 1, 1, color, alpha)
  }
}

/**
 * 树冠：先画整体描边，再逐团画 暗部 → 中间调 → 受光 → 高光，前面的叶簇压住后面的，形成层次；最后撒叶片纹理
 * @param s 缩放（大树 1，小树约 0.72）
 * @author zjh
 * @date 2026-10-15
 */
function crown(p: PixelPen, cx: number, cy: number, s: number, pal: TreePalette, fruit?: number): void {
  const clumps = CLUMPS.map(([dx, dy, r]) => [Math.round(cx + dx * s), Math.round(cy + dy * s), Math.max(2, Math.round(r * s))] as const)
  const inside = (x: number, y: number) => clumps.some(([x0, y0, r]) => (x - x0) ** 2 + (y - y0) ** 2 <= r * r)
  for (const [x, y, r] of clumps) p.disc(x, y, r + 1, pal.line)
  for (const [x, y, r] of clumps) {
    p.disc(x, y, r, pal.dark)
    p.disc(x - 1, y - 1, r - 1, pal.mid)
    if (r >= 5) p.disc(x - 2, y - 3, r - 4, pal.light)
    if (r >= 8) p.disc(x - 3, y - 4, r - 7, pal.hi)
  }
  const top = cy - Math.round(18 * s)
  const h = Math.round(36 * s)
  for (let i = 0; i < Math.round(26 * s); i++) {
    const x = Math.round(cx + p.int(-17, 17) * s)
    const y = top + p.int(0, h)
    if (inside(x, y) && inside(x + 1, y)) p.rect(x, y, 2, 1, pal.dark, 0.6)
  }
  for (let i = 0; i < Math.round(10 * s); i++) {
    const x = Math.round(cx + p.int(-12, 4) * s)
    const y = top + p.int(2, Math.round(h / 2))
    if (inside(x, y)) p.px(x, y, pal.hi, 0.8)
  }
  if (fruit !== undefined) {
    for (let i = 0; i < 5; i++) {
      const x = Math.round(cx + p.int(-11, 11) * s)
      const y = Math.round(cy + p.int(-6, 9) * s)
      if (!inside(x, y) || !inside(x + 1, y + 1)) continue
      p.rect(x, y + 1, 2, 1, 0x8a2a2a)
      p.rect(x, y, 2, 1, fruit)
      p.px(x, y, 0xffffff, 0.8)
    }
  }
}

/** 树干：描边 + 中间色 + 左侧受光 + 右侧暗部 + 两侧根 */
function trunk(p: PixelPen, cx: number, top: number, bottom: number, w: number): void {
  const x0 = cx - Math.floor(w / 2)
  p.rect(x0 - 1, top, w + 2, bottom - top + 1, 0x3e2614)
  p.rect(x0, top, w, bottom - top, 0x7a5236)
  p.rect(x0, top, 1, bottom - top, 0x9e6e48)
  p.rect(x0 + w - 1, top, 1, bottom - top, 0x5a3a22)
  p.rect(x0 - 2, bottom - 1, 2, 1, 0x3e2614)
  p.rect(x0 + w, bottom - 1, 2, 1, 0x3e2614)
}

/**
 * 大树（透明底）：投影 + 树干 + 树冠
 * @author zjh
 * @date 2026-10-15
 */
function bigTree(p: PixelPen, pal: TreePalette, fruit?: number): void {
  const cx = TREE_W / 2
  ellipse(p, cx + 1, TREE_H - TREE_FOOT - 1, 14, 3, 0x14381f, 0.35)
  trunk(p, cx, 28, TREE_H - TREE_FOOT, 6)
  crown(p, cx, 18, 1, pal, fruit)
}

/** 32×32 小树（草地底，供道具 / 旧引用使用） */
function smallTree(p: PixelPen, pal: TreePalette, fruit?: number): void {
  grassBase(p, 0.5)
  ellipse(p, 17, 29, 11, 2, 0x14381f, 0.35)
  trunk(p, 16, 21, 30, 4)
  crown(p, 16, 13, 0.72, pal, fruit)
}

/** 藤蔓丛（透明底）：矮灌木 + 交缠的深色藤条与小叶 */
function vines(p: PixelPen): void {
  ellipse(p, 16, 28, 13, 2, 0x14381f, 0.35)
  crown(p, 16, 17, 0.62, TREE_PALETTES[1])
  for (let i = 0; i < 4; i++) {
    let x = p.int(4, 28)
    let y = p.int(8, 12)
    for (let s = 0; s < 18 && y < 30; s++) {
      p.px(x, y, 0x24502e)
      p.px(x + 1, y, 0x3e7a3a, 0.6)
      if (s % 4 === 2) p.rect(x - 1, y - 1, 2, 2, 0x7ac060)
      x += p.int(-1, 1)
      y += 1
    }
  }
}

/** 山崖：分层岩带（每层顶部受光、底部投影）、抖动过渡、裂纹与零星小草 */
function cliff(p: PixelPen): void {
  p.fill(0x946a4e)
  for (let y = 0; y < T; y += 8) {
    const off = p.int(-1, 1)
    p.rect(0, y + off, T, 1, 0xc8946c)
    p.rect(0, y + 1 + off, T, 1, 0xb08060)
    for (let x = 0; x < T; x += 2) p.px(x + ((y / 8) % 2), y + 2 + off, 0xb08060)
    p.rect(0, y + 6 + off, T, 1, 0x6e4c38)
    p.rect(0, y + 7 + off, T, 1, 0x553828)
    p.speckle(0x7e5840, 5, 2, 0, y + 3, T, 3)
  }
  for (let i = 0; i < 2; i++) {
    let x = p.int(4, 28)
    for (let y = p.int(0, 10); y < T; y += 1) {
      p.px(x, y, 0x4a3022)
      p.px(x + 1, y, 0xb88a66, 0.6)
      if (p.rand() < 0.3) x += p.int(-1, 1)
      if (p.rand() < 0.08) break
    }
  }
  const gx = p.int(4, 24)
  p.px(gx, 0, 0x6a9a50)
  p.px(gx + 1, 0, 0x8ab866)
  p.px(gx + 2, 0, 0x6a9a50)
}

/** 巨石：碎石路底 + 投影 + 描边圆石 + 分层明暗与裂纹 */
function boulder(p: PixelPen): void {
  p.fill(0xc49a72)
  for (let i = 0; i < 3; i++) p.ditherDisc(p.int(0, T - 1), p.int(0, T - 1), p.int(4, 7), 0xb08660, 0.7)
  ellipse(p, 17, 27, 12, 3, 0x5a3c2c, 0.45)
  p.disc(16, 17, 12, 0x4e3628)
  p.disc(16, 17, 11, 0x7a5c48)
  p.disc(15, 15, 10, 0x967360)
  p.disc(13, 12, 6, 0xb08c74)
  p.disc(12, 10, 3, 0xcaa88c)
  p.rect(10, 8, 2, 1, 0xe8ccb0)
  p.speckle(0x846450, 8, 1, 8, 14, 16, 10)
  p.px(19, 15, 0x4e3628)
  p.px(20, 16, 0x4e3628)
  p.px(20, 17, 0x4e3628)
  p.px(21, 18, 0x4e3628)
  p.px(19, 16, 0xb08c74, 0.7)
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
 * @date 2026-10-15
 */
export function paintTerrainTiles(scene: Phaser.Scene): void {
  TREE_PALETTES.forEach((pal, v) => {
    paintCanvas(scene, `tree-crown-${v}`, TREE_W, TREE_H, 611 + v * 17, (p) => bigTree(p, pal))
    paintCanvas(scene, `tile-tree-${v}`, T, T, 601 + v * 17, (p) => smallTree(p, pal))
  })
  paintCanvas(scene, 'tree-crown-fruit', TREE_W, TREE_H, 687, (p) => bigTree(p, TREE_PALETTES[0], 0xff5a4a))
  paintCanvas(scene, 'tile-tree-fruit', T, T, 677, (p) => smallTree(p, TREE_PALETTES[0], 0xff5a4a))
  paintCanvas(scene, 'obj-vines', T, T, 691, vines)
  for (let v = 0; v < 2; v++) paintCanvas(scene, `tile-cliff-${v}`, T, T, 701 + v * 3, cliff)
  for (let v = 0; v < 2; v++) paintCanvas(scene, `tile-boulder-${v}`, T, T, 801 + v * 29, boulder)
  paintCanvas(scene, 'tile-woodwall-0', T, T, 901, woodWall)
  for (const side of ['n', 's', 'e', 'w'] as const) paintCanvas(scene, `tile-shore-${side}`, T, T, 951, (p) => shore(p, side))
}
