/**
 * 千岩峡谷的巨石：挡住走路、面朝按确认推动、填进裂缝后让出路
 * @author zjh
 * @date 2026-10-16
 */

import Phaser from 'phaser'
import { SPECIES } from '../../data/creatures'
import { visibleNpcs, type MapDef, type TileKind } from '../../data/maps'
import { GameState } from '../../state/GameState'
import { Sfx } from '../../systems/AudioBeeps'
import { allBoulders, boulderBlocks, commitPush, tryPush, wallOpened } from '../../systems/Boulders'

const PUSH_MS = 180

/**
 * 只在千岩峡谷创建
 * @author zjh
 * @date 2026-10-16
 */
export class CanyonField {
  private readonly sprites = new Map<string, Phaser.GameObjects.Ellipse>()
  busy = false
  private readonly scene: Phaser.Scene
  private readonly map: MapDef
  private readonly toast: (m: string) => void

  constructor(scene: Phaser.Scene, map: MapDef, toast: (m: string) => void) {
    this.scene = scene
    this.map = map
    this.toast = toast
    if (map.id !== 'canyon') return
    for (const { def, pos } of allBoulders((k) => GameState.getFlag(k))) {
      const dot = scene.add.ellipse(0, 0, 22, 16, 0x8a7560).setStrokeStyle(2, 0x5a4838).setDepth(9)
      this.sprites.set(def.id, dot)
      this.place(def.id, pos.x, pos.y, pos.sunk)
    }
  }

  blocks(x: number, y: number): boolean {
    return this.map.id === 'canyon' && boulderBlocks(x, y, (k) => GameState.getFlag(k))
  }

  opens(x: number, y: number): boolean {
    return this.map.id === 'canyon' && wallOpened(x, y, (k) => GameState.getFlag(k))
  }

  /**
   * 面朝巨石：检查手套和队伍，再推一格
   * @author zjh
   * @date 2026-10-16
   */
  tryInteract(x: number, y: number, dx: number, dy: number): boolean {
    if (this.map.id !== 'canyon' || this.busy) return false
    if (!boulderBlocks(x, y, (k) => GameState.getFlag(k))) return false
    const why = shoveBlock()
    if (why) {
      this.toast(why)
      Sfx.cancel()
      return true
    }
    const occupied = (tx: number, ty: number) => this.blocks(tx, ty) || visibleNpcs(this.map, GameState.hasFlag).some((n) => n.x === tx && n.y === ty)
    const result = tryPush(x, y, dx, dy, (k) => GameState.getFlag(k), (tx, ty) => this.tile(tx, ty), occupied)
    if (!result.ok || result.x === undefined || result.y === undefined) {
      this.toast(result.reason ?? '这边推不过去。')
      Sfx.cancel()
      return true
    }
    const id = result.reason ?? ''
    commitPush(id, result, (k, v) => GameState.setFlag(k, v))
    this.busy = true
    Sfx.confirm()
    const spr = this.sprites.get(id)
    const ts = this.map.tileSize
    if (!spr) {
      this.busy = false
      return true
    }
    this.scene.tweens.add({
      targets: spr,
      x: result.x * ts + ts / 2,
      y: result.y * ts + ts / 2,
      duration: PUSH_MS,
      onComplete: () => {
        this.place(id, result.x!, result.y!, !!result.sunk)
        this.busy = false
        if (result.sunk) this.toast('石头沉进裂缝里，路通了。')
      },
    })
    return true
  }

  private tile(x: number, y: number): TileKind | null {
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return null
    return this.map.tiles[y * this.map.width + x]
  }

  private place(id: string, x: number, y: number, sunk: boolean): void {
    const spr = this.sprites.get(id)
    if (!spr) return
    const ts = this.map.tileSize
    spr.setPosition(x * ts + ts / 2, y * ts + ts / 2 + (sunk ? 4 : 0))
    spr.setAlpha(sunk ? 0.45 : 1)
    spr.setScale(sunk ? 0.7 : 1)
    spr.setDepth(sunk ? 2 : 9)
  }
}

/** 没有手套，或队伍里没有能用力的伙伴 */
function shoveBlock(): string | null {
  if (GameState.itemCount('strength_gloves') <= 0) return '赤手空拳推不动。去锤音镇找登山客峰吧。'
  const strong = GameState.party.some((c) => {
    if (c.hp <= 0) return false
    const t = SPECIES[c.speciesId]?.type
    return t === 'stone' || t === 'normal'
  })
  return strong ? null : '队伍里没有岩系或一般系的伙伴，石头纹丝不动。'
}
