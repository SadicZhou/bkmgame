/**
 * 千灯节：通关后每满 30 天，小镇举办一次；饰品摊轮换发限定饰品
 * @author zjh
 * @date 2026-10-20
 */

/** 每隔几天一轮 */
export const FESTIVAL_EVERY = 30

/** 轮换的限定饰品（纯装饰，写在徽记页） */
export const FEST_GIFTS = [
  { id: 'fest_ribbon', name: '千灯穗', desc: '千灯节的穗带。没有战力加成，只是好看。' },
  { id: 'fest_lantern', name: '纸灯饰', desc: '千灯节的小纸灯。挂在腰带上会轻轻晃。' },
  { id: 'fest_star', name: '星火别针', desc: '千灯节的星火别针。夜里会亮一点点。' },
] as const

/**
 * 今天是不是千灯节（通关后，且天数能被 30 整除）
 * @author zjh
 * @date 2026-10-20
 */
export function festivalToday(day: number, cleared: boolean): boolean {
  return cleared && day > 0 && day % FESTIVAL_EVERY === 0
}

/**
 * 这一轮该发的饰品下标
 * @author zjh
 * @date 2026-10-20
 */
export function festGiftIndex(day: number): number {
  const round = Math.max(1, Math.floor(day / FESTIVAL_EVERY))
  return (round - 1) % FEST_GIFTS.length
}

/**
 * 本轮领取旗标，一天只领一次
 * @author zjh
 * @date 2026-10-20
 */
export function festClaimFlag(day: number): string {
  return `fest_claimed_${day}`
}

/**
 * 已经集齐几件千灯饰品
 * @author zjh
 * @date 2026-10-20
 */
export function festOwnedCount(count: (id: string) => number): number {
  return FEST_GIFTS.filter((g) => count(g.id) > 0).length
}
