/**
 * 启动场景：注册占位贴图后进入标题
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { registerPlaceholderTextures } from '../graphics/PixelFactory'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create(): void {
    registerPlaceholderTextures(this)
    this.scene.start('Title')
  }
}
