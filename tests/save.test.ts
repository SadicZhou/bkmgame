/**
 * 存档单元测试：v1/v2 → v3 迁移、v3 读写往返
 * @author zjh
 * @date 2026-10-14
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { MOVES, createCreature } from '../src/game/data/creatures'
import { SAVE_KEY, loadGame, saveGame } from '../src/game/systems/SaveSystem'
import { createWorld } from '../src/game/systems/WorldClock'

/** 内存版 localStorage */
function installStorage(): Map<string, string> {
  const map = new Map<string, string>()
  Object.assign(globalThis, {
    localStorage: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    },
  })
  return map
}

let store: Map<string, string>
beforeEach(() => {
  store = installStorage()
})

describe('旧存档迁移', () => {
  it('v1 存档：字符串技能 → 技能槽（满 PP），补齐资质 / 性格 / 世界状态，HP 比例保留', () => {
    store.set(
      'embertrail-v1-save',
      JSON.stringify({
        version: 1,
        mapId: 'meadow',
        playerX: 3,
        playerY: 4,
        party: [{ uid: 'c1', speciesId: 'flarehorn', level: 7, exp: 5, hp: 10, maxHp: 20, atk: 9, def: 9, spd: 9, moves: ['tackle', 'ember_spit'] }],
        flags: { ranger_beaten: true },
        playSeconds: 120,
        savedAt: '2026-01-01',
      }),
    )
    const data = loadGame()!
    expect(data.version).toBe(3)
    const c = data.party[0]
    expect(c.moves[0]).toEqual({ id: 'tackle', pp: MOVES.tackle.pp })
    expect(c.talent).toBeDefined()
    expect(c.nature).toBeTruthy()
    expect(c.hp / c.maxHp).toBeCloseTo(0.5, 1)
    expect(data.world.totalSteps).toBe(0)
    expect(data.storage).toEqual([])
    expect(data.flags.ranger_beaten).toBe(true)
    expect(data.dex.caught).toContain('flarehorn')
  })

  it('v3 优先于旧档，读写往返保持数据', () => {
    store.set('embertrail-v2-save', JSON.stringify({ version: 2, party: [{ uid: 'x', speciesId: 'tideback', level: 3, hp: 5, maxHp: 5 }] }))
    const c = createCreature('leafkit', 8)
    const world = createWorld()
    world.totalSteps = 777
    saveGame({
      mapId: 'town',
      playerX: 1,
      playerY: 2,
      party: [c],
      storage: [],
      flags: {},
      playSeconds: 0,
      coins: 321,
      bag: {},
      dex: { seen: ['leafkit'], caught: ['leafkit'] },
      starterId: 'leafkit',
      world,
    })
    expect(store.has(SAVE_KEY)).toBe(true)
    const data = loadGame()!
    expect(data.starterId).toBe('leafkit')
    expect(data.coins).toBe(321)
    expect(data.world.totalSteps).toBe(777)
    expect(data.party[0].talent).toEqual(c.talent)
  })
})
