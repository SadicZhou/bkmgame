/**
 * 伙伴立绘：大头大眼的可爱生物剪影（48×48），按体型分支绘制
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import type { CritterPalette } from './CritterPalettes'
import { drawSparkle, ensure } from './textureUtil'

/**
 * 绘制一只伙伴并生成纹理
 * @author zjh
 * @date 2026-10-14
 */
export function paintCreature(
  scene: Phaser.Scene,
  g: Phaser.GameObjects.Graphics,
  key: string,
  p: CritterPalette,
  shiny: boolean,
): void {
  ensure(scene, key, () => {
    g.clear()
    let eyeY = 24
    let eyeX = 24
    switch (p.kind) {
      case 'bunny':
        g.fillStyle(p.ear, 1)
        g.fillRoundedRect(12, p.evolved ? 0 : 2, 8, p.evolved ? 18 : 16, 4)
        g.fillRoundedRect(28, p.evolved ? 0 : 2, 8, p.evolved ? 18 : 16, 4)
        g.fillStyle(p.evolved ? 0xffe066 : 0xffd6e0, 1)
        g.fillRoundedRect(14, p.evolved ? 3 : 6, 4, 8, 2)
        g.fillRoundedRect(30, p.evolved ? 3 : 6, 4, 8, 2)
        g.fillStyle(p.body, 1)
        g.fillCircle(24, 26, 16)
        g.fillStyle(p.belly, 1)
        g.fillCircle(24, 30, 9)
        g.fillStyle(p.accent, 1)
        g.fillCircle(24, 18, 3)
        break
      case 'turtle':
        g.fillStyle(p.body, 1)
        g.fillEllipse(24, 30, p.evolved ? 40 : 34, p.evolved ? 26 : 22)
        g.fillStyle(p.accent, 1)
        g.fillEllipse(24, 28, 20, 12)
        if (p.evolved) {
          g.fillStyle(0xffffff, 0.8)
          g.fillCircle(18, 28, 2)
          g.fillCircle(30, 28, 2)
        }
        g.fillStyle(p.body, 1)
        g.fillCircle(24, 16, 10)
        g.fillStyle(p.belly, 1)
        g.fillCircle(24, 18, 5)
        eyeY = 14
        break
      case 'fox':
        g.fillStyle(p.ear, 1)
        g.fillTriangle(14, 14, 10, 2, 22, 10)
        g.fillTriangle(34, 14, 38, 2, 26, 10)
        g.fillStyle(p.body, 1)
        g.fillCircle(24, 26, 15)
        g.fillStyle(p.belly, 1)
        g.fillCircle(24, 30, 8)
        g.fillStyle(p.accent, 1)
        g.fillCircle(24, 34, 3)
        break
      case 'bug':
        g.fillStyle(p.body, 1)
        g.fillEllipse(24, 28, p.evolved ? 38 : 32, p.evolved ? 26 : 22)
        g.fillStyle(p.accent, 1)
        g.fillCircle(16, 26, 5)
        g.fillCircle(32, 26, 5)
        g.fillStyle(p.belly, 1)
        g.fillCircle(24, 16, 9)
        g.fillStyle(p.ear, 1)
        g.fillRect(10, 12, 3, 6)
        g.fillRect(35, 12, 3, 6)
        eyeY = 14
        break
      case 'moth':
        // 两对圆翅
        g.fillStyle(p.ear, 1)
        g.fillEllipse(11, 18, 18, 22)
        g.fillEllipse(37, 18, 18, 22)
        g.fillStyle(p.accent, 1)
        g.fillCircle(10, 16, 4)
        g.fillCircle(38, 16, 4)
        g.fillStyle(p.body, 1)
        g.fillEllipse(24, 28, 18, 26)
        g.fillStyle(p.belly, 1)
        g.fillCircle(24, 32, 5)
        // 触角
        g.fillStyle(p.ear, 1)
        g.fillRect(18, 6, 2, 8)
        g.fillRect(28, 6, 2, 8)
        g.fillStyle(p.accent, 1)
        g.fillCircle(19, 6, 2)
        g.fillCircle(29, 6, 2)
        eyeY = 22
        break
      case 'newt':
        // 长尾 + 侧鳃
        g.fillStyle(p.body, 1)
        g.fillEllipse(36, 36, 20, 8)
        g.fillCircle(22, 26, 14)
        g.fillStyle(p.ear, 1)
        g.fillTriangle(8, 20, 4, 14, 10, 26)
        g.fillTriangle(36, 20, 40, 14, 34, 26)
        g.fillStyle(p.belly, 1)
        g.fillCircle(22, 30, 7)
        eyeY = 22
        break
      case 'lion':
        // 熔岩鬃毛
        g.fillStyle(p.ear, 1)
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2
          g.fillCircle(24 + Math.cos(a) * 15, 24 + Math.sin(a) * 15, 7)
        }
        g.fillStyle(p.accent, 1)
        g.fillCircle(24, 24, 17)
        g.fillStyle(p.body, 1)
        g.fillCircle(24, 26, 14)
        g.fillStyle(p.belly, 1)
        g.fillCircle(24, 31, 6)
        eyeY = 23
        break
      default:
        eyeY = paintNewKinds(g, p)
        if (p.kind === 'marten') eyeX = 19
        if (p.kind === 'lizard') eyeX = 22
        break
    }

    if (p.evolved && !p.crown && !['bunny', 'lion', 'mushroom', 'dog', 'bird', 'deer'].includes(p.kind) && !p.extra) {
      // 进化冠饰
      g.fillStyle(0xffe066, 1)
      g.fillTriangle(18, 6, 21, 0, 24, 6)
      g.fillTriangle(24, 6, 27, 0, 30, 6)
    }
    if (p.crown) {
      // 三阶大王冠
      g.fillStyle(0xffd040, 1)
      g.fillRect(15, 4, 18, 4)
      g.fillTriangle(15, 4, 17, -2, 20, 4)
      g.fillTriangle(21, 4, 24, -3, 27, 4)
      g.fillTriangle(28, 4, 31, -2, 33, 4)
      g.fillStyle(0xff5080, 1)
      g.fillCircle(24, 5, 1.5)
    }
    if (p.extra === 'crystal') {
      g.fillStyle(0xffd080, 1)
      g.fillTriangle(12, 26, 15, 16, 18, 26)
      g.fillTriangle(30, 26, 33, 14, 36, 26)
      g.fillStyle(0xff8040, 1)
      g.fillTriangle(21, 24, 24, 17, 27, 24)
    }

    drawCuteEyes(g, p.kind === 'newt' ? 22 : eyeX, eyeY)
    if (shiny) drawSparkle(g, 42, 6, 0xfff6a0)
    g.generateTexture(key, 48, 48)
  })
}

