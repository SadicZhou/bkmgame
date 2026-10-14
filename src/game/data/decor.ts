/**
 * 地图装饰物：房屋、温泉、祭坛火盆、家具等（AI 像素画，public/assets/decor/）。
 * x / y / w / h 为占地格（左上角 + 宽高），贴图底边对齐占地底边、水平居中；
 * solid 的占地格不可通行（门等需要留空的格子用 open 排除）。
 * @author zjh
 * @date 2026-10-14
 */

/** 装饰动效：温泉蒸汽 / 火焰跳动 */
export type DecorFx = 'steam' | 'flame'

export interface DecorDef {
  key: string
  x: number
  y: number
  w: number
  h: number
  solid?: boolean
  /** 平铺在地面（地毯），画在人物与其他装饰物下面 */
  flat?: boolean
  /** 占地内仍可通行的格子 */
  open?: { x: number; y: number }[]
  fx?: DecorFx
  /** 动效锚点相对贴图底边中心的偏移（px） */
  fxAt?: { x: number; y: number }
}

/** 全部装饰物贴图 key（文件名同 key） */
export const DECOR_KEYS = [
  'decor-house',
  'decor-spring',
  'decor-brazier',
  'decor-bed',
  'decor-fireplace',
  'decor-rug',
  'decor-plant',
  'decor-well',
  'decor-stall',
] as const

export const DECOR: Record<string, DecorDef[]> = {
  town: [
    { key: 'decor-house', x: 2, y: 2, w: 3, h: 2, solid: true, open: [{ x: 3, y: 3 }] },
    { key: 'decor-well', x: 12, y: 3, w: 1, h: 1, solid: true },
    { key: 'decor-stall', x: 4, y: 6, w: 2, h: 1, solid: true },
  ],
  pass: [
    { key: 'decor-spring', x: 1, y: 6, w: 2, h: 2, solid: true, fx: 'steam', fxAt: { x: 0, y: -30 } },
    { key: 'decor-brazier', x: 6, y: 1, w: 1, h: 1, solid: true, fx: 'flame', fxAt: { x: 0, y: -40 } },
    { key: 'decor-brazier', x: 8, y: 1, w: 1, h: 1, solid: true, fx: 'flame', fxAt: { x: 0, y: -40 } },
  ],
  cabin: [
    { key: 'decor-rug', x: 4, y: 4, w: 2, h: 2, flat: true },
    { key: 'decor-bed', x: 2, y: 2, w: 2, h: 2, solid: true },
    { key: 'decor-fireplace', x: 6, y: 1, w: 2, h: 1, solid: true, fx: 'flame', fxAt: { x: 2, y: -16 } },
    { key: 'decor-plant', x: 8, y: 1, w: 1, h: 1, solid: true },
    { key: 'decor-plant', x: 1, y: 6, w: 1, h: 1, solid: true },
  ],
}

/**
 * 该格是否被装饰物挡住
 * @author zjh
 * @date 2026-10-14
 */
export function decorBlocks(mapId: string, x: number, y: number): boolean {
  return (DECOR[mapId] ?? []).some(
    (d) =>
      d.solid &&
      x >= d.x &&
      x < d.x + d.w &&
      y >= d.y &&
      y < d.y + d.h &&
      !d.open?.some((o) => o.x === x && o.y === y),
  )
}
