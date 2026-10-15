/**
 * 平衡性模拟：练级节奏与主线训练家 / BOSS 胜率（默认跳过）
 * 运行：set SIM=1 && set SIM_MATE=rockmite && set SIM_PASS_MATE=mistnewt && npx vitest run tests/balance.sim.test.ts
 * @author zjh
 * @date 2026-10-14
 */

import { it } from 'vitest'
import { MOVES, STARTERS, createCreature, type CreatureInstance } from '../src/game/data/creatures'
import { ENCOUNTERS } from '../src/game/data/encounters'
import { MAPS } from '../src/game/data/maps'
import { calcDamage } from '../src/game/systems/BattleCalc'
import { activeEnemy, activePlayer, playerFight, playerUseItem, startBattle, type BattleState } from '../src/game/systems/BattleLogic'
import { healParty } from '../src/game/systems/Growth'

function bestMove(s: BattleState): number {
  const p = activePlayer(s)
  const e = activeEnemy(s)
  let best = -1
  let bestDmg = -1
  p.moves.forEach((slot, idx) => {
    const m = MOVES[slot.id]
    if (slot.pp <= 0 || m.category !== 'attack') return
    const d = calcDamage(s, p, e, m, () => 0.5).dmg
    if (d > bestDmg) {
      bestDmg = d
      best = idx
    }
  })
  return best
}

function fight(party: CreatureInstance[], enemies: CreatureInstance[], kind: 'wild' | 'trainer' | 'boss'): BattleState {
  const s = startBattle(party, enemies, kind)
  let turns = 0
  while (!s.over && turns++ < 60) playerFight(s, bestMove(s))
  return s
}

function wildPick(mapId: string): CreatureInstance {
  const g = ENCOUNTERS[mapId].grass.filter((e) => !e.time)
  const e = g[Math.floor(Math.random() * g.length)]
  return createCreature(e.speciesId, e.minLv + Math.floor(Math.random() * (e.maxLv - e.minLv + 1)))
}

function team(npcId: string, mapId: string): CreatureInstance[] {
  return MAPS[mapId].npcs.find((n) => n.id === npcId)!.team!.map((m) => createCreature(m.speciesId, m.level))
}

/**
 * 唯一精灵收服模拟：先打到半血以下再丢安抚果，统计 收服 / 击倒 / 团灭 比例
 * @author zjh
 * @date 2026-10-14
 */
function catchUnique(party: CreatureInstance[], uniqueId: string, token: boolean): 'caught' | 'ko' | 'wiped' | 'timeout' {
  const lv = Math.min(50, Math.max(12, ...party.map((c) => c.level)))
  const s = startBattle(party, [createCreature(uniqueId, lv)], 'unique', { token, night: true, weather: 'sunny' })
  let turns = 0
  while (!s.over && turns++ < 60) {
    const e = activeEnemy(s)
    if (e.hp / e.maxHp > 0.5) playerFight(s, bestMove(s))
    else playerUseItem(s, 'soothe_berry', 0)
  }
  if (s.caught) return 'caught'
  if (s.won) return 'ko'
  return s.over ? 'wiped' : 'timeout'
}

it.runIf(!!process.env.SIM)('unique catch', () => {
  const rows: string[] = []
  for (const uniqueId of ['starmarten', 'bloomdeer', 'magmashell']) {
    for (const token of [true, false]) {
      const tally = { caught: 0, ko: 0, wiped: 0, timeout: 0 }
      const N = 300
      for (let i = 0; i < N; i++) {
        const party = [createCreature('blazehorn', 18), createCreature('tideback', 16), createCreature('rockmite', 15)]
        tally[catchUnique(party, uniqueId, token)]++
      }
      const pct = (n: number) => `${((n / N) * 100).toFixed(0)}%`
      rows.push(`${uniqueId} token=${token}: caught ${pct(tally.caught)} | ko ${pct(tally.ko)} | wiped ${pct(tally.wiped)} | timeout ${pct(tally.timeout)}`)
    }
  }
  console.log(rows.join('\n'))
})

/**
 * 沧澜鲸胜率：三条御三家进化线 + 湖畔伙伴，不同等级只出招（不用道具、不换人）
 * @author zjh
 * @date 2026-10-15
 */
it.runIf(!!process.env.SIM)('tidewhale win rate', () => {
  const lines = [
    ['blazehorn', 'grovefox'],
    ['torrentshell', 'grovefox'],
    ['grovefox', 'mistnewt'],
  ]
  const whaleLv = MAPS.lake.npcs.find((n) => n.team?.some((m) => m.speciesId === 'tidewhale'))!.team![0].level
  const rows: string[] = [`tidewhale Lv${whaleLv}`]
  /** 带药出战：在场伙伴 HP < 35% 时先用好伤药（3）再用伤药（6） */
  const fightWithPotions = (party: CreatureInstance[], enemies: CreatureInstance[]): boolean => {
    const s = startBattle(party, enemies, 'boss')
    const bag = { super_potion: 3, potion: 6 } as Record<string, number>
    let turns = 0
    while (!s.over && turns++ < 80) {
      const p = activePlayer(s)
      const id = p.hp / p.maxHp < 0.35 ? ['super_potion', 'potion'].find((k) => bag[k] > 0) : undefined
      if (id) {
        bag[id]--
        playerUseItem(s, id, s.activeIndex)
      } else playerFight(s, bestMove(s))
    }
    return s.won
  }
  for (const potions of [false, true]) {
    for (const [lead, mate] of lines) {
      const cols: string[] = []
      for (const lv of [16, 18, 20, 22]) {
        let wins = 0
        const N = 200
        for (let i = 0; i < N; i++) {
          const party = [createCreature(lead, lv), createCreature(mate, lv - 2), createCreature('pebblepup', lv - 3)]
          const enemies = [createCreature('tidewhale', whaleLv)]
          if (potions ? fightWithPotions(party, enemies) : fight(party, enemies, 'boss').won) wins++
        }
        cols.push(`Lv${lv} ${((wins / N) * 100).toFixed(0)}%`)
      }
      rows.push(`${potions ? '带药 ' : '无药 '}${lead}+${mate}: ${cols.join(' | ')}`)
    }
  }
  console.log(rows.join('\n'))
})

