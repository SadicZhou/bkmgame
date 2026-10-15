/**
 * 大地图菜单：主菜单、队伍、背包、图鉴、异象录、商店
 * 全部基于同一个 ListPanel，通过 onCancel 回到上一级。
 * @author zjh
 * @date 2026-10-14
 */

import { DEX_ORDER, SPECIES, TYPE_LABEL, UNIQUE_ORDER, battleName, spriteKey, type CreatureInstance } from '../data/creatures'
import { BADGES, ownedBadges } from '../data/badges'
import { FISH_ORDER } from '../data/fishing'
import { ITEMS, ITEM_ORDER, SHOP_STOCK } from '../data/items'
import { MUSH_FLAGS } from '../data/mushrooms'
import { PHENOMENA } from '../data/phenomena'
import { GameState } from '../state/GameState'
import { Sfx } from '../systems/AudioBeeps'
import { applyItemToCreature, checkItemOnCreature } from '../systems/BattleLogic'
import { BOND_FLAG, FRIENDSHIP_GAIN, bondBar, bondStage, nextBondStage } from '../systems/Bond'
import { anglerRecord, beatsRecord, fishLogCount, todayContest } from '../systems/FishLog'
import { abilityDetail, creatureDetail, rowLabel } from './CreatureInfo'
import { ListPanel, type ListRow } from './ListPanel'
import { openTalentFruit } from './TalentFruitMenu'

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
    const caught = GameState.dex.caught.filter((id) => DEX_ORDER.includes(id)).length
    const uniques = GameState.world.phenomenon.caught.length
    const badges = ownedBadges(GameState.hasFlag)
    this.panel.open({
      title: '菜单',
      footer: this.coinsFooter(),
      index,
      rows: [
        { label: '队伍', right: `${GameState.party.length} 只`, detail: '查看伙伴能力、资质与技能，调整首发。', onSelect: () => this.openParty() },
        { label: '背包', detail: '使用伤药、万灵药、PP 果、引兽铃等道具。', onSelect: () => this.openBag() },
        { label: '图鉴', right: `${caught}/${DEX_ORDER.length}`, detail: '记录遇见与收服过的伙伴。', onSelect: () => this.openDex() },
        { label: '异象录', right: `${uniques}/${UNIQUE_ORDER.length}`, detail: '记录在异象中邂逅的唯一精灵。', onSelect: () => this.openUniqueDex() },
        {
          label: '徽记',
          right: `${badges.length}/${Object.keys(BADGES).length}`,
          detail:
            (badges.length ? badges.map((b) => `◆ ${b.name}：${b.desc}`).join('\n') : '击败各章节的守护兽后可以获得徽记。') +
            (GameState.hasFlag(MUSH_FLAGS.title) ? '\n称号：菇菇朋友（伞灵菇老奶奶）' : ''),
          onSelect: () => Sfx.cancel(),
        },
        {
          label: '钓鱼记录',
          right: `${fishLogCount(GameState.world)}/${FISH_ORDER.length}`,
          detail: '雾泉湖畔钓到过的伙伴、次数与最大体长。',
          onSelect: () => this.openFishLog(),
        },
        ...(GameState.hasFlag(BOND_FLAG)
          ? [{ label: '羁绊', right: '♥', detail: '伙伴们的亲密度与羁绊阶段。', onSelect: () => this.openBond() }]
          : []),
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

  private partyRows(onPick: (i: number) => void, filter?: (c: CreatureInstance) => string | null): ListRow[] {
    return GameState.party.map((c, i) => {
      const reason = filter?.(c) ?? null
      return {
        label: rowLabel(c, i === 0 ? '★ ' : ''),
        right: c.hp > 0 ? `HP ${c.hp}/${c.maxHp}` : '倒下',
        icon: spriteKey(c),
        detail: reason ?? creatureDetail(c),
        disabled: !!reason,
        onSelect: () => onPick(i),
      }
    })
  }

  /**
   * 队伍：选中后可设为首发、查看特性
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
    const detail = creatureDetail(c)
    this.panel.open({
      title: `${battleName(c)} Lv.${c.level}`,
      rows: [
        {
          label: i === 0 ? '已是首发' : '设为首发',
          disabled: i === 0,
          detail,
          onSelect: () => {
            GameState.setLead(i)
            this.hooks.refreshHud()
            this.hooks.toast(`${battleName(c)} 成为首发！`)
            this.openParty(0)
          },
        },
        { label: '特性说明', detail: abilityDetail(c) },
        { label: '返回', detail, onSelect: () => this.openParty(i) },
      ],
      onCancel: () => this.openParty(i),
    })
  }

  /**
   * 背包：回复 / 解除 / PP 类选择目标；引兽铃、驱兽香直接生效；安抚果只能在战斗中用
   * @author zjh
   * @date 2026-10-14
   */
  openBag(index = 0): void {
    const ids = ITEM_ORDER.filter((id) => GameState.itemCount(id) > 0)
    const w = GameState.world
    const rows: ListRow[] = ids.map((id, i) => {
      const it = ITEMS[id]
      const active = it.kind === 'lure' && w.lureSteps > 0 ? `（剩余 ${w.lureSteps} 步）` : it.kind === 'repel' && w.repelSteps > 0 ? `（剩余 ${w.repelSteps} 步）` : ''
      return {
        label: it.name,
        right: `×${GameState.itemCount(id)}`,
        detail: `${it.desc}${active}`,
        onSelect: () => {
          if (it.kind === 'key') {
            this.hooks.toast(id.endsWith('_rod') ? '面朝水面按确认就能钓鱼' : '这是重要物品')
            Sfx.cancel()
            return
          }
          if (it.kind === 'catch') {
            this.hooks.toast('只能在野生战斗中使用')
            Sfx.cancel()
            return
          }
          if (it.kind === 'lure' || it.kind === 'repel') {
            this.useFieldItem(id, i)
            return
          }
          if (it.kind === 'talent') {
            openTalentFruit(this.panel, id, { ...this.hooks, back: () => this.openBag(0) })
            return
          }
          this.openItemTarget(id, i)
        },
      }
    })
    if (!rows.length) rows.push({ label: '（空空如也）', disabled: true, detail: '去晨曦小镇的杂货商那里看看吧。' })
    this.panel.open({ title: '背包', footer: this.coinsFooter(), index, rows, onCancel: () => this.openMain(1) })
  }

  /** 引兽铃与驱兽香互斥：用一个会抵消另一个 */
  private useFieldItem(itemId: string, bagIndex: number): void {
    const it = ITEMS[itemId]
    if (!GameState.consumeItem(itemId)) return
    const w = GameState.world
    if (it.kind === 'lure') {
      w.lureSteps = it.value
      w.repelSteps = 0
      this.hooks.toast(`叮铃～ ${it.value} 步内野生伙伴会更常出现`)
    } else {
      w.repelSteps = it.value
      w.lureSteps = 0
      this.hooks.toast(`淡淡的香气散开，${it.value} 步内弱小的野生伙伴不会靠近`)
    }
    this.openBag(Math.min(bagIndex, Math.max(0, ITEM_ORDER.filter((id) => GameState.itemCount(id) > 0).length - 1)))
  }

  private openItemTarget(itemId: string, bagIndex: number): void {
    const it = ITEMS[itemId]
    this.panel.open({
      title: `对谁使用 ${it.name}？`,
      rows: this.partyRows(
        (i) => {
          const c = GameState.party[i]
          if (!checkItemOnCreature(itemId, c).ok || !GameState.consumeItem(itemId)) return
          this.hooks.toast(applyItemToCreature(itemId, c))
          this.hooks.refreshHud()
          if (GameState.itemCount(itemId) > 0) this.openItemTarget(itemId, bagIndex)
          else this.openBag(0)
        },
        (c) => {
          const check = checkItemOnCreature(itemId, c)
          return check.ok ? null : `${battleName(c)}：${check.reason}`
        },
      ),
      onCancel: () => this.openBag(bagIndex),
    })
  }

  /**
   * 图鉴（普通伙伴）
   * @author zjh
   * @date 2026-10-14
   */
  openDex(): void {
    const { seen, caught } = GameState.dex
    const rows: ListRow[] = DEX_ORDER.map((id) => {
      const sp = SPECIES[id]
      const no = String(sp.dexNo).padStart(2, '0')
      if (caught.includes(id)) {
        return { label: `No.${no} ${sp.name}`, right: '已收服', icon: `spr-${id}`, detail: `[${TYPE_LABEL[sp.type]}] ${sp.desc}` }
      }
      if (seen.includes(id)) {
        return { label: `No.${no} ${sp.name}`, right: '遇见过', icon: `spr-${id}`, detail: `[${TYPE_LABEL[sp.type]}] 遇见过，但还没有成为伙伴。` }
      }
      return { label: `No.${no} ？？？`, icon: `spr-${id}`, iconDim: true, detail: '还没有遇见过。' }
    })
    const caughtCount = caught.filter((id) => DEX_ORDER.includes(id)).length
    this.panel.open({
      title: '伙伴图鉴',
      footer: `收服 ${caughtCount}/${DEX_ORDER.length}`,
      rows,
      onCancel: () => this.openMain(2),
    })
  }

  /**
   * 异象录：唯一精灵与对应异象
   * @author zjh
   * @date 2026-10-14
   */
  openUniqueDex(): void {
    const p = GameState.world.phenomenon
    const rows: ListRow[] = UNIQUE_ORDER.map((id) => {
      const sp = SPECIES[id]
      const def = PHENOMENA.find((d) => d.uniqueSpeciesId === id)
      const got = def ? p.caught.includes(def.id) : false
      const seen = GameState.dex.seen.includes(id)
      const where = def ? `异象「${def.name}」` : '尚未现世的异象'
      if (got) return { label: `✧ ${sp.name}`, right: '已邂逅', icon: `spr-${id}`, detail: `[${TYPE_LABEL[sp.type]}] ${sp.desc}\n来自${where}。` }
      if (seen) return { label: `✧ ${sp.name}`, right: '擦肩而过', icon: `spr-${id}`, detail: `在${where}中见过它。\n${def?.rumorText ?? ''}` }
      return { label: '✧ ？？？', icon: `spr-${id}`, iconDim: true, detail: def ? `传闻：${def.rumorText}` : '关于它的传闻还没有流传开来。' }
    })
    this.panel.open({
      title: '异象录',
      footer: `邂逅 ${p.caught.length}/${UNIQUE_ORDER.length}`,
      rows,
      onCancel: () => this.openMain(3),
    })
  }

  /**
   * 钓鱼记录：未钓到的显示 ？？？；附带今天的钓鱼大赛题目
   * @author zjh
   * @date 2026-10-15
   */
  openFishLog(): void {
    const w = GameState.world
    const contest = todayContest(w, GameState.day())
    const contestText = contest
      ? `\n今日大赛${contest.rain ? '【雨天限定】' : ''}：${SPECIES[contest.speciesId].name} ≥ ${contest.minSize} cm（${contest.claimed ? '已领奖' : contest.done ? '已达标，去找澈领奖' : '进行中'}）`
      : ''
    const rows: ListRow[] = FISH_ORDER.map((id) => {
      const sp = SPECIES[id]
      const rec = w.fishLog?.[id]
      const record = `澈的纪录 ${anglerRecord(id)} cm`
      if (!rec) return { label: '？？？', icon: `spr-${id}`, iconDim: true, detail: `还没有钓到过。\n${record}${contestText}` }
      const beat = beatsRecord(w, id)
      return {
        label: `${beat ? '★ ' : ''}${sp.name}`,
        right: `${rec.count} 次 · 最大 ${rec.best} cm`,
        icon: `spr-${id}`,
        detail: `[${TYPE_LABEL[sp.type]}] ${sp.desc}\n${record}${beat ? '（已打破 ★）' : ''}${contestText}`,
      }
    })
    const broken = FISH_ORDER.filter((id) => beatsRecord(w, id)).length
    this.panel.open({
      title: '钓鱼记录',
      footer: `${fishLogCount(w)}/${FISH_ORDER.length} · 破纪录 ${broken}`,
      rows,
      onCancel: () => this.openMain(5),
    })
  }

  /**
   * 羁绊页（第三章通关后开放）：心形条、阶段与效果、距离下一阶段还差多少
   * @author zjh
   * @date 2026-10-15
   */
  openBond(): void {
    const rows: ListRow[] = GameState.party.map((c) => {
      const stage = bondStage(c.friendship)
      const next = nextBondStage(c.friendship)
      const nextText = next ? `下一阶段「${next.name}」还差 ${next.min - c.friendship}` : '已经心火相连了！'
      return {
        label: battleName(c),
        right: stage.name,
        icon: spriteKey(c),
        detail: `${bondBar(c.friendship)} ${c.friendship}/255\n「${stage.name}」${stage.effect}\n${nextText}`,
      }
    })
    this.panel.open({
      title: '羁绊',
      footer: `胜利 +${FRIENDSHIP_GAIN.win} · 首发走 ${FRIENDSHIP_GAIN.walkSteps} 步 +${FRIENDSHIP_GAIN.walk} · 用药 +${FRIENDSHIP_GAIN.heal} · 全灭 ${FRIENDSHIP_GAIN.wipe}`,
      rows,
      onCancel: () => this.openMain(6),
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
