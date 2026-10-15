/**
 * 骑乘与跟随：上下坐骑、骑乘外观 / 动画 / 速度、通行与遇敌修正、夜间光照，并驱动跟随伙伴。
 * 规则见 systems/Ride.ts；状态存在存档旗标里（state/Companions.ts），切图 / 战斗后自动恢复。
 * @author zjh
 * @date 2026-10-15
 */

import Phaser from 'phaser'
import { battleName } from '../../data/creatures'
import { decorBlocks } from '../../data/decor'
import { isSolid, resolveTile, type HasFlag, type MapDef, type TileKind } from '../../data/maps'
import { MOUNTS, MOUNT_SKILLS, mountSheet, type MountSkill } from '../../data/mounts'
import { MOUNT_FRAME, anchorFeet, idleFrame, playerSheet, rideAnim } from '../../graphics/CharArt'
import { Companions } from '../../state/Companions'
import type { Facing } from '../../state/GameState'
import { Sfx } from '../../systems/AudioBeeps'
import { canDismountOn, passable, rideBlock, rideEncounterSource, rideMoveMs, skillActive } from '../../systems/Ride'
import { Follower } from './Follower'

/** 步行时的角色帧高 */
const WALK_FRAME_H = 40
/** 夜间提灯半径：步行 / 焰步坐骑 */
const LIGHT_WALK = 84
const LIGHT_BLAZE = 124
/** 同一条「过不去」提示的冷却 */
const HINT_COOLDOWN = 2500

export interface RideHost {
  scene: Phaser.Scene
  map: MapDef
  player: Phaser.GameObjects.Sprite
  /** 是否使用 AI 行走图（代码小人不能骑乘） */
  charArt: boolean
  hasFlag: HasFlag
  tile: () => { x: number; y: number }
  facing: () => Facing
  toast: (msg: string) => void
}

export class RideController {
  readonly follower: Follower
  /** 正在骑乘的物种（null = 步行） */
  private mountId: string | null = null
  private lastHint = 0
  private lastHintMsg = ''
  private readonly host: RideHost

  constructor(host: RideHost) {
    this.host = host
    this.follower = new Follower(host.scene, host.map, (x, y) => this.standable(x, y))
    // 进入室内 / 城镇自动下坐骑
    if (Companions.riding() && (!host.map.outdoor || !this.canShowMount(Companions.mount()!.speciesId))) Companions.setRiding(false)
    this.mountId = Companions.riding() ? Companions.mount()!.speciesId : null
    this.applyLook()
    this.follower.reset(Companions.follower(), host.tile(), host.facing())
    this.follower.setHidden(this.riding)
  }

  get riding(): boolean {
    return this.mountId !== null
  }

  /** 生效中的骑乘能力（未骑乘或剧情未解锁时为 null） */
  skill(): MountSkill | null {
    const skill = this.mountId ? MOUNTS[this.mountId].skill : null
    return skillActive(skill, this.host.hasFlag) ? skill : null
  }

  /** 每格移动时长 */
  moveMs(base: number): number {
    return this.riding ? rideMoveMs(base, this.mountId) : base
  }

  /** 当前外观的帧高（脚底锚点 / 走路起伏用） */
  get frameH(): number {
    return this.riding ? MOUNT_FRAME : WALK_FRAME_H
  }

  /** 某方向的行走动画 key */
  walkAnim(f: Facing): string {
    return this.mountId ? rideAnim(this.host.scene, this.mountId, f) : `walk-${f}`
  }

  /** 影子宽度：骑乘时更宽 */
  get shadowWidth(): number {
    return this.riding ? 30 : 20
  }

  /** 夜间提灯半径 */
  lightRadius(): number {
    return this.skill() === 'blaze' ? LIGHT_BLAZE : LIGHT_WALK
  }

  /**
   * 能否走进该格（地形部分；NPC / 装饰 / 事件物件由场景另行判断）。
   * 骑着未解锁能力的坐骑撞到水 / 岩石时提示原因。
   * @author zjh
   * @date 2026-10-15
   */
  canEnter(tile: TileKind | null): boolean {
    const skill = this.skill()
    if (passable(tile, skill)) return true
    const want = tile === 'water' ? 'surf' : tile === 'rock' ? 'climb' : null
    if (want && this.mountId && MOUNTS[this.mountId].skill === want && !skill) this.hint(MOUNT_SKILLS[want].lockedHint ?? '')
    return false
  }

