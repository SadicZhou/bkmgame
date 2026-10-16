/**
 * 第八章「长夜」：五盏路灯。已经倒戈的干部预先守住其中三盏。
 * 五盏都亮之后，钟楼下才会出现墨尘。
 * @author zjh
 * @date 2026-10-16
 */

export const NIGHT_FLAG = 'night_started'

export interface NightLamp {
  id: string
  flag: string
  /** 有这位盟友时，这盏灯开场就已经亮着 */
  ally: string | null
  name: string
}

export const NIGHT_LAMPS: NightLamp[] = [
  { id: 'square', flag: 'night_lamp_square', ally: null, name: '广场' },
  { id: 'inn', flag: 'night_lamp_inn', ally: 'anvil_beaten', name: '旅店' },
  { id: 'shop', flag: 'night_lamp_shop', ally: 'kindler_joined', name: '商店' },
  { id: 'home', flag: 'night_lamp_home', ally: 'twins_beaten', name: '阿禾家' },
  { id: 'clock', flag: 'night_lamp_clock', ally: null, name: '钟楼' },
]

/**
 * 开场时点亮盟友已经守住的灯
 * @author zjh
 * @date 2026-10-16
 */
export function lightAllyLamps(has: (k: string) => boolean, set: (k: string) => void): string[] {
  const lit: string[] = []
  for (const lamp of NIGHT_LAMPS) {
    if (!lamp.ally || !has(lamp.ally) || has(lamp.flag)) continue
    set(lamp.flag)
    lit.push(lamp.name)
  }
  return lit
}

/** 五盏都亮了就写下 night_relay_done；已经写过则返回 false */
export function syncNightRelay(has: (k: string) => boolean, set: (k: string) => void): boolean {
  if (has('night_relay_done')) return false
  if (!NIGHT_LAMPS.every((lamp) => has(lamp.flag))) return false
  set('night_relay_done')
  return true
}

/** 长夜进行中：小镇换成夜色，商店半价 */
export function nightTownActive(mapId: string, has: (k: string) => boolean): boolean {
  return mapId === 'town' && has(NIGHT_FLAG) && !has('chapter8_done')
}
