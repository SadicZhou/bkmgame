/**
 * 地图块贴图入口（32×32 像素画，逐像素绘制）：
 * - tiles/GroundTiles：草地 / 小路 / 山道 / 木地板 / 门
 * - tiles/TerrainTiles：树林 / 山崖 / 巨石 / 木墙 / 岸线
 * - tiles/AnimatedTiles：水面 / 高草 / 灰烬草 / 传送点（多帧动画）
 * 图块选用规则（按地图换墙、按坐标挑变体）见 ui/MapRenderer。
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { paintAnimatedTiles } from './tiles/AnimatedTiles'
import { paintGroundTiles } from './tiles/GroundTiles'
import { paintTerrainTiles } from './tiles/TerrainTiles'

/**
 * 生成全部地图块纹理
 * @author zjh
 * @date 2026-10-14
 */
export function paintTiles(scene: Phaser.Scene): void {
  paintGroundTiles(scene)
  paintTerrainTiles(scene)
  paintAnimatedTiles(scene)
}