/**
 * v3 新增体型：鼠、鸟、菇、犬、蜥、貂、鹿；返回眼睛的 y 坐标
 * @author zjh
 * @date 2026-10-14
 */
function paintNewKinds(g: Phaser.GameObjects.Graphics, p: CritterPalette): number {
  switch (p.kind) {
    case 'mouse':
      if (p.evolved) {
        g.fillStyle(p.ear, 1)
        g.fillEllipse(39, 26, 16, 26)
        g.fillStyle(p.belly, 1)
        g.fillEllipse(40, 22, 8, 12)
      }
      g.fillStyle(p.ear, 1)
      g.fillCircle(12, 11, 8)
      g.fillCircle(36, 11, 8)
      g.fillStyle(p.accent, 1)
      g.fillCircle(12, 11, 4)
      g.fillCircle(36, 11, 4)
      g.fillStyle(p.body, 1)
      g.fillCircle(24, 28, 15)
      g.fillStyle(p.belly, 1)
      g.fillCircle(24, 33, 8)
      g.fillStyle(p.accent, 1)
      g.fillCircle(24, 29, 2)
      return 25
    case 'bird':
      g.fillStyle(p.ear, 1)
      g.fillTriangle(6, 22, p.evolved ? 0 : 4, p.evolved ? 40 : 34, 18, 32)
      g.fillTriangle(42, 22, p.evolved ? 48 : 44, p.evolved ? 40 : 34, 30, 32)
      g.fillStyle(p.body, 1)
      g.fillEllipse(24, 28, 26, 26)
      g.fillStyle(p.belly, 1)
      g.fillEllipse(24, 33, 14, 14)
      g.fillStyle(p.ear, 1)
      g.fillTriangle(20, 16, 24, p.evolved ? 2 : 8, 28, 16)
      g.fillStyle(p.accent, 1)
      g.fillTriangle(22, 28, 24, 32, 26, 28)
      return 23
    case 'mushroom':
      g.fillStyle(p.body, 1)
      g.fillRoundedRect(14, 20, 20, 24, 8)
      g.fillStyle(p.accent, 1)
      g.fillEllipse(24, 16, p.evolved ? 46 : 38, p.evolved ? 24 : 20)
      g.fillStyle(0xffffff, 0.9)
      g.fillCircle(15, 13, 3)
      g.fillCircle(27, 9, 2.5)
      g.fillCircle(33, 16, 2)
      if (p.evolved) g.fillCircle(8, 17, 2)
      return 30
    case 'dog':
      g.fillStyle(p.ear, 1)
      g.fillEllipse(10, 22, 10, 18)
      g.fillEllipse(38, 22, 10, 18)
      g.fillStyle(p.body, 1)
      g.fillCircle(24, 25, 15)
      g.fillStyle(p.belly, 1)
      g.fillEllipse(24, 33, 14, 9)
      g.fillStyle(0x3a2a2a, 1)
      g.fillCircle(24, 30, 2)
      if (p.evolved) {
        g.fillStyle(p.accent, 1)
        g.fillTriangle(14, 12, 17, 2, 20, 12)
        g.fillTriangle(21, 10, 24, 0, 27, 10)
        g.fillTriangle(28, 12, 31, 2, 34, 12)
      }
      return 23
    case 'lizard':
      g.fillStyle(p.body, 1)
      g.fillEllipse(36, 36, 22, 8)
      g.fillCircle(22, 26, 14)
      g.fillStyle(p.accent, 1)
      g.fillCircle(45, 33, 4)
      g.fillStyle(0xfff6c0, 1)
      g.fillCircle(45, 32, 2)
      g.fillStyle(p.belly, 1)
      g.fillCircle(22, 31, 7)
      if (p.evolved) {
        g.fillStyle(p.accent, 0.9)
        g.fillCircle(32, 18, 6)
        g.fillStyle(0xfff6c0, 1)
        g.fillCircle(32, 18, 3)
      }
      return 22
    case 'marten':
      g.fillStyle(p.ear, 1)
      g.fillEllipse(40, 22, 10, 22)
      g.fillStyle(p.body, 1)
      g.fillEllipse(28, 33, 32, 16)
      g.fillCircle(19, 22, 12)
      g.fillTriangle(9, 14, 10, 4, 16, 11)
      g.fillTriangle(29, 14, 28, 4, 22, 11)
      g.fillStyle(p.belly, 1)
      g.fillEllipse(19, 28, 12, 7)
      drawSparkle(g, 19, 12, p.accent)
      drawSparkle(g, 34, 30, p.accent)
      drawSparkle(g, 40, 14, p.accent)
      return 21
    case 'bear':
      g.fillStyle(p.ear, 1)
      g.fillCircle(16, 14, 6)
      g.fillCircle(34, 14, 6)
      g.fillStyle(p.body, 1)
      g.fillCircle(16, 14, 4)
      g.fillCircle(34, 14, 4)
      g.fillEllipse(25, 32, 28, 22)
      g.fillCircle(25, 20, 12)
      g.fillStyle(p.belly, 1)
      g.fillEllipse(25, 34, 14, 12)
      g.fillStyle(p.accent, 1)
      g.fillCircle(25, 16, 5)
      g.fillStyle(0xfff6c0, 1)
      g.fillCircle(25, 16, 2)
      return 20
    case 'deer':
      g.fillStyle(p.ear, 1)
      g.fillRect(14, 2, 3, 14)
      g.fillRect(31, 2, 3, 14)
      g.fillRect(9, 6, 8, 3)
      g.fillRect(31, 6, 8, 3)
      g.fillStyle(p.accent, 1)
      g.fillCircle(15, 3, 3)
      g.fillCircle(33, 3, 3)
      g.fillCircle(9, 7, 2.5)
      g.fillCircle(39, 7, 2.5)
      g.fillStyle(p.body, 1)
      g.fillEllipse(11, 19, 10, 6)
      g.fillEllipse(37, 19, 10, 6)
      g.fillCircle(24, 27, 14)
      g.fillStyle(p.belly, 1)
      g.fillEllipse(24, 34, 12, 8)
      return 25
    default:
      return 24
  }
}

function drawCuteEyes(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
  g.fillStyle(0xffffff, 1)
  g.fillCircle(cx - 6, cy, 5)
  g.fillCircle(cx + 6, cy, 5)
  g.fillStyle(0x3a2a2a, 1)
  g.fillCircle(cx - 5, cy + 1, 2.5)
  g.fillCircle(cx + 7, cy + 1, 2.5)
  g.fillStyle(0xffffff, 1)
  g.fillCircle(cx - 6, cy - 1, 1)
  g.fillCircle(cx + 6, cy - 1, 1)
  // 小腮红
  g.fillStyle(0xff9bb0, 0.55)
  g.fillCircle(cx - 12, cy + 6, 3)
  g.fillCircle(cx + 12, cy + 6, 3)
}
