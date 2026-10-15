/**
 * v3.4.3 NPC 行动数据单元测试：巡逻路线、视线训练家、新路人站位、四方向行走图文件
 * @author zjh
 * @date 2026-10-15
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { decorBlocks } from '../src/game/data/decor'
import { MAPS, isSolid, tileAt, visibleNpcs, type MapDef, type NpcDef } from '../src/game/data/maps'
import { GameState } from '../src/game/state/GameState'

const allNpcs = (): { map: MapDef; npc: NpcDef }[] => Object.values(MAPS).flatMap((map) => map.npcs.map((npc) => ({ map, npc })))

/** 两点间的直线格子（不含起点） */
function segment(a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number }[] {
  const out = []
  const dx = Math.sign(b.x - a.x)
  const dy = Math.sign(b.y - a.y)
  let { x, y } = a
  while (x !== b.x || y !== b.y) {
    if (x !== b.x) x += dx
    else y += dy
    out.push({ x, y })
  }
  return out
}

describe('NPC 巡逻与视线', () => {
  it('A-01 巡逻路线每段都是直线，途经格不是墙 / 水 / 装饰 / 传送点', () => {
    for (const { map, npc } of allNpcs()) {
      if (!npc.patrol) continue
      const pts = [{ x: npc.x, y: npc.y }, ...npc.patrol]
      for (let i = 1; i < pts.length; i++) {
        expect(pts[i].x === pts[i - 1].x || pts[i].y === pts[i - 1].y, `${npc.id} 第 ${i} 段不是直线`).toBe(true)
        for (const c of segment(pts[i - 1], pts[i])) {
          const t = tileAt(map, c.x, c.y)
          expect(t && !isSolid(t) && t !== 'warp', `${npc.id} 路过 (${c.x},${c.y}) = ${t}`).toBe(true)
          expect(decorBlocks(map.id, c.x, c.y), `${npc.id} 撞上装饰 (${c.x},${c.y})`).toBe(false)
        }
      }
    }
  })

  it('A-02 巡逻路线不与其他 NPC 的站位重叠', () => {
    for (const { map, npc } of allNpcs()) {
      if (!npc.patrol) continue
      const pts = [{ x: npc.x, y: npc.y }, ...npc.patrol]
      const cells = pts.slice(1).flatMap((p, i) => segment(pts[i], p))
      for (const other of map.npcs) {
        if (other === npc) continue
        expect(cells.some((c) => c.x === other.x && c.y === other.y), `${npc.id} 路线穿过 ${other.id}`).toBe(false)
      }
    }
  })

  it('A-03 有视线的都是可击败的训练家；苔与登山客峰会巡逻', () => {
    for (const { npc } of allNpcs()) {
      if (npc.sight) {
        expect(npc.role).toBe('trainer')
        expect(npc.defeatedKey).toBeTruthy()
      }
    }
    const patrols: [string, string][] = [
      ['meadow', 'ranger'],
      ['pass', 'hiker'],
      ['lake', 'lake_fisher'],
      ['forest', 'forest_herbalist'],
    ]
    for (const [mapId, id] of patrols) {
      const npc = MAPS[mapId].npcs.find((n) => n.id === id)
      expect(npc?.patrol?.length, id).toBeGreaterThan(0)
      expect(npc?.sight, id).toBeGreaterThan(0)
    }
  })

  it('A-07 新训练家队伍等级贴合区域（湖畔 14~17、回音林 20~23）', () => {
    const lv = (mapId: string, id: string) => MAPS[mapId].npcs.find((n) => n.id === id)!.team!.map((m) => m.level)
    for (const l of lv('lake', 'lake_fisher')) expect(l >= 14 && l <= 17).toBe(true)
    for (const l of lv('forest', 'forest_herbalist')) expect(l >= 20 && l <= 23).toBe(true)
  })
})

describe('路人日程', () => {
  const ids = (map: MapDef, flags: Record<string, boolean>) => visibleNpcs(map, (k) => !!flags[k]).map((n) => n.id)

  it('A-08 夜里路人回家：小孩、农夫、卖花姑娘、洗衣婶、渔家少女不在；村长还在', () => {
    const town = ids(MAPS.town, { '@night': true })
    expect(town).not.toContain('kid')
    expect(town).not.toContain('town_farmer')
    expect(town).not.toContain('town_florist')
    expect(town).toContain('elder')
    const lake = ids(MAPS.lake, { '@night': true })
    expect(lake).not.toContain('lake_washer')
    expect(lake).not.toContain('lake_fisher')
  })

  it('A-09 雨天：卖花姑娘、洗衣婶收摊回家，农夫照常', () => {
    expect(ids(MAPS.town, { '@rain': true })).not.toContain('town_florist')
    expect(ids(MAPS.town, { '@rain': true })).toContain('town_farmer')
    expect(ids(MAPS.lake, { '@rain': true })).not.toContain('lake_washer')
  })

  it('A-10 进图快照：@night / @rain 由时间与天气决定，城镇跟随青苔草地的天气', () => {
    GameState.newGame('tideback')
    GameState.world.weatherByMap.meadow = 'rain'
    GameState.snapshotSceneFlags('town')
    expect(GameState.hasFlag('@rain')).toBe(true)
    expect(GameState.hasFlag('@night')).toBe(GameState.night())
    GameState.world.weatherByMap.meadow = 'sunny'
    GameState.snapshotSceneFlags('town')
    expect(GameState.hasFlag('@rain')).toBe(false)
  })
})

describe('路人与行走图', () => {
  it('A-04 新路人站在可走的地面上，并有表情与台词', () => {
    const ids: [string, string][] = [
      ['town', 'town_farmer'],
      ['town', 'town_florist'],
      ['lake', 'lake_washer'],
    ]
    for (const [mapId, id] of ids) {
      const map = MAPS[mapId]
      const npc = map.npcs.find((n) => n.id === id)
      expect(npc, id).toBeTruthy()
      const t = tileAt(map, npc!.x, npc!.y)
      expect(t && ['grass', 'path', 'floor'].includes(t), `${id} 站在 ${t}`).toBe(true)
      expect(decorBlocks(mapId, npc!.x, npc!.y)).toBe(false)
      expect(npc!.emote).toBeTruthy()
      expect(npc!.lines.length).toBeGreaterThan(0)
    }
  })

  it('A-05 同一地图上没有两个 NPC 站在同一格', () => {
    for (const map of Object.values(MAPS)) {
      const seen = new Set<string>()
      for (const n of map.npcs) {
        if (n.showIf || n.hideIf) continue
        const key = `${n.x},${n.y}`
        expect(seen.has(key), `${map.id} ${n.id} @ ${key}`).toBe(false)
        seen.add(key)
      }
    }
  })

  it('A-06 四方向行走图已生成（15 人）', () => {
    const names = ['elder', 'kid', 'ranger', 'hiker', 'farmer', 'florist', 'washer']
    names.push('angler', 'scout1', 'scout2', 'patrol', 'kindler', 'fishergirl', 'herbalist', 'mushgranny')
    for (const name of names) {
      expect(existsSync(resolve(__dirname, `../public/assets/chars/actor-${name}.png`)), name).toBe(true)
    }
  })
})
