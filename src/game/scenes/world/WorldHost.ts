/**
 * WorldScene 暴露给 scenes/world/ 下各子模块（NPC 交互、钓鱼等）的能力
 * 子模块只依赖这个接口，不直接访问 WorldScene 的私有成员。
 * @author zjh
 * @date 2026-10-15
 */

import type Phaser from 'phaser'
import type { CreatureInstance } from '../../data/creatures'
import type { MapDef } from '../../data/maps'
import type { PendingBattle } from '../../state/GameState'
import type { DialogueBox } from '../../ui/DialogueBox'
import type { TownServices } from '../../ui/TownServices'
import type { WorldMenus } from '../../ui/WorldMenus'

/** 战斗返回世界所需的位置与场地信息 */
export type ReturnInfo = Pick<PendingBattle, 'weather' | 'night' | 'returnMapId' | 'returnX' | 'returnY'>

export interface WorldHost {
  readonly scene: Phaser.Scene
  readonly map: MapDef
  readonly dialogue: DialogueBox
  readonly menus: WorldMenus
  readonly services: TownServices
  /** 玩家精灵的世界坐标（像素） */
  playerXY(): { x: number; y: number }
  toast(msg: string): void
  refreshHud(): void
  hasAbleCreature(): boolean
  returnInfo(): ReturnInfo
  /** 锁住输入并转场进入战斗；flash 为异象战的白闪 */
  enterBattle(pending: PendingBattle, flash?: boolean): void
  /** 野生战（钓鱼 / 遇敌） */
  startWildBattle(enemy: CreatureInstance): void
}
