/**
 * 小镇服务 NPC：旅人告示板、疗愈师（疗愈 / 鉴定 / 休息）、伙伴寄存所、记忆婆婆（遗忘 / 回忆）
 * @author zjh
 * @date 2026-10-14
 */

import { MOVES, SPECIES, battleName, fullSlot, spriteKey, MAX_MOVES, type CreatureInstance } from '../data/creatures'
import { PARTY_LIMIT } from '../data/items'
import { MAPS } from '../data/maps'
import { PHENOMENA, PHENOMENON_RULES } from '../data/phenomena'
import { minorBoardLine } from '../systems/EventHints'
import { CHICKS, CHICKS_DONE_FLAG, chicksHomeCount } from '../systems/ChickQuest'
import { ECHO_DONE, ECHO_STAGES, echoStagesCleared } from '../systems/EchoQuest'
import {
  CARAVAN_DONE,
  CARAVAN_NEED,
  caravanStormsDone,
} from '../systems/CaravanQuest'
import {
  HOUSES,
  LAMPS_DONE,
  WICK_SPOTS,
  lampsActive,
  lampsDelivered,
  wicksPicked,
} from '../systems/HouseLampQuest'
import { NOTE_PAGES, NOTES_DONE, notesActive, notesCollected } from '../systems/NoteQuest'
import { LAMP_PARTS, WANG_LAMP_DONE, lampPartsCount, wangLampActive } from '../systems/PaperLampQuest'
import { SNOWMAN_DONE_FLAG, SNOWMAN_PARTS, snowmanPartsCount } from '../systems/SnowmanQuest'
import { LETTERS_DONE_FLAG, lettersActive, lettersDelivered, LETTER_FLAGS } from '../systems/LetterQuest'
import { WEATHER_INFO } from '../data/weather'
import { GameState } from '../state/GameState'
import { Sfx } from '../systems/AudioBeeps'
import { activePhenomenon } from '../systems/Phenomenon'
import { isFullMoon, isNight, restUntil, stepsToNextPhase, timeLabel } from '../systems/WorldClock'
import { creatureDetail, rowLabel } from './CreatureInfo'
import type { ListPanel, ListRow } from './ListPanel'
import { moveInfo, openMoveReplace } from './MoveLearnFlow'

/** 记忆婆婆「回忆」技能的费用 */
export const RECALL_COST = 50

export interface TownHooks {
  /** NPC 对话（自动加说话人前缀） */
  say: (lines: string[], after?: () => void) => void
  toast: (msg: string) => void
  refreshHud: () => void
  /** 疗愈特效 */
  onHeal: () => void
  /** 时间 / 天气被改变（休息）后刷新场景表现 */
  onWorldChanged: () => void
}

export class TownServices {
  private readonly panel: ListPanel
  private readonly hooks: TownHooks

  constructor(panel: ListPanel, hooks: TownHooks) {
    this.panel = panel
    this.hooks = hooks
  }

  // ───────────────────────── 告示板 ─────────────────────────

