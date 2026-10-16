/**
 * 大地图 NPC 层：守护兽用伙伴立绘、告示板用木牌、人物用行走图（缺图回退代码小人），
 * 训练家 / 守护兽未击败时头顶显示「!」，服务类 NPC 显示角色标记。
 * 能动的 NPC（四方向行走图 / 闲逛 / 巡逻）返回显示部件，交给 NpcWalkers 驱动；
 * 生成 / 移除的时机由 NpcRoster 管理（进图、昼夜天气变化、剧情改变旗标）。
 * @author zjh
 * @date 2026-10-15
 */

import Phaser from 'phaser'
import { anchorFeet, npcArt, npcLook, type NpcLook } from '../../graphics/CharArt'
import { setCreatureScale } from '../../graphics/CreatureArt'
import type { MapDef, NpcDef } from '../../data/maps'
import { GameState } from '../../state/GameState'
import { rematchReady } from '../../systems/Rematch'
import { dayOf } from '../../systems/WorldClock'

/** NPC 头顶标记 */
const ROLE_MARK: Partial<Record<NonNullable<NpcDef['role']>, string>> = {
  healer: '+',
  clinic: '+',
  shop: '店',
  board: '告',
  storage: '存',
  granny: '忆',
}

/** 不是人物的 NPC（没有行走图，头顶标记放低一些） */
const OBJECT_ROLES = new Set<NonNullable<NpcDef['role']>>(['boss', 'board', 'sign', 'prop'])

/** 人物头顶标记相对脚下格子中心的高度 */
export const PERSON_MARK_DY = -32

/** 大地图上守护兽立绘的缩放（默认 0.8；沧澜鲸是巨鲸，要大一些） */
export const BOSS_MAP_SCALE: Record<string, number> = { tidewhale: 1.5, echodeer: 1.0, ridgerhino: 1.35 }

/** 守护兽在大地图上显示的物种（队伍最后一只） */
export function bossSpecies(npc: NpcDef): string {
  return npc.team?.[npc.team.length - 1]?.speciesId ?? 'magmane'
}

function markText(npc: NpcDef): string | null {
  if ((npc.role === 'trainer' || npc.role === 'boss') && npc.defeatedKey) {
    if (!GameState.getFlag(npc.defeatedKey)) return '!'
    return rematchReady(npc, (k) => GameState.getFlag(k), dayOf(GameState.world.totalSteps)) ? '再' : null
  }
  return npc.role ? ROLE_MARK[npc.role] ?? null : null
}

/** 能动的 NPC 的显示部件 */
export interface WalkerBody {
  npc: NpcDef
  spr: Phaser.GameObjects.Sprite
  shadow: Phaser.GameObjects.Ellipse
  look: NpcLook
  /** 头顶标记（跟着人走） */
  mark: Phaser.GameObjects.Text | null
}

function addMark(scene: Phaser.Scene, text: string, x: number, y: number): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, { fontSize: '13px', color: '#3a2a10', backgroundColor: '#ffe08a', padding: { x: 4, y: 1 } })
    .setOrigin(0.5)
    .setDepth(11)
}

/** 呼吸起伏（每人节奏略不同） */
function breathe(scene: Phaser.Scene, spr: Phaser.GameObjects.Sprite, npc: NpcDef): void {
  scene.tweens.add({
    targets: spr,
    scaleY: 1.035,
    yoyo: true,
    repeat: -1,
    duration: 900 + ((npc.x * 7 + npc.y * 13) % 5) * 120,
    ease: 'Sine.easeInOut',
  })
}

/**
 * 人类 NPC：能动的（四方向行走图，或设了闲逛 / 巡逻）返回显示部件；
 * 其余用正面站立帧 + 脚下阴影 + 呼吸起伏，缺图时用着色的代码小人
 * @author zjh
 * @date 2026-10-15
 */
function spawnPerson(scene: Phaser.Scene, npc: NpcDef, cx: number, cy: number, mark: string | null): SpawnedNpc {
  const look = npcLook(scene, npc.id)
  const art = npcArt(scene, npc.id)
  if (look && (look.turns || npc.wander || npc.patrol)) {
    const shadow = scene.add.ellipse(cx, cy + 13, 20, 7, 0x000000, 0.22).setDepth(8)
    const spr = anchorFeet(scene.add.sprite(cx, cy, look.sheet, look.idle(npc.facing ?? 'down'))).setDepth(9)
    breathe(scene, spr, npc)
    const body: WalkerBody = { npc, spr, shadow, look, mark: mark ? addMark(scene, mark, cx, cy + PERSON_MARK_DY) : null }
    return { body, objects: [] }
  }
  const objects: Phaser.GameObjects.GameObject[] = []
  if (!art) {
    objects.push(scene.add.sprite(cx, cy, 'spr-npc').setTint(npc.color).setDepth(9))
  } else {
    objects.push(scene.add.ellipse(cx, cy + 13, 20, 7, 0x000000, 0.22).setDepth(8))
    const spr = anchorFeet(scene.add.sprite(cx, cy, art.key, art.frame)).setDepth(9)
    breathe(scene, spr, npc)
    objects.push(spr)
  }
  if (mark) {
    const y = cy + (art ? PERSON_MARK_DY : -22)
    const t = addMark(scene, mark, cx, y)
    scene.tweens.add({ targets: t, y: y - 3, yoyo: true, repeat: -1, duration: 500 })
    objects.push(t)
  }
  return { body: null, objects }
}

/** 单个 NPC 的显示结果：能动的给出 body，其余给出静态显示对象 */
export interface SpawnedNpc {
  body: WalkerBody | null
  objects: Phaser.GameObjects.GameObject[]
}

/**
 * 生成单个 NPC 的显示对象
 * @author zjh
 * @date 2026-10-15
 */
export function spawnNpc(scene: Phaser.Scene, map: MapDef, npc: NpcDef): SpawnedNpc {
  const ts = map.tileSize
  const cx = npc.x * ts + ts / 2
  const cy = npc.y * ts + ts / 2
  const mark = markText(npc)
  if (!OBJECT_ROLES.has(npc.role ?? 'talk')) return spawnPerson(scene, npc, cx, cy, mark)
  const objects: Phaser.GameObjects.GameObject[] = []
  if (npc.role === 'boss') {
    const sp = bossSpecies(npc)
    const spr = setCreatureScale(scene.add.image(cx, cy, `spr-${sp}`), BOSS_MAP_SCALE[sp] ?? 0.8).setDepth(9)
    scene.tweens.add({ targets: spr, y: cy - 3, yoyo: true, repeat: -1, duration: 700 })
    objects.push(spr)
  } else if (npc.role === 'board' || npc.role === 'sign') {
    objects.push(scene.add.image(cx, cy, 'spr-board').setDepth(9))
  } else if (npc.role === 'prop' && npc.texture && scene.textures.exists(npc.texture)) {
    const img = scene.add.image(cx, cy, npc.texture).setDepth(9)
    if (npc.bob) scene.tweens.add({ targets: img, y: cy - 2, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' })
    objects.push(img)
  }
  if (mark) {
    const t = addMark(scene, mark, cx, cy - 22)
    scene.tweens.add({ targets: t, y: cy - 25, yoyo: true, repeat: -1, duration: 500 })
    objects.push(t)
  }
  return { body: null, objects }
}