/**
 * 坐骑：体型大的伙伴可以骑乘，按属性 / 物种获得不同的骑乘能力
 * 骑乘行走图由 scripts/process-mounts.py 从 art-src/mounts/<物种id>.jpg 生成（public/assets/chars/mount-<物种id>.png）。
 * @author zjh
 * @date 2026-10-15
 */

/**
 * blaze 焰步（焰）：灰烬草不遇敌，夜里照亮范围更大
 * surf 踏浪（潮）：可以在水面上前进
 * quiet 林隐（叶）：高草遇敌机率减半
 * climb 攀岩（岩）：可以翻过岩石
 */
export type MountSkill = 'blaze' | 'surf' | 'quiet' | 'climb'

export interface MountSkillInfo {
  label: string
  desc: string
  /** 需要该旗标才生效（避免绕过剧情） */
  unlockFlag?: string
  /** 未解锁时的提示 */
  lockedHint?: string
}

export const MOUNT_SKILLS: Record<MountSkill, MountSkillInfo> = {
  blaze: { label: '焰步', desc: '走灰烬草不会遇到野生伙伴；夜里照亮更大的范围。' },
  surf: {
    label: '踏浪',
    desc: '可以驮着你在水面上前进。',
    unlockFlag: 'whale_beaten',
    lockedHint: '湖里的伙伴还在害怕……等沧澜鲸平静下来，它才敢下水。',
  },
  quiet: { label: '林隐', desc: '在高草里放轻脚步，遇到野生伙伴的机率减半。' },
  climb: {
    label: '攀岩',
    desc: '可以驮着你翻过岩石。',
    unlockFlag: 'boss_beaten',
    lockedHint: '山上的熔岩还不安稳……等熔鬃狮平静下来，再去翻越岩石吧。',
  },
}

export interface MountDef {
  skill: MountSkill
  /** 移动速度倍率（步行 = 1） */
  speed: number
}

/** 可骑乘的物种（守护兽不可收服，不在此列） */
export const MOUNTS: Record<string, MountDef> = {
  blazehorn: { skill: 'blaze', speed: 1.8 },
  pyrecrown: { skill: 'blaze', speed: 2 },
  torrentshell: { skill: 'surf', speed: 1.5 },
  abyssshell: { skill: 'surf', speed: 1.6 },
  grovefox: { skill: 'quiet', speed: 1.8 },
  sylvanfox: { skill: 'quiet', speed: 2 },
  cragdog: { skill: 'climb', speed: 1.7 },
}

/** 骑乘行走图的贴图 key */
export const mountSheet = (speciesId: string) => `mount-${speciesId}`

export const isMountSpecies = (speciesId: string) => !!MOUNTS[speciesId]
