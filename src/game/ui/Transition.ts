/**
 * 场景过渡：淡入淡出、进入战斗闪屏
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'

const FADE_MS = 260

/** 场景创建时淡入 */
export function fadeIn(scene: Phaser.Scene, ms = FADE_MS): void {
  scene.cameras.main.fadeIn(ms, 0, 0, 0)
}

/**
 * 淡出后切换到目标场景
 * @author zjh
 * @date 2026-10-14
 */
export function fadeToScene(scene: Phaser.Scene, key: string, ms = FADE_MS, data?: object): void {
  const cam = scene.cameras.main
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key, data))
  cam.fadeOut(ms, 0, 0, 0)
}

/**
 * 遇敌闪屏：白闪两下 + 镜头放大淡出，再进入战斗
 * @author zjh
 * @date 2026-10-14
 */
export function battleTransition(scene: Phaser.Scene, key = 'Battle'): void {
  const cam = scene.cameras.main
  cam.flash(120, 255, 255, 255)
  scene.time.delayedCall(180, () => cam.flash(120, 255, 255, 255))
  scene.time.delayedCall(360, () => {
    scene.tweens.add({ targets: cam, zoom: 1.6, duration: 380, ease: 'Quad.easeIn' })
    fadeToScene(scene, key, 380)
  })
}
