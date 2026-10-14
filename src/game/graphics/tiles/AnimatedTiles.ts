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

/** 高草：成排草叶，帧间整体左右倾斜；夹杂粉色小花 */
function tallGrass(p: PixelPen, f: number): void {
  const lean = f - 1
  p.fill(0x4fae5e)
  p.speckle(0x3f9a4e, 30, 2)
  for (let i = 0; i < 18; i++) {
    const x = 1 + ((i * 7) % 30)
    const len = p.int(9, 17)
    const back = i % 3 === 0
    p.blade(x, T - 1 - p.int(0, 4), len, back ? 0x3f9a4e : 0x5bb86a, back ? 0x7ccf7a : 0x9be08a, lean)
  }
  for (let i = 0; i < 2; i++) {
    const x = p.int(5, 26) + lean
    const y = p.int(6, 14)
    p.rect(x, y, 2, 2, 0xffb7c5)
  }
}

/** 灰烬草：焦土 + 赤褐草叶 + 闪烁余烬 */
function ashGrass(p: PixelPen, f: number): void {
  const lean = f - 1
  p.fill(0x8a6a58)
  p.speckle(0x7a5a4a, 26, 2)
  for (let i = 0; i < 14; i++) {
    const x = 2 + ((i * 9) % 28)
    p.blade(x, T - 1 - p.int(0, 4), p.int(8, 15), i % 2 ? 0xa8705a : 0xc0806a, 0xe8a070, lean)
  }
  const glow = [0xffe08a, 0xffb050, 0xff7a40]
  for (let i = 0; i < 3; i++) {
    const x = p.int(4, 27)
    const y = p.int(4, 16)
    p.rect(x, y, 2, 2, glow[(i + f) % 3], 0.95)
  }
}

/** 传送点：小路底 + 光环（8 个光点按帧轮流点亮）+ 中心光晕 */
function warp(p: PixelPen, f: number): void {
  p.fill(0xe2c58f)
  p.speckle(0xd3b47c, 24, 2)
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
  tall: tallGrass,
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
