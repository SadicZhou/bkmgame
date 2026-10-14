/**
 * 粒子特效用的小纹理（运行时生成）：
 * - fx-soft：16px 白色径向柔光（蒸汽、雾团、光晕、萤火）
 * - fx-light：128px 白色径向柔光（夜晚遮罩上擦出光圈）
 * - fx-dot：3px 白色方点（余烬、花粉、沙粒、雪花）
 * - fx-drop：2×10 白色雨丝
 * - fx-ring：12px 白色圆环（雨滴溅开）
 * 粒子颜色统一用 tint 着色。
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'

/** 若纹理不存在则用 Canvas 绘制 */
function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return
  const tex = scene.textures.createCanvas(key, w, h)
  if (!tex) return
  draw(tex.getContext())
  tex.refresh()
}

/**
 * 注册全部特效纹理
 * @author zjh
 * @date 2026-10-14
 */
export function registerFxTextures(scene: Phaser.Scene): void {
  canvasTexture(scene, 'fx-soft', 16, 16, (ctx) => {
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.5, 'rgba(255,255,255,0.55)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 16, 16)
  })
  canvasTexture(scene, 'fx-light', 128, 128, (ctx) => {
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.45, 'rgba(255,255,255,0.85)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 128, 128)
  })
  canvasTexture(scene, 'fx-dot', 3, 3, (ctx) => {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, 3, 3)
  })
  canvasTexture(scene, 'fx-drop', 2, 10, (ctx) => {
    const grad = ctx.createLinearGradient(0, 0, 0, 10)
    grad.addColorStop(0, 'rgba(255,255,255,0)')
    grad.addColorStop(1, 'rgba(255,255,255,0.9)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 2, 10)
  })
  canvasTexture(scene, 'fx-ring', 12, 12, (ctx) => {
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.ellipse(6, 6, 5, 3, 0, 0, Math.PI * 2)
    ctx.stroke()
  })
}
