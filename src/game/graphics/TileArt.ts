/**
 * 地图块贴图（32×32）：草地、小路、墙、水、地板、草丛、传送点、山道岩块与灰烬草
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { ensure } from './textureUtil'

/**
 * 生成全部地图块纹理
 * @author zjh
 * @date 2026-10-14
 */
export function paintTiles(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void {
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