  /**
   * 告示板内容：日期时段、各地天气、进行中的事件、传闻
   * @author zjh
   * @date 2026-10-14
   */
  boardLines(): string[] {
    const w = GameState.world
    const lines: string[] = []
    const next = isNight(w.totalSteps) ? '天亮' : '入夜'
    lines.push(`第 ${GameState.day()} 天 · ${timeLabel(w.totalSteps)} · 再走 ${stepsToNextPhase(w.totalSteps)} 步${next}。`)
    const weather = GameState.unlockedOutdoorMaps()
      .map((id) => {
        const wt = GameState.weatherAt(id)
        return wt ? `${MAPS[id].name} ${WEATHER_INFO[wt].icon}${WEATHER_INFO[wt].label}` : ''
      })
      .filter(Boolean)
      .join('，')
    lines.push(`天气：${weather}。约 ${Math.max(0, w.nextWeatherRoll - w.totalSteps)} 步后天气会变化。`)

    const def = activePhenomenon(w)
    if (def) {
      const total = PHENOMENON_RULES.goalCount[def.goal]
      const goal = w.phenomenon.token ? '已获得异象信物' : `${def.goalLabel} ${w.phenomenon.goalDone}/${total}`
      lines.push(`【异象进行中】「${def.name}」出现在${MAPS[def.mapId].name}！还剩约 ${w.phenomenon.stepsLeft} 步。（${goal}）`)
    }
    const minorLine = minorBoardLine(w)
    if (minorLine) lines.push(minorLine)
    if (lettersActive() && !GameState.hasFlag(LETTERS_DONE_FLAG)) {
      lines.push(`【风羽的信】鸢拜托你把短信送给苔、峰、汐、锤婆、雪伯。（已送 ${lettersDelivered()}/${LETTER_FLAGS.length}）`)
    }
    if (GameState.hasFlag('side_chicks') && !GameState.hasFlag(CHICKS_DONE_FLAG)) {
      lines.push(`【迷路的雏鸟】把羽毛岛的雏鸟送回各岛空巢。（已回家 ${chicksHomeCount()}/${CHICKS.length}）`)
    }
    if (GameState.hasFlag('side_snowman') && !GameState.hasFlag(SNOWMAN_DONE_FLAG)) {
      lines.push(`【雪人大赛】收集圆雪球、炭眼睛、冰胡萝卜，在山麓雪人台堆雪人。（${snowmanPartsCount()}/${SNOWMAN_PARTS.length}）`)
    }
    if (wangLampActive() || GameState.hasFlag('side_wang_lamp_started')) {
      if (!GameState.hasFlag(WANG_LAMP_DONE)) {
        const moon = isFullMoon(w.totalSteps) ? '今夜是满月，可放灯。' : '等满月夜到霜铃峰北口石台放灯。'
        lines.push(`【望的纸灯】材料 ${lampPartsCount()}/${LAMP_PARTS.length}。${moon}`)
      }
    }
    if (GameState.hasFlag('side_echo') && !GameState.hasFlag(ECHO_DONE)) {
      lines.push(`【霜铃的回响】限步冰滑挑战（${echoStagesCleared()}/${ECHO_STAGES.length}）。铃殿里的回响之铃。`)
    }
    if (notesActive() || GameState.hasFlag('side_notes_started')) {
      if (!GameState.hasFlag(NOTES_DONE)) {
        lines.push(
          `【阿禾的旧笔记】收集散页（${notesCollected()}/${NOTE_PAGES.length}）：草地、湖畔、回音林、锤音镇、星砂荒原。交回阿禾旁旧书架。`,
        )
      }
    }
    if (lampsActive() || GameState.hasFlag('side_lamps_started')) {
      if (!GameState.hasFlag(LAMPS_DONE)) {
        lines.push(
          `【一家一盏灯】灯芯 ${wicksPicked()}/${WICK_SPOTS.length}，已送 ${lampsDelivered()}/${HOUSES.length} 户。广场灯芯筐接任务。`,
        )
      }
    }
    if (GameState.hasFlag('side_caravan_started') && !GameState.hasFlag(CARAVAN_DONE)) {
      lines.push(
        `【沙丘商队】护送沙暴（${caravanStormsDone()}/${CARAVAN_NEED}）。星砂荒原南侧找驼队，沙暴中接任务。`,
      )
    } else if (GameState.hasFlag(CARAVAN_DONE)) {
      lines.push('【沙丘商队】驼队货摊已开：满格电池、资质卡。')
    }
    if (w.lureSteps > 0) lines.push(`引兽铃还在响，剩 ${w.lureSteps} 步。`)
    if (w.repelSteps > 0) lines.push(`驱兽香还有效，剩 ${w.repelSteps} 步。`)
    lines.push(this.rumor())
    return lines
  }

