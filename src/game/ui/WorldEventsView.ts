/**
 * 地图上的事件表现：异象小目标（足迹 / 碎片）、异象中心的唯一精灵、心火结晶
 * 每次状态变化后调用 refresh() 重新绘制。
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { setCreatureScale } from '../graphics/CreatureArt'
import { spriteKey } from '../data/creatures'
import type { MapDef } from '../data/maps'
import type { PhenomenonDef } from '../data/phenomena'
import { GameState } from '../state/GameState'
import { activePhenomenon, visibleGoalSpots } from '../systems/Phenomenon'

/** 各异象小目标物件贴图 */
const GOAL_TEXTURE: Record<string, string> = {
  meteor_shower: 'obj-star',
  flower_bloom: 'obj-petal',
  lava_eruption: 'obj-lava',
}

export class WorldEventsView {
  private readonly scene: Phaser.Scene
  private readonly map: MapDef
  private objects: Phaser.GameObjects.GameObject[] = []

  constructor(scene: Phaser.Scene, map: MapDef) {
    this.scene = scene
    this.map = map
  }

  /** 本地图正在进行的异象 */
  phenomenonHere(): PhenomenonDef | null {
    const def = activePhenomenon(GameState.world)
    return def && def.mapId === this.map.id ? def : null
  }

  /** 该格子是否站着唯一精灵（不可穿行，可互动） */
  uniqueAt(x: number, y: number): PhenomenonDef | null {
    const def = this.phenomenonHere()
    return def && def.center.x === x && def.center.y === y ? def : null
  }

  /**
   * 重新绘制所有事件物件
   * @author zjh
   * @date 2026-10-14
   */
  refresh(): void {
    this.objects.forEach((o) => o.destroy())
    this.objects = []
    const ts = this.map.tileSize
    const at = (x: number, y: number) => ({ cx: x * ts + ts / 2, cy: y * ts + ts / 2 })
    const w = GameState.world

    const def = this.phenomenonHere()
    if (def) {
      for (const s of visibleGoalSpots(w, this.map.id)) {
        const { cx, cy } = at(s.x, s.y)
        const img = this.scene.add.image(cx, cy, GOAL_TEXTURE[def.id] ?? 'obj-star').setDepth(8)
        this.scene.tweens.add({ targets: img, y: cy - 3, alpha: 0.6, yoyo: true, repeat: -1, duration: 600 })
        this.objects.push(img)
      }
      const { cx, cy } = at(def.center.x, def.center.y)
      const glow = this.scene.add.circle(cx, cy + 4, 18, def.tint, 0.35).setDepth(8)
      this.scene.tweens.add({ targets: glow, scale: 1.4, alpha: 0.1, yoyo: true, repeat: -1, duration: 900 })
      const pending = w.phenomenon.pendingUniques[def.id]
      const tex = pending ? spriteKey(pending) : `spr-${def.uniqueSpeciesId}`
      const spr = setCreatureScale(this.scene.add.image(cx, cy, tex), 0.7).setDepth(9)
      this.scene.tweens.add({ targets: spr, y: cy - 4, yoyo: true, repeat: -1, duration: 800, ease: 'Sine.easeInOut' })
      const mark = this.scene.add
        .text(cx, cy - 26, '✧', { fontSize: '14px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 })
        .setOrigin(0.5)
        .setDepth(11)
      this.scene.tweens.add({ targets: mark, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 })
      this.objects.push(glow, spr, mark)
    }

    const m = w.minor
    if (m.id === 'crystal' && m.mapId === this.map.id && m.spot) {
      const { cx, cy } = at(m.spot.x, m.spot.y)
      const img = this.scene.add.image(cx, cy, 'obj-crystal').setDepth(8)
      this.scene.tweens.add({ targets: img, y: cy - 4, yoyo: true, repeat: -1, duration: 700 })
      this.objects.push(img)
    }
  }

  /** 地图氛围染色（无异象时为 0） */
  tint(): { color: number; alpha: number } {
    const def = this.phenomenonHere()
    return def ? { color: def.tint, alpha: 0.12 } : { color: 0, alpha: 0 }
  }
}
