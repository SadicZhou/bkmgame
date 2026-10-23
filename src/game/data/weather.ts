/**
 * 天气定义、战斗与遭遇修正、各地图天气表（见 docs/planning/08）
 * @author zjh
 * @date 2026-10-14
 */

import type { ElementType } from './types'

export type Weather = 'sunny' | 'rain' | 'fog' | 'storm' | 'sand' | 'snow' | 'heartfire'

export interface WeatherInfo {
  label: string
  icon: string
  desc: string
}

export const WEATHER_INFO: Record<Weather, WeatherInfo> = {
  sunny: { label: '晴', icon: '☀', desc: '焰系招式 ×1.1，潮系 ×0.9；光合回复更多。' },
  rain: { label: '雨', icon: '☂', desc: '潮系招式 ×1.1，焰系 ×0.9；潮系伙伴更常出现。' },
  fog: { label: '雾', icon: '≋', desc: '潮系招式 ×1.1，命中 −5%；遇敌率略升。' },
  storm: { label: '雷雨', icon: 'ϟ', desc: '雷系招式 ×1.2，潮系 ×1.1；雷系伙伴更常出现。' },
  sand: { label: '沙暴', icon: '≈', desc: '非岩系每回合损失 1/16 HP；遇敌率 ×1.3。' },
  snow: { label: '雪', icon: '❄', desc: '冻结几率翻倍；霜系伙伴更常出现。' },
  heartfire: { label: '心火', icon: '✹', desc: '灵系与焰系招式 ×1.1。' },
}

/** 各户外地图天气权重 */
export const WEATHER_TABLES: Record<string, Partial<Record<Weather, number>>> = {
  meadow: { sunny: 60, rain: 25, fog: 15 },
  pass: { sunny: 70, rain: 10, sand: 20 },
  lake: { sunny: 25, rain: 30, fog: 45 },
  forest: { sunny: 40, rain: 30, fog: 20, storm: 10 },
  canyon: { sunny: 55, sand: 30, rain: 15 },
  dunes: { sunny: 40, sand: 45, storm: 15 },
  frostpeak: { snow: 70, sunny: 20, fog: 10 },
  icelake: { snow: 80, sunny: 20 },
  frostecho: { snow: 90, sunny: 10 },
  cloudstart: { sunny: 70, fog: 20, storm: 10 },
  cloudfeather: { sunny: 70, fog: 20, storm: 10 },
  cloudmill: { sunny: 60, fog: 20, storm: 20 },
  cloudbridge: { sunny: 60, fog: 30, storm: 10 },
}

/** 天气每隔多少步（全局步数）重掷 */
export const WEATHER_ROLL_STEPS = 300

/**
 * 天气对招式威力的倍率
 * @author zjh
 * @date 2026-10-14
 */
export function weatherPowerMod(weather: Weather | null, type: ElementType): number {
  switch (weather) {
    case 'sunny':
      return type === 'flame' ? 1.1 : type === 'tide' ? 0.9 : 1
    case 'rain':
      return type === 'tide' ? 1.1 : type === 'flame' ? 0.9 : 1
    case 'fog':
      return type === 'tide' ? 1.1 : 1
    case 'storm':
      return type === 'volt' ? 1.2 : type === 'tide' ? 1.1 : 1
    case 'heartfire':
      return type === 'spirit' || type === 'flame' ? 1.1 : 1
    default:
      return 1
  }
}

/** 天气对遇敌率的倍率 */
export function weatherEncounterMod(weather: Weather | null): number {
  if (weather === 'sand') return 1.3
  if (weather === 'fog') return 1.1
  return 1
}

/** 天气对某属性物种出现权重的倍率 */
export function weatherSpeciesMod(weather: Weather | null, type: ElementType): number {
  if (weather === 'rain' && type === 'tide') return 1.5
  if (weather === 'storm' && type === 'volt') return 2
  if (weather === 'sand' && type === 'stone') return 1.5
  if (weather === 'snow' && type === 'frost') return 1.5
  return 1
}
