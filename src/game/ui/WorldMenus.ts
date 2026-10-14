/**
 * 大地图菜单：主菜单、队伍、背包、图鉴、商店
 * 全部基于同一个 ListPanel，通过 onCancel 回到上一级。
 * @author zjh
 * @date 2026-10-14
 */

import {
  DEX_ORDER,
  SPECIES,
  TYPE_LABEL,
  displayName,
  expToNext,
  getMoves,
  type CreatureInstance,
} from '../data/creatures'
import { ITEMS, ITEM_ORDER, SHOP_STOCK } from '../data/items'
import { GameState } from '../state/GameState'
import { Sfx } from '../systems/AudioBeeps'
import { ListPanel, type ListRow } from './ListPanel'

export interface WorldMenuHooks {
  toast: (msg: string) => void
  refreshHud: () => void
  backToTitle: () => void
}

export class WorldMenus {
  readonly panel: ListPanel
  private readonly hooks: WorldMenuHooks

  constructor(panel: ListPanel, hooks: WorldMenuHooks) {
    this.panel = panel
    this.hooks = hooks
  }

  get isOpen(): boolean {
    return this.panel.isOpen
  }

  private coinsFooter(): string {
    return `焰币 ${GameState.coins}`
  }

  /**
   * 主菜单
   * @author zjh
   * @date 2026-10-14
   */
  openMain(index = 0): void {
    Sfx.confirm()
    const caught = GameState.dex.caught.length
    this.panel.open({
      title: '菜单',
      footer: this.coinsFooter(),
      index,
      rows: [
        { label: '队伍', right: `${GameState.party.length} 只`, detail: '查看伙伴能力与招式，调整首发。', onSelect: () => this.openParty() },
        { label: '背包', detail: '使用伤药、复苏草等道具。', onSelect: () => this.openBag() },
        { label: '图鉴', right: `${caught}/${DEX_ORDER.length}`, detail: '记录遇见与收服过的伙伴。', onSelect: () => this.openDex() },
        {
          label: '保存进度',
          detail: '存到本机浏览器（localStorage）。',
          onSelect: () => {
            GameState.persist()
            this.panel.close()
            this.hooks.toast('已保存到本地')
          },
        },
        { label: '返回标题', detail: '未保存的进度会丢失。', onSelect: () => this.hooks.backToTitle() },
        { label: '关闭', onSelect: () => this.panel.close() },
      ],
    })
  }

  /** 伙伴详情文本 */
  private creatureDetail(c: CreatureInstance): string {
    const sp = SPECIES[c.speciesId]
    const moves = getMoves(c)
      .map((m) => `${m.name}(${TYPE_LABEL[m.type]}${m.power})`)
      .join(' ')
    const evo =
      sp.evolvesTo && sp.evolveLevel ? ` · ${sp.evolveLevel} 级进化` : ''
    return (
      `[${TYPE_LABEL[sp.type]}] 攻${c.atk} 防${c.def} 速${c.spd} · 经验 ${c.exp}/${expToNext(c.level)}${evo}\n` +
      `招式：${moves}`
    )
  }

  private partyRows(onPick: (i: number) => void, filter?: (c: CreatureInstance) => boolean): ListRow[] {
    return GameState.party.map((c, i) => ({
      label: `${i === 0 ? '★ ' : ''}${displayName(c)} Lv.${c.level}`,
      right: c.hp > 0 ? `HP ${c.hp}/${c.maxHp}` : '倒下',
      icon: `spr-${c.speciesId}`,
      detail: this.creatureDetail(c),
      disabled: filter ? !filter(c) : false,
      onSelect: () => onPick(i),
    }))
  }

  /**
   * 队伍：选中后可设为首发
   * @author zjh
   * @date 2026-10-14
   */
  openParty(index = 0): void {
    this.panel.open({
      title: '队伍（★ 为首发）',
      index,
      rows: this.partyRows((i) => this.openCreature(i)),
      onCancel: () => this.openMain(0),
    })
  }

  private openCreature(i: number): void {
    const c = GameState.party[i]
    if (!c) return
    const detail = this.creatureDetail(c)
    this.panel.open({
      title: `${displayName(c)} Lv.${c.level}`,
      rows: [
        {
          label: i === 0 ? '已是首发' : '设为首发',
          disabled: i === 0,
          detail,
          onSelect: () => {
            GameState.setLead(i)
            this.hooks.refreshHud()
            this.hooks.toast(`${displayName(c)} 成为首发！`)
            this.openParty(0)
          },
        },
        { label: '返回', detail, onSelect: () => this.openParty(i) },
      ],
      onCancel: () => this.openParty(i),
    })
  }

