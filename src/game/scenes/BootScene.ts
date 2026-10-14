/**
 * 启动场景：加载伙伴立绘，再用程序绘制补齐其余贴图后进入标题
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { preloadCreatureArt } from '../graphics/CreatureArt'
import { registerPlaceholderTextures } from '../graphics/PixelFactory'
import { preloadSceneArt } from '../graphics/SceneArt'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  preload(): void {
    // 图片缺失时不阻塞启动，对应物种回退到程序绘制
    this.load.on('loaderror', (file: Phaser.Loader.File) => console.warn(`[Boot] 素材加载失败，回退程序绘制：${file.key}`))
    preloadCreatureArt(this)
    preloadSceneArt(this)
  }

  create(): void {
    registerPlaceholderTextures(this)
    this.scene.start('Title')
  }
}
