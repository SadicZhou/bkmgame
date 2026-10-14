/**
 * 可爱像素风占位贴图（运行时生成，无外部素材）
 * 软圆轮廓、大头/大眼、粉彩偏暖亮色；块面约 16/32 可读。
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'

type CritterKind =
  | 'bunny'
  | 'turtle'
  | 'fox'
  | 'bug'
  | 'moth'
  | 'newt'
  | 'lion'
  | 'mouse'
  | 'bird'
  | 'mushroom'
  | 'dog'
  | 'lizard'
  | 'marten'
  | 'deer'

interface CritterPalette {
  body: number
  belly: number
  accent: number
  ear: number
  kind: CritterKind
  /** 进化形态：加冠饰 / 纹样 */
  evolved?: boolean
  /** 三阶形态：大王冠 */
  crown?: boolean
  /** 额外装饰：晶簇 / 星纹 */
  extra?: 'crystal' | 'star'
}

/** 各物种配色（贴图 key = spr-物种id；异色为 spr-物种id-shiny） */
const CRITTERS: Record<string, CritterPalette> = {
  flarehorn: { body: 0xff8f6b, belly: 0xffd4a8, accent: 0xffc857, ear: 0xffb08a, kind: 'bunny' },
  blazehorn: { body: 0xff6b4a, belly: 0xffd9a0, accent: 0xffe066, ear: 0xff9060, kind: 'bunny', evolved: true },
  pyrecrown: { body: 0xff5a3a, belly: 0xffe0a0, accent: 0xffd040, ear: 0xff8050, kind: 'bunny', evolved: true, crown: true },
  tideback: { body: 0x6eb8e8, belly: 0xc8eef8, accent: 0xa8e6ff, ear: 0x8fd0f0, kind: 'turtle' },
  torrentshell: { body: 0x4a90d0, belly: 0xd8f4ff, accent: 0xc8f0ff, ear: 0x70b0e8, kind: 'turtle', evolved: true },
  abyssshell: { body: 0x3a70b8, belly: 0xd0f0ff, accent: 0x90e0ff, ear: 0x5090d0, kind: 'turtle', evolved: true, crown: true },
  leafkit: { body: 0x7bc96b, belly: 0xd4f0a8, accent: 0xc8f26b, ear: 0x9ed88a, kind: 'fox' },
  grovefox: { body: 0x4fae5a, belly: 0xe0f8b8, accent: 0xf2e86b, ear: 0x78c870, kind: 'fox', evolved: true },
  sylvanfox: { body: 0x3e9a50, belly: 0xe8ffc0, accent: 0xffa0c0, ear: 0x60b868, kind: 'fox', evolved: true, crown: true },
  rockmite: { body: 0xc4a484, belly: 0xe8d8c8, accent: 0xd7ccc8, ear: 0xb09070, kind: 'bug' },
  bouldermite: { body: 0x9c7c5c, belly: 0xf0e4d8, accent: 0xe8dcd0, ear: 0x806040, kind: 'bug', evolved: true },
  cindermoth: { body: 0xe8a05a, belly: 0xfff0c8, accent: 0xfff0a0, ear: 0xd08040, kind: 'moth' },
  emberwing: { body: 0xff8048, belly: 0xfff0c0, accent: 0xffe060, ear: 0xff6030, kind: 'moth', evolved: true },
  mistnewt: { body: 0x8fd0c8, belly: 0xe8fff8, accent: 0xe0fff8, ear: 0x70b8b0, kind: 'newt' },
  wavefin: { body: 0x60b8e0, belly: 0xe8fbff, accent: 0xa0f0ff, ear: 0x4898c8, kind: 'newt', evolved: true },
  magmane: { body: 0xd9483b, belly: 0xffd0a0, accent: 0xffb030, ear: 0xff7a30, kind: 'lion', evolved: true },
  puffmouse: { body: 0xe8d8c0, belly: 0xfff4e0, accent: 0xffb7c5, ear: 0xd8c0a0, kind: 'mouse' },
  bushtail: { body: 0xd8b890, belly: 0xfff0d8, accent: 0xffd0a0, ear: 0xc8a070, kind: 'mouse', evolved: true },
  wickling: { body: 0xf0a860, belly: 0xffe8c0, accent: 0xffe060, ear: 0xd08848, kind: 'lizard' },
  lanternlizard: { body: 0xe08040, belly: 0xfff0d0, accent: 0xfff080, ear: 0xc06830, kind: 'lizard', evolved: true },
  sproutcap: { body: 0xf0e8d0, belly: 0xfff8e8, accent: 0x7bc96b, ear: 0x5aa850, kind: 'mushroom' },
  parashroom: { body: 0xe8e0c8, belly: 0xfff8e8, accent: 0x4fae5a, ear: 0x3a9048, kind: 'mushroom', evolved: true },
  pebblepup: { body: 0xb8a088, belly: 0xe8dccc, accent: 0x8a7060, ear: 0x9a8068, kind: 'dog' },
  cragdog: { body: 0x9a8068, belly: 0xe0d0c0, accent: 0x6a5848, ear: 0x7a6450, kind: 'dog', evolved: true },
  skylark: { body: 0xa8d8f0, belly: 0xf0faff, accent: 0xffd070, ear: 0x88c0e0, kind: 'bird' },
  skyfinch: { body: 0x78b8e8, belly: 0xffffff, accent: 0xffc040, ear: 0x5898d0, kind: 'bird', evolved: true },
  starmarten: { body: 0x5a5ab0, belly: 0xd8d8ff, accent: 0xfff080, ear: 0x7a7ad0, kind: 'marten', extra: 'star' },
  bloomdeer: { body: 0xd8b090, belly: 0xfff0e0, accent: 0xff9ac0, ear: 0x7bc96b, kind: 'deer' },
  magmashell: { body: 0x8a3a30, belly: 0xffc080, accent: 0xff6030, ear: 0xc05030, kind: 'turtle', evolved: true, extra: 'crystal' },
}

