/**
 * 训练家再战：击败后隔 rematchDays 天可再次挑战，对手等级随玩家队伍与再战次数成长。
 * 旗标：<defeatedKey>_day 最近一次获胜的天数；<defeatedKey>_rematch 再战获胜次数。
 * 纯函数，便于单元测试。
 * @author zjh
 * @date 2026-10-15
 */

import type { NpcDef, TeamMember } from '../data/maps'

/** 再战等级上限 */
export const REMATCH_MAX_LEVEL = 50
/** 每赢一次再战，对手底线等级 +3 */
export const REMATCH_STEP = 3

type GetFlag = (key: string) => boolean | number | string | undefined

export const winDayKey = (defeatedKey: string) => `${defeatedKey}_day`
export const rematchCountKey = (defeatedKey: string) => `${defeatedKey}_rematch`

/**
 * 是否可以再战：设了 rematchDays、已击败、距上次获胜已满天数（旧档没有记录按第 0 天算）。
 * 训练家集会进行中时可立刻再战（忽略冷却天数）。
 * @author zjh
 * @date 2026-10-15
 */
export function rematchReady(npc: NpcDef, getFlag: GetFlag, today: number, gathering = false): boolean {
  if (!npc.rematchDays || !npc.defeatedKey || !getFlag(npc.defeatedKey)) return false
  if (gathering) return true
  const won = Number(getFlag(winDayKey(npc.defeatedKey)) ?? 0)
  return today - won >= npc.rematchDays
}

/**
 * 再战队伍等级：不低于「原等级 + 3 × (已再战次数 + 1)」，并向玩家队伍最高等级靠拢
 * （最后一只与玩家最高等级持平，前面的依次低 1 级），上限 50
 * @author zjh
 * @date 2026-10-15
 */
export function rematchTeam(team: TeamMember[], partyTop: number, rematches: number): TeamMember[] {
  const floor = REMATCH_STEP * (rematches + 1)
  return team.map((m, i) => {
    const chase = partyTop - (team.length - 1 - i)
    return { speciesId: m.speciesId, level: Math.min(REMATCH_MAX_LEVEL, Math.max(m.level + floor, chase)) }
  })
}
