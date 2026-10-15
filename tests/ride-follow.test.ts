/**
 * v3.5 伙伴跟随与骑乘 · 单元测试：坐骑数据、骑乘判定、通行、遇敌修正、同行状态
 * 用例编号对应 docs/v3.5-ride-follow-design.md §7 的 R-01 ~ R-10。
 * @author zjh
 * @date 2026-10-15
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SPECIES, createCreature } from '../src/game/data/creatures'
import { MAPS } from '../src/game/data/maps'
import { MOUNTS, MOUNT_SKILLS, mountSheet } from '../src/game/data/mounts'
import { Companions } from '../src/game/state/Companions'
import { GameState } from '../src/game/state/GameState'
import { canDismountOn, passable, rideBlock, rideEncounterSource, rideMoveMs, skillActive } from '../src/game/systems/Ride'

const none = () => false
const all = () => true

describe('v3.5 伙伴跟随与骑乘', () => {
  it('R-01 坐骑都是可收服的已有物种，速度快于步行，行走图存在', () => {
    for (const [id, m] of Object.entries(MOUNTS)) {
      expect(SPECIES[id], id).toBeTruthy()
      expect(SPECIES[id].catchRate, id).toBeGreaterThan(0)
      expect(m.speed).toBeGreaterThan(1)
      expect(MOUNT_SKILLS[m.skill]).toBeTruthy()
      expect(existsSync(resolve(__dirname, `../public/assets/chars/${mountSheet(id)}.png`)), id).toBe(true)
    }
  })

  it('R-02 骑乘条件：未指定 / 体型小 / 倒下 / 室内都不能骑', () => {
    const fox = createCreature('grovefox', 10)
    expect(rideBlock(null, true)).toMatch(/还没有指定坐骑/)
    expect(rideBlock(createCreature('puffmouse', 10), true)).toMatch(/体型/)
    expect(rideBlock({ ...fox, hp: 0 }, true)).toMatch(/累倒/)
    expect(rideBlock(fox, false)).toBe('这里不方便骑乘')
    expect(rideBlock(fox, true)).toBeNull()
    expect(MAPS.town.outdoor).toBe(false)
  })

  it('R-03 踏浪 / 攀岩需剧情解锁，焰步 / 林隐直接生效', () => {
    expect(skillActive('blaze', none)).toBe(true)
    expect(skillActive('quiet', none)).toBe(true)
    expect(skillActive('surf', none)).toBe(false)
    expect(skillActive('surf', (k) => k === 'whale_beaten')).toBe(true)
    expect(skillActive('climb', (k) => k === 'boss_beaten')).toBe(true)
    expect(skillActive(null, all)).toBe(false)
  })

  it('R-04 通行：水需要踏浪，岩石需要攀岩，墙永远不行', () => {
    expect(passable('water', null)).toBe(false)
    expect(passable('water', 'surf')).toBe(true)
    expect(passable('rock', 'surf')).toBe(false)
    expect(passable('rock', 'climb')).toBe(true)
    expect(passable('wall', 'climb')).toBe(false)
    expect(passable('grass', null)).toBe(true)
    expect(passable(null, 'surf')).toBe(false)
  })

  it('R-05 水面 / 岩石上不能下坐骑', () => {
    expect(canDismountOn('water')).toBe(false)
    expect(canDismountOn('rock')).toBe(false)
    expect(canDismountOn('path')).toBe(true)
  })

  it('R-06 焰步走灰烬草不遇敌，其他地形照常', () => {
    expect(rideEncounterSource('ash', 'grass', 'blaze')).toBeNull()
    expect(rideEncounterSource('tall', 'grass', 'blaze')).toBe('grass')
    expect(rideEncounterSource('ash', 'grass', null)).toBe('grass')
  })

  it('R-07 林隐走高草一半机率不遇敌', () => {
    expect(rideEncounterSource('tall', 'grass', 'quiet', () => 0.2)).toBeNull()
    expect(rideEncounterSource('tall', 'grass', 'quiet', () => 0.8)).toBe('grass')
    expect(rideEncounterSource('ice', 'ice', 'quiet', () => 0)).toBe('ice')
  })

  it('R-08 骑乘移动更快，步行不变', () => {
    expect(rideMoveMs(140, 'pyrecrown')).toBe(70)
    expect(rideMoveMs(140, 'torrentshell')).toBeLessThan(140)
    expect(rideMoveMs(140, null)).toBe(140)
    expect(rideMoveMs(140, 'puffmouse')).toBe(140)
  })

  it('R-09 同行状态：指定跟随 / 坐骑，取消坐骑时一并下坐骑', () => {
    GameState.newGame('tideback')
    const fox = createCreature('grovefox', 12)
    GameState.party.push(fox)
    const lead = GameState.party[0]
    Companions.setFollower(lead.uid)
    Companions.setMount(fox.uid)
    Companions.setRiding(true)
    expect(Companions.follower()?.uid).toBe(lead.uid)
    expect(Companions.mount()?.uid).toBe(fox.uid)
    expect(Companions.riding()).toBe(true)
    Companions.setMount(null)
    expect(Companions.mount()).toBeNull()
    expect(Companions.riding()).toBe(false)
    Companions.setFollower(null)
    expect(Companions.follower()).toBeNull()
  })

  it('R-10 伙伴离队后跟随 / 坐骑自动失效；不可骑乘的物种不能当坐骑', () => {
    GameState.newGame('tideback')
    const fox = createCreature('grovefox', 12)
    GameState.party.push(fox)
    Companions.setFollower(fox.uid)
    Companions.setMount(fox.uid)
    Companions.setRiding(true)
    GameState.party.splice(GameState.party.indexOf(fox), 1)
    expect(Companions.follower()).toBeNull()
    expect(Companions.mount()).toBeNull()
    expect(Companions.riding()).toBe(false)
    Companions.setMount(GameState.party[0].uid)
    expect(Companions.mount()).toBeNull()
  })
})
