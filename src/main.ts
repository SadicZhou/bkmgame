/**
 * 焰迹旅人 · Embertrail 入口
 * @author zjh
 * @date 2026-10-14
 */

import './style.css'
import Phaser from 'phaser'
import { BootScene } from './game/scenes/BootScene'
import { TitleScene } from './game/scenes/TitleScene'
import { WorldScene } from './game/scenes/WorldScene'
import { BattleScene } from './game/scenes/BattleScene'

const parent = document.querySelector<HTMLDivElement>('#app')
if (!parent) {
  throw new Error('缺少 #app 容器')
}

/**
 * Phaser 游戏配置：适配桌面与基础移动端
 * @author zjh
 * @date 2026-10-14
 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent,
  backgroundColor: '#0c1612',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 640,
    height: 480,
  },
  scene: [BootScene, TitleScene, WorldScene, BattleScene],
  input: {
    keyboard: true,
    mouse: true,
    touch: true,
  },
  render: {
    pixelArt: true,
    antialias: false,
  },
}

// eslint-disable-next-line no-new
new Phaser.Game(config)
