/**
 * 大地图菜单：主菜单、队伍、背包、图鉴、异象录、商店
 * 全部基于同一个 ListPanel，通过 onCancel 回到上一级。
 * @author zjh
 * @date 2026-10-14
 */

import { DEX_ORDER, SPECIES, TYPE_LABEL, UNIQUE_ORDER, battleName, spriteKey, type CreatureInstance } from '../data/creatures'
import { BADGES, ownedBadges } from '../data/badges'
import { FISH_ORDER } from '../data/fishing'
import { BAG_PAGES, ITEMS, ITEM_ORDER, SHOP_STOCK, itemIconKey, type ItemKind } from '../data/items'
import { MUSH_FLAGS } from '../data/mushrooms'
import { PHENOMENA } from '../data/phenomena'
import { GameState } from '../state/GameState'
import { nightTownActive } from '../systems/Night'
import { Sfx } from '../systems/AudioBeeps'
import { applyItemToCreature, checkItemOnCreature } from '../systems/BattleLogic'
import { BEACONS, DUNE_FLAGS } from '../systems/Dunes'
import { BOND_FLAG, FRIENDSHIP_GAIN, bondBar, bondStage, nextBondStage } from '../systems/Bond'
import { anglerRecord, beatsRecord, fishLogCount, todayContest } from '../systems/FishLog'
import { rockSlideReason, teachRockSlide } from '../systems/MoveBooks'
import { companionMark, companionRows } from './CompanionRows'
import { abilityDetail, creatureDetail, rowLabel } from './CreatureInfo'
import { ListPanel, type ListRow } from './ListPanel'
import { GLIDE_SPOTS } from '../systems/Cloud'
import { BOARD_FLAG, BOARD_ID, boardBlock } from '../systems/Vehicle'
import { MAPS } from '../data/maps'
import { openTalentFruit } from './TalentFruitMenu'

