/**
 * 可爱像素风占位贴图（运行时生成，无外部素材）
 * 软圆轮廓、大头/大眼、粉彩偏暖亮色；块面约 16/32 可读。
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'

/**
 * 在纹理管理器中注册可爱像素风基础贴图
 * @author zjh
 * @date 2026-10-14
 */
export function registerPlaceholderTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false)

  paintTile(scene, g, 'tile-grass', 0x7ecf8a, 0x9be0a4)
  paintTile(scene, g, 'tile-path', 0xe8d4a8, 0xf3e6c4)
  paintTile(scene, g, 'tile-wall', 0x8b7355, 0xa89070)
  paintTile(scene, g, 'tile-water', 0x7ec8e8, 0xb8e4f8)
  paintTile(scene, g, 'tile-floor', 0xd4b896, 0xe8d4b0)
  paintTallGrass(scene, g)
  paintTile(scene, g, 'tile-door', 0xc4896a, 0xe0a888)
  paintWarp(scene, g)

  paintCreature(scene, g, 'spr-flarehorn', {
    body: 0xff8f6b,
    belly: 0xffd4a8,
    accent: 0xffc857,
    ear: 0xffb08a,
    kind: 'bunny',
  })
  paintCreature(scene, g, 'spr-tideback', {
    body: 0x6eb8e8,
    belly: 0xc8eef8,
    accent: 0xa8e6ff,
    ear: 0x8fd0f0,
    kind: 'turtle',
  })
  paintCreature(scene, g, 'spr-leafkit', {
    body: 0x7bc96b,
    belly: 0xd4f0a8,
    accent: 0xc8f26b,
    ear: 0x9ed88a,
    kind: 'fox',
  })
  paintCreature(scene, g, 'spr-rockmite', {
    body: 0xc4a484,
    belly: 0xe8d8c8,
    accent: 0xd7ccc8,
    ear: 0xb09070,
    kind: 'bug',
  })

  paintPlayer(scene, g)
  paintNpc(scene, g)

  g.destroy()
}

function ensure(scene: Phaser.Scene, key: string, draw: () => void): void {
  if (scene.textures.exists(key)) return
  draw()
}

function paintTile(
  scene: Phaser.Scene,
  g: Phaser.GameObjects.Graphics,
  key: string,
  base: number,
  highlight: number,
): void {
  ensure(scene, key, () => {
    g.clear()
    g.fillStyle(base, 1)
    g.fillRoundedRect(0, 0, 32, 32, 4)
    g.fillStyle(highlight, 0.55)
    g.fillRoundedRect(2, 2, 28, 10, 3)
    g.generateTexture(key, 32, 32)
  })
}

