/**
 * NPC 名册：记录当前地图上已经生成的 NPC 及其显示对象。
 * - 进图时生成全部可见 NPC；
 * - sync()：昼夜 / 天气 / 剧情旗标变化后，对比「应当显示」与「已显示」，
 *   该消失的淡出移除、该出现的淡入生成（出生格被玩家或别的 NPC 占着时先排队，空出来再出现，避免隐形挡路）。
 * @author zjh
 * @date 2026-10-15
 */

import Phaser from 'phaser'
import { visibleNpcs, type HasFlag, type MapDef, type NpcDef } from '../../data/maps'
import { spawnNpc, type WalkerBody } from './NpcLayer'
import type { NpcWalkers } from './NpcWalkers'

/** 淡入 / 淡出时长 */
const FADE_MS = 450

export class NpcRoster {
  private readonly scene: Phaser.Scene
  private readonly map: MapDef
  /** 不由 NpcWalkers 驱动的 NPC 与其显示对象 */
  private readonly statics = new Map<NpcDef, Phaser.GameObjects.GameObject[]>()
  /** 能动的 NPC */
  private readonly moving = new Set<NpcDef>()
  /** 应当出现、但出生格暂时被占的 NPC */
  private pending: NpcDef[] = []
  private walkers: NpcWalkers | null = null

  constructor(scene: Phaser.Scene, map: MapDef) {
    this.scene = scene
    this.map = map
  }

  /**
   * 进图时生成全部可见 NPC；返回能动的 NPC 的显示部件（交给 NpcWalkers）
   * @author zjh
   * @date 2026-10-15
   */
  spawnAll(hasFlag: HasFlag): WalkerBody[] {
    const bodies: WalkerBody[] = []
    for (const npc of visibleNpcs(this.map, hasFlag)) {
      const body = this.place(npc)
      if (body) bodies.push(body)
    }
    return bodies
  }

  bind(walkers: NpcWalkers): void {
    this.walkers = walkers
  }

  /** 站在地图定义位置上、不会动的 NPC */
  staticAt(x: number, y: number): NpcDef | null {
    for (const npc of this.statics.keys()) if (npc.x === x && npc.y === y) return npc
    return null
  }

  /** 是否已显示 */
  shown(npc: NpcDef): boolean {
    return this.statics.has(npc) || this.moving.has(npc)
  }

  /** 夜里自带微光的物件（发光菇）所在的世界坐标 */
  glows(): { x: number; y: number }[] {
    const ts = this.map.tileSize
    return [...this.statics.keys()].filter((n) => n.bob).map((n) => ({ x: n.x * ts + ts / 2, y: n.y * ts + ts / 2 }))
  }

  get hasPending(): boolean {
    return this.pending.length > 0
  }

  /**
   * 按当前旗标增删 NPC
   * @param occupied 某格是否被玩家 / 世界事件占着（NPC 之间的占用这里自己查）
   * @returns 本次是否有变化
   * @author zjh
   * @date 2026-10-15
   */
  sync(hasFlag: HasFlag, occupied: (x: number, y: number) => boolean): boolean {
    const want = new Set(visibleNpcs(this.map, hasFlag))
    let changed = false
    for (const npc of [...this.statics.keys(), ...this.moving]) {
      if (want.has(npc)) continue
      this.despawn(npc)
      changed = true
    }
    this.pending = []
    for (const npc of want) {
      if (this.shown(npc)) continue
      if (occupied(npc.x, npc.y) || this.walkers?.npcAt(npc.x, npc.y) || this.staticAt(npc.x, npc.y)) {
        this.pending.push(npc)
        continue
      }
      const body = this.place(npc, true)
      if (body) this.walkers?.add(body)
      changed = true
    }
    return changed
  }

  /** 生成并登记；fade 时从透明淡入 */
  private place(npc: NpcDef, fade = false): WalkerBody | null {
    const { body, objects } = spawnNpc(this.scene, this.map, npc)
    const all = body ? bodyObjects(body) : objects
    if (fade) {
      for (const o of all) {
        const t = o as unknown as Phaser.GameObjects.Components.Alpha
        const to = t.alpha
        t.setAlpha(0)
        this.scene.tweens.add({ targets: o, alpha: to, duration: FADE_MS })
      }
    }
    if (body) this.moving.add(npc)
    else this.statics.set(npc, objects)
    return body
  }

  /** 移除并淡出销毁 */
  private despawn(npc: NpcDef): void {
    let objs: Phaser.GameObjects.GameObject[] = []
    if (this.moving.delete(npc)) {
      const body = this.walkers?.remove(npc)
      if (body) objs = bodyObjects(body)
    } else {
      objs = this.statics.get(npc) ?? []
      this.statics.delete(npc)
    }
    for (const o of objs) {
      this.scene.tweens.killTweensOf(o)
      this.scene.tweens.add({ targets: o, alpha: 0, duration: FADE_MS, onComplete: () => o.destroy() })
    }
  }
}

function bodyObjects(body: WalkerBody): Phaser.GameObjects.GameObject[] {
  return [body.spr, body.shadow, ...(body.mark ? [body.mark] : [])]
}
