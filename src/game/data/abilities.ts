/**
 * 特性定义（效果在 systems/AbilityHooks.ts 中按 id 结算）
 * @author zjh
 * @date 2026-10-14
 */

export interface AbilityDef {
  id: string
  name: string
  desc: string
}

const LIST: AbilityDef[] = [
  { id: 'blaze_heart', name: '焰心', desc: 'HP 低于 1/3 时，焰系招式威力 ×1.3。' },
  { id: 'torrent_heart', name: '激流', desc: 'HP 低于 1/3 时，潮系招式威力 ×1.3。' },
  { id: 'overgrow', name: '茂盛', desc: 'HP 低于 1/3 时，叶系招式威力 ×1.3。' },
  { id: 'hard_shell', name: '坚甲', desc: '受到「效果拔群」的伤害 ×0.8。' },
  { id: 'swift', name: '迅捷', desc: '速度 +10%。' },
  { id: 'static', name: '静电', desc: '被接触类招式命中时，25% 令对手麻痹。' },
  { id: 'flame_body', name: '火焰体', desc: '被接触类招式命中时，25% 令对手灼烧。' },
  { id: 'ice_skin', name: '冰肤', desc: '被接触类招式命中时，15% 令对手冻结。' },
  { id: 'lucky', name: '好运', desc: '会心率翻倍。' },
  { id: 'regen', name: '自愈', desc: '每回合结束回复 1/16 HP。' },
  { id: 'fluffy', name: '毛绒', desc: '受到接触伤害 ×0.75，受到焰系伤害 ×1.25。' },
  { id: 'timid', name: '胆怯', desc: '野生战斗中逃跑必定成功。' },
  { id: 'guide', name: '引路', desc: '作为首发时，稀有物种出现率 ×1.5。' },
  { id: 'dispel', name: '驱散', desc: '作为首发时，遇敌率 ×0.7。' },
  { id: 'bubble', name: '水泡', desc: '潮系招式威力 ×1.2，不会被灼烧。' },
  { id: 'echo', name: '回响', desc: '连续使用同一招式时，威力每次 +10%（最多 +30%）。' },
  { id: 'intimidate', name: '威吓', desc: '出场时令对手攻击 −1 阶。' },
  { id: 'tailwind_born', name: '顺风', desc: '出场时自身速度 +1 阶。' },
  { id: 'snow_cloak', name: '雪隐', desc: '下雪时闪避 +10%。' },
  { id: 'glimmer', name: '微光', desc: '灵系招式命中时，20% 令对手混乱。' },
  { id: 'ember_last', name: '余烬', desc: '倒下时，对对手造成其最大 HP 1/8 的伤害。' },
  { id: 'guardian', name: '守护者', desc: '每场战斗首次受到致命伤害时，残留 1 HP。' },
  { id: 'rebirth', name: '涅槃', desc: '每场战斗限一次，倒下时以 50% HP 复活。' },
  { id: 'kindred', name: '同心', desc: '亲密度 ≥ 220 时，全能力 +5%。' },
  { id: 'forest_voice', name: '林语', desc: '每 3 回合结束时，回声响彻全场：双方能力阶级清零。' },
  { id: 'stone_rumble', name: '地鸣', desc: '每 3 回合结束时地面震动：非岩系伙伴损失 1/12 HP。' },
  { id: 'sky_bolt', name: '落雷', desc: '每 2 回合结束时，雷击落在场上的一方，造成 1/10 HP 伤害。' },
  { id: 'bell_chime', name: '冰铃共鸣', desc: '每 3 回合结束时，冰铃响起，自身回复 1/8 HP。' },
  // 唯一精灵专属
  { id: 'wish', name: '许愿', desc: '打出会心后，自身速度 +1 阶。' },
  { id: 'bloom_scent', name: '花香', desc: '每回合结束回复 1/16 HP，并有 30% 解除自身异常状态。' },
  { id: 'magma_armor', name: '熔甲', desc: '受到潮系伤害 ×0.75。' },
]

export const ABILITIES: Record<string, AbilityDef> = Object.fromEntries(LIST.map((a) => [a.id, a]))
