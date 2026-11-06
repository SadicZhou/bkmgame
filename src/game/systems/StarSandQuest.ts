/**
 * 支线 S5-1「星砂收集者」：荒原捡 10 颗星砂交给穗
 * 主线第五章已发星砂护符，本支线改为「星砂袋」（荒原稀有权重 ×2）
 * @author zjh
 * @date 2026-11-06
 */

import { GameState } from '../state/GameState'

/** 需交付的颗数 */
export const STAR_SAND_NEED = 10
export const STAR_SAND = 'star_sand'
export const SAND_POUCH = 'sand_pouch'
export const SAND_DONE = 'side_sand_done'
export const SAND_STARTED = 'side_sand_started'

/** 荒原上的采集点 */
export const SAND_SPOTS = [
  { id: '1', flag: 'got_star_sand_1', x: 2, y: 5, line: '沙窝里闪着一点细沙。' },
  { id: '2', flag: 'got_star_sand_2', x: 5, y: 4, line: '落雷带南侧积着一小撮星砂。' },
  { id: '3', flag: 'got_star_sand_3', x: 9, y: 4, line: '脚印边亮起一粒沙。' },
  { id: '4', flag: 'got_star_sand_4', x: 11, y: 4, line: '沙丘脊上结着一撮星砂。' },
  { id: '5', flag: 'got_star_sand_5', x: 15, y: 4, line: '石门下漏出细沙。' },
  { id: '6', flag: 'got_star_sand_6', x: 2, y: 7, line: '南口风口堆着星砂。' },
  { id: '7', flag: 'got_star_sand_7', x: 10, y: 7, line: '驼队路过的辙印里有星砂。' },
  { id: '8', flag: 'got_star_sand_8', x: 17, y: 7, line: '东侧沙墙根积着沙。' },
  { id: '9', flag: 'got_star_sand_9', x: 4, y: 2, line: '雷心坑外沿的沙还热着。' },
  { id: '10', flag: 'got_star_sand_10', x: 13, y: 2, line: '北坡背风处亮着星砂。' },
] as const

export function sandCount(): number {
  return GameState.itemCount(STAR_SAND)
}

export function sandSpotsPicked(): number {
  return SAND_SPOTS.filter((s) => GameState.hasFlag(s.flag)).length
}

/**
 * 捡一颗星砂
 * @author zjh
 * @date 2026-11-06
 */
export function pickStarSand(spotId: string): { lines: string[] } | { reason: string } {
  if (!GameState.hasFlag('star_chart') && !GameState.hasFlag('dunes_unlocked')) {
    return { reason: '（风太大，细沙抓不住。）' }
  }
  const spot = SAND_SPOTS.find((s) => s.id === spotId)
  if (!spot) return { reason: '没有这撮沙。' }
  if (GameState.hasFlag(spot.flag)) return { reason: '这里已经捡过了。' }
  if (GameState.hasFlag(SAND_DONE)) return { reason: '穗要的星砂已经齐了。' }
  GameState.setFlag(spot.flag, true)
  GameState.setFlag(SAND_STARTED, true)
  GameState.addItem(STAR_SAND, 1)
  return {
    lines: [spot.line, `拿到了星砂。（${sandCount()}/${STAR_SAND_NEED}）`],
  }
}

/**
 * 交给穗：满 10 颗换星砂袋
 * @author zjh
 * @date 2026-11-06
 */
export function turnInStarSand(): { lines: string[]; reward: boolean } | { reason: string } {
  if (GameState.hasFlag(SAND_DONE)) {
    return { reason: '星砂袋你已经收下了。荒原上稀有的伙伴会更容易露面。' }
  }
  if (!GameState.hasFlag('star_chart')) {
    return { reason: '先听我说完星图……再谈星砂的事。' }
  }
  const n = sandCount()
  if (n < STAR_SAND_NEED) {
    GameState.setFlag(SAND_STARTED, true)
    return { reason: `再找 ${STAR_SAND_NEED - n} 颗星砂。荒原沙窝、石门边、南口都有。` }
  }
  for (let i = 0; i < STAR_SAND_NEED; i++) GameState.consumeItem(STAR_SAND)
  GameState.setFlag(SAND_DONE, true)
  GameState.addItem(SAND_POUCH, 1)
  return {
    reward: true,
    lines: [
      '穗把十撮星砂倒进布袋，系紧口。',
      '穗：星砂护符你通关荒原时会有一枚。这一袋是「招稀」用的——荒原上少见的伙伴会更容易靠近。',
      '获得了重要物品「星砂袋」！',
    ],
  }
}
