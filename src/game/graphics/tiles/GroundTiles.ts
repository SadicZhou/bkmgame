/**
 * 地面图块（32×32，可通行）：草地变体、开花草地、泥土小路（含与草地相接的圆润草边）、山道碎石路、木地板、小屋门
 * 草地与小路都按「环绕绘制」生成，相邻格无缝拼接；明暗统一按左上方光源。
 * @author zjh
 * @date 2026-10-15
 */

import Phaser from 'phaser'
import { paintCanvas, type PixelPen } from './PixelPen'

const T = 32

/** 草地色板：deep 阴影 / dark 暗部 / base 底色 / light 受光 / tip 草尖高光 */
export const GRASS = { deep: 0x3e9550, dark: 0x52aa5c, base: 0x66be69, light: 0x86d47a, tip: 0xb2ea98 }

/** 小路色板 */
const DIRT = { shadow: 0xb08c5c, dark: 0xcfae78, base: 0xe0c48e, light: 0xeed6a6, hi: 0xf8e8c4 }

/** 草地变体数量（MapRenderer 按坐标哈希挑选） */
export const GRASS_VARIANTS = 4

/**
 * 一簇 V 形小草：底部一点阴影，左叶暗、中叶亮、右叶受光
 * @author zjh
 * @date 2026-10-15
 */
function tuft(p: PixelPen, x: number, y: number, big: boolean): void {
  p.wpx(x - 1, y + 1, GRASS.deep, 0.7)
  p.wpx(x, y + 1, GRASS.deep, 0.7)
  p.wpx(x + 1, y + 1, GRASS.deep, 0.7)
  p.wpx(x - 1, y, GRASS.dark)
  p.wpx(x - 2, y - 1, GRASS.dark)
  p.wpx(x, y, GRASS.dark)
  p.wpx(x, y - 1, GRASS.light)
  p.wpx(x, y - 2, GRASS.tip)
  p.wpx(x + 1, y, GRASS.light)
  p.wpx(x + 2, y - 1, GRASS.tip)
  if (big) {
    p.wpx(x - 3, y - 2, GRASS.light)
    p.wpx(x + 3, y - 2, GRASS.tip)
    p.wpx(x, y - 3, GRASS.tip)
  }
}

/**
 * 草地底：柔和的明暗斑 + 小草簇 + 零星亮点（环绕绘制，四边无缝）
 * @param density 草簇密度（树下、门前用较低密度）
 * @author zjh
 * @date 2026-10-15
 */
export function grassBase(p: PixelPen, density = 1): void {
  p.fill(GRASS.base)
  for (let i = 0; i < 3; i++) p.ditherDisc(p.int(0, T - 1), p.int(0, T - 1), p.int(5, 9), GRASS.dark, 0.55)
  for (let i = 0; i < 2; i++) p.ditherDisc(p.int(0, T - 1), p.int(0, T - 1), p.int(4, 7), GRASS.light, 0.45)
  for (let i = 0; i < 14; i++) p.wpx(p.int(0, T - 1), p.int(0, T - 1), GRASS.dark)
  for (let i = 0; i < 6; i++) p.wpx(p.int(0, T - 1), p.int(0, T - 1), GRASS.tip, 0.8)
  const n = Math.round(5 * density)
  for (let i = 0; i < n; i++) tuft(p, p.int(0, T - 1), p.int(0, T - 1), p.rand() < 0.35)
}

/** 一朵小花：四瓣 + 花心 + 底部阴影与茎叶 */
function flower(p: PixelPen, x: number, y: number, petal: number, center: number): void {
  p.wpx(x, y + 2, GRASS.deep)
  p.wpx(x + 1, y + 3, GRASS.dark)
  p.wpx(x - 1, y + 3, GRASS.light)
  p.wpx(x - 1, y + 1, GRASS.deep, 0.6)
  p.wpx(x + 1, y + 1, GRASS.deep, 0.6)
  p.wpx(x, y - 1, petal)
  p.wpx(x - 1, y, petal)
  p.wpx(x + 1, y, petal)
  p.wpx(x, y + 1, petal)
  p.wpx(x - 1, y - 1, 0xffffff, 0.5)
  p.wpx(x, y, center)
}