function paintTallGrass(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void {
  ensure(scene, 'tile-tall-mark', () => {
    g.clear()
    g.fillStyle(0x5bb86a, 1)
    g.fillRoundedRect(0, 0, 32, 32, 4)
    g.fillStyle(0x8fd99a, 1)
    for (let i = 0; i < 6; i++) {
      const x = 3 + i * 5
      g.fillRoundedRect(x, 6 + (i % 2) * 3, 3, 18, 2)
    }
    g.fillStyle(0xffb7c5, 0.9)
    g.fillCircle(10, 10, 2)
    g.fillCircle(22, 14, 2)
    g.generateTexture('tile-tall-mark', 32, 32)
  })
}

function paintWarp(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void {
  ensure(scene, 'tile-warp', () => {
    g.clear()
    g.fillStyle(0xa8d8ff, 1)
    g.fillRoundedRect(0, 0, 32, 32, 6)
    g.fillStyle(0xffffff, 0.7)
    g.fillCircle(16, 16, 8)
    g.fillStyle(0x7ec8ff, 1)
    g.fillCircle(16, 16, 4)
    g.generateTexture('tile-warp', 32, 32)
  })
}

interface CritterPalette {
  body: number
  belly: number
  accent: number
  ear: number
  kind: 'bunny' | 'turtle' | 'fox' | 'bug'
}

/**
 * 大头大眼的可爱生物剪影（48×48）
 * @author zjh
 * @date 2026-10-14
 */
function paintCreature(
  scene: Phaser.Scene,
  g: Phaser.GameObjects.Graphics,
  key: string,
  p: CritterPalette,
): void {
  ensure(scene, key, () => {
    g.clear()
    if (p.kind === 'bunny') {
      // 长耳
      g.fillStyle(p.ear, 1)
      g.fillRoundedRect(12, 2, 8, 16, 4)
      g.fillRoundedRect(28, 2, 8, 16, 4)
      g.fillStyle(0xffd6e0, 1)
      g.fillRoundedRect(14, 6, 4, 8, 2)
      g.fillRoundedRect(30, 6, 4, 8, 2)
      // 头身
      g.fillStyle(p.body, 1)
      g.fillCircle(24, 26, 16)
      g.fillStyle(p.belly, 1)
      g.fillCircle(24, 30, 9)
      g.fillStyle(p.accent, 1)
      g.fillCircle(24, 18, 3)
    } else if (p.kind === 'turtle') {
      g.fillStyle(p.body, 1)
      g.fillEllipse(24, 30, 34, 22)
      g.fillStyle(p.accent, 1)
      g.fillEllipse(24, 28, 20, 12)
      g.fillStyle(p.body, 1)
      g.fillCircle(24, 16, 10)
      g.fillStyle(p.belly, 1)
      g.fillCircle(24, 18, 5)
    } else if (p.kind === 'fox') {
      g.fillStyle(p.ear, 1)
      g.fillTriangle(14, 14, 10, 2, 22, 10)
      g.fillTriangle(34, 14, 38, 2, 26, 10)
      g.fillStyle(p.body, 1)
      g.fillCircle(24, 26, 15)
      g.fillStyle(p.belly, 1)
      g.fillCircle(24, 30, 8)
      g.fillStyle(p.accent, 1)
      g.fillCircle(24, 34, 3)
    } else {
      // 岩甲虫：圆壳 + 小头
      g.fillStyle(p.body, 1)
      g.fillEllipse(24, 28, 32, 22)
      g.fillStyle(p.accent, 1)
      g.fillCircle(16, 26, 5)
      g.fillCircle(32, 26, 5)
      g.fillStyle(p.belly, 1)
      g.fillCircle(24, 16, 9)
      g.fillStyle(p.ear, 1)
      g.fillRect(10, 12, 3, 6)
      g.fillRect(35, 12, 3, 6)
    }

    // 统一大眼睛
    drawCuteEyes(g, 24, p.kind === 'turtle' ? 14 : p.kind === 'bug' ? 14 : 24)
    g.generateTexture(key, 48, 48)
  })
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

function paintPlayer(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void {
  ensure(scene, 'spr-player', () => {
    g.clear()
    // 身体（圆润斗篷）
    g.fillStyle(0x5bb8a8, 1)
    g.fillRoundedRect(8, 16, 16, 14, 6)
    // 头
    g.fillStyle(0xffe0bd, 1)
    g.fillCircle(16, 12, 8)
    // 刘海帽
    g.fillStyle(0xffb347, 1)
    g.fillEllipse(16, 7, 18, 10)
    g.fillStyle(0xff8c42, 1)
    g.fillRoundedRect(8, 6, 16, 4, 2)
    // 大眼
    g.fillStyle(0xffffff, 1)
    g.fillCircle(13, 13, 3)
    g.fillCircle(19, 13, 3)
    g.fillStyle(0x3a2a2a, 1)
    g.fillCircle(13.5, 13.5, 1.5)
    g.fillCircle(19.5, 13.5, 1.5)
    // 笑嘴
    g.fillStyle(0xe07a7a, 1)
    g.fillRoundedRect(14, 17, 4, 2, 1)
    g.generateTexture('spr-player', 32, 32)
  })
}

function paintNpc(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void {
  ensure(scene, 'spr-npc', () => {
    g.clear()
    g.fillStyle(0xf0a8c8, 1)
    g.fillRoundedRect(8, 16, 16, 14, 6)
    g.fillStyle(0xffe0bd, 1)
    g.fillCircle(16, 12, 8)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(13, 12, 3)
    g.fillCircle(19, 12, 3)
    g.fillStyle(0x3a2a2a, 1)
    g.fillCircle(13.5, 12.5, 1.5)
    g.fillCircle(19.5, 12.5, 1.5)
    g.fillStyle(0xff9bb0, 0.7)
    g.fillCircle(10, 15, 2)
    g.fillCircle(22, 15, 2)
    g.generateTexture('spr-npc', 32, 32)
  })
}
