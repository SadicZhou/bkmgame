/**
 * 可爱像素风占位贴图（运行时生成，无外部素材）
 * 软圆轮廓、大头/大眼、粉彩偏暖亮色；块面约 16/32 可读。
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'

type CritterKind = 'bunny' | 'turtle' | 'fox' | 'bug' | 'moth' | 'newt' | 'lion'

interface CritterPalette {
  body: number
  belly: number
  accent: number
  ear: number
  kind: CritterKind
  /** 进化形态：加冠饰 / 纹样 */
  evolved?: boolean
}

/** 各物种配色（贴图 key = spr-物种id） */
const CRITTERS: Record<string, CritterPalette> = {
  flarehorn: { body: 0xff8f6b, belly: 0xffd4a8, accent: 0xffc857, ear: 0xffb08a, kind: 'bunny' },
  blazehorn: { body: 0xff6b4a, belly: 0xffd9a0, accent: 0xffe066, ear: 0xff9060, kind: 'bunny', evolved: true },
  tideback: { body: 0x6eb8e8, belly: 0xc8eef8, accent: 0xa8e6ff, ear: 0x8fd0f0, kind: 'turtle' },
  torrentshell: { body: 0x4a90d0, belly: 0xd8f4ff, accent: 0xc8f0ff, ear: 0x70b0e8, kind: 'turtle', evolved: true },
  leafkit: { body: 0x7bc96b, belly: 0xd4f0a8, accent: 0xc8f26b, ear: 0x9ed88a, kind: 'fox' },
  grovefox: { body: 0x4fae5a, belly: 0xe0f8b8, accent: 0xf2e86b, ear: 0x78c870, kind: 'fox', evolved: true },
  rockmite: { body: 0xc4a484, belly: 0xe8d8c8, accent: 0xd7ccc8, ear: 0xb09070, kind: 'bug' },
  bouldermite: { body: 0x9c7c5c, belly: 0xf0e4d8, accent: 0xe8dcd0, ear: 0x806040, kind: 'bug', evolved: true },
  cindermoth: { body: 0xe8a05a, belly: 0xfff0c8, accent: 0xfff0a0, ear: 0xd08040, kind: 'moth' },
  mistnewt: { body: 0x8fd0c8, belly: 0xe8fff8, accent: 0xe0fff8, ear: 0x70b8b0, kind: 'newt' },
  magmane: { body: 0xd9483b, belly: 0xffd0a0, accent: 0xffb030, ear: 0xff7a30, kind: 'lion', evolved: true },
}

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
  paintRock(scene, g)
  paintAsh(scene, g)
  paintTile(scene, g, 'tile-mountain-path', 0xb08a6a, 0xc8a080)

  for (const [id, palette] of Object.entries(CRITTERS)) {
    paintCreature(scene, g, `spr-${id}`, palette)
  }

  paintPlayer(scene, g)
  paintNpc(scene, g)
  paintBerry(scene, g)

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

/** 山道岩块（不可通行） */
function paintRock(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void {
  ensure(scene, 'tile-rock', () => {
    g.clear()
    g.fillStyle(0xb08a6a, 1)
    g.fillRect(0, 0, 32, 32)
    g.fillStyle(0x7a5a48, 1)
    g.fillRoundedRect(3, 5, 26, 24, 9)
    g.fillStyle(0x9a7660, 1)
    g.fillRoundedRect(6, 7, 16, 9, 5)
    g.fillStyle(0x5e4436, 0.6)
    g.fillRoundedRect(16, 18, 9, 4, 2)
    g.generateTexture('tile-rock', 32, 32)
  })
}

/** 灰烬草（山道遇敌草丛） */
function paintAsh(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void {
  ensure(scene, 'tile-ash', () => {
    g.clear()
    g.fillStyle(0x8a6a58, 1)
    g.fillRoundedRect(0, 0, 32, 32, 4)
    g.fillStyle(0xc0806a, 1)
    for (let i = 0; i < 6; i++) {
      const x = 3 + i * 5
      g.fillRoundedRect(x, 7 + (i % 2) * 3, 3, 17, 2)
    }
    g.fillStyle(0xffb050, 0.95)
    g.fillCircle(9, 9, 2)
    g.fillCircle(23, 13, 2)
    g.fillCircle(16, 6, 1.5)
    g.generateTexture('tile-ash', 32, 32)
  })
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
    let eyeY = 24
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
    }

    if (p.evolved && p.kind !== 'bunny' && p.kind !== 'lion') {
      // 进化冠饰
      g.fillStyle(0xffe066, 1)
      g.fillTriangle(18, 6, 21, 0, 24, 6)
      g.fillTriangle(24, 6, 27, 0, 30, 6)
    }

    drawCuteEyes(g, p.kind === 'newt' ? 22 : 24, eyeY)
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

/**
 * 玩家四方向贴图：spr-player-down / up / left / right
 * @author zjh
 * @date 2026-10-14
 */
function paintPlayer(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void {
  const dirs = ['down', 'up', 'left', 'right'] as const
  for (const dir of dirs) {
    ensure(scene, `spr-player-${dir}`, () => {
      g.clear()
      // 身体（圆润斗篷）
      g.fillStyle(0x5bb8a8, 1)
      g.fillRoundedRect(8, 16, 16, 14, 6)
      // 头
      g.fillStyle(0xffe0bd, 1)
      g.fillCircle(16, 12, 8)
      // 帽子
      g.fillStyle(0xffb347, 1)
      g.fillEllipse(16, 7, 18, 10)
      g.fillStyle(0xff8c42, 1)
      g.fillRoundedRect(8, 6, 16, 4, 2)

      if (dir === 'up') {
        // 背面：帽子盖住后脑 + 背包
        g.fillStyle(0xffb347, 1)
        g.fillEllipse(16, 11, 18, 12)
        g.fillStyle(0xc0704a, 1)
        g.fillRoundedRect(10, 18, 12, 9, 3)
      } else {
        const off = dir === 'left' ? -3 : dir === 'right' ? 3 : 0
        g.fillStyle(0xffffff, 1)
        if (dir !== 'right') g.fillCircle(13 + off, 13, 3)
        if (dir !== 'left') g.fillCircle(19 + off, 13, 3)
        g.fillStyle(0x3a2a2a, 1)
        if (dir !== 'right') g.fillCircle(13.5 + off, 13.5, 1.5)
        if (dir !== 'left') g.fillCircle(19.5 + off, 13.5, 1.5)
        g.fillStyle(0xe07a7a, 1)
        g.fillRoundedRect(14 + off, 17, 4, 2, 1)
      }
      g.generateTexture(`spr-player-${dir}`, 32, 32)
    })
  }
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

/** 安抚果（战斗抛掷动画用） */
function paintBerry(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void {
  ensure(scene, 'spr-berry', () => {
    g.clear()
    g.fillStyle(0xff7a9a, 1)
    g.fillCircle(8, 9, 6)
    g.fillStyle(0xffffff, 0.7)
    g.fillCircle(6, 7, 2)
    g.fillStyle(0x6ac46a, 1)
    g.fillEllipse(10, 3, 6, 3)
    g.generateTexture('spr-berry', 16, 16)
  })
}