/**
 * 第三章胜率：苔的临时组队、执灯·绯、林语鹿（带药，模拟普通玩家）
 * @author zjh
 * @date 2026-10-15
 */
it.runIf(!!process.env.SIM)('chapter3 win rate', () => {
  const N = 200
  const patrol = MAPS.forest.npcs.find((n) => n.id === 'forest_patrol')!
  let allyWins = 0
  for (let i = 0; i < N; i++) {
    const ally = patrol.ally!.team.map((m) => createCreature(m.speciesId, m.level))
    if (fight(ally, team('forest_patrol', 'forest'), 'trainer').won) allyWins++
  }
  const rows = [`ally ${patrol.ally!.team.map((m) => `${m.speciesId}${m.level}`).join('+')}: ${((allyWins / N) * 100).toFixed(0)}%`]
  const withPotions = (party: CreatureInstance[], enemies: CreatureInstance[], kind: 'trainer' | 'boss'): boolean => {
    const s = startBattle(party, enemies, kind)
    const bag = { super_potion: 3, potion: 6 } as Record<string, number>
    let turns = 0
    while (!s.over && turns++ < 80) {
      const p = activePlayer(s)
      const id = p.hp / p.maxHp < 0.35 ? ['super_potion', 'potion'].find((k) => bag[k] > 0) : undefined
      if (id) {
        bag[id]--
        playerUseItem(s, id, s.activeIndex)
      } else playerFight(s, bestMove(s))
    }
    return s.won
  }
  for (const [lead, mate] of [
    ['blazehorn', 'torrentshell'],
    ['torrentshell', 'grovefox'],
    ['grovefox', 'lanternray'],
    ['whirlbat', 'torrentshell'],
  ]) {
    for (const foe of ['kindler', 'echodeer']) {
      const cols: string[] = []
      for (const lv of [20, 22, 24, 26]) {
        let wins = 0
        for (let i = 0; i < N; i++) {
          const party = [createCreature(lead, lv), createCreature(mate, lv - 2), createCreature('pebblepup', lv - 3)]
          if (withPotions(party, team(foe, 'forest'), foe === 'kindler' ? 'trainer' : 'boss')) wins++
        }
        cols.push(`Lv${lv} ${((wins / N) * 100).toFixed(0)}%`)
      }
      rows.push(`${foe} ${lead}+${mate}: ${cols.join(' | ')}`)
    }
  }
  console.log(rows.join('\n'))
})

it.runIf(!!process.env.SIM)('main line pacing', () => {
  const rows: string[] = []
  for (const starter of STARTERS) {
    let wins = { ranger: 0, hiker: 0, boss: 0 }
    let battles = { meadow: 0, pass: 0 }
    let lv = { ranger: 0, hiker: 0, boss: 0 }
    const N = 60
    for (let i = 0; i < N; i++) {
      const party = [createCreature(starter, 5), createCreature(process.env.SIM_MATE ?? 'puffmouse', 3)]
      // 草地练级：12 场野生（每 4 场回小屋一次）
      for (let b = 0; b < 12; b++) {
        if (b % 4 === 0) healParty(party)
        fight(party, [wildPick('meadow')], 'wild')
        battles.meadow++
      }
      healParty(party)
      lv.ranger += party[0].level
      if (fight(party, team('ranger', 'meadow'), 'trainer').won) wins.ranger++
      healParty(party)
      if (process.env.SIM_PASS_MATE) party.push(createCreature(process.env.SIM_PASS_MATE, 8))
      for (let b = 0; b < 12; b++) {
        if (b % 4 === 0) healParty(party)
        fight(party, [wildPick('pass')], 'wild')
        battles.pass++
      }
      healParty(party)
      lv.hiker += party[0].level
      if (fight(party, team('hiker', 'pass'), 'trainer').won) wins.hiker++
      healParty(party)
      for (let b = 0; b < 8; b++) {
        if (b % 4 === 0) healParty(party)
        fight(party, [wildPick('pass')], 'wild')
      }
      healParty(party)
      lv.boss += party[0].level
      if (fight(party, team('boss', 'pass'), 'boss').won) wins.boss++
    }
    const pct = (n: number) => `${((n / N) * 100).toFixed(0)}%`
    rows.push(
      `${starter}: ranger ${pct(wins.ranger)} (Lv${(lv.ranger / N).toFixed(1)}) | hiker ${pct(wins.hiker)} (Lv${(lv.hiker / N).toFixed(1)}) | boss ${pct(wins.boss)} (Lv${(lv.boss / N).toFixed(1)})`,
    )
  }
  console.log(rows.join('\n'))
})
