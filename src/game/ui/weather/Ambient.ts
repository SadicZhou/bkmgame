/**
 * 环境点缀（画在夜色之上，夜里也看得见）：
 * - fireflies：夜晚草地 / 小镇的萤火虫，忽明忽暗地缓慢游走
 * - embers：余烬山道常驻的火星，从画面下方飘起（夜里更多更亮）
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import type { FxArea } from './WeatherParticles'

export type AmbientKind = 'fireflies' | 'embers'

/**
 * 生成环境点缀发射器
 * @author zjh
 * @date 2026-10-14
 */
export function buildAmbient(scene: Phaser.Scene, kind: AmbientKind, night: boolean, a: FxArea): Phaser.GameObjects.Particles.ParticleEmitter {
  const glow = (_p: Phaser.GameObjects.Particles.Particle, _k: string, t: number): number =>
    Math.max(0, Math.sin(t * Math.PI * 3)) * Math.sin(t * Math.PI)
  const config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig =
    kind === 'fireflies'
      ? {
          x: { min: 0, max: a.w },
          y: { min: a.h * 0.2, max: a.h },
          lifespan: { min: 4000, max: 7000 },
          speedX: { min: -14, max: 14 },
          speedY: { min: -12, max: 8 },
          scale: { min: 0.55, max: 0.85 },
          alpha: { onEmit: () => 0, onUpdate: glow },
          tint: [0xd8ff80, 0xfff080],
          frequency: 140,
          blendMode: Phaser.BlendModes.ADD,
          advance: 6000,
        }
      : {
          x: { min: 0, max: a.w },
          y: a.h + 6,
          lifespan: { min: 3500, max: 6000 },
          speedY: { min: -30, max: -60 },
          speedX: { min: -12, max: 18 },
          scale: { start: 0.45, end: 0.1 },
          alpha: { start: night ? 1 : 0.7, end: 0 },
          tint: [0xffd070, 0xff9a40, 0xff6a30],
          frequency: night ? 140 : 260,
          blendMode: Phaser.BlendModes.ADD,
          advance: 6000,
        }
  return scene.add.particles(0, 0, 'fx-soft', config).setScrollFactor(0).setDepth(a.depth)
}