  /**
   * 背包：回复/复活类可在地图上使用
   * @author zjh
   * @date 2026-10-14
   */
  openBag(index = 0): void {
    const ids = ITEM_ORDER.filter((id) => GameState.itemCount(id) > 0)
    const rows: ListRow[] = ids.map((id) => {
      const it = ITEMS[id]
      return {
        label: it.name,
        right: `×${GameState.itemCount(id)}`,
        detail: it.desc,
        onSelect: () => {
          if (it.kind === 'catch') {
            this.hooks.toast('只能在野生战斗中使用')
            Sfx.cancel()
            return
          }
          this.openItemTarget(id, ids.indexOf(id))
        },
      }
    })
    if (!rows.length) rows.push({ label: '（空空如也）', disabled: true, detail: '去晨曦小镇的杂货商那里看看吧。' })
    this.panel.open({ title: '背包', footer: this.coinsFooter(), index, rows, onCancel: () => this.openMain(1) })
  }

  private openItemTarget(itemId: string, bagIndex: number): void {
    const it = ITEMS[itemId]
    const usable = (c: CreatureInstance) =>
      it.kind === 'heal' ? c.hp > 0 && c.hp < c.maxHp : c.hp <= 0
    this.panel.open({
      title: `对谁使用 ${it.name}？`,
      rows: this.partyRows((i) => {
        const c = GameState.party[i]
        if (!GameState.consumeItem(itemId)) return
        if (it.kind === 'heal') {
          const before = c.hp
          c.hp = Math.min(c.maxHp, c.hp + it.value)
          this.hooks.toast(`${displayName(c)} 回复了 ${c.hp - before} HP`)
        } else {
          c.hp = Math.max(1, Math.floor(c.maxHp * it.value))
          this.hooks.toast(`${displayName(c)} 重新振作起来了！`)
        }
        this.hooks.refreshHud()
        if (GameState.itemCount(itemId) > 0) this.openItemTarget(itemId, bagIndex)
        else this.openBag(0)
      }, usable),
      onCancel: () => this.openBag(bagIndex),
    })
  }

  /**
   * 图鉴
   * @author zjh
   * @date 2026-10-14
   */
  openDex(): void {
    const { seen, caught } = GameState.dex
    const rows: ListRow[] = DEX_ORDER.map((id, i) => {
      const sp = SPECIES[id]
      const no = String(i + 1).padStart(2, '0')
      if (caught.includes(id)) {
        return { label: `No.${no} ${sp.name}`, right: '已收服', icon: `spr-${id}`, detail: `[${TYPE_LABEL[sp.type]}] ${sp.desc}` }
      }
      if (seen.includes(id)) {
        return { label: `No.${no} ${sp.name}`, right: '遇见过', icon: `spr-${id}`, detail: `[${TYPE_LABEL[sp.type]}] 遇见过，但还没有成为伙伴。` }
      }
      return { label: `No.${no} ？？？`, icon: `spr-${id}`, iconDim: true, detail: '还没有遇见过。' }
    })
    this.panel.open({
      title: '伙伴图鉴',
      footer: `收服 ${caught.length}/${DEX_ORDER.length}`,
      rows,
      onCancel: () => this.openMain(2),
    })
  }

  /**
   * 商店：每次确认购买 1 个
   * @author zjh
   * @date 2026-10-14
   */
  openShop(onClose: () => void): void {
    const rows = (): ListRow[] =>
      SHOP_STOCK.map((id) => {
        const it = ITEMS[id]
        return {
          label: it.name,
          right: `${it.price} 焰币 · 持有 ${GameState.itemCount(id)}`,
          detail: it.desc,
          onSelect: () => {
            if (GameState.coins < it.price) {
              Sfx.cancel()
              this.hooks.toast('焰币不够哦')
              return
            }
            GameState.coins -= it.price
            GameState.addItem(id)
            this.hooks.toast(`买下了 ${it.name}`)
            this.hooks.refreshHud()
            this.panel.update(rows(), this.coinsFooter())
          },
        }
      })
    this.panel.open({
      title: '杂货铺',
      footer: this.coinsFooter(),
      rows: rows(),
      onCancel: () => {
        this.panel.close()
        onClose()
      },
    })
  }
}
