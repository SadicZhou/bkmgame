/**
 * 闲逛 NPC：在出生点附近（曼哈顿距离 ≤ wander）随机走动，
 * 每次停留一会儿再走一格；对话 / 菜单 / 过场时原地停下。
 * NPC 的「当前格子」以这里记录的为准（交互、碰撞都查这里）
 * @author zjh
 * @date 2026-10-15
 */
import Phaser from 'phaser'
import { resolveTile, type HasFlag, type MapDef, type NpcDef, type TileKind } from '../../data/maps'
import { decorBlocks } from '../../data/decor'
import { stepBob } from '../../graphics/CharArt'
import type { WalkerBody } from './NpcLayer'

/** NPC 走一格的时长（比玩家慢，显得悠闲） */
const STEP_MS = 280
/** 两次走动之间的停留时间范围 */
const WAIT_MIN = 1800
const WAIT_MAX = 4200
/** NPC 只在这些地面上走动（不进草丛、不踩传送点 / 门口 / 桥） */
const WALKABLE: ReadonlySet<TileKind> = new Set(['grass', 'path', 'floor'])
const DIRS = [
  [0, 1],
  [0, -1],
  [-1, 0],
  [1, 0],
] as const

interface Walker {
  body: WalkerBody
  x: number
  y: number
  /** 距离下一次走动的剩余毫秒 */
  wait: number
  moving: boolean
}

/** 由 WorldScene 提供的查询能力 */
export interface WalkerHost {
  map: MapDef
  hasFlag: HasFlag
  /** 玩家当前（或正要走到的）格子 */
  playerTile: () => { x: number; y: number }
  /** 该格是否被其他东西占着（静止 NPC、世界事件物件等） */
  blockedByOthers: (x: number, y: number) => boolean
}

export class NpcWalkers {
  private readonly walkers: Walker[]
  private readonly scene: Phaser.Scene
  private readonly host: WalkerHost

  constructor(scene: Phaser.Scene, bodies: WalkerBody[], host: WalkerHost) {
    this.scene = scene
    this.host = host
    this.walkers = bodies.map((body) => ({
      body,
      x: body.npc.x,
      y: body.npc.y,
      // 刚进图先站一会儿，避免一进门就看见大家同时起步
      wait: WAIT_MIN + Math.random() * WAIT_MAX,
      moving: false,
    }))
  }

  /** 是否有闲逛 NPC */
  get size(): number {
    return this.walkers.length
  }

  /** 某格上的闲逛 NPC（含正在走向该格的） */
  npcAt(x: number, y: number): NpcDef | null {
    return this.walkers.find((w) => w.x === x && w.y === y)?.body.npc ?? null
  }

  /** 是否由闲逛系统负责该 NPC 的位置 */
  owns(npc: NpcDef): boolean {
    return this.walkers.some((w) => w.body.npc === npc)
  }

  /**
   * 每帧推进；paused 时（对话、菜单、过场）不开始新的一步
   * @author zjh
   * @date 2026-10-15
   */
  update(delta: number, paused: boolean): void {
    if (paused) return
    for (const w of this.walkers) {
      if (w.moving) continue
      w.wait -= delta
      if (w.wait > 0) continue
      w.wait = WAIT_MIN + Math.random() * (WAIT_MAX - WAIT_MIN)
      this.tryStep(w)
    }
  }

  /** 和玩家说完话后，让 NPC 在原地多站一会儿 */
  hold(npc: NpcDef, ms = 2500): void {
    const w = this.walkers.find((v) => v.body.npc === npc)
    if (w && !w.moving) w.wait = Math.max(w.wait, ms)
  }

  private tryStep(w: Walker): void {
    const options = Phaser.Utils.Array.Shuffle([...DIRS])
    for (const [dx, dy] of options) {
      const nx = w.x + dx
      const ny = w.y + dy
      if (this.canStand(w, nx, ny)) {
        this.walk(w, nx, ny)
        return
      }
    }
  }

  private canStand(w: Walker, x: number, y: number): boolean {
    const { map, hasFlag } = this.host
    const npc = w.body.npc
    if (Math.abs(x - npc.x) + Math.abs(y - npc.y) > (npc.wander ?? 0)) return false
    const tile = resolveTile(map, x, y, hasFlag)
    if (!tile || !WALKABLE.has(tile)) return false
    if (decorBlocks(map.id, x, y)) return false
    if (map.warps.some((v) => v.x === x && v.y === y)) return false
    const p = this.host.playerTile()
    if (p.x === x && p.y === y) return false
    if (this.walkers.some((o) => o !== w && o.x === x && o.y === y)) return false
    return !this.host.blockedByOthers(x, y)
  }

  /**
   * 走一格：先占住目标格，再播放行走动画和位移补间
   * @author zjh
   * @date 2026-10-15
   */
  private walk(w: Walker, nx: number, ny: number): void {
    const ts = this.host.map.tileSize
    const { spr, shadow, anim, idle } = w.body
    w.x = nx
    w.y = ny
    w.moving = true
    const tx = nx * ts + ts / 2
    const ty = ny * ts + ts / 2
    spr.play(anim, true)
    stepBob(this.scene, spr, STEP_MS)
    this.scene.tweens.add({ targets: shadow, x: tx, y: ty + 13, duration: STEP_MS })
    this.scene.tweens.add({
      targets: spr,
      x: tx,
      y: ty,
      duration: STEP_MS,
      onComplete: () => {
        w.moving = false
        spr.anims.stop()
        spr.setFrame(idle)
      },
    })
  }
}
