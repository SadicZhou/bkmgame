/**
 * 能动的 NPC：
 * - 闲逛（wander）：在出生点附近随机走动；
 * - 巡逻（patrol）：沿路点直线往返，到点停下张望；
 * - 原地（有四方向行走图的其余 NPC）：偶尔左右张望；
 * - 训练家视线（sight）：正前方 N 格内看见玩家就报告给场景；
 * - 玩家停在身边：转身面对玩家，并按 emote 冒表情。
 * 对话 / 菜单 / 过场时原地停下。NPC 的「当前格子」以这里记录的为准（交互、碰撞都查这里）
 * @author zjh
 * @date 2026-10-15
 */
import Phaser from 'phaser'
import { resolveTile, isSolid, type HasFlag, type MapDef, type NpcDef, type TileKind } from '../../data/maps'
import { decorBlocks } from '../../data/decor'
import { stepBob } from '../../graphics/CharArt'
import type { Facing } from '../../state/GameState'
import { showEmote } from './NpcEmote'
import { PERSON_MARK_DY, type WalkerBody } from './NpcLayer'

/** NPC 走一格的时长（比玩家慢，显得悠闲） */
const STEP_MS = 280
/** 闲逛：两次走动之间的停留时间范围 */
const WAIT_MIN = 1800
const WAIT_MAX = 4200
/** 巡逻：到路点后的停留时间范围 */
const PATROL_PAUSE_MIN = 1200
const PATROL_PAUSE_MAX = 2200
/** 同一个 NPC 两次冒表情的最短间隔 */
const EMOTE_COOLDOWN = 8000
/** 闲逛只走这些地面（不进草丛、不踩桥 / 门口） */
const WALKABLE: ReadonlySet<TileKind> = new Set(['grass', 'path', 'floor'])
const DIR_VEC: Record<Facing, readonly [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }
const FACINGS: Facing[] = ['down', 'up', 'left', 'right']

interface Walker {
  body: WalkerBody
  x: number
  y: number
  facing: Facing
  moving: boolean
  /** 距离下一次行动的剩余毫秒 */
  wait: number
  /** 巡逻路线（含出生点）与当前目标下标、前进方向 */
  route: { x: number; y: number }[]
  leg: number
  legDir: 1 | -1
  emoteCd: number
}

/** 由 WorldScene 提供的查询能力 */
export interface WalkerHost {
  map: MapDef
  hasFlag: HasFlag
  /** 玩家当前（或正要走到的）格子 */
  playerTile: () => { x: number; y: number }
  /** 该格是否被其他东西占着（静止 NPC、世界事件物件等） */
  blockedByOthers: (x: number, y: number) => boolean
  /** 这位训练家现在能不能发起视线对战（未击败、玩家有可战伙伴、场景空闲） */
  canSpot: (npc: NpcDef) => boolean
  /** 被训练家看见了 */
  onSpotted: (npc: NpcDef) => void
}

function towards(fromX: number, fromY: number, toX: number, toY: number): Facing {
  const dx = toX - fromX
  const dy = toY - fromY
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'left' : 'right'
  return dy < 0 ? 'up' : 'down'
}

