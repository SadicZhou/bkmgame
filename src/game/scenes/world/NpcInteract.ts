/**
 * 大地图互动分发：剧情脚本 → 服务类 NPC → 训练家 / 连战 / 守护兽 → 普通对话；以及唯一精灵现身
 * @author zjh
 * @date 2026-10-15
 */

import Phaser from 'phaser'
import { createCreature } from '../../data/creatures'
import { npcLines, type NpcDef } from '../../data/maps'
import type { PhenomenonDef } from '../../data/phenomena'
import { GameState } from '../../state/GameState'
import { Sfx } from '../../systems/AudioBeeps'
import { uniqueForBattle } from '../../systems/Phenomenon'
import { rematchCountKey, rematchReady, rematchTeam } from '../../systems/Rematch'
import { dayOf } from '../../systems/WorldClock'
import { runStory, type StoryHost } from './StoryEvents'
import type { WorldHost } from './WorldHost'

/** 唯一精灵等级范围 */
const UNIQUE_LEVEL = { min: 12, max: 50 }

export class NpcInteract {
  private readonly host: WorldHost
  private readonly story: () => StoryHost

  constructor(host: WorldHost, story: () => StoryHost) {
    this.host = host
    this.story = story
  }

  /**
   * 处理面前的唯一精灵或 NPC；两者都没有时返回 false（交给钓鱼等后续判定）
   * @author zjh
   * @date 2026-10-15
   */
  handle(unique: PhenomenonDef | null, npc: NpcDef | null): boolean {
    if (unique) {
      this.approachUnique(unique)
      return true
    }
    if (!npc) return false
    this.talk(npc)
    return true
  }

  /** 训练家开场台词（+ 开战前旁白）→ 开战 */
  challenge(npc: NpcDef): void {
    const lines = [...(npc.challengeLines ?? ['来对战吧！']).map((l) => `${npc.name}：${l}`), ...(npc.preBattleLines ?? [])]
    this.host.dialogue.open(lines, () => this.startTrainerBattle(npc))
  }

  private talk(npc: NpcDef): void {
    const { host } = this
    const say = (lines: string[], after?: () => void) => host.dialogue.open(lines.map((l) => `${npc.name}：${l}`), after)
    if (npc.story && runStory(npc.story, this.story(), npc.name)) return

    switch (npc.role) {
      case 'healer':
        GameState.healAll()
        host.refreshHud()
        host.scene.cameras.main.flash(250, 255, 240, 255)
        Sfx.win()
        say(npc.lines)
        return
      case 'clinic':
        say(npcLines(npc, (k) => !!GameState.getFlag(k)), () => host.services.openClinic())
        return
      case 'board':
        Sfx.confirm()
        host.dialogue.open(host.services.boardLines().map((l) => `【告示板】${l}`))
        return
      case 'storage':
        say(npc.lines, () => host.services.openStorage())
        return
      case 'granny':
        say(npc.lines, () => host.services.openGranny())
        return
      case 'shop':
        say(npc.lines, () => host.menus.openShop(() => say(['欢迎再来！'])))
        return
      case 'trainer':
      case 'boss':
        this.talkFighter(npc, say)
        return
      case 'sign':
      case 'prop':
        Sfx.confirm()
        host.dialogue.open(npc.lines)
        return
      default:
        say(npcLines(npc, (k) => !!GameState.getFlag(k)))
    }
  }

  /**
   * 训练家 / 守护兽：已击败说战后台词；连战第二位在第一位未赢时改为挑战第一位
   * @author zjh
   * @date 2026-10-15
   */
  private talkFighter(npc: NpcDef, say: (lines: string[], after?: () => void) => void): void {
    const beaten = npc.defeatedKey ? GameState.getFlag(npc.defeatedKey) : true
    if (beaten && rematchReady(npc, (k) => GameState.getFlag(k), dayOf(GameState.world.totalSteps))) {
      if (!this.host.hasAbleCreature()) {
        say(['又见面了！不过你的伙伴们看起来很累……休息好了再来找我比一场吧。'])
        return
      }
      say(['又见面了！这几天我和伙伴们也练了不少。', '再来比一场吧——这次可不会输给你！'], () => this.startTrainerBattle(npc, true))
      return
    }
    if (beaten) {
      say(npc.afterLines ?? npc.lines)
      return
    }
    if (!npc.ally && !this.host.hasAbleCreature()) {
      say(['你的伙伴们都累坏了，先去休息吧。'])
      return
    }
    const first = npc.chainFirst ? this.host.map.npcs.find((n) => n.id === npc.chainFirst) : undefined
    const foe = first?.defeatedKey && !GameState.getFlag(first.defeatedKey) ? first : npc
    if (foe !== npc) say(['先过我同伴那一关吧。'], () => this.challenge(foe))
    else this.challenge(npc)
  }

  /**
   * 开启训练家 / 守护兽战；连战会带上下一位对手与失败时要回滚的旗标
   * @author zjh
   * @date 2026-10-14
   */
  private startTrainerBattle(npc: NpcDef, rematch = false): void {
    if (!npc.team?.length) return
    const first = npc.chainFirst ? this.host.map.npcs.find((n) => n.id === npc.chainFirst) : undefined
    const top = Math.max(...GameState.party.map((c) => c.level))
    const team = rematch && npc.defeatedKey ? rematchTeam(npc.team, top, Number(GameState.getFlag(rematchCountKey(npc.defeatedKey)) ?? 0)) : npc.team
    this.host.enterBattle({
      kind: npc.role === 'boss' ? 'boss' : 'trainer',
      rematch,
      enemies: team.map((m) => {
        const foe = createCreature(m.speciesId, m.level)
        if (m.abilityId) foe.abilityId = m.abilityId
        return foe
      }),
      trainerName: npc.name,
      flagOnWin: npc.defeatedKey,
      isBoss: npc.role === 'boss',
      chainNpcId: npc.chainNext,
      chainResetFlags: npc.chainReset ?? (first?.defeatedKey ? [first.defeatedKey] : undefined),
      allyParty: npc.ally?.team.map((m) => createCreature(m.speciesId, m.level)),
      allyName: npc.ally?.name,
      winLines: rematch ? [`${npc.name}：还是你厉害！过几天我再来找你切磋。`] : npc.winLines,
      winFlags: npc.winFlags,
      winItems: npc.winItems,
      stayOnLoss: npc.stayOnLoss,
      lossFlags: npc.lossFlags,
      lossLines: npc.lossLines,
      doubles: npc.doubles,
      ...this.host.returnInfo(),
    })
  }

  /**
   * 走近唯一精灵：现身台词 → 异象战（等级随队伍最高等级，限 12~50）
   * @author zjh
   * @date 2026-10-14
   */
  private approachUnique(def: PhenomenonDef): void {
    const { host } = this
    if (!host.hasAbleCreature()) {
      host.dialogue.open(['它好奇地看着你，可你的伙伴们都累坏了……先去休息吧。'])
      return
    }
    const top = Math.max(...GameState.party.map((c) => c.level))
    const level = Phaser.Math.Clamp(top, UNIQUE_LEVEL.min, UNIQUE_LEVEL.max)
    const enemy = uniqueForBattle(GameState.world, def, level)
    GameState.markSeen(enemy.speciesId)
    const token = GameState.world.phenomenon.token ? ['（异象信物在你掌心发烫。）'] : []
    host.dialogue.open([...def.appearLines, ...token], () => {
      host.enterBattle({ kind: 'unique', enemies: [enemy], phenomenonId: def.id, ...host.returnInfo() }, true)
    })
  }
}