  private rumor(): string {
    const p = GameState.world.phenomenon
    const pool = PHENOMENA.filter((d) => GameState.getFlag(d.unlockFlag) && !p.caught.includes(d.id))
    if (!GameState.getFlag('boss_beaten')) return '传闻：据说山巅的火种安定之后，各地会出现奇异的景象……'
    if (!pool.length) return '传闻：最近各地都很平静。也许还有更多异象，等着在未来被发现。'
    const d = pool[Math.floor(Math.random() * pool.length)]
    const cd = p.cooldownUntilDay[d.id]
    const cdText = cd && cd > GameState.day() ? `（这阵子「${d.name}」不会再出现，要等到第 ${cd} 天。）` : ''
    return `传闻：${d.rumorText}${cdText}`
  }

  // ───────────────────────── 疗愈师 ─────────────────────────

  /**
   * 疗愈师：疗愈、资质鉴定、休息到天亮 / 夜晚
   * @author zjh
   * @date 2026-10-14
   */
  openClinic(index = 0): void {
    const unappraised = GameState.party.filter((c) => !c.appraised).length
    this.panel.open({
      title: '疗愈师岚',
      index,
      rows: [
        {
          label: '疗愈伙伴',
          detail: '回满 HP、PP，解除异常状态。',
          onSelect: () => {
            this.panel.close()
            GameState.healAll()
            this.hooks.onHeal()
            this.hooks.refreshHud()
            this.hooks.say(['大家都恢复精神了。路上小心哦。'])
          },
        },
        {
          label: '资质鉴定',
          right: unappraised ? `${unappraised} 只未鉴定` : '全部已鉴定',
          detail: '免费鉴定队伍伙伴的资质，显示每项星级与总和。',
          onSelect: () => this.openAppraise(),
        },
        { label: '休息到天亮', detail: '在小屋睡一觉，直接到下一个白天（伙伴同时恢复）。', onSelect: () => this.rest('day') },
        { label: '休息到夜晚', detail: '在小屋等到入夜（伙伴同时恢复）。有些伙伴和异象只在夜里出现。', onSelect: () => this.rest('night') },
        { label: '离开', onSelect: () => this.panel.close() },
      ],
    })
  }

  private openAppraise(index = 0): void {
    const rows: ListRow[] = GameState.party.map((c, i) => ({
      label: rowLabel(c),
      right: c.appraised ? '已鉴定' : '未鉴定',
      icon: spriteKey(c),
      detail: creatureDetail(c),
      onSelect: () => {
        if (!c.appraised) {
          c.appraised = true
          Sfx.win()
          this.hooks.toast(`${battleName(c)} 的资质揭晓了！`)
        }
        this.openAppraise(i)
      },
    }))
    rows.push({
      label: '全部鉴定',
      detail: '一次鉴定队伍里所有伙伴。',
      disabled: GameState.party.every((c) => c.appraised),
      onSelect: () => {
        GameState.party.forEach((c) => (c.appraised = true))
        Sfx.win()
        this.hooks.toast('队伍伙伴的资质全部揭晓了！')
        this.openAppraise(0)
      },
    })
    this.panel.open({ title: '资质鉴定', rows, index, onCancel: () => this.openClinic(1) })
  }

  private rest(target: 'day' | 'night'): void {
    this.panel.close()
    restUntil(GameState.world, target)
    GameState.healAll()
    this.hooks.onHeal()
    this.hooks.onWorldChanged()
    this.hooks.refreshHud()
    const w = GameState.world
    this.hooks.say([target === 'day' ? '你在小屋里美美地睡了一觉。' : '你在窗边坐着，看着太阳慢慢落下。', `现在是第 ${GameState.day()} 天 · ${timeLabel(w.totalSteps)}。`])
  }

  // ───────────────────────── 寄存所 ─────────────────────────