  /** 骑乘对遇敌来源的修正 */
  encounterSource<S extends string>(tile: TileKind, source: S | null): S | null {
    return rideEncounterSource(tile, source, this.skill())
  }

  /**
   * R 键 / 触屏「骑乘」：上坐骑或下坐骑
   * @author zjh
   * @date 2026-10-15
   */
  toggle(): void {
    const { x, y } = this.host.tile()
    if (this.riding) {
      if (!canDismountOn(resolveTile(this.host.map, x, y, this.host.hasFlag))) {
        this.hint('这里没法下来，先回到陆地上吧。')
        Sfx.cancel()
        return
      }
      this.setRiding(false)
      return
    }
    const m = Companions.mount()
    const block = rideBlock(m, this.host.map.outdoor) ?? (m && !this.canShowMount(m.speciesId) ? '它的骑乘行走图还没准备好' : null)
    if (block || !m) {
      this.host.toast(block ?? '')
      Sfx.cancel()
      return
    }
    this.setRiding(true)
  }

  /**
   * 菜单里改了跟随 / 坐骑之后同步：坐骑被取消或离队就下来，跟随伙伴换人就重建
   * @author zjh
   * @date 2026-10-15
   */
  sync(): void {
    const mount = Companions.mount()
    if (this.riding && (!mount || !Companions.riding())) this.setRiding(false, true)
    else if (this.riding && mount && mount.speciesId !== this.mountId) {
      this.mountId = mount.speciesId
      this.applyLook()
    }
    const f = Companions.follower()
    if (f !== this.follower.current) {
      this.follower.reset(f, this.host.tile(), this.host.facing())
      this.follower.setHidden(this.riding)
    }
  }

  /** 玩家走了一步：跟随伙伴走到玩家刚离开的格子 */
  onStep(fromX: number, fromY: number, ms: number): void {
    this.follower.stepTo(fromX, fromY, ms)
  }

  update(): void {
    this.follower.update(this.host.player.y)
  }

  private setRiding(on: boolean, quiet = false): void {
    const m = Companions.mount()
    Companions.setRiding(on && !!m)
    this.mountId = on && m ? m.speciesId : null
    this.applyLook()
    this.puff()
    this.follower.setHidden(this.riding)
    if (!this.riding) this.follower.snapBehind(this.host.tile(), this.host.facing())
    if (quiet) return
    if (this.riding && m) {
      const info = MOUNT_SKILLS[MOUNTS[m.speciesId].skill]
      const state = this.skill() ? info.desc : '（尚未解锁）'
      this.host.toast(`骑上了${battleName(m)}！「${info.label}」${state}`)
      Sfx.confirm()
    } else {
      this.host.toast('从坐骑上下来了')
      Sfx.step()
    }
  }

  /** 按当前状态切换玩家贴图与锚点 */
  private applyLook(): void {
    const { player, charArt } = this.host
    if (!charArt) return
    const f = this.host.facing()
    player.anims.stop()
    player.setTexture(this.mountId ? mountSheet(this.mountId) : playerSheet(this.host.scene), idleFrame(f))
    anchorFeet(player, this.frameH)
  }

  private canShowMount(speciesId: string): boolean {
    return this.host.charArt && this.host.scene.textures.exists(mountSheet(speciesId))
  }

  /** 伙伴能站的格子：地形可走且没有装饰物 */
  private standable(x: number, y: number): boolean {
    const tile = resolveTile(this.host.map, x, y, this.host.hasFlag)
    return !!tile && !isSolid(tile) && !decorBlocks(this.host.map.id, x, y)
  }

  /** 上 / 下坐骑时脚下扬起一圈尘土 */
  private puff(): void {
    const { scene, player } = this.host
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6
      const dot = scene.add.circle(player.x, player.y + 10, 3, 0xf4ead0, 0.8).setDepth(11)
      scene.tweens.add({
        targets: dot,
        x: player.x + Math.cos(a) * 16,
        y: player.y + 10 + Math.sin(a) * 6,
        alpha: 0,
        scale: 0.4,
        duration: 320,
        onComplete: () => dot.destroy(),
      })
    }
  }

  /** 提示「过不去 / 下不来」：同一句在冷却内不重复 */
  private hint(msg: string): void {
    const now = this.host.scene.time.now
    if (!msg || (msg === this.lastHintMsg && now - this.lastHint < HINT_COOLDOWN)) return
    this.lastHint = now
    this.lastHintMsg = msg
    this.host.toast(msg)
  }
}