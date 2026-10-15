/**
 * 人物行走图（AI 像素画）：玩家 4 方向 × 3 帧（站立 / 迈左脚 / 迈右脚），NPC 每人 1 帧；
 * 常驻 / 巡逻 NPC 另有四方向行走图（actor-*，见 NPC_ACTOR）。
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

/**
 * 有四方向行走图的 NPC：id → art-src/chars/actors/<名称>.jpg
 * （scripts/process-actors.py 输出 actor-<名称>.png，布局同玩家：下 / 上 / 左 / 右 各 3 帧）
 */
const NPC_ACTOR: Record<string, string> = {
  elder: 'elder',
  kid: 'kid',
  ranger: 'ranger',
  forest_moss: 'ranger',
  forest_moss2: 'ranger',
  hiker: 'hiker',
  town_farmer: 'farmer',
  town_florist: 'florist',
  lake_washer: 'washer',
}

export type CharSheet = 'char-player' | 'char-npcs' | 'char-npcs2' | 'char-npcs3'

/**
 * 在 preload 阶段加载行走图
 * @author zjh
 * @date 2026-10-14
 */
export function preloadCharArt(scene: Phaser.Scene): void {
  const frame = { frameWidth: FRAME_W, frameHeight: FRAME_H }
  for (const key of ['char-player', 'char-npcs', 'char-npcs2', 'char-npcs3']) {
    scene.load.spritesheet(key, `assets/chars/${key}.png`, frame)
    // 行走帧（scripts/make-walk-frames.py 生成）：玩家布局不变；NPC 每人 3 帧
    scene.load.spritesheet(`${key}-walk`, `assets/chars/${key}-walk.png`, frame)
  }
  for (const name of new Set(Object.values(NPC_ACTOR))) {
    scene.load.spritesheet(`actor-${name}`, `assets/chars/actor-${name}.png`, frame)
  }
}

/** 玩家实际使用的图集：有生成的行走帧就用它（站立帧相同，迈步帧更明显） */
export function playerSheet(scene: Phaser.Scene): string {
  return scene.textures.exists('char-player-walk') ? 'char-player-walk' : 'char-player'
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
  const sheet = playerSheet(scene)
  for (const [dir, row] of Object.entries(DIR_ROW)) {
    const key = `walk-${dir}`
    if (scene.anims.exists(key)) continue
    const base = row * 3
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(sheet, { frames: [base + 1, base, base + 2, base] }),
      frameRate: WALK_FPS,
      repeat: -1,
    })
  }
}

/** 行走动画帧率：一格走一个「迈脚 → 站立」，两格完成一次左右脚循环 */
export const WALK_FPS = 14

/** NPC 行走动画帧率（比玩家慢，配合更长的单步时长） */
const NPC_WALK_FPS = WALK_FPS * 0.6

/** NPC 的外观：所用图集、某方向的站立帧与行走动画；turns 为 false 时只有正面 */
export interface NpcLook {
  sheet: string
  turns: boolean
  idle: (f: Facing) => number
  anim: (f: Facing) => string
}

/** 按需注册一段「迈左脚 → 站立 → 迈右脚 → 站立」循环动画 */
function ensureWalkAnim(scene: Phaser.Scene, key: string, sheet: string, base: number, fps: number): string {
  if (!scene.anims.exists(key)) {
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(sheet, { frames: [base + 1, base, base + 2, base] }),
      frameRate: fps,
      repeat: -1,
    })
  }
  return key
}

/**
 * NPC 的可行走外观：优先四方向行走图，其次只有正面的 -walk 图集；都没有返回 null
 * @author zjh
 * @date 2026-10-15
 */
export function npcLook(scene: Phaser.Scene, npcId: string): NpcLook | null {
  const actor = NPC_ACTOR[npcId]
  const actorSheet = `actor-${actor}`
  if (actor && scene.textures.exists(actorSheet)) {
    return {
      sheet: actorSheet,
      turns: true,
      idle: (f) => DIR_ROW[f] * 3,
      anim: (f) => ensureWalkAnim(scene, `actorwalk-${actor}-${f}`, actorSheet, DIR_ROW[f] * 3, NPC_WALK_FPS),
    }
  }
  const art = npcArt(scene, npcId)
  const sheet = art ? `${art.key}-walk` : ''
  if (!art || !scene.textures.exists(sheet)) return null
  const base = art.frame * 3
  return {
    sheet,
    turns: false,
    idle: () => base,
    anim: () => ensureWalkAnim(scene, `npcwalk-${art.key}-${art.frame}`, sheet, base, NPC_WALK_FPS),
  }
}

/**
 * 走一步时身体轻微上下起伏（改锚点，不和位移补间抢 y）
 * @author zjh
 * @date 2026-10-15
 */
export function stepBob(scene: Phaser.Scene, spr: Phaser.GameObjects.Sprite, ms: number): void {
  const base = 1 - FOOT_OFFSET / FRAME_H
  const lift = { px: 0 }
  scene.tweens.add({
    targets: lift,
    px: 1.5,
    duration: ms / 2,
    yoyo: true,
    ease: 'Sine.easeOut',
    onUpdate: () => spr.setOrigin(0.5, base + lift.px / FRAME_H),
    onComplete: () => spr.setOrigin(0.5, base),
  })
}