  /**
   * 寄存所：存入、取出、放生（唯一精灵不可放生，放生需二次确认）
   * @author zjh
   * @date 2026-10-14
   */
  openStorage(index = 0): void {
    const party = GameState.party
    const storage = GameState.storage
    this.panel.open({
      title: '伙伴寄存所',
      footer: `队伍 ${party.length}/${PARTY_LIMIT} · 寄存 ${storage.length} 只`,
      index,
      rows: [
        { label: '存入伙伴', disabled: party.length <= 1, detail: party.length <= 1 ? '队伍里至少要留 1 只伙伴。' : '把队伍里的伙伴送到寄存所。', onSelect: () => this.openDeposit() },
        {
          label: '取出伙伴',
          disabled: !storage.length || party.length >= PARTY_LIMIT,
          detail: !storage.length ? '寄存所里还没有伙伴。' : party.length >= PARTY_LIMIT ? '队伍已满，先存入一只吧。' : '把寄存的伙伴带回队伍。',
          onSelect: () => this.openWithdraw(),
        },
        { label: '放生伙伴', disabled: !storage.length, detail: '让寄存所里的伙伴回归自然（无法撤销）。', onSelect: () => this.openRelease() },
        { label: '离开', onSelect: () => this.panel.close() },
      ],
    })
  }

  private storageRow(c: CreatureInstance, onSelect: () => void, disabledReason?: string): ListRow {
    return {
      label: rowLabel(c),
      right: `HP ${c.hp}/${c.maxHp}`,
      icon: spriteKey(c),
      detail: disabledReason ?? creatureDetail(c),
      disabled: !!disabledReason,
      onSelect,
    }
  }

  private openDeposit(): void {
    const party = GameState.party
    const alive = party.filter((c) => c.hp > 0).length
    const rows = party.map((c, i) =>
      this.storageRow(
        c,
        () => {
          party.splice(i, 1)
          GameState.storage.push(c)
          this.hooks.toast(`${battleName(c)} 去寄存所休息了`)
          this.hooks.refreshHud()
          if (party.length > 1) this.openDeposit()
          else this.openStorage(0)
        },
        c.hp > 0 && alive <= 1 ? '它是队伍里唯一还能战斗的伙伴。' : undefined,
      ),
    )
    this.panel.open({ title: '存入哪只？', rows, onCancel: () => this.openStorage(0) })
  }

  private openWithdraw(): void {
    const storage = GameState.storage
    const rows = storage.map((c, i) =>
      this.storageRow(c, () => {
        storage.splice(i, 1)
        GameState.party.push(c)
        this.hooks.toast(`${battleName(c)} 回到了队伍`)
        this.hooks.refreshHud()
        if (storage.length && GameState.party.length < PARTY_LIMIT) this.openWithdraw()
        else this.openStorage(1)
      }),
    )
    this.panel.open({ title: '取出哪只？', rows, onCancel: () => this.openStorage(1) })
  }

  private openRelease(): void {
    const storage = GameState.storage
    const rows = storage.map((c, i) =>
      this.storageRow(
        c,
        () => this.confirmRelease(i),
        SPECIES[c.speciesId].rarity === 'unique' ? '异象中邂逅的唯一精灵，无法放生。' : undefined,
      ),
    )
    this.panel.open({ title: '放生哪只？', rows, onCancel: () => this.openStorage(2) })
  }

  private confirmRelease(i: number): void {
    const c = GameState.storage[i]
    if (!c) return
    this.panel.open({
      title: `真的要让 ${battleName(c)} 离开吗？`,
      rows: [
        {
          label: '是的，放生',
          detail: c.shiny ? '✦ 它是异色伙伴！放生后无法找回。' : '放生后无法找回。',
          onSelect: () => {
            GameState.storage.splice(i, 1)
            this.hooks.toast(`${battleName(c)} 回头看了你一眼，跑进了草丛`)
            if (GameState.storage.length) this.openRelease()
            else this.openStorage(2)
          },
        },
        { label: '再想想', onSelect: () => this.openRelease() },
      ],
      onCancel: () => this.openRelease(),
    })
  }

  // ───────────────────────── 记忆婆婆 ─────────────────────────