/**
 * 异色调色：色相整体偏移
 * @author zjh
 * @date 2026-10-14
 */
function shiftHue(color: number, shift: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color)
  const hsv = Phaser.Display.Color.RGBToHSV(c.red, c.green, c.blue)
  const out = Phaser.Display.Color.HSVToRGB((hsv.h + shift) % 1, hsv.s, hsv.v) as Phaser.Display.Color
  return out.color
}

function shinyPalette(p: CritterPalette): CritterPalette {
  const s = 0.42
  return { ...p, body: shiftHue(p.body, s), belly: shiftHue(p.belly, s), accent: shiftHue(p.accent, s), ear: shiftHue(p.ear, s) }
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
    paintCreature(scene, g, `spr-${id}`, palette, false)
    paintCreature(scene, g, `spr-${id}-shiny`, shinyPalette(palette), true)
  }

  paintPlayer(scene, g)
  paintNpc(scene, g)
  paintBerry(scene, g)
  paintBoard(scene, g)
  paintEventObjects(scene, g)

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

/** 四角星闪光 */
function drawSparkle(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number): void {
  g.fillStyle(color, 1)
  g.fillTriangle(x - 1.5, y, x, y - 5, x + 1.5, y)
  g.fillTriangle(x - 1.5, y, x, y + 5, x + 1.5, y)
  g.fillTriangle(x, y - 1.5, x - 5, y, x, y + 1.5)
  g.fillTriangle(x, y - 1.5, x + 5, y, x, y + 1.5)
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

/** 旅人告示板 */
function paintBoard(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void {
  ensure(scene, 'spr-board', () => {
    g.clear()
    g.fillStyle(0x7a5030, 1)
    g.fillRect(7, 18, 3, 13)
    g.fillRect(22, 18, 3, 13)
    g.fillStyle(0xb08050, 1)
    g.fillRoundedRect(2, 4, 28, 18, 3)
    g.fillStyle(0xfff6e0, 1)
    g.fillRect(5, 7, 9, 7)
    g.fillRect(17, 8, 10, 6)
    g.fillStyle(0xff8f6b, 1)
    g.fillCircle(9, 7, 1.5)
    g.fillCircle(22, 8, 1.5)
    g.generateTexture('spr-board', 32, 32)
  })
}

/** 星形多边形顶点 */
function starPoints(cx: number, cy: number, outer: number, inner: number, n = 5): Phaser.Math.Vector2[] {
  const pts: Phaser.Math.Vector2[] = []
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2
    pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r))
  }
  return pts
}

/**
 * 异象 / 小事件物件：星辰碎片、花瓣足迹、熔晶、心火结晶
 * @author zjh
 * @date 2026-10-14
 */
function paintEventObjects(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void {
  ensure(scene, 'obj-star', () => {
    g.clear()
    g.fillStyle(0xfff080, 1)
    g.fillPoints(starPoints(10, 10, 9, 4), true)
    g.fillStyle(0xffffff, 0.9)
    g.fillCircle(10, 10, 2)
    g.generateTexture('obj-star', 20, 20)
  })
  ensure(scene, 'obj-petal', () => {
    g.clear()
    g.fillStyle(0xff9ac0, 1)
    g.fillEllipse(6, 10, 8, 12)
    g.fillEllipse(14, 10, 8, 12)
    g.fillStyle(0xffe0ee, 1)
    g.fillEllipse(10, 6, 6, 8)
    g.generateTexture('obj-petal', 20, 20)
  })
  ensure(scene, 'obj-lava', () => {
    g.clear()
    g.fillStyle(0xff6030, 1)
    g.fillTriangle(10, 1, 3, 10, 17, 10)
    g.fillTriangle(3, 10, 10, 19, 17, 10)
    g.fillStyle(0xffd080, 1)
    g.fillTriangle(10, 4, 7, 10, 13, 10)
    g.generateTexture('obj-lava', 20, 20)
  })
  ensure(scene, 'obj-crystal', () => {
    g.clear()
    g.fillStyle(0xffb040, 1)
    g.fillTriangle(10, 0, 4, 9, 16, 9)
    g.fillTriangle(4, 9, 10, 20, 16, 9)
    g.fillStyle(0xfff0b0, 1)
    g.fillTriangle(10, 3, 7, 9, 13, 9)
    g.generateTexture('obj-crystal', 20, 20)
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
