/**
 * 可爱像素风占位贴图（运行时生成，无外部素材）
 * 软圆轮廓、大头/大眼、粉彩偏暖亮色；块面约 16/32 可读。
 * 具体绘制分布在：TileArt（地图块）、CritterArt + CritterPalettes（伙伴与异色）、ObjectArt（人物与物件）。
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { paintCreature } from './CritterArt'
import { CRITTERS, shinyPalette } from './CritterPalettes'
import { paintObjects } from './ObjectArt'
import { paintTiles } from './TileArt'

/**
 * 在纹理管理器中注册可爱像素风基础贴图
 * @author zjh
 * @date 2026-10-14
 */
export function registerPlaceholderTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false)

  paintTiles(scene, g)
  for (const [id, palette] of Object.entries(CRITTERS)) {
    paintCreature(scene, g, `spr-${id}`, palette, false)
    paintCreature(scene, g, `spr-${id}-shiny`, shinyPalette(palette), true)
  }
  paintObjects(scene, g)

  g.destroy()
}
