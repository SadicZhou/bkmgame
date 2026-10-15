/**
 * 回归脚本的「真实出招」驱动（仅开发模式）：通过战斗场景的指令菜单逐回合行动，直到分出胜负
 * 策略（模拟一个普通玩家）：
 * - 在场伙伴 HP < 35% 且背包有伤药时，经「道具」菜单对它使用（好伤药优先）；
 * - 否则在 PP 未耗尽的攻击招式中，按 威力 × 属性克制 × 本系加成 取最高；没有攻击招式时用第一个可用招式。
 * 学招面板出现时选择第一行（忘掉第一个技能），保证流程不中断。
 * @author zjh
 * @date 2026-10-15
 */

import type Phaser from 'phaser'
import { MOVES, SPECIES, typeMultiplier } from '../game/data/creatures'
import { ITEMS, ITEM_ORDER } from '../game/data/items'
import { GameState } from '../game/state/GameState'
import { activeEnemy, activePlayer, type BattleState } from '../game/systems/BattleLogic'
import type { InputFrame } from '../game/ui/InputKeys'

/** 回归中需要访问的 BattleScene 内部能力（开发调试专用） */
export interface BattleProbe extends Phaser.Scene {
  battle?: BattleState
  mode: 'play' | 'menu' | 'end' | 'idle'
  menu: { isOpen: boolean; options: { label: string; disabled?: boolean }[]; choose(i: number): void }
  panel: { isOpen: boolean; handle(input: InputFrame): void }
  endAction?: () => void
  skipFrame(): void
  finish(): void
}

/** 一场真实战斗的统计 */
export interface BattleReport {
  won: boolean
  turns: number
  /** 用掉的伤药数 */
  potions: number
  /** 战斗结束时我方各伙伴等级与剩余 HP，例：涌潮龟 Lv.18 35/113 */
  hpLeft: string
}

const IDLE: InputFrame = { dx: 0, dy: 0, up: false, down: false, left: false, right: false, confirm: false, cancel: false }
const CONFIRM: InputFrame = { ...IDLE, confirm: true }
const DOWN: InputFrame = { ...IDLE, down: true }
const STAB = 1.2
const HEAL_BELOW = 0.35
const HEAL_ITEMS = ['super_potion', 'potion']

/**
 * 当前回合的最佳招式下标（对应出招菜单的选项顺序）
 * @author zjh
 * @date 2026-10-15
 */
export function pickMove(b: BattleState): number {
  const me = activePlayer(b)
  const myType = SPECIES[me.speciesId].type
  const foeType = SPECIES[activeEnemy(b).speciesId].type
  let best = -1
  let bestScore = -1
  me.moves.forEach((slot, i) => {
    const m = MOVES[slot.id]
    if (slot.pp <= 0) return
    if (best < 0) best = i
    if (m.category !== 'attack') return
    const score = m.power * typeMultiplier(m.type, foeType) * (m.type === myType ? STAB : 1)
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  })
  return Math.max(best, 0)
}

/**
 * 需要喝药时返回 伤药在背包列表中的行号 与 目标在队伍中的行号；否则返回 null
 * 背包行顺序与 BattleMenus.bag() 一致：ITEM_ORDER 中有库存的非重要道具
 * @author zjh
 * @date 2026-10-15
 */
export function healPlan(b: BattleState, count: (id: string) => number): { bagRow: number; target: number } | null {
  const me = activePlayer(b)
  if (me.hp <= 0 || me.hp / me.maxHp >= HEAL_BELOW) return null
  const itemId = HEAL_ITEMS.find((id) => count(id) > 0)
  if (!itemId) return null
  const bag = ITEM_ORDER.filter((id) => count(id) > 0 && ITEMS[id].kind !== 'key' && ITEMS[id].kind !== 'talent')
  return { bagRow: bag.indexOf(itemId), target: b.activeIndex }
}

/**
 * 逐回合行动直到战斗结束（进入结算提示的 end 模式）；tick 负责推进游戏时间
 * @author zjh
 * @date 2026-10-15
 */
export async function fightOut(bs: BattleProbe, tick: () => Promise<void>, maxTurns = 80): Promise<BattleReport> {
  let turns = 0
  let potions = 0
  let hpLeft = ''
  /** 正在操作背包时待按的键（向下若干次 + 确认） */
  let keys: InputFrame[] = []
  const press = (rows: number) => [...Array<InputFrame>(rows).fill(DOWN), CONFIRM]

  for (let guard = 0; guard < 5000 && bs.mode !== 'end'; guard++) {
    // 结算（全灭会回满 HP）之前记下剩余 HP
    if (bs.battle?.over && !hpLeft) hpLeft = hpSummary(bs.battle)
    if (bs.panel.isOpen) bs.panel.handle(keys.shift() ?? CONFIRM)
    else if (bs.mode === 'play') bs.skipFrame()
    else if (bs.mode === 'menu' && bs.battle && bs.menu.isOpen) {
      const b = bs.battle
      const labels = bs.menu.options.map((o) => o.label)
      if (labels[0] === '出招') {
        if (turns >= maxTurns) break
        turns++
        const heal = healPlan(b, (id) => GameState.itemCount(id))
        if (heal) {
          potions++
          keys = [...press(heal.bagRow), ...press(heal.target)]
          bs.menu.choose(1)
        } else {
          bs.menu.choose(0)
        }
      } else {
        bs.menu.choose(labels[0] === '挣扎' ? 0 : pickMove(b))
      }
    }
    await tick()
  }
  const b = bs.battle
  return { won: !!b?.won, turns, potions, hpLeft: hpLeft || (b ? hpSummary(b) : '') }
}

function hpSummary(b: BattleState): string {
  return b.playerParty.map((c) => `${SPECIES[c.speciesId].name} Lv.${c.level} ${c.hp}/${c.maxHp}`).join('，')
}
