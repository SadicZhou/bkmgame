/**
 * 通用列表面板：菜单 / 背包 / 商店 / 图鉴 / 队伍共用
 * 支持键盘上下选择 + 确认/取消、鼠标点击、超出时滚动、选中行详情说明。
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { setCreatureScale } from '../graphics/CreatureArt'
import { Sfx } from '../systems/AudioBeeps'
import type { InputFrame } from './InputKeys'

export interface ListRow {
  label: string
  /** 右侧附注（数量、价格、HP 等） */
  right?: string
  /** 选中时底部显示的说明 */
  detail?: string
  /** 行首小图标（贴图 key） */
  icon?: string
  /** 图标是否灰显（如图鉴未收服） */
  iconDim?: boolean
  disabled?: boolean
  onSelect?: () => void
}

export interface ListPanelOptions {
  title: string
  rows: ListRow[]
  /** 底部固定信息（如持有金币） */
  footer?: string
  /** 取消键 / 点击面板外的回调；不传则直接关闭 */
  onCancel?: () => void
  /** 初始选中行 */
  index?: number
}

const PANEL_W = 440
const ROW_H = 34
const VISIBLE_ROWS = 6
/** 底部说明区高度（可容纳约 6 行） */
const DETAIL_H = 90

export class ListPanel {
  private readonly scene: Phaser.Scene
  private readonly root: Phaser.GameObjects.Container
  private readonly rowLayer: Phaser.GameObjects.Container
  private readonly titleText: Phaser.GameObjects.Text
  private readonly detailText: Phaser.GameObjects.Text
  private readonly footerText: Phaser.GameObjects.Text
  private readonly scrollHint: Phaser.GameObjects.Text
  private opts: ListPanelOptions = { title: '', rows: [] }
  private index = 0
  private offset = 0
  private readonly top: number

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    const { width: w, height: h } = scene.scale
    const panelH = 96 + ROW_H * VISIBLE_ROWS + DETAIL_H
    this.top = (h - panelH) / 2
    const left = (w - PANEL_W) / 2

    const shade = scene.add.rectangle(0, 0, w, h, 0x000000, 0.45).setOrigin(0).setInteractive()
    shade.on('pointerdown', () => this.cancel())
    const bg = scene.add
      .rectangle(w / 2, this.top + panelH / 2, PANEL_W, panelH, 0x102018, 0.97)
      .setStrokeStyle(2, 0xe8a838)
      .setInteractive()
    this.titleText = scene.add
      .text(w / 2, this.top + 22, '', { fontSize: '20px', color: '#f0e6c8' })
      .setOrigin(0.5)
    this.rowLayer = scene.add.container(0, 0)
    const detailY = this.top + 52 + ROW_H * VISIBLE_ROWS + 10
    const divider = scene.add.rectangle(w / 2, detailY - 6, PANEL_W - 32, 1, 0x4a7a60)
    this.detailText = scene.add.text(left + 18, detailY, '', {
      fontSize: '12px',
      color: '#b8d8c8',
      wordWrap: { width: PANEL_W - 36, useAdvancedWrap: true },
      lineSpacing: 2,
    })
    this.footerText = scene.add
      .text(left + PANEL_W - 16, this.top + 22, '', { fontSize: '13px', color: '#ffd77a' })
      .setOrigin(1, 0.5)
    this.scrollHint = scene.add
      .text(left + PANEL_W - 18, this.top + 52 + ROW_H * VISIBLE_ROWS - 8, '', {
        fontSize: '12px',
        color: '#7ec8a3',
      })
      .setOrigin(1, 1)
    const help = scene.add
      .text(w / 2, this.top + panelH - 12, '↑↓ 选择 · 空格确认 · Esc 返回', {
        fontSize: '11px',
        color: '#6a8f7c',
      })
      .setOrigin(0.5)

