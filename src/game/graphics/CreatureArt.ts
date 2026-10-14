/**
 * 伙伴立绘素材：有 PNG 的物种优先使用图片，其余沿用 PixelFactory 程序绘制。
 * 所有伙伴按 48px 基准排版，图片立绘分辨率更高，显示时按实际宽度折算缩放。
 * 新增立绘：把 AI 原图放进 art-src/creatures/<物种id>.jpg，运行 scripts/process-sprites.py，再把 id 加进 ART_SPECIES。
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'

/** 伙伴贴图的排版基准边长 */
export const CREATURE_BASE = 48

/** 已有图片立绘的物种（同时提供 -shiny 异色版） */
export const ART_SPECIES = [
  'flarehorn', 'blazehorn', 'pyrecrown',
  'tideback', 'torrentshell', 'abyssshell',
  'leafkit', 'grovefox', 'sylvanfox',
]

/**
 * 在场景 preload 阶段加载立绘；贴图 key 与程序绘制版一致（spr-物种id / spr-物种id-shiny）
 * @author zjh
 * @date 2026-10-14
 */
export function preloadCreatureArt(scene: Phaser.Scene): void {
  for (const id of ART_SPECIES) {
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
