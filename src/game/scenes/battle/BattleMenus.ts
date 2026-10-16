/**
 * 战斗指令菜单：根菜单（出招 / 道具 / 换人 / 逃跑）、出招（PP / 克制提示）、换人、背包与道具目标
 * 只负责组织选项，真正执行由宿主 act() 交给 BattleLogic 并播放结果帧。
 * @author zjh
 * @date 2026-10-15
 */

import { MOVES, SPECIES, battleName, outOfPp, spriteKey, typeMultiplier } from '../../data/creatures'
import { ITEMS, ITEM_ORDER, itemIconKey } from '../../data/items'
import { GameState } from '../../state/GameState'
import {
  activeEnemy,
  activePlayer,
  canRun,
  checkItem,
  playerFight,
  playerRun,
  playerSwitch,
  playerUseItem,
  type BattleState,
} from '../../systems/BattleLogic'
import { creatureDetail, rowLabel } from '../../ui/CreatureInfo'
import type { ListPanel, ListRow } from '../../ui/ListPanel'
import { moveInfo } from '../../ui/MoveLearnFlow'
import type { BattleOption } from './OptionMenu'

/** BattleScene 提供给指令菜单的能力 */
export interface BattleMenuHost {
  battle: BattleState
  panel: ListPanel
  showOptions(prompt: string, options: BattleOption[], onBack?: () => void, index?: number): void
  /** 执行一次行动并播放结果，播完回到根菜单 */
  act(fn: () => void): void
  /** 战斗已结束时进入结算 */
  finish(): void
}

/** 根菜单各项的位置，返回时把光标放回原处 */
const ROOT = { fight: 0, bag: 1, switch: 2 } as const

export class BattleMenus {
  private readonly host: BattleMenuHost

  constructor(host: BattleMenuHost) {
    this.host = host
  }

  private get battle(): BattleState {
    return this.host.battle
  }

  /**
   * 根菜单；战斗已结束时直接结算
   * @author zjh
   * @date 2026-10-15
   */
  root(index = 0): void {
    const { host, battle } = this
    if (battle.over) {
      host.finish()
      return
    }
    const runnable = canRun(battle)
    host.showOptions(
      `${battleName(activePlayer(battle))} 要怎么做？`,
      [
        { label: '出招', onSelect: () => this.fight() },
        { label: '道具', onSelect: () => this.bag() },
        { label: '换人', onSelect: () => this.switch() },
        {
          label: '逃跑',
          info: !runnable ? '这场对战无法逃跑。' : battle.kind === 'unique' ? '逃走后它仍会留在原地，可以再来。' : undefined,
          disabled: !runnable,
          onSelect: () => host.act(() => playerRun(battle)),
        },
      ],
      undefined,
      index,
    )
  }

  /**
   * 出招：显示 PP 与克制提示；全部耗尽时只剩「挣扎」
   * @author zjh
   * @date 2026-10-15
   */
  fight(): void {
    const { host, battle } = this
    const p = activePlayer(battle)
    const back = () => this.root(ROOT.fight)
    if (outOfPp(p)) {
      host.showOptions(
        '所有技能的 PP 都用完了！',
        [{ label: '挣扎', info: '[一般] 威力 50 · 自己也会受伤', onSelect: () => host.act(() => playerFight(battle, -1)) }],
        back,
      )
      return
    }
    const enemyType = SPECIES[activeEnemy(battle).speciesId].type
    const options: BattleOption[] = p.moves.map((slot, i) => {
      const m = MOVES[slot.id]
      const mult = m.category === 'attack' ? typeMultiplier(m.type, enemyType) : 1
      const eff = mult > 1 ? ' ▲效果拔群' : mult < 1 ? ' ▼效果一般' : ''
      return {
        label: `${m.name} ${slot.pp}/${m.pp}`,
        info: `${moveInfo(m, slot.pp)}${eff}`,
        disabled: slot.pp <= 0,
        onSelect: () => host.act(() => playerFight(battle, i)),
      }
    })
    host.showOptions('选择招式：', options, back)
  }

  /** 换人：倒下的与在场的不可选 */
  switch(): void {
    const { host, battle } = this
    const rows: ListRow[] = battle.playerParty.map((c, i) => ({
      label: rowLabel(c, i === battle.activeIndex ? '▷ ' : ''),
      right: c.hp > 0 ? `HP ${c.hp}/${c.maxHp}` : '倒下',
      icon: spriteKey(c),
      disabled: c.hp <= 0 || i === battle.activeIndex,
      detail: creatureDetail(c),
      onSelect: () => {
        host.panel.close()
        host.act(() => playerSwitch(battle, i))
      },
    }))
    host.panel.open({
      title: '换上哪只伙伴？',
      rows,
      onCancel: () => {
        host.panel.close()
        this.root(ROOT.switch)
      },
    })
  }

  /**
   * 背包：安抚果直接对敌方使用；回复 / 解除 / PP 类再选目标
   * @author zjh
   * @date 2026-10-15
   */
  bag(): void {
    const { host, battle } = this
    const ids = ITEM_ORDER.filter((id) => GameState.itemCount(id) > 0 && ITEMS[id].kind !== 'key' && ITEMS[id].kind !== 'talent' && ITEMS[id].kind !== 'vehicle')
    const rows: ListRow[] = ids.map((id) => {
      const it = ITEMS[id]
      const targetless = it.kind === 'catch' || it.kind === 'lure' || it.kind === 'repel'
      const check = targetless ? checkItem(battle, id, 0) : { ok: true, reason: undefined }
      return {
        label: it.name,
        right: `×${GameState.itemCount(id)}`,
        icon: itemIconKey(id),
        detail: check.ok ? it.desc : `${it.desc}\n（${check.reason}）`,
        disabled: !check.ok,
        onSelect: () => {
          if (it.kind === 'catch') this.useItem(id, 0)
          else this.itemTarget(id)
        },
      }
    })
    if (!rows.length) rows.push({ label: '（背包是空的）', disabled: true })
    host.panel.open({
      title: '背包',
      footer: `焰币 ${GameState.coins}`,
      rows,
      onCancel: () => {
        host.panel.close()
        this.root(ROOT.bag)
      },
    })
  }

  private itemTarget(itemId: string): void {
    const { host, battle } = this
    const it = ITEMS[itemId]
    const rows: ListRow[] = battle.playerParty.map((c, i) => {
      const check = checkItem(battle, itemId, i)
      return {
        label: rowLabel(c),
        right: c.hp > 0 ? `HP ${c.hp}/${c.maxHp}` : '倒下',
        icon: spriteKey(c),
        disabled: !check.ok,
        detail: check.ok ? `对 ${battleName(c)} 使用 ${it.name}` : check.reason,
        onSelect: () => this.useItem(itemId, i),
      }
    })
    host.panel.open({ title: `对谁使用 ${it.name}？`, rows, onCancel: () => this.bag() })
  }

  private useItem(itemId: string, target: number): void {
    const { host, battle } = this
    if (!checkItem(battle, itemId, target).ok || !GameState.consumeItem(itemId)) return
    host.panel.close()
    host.act(() => playerUseItem(battle, itemId, target))
  }
}
