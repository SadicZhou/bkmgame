/**
 * 人物行走图（AI 像素画）：玩家 4 方向 × 3 帧（站立 / 迈左脚 / 迈右脚），NPC 每人 1 帧。
 * 原图在 art-src/chars/，用 scripts/process-chars.py 输出到 public/assets/chars/。
 * 每帧 32×40，比地图格高，锚点设在脚底（格子中心下方 FOOT_OFFSET px）。
 * 缺图时 hasCharArt 返回 false，由调用方回退到代码绘制的 spr-player-* / spr-npc。
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import type { Facing } from '../state/GameState'

const FRAME_W = 32
const FRAME_H = 40
/** 脚底相对格子中心向下的偏移 */
const FOOT_OFFSET = 14

/** 方向 → 行号（与原图行顺序一致） */
const DIR_ROW: Record<Facing, number> = { down: 0, up: 1, left: 2, right: 3 }

/** NPC id → 帧号（与 art-src/chars/npcs.jpg 的网格顺序一致） */
export const NPC_FRAME: Record<string, number> = {
  elder: 0,
  kid: 1,
  shop: 2,
  granny: 3,
  storage: 4,
  ranger: 5,
  hiker: 6,
  spring: 7,
  healer: 8,
}

/**
 * 在 preload 阶段加载行走图
 * @author zjh
 * @date 2026-10-14
 */
export function preloadCharArt(scene: Phaser.Scene): void {
  const frame = { frameWidth: FRAME_W, frameHeight: FRAME_H }
  scene.load.spritesheet('char-player', 'assets/chars/char-player.png', frame)
  scene.load.spritesheet('char-npcs', 'assets/chars/char-npcs.png', frame)
}

/** 行走图是否已加载 */
export function hasCharArt(scene: Phaser.Scene, key: 'char-player' | 'char-npcs'): boolean {
  return scene.textures.exists(key)
}

/** 某方向的站立帧 */
export function idleFrame(f: Facing): number {
  return DIR_ROW[f] * 3
}

/** 脚底锚点：精灵放在格子中心时，脚落在格子下沿附近 */
export function anchorFeet<T extends Phaser.GameObjects.Components.Origin>(spr: T): T {
  spr.setOrigin(0.5, 1 - FOOT_OFFSET / FRAME_H)
  return spr
}

/**
 * 注册玩家行走动画 walk-down / walk-up / walk-left / walk-right（全局，只注册一次）
 * @author zjh
 * @date 2026-10-14
 */
export function registerCharAnims(scene: Phaser.Scene): void {
  if (!hasCharArt(scene, 'char-player')) return
  for (const [dir, row] of Object.entries(DIR_ROW)) {
    const key = `walk-${dir}`
    if (scene.anims.exists(key)) continue
    const base = row * 3
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers('char-player', { frames: [base + 1, base, base + 2, base] }),
      frameRate: 10,
      repeat: -1,
    })
  }
}
