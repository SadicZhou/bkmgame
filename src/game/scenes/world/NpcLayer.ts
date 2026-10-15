/**
 * 大地图 NPC 层：守护兽用伙伴立绘、告示板用木牌、人物用行走图（缺图回退代码小人），
 * 训练家 / 守护兽未击败时头顶显示「!」，服务类 NPC 显示角色标记。
 * @author zjh
 * @date 2026-10-15
 */

import Phaser from 'phaser'
import { anchorFeet, npcArt } from '../../graphics/CharArt'
import { setCreatureScale } from '../../graphics/CreatureArt'
import { visibleNpcs, type HasFlag, type MapDef, type NpcDef } from '../../data/maps'
import { GameState } from '../../state/GameState'

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

/** 大地图上守护兽立绘的缩放（默认 0.8；沧澜鲸是巨鲸，要大一些） */
export const BOSS_MAP_SCALE: Record<string, number> = { tidewhale: 1.5, echodeer: 1.0 }

/** 守护兽在大地图上显示的物种（队伍最后一只） */
export function bossSpecies(npc: NpcDef): string {
  return npc.team?.[npc.team.length - 1]?.speciesId ?? 'magmane'
}

function markText(npc: NpcDef): string | null {
  if ((npc.role === 'trainer' || npc.role === 'boss') && npc.defeatedKey) {
    return GameState.getFlag(npc.defeatedKey) ? null : '!'
  }
  return npc.role ? ROLE_MARK[npc.role] ?? null : null
}

/**
 * 人类 NPC：有行走图时用对应帧 + 脚下阴影 + 呼吸起伏，否则用着色的代码小人
 * @author zjh
 * @date 2026-10-14
 */
function spawnPerson(scene: Phaser.Scene, npc: NpcDef, cx: number, cy: number): void {
  const art = npcArt(scene, npc.id)
  if (!art) {
    scene.add.sprite(cx, cy, 'spr-npc').setTint(npc.color).setDepth(9)
    return
  }
  scene.add.ellipse(cx, cy + 13, 20, 7, 0x000000, 0.22).setDepth(8)
  const spr = anchorFeet(scene.add.sprite(cx, cy, art.key, art.frame)).setDepth(9)
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
 * 生成当前地图所有可见 NPC
 * @author zjh
 * @date 2026-10-14
 */
export function spawnNpcs(scene: Phaser.Scene, map: MapDef, hasFlag: HasFlag): void {
  const ts = map.tileSize
  for (const npc of visibleNpcs(map, hasFlag)) {
    const cx = npc.x * ts + ts / 2
    const cy = npc.y * ts + ts / 2
    if (npc.role === 'boss') {
      const sp = bossSpecies(npc)
      const spr = setCreatureScale(scene.add.image(cx, cy, `spr-${sp}`), BOSS_MAP_SCALE[sp] ?? 0.8).setDepth(9)
      scene.tweens.add({ targets: spr, y: cy - 3, yoyo: true, repeat: -1, duration: 700 })
    } else if (npc.role === 'board' || npc.role === 'sign') {
      scene.add.image(cx, cy, 'spr-board').setDepth(9)
    } else if (npc.role === 'prop') {
      if (npc.texture && scene.textures.exists(npc.texture)) scene.add.image(cx, cy, npc.texture).setDepth(9)
    } else {
      spawnPerson(scene, npc, cx, cy)
    }

    const tall = !OBJECT_ROLES.has(npc.role ?? 'talk') && !!npcArt(scene, npc.id)
    const markY = tall ? cy - 32 : cy - 22
    const mark = markText(npc)
    if (!mark) continue
    const t = scene.add
      .text(cx, markY, mark, { fontSize: '13px', color: '#3a2a10', backgroundColor: '#ffe08a', padding: { x: 4, y: 1 } })
      .setOrigin(0.5)
      .setDepth(11)
    scene.tweens.add({ targets: t, y: markY - 3, yoyo: true, repeat: -1, duration: 500 })
  }
}
