/**
 * 贴图绘制公用工具：按需生成、闪光、星形顶点
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'

/** 纹理已存在时跳过绘制（场景重启不会重复生成） */
export function ensure(scene: Phaser.Scene, key: string, draw: () => void): void {
  if (scene.textures.exists(key)) return
  draw()
}

/** 四角星闪光 */
export function drawSparkle(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number): void {
  g.fillStyle(color, 1)
  g.fillTriangle(x - 1.5, y, x, y - 5, x + 1.5, y)
  g.fillTriangle(x - 1.5, y, x, y + 5, x + 1.5, y)
  g.fillTriangle(x, y - 1.5, x - 5, y, x, y + 1.5)
  g.fillTriangle(x, y - 1.5, x + 5, y, x, y + 1.5)
}

/** 星形多边形顶点 */
export function starPoints(cx: number, cy: number, outer: number, inner: number, n = 5): Phaser.Math.Vector2[] {
  const pts: Phaser.Math.Vector2[] = []
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2
    pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r))
  }
  return pts
}
