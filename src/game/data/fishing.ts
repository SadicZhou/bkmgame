/**
 * 钓鱼图鉴与钓鱼大赛数据：可钓物种、基准体长、每日奖励、集齐大奖
 * 规则见 docs/v3.2-lake-polish-design.md 第 4.3、4.4 节。
 * @author zjh
 * @date 2026-10-15
 */

/** 钓鱼记录的展示顺序（雾泉湖畔全部可钓物种） */
export const FISH_ORDER: string[] = ['bubblefin', 'mistnewt', 'coralfin', 'wavefin', 'tideback', 'lanternray']

/** 各物种基准体长（cm），实际体长在 0.75～1.30 倍之间浮动 */
export const FISH_BASE_CM: Record<string, number> = {
  bubblefin: 18,
  mistnewt: 26,
  coralfin: 32,
  wavefin: 40,
  tideback: 30,
  lanternray: 55,
}

/** 体长浮动范围与强壮个体加成 */
export const FISH_SIZE = { min: 0.75, max: 1.3, strongBonus: 1.15 }

/** 大赛目标 = 基准体长 × 该倍率 */
export const CONTEST_TARGET_RATE = 1.1

/** 每日大赛奖励：固定焰币 + 按天轮换的道具 */
export const CONTEST_COINS = 200
export const CONTEST_ITEMS: string[] = ['super_potion', 'honey_berry', 'pp_fruit']

/** 钓鱼记录集齐后的一次性大奖 */
export const MASTER_REWARD = { coins: 500, itemId: 'lure_bell', count: 3, flag: 'fish_master' }

/** 澈的个人纪录 = 基准体长 × 该倍率；玩家打破后找澈领一次奖励（每种鱼一次） */
export const ANGLER_RECORD_RATE = 1.2
export const RECORD_BREAK_COINS = 80
/** 打破纪录已领奖的旗标前缀（fish_rec_<物种>） */
export const RECORD_FLAG_PREFIX = 'fish_rec_'

/** 雨天限定题：出题时湖畔在下雨；必须在雨中钓到，目标体长 = 基准 × targetRate，奖励更高 */
export const RAIN_CONTEST = { targetRate: 1.0, coins: 300, itemId: 'lure_bell' }
