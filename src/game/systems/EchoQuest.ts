/**
 * 支线 S6-1「霜铃的回响」：通关后铃殿挑战限步冰滑三关，奖高资质霜晶蝶
 * @author zjh
 * @date 2026-10-23
 */

import { createCreature, calcStats, type CreatureInstance } from '../data/creatures'
import { GameState } from '../state/GameState'
import { GRADE_INFO, talentGrade, type Rng } from './Talent'

export const ECHO_DONE = 'side_echo_done'
export const ECHO_MAP = 'frostecho'
/** 当前挑战关卡 1～3；0 表示未在挑战中 */
export const ECHO_STAGE_FLAG = 'echo_stage'
export const ECHO_SLIDES_FLAG = 'echo_slides'

export interface EchoStage {
  id: number
  /** 本关最多滑几次（每次按方向滑行算 1） */
  maxSlides: number
  start: { x: number; y: number }
  goal: { x: number; y: number }
  doneFlag: string
  hint: string
}

/**
 * 三关：均在 frostecho 图上，起点/终点为码头格
 * 可解路径由单测锁定
 */
export const ECHO_STAGES: EchoStage[] = [
  {
    id: 1,
    maxSlides: 2,
    start: { x: 2, y: 1 },
    goal: { x: 13, y: 1 },
    doneFlag: 'echo_clear_1',
    hint: '第一关：滑到对面东码头，最多 2 次。',
  },
  {
    id: 2,
    maxSlides: 3,
    start: { x: 2, y: 1 },
    goal: { x: 2, y: 7 },
    doneFlag: 'echo_clear_2',
    hint: '第二关：滑到南边码头，最多 3 次。',
  },
  {
    id: 3,
    maxSlides: 4,
    start: { x: 2, y: 1 },
    goal: { x: 13, y: 7 },
    doneFlag: 'echo_clear_3',
    hint: '第三关：绕到右下码头，最多 4 次。',
  },
]

export function echoActive(): boolean {
  return Number(GameState.getFlag(ECHO_STAGE_FLAG) || 0) > 0
}

export function currentEchoStage(): EchoStage | null {
  const id = Number(GameState.getFlag(ECHO_STAGE_FLAG) || 0)
  return ECHO_STAGES.find((s) => s.id === id) ?? null
}

export function echoSlidesUsed(): number {
  return Number(GameState.getFlag(ECHO_SLIDES_FLAG) || 0)
}

/** 开始某一关（写入旗标，调用方负责传送） */
export function beginEchoStage(stageId: number): EchoStage | null {
  const stage = ECHO_STAGES.find((s) => s.id === stageId)
  if (!stage) return null
  GameState.setFlag(ECHO_STAGE_FLAG, stageId)
  GameState.setFlag(ECHO_SLIDES_FLAG, 0)
  GameState.setFlag('side_echo', true)
  return stage
}

/** 记一次滑行；超限返回 fail */
export function recordEchoSlide(): 'ok' | 'fail' | 'idle' {
  const stage = currentEchoStage()
  if (!stage) return 'idle'
  const used = echoSlidesUsed() + 1
  GameState.setFlag(ECHO_SLIDES_FLAG, used)
  if (used > stage.maxSlides) return 'fail'
  return 'ok'
}

/** 是否站在本关终点 */
export function isEchoGoal(x: number, y: number): boolean {
  const stage = currentEchoStage()
  return !!stage && stage.goal.x === x && stage.goal.y === y
}

/**
 * 通关当前关；若三关齐则返回奖励伙伴，否则返回下一关
 * @author zjh
 * @date 2026-10-23
 */
export function clearEchoStage(rng: Rng = Math.random): {
  next: EchoStage | null
  reward: CreatureInstance | null
  lines: string[]
} {
  const stage = currentEchoStage()
  if (!stage) return { next: null, reward: null, lines: [] }
  GameState.setFlag(stage.doneFlag, true)
  GameState.setFlag(ECHO_SLIDES_FLAG, 0)
  const next = ECHO_STAGES.find((s) => s.id === stage.id + 1)
  if (next) {
    GameState.setFlag(ECHO_STAGE_FLAG, next.id)
    return {
      next,
      reward: null,
      lines: [`第 ${stage.id} 关通过！`, next.hint],
    }
  }
  GameState.clearFlag(ECHO_STAGE_FLAG)
  GameState.clearFlag(ECHO_SLIDES_FLAG)
  GameState.setFlag(ECHO_DONE, true)
  const moth = makeEchoFrostwing(rng)
  return {
    next: null,
    reward: moth,
    lines: [
      '三关的铃音叠在一起，冰面上浮起一只霜晶蝶。',
      '它的翅膀结着细霜，资质看起来极好。',
    ],
  }
}

/** 失败：滑步清零，回到本关起点（调用方传送） */
export function failEchoStage(): EchoStage | null {
  const stage = currentEchoStage()
  if (!stage) return null
  GameState.setFlag(ECHO_SLIDES_FLAG, 0)
  return stage
}

/** 离开挑战 */
export function abortEcho(): void {
  GameState.clearFlag(ECHO_STAGE_FLAG)
  GameState.clearFlag(ECHO_SLIDES_FLAG)
}

/**
 * 生成资质至少 A 的霜晶蝶（talentFloor 15 → 四维合计 ≥ 60 ≥ A）
 * @author zjh
 * @date 2026-10-23
 */
export function makeEchoFrostwing(rng: Rng = Math.random): CreatureInstance {
  const c = createCreature('frostwing', 32, { talentFloor: 15, rng, strong: true })
  // 极端随机仍低于 A 时抬到 A 线
  while (talentGrade(c.talent) !== 'A' && talentGrade(c.talent) !== 'S') {
    for (const k of ['hp', 'atk', 'def', 'spd'] as const) {
      if (c.talent[k] < 20) c.talent[k] += 1
    }
  }
  const stats = calcStats(c)
  Object.assign(c, stats, { hp: stats.maxHp })
  c.appraised = true
  return c
}

/** HUD：挑战中剩余滑次 */
export function echoHudLine(): string | null {
  const stage = currentEchoStage()
  if (!stage) return null
  const left = Math.max(0, stage.maxSlides - echoSlidesUsed())
  return `❄ 回响第${stage.id}关 · 还可滑 ${left}/${stage.maxSlides} 次`
}

export function echoStagesCleared(): number {
  return ECHO_STAGES.filter((s) => GameState.hasFlag(s.doneFlag)).length
}

/** 供测试：A 级下限 */
export const ECHO_A_MIN = GRADE_INFO.A.min
