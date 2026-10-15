/**
 * 动画图块：水面波光、高草摇摆、灰烬草余烬闪烁、传送点光环旋转。
 * 每帧是一张独立 32×32 纹理（tile-water-0…3 等），再注册为全局动画（anim-water 等）。
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { paintCanvas, type PixelPen } from './PixelPen'

const T = 32

/** 动画定义：纹理前缀、帧数、帧率、是否往返播放 */
export const TILE_ANIMS = {
  water: { prefix: 'tile-water', frames: 4, rate: 3, yoyo: false },
  tall: { prefix: 'tile-tall', frames: 3, rate: 2.5, yoyo: true },
  tallB: { prefix: 'tile-tallB', frames: 3, rate: 2.5, yoyo: true },
  ash: { prefix: 'tile-ash', frames: 3, rate: 3, yoyo: true },
  warp: { prefix: 'tile-warp', frames: 4, rate: 6, yoyo: false },
} as const

export type TileAnimId = keyof typeof TILE_ANIMS

/** 水面：底色 + 深浅带 + 随帧右移的浪纹（按 32 取模，左右无缝） */
function water(p: PixelPen, f: number): void {
  p.fill(0x5fb8e6)
  p.speckle(0x4ea6d8, 20, 2)
  p.speckle(0x74c6ee, 12, 2)
  const rows = [4, 12, 20, 28]
  rows.forEach((y, r) => {
    const x0 = (r * 11 + f * 8) % T
    for (let i = 0; i < 6; i++) {
      const x = (x0 + i) % T
      p.px(x, y - (i === 2 || i === 3 ? 1 : 0), 0xc8f0ff)
    }
  })
  if (f % 2 === 0) p.px((7 + f * 6) % T, 9, 0xffffff)
  else p.px((22 + f * 4) % T, 24, 0xffffff)
}

/** 草丛色板：底 / 底部阴影 / 描边 / 背光叶 / 中叶 / 受光叶 / 叶尖 */
interface ClumpPalette {
  ground: number
  shade: number
  line: number
  back: number
  mid: number
  front: number
  tip: number
}

const TALL: ClumpPalette = { ground: 0x52aa5c, shade: 0x3e9550, line: 0x2a7040, back: 0x4aa25a, mid: 0x62bc66, front: 0x84d478, tip: 0xbcee9c }
const ASH: ClumpPalette = { ground: 0x8a6a58, shade: 0x6e5040, line: 0x4e3428, back: 0x9a6450, mid: 0xb67a60, front: 0xd29a72, tip: 0xffcc90 }

/** 草丛的落脚点（两种变体）：上下两排交错，左右环绕，相邻格无缝 */
const CLUMP_SPOTS: [number, number][][] = [
  [
    [7, 14],
    [23, 16],
    [-1, 30],
    [15, 31],
  ],
  [
    [3, 15],
    [18, 13],
    [10, 31],
    [26, 30],
  ],
]

/**
 * 一丛扇形草叶：叶片高矮随机，只给整丛外轮廓描深色边（叶片之间不描，避免条纹感）；lean 让整丛随帧摆动
 * 每帧用同一 seed 绘制，随机数调用顺序固定，所以各帧只有摆动不同
 * @author zjh
 * @date 2026-10-15
 */
function clump(p: PixelPen, x: number, y: number, lean: number, pal: ClumpPalette): void {
  const width = p.int(2, 3)
  const blades: { k: number; h: number }[] = []
  for (let k = -width; k <= width; k++) blades.push({ k, h: 12 - Math.abs(k) * 2 + p.int(-1, 2) })
  const shape = (k: number, i: number, h: number) => x + k * 2 + Math.round(((k * 0.7 + lean) * i) / h)
  for (let i = -width * 2 - 1; i <= width * 2 + 1; i++) p.wpx(x + i, y, pal.shade, 0.8)
  for (const { k, h } of blades) {
    for (let i = 0; i < h; i++) {
      const bx = shape(k, i, h)
      const by = y - 1 - i
      if (k === -width) p.wpx(bx - 1, by, pal.line)
      if (k === width) p.wpx(bx + 1, by, pal.line)
      if (i === h - 1) p.wpx(bx, by - 1, pal.line)
    }
  }
  for (const { k, h } of blades) {
    const body = k < 0 ? pal.back : k === 0 ? pal.mid : pal.front
    for (let i = 0; i < h; i++) {
      const bx = shape(k, i, h)
      p.wpx(bx, y - 1 - i, i >= h - 2 ? pal.tip : i < 2 ? pal.back : body)
      if (k > 0 && i < h - 2) p.wpx(bx + 1, y - 1 - i, body, 0.55)
    }
  }
}

