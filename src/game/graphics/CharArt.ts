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
  lake_shio: 7,
  forest_moss: 5,
  forest_moss2: 5,
}

/** 第二章 NPC（art-src/chars/npcs2.jpg，一行 3 人） */
const NPC2_FRAME: Record<string, number> = {
  scout1: 0,
  scout2: 1,
  angler: 2,
}

/** 第三章 NPC（art-src/chars/npcs3.jpg：绯 / 巡林者 / 菇菇奶奶） */
const NPC3_FRAME: Record<string, number> = {
  kindler: 0,
  forest_patrol: 1,
  mushroom_granny: 2,
}

export type CharSheet = 'char-player' | 'char-npcs' | 'char-npcs2' | 'char-npcs3'

/**
 * 在 preload 阶段加载行走图
 * @author zjh
 * @date 2026-10-14
 */
export function preloadCharArt(scene: Phaser.Scene): void {
  const frame = { frameWidth: FRAME_W, frameHeight: FRAME_H }
  scene.load.spritesheet('char-player', 'assets/chars/char-player.png', frame)
  scene.load.spritesheet('char-npcs', 'assets/chars/char-npcs.png', frame)
  scene.load.spritesheet('char-npcs2', 'assets/chars/char-npcs2.png', frame)
  scene.load.spritesheet('char-npcs3', 'assets/chars/char-npcs3.png', frame)
}

/** 行走图是否已加载 */
export function hasCharArt(scene: Phaser.Scene, key: CharSheet): boolean {
  return scene.textures.exists(key)
}

/**
 * NPC 立绘所在的图集与帧号；没登记或图没加载时返回 null（回退到代码小人）
 * @author zjh
 * @date 2026-10-15
 */
export function npcArt(scene: Phaser.Scene, npcId: string): { key: CharSheet; frame: number } | null {
  if (NPC3_FRAME[npcId] !== undefined && hasCharArt(scene, 'char-npcs3')) return { key: 'char-npcs3', frame: NPC3_FRAME[npcId] }
  if (NPC2_FRAME[npcId] !== undefined && hasCharArt(scene, 'char-npcs2')) return { key: 'char-npcs2', frame: NPC2_FRAME[npcId] }
  if (NPC_FRAME[npcId] !== undefined && hasCharArt(scene, 'char-npcs')) return { key: 'char-npcs', frame: NPC_FRAME[npcId] }
  return null
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
