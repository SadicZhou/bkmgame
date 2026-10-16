/**
 * 资质果使用流程：选伙伴 → 选资质项 → +2 并重算能力值
 * @author zjh
 * @date 2026-10-15
 */

import { battleName, calcStats, spriteKey } from '../data/creatures'
import { ITEMS } from '../data/items'
import type { StatKey } from '../data/natures'
import { GameState } from '../state/GameState'
import { Sfx } from '../systems/AudioBeeps'
import { FRUIT_LIMIT, STAT_KEYS, TALENT_MAX, applyFruit, fruitBlock, talentStars } from '../systems/Talent'
import { rowLabel } from './CreatureInfo'
import type { ListPanel, ListRow } from './ListPanel'

const STAT_NAME: Record<StatKey, string> = { hp: 'HP', atk: '攻击', def: '防御', spd: '速度' }

export interface FruitMenuHooks {
  toast: (msg: string) => void
  refreshHud: () => void
  /** 返回背包 */
  back: () => void
}

/**
 * 打开资质果的目标选择
 * @author zjh
 * @date 2026-10-15
 */
export function openTalentFruit(panel: ListPanel, itemId: string, hooks: FruitMenuHooks): void {
  const it = ITEMS[itemId]
  const rows: ListRow[] = GameState.party.map((c, i) => {
    const reason = fruitBlock(c)
    return {
      label: rowLabel(c, i === 0 ? '★ ' : ''),
      right: `${c.fruitUsed ?? 0}/${FRUIT_LIMIT}`,
      icon: spriteKey(c),
      detail: reason ? `${battleName(c)}：${reason}` : `已使用 ${c.fruitUsed ?? 0}/${FRUIT_LIMIT} 张。选择后再挑一项资质。`,
      disabled: !!reason,
      onSelect: () => openStatPick(panel, itemId, i, hooks),
    }
  })
  panel.open({ title: `对谁使用 ${it.name}？`, rows, onCancel: hooks.back })
}

/**
 * 选择要提升的资质项；未鉴定的伙伴只显示星级，不透露具体数值
 * @author zjh
 * @date 2026-10-15
 */
function openStatPick(panel: ListPanel, itemId: string, partyIndex: number, hooks: FruitMenuHooks): void {
  const c = GameState.party[partyIndex]
  if (!c) return
  const gain = ITEMS[itemId].value
  const rows: ListRow[] = STAT_KEYS.map((k) => {
    const reason = fruitBlock(c, k)
    const value = c.appraised ? ` ${c.talent[k]}/${TALENT_MAX}` : ''
    return {
      label: STAT_NAME[k],
      right: `${talentStars(c.talent[k])}${value}`,
      detail: reason ?? `${STAT_NAME[k]}资质 +${gain}（上限 ${TALENT_MAX}）。`,
      disabled: !!reason,
      onSelect: () => {
        if (!GameState.consumeItem(itemId)) return
        const oldMax = c.maxHp
        const got = applyFruit(c, k, gain)
        const stats = calcStats(c)
        Object.assign(c, stats)
        if (c.hp > 0) c.hp = Math.min(c.maxHp, c.hp + Math.max(0, c.maxHp - oldMax))
        Sfx.win()
        hooks.toast(`${battleName(c)} 的${STAT_NAME[k]}资质提升了 ${got} 点！`)
        hooks.refreshHud()
        hooks.back()
      },
    }
  })
  panel.open({ title: `${battleName(c)}：提升哪项资质？`, rows, onCancel: () => openTalentFruit(panel, itemId, hooks) })
}
