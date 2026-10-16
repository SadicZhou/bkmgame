/**
 * 伙伴立绘素材：有 PNG 的物种优先使用图片，其余沿用 PixelFactory 程序绘制。
 * 所有伙伴按 48px 基准排版，图片立绘分辨率更高，显示时按实际宽度折算缩放。
 * 新增物种立绘：把 AI 原图放进 art-src/creatures/<物种id>.jpg，运行 scripts/process-sprites.py 即可（规范见 docs/art-guide.md）。
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { SPECIES } from '../data/species'

/** 伙伴贴图的排版基准边长 */
export const CREATURE_BASE = 48

/** 已有图片立绘的物种（同时提供 -shiny 异色版）；全部物种均已配图，缺图时加载失败会回退到程序绘制 */
export const ART_SPECIES = Object.keys(SPECIES)

/**
 * 在场景 preload 阶段加载立绘；贴图 key 与程序绘制版一致（spr-物种id / spr-物种id-shiny）
 * @author zjh
 * @date 2026-10-14
 */
/** 还没有立绘、用程序绘制的物种（有 PNG 后从这里删掉） */
const DRAWN = new Set([
  'drillmole',
  'crystalbat',
  'amberling',
  'shellfossil',
  'ridgerhino',
  'sparkpuff',
  'voltbadger',
  'dunefin',
  'starcat',
  'stormfalcon',
  'snowbun',
  'frostfox',
  'frostwing',
  'frostcrane',
])

export function preloadCreatureArt(scene: Phaser.Scene): void {
  for (const id of ART_SPECIES) {
    if (DRAWN.has(id)) continue
    scene.load.image(`spr-${id}`, `assets/creatures/${id}.png`)
    scene.load.image(`spr-${id}-shiny`, `assets/creatures/${id}-shiny.png`)
  }
}

/**
 * 按 48px 基准设置伙伴图的缩放：scale = 1 表示显示为 48×48
 * 换贴图后需重新调用。
 * @author zjh
 * @date 2026-10-14
 */
export function setCreatureScale<T extends Phaser.GameObjects.Image>(img: T, scale: number): T {
  return img.setScale((scale * CREATURE_BASE) / img.frame.realWidth)
}

/** 各进化阶段的战斗体型倍率（一阶 / 二阶 / 三阶） */
const STAGE_SIZE = [1, 1.1, 1.2]

/** 物种 id → 进化前物种 id */
const PREVOLUTION: Record<string, string> = Object.fromEntries(
  Object.values(SPECIES)
    .filter((s) => s.evolvesTo)
    .map((s) => [s.evolvesTo as string, s.id]),
)

/**
 * 物种所处的进化阶段：1 = 初始形态，每向上追溯一次进化前形态 +1
 * @author zjh
 * @date 2026-10-14
 */
export function evolutionStage(speciesId: string): number {
  let stage = 1
  for (let id = PREVOLUTION[speciesId]; id && stage < 9; id = PREVOLUTION[id]) stage++
  return stage
}

/**
 * 贴图 key（spr-物种id / spr-物种id-shiny）对应的阶段体型倍率
 * @author zjh
 * @date 2026-10-14
 */
export function stageSize(textureKey: string): number {
  const id = textureKey.replace(/^spr-/, '').replace(/-shiny$/, '')
  return STAGE_SIZE[Math.min(evolutionStage(id), STAGE_SIZE.length) - 1]
}

/**
 * 战斗用缩放：在基础缩放上叠加进化阶段倍率，
 * 并下移纵向原点让脚底保持在原位置（放大只向上和两侧长）。换贴图后需重新调用。
 * @author zjh
 * @date 2026-10-14
 */
export function setBattleCreatureScale<T extends Phaser.GameObjects.Image>(img: T, scale: number): T {
  const size = stageSize(img.texture.key)
  img.setOrigin(0.5, 1 - 1 / (2 * size))
  return setCreatureScale(img, scale * size)
}