function paintGrass(scene: Phaser.Scene): void {
  for (let v = 0; v < GRASS_VARIANTS; v++) {
    paintCanvas(scene, `tile-grass-${v}`, T, T, 11 + v * 7, (p) => {
      grassBase(p)
      // 变体 3 带一粒小卵石，变体 2 带一片三叶草，打破重复感
      if (v === 3) {
        const x = p.int(6, 24)
        const y = p.int(6, 24)
        p.rect(x, y, 3, 2, 0xb8b0a0)
        p.px(x, y, 0xe0d8c8)
        p.rect(x, y + 2, 3, 1, GRASS.deep, 0.7)
      }
      if (v === 2) {
        const x = p.int(6, 24)
        const y = p.int(6, 24)
        p.px(x, y, 0x4aa65a)
        p.px(x - 1, y - 1, 0x7ad070)
        p.px(x + 1, y - 1, 0x7ad070)
        p.px(x, y + 1, GRASS.deep)
      }
    })
  }
  const sets: [number, number][][] = [
    [
      [0xffffff, 0xffd84a],
      [0xffe066, 0xff9a3a],
      [0xffffff, 0xffd84a],
    ],
    [
      [0xffb7c5, 0xffffff],
      [0xb8a8ff, 0xfff0a0],
      [0xffb7c5, 0xffe066],
    ],
  ]
  for (let v = 0; v < 2; v++) {
    paintCanvas(scene, `tile-grass-flower-${v}`, T, T, 91 + v * 13, (p) => {
      grassBase(p, 0.7)
      const cx = p.int(9, 22)
      const cy = p.int(9, 22)
      sets[v].forEach(([petal, center], i) => flower(p, cx + [0, 6, -5][i], cy + [0, 3, 5][i], petal, center))
    })
  }
}

/** 一粒带明暗的小石子 */
function pebble(p: PixelPen, x: number, y: number, w: number): void {
  p.rect(x, y + 1, w, 1, DIRT.shadow)
  p.rect(x, y, w, 1, 0xc8b496)
  p.px(x, y, DIRT.hi)
  p.px(x + w, y + 1, DIRT.shadow, 0.5)
}

/** 泥土小路：暖沙色 + 柔和明暗斑 + 碎石与车辙细纹（环绕绘制） */
function paintPath(scene: Phaser.Scene): void {
  for (let v = 0; v < 2; v++) {
    paintCanvas(scene, `tile-path-${v}`, T, T, 201 + v * 5, (p) => {
      p.fill(DIRT.base)
      for (let i = 0; i < 3; i++) p.ditherDisc(p.int(0, T - 1), p.int(0, T - 1), p.int(5, 8), DIRT.dark, 0.6)
      for (let i = 0; i < 2; i++) p.ditherDisc(p.int(0, T - 1), p.int(0, T - 1), p.int(4, 7), DIRT.light, 0.6)
      for (let i = 0; i < 16; i++) p.wpx(p.int(0, T - 1), p.int(0, T - 1), DIRT.dark)
      for (let i = 0; i < 8; i++) p.wpx(p.int(0, T - 1), p.int(0, T - 1), DIRT.hi, 0.9)
      for (let i = 0; i < 3; i++) pebble(p, p.int(2, T - 6), p.int(2, T - 5), p.int(2, 3))
    })
  }
}

type Side = 'n' | 's' | 'w' | 'e'

/** 草边的起伏：两端都回到 3px，相邻格的草边能接上 */
function edgeDepth(i: number, phase: number): number {
  const a = (Math.PI * 2 * i) / T
  return 3 + Math.round(1.2 * Math.sin(a + phase * Math.PI) * Math.sin((Math.PI * i) / T) + 0.8 * Math.sin(2 * a))
}

/** 草边里的一个草像素（偶尔带暗点，边缘一排受光） */
function grassPx(p: PixelPen, x: number, y: number, lip: boolean): void {
  if (lip) p.px(x, y, p.rand() < 0.5 ? GRASS.light : GRASS.tip)
  else p.px(x, y, p.rand() < 0.15 ? GRASS.dark : GRASS.base)
}

/**
 * 小路一侧的草边（透明底，叠在小路上）：起伏的草沿 + 偶尔垂下的草尖 + 落在路面上的阴影
 * @author zjh
 * @date 2026-10-15
 */
