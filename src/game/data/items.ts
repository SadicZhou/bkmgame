/**
 * 道具数据：回复、复活、状态解除、PP 回复、收服、野外道具
 * @author zjh
 * @date 2026-10-14
 */

import type { StatusId } from './moves'

/** key：重要物品（剧情获得，不能出售、不能在战斗中使用） */
/** talent：资质卡（野外对伙伴使用，指定一项资质 +value） */
/** vehicle：载具（不消耗，在野外展开） */
export type ItemKind = 'heal' | 'revive' | 'cure' | 'pp' | 'catch' | 'lure' | 'repel' | 'talent' | 'key' | 'vehicle'

export interface ItemDef {
  id: string
  name: string
  kind: ItemKind
  /**
   * heal：回复 HP 数值；revive：复活后 HP 比例；pp：每个技能回复量（0 = 回满）；
   * catch：收服倍率；lure / repel：持续步数
   */
  value: number
  price: number
  desc: string
}

export const ITEMS: Record<string, ItemDef> = {
  potion: { id: 'potion', name: '急救喷雾', kind: 'heal', value: 25, price: 30, desc: '小罐喷雾。回复 1 只伙伴 25 点 HP。' },
  super_potion: { id: 'super_potion', name: '强效喷雾', kind: 'heal', value: 60, price: 80, desc: '加压喷罐。回复 1 只伙伴 60 点 HP。' },
  revive: { id: 'revive', name: '复苏贴', kind: 'revive', value: 0.5, price: 120, desc: '贴在伙伴身上的复苏贴。让倒下的伙伴恢复一半 HP。' },
  full_heal: { id: 'full_heal', name: '清创贴', kind: 'cure', value: 0, price: 120, desc: '凉凉的清创贴。解除灼烧、麻痹、冻结。' },
  pp_fruit: { id: 'pp_fruit', name: '能量棒', kind: 'pp', value: 10, price: 60, desc: '压缩口粮。1 只伙伴的每个技能各回复 10 PP。' },
  pp_honey: { id: 'pp_honey', name: '满格电池', kind: 'pp', value: 0, price: 200, desc: '一小块旅团电池。1 只伙伴的所有技能 PP 回满。' },
  soothe_berry: { id: 'soothe_berry', name: '安抚信标', kind: 'catch', value: 1, price: 50, desc: '野生战使用。信标亮起时，对手更容易愿意同行。HP 越低、处于异常状态时越容易成功。' },
  honey_berry: { id: 'honey_berry', name: '强信号标', kind: 'catch', value: 1.8, price: 150, desc: '信号更稳的信标，成功率约为安抚信标的 1.8 倍。' },
  lure_bell: { id: 'lure_bell', name: '引兽铃', kind: 'lure', value: 100, price: 100, desc: '100 步内遇敌率 ×1.5，稀有伙伴出现率 ×2。' },
  repel: { id: 'repel', name: '驱兽喷雾', kind: 'repel', value: 200, price: 80, desc: '200 步内，比首发等级低的野生伙伴不会靠近。' },
  talent_fruit: { id: 'talent_fruit', name: '资质卡', kind: 'talent', value: 2, price: 0, desc: '一张训练记录卡。指定伙伴的一项资质 +2（上限 20，每只最多 5 次）。只能在野外使用。' },
  old_rod: { id: 'old_rod', name: '旧钓竿', kind: 'key', value: 0, price: 0, desc: '泉守汐送的钓竿。面朝水面按确认就能钓鱼。' },
  good_rod: { id: 'good_rod', name: '好钓竿', kind: 'key', value: 0, price: 0, desc: '沧澜鲸的鳞片缠在竿头，能钓到更深处的伙伴。' },
  strength_gloves: { id: 'strength_gloves', name: '怪力手套', kind: 'key', value: 0, price: 0, desc: '峰送的手套。队伍里有岩系或一般系伙伴时，面朝巨石按确认可以推动一格。' },
  dust_badge: { id: 'dust_badge', name: '旧徽章', kind: 'key', value: 0, price: 0, desc: '阿禾旅团的旧徽章，背面刻着一个「尘」字。' },
  canyon_ore: { id: 'canyon_ore', name: '峡谷矿石', kind: 'key', value: 0, price: 0, desc: '千岩峡谷里捡到的矿石。锤音镇的锤铺学徒正在收集，凑满 5 块可以交给他。' },
  wind_chime: { id: 'wind_chime', name: '风铃坠', kind: 'key', value: 0, price: 0, desc: '学徒用矿石敲出来的小坠子。带着它出战时，速度提高 5%。' },
  book_rock_slide: { id: 'book_rock_slide', name: '技能书·岩崩', kind: 'key', value: 0, price: 0, desc: '矿车竞速的金牌奖品。在背包里打开，可以让岩系伙伴学会岩崩（技能未满时）。' },
  charge_bottle: { id: 'charge_bottle', name: '蓄雷瓶', kind: 'key', value: 0, price: 0, desc: '穗灌好的蓄雷液。没有雷系伙伴时，也能给避雷针充电。' },
  star_charm: { id: 'star_charm', name: '星砂护符', kind: 'key', value: 0, price: 0, desc: '装着一把会闪光的细沙。带着它时，异色伙伴出现率 ×1.5。' },
  hearth_stone: { id: 'hearth_stone', name: '暖炉石', kind: 'key', value: 0, price: 0, desc: '雪伯给的石头。在霜铃峰的篝火边按确认，可以把寒冷烘掉。' },
  star_glider: { id: 'star_glider', name: '星砂滑翔翼', kind: 'key', value: 0, price: 0, desc: '穗用星砂布扎的小翅膀。在霜铃峰的风柱边按确认，就能滑到云阶。' },
  torn_photo: { id: 'torn_photo', name: '合照残角', kind: 'key', value: 0, price: 0, desc: '缺角合照的右下角。背面写着「尘 与 灯灯，旅团第三年。」' },
  white_feather: { id: 'white_feather', name: '白风羽', kind: 'key', value: 0, price: 0, desc: '鸢留下的信物。终章如果还需要风，它会把风送来。' },
  fold_board: { id: 'fold_board', name: '折叠滑板', kind: 'vehicle', value: 0, price: 200, desc: '旅团杂货铺的折叠滑板。在野外展开后走得更快；室内会自动收起，不能和骑乘同时使用。' },
}

