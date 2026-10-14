/**
 * 技能替换流程：技能槽已满时，让玩家选择遗忘哪个技能，或放弃学习（需二次确认）
 * 战斗结算与记忆婆婆共用。
 * @author zjh
 * @date 2026-10-14
 */

import { MOVES, TYPE_LABEL, battleName, type CreatureInstance, type MoveDef } from '../data/creatures'
import { replaceMove } from '../systems/Growth'
import type { ListPanel, ListRow } from './ListPanel'

/** 技能说明：属性 · 类别 · 威力 · 命中 · PP · 效果 */
export function moveInfo(m: MoveDef, pp?: number): string {
  const kind = m.category === 'attack' ? `威力 ${m.power}` : '变化技'
  const acc = m.accuracy < 0 ? '必中' : `命中 ${m.accuracy}`
  const prio = m.priority > 0 ? ' · 先制' : ''
  const ppText = pp === undefined ? `PP ${m.pp}` : `PP ${pp}/${m.pp}`
  return `[${TYPE_LABEL[m.type]}] ${kind} · ${acc} · ${ppText}${prio}\n${m.desc}`
}

/**
 * 打开替换面板；结束后回调结果文本（放弃时为放弃提示）
 * @author zjh
 * @date 2026-10-14
 */
export function openMoveReplace(panel: ListPanel, c: CreatureInstance, moveId: string, onDone: (msg: string) => void): void {
  const newMove = MOVES[moveId]
  const name = battleName(c)
  const rows: ListRow[] = c.moves.map((slot, i) => {
    const m = MOVES[slot.id]
    return {
      label: `忘掉 ${m.name}`,
      right: `${TYPE_LABEL[m.type]} ${m.category === 'attack' ? m.power : '变'}`,
      detail: `${moveInfo(m, slot.pp)}\n→ 新技能 ${newMove.name}：${moveInfo(newMove).split('\n')[0]}`,
      onSelect: () => onDone(replaceMove(c, i, moveId)),
    }
  })
  rows.push({
    label: `不学 ${newMove.name}`,
    detail: `新技能：${moveInfo(newMove)}`,
    onSelect: () => confirmGiveUp(panel, c, moveId, onDone),
  })
  panel.open({
    title: `${name} 想学会 ${newMove.name}`,
    rows,
    onCancel: () => confirmGiveUp(panel, c, moveId, onDone),
  })
}

function confirmGiveUp(panel: ListPanel, c: CreatureInstance, moveId: string, onDone: (msg: string) => void): void {
  const newMove = MOVES[moveId]
  panel.open({
    title: `真的不学 ${newMove.name} 吗？`,
    rows: [
      { label: '是的，放弃', detail: '之后可以找晨曦小镇的记忆婆婆想起来。', onSelect: () => onDone(`${battleName(c)} 没有学会 ${newMove.name}。`) },
      { label: '再想想', onSelect: () => openMoveReplace(panel, c, moveId, onDone) },
    ],
    onCancel: () => openMoveReplace(panel, c, moveId, onDone),
  })
}