/** 草丛图块：底色 + 抖动阴影 + 交错的草丛 */
function clumpField(p: PixelPen, f: number, pal: ClumpPalette, variant: number): void {
  const lean = f - 1
  p.fill(pal.ground)
  for (let i = 0; i < 3; i++) p.ditherDisc(p.int(0, T - 1), p.int(0, T - 1), p.int(5, 8), pal.shade, 0.6)
  for (const [x, y] of CLUMP_SPOTS[variant]) clump(p, x, y, lean, pal)
}

/** 高草：交错草丛随帧摆动；变体 0 夹杂粉色小花 */
function tallGrass(p: PixelPen, f: number, variant: number): void {
  clumpField(p, f, TALL, variant)
  if (variant !== 0) return
  const lean = f - 1
  p.rect(12 + lean, 21, 2, 2, 0xffb7c5)
  p.px(12 + lean, 21, 0xffffff)
  p.rect(28 + lean, 6, 2, 2, 0xffb7c5)
  p.px(28 + lean, 6, 0xffffff)
}

/** 灰烬草：焦土上的赤褐草丛 + 闪烁余烬 */
function ashGrass(p: PixelPen, f: number): void {
  clumpField(p, f, ASH, 0)
  const glow = [0xffe08a, 0xffb050, 0xff7a40]
  for (let i = 0; i < 3; i++) {
    const x = p.int(4, 27)
    const y = p.int(4, 16)
    p.rect(x, y, 2, 2, glow[(i + f) % 3], 0.95)
    p.px(x, y, 0xffffff, 0.6)
  }
}

/** 传送点：小路底 + 光环（8 个光点按帧轮流点亮）+ 中心光晕 */
function warp(p: PixelPen, f: number): void {
  p.fill(0xe0c48e)
  for (let i = 0; i < 3; i++) p.ditherDisc(p.int(0, T - 1), p.int(0, T - 1), p.int(5, 8), 0xcfae78, 0.6)
  p.disc(16, 16, 11, 0xa8e8ff, 0.25)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const x = Math.round(16 + Math.cos(a) * 10)
    const y = Math.round(16 + Math.sin(a) * 10)
    const lit = (i - f * 2 + 8) % 8 < 2
    p.rect(x - 1, y - 1, 2, 2, lit ? 0xffffff : 0x7ec8ff, lit ? 1 : 0.7)
  }
  p.disc(16, 16, 5, 0x9ad8ff, 0.8)
  p.disc(16, 16, 2, 0xffffff)
}

const PAINTERS: Record<TileAnimId, (p: PixelPen, f: number) => void> = {
  water,
  tall: (p, f) => tallGrass(p, f, 0),
  tallB: (p, f) => tallGrass(p, f, 1),
  ash: ashGrass,
  warp,
}

/**
 * 生成全部动画帧纹理（同一图块各帧用同一 seed，保证只有动的部分在变）
 * @author zjh
 * @date 2026-10-14
 */
export function paintAnimatedTiles(scene: Phaser.Scene): void {
  ;(Object.keys(TILE_ANIMS) as TileAnimId[]).forEach((id, n) => {
    const def = TILE_ANIMS[id]
    for (let f = 0; f < def.frames; f++) {
      paintCanvas(scene, `${def.prefix}-${f}`, T, T, 1201 + n * 37, (p) => PAINTERS[id](p, f))
    }
  })
}

/**
 * 注册图块动画（全局，只注册一次）
 * @author zjh
 * @date 2026-10-14
 */
export function registerTileAnims(scene: Phaser.Scene): void {
  ;(Object.keys(TILE_ANIMS) as TileAnimId[]).forEach((id) => {
    const key = `anim-${id}`
    if (scene.anims.exists(key)) return
    const def = TILE_ANIMS[id]
    scene.anims.create({
      key,
      frames: Array.from({ length: def.frames }, (_, f) => ({ key: `${def.prefix}-${f}` })),
      frameRate: def.rate,
      repeat: -1,
      yoyo: def.yoyo,
    })
  })
}
