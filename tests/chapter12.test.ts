/**
 * 金钓竿：稀有伙伴的出现权重翻倍
 * @author zjh
 * @date 2026-10-19
 */

import { describe, expect, it } from 'vitest'
import { ENCOUNTERS } from '../src/game/data/encounters'
import { entryWeight, type EncounterContext } from '../src/game/systems/Encounter'

function ctx(goldRod: boolean): EncounterContext {
  return {
    table: ENCOUNTERS.dunes,
    weather: null,
    night: true,
    leadLevel: 30,
    leadAbility: 'none',
    stepsSince: 10,
    lureActive: false,
    repelActive: false,
    caught: ['starcat'],
    rarePity: 0,
    goldRod,
  }
}

describe('全国钓鱼大赛', () => {
  it('F-01 金钓竿让稀有种权重变为两倍', () => {
    const cat = ENCOUNTERS.dunes.grass.find((e) => e.speciesId === 'starcat')!
    const plain = entryWeight(ctx(false), cat)
    const gold = entryWeight(ctx(true), cat)
    expect(gold).toBe(plain * 2)
  })
})
