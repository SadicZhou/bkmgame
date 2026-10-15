/**
 * 头顶表情气泡：「!」被训练家发现、「♪」路人打招呼等。弹出 → 停留 → 上浮淡出
 * @author zjh
 * @date 2026-10-15
 */

import Phaser from 'phaser'

/** 表情配色：「!」用醒目的红，其余用暖白 */
const EMOTE_STYLE: Record<string, { color: string; bg: string }> = {
  '!': { color: '#ffffff', bg: '#e0503a' },
}
const DEFAULT_STYLE = { color: '#5a3a20', bg: '#fff6dc' }

/**
 * 在 (x, y) 上方弹出一个表情气泡；跟随 follow（若给出）移动
 * @param hold 停留毫秒
 * @author zjh
 * @date 2026-10-15
 */
export function showEmote(
  scene: Phaser.Scene,
  text: string,
  follow: { x: number; y: number },
  dy = -38,
  hold = 1400,
): Phaser.GameObjects.Text {
  const style = EMOTE_STYLE[text] ?? DEFAULT_STYLE
  // 闲聊短句比单个表情长：字号小一些、不加粗
  const line = text.length > 2
  const t = scene.add
    .text(follow.x, follow.y + dy, text, {
      fontSize: line ? '11px' : '14px',
      fontStyle: line ? 'normal' : 'bold',
      color: style.color,
      backgroundColor: style.bg,
      padding: { x: 5, y: 2 },
    })
    .setOrigin(0.5, 1)
    .setDepth(12)
    .setScale(0.2)
  let rise = 0
  const sync = () => t.setPosition(follow.x, follow.y + dy - rise)
  scene.events.on(Phaser.Scenes.Events.UPDATE, sync)
  const done = () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, sync)
    t.destroy()
  }
  scene.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.easeOut' })
  scene.tweens.add({
    targets: { v: 0 },
    v: 6,
    delay: hold,
    duration: 260,
    onUpdate: (tw) => {
      rise = tw.getValue() ?? 0
      t.setAlpha(1 - rise / 6)
    },
    onComplete: done,
  })
  t.once(Phaser.GameObjects.Events.DESTROY, () => scene.events.off(Phaser.Scenes.Events.UPDATE, sync))
  return t
}