const randWait = (min: number, max: number) => min + Math.random() * (max - min)

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
      facing: body.npc.facing ?? 'down',
      moving: false,
      // 刚进图先站一会儿，避免一进门就看见大家同时起步
      wait: randWait(WAIT_MIN, WAIT_MAX),
      route: body.npc.patrol ? [{ x: body.npc.x, y: body.npc.y }, ...body.npc.patrol] : [],
      leg: 1,
      legDir: 1,
      emoteCd: 0,
    }))
  }

  /** 某格上的 NPC（含正在走向该格的） */
  npcAt(x: number, y: number): NpcDef | null {
    return this.walkers.find((w) => w.x === x && w.y === y)?.body.npc ?? null
  }

  /** 是否由本系统负责该 NPC 的位置 */
  owns(npc: NpcDef): boolean {
    return this.walkers.some((w) => w.body.npc === npc)
  }

  /**
   * 每帧推进；paused 时（对话、菜单、过场）不开始新的行动
   * @author zjh
   * @date 2026-10-15
   */
  update(time: number, delta: number, paused: boolean): void {
    const bob = 1.5 + Math.sin(time / 160) * 1.5
    for (const w of this.walkers) {
      w.body.mark?.setPosition(w.body.spr.x, w.body.spr.y + PERSON_MARK_DY - bob)
      w.emoteCd -= delta
    }
    if (paused) return
    const p = this.host.playerTile()
    for (const w of this.walkers) {
      if (w.moving) continue
      w.wait -= delta
      if (w.wait > 0) continue
      // 玩家站在身边：不走开，一直面向玩家（巡逻的训练家照常巡逻）
      if (!w.route.length && Math.abs(w.x - p.x) + Math.abs(w.y - p.y) === 1) {
        this.face(w, towards(w.x, w.y, p.x, p.y))
        w.wait = 800
        continue
      }
      if (w.route.length) this.patrolTick(w)
      else if (w.body.npc.wander) this.wanderTick(w)
      else this.idleTick(w)
    }
  }

  /** 和玩家说话：转身面对玩家，并在原地多站一会儿 */
  greet(npc: NpcDef): void {
    const w = this.find(npc)
    if (!w || w.moving) return
    const p = this.host.playerTile()
    this.face(w, towards(w.x, w.y, p.x, p.y))
    w.wait = Math.max(w.wait, 2500)
  }

  /**
   * 玩家落脚后：身边的 NPC 转身面对玩家并冒表情
   * @author zjh
   * @date 2026-10-15
   */
  react(): void {
    const p = this.host.playerTile()
    for (const w of this.walkers) {
      if (w.moving || Math.abs(w.x - p.x) + Math.abs(w.y - p.y) !== 1) continue
      this.face(w, towards(w.x, w.y, p.x, p.y))
      w.wait = Math.max(w.wait, 1500)
      const emote = w.body.npc.emote
      if (emote && w.emoteCd <= 0) {
        w.emoteCd = EMOTE_COOLDOWN
        showEmote(this.scene, emote, w.body.spr)
      }
    }
  }

  /**
   * 找出正前方视线内能看见玩家的训练家
   * @author zjh
   * @date 2026-10-15
   */
  spotter(): NpcDef | null {
    const p = this.host.playerTile()
    for (const w of this.walkers) {
      if (!w.moving && this.sees(w, p.x, p.y)) return w.body.npc
    }
    return null
  }

  /**
   * 被发现后：训练家头顶冒「!」，沿视线走到玩家面前，再转身面对玩家
   * @param done 参数为训练家所在格
   * @author zjh
   * @date 2026-10-15
   */
  approach(npc: NpcDef, done: (at: { x: number; y: number }) => void): void {
    const w = this.find(npc)
    if (!w) {
      done({ x: npc.x, y: npc.y })
      return
    }
    showEmote(this.scene, '!', w.body.spr, -38, 500)
    this.scene.time.delayedCall(650, () => this.walkUpTo(w, done))
  }

  private walkUpTo(w: Walker, done: (at: { x: number; y: number }) => void): void {
    const p = this.host.playerTile()
    const stepOn = () => {
      if (Math.abs(w.x - p.x) + Math.abs(w.y - p.y) <= 1) {
        this.face(w, towards(w.x, w.y, p.x, p.y))
        done({ x: w.x, y: w.y })
        return
      }
      const [dx, dy] = DIR_VEC[w.facing]
      this.walk(w, w.x + dx, w.y + dy, stepOn)
    }
    stepOn()
  }

  private find(npc: NpcDef): Walker | undefined {
    return this.walkers.find((v) => v.body.npc === npc)
  }

  private sees(w: Walker, px: number, py: number): boolean {
    const range = w.body.npc.sight ?? 0
    if (!range || !this.host.canSpot(w.body.npc)) return false
    const [dx, dy] = DIR_VEC[w.facing]
    for (let k = 1; k <= range; k++) {
      const x = w.x + dx * k
      const y = w.y + dy * k
      if (x === px && y === py) return true
      const tile = resolveTile(this.host.map, x, y, this.host.hasFlag)
      if (!tile || isSolid(tile) || decorBlocks(this.host.map.id, x, y) || this.npcAt(x, y) || this.host.blockedByOthers(x, y)) return false
    }
    return false
  }

  /** 转身；有四方向行走图才换帧 */
  private face(w: Walker, f: Facing): void {
    w.facing = f
    const { spr, look } = w.body
    if (look.turns && !w.moving) spr.setFrame(look.idle(f))
  }

  /** 转身或走完一步后：如果正好看见玩家，报告给场景 */
  private watch(w: Walker): void {
    const p = this.host.playerTile()
    if (this.sees(w, p.x, p.y)) this.host.onSpotted(w.body.npc)
  }

  private wanderTick(w: Walker): void {
    w.wait = randWait(WAIT_MIN, WAIT_MAX)
    for (const [dx, dy] of Phaser.Utils.Array.Shuffle([...Object.values(DIR_VEC)])) {
      if (this.canWander(w, w.x + dx, w.y + dy)) {
        this.walk(w, w.x + dx, w.y + dy)
        return
      }
    }
  }

  /** 原地的 NPC 偶尔张望一下，多数时候回到原本的朝向 */
  private idleTick(w: Walker): void {
    w.wait = randWait(WAIT_MIN * 1.5, WAIT_MAX * 1.5)
    if (!w.body.look.turns || w.body.npc.sight) return
    const home = w.body.npc.facing ?? 'down'
    this.face(w, w.facing !== home || Math.random() < 0.5 ? home : Phaser.Utils.Array.GetRandom(FACINGS.filter((f) => f !== home)))
  }

  /**
   * 巡逻：朝当前路点走一格；到点后停下张望，再换下一个路点（两端折返）
   * @author zjh
   * @date 2026-10-15
   */
  private patrolTick(w: Walker): void {
    const target = w.route[w.leg]
    if (w.x === target.x && w.y === target.y) {
      this.face(w, w.body.npc.patrolLook ?? 'down')
      w.wait = randWait(PATROL_PAUSE_MIN, PATROL_PAUSE_MAX)
      if (w.leg + w.legDir < 0 || w.leg + w.legDir >= w.route.length) w.legDir = w.legDir === 1 ? -1 : 1
      w.leg += w.legDir
      this.watch(w)
      return
    }
    const f = towards(w.x, w.y, target.x, target.y)
    const [dx, dy] = DIR_VEC[f]
    if (!this.free(w, w.x + dx, w.y + dy)) {
      // 被挡住：转向那边等一会儿再试
      this.face(w, f)
      w.wait = 600
      this.watch(w)
      return
    }
    this.walk(w, w.x + dx, w.y + dy, () => this.watch(w))
  }

  /** 该格没有被玩家、其他 NPC、装饰物、传送点占着，且不是墙 / 水 */
  private free(w: Walker, x: number, y: number): boolean {
    const { map, hasFlag } = this.host
    const tile = resolveTile(map, x, y, hasFlag)
    if (!tile || isSolid(tile) || tile === 'warp' || tile === 'door') return false
    if (decorBlocks(map.id, x, y) || map.warps.some((v) => v.x === x && v.y === y)) return false
    const p = this.host.playerTile()
    if (p.x === x && p.y === y) return false
    if (this.walkers.some((o) => o !== w && o.x === x && o.y === y)) return false
    return !this.host.blockedByOthers(x, y)
  }

  private canWander(w: Walker, x: number, y: number): boolean {
    const npc = w.body.npc
    if (Math.abs(x - npc.x) + Math.abs(y - npc.y) > (npc.wander ?? 0)) return false
    const tile = resolveTile(this.host.map, x, y, this.host.hasFlag)
    return !!tile && WALKABLE.has(tile) && this.free(w, x, y)
  }

  /**
   * 走一格：先占住目标格，再播放行走动画和位移补间
   * @author zjh
   * @date 2026-10-15
   */
  private walk(w: Walker, nx: number, ny: number, after?: () => void): void {
    const ts = this.host.map.tileSize
    const { spr, shadow, look } = w.body
    w.facing = towards(w.x, w.y, nx, ny)
    w.x = nx
    w.y = ny
    w.moving = true
    const tx = nx * ts + ts / 2
    const ty = ny * ts + ts / 2
    spr.play(look.anim(w.facing), true)
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
        spr.setFrame(look.idle(w.facing))
        after?.()
      },
    })
  }
}