function pathEdge(p: PixelPen, side: Side): void {
  const at = (i: number, d: number): [number, number] =>
    side === 'n' ? [i, d] : side === 's' ? [i, T - 1 - d] : side === 'w' ? [d, i] : [T - 1 - d, i]
  const phase = side === 'n' || side === 'w' ? 0 : 1
  for (let i = 0; i < T; i++) {
    const depth = edgeDepth(i, phase)
    for (let d = 0; d < depth; d++) grassPx(p, ...at(i, d), d === depth - 1)
    if (p.rand() < 0.18) {
      p.px(...at(i, depth), GRASS.light)
      p.px(...at(i, depth + 1), DIRT.shadow, 0.6)
    } else {
      p.px(...at(i, depth), DIRT.shadow, 0.55)
      p.px(...at(i, depth + 1), DIRT.shadow, 0.2)
    }
  }
}

/** 外角：两侧都是草时把直角削圆 */
function pathOuterCorner(p: PixelPen, corner: 'nw' | 'ne' | 'sw' | 'se'): void {
  const r = 8
  for (let y = 0; y < r; y++) {
    for (let x = 0; x < r; x++) {
      const d = Math.hypot(x - r + 0.5, y - r + 0.5)
      const px = corner.endsWith('w') ? x : T - 1 - x
      const py = corner.startsWith('n') ? y : T - 1 - y
      if (d > r) grassPx(p, px, py, false)
      else if (d > r - 1.2) p.px(px, py, GRASS.light)
      else if (d > r - 2.4) p.px(px, py, DIRT.shadow, 0.5)
    }
  }
}

/** 内角：两侧是路、斜对角是草时补一小块圆角草 */
function pathInnerCorner(p: PixelPen, corner: 'nw' | 'ne' | 'sw' | 'se'): void {
  const r = 4
  for (let y = 0; y <= r; y++) {
    for (let x = 0; x <= r; x++) {
      const d = Math.hypot(x + 0.5, y + 0.5)
      const px = corner.endsWith('w') ? x : T - 1 - x
      const py = corner.startsWith('n') ? y : T - 1 - y
      if (d < r - 1) grassPx(p, px, py, false)
      else if (d < r) p.px(px, py, GRASS.light)
      else if (d < r + 1) p.px(px, py, DIRT.shadow, 0.45)
    }
  }
}

/** 草边叠加层：tile-pedge-n/s/w/e（边）、-nw…（外角）、-inw…（内角） */
function paintPathEdges(scene: Phaser.Scene): void {
  for (const side of ['n', 's', 'w', 'e'] as const) paintCanvas(scene, `tile-pedge-${side}`, T, T, 231, (p) => pathEdge(p, side))
  for (const c of ['nw', 'ne', 'sw', 'se'] as const) {
    paintCanvas(scene, `tile-pedge-${c}`, T, T, 241, (p) => pathOuterCorner(p, c))
    paintCanvas(scene, `tile-pedge-i${c}`, T, T, 251, (p) => pathInnerCorner(p, c))
  }
}

/** 山道碎石路：偏红棕，柔和明暗斑 + 裂纹 + 带阴影的碎石 */
function paintMountainPath(scene: Phaser.Scene): void {
  for (let v = 0; v < 2; v++) {
    paintCanvas(scene, `tile-mountain-path-${v}`, T, T, 301 + v * 9, (p) => {
      p.fill(0xc49a72)
      for (let i = 0; i < 3; i++) p.ditherDisc(p.int(0, T - 1), p.int(0, T - 1), p.int(5, 8), 0xb08660, 0.7)
      for (let i = 0; i < 2; i++) p.ditherDisc(p.int(0, T - 1), p.int(0, T - 1), p.int(4, 6), 0xd8b088, 0.6)
      for (let i = 0; i < 14; i++) p.wpx(p.int(0, T - 1), p.int(0, T - 1), 0xa47a58)
      let x = p.int(4, 26)
      let y = p.int(4, 10)
      for (let i = 0; i < 10; i++) {
        p.px(x, y, 0x8a6248)
        p.px(x + 1, y, 0xd8b896, 0.6)
        x += p.int(-1, 1)
        y += 1
      }
      for (let i = 0; i < 3; i++) {
        const sx = p.int(2, T - 6)
        const sy = p.int(2, T - 5)
        p.rect(sx, sy + 2, 4, 1, 0x7a5a44, 0.8)
        p.rect(sx, sy, 4, 2, 0x9a7660)
        p.rect(sx, sy, 2, 1, 0xe0c0a0)
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
 * @date 2026-10-15
 */
export function paintGroundTiles(scene: Phaser.Scene): void {
  paintGrass(scene)
  paintPath(scene)
  paintPathEdges(scene)
  paintMountainPath(scene)
  paintFloor(scene)
  paintDoor(scene)
}