    this.root = scene.add
      .container(0, 0, [
        shade,
        bg,
        this.titleText,
        this.footerText,
        this.rowLayer,
        divider,
        this.detailText,
        this.scrollHint,
        help,
      ])
      .setScrollFactor(0)
      // 高于触控垫（1000），避免方向键浮在面板上
      .setDepth(1100)
      .setVisible(false)
  }

  get isOpen(): boolean {
    return this.root.visible
  }

  /**
   * 打开（或替换内容）
   * @author zjh
   * @date 2026-10-14
   */
  open(opts: ListPanelOptions): void {
    this.opts = opts
    this.index = Math.max(0, Math.min(opts.index ?? 0, opts.rows.length - 1))
    this.offset = 0
    this.root.setVisible(true)
    this.render()
  }

  /** 刷新行内容，保持当前选中位置 */
  update(rows: ListRow[], footer?: string): void {
    this.opts = { ...this.opts, rows, footer: footer ?? this.opts.footer }
    this.index = Math.max(0, Math.min(this.index, rows.length - 1))
    this.render()
  }

  close(): void {
    this.root.setVisible(false)
  }

  /** 每帧处理导航输入 */
  handle(input: InputFrame): void {
    if (!this.isOpen) return
    const n = this.opts.rows.length
    if (input.up && n) this.move(-1)
    else if (input.down && n) this.move(1)
    else if (input.confirm) this.select(this.index)
    else if (input.cancel) this.cancel()
  }

  private move(delta: number): void {
    const n = this.opts.rows.length
    this.index = (this.index + delta + n) % n
    Sfx.step()
    this.render()
  }

  private select(i: number): void {
    const row = this.opts.rows[i]
    if (!row) return
    if (row.disabled || !row.onSelect) {
      Sfx.cancel()
      return
    }
    Sfx.confirm()
    row.onSelect()
  }

  private cancel(): void {
    Sfx.cancel()
    if (this.opts.onCancel) this.opts.onCancel()
    else this.close()
  }

  /**
   * 重绘可见行
   * @author zjh
   * @date 2026-10-14
   */
  private render(): void {
    const { width: w } = this.scene.scale
    const left = (w - PANEL_W) / 2
    const rows = this.opts.rows

    if (this.index < this.offset) this.offset = this.index
    if (this.index >= this.offset + VISIBLE_ROWS) this.offset = this.index - VISIBLE_ROWS + 1

    this.titleText.setText(this.opts.title)
    this.footerText.setText(this.opts.footer ?? '')
    this.rowLayer.removeAll(true)

    rows.slice(this.offset, this.offset + VISIBLE_ROWS).forEach((row, k) => {
      const i = this.offset + k
      const y = this.top + 52 + k * ROW_H + ROW_H / 2
      const selected = i === this.index
      const bg = this.scene.add
        .rectangle(w / 2, y, PANEL_W - 24, ROW_H - 4, selected ? 0x3a7a58 : 0x1c3a2c)
        .setStrokeStyle(1, selected ? 0xffd77a : 0x2e5a44)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (this.index === i) this.select(i)
          else {
            this.index = i
            this.render()
          }
        })
      const color = row.disabled ? '#7a8f84' : '#e8f5ee'
      let textX = left + 26
      const parts: Phaser.GameObjects.GameObject[] = [bg]
      if (row.icon) {
        const icon = setCreatureScale(this.scene.add.image(left + 34, y, row.icon), 0.55)
        if (row.iconDim) icon.setTint(0x222222)
        parts.push(icon)
        textX = left + 56
      }
      parts.push(
        this.scene.add
          .text(textX, y, `${selected ? '▶ ' : ''}${row.label}`, { fontSize: '15px', color })
          .setOrigin(0, 0.5),
      )
      if (row.right) {
        parts.push(
          this.scene.add
            .text(left + PANEL_W - 26, y, row.right, { fontSize: '13px', color: '#ffd77a' })
            .setOrigin(1, 0.5),
        )
      }
      this.rowLayer.add(parts)
    })

    const more: string[] = []
    if (this.offset > 0) more.push('▲')
    if (this.offset + VISIBLE_ROWS < rows.length) more.push('▼')
    this.scrollHint.setText(more.join(' '))
    this.detailText.setText(rows[this.index]?.detail ?? '')
  }
}
