/**
 * 支线 S6-3「望的纸灯」：双子战后帮望做灯，满月夜放到峰顶，得心火纸灯
 * @author zjh
 * @date 2026-10-22
 */

import { GameState } from '../state/GameState'
import { isFullMoon, isNight } from './WorldClock'

/** 做灯材料 */
export const LAMP_PARTS = [
  { id: 'lamp_paper', name: '薄灯纸', flag: 'got_lamp_paper' },
  { id: 'lamp_wick', name: '软灯芯', flag: 'got_lamp_wick' },
  { id: 'aurora_dust', name: '极光碎屑', flag: 'got_aurora_dust' },
] as const

export const WANG_LAMP_DONE = 'side_wang_lamp'
/** 未点燃、待放到峰顶的纸灯 */
export const UNLIT_LAMP = 'wang_paper_lamp'
/** 放灯后望回赠的心火纸灯 */
export const HEART_LAMP = 'heart_paper_lamp'

export function lampPartsCount(): number {
  return LAMP_PARTS.filter((p) => GameState.itemCount(p.id) > 0 || GameState.hasFlag(p.flag)).length
}

export function lampPartsReady(): boolean {
  return LAMP_PARTS.every((p) => GameState.itemCount(p.id) > 0)
}

/** 支线是否开启（双子战已胜） */
export function wangLampActive(): boolean {
  return GameState.hasFlag('twins_beaten') && !GameState.hasFlag(WANG_LAMP_DONE)
}

/**
 * 捡材料
 * @author zjh
 * @date 2026-10-22
 */
export function pickLampPart(partId: (typeof LAMP_PARTS)[number]['id']): { lines: string[] } | { reason: string } {
  if (!GameState.hasFlag('twins_beaten')) return { reason: '（现在还不是捡这个的时候。）' }
  const part = LAMP_PARTS.find((p) => p.id === partId)
  if (!part) return { reason: '没有这种材料。' }
  if (GameState.hasFlag(part.flag) || GameState.itemCount(part.id) > 0) return { reason: `已经有${part.name}了。` }
  GameState.addItem(part.id, 1)
  GameState.setFlag(part.flag, true)
  GameState.setFlag('side_wang_lamp_started', true)
  return { lines: [`拿到了「${part.name}」。`, `（纸灯材料 ${lampPartsCount()}/${LAMP_PARTS.length}）`] }
}

/**
 * 望把三样材料糊成未燃纸灯
 * @author zjh
 * @date 2026-10-22
 */
export function craftWangLamp(): { lines: string[] } | { reason: string } {
  if (GameState.hasFlag(WANG_LAMP_DONE)) return { reason: '纸灯已经放到峰顶了。' }
  if (GameState.itemCount(UNLIT_LAMP) > 0) return { reason: '灯做好了。满月夜带到霜铃峰北口的石台去放吧。' }
  if (!lampPartsReady()) {
    const miss = LAMP_PARTS.filter((p) => GameState.itemCount(p.id) <= 0).map((p) => p.name)
    return { reason: `还缺：${miss.join('、')}。` }
  }
  for (const p of LAMP_PARTS) GameState.consumeItem(p.id)
  GameState.addItem(UNLIT_LAMP, 1)
  return {
    lines: [
      '望小心地糊好纸，穿上灯芯，撒了一点极光碎屑。',
      '望：好了。等满月夜……铃影最长的那一晚，放到峰顶北边的石台上。',
      '望：那是首领哥哥每年放灯的地方。',
    ],
  }
}

/** 今夜是否可放灯（满月夜＝游戏里的「冬至夜」窗口） */
export function canPlaceWangLamp(steps: number): boolean {
  return isNight(steps) && isFullMoon(steps)
}

/**
 * 在峰顶石台放灯
 * @author zjh
 * @date 2026-10-22
 */
export function placeWangLamp(steps: number): { lines: string[]; done: boolean } | { reason: string } {
  if (GameState.hasFlag(WANG_LAMP_DONE)) return { reason: '石台上还有一点暖光，像灯刚走不久。' }
  if (GameState.itemCount(UNLIT_LAMP) <= 0) return { reason: '石台空着。先帮望把纸灯做好。' }
  if (!isNight(steps)) return { reason: '白天放灯，火会显得太亮。等到夜里吧。' }
  if (!isFullMoon(steps)) return { reason: '望说过：要等满月夜，铃影最长的时候。' }
  GameState.consumeItem(UNLIT_LAMP)
  GameState.setFlag(WANG_LAMP_DONE, true)
  GameState.addItem(HEART_LAMP, 1)
  return {
    done: true,
    lines: [
      '纸灯升起来一点点，极光碎屑在里面闪了一下。',
      '望从铃殿跑来，眼睛亮亮的。',
      '望：谢谢你。……这盏心火纸灯给你。终章如果还需要一点暖光，它会帮你。',
      '朔：（远远地）别着凉。',
    ],
  }
}
