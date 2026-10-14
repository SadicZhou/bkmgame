/**
 * 焰迹旅人 · Embertrail 入口
 * @author zjh
 * @date 2026-10-14
 */

import './style.css'
import Phaser from 'phaser'
import { BootScene } from './game/scenes/BootScene'
import { TitleScene } from './game/scenes/TitleScene'
import { StarterScene } from './game/scenes/StarterScene'
import { WorldScene } from './game/scenes/WorldScene'
import { BattleScene } from './game/scenes/BattleScene'
import { EndingScene } from './game/scenes/EndingScene'

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
  scene: [BootScene, TitleScene, StarterScene, WorldScene, BattleScene, EndingScene],
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

const game = new Phaser.Game(config)

// 仅开发模式暴露调试句柄，便于自动化自测；生产构建会被移除
if (import.meta.env.DEV) {
  void import('./game/state/GameState').then(({ GameState }) => {
    Object.assign(window, { __game: game, __GS: GameState })
  })
}