  /**
   * 记忆婆婆：遗忘技能（免费，至少保留 1 个）/ 回忆技能（50 焰币）
   * @author zjh
   * @date 2026-10-14
   */
  openGranny(index = 0): void {
    this.panel.open({
      title: '记忆婆婆',
      footer: `焰币 ${GameState.coins}`,
      index,
      rows: [
        { label: '遗忘技能', detail: '免费。让伙伴忘掉一个技能（至少保留 1 个）。', onSelect: () => this.pickCreature('forget') },
        { label: '回忆技能', right: `${RECALL_COST} 焰币`, detail: '让伙伴想起学习表中等级已达到、但没掌握的技能。', onSelect: () => this.pickCreature('recall') },
        { label: '离开', onSelect: () => this.panel.close() },
      ],
    })
  }

  private recallable(c: CreatureInstance): string[] {
    const known = new Set(c.moves.map((m) => m.id))
    const list: string[] = []
    for (const e of SPECIES[c.speciesId].learnset) {
      if (e.level <= c.level && !known.has(e.moveId) && !list.includes(e.moveId)) list.push(e.moveId)
    }
    return list
  }

  private pickCreature(mode: 'forget' | 'recall'): void {
    const rows: ListRow[] = GameState.party.map((c) => {
      const reason =
        mode === 'forget'
          ? c.moves.length <= 1
            ? '只剩一个技能了，不能再忘。'
            : undefined
          : !this.recallable(c).length
            ? '没有可以回忆的技能。'
            : undefined
      return {
        label: rowLabel(c),
        icon: spriteKey(c),
        detail: reason ?? creatureDetail(c),
        disabled: !!reason,
        onSelect: () => (mode === 'forget' ? this.openForget(c) : this.openRecall(c)),
      }
    })
    this.panel.open({ title: mode === 'forget' ? '要让谁遗忘技能？' : '要让谁回忆技能？', rows, onCancel: () => this.openGranny(mode === 'forget' ? 0 : 1) })
  }

  private openForget(c: CreatureInstance): void {
    const rows: ListRow[] = c.moves.map((slot, i) => {
      const m = MOVES[slot.id]
      return {
        label: `忘掉 ${m.name}`,
        detail: moveInfo(m, slot.pp),
        onSelect: () => {
          this.panel.open({
            title: `${battleName(c)} 真的要忘掉 ${m.name} 吗？`,
            rows: [
              {
                label: '忘掉',
                onSelect: () => {
                  c.moves.splice(i, 1)
                  this.hooks.toast(`${battleName(c)} 忘掉了 ${m.name}`)
                  this.openGranny(0)
                },
              },
              { label: '算了', onSelect: () => this.openForget(c) },
            ],
            onCancel: () => this.openForget(c),
          })
        },
      }
    })
    this.panel.open({ title: `${battleName(c)} 要忘掉哪个技能？`, rows, onCancel: () => this.pickCreature('forget') })
  }

  private openRecall(c: CreatureInstance): void {
    const rows: ListRow[] = this.recallable(c).map((id) => {
      const m = MOVES[id]
      return {
        label: m.name,
        right: `${RECALL_COST} 焰币`,
        detail: moveInfo(m),
        onSelect: () => {
          if (GameState.coins < RECALL_COST) {
            Sfx.cancel()
            this.hooks.toast('焰币不够哦')
            return
          }
          const pay = (msg: string) => {
            if (c.moves.some((s) => s.id === id)) GameState.coins -= RECALL_COST
            this.hooks.refreshHud()
            this.panel.close()
            this.hooks.say([msg])
          }
          if (c.moves.length < MAX_MOVES) {
            c.moves.push(fullSlot(id))
            pay(`${battleName(c)} 想起了 ${m.name}！`)
          } else {
            openMoveReplace(this.panel, c, id, pay)
          }
        },
      }
    })
    this.panel.open({ title: `${battleName(c)} 想回忆哪个技能？`, footer: `焰币 ${GameState.coins}`, rows, onCancel: () => this.pickCreature('recall') })
  }
}
