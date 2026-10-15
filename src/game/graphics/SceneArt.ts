/**
 * 场景背景图：战斗背景（按区域 / 战斗类型）与标题、选伙伴、结局的全屏背景。
 * 原图放在 art-src/backgrounds/，运行 scripts/process-backgrounds.py 输出到 public/assets/backgrounds/。
 * 缺图时 addBackdrop 返回 null，由各场景回退到纯色绘制。
 * 地图装饰物（data/decor）也在这里一并预加载，源图在 art-src/decor/，用 scripts/process-decor.py 处理。
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { DECOR_KEYS } from '../data/decor'
import type { PendingBattle } from '../state/GameState'

/** 全部背景 key（文件名同 key） */
export const BACKGROUNDS = [
  'bg-battle-meadow',
  'bg-battle-pass',
  'bg-battle-summit',
  'bg-battle-mystic',
  'bg-battle-lake',
  'bg-battle-forest',
  'bg-title',
  'bg-starter',
  'bg-ending',
] as const

export type BackdropKey = (typeof BACKGROUNDS)[number]

/**
 * 在 preload 阶段加载全部背景
 * @author zjh
 * @date 2026-10-14
 */
export function preloadSceneArt(scene: Phaser.Scene): void {
  for (const key of BACKGROUNDS) scene.load.image(key, `assets/backgrounds/${key}.jpg`)
  for (const key of DECOR_KEYS) scene.load.image(key, `assets/decor/${key}.png`)
}

/** 各地图的普通战斗背景 */
const MAP_BACKDROP: Record<string, BackdropKey> = { pass: 'bg-battle-pass', lake: 'bg-battle-lake', forest: 'bg-battle-forest' }

/** 守护兽战也沿用本地图背景的地图（湖畔的沧澜鲸、回音林的林语鹿） */
const BOSS_ON_MAP = new Set(['lake', 'forest'])

/**
 * 战斗背景：异象战用星空；湖畔 / 回音林（含守护兽）用本地风景；其余 BOSS 战用山顶，普通战按地图区分
 * @author zjh
 * @date 2026-10-14
 */
export function battleBackdropKey(pending: Pick<PendingBattle, 'kind' | 'returnMapId'>): BackdropKey {
  if (pending.kind === 'unique') return 'bg-battle-mystic'
  if (BOSS_ON_MAP.has(pending.returnMapId)) return MAP_BACKDROP[pending.returnMapId]
  if (pending.kind === 'boss') return 'bg-battle-summit'
  return MAP_BACKDROP[pending.returnMapId] ?? 'bg-battle-meadow'
}

/**
 * 在左上角铺一张背景；dim > 0 时叠一层黑色半透明遮罩，保证上层文字可读
 * @author zjh
 * @date 2026-10-14
 */
export function addBackdrop(scene: Phaser.Scene, key: BackdropKey, dim = 0): Phaser.GameObjects.Image | null {
  if (!scene.textures.exists(key)) return null
  const img = scene.add.image(0, 0, key).setOrigin(0)
  if (dim > 0) scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, dim).setOrigin(0)
  return img
}
