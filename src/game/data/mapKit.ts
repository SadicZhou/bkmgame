/**
 * 地图搭建工具：填充、矩形、外圈墙、ASCII 解析（各地图文件共用）
 * @author zjh
 * @date 2026-10-15
 */

import type { TileKind } from './maps'

export const TS = 32

export function fill(w: number, h: number, kind: TileKind): TileKind[] {
  return Array.from({ length: w * h }, () => kind)
}

export function setRect(
  tiles: TileKind[],
  w: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  kind: TileKind,
): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      tiles[y * w + x] = kind
    }
  }
}

export function borderWalls(tiles: TileKind[], w: number, h: number): void {
  for (let x = 0; x < w; x++) {
    tiles[x] = 'wall'
    tiles[(h - 1) * w + x] = 'wall'
  }
  for (let y = 0; y < h; y++) {
    tiles[y * w] = 'wall'
    tiles[y * w + (w - 1)] = 'wall'
  }
}

/** ASCII 图例 */
const LEGEND: Record<string, TileKind> = {
  '#': 'wall',
  R: 'rock',
  '.': 'path',
  ',': 'grass',
  '"': 'tall',
  '^': 'ash',
  '~': 'water',
  W: 'warp',
  D: 'door',
  _: 'floor',
  '*': 'ice',
  '=': 'bridge',
  '-': 'dock',
}

/**
 * 把等宽 ASCII 行解析为格子数组；行宽不足按墙补齐
 * @author zjh
 * @date 2026-10-14
 */
export function parseAscii(rows: string[]): { width: number; height: number; tiles: TileKind[] } {
  const width = Math.max(...rows.map((r) => r.length))
  const tiles: TileKind[] = []
  for (const row of rows) {
    for (let x = 0; x < width; x++) tiles.push(LEGEND[row[x] ?? '#'] ?? 'wall')
  }
  return { width, height: rows.length, tiles }
}
