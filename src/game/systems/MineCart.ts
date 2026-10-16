/**
 * 矿车道岔：三个开关组成路线码，只有 LRL 通往矿道深处
 * @author zjh
 * @date 2026-10-16
 */

import { CART_DEEP, switchFlag } from '../data/canyonMap'

export type CartStop = 'deep' | 'chest' | 'side' | 'bump'

type GetFlag = (k: string) => unknown

/** 第 i 个道岔（1～3）当前方向，默认 L */
export function switchDir(i: number, getFlag: GetFlag): 'L' | 'R' {
  return getFlag(switchFlag(i)) === 'R' ? 'R' : 'L'
}

export function routeCode(getFlag: GetFlag): string {
  return [1, 2, 3].map((i) => switchDir(i, getFlag)).join('')
}

export function toggleSwitch(i: number, getFlag: GetFlag): 'L' | 'R' {
  return switchDir(i, getFlag) === 'L' ? 'R' : 'L'
}

/**
 * 路线终点
 * @author zjh
 * @date 2026-10-16
 */
export function cartStop(code: string): CartStop {
  if (code === CART_DEEP) return 'deep'
  if (code === 'LLL') return 'chest'
  if (code === 'RRR') return 'side'
  return 'bump'
}

/** 矿车竞速的三条路线。par 是从答应比赛到坐上矿车允许的步数 */
export const RACE_ROUTES = [
  { id: 'chest', code: 'LLL', name: '宝箱岔', par: 24 },
  { id: 'side', code: 'RRR', name: '侧洞岔', par: 24 },
  { id: 'deep', code: 'LRL', name: '深处', par: 24 },
] as const

export type RaceGrade = 'gold' | 'slow' | 'miss'

/**
 * 竞速成绩：路线不对算没跑到，步数不超过 par 算金牌
 * @author zjh
 * @date 2026-10-16
 */
export function raceGrade(steps: number, par: number, code: string, target: string): RaceGrade {
  if (code !== target) return 'miss'
  return steps <= par ? 'gold' : 'slow'
}