/** 背包分页 */
export const BAG_PAGES: { id: 'heal' | 'field' | 'key' | 'ride'; name: string; hint: string; kinds: ItemKind[] }[] = [
  { id: 'heal', name: '回复', hint: '喷雾、贴片、能量棒和电池。选中后对一只伙伴使用。', kinds: ['heal', 'revive', 'cure', 'pp'] },
  { id: 'field', name: '野外', hint: '信标、铃声、喷雾和资质卡。有的只能在战斗或草地里用。', kinds: ['catch', 'lure', 'repel', 'talent'] },
  { id: 'key', name: '重要', hint: '钓竿、手套、徽章和信物。带着就能触发对应的事。', kinds: ['key'] },
  { id: 'ride', name: '载具', hint: '展开后在野外移动更快。', kinds: ['vehicle'] },
]

/** 道具像素图的贴图名 */
export function itemIconKey(id: string): string {
  return `item-${id}`
}

/** 重要物品（背包末尾展示） */
export const KEY_ITEMS: string[] = ['old_rod', 'good_rod', 'strength_gloves', 'dust_badge', 'canyon_ore', 'wind_chime', 'book_rock_slide', 'charge_bottle', 'star_charm', 'hearth_stone', 'star_glider', 'torn_photo', 'white_feather']

/** 商店货架顺序 */
export const SHOP_STOCK: string[] = [
  'potion',
  'super_potion',
  'revive',
  'full_heal',
  'pp_fruit',
  'pp_honey',
  'soothe_berry',
  'honey_berry',
  'lure_bell',
  'repel',
]

/** 背包展示顺序 */
export const ITEM_ORDER: string[] = [...SHOP_STOCK, 'talent_fruit', ...KEY_ITEMS, 'fold_board']

/** 队伍上限 */
export const PARTY_LIMIT = 6

/** 状态异常对收服的加成 */
const STATUS_CATCH_BONUS: Record<StatusId, number> = { paralyze: 1.5, freeze: 1.5, burn: 1.2 }

/** 收服计算的附加条件 */
export interface CatchContext {
  status?: StatusId | null
  /** 物种收服倍率（唯一精灵较低） */
  speciesRate?: number
  /** 持有异象信物 ×2 */
  token?: boolean
}

/**
 * 计算安抚成功率：对手 HP 越低越高；异常状态、异象信物提供加成
 * @author zjh
 * @date 2026-10-14
 */
export function catchChance(hp: number, maxHp: number, itemRate: number, ctx: CatchContext = {}): number {
  const ratio = maxHp > 0 ? hp / maxHp : 1
  const statusBonus = ctx.status ? STATUS_CATCH_BONUS[ctx.status] : 1
  const rate = itemRate * (ctx.speciesRate ?? 1) * statusBonus * (ctx.token ? 2 : 1)
  const base = (1 - ratio * 0.75) * 0.6 * rate + 0.1 * Math.min(1, ctx.speciesRate ?? 1)
  return Math.max(0.03, Math.min(0.95, base))
}