export interface WorldMenuHooks {
  toast: (msg: string) => void
  refreshHud: () => void
  backToTitle: () => void
  /** 当前地图能不能展开载具 */
  outdoor: () => boolean
  /** 滑翔到另一张地图的出生点 */
  travel: (mapId: string, x: number, y: number) => void
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
        { label: '背包', detail: '回复、野外、重要物品和载具。每件东西都有自己的图。', onSelect: () => this.openBag() },
        { label: '图鉴', right: `${caught}/${DEX_ORDER.length}`, detail: '记录遇见与收服过的伙伴。', onSelect: () => this.openDex() },
        { label: '异象录', right: `${uniques}/${UNIQUE_ORDER.length}`, detail: '记录在异象中邂逅的唯一精灵。', onSelect: () => this.openUniqueDex() },
        {
          label: '徽记',
          right: `${badges.length}/${Object.keys(BADGES).length}`,
          detail:
            (badges.length ? badges.map((b) => `◆ ${b.name}：${b.desc}`).join('\n') : '击败各章节的守护兽后可以获得徽记。') +
            (GameState.hasFlag(MUSH_FLAGS.title) ? '\n称号：菇菇朋友（伞灵菇老奶奶）' : '') +
            (GameState.hasFlag('champion_title') ? '\n称号：焰迹冠军' : ''),
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
        ...(GameState.hasFlag(DUNE_FLAGS.chart)
          ? [{ label: '星图', right: `${BEACONS.filter((b) => GameState.hasFlag(b.flag)).length}/${BEACONS.length}`, detail: '九座灯台，亮过的星才会写上名字。', onSelect: () => this.openStarChart() }]
          : []),
        ...(GameState.hasFlag('chapter7_done') && GameState.itemCount('star_glider') > 0
          ? [{ label: '滑翔', detail: '飞到已经去过的灯台。落在镇子或入口，不落在首领面前。', onSelect: () => this.openGlide() }]
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

  /**
   * 滑翔到已经去过的灯台
   * @author zjh
   * @date 2026-10-16
   */
  private openGlide(): void {
    const rows: ListRow[] = GLIDE_SPOTS.filter((s) => GameState.hasFlag(s.flag)).map((s) => ({
      label: s.name,
      detail: `落到${s.name}。`,
      onSelect: () => {
        const spawn = MAPS[s.mapId]?.spawn
        if (!spawn) return
        this.panel.close()
        this.hooks.travel(s.mapId, spawn.x, spawn.y)
      },
    }))
    if (!rows.length) rows.push({ label: '还没有能降落的地方', disabled: true })
    this.panel.open({ title: '滑翔', rows, onCancel: () => this.openMain() })
  }

  private partyRows(onPick: (i: number) => void, filter?: (c: CreatureInstance) => string | null): ListRow[] {
    return GameState.party.map((c, i) => {
      const reason = filter?.(c) ?? null
      return {
        label: rowLabel(c, (i === 0 ? '★ ' : '') + companionMark(c)),
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
        ...companionRows(c, (msg) => {
          this.hooks.toast(msg)
          this.openCreature(i)
        }),
        { label: '特性说明', detail: abilityDetail(c) },
        { label: '返回', detail, onSelect: () => this.openParty(i) },
      ],
      onCancel: () => this.openParty(i),
    })
  }

  /**
   * 背包首页：回复 / 野外 / 重要 / 载具
   * @author zjh
   * @date 2026-10-16
   */
  openBag(index = 0): void {
    const rows: ListRow[] = BAG_PAGES.map((page) => {
      const n = this.pageIds(page.kinds).length
      const sample = this.pageIds(page.kinds)[0]
      return {
        label: page.name,
        right: n ? `${n} 种` : '空',
        icon: itemIconKey(sample ?? { heal: 'potion', field: 'soothe_berry', key: 'dust_badge', ride: BOARD_ID }[page.id]),
        detail: page.hint,
        onSelect: () => this.openBagPage(page.id),
      }
    })
    this.panel.open({ title: '背包', footer: this.coinsFooter(), index, rows, onCancel: () => this.openMain(1) })
  }

  /** 某一页里的道具 */
  private openBagPage(pageId: (typeof BAG_PAGES)[number]['id'], index = 0): void {
    const page = BAG_PAGES.find((p) => p.id === pageId) ?? BAG_PAGES[0]
    const ids = this.pageIds(page.kinds)
    const w = GameState.world
    const rows: ListRow[] = ids.map((id, i) => {
      const it = ITEMS[id]
      const active = it.kind === 'lure' && w.lureSteps > 0 ? `\n剩余 ${w.lureSteps} 步` : it.kind === 'repel' && w.repelSteps > 0 ? `\n剩余 ${w.repelSteps} 步` : ''
      const riding = id === BOARD_ID && GameState.hasFlag(BOARD_FLAG) ? '\n滑板已经展开。' : ''
      return {
        label: it.name,
        right: it.kind === 'vehicle' ? (GameState.hasFlag(BOARD_FLAG) ? '展开中' : '收起') : `×${GameState.itemCount(id)}`,
        icon: itemIconKey(id),
        detail: `${it.desc}${active}${riding}`,
        onSelect: () => this.useBagItem(id, it.kind, i, pageId),
      }
    })
    if (!rows.length) {
      rows.push({
        label: pageId === 'ride' ? '还没有载具' : '（这一页是空的）',
        disabled: true,
        detail: pageId === 'ride' ? '晨曦小镇的杂货铺有一辆折叠滑板。' : '去晨曦小镇的杂货商那里看看吧。',
      })
    }
    this.panel.open({
      title: `背包 · ${page.name}`,
      footer: this.coinsFooter(),
      index,
      rows,
      onCancel: () => this.openBag(BAG_PAGES.findIndex((p) => p.id === pageId)),
    })
  }

  private pageIds(kinds: ItemKind[]): string[] {
    return ITEM_ORDER.filter((id) => GameState.itemCount(id) > 0 && kinds.includes(ITEMS[id].kind))
  }

  /** 按种类使用：载具展开、重要物品提示用法、其余沿用原来的流程 */
  private useBagItem(id: string, kind: ItemKind, index: number, pageId: (typeof BAG_PAGES)[number]['id']): void {
    if (kind === 'vehicle') {
      this.toggleBoard(pageId, index)
      return
    }
    if (id === 'book_rock_slide') {
      this.openRockBook(index, pageId)
      return
    }
    if (kind === 'key') {
      this.hooks.toast(id.endsWith('_rod') ? '面朝水面按确认就能钓鱼' : ITEMS[id].desc)
      Sfx.cancel()
      return
    }
    if (kind === 'catch') {
      this.hooks.toast('只能在野生战斗中使用')
      Sfx.cancel()
      return
    }
    if (kind === 'lure' || kind === 'repel') {
      this.useFieldItem(id, index, pageId)
      return
    }
    if (kind === 'talent') {
      openTalentFruit(this.panel, id, { ...this.hooks, back: () => this.openBagPage(pageId, 0) })
      return
    }
    this.openItemTarget(id, index, pageId)
  }

  /** 展开或收起折叠滑板 */
  private toggleBoard(pageId: (typeof BAG_PAGES)[number]['id'], index: number): void {
    if (GameState.hasFlag(BOARD_FLAG)) {
      GameState.clearFlag(BOARD_FLAG)
      this.hooks.toast('滑板收起来了')
      this.hooks.refreshHud()
      this.openBagPage(pageId, index)
      return
    }
    const block = boardBlock({
      owned: GameState.itemCount(BOARD_ID) > 0,
      outdoor: this.hooks.outdoor(),
      petRiding: !!GameState.hasFlag('pet_riding'),
    })
    if (block) {
      this.hooks.toast(block)
      Sfx.cancel()
      return
    }
    GameState.setFlag(BOARD_FLAG, true)
    this.hooks.toast('滑板展开了，走起来会更快')
    this.hooks.refreshHud()
    this.openBagPage(pageId, index)
  }

  /** 技能书·岩崩：选一只学得会的伙伴 */
  private openRockBook(bagIndex: number, pageId: (typeof BAG_PAGES)[number]['id']): void {
    this.panel.open({
      title: '把岩崩教给谁？',
      rows: this.partyRows(
        (i) => {
          const c = GameState.party[i]
          if (rockSlideReason(c) || !GameState.consumeItem('book_rock_slide')) return
          this.hooks.toast(teachRockSlide(c))
          if (GameState.itemCount('book_rock_slide') > 0) this.openRockBook(bagIndex, pageId)
          else this.openBagPage(pageId, 0)
        },
        (c) => rockSlideReason(c),
      ),
      onCancel: () => this.openBagPage(pageId, bagIndex),
    })
  }

  /** 引兽铃与驱兽喷雾互斥：用一个会抵消另一个 */
  private useFieldItem(itemId: string, bagIndex: number, pageId: (typeof BAG_PAGES)[number]['id']): void {
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
    const left = this.pageIds(BAG_PAGES.find((p) => p.id === pageId)?.kinds ?? []).length
    this.openBagPage(pageId, Math.min(bagIndex, Math.max(0, left - 1)))
  }

  private openItemTarget(itemId: string, bagIndex: number, pageId: (typeof BAG_PAGES)[number]['id']): void {
    const it = ITEMS[itemId]
    this.panel.open({
      title: `对谁使用 ${it.name}？`,
      rows: this.partyRows(
        (i) => {
          const c = GameState.party[i]
          if (!checkItemOnCreature(itemId, c).ok || !GameState.consumeItem(itemId)) return
          this.hooks.toast(applyItemToCreature(itemId, c))
          this.hooks.refreshHud()
          if (GameState.itemCount(itemId) > 0) this.openItemTarget(itemId, bagIndex, pageId)
          else this.openBagPage(pageId, 0)
        },
        (c) => {
          const check = checkItemOnCreature(itemId, c)
          return check.ok ? null : `${battleName(c)}：${check.reason}`
        },
      ),
      onCancel: () => this.openBagPage(pageId, bagIndex),
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
  /**
   * 星图：九座灯台，亮过的才写上名字
   * @author zjh
   * @date 2026-10-16
   */
  openStarChart(): void {
    const rows: ListRow[] = BEACONS.map((b, i) => {
      const lit = GameState.hasFlag(b.flag)
      return {
        label: lit ? `★ ${b.name}之灯台` : `？ 第 ${i + 1} 颗星`,
        right: lit ? '已亮' : '未明',
        detail: lit ? '这颗星已经写进星图。' : '穗说，走到那里才会知道它的名字。',
      }
    })
    const index = 6 + (GameState.hasFlag(BOND_FLAG) ? 1 : 0)
    this.panel.open({ title: '星图', rows, onCancel: () => this.openMain(index) })
  }

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
      [...SHOP_STOCK, BOARD_ID].map((id) => {
        const it = ITEMS[id]
        const ownedBoard = it.kind === 'vehicle' && GameState.itemCount(id) > 0
        const half = nightTownActive('town', (k) => GameState.hasFlag(k)) && it.price > 0
        const price = half ? Math.max(1, Math.ceil(it.price / 2)) : it.price
        return {
          label: it.name,
          right: ownedBoard ? '已经有了' : `${half ? '半价 ' : ''}${price} 焰币 · 持有 ${GameState.itemCount(id)}`,
          icon: itemIconKey(id),
          detail: it.desc,
          disabled: ownedBoard,
          onSelect: () => {
            if (it.kind === 'vehicle' && GameState.itemCount(id) > 0) return
            if (GameState.coins < price) {
              Sfx.cancel()
              this.hooks.toast('焰币不够哦')
              return
            }
            GameState.coins -= price
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
