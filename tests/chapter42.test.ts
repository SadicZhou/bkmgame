/**
 * 支线 S0-2 小镇送信
 * @author zjh
 * @date 2026-11-09
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { GameState } from '../src/game/state/GameState'
import {
  TOWN_MAIL_DONE,
  TOWN_MAIL_REWARD_COUNT,
  TOWN_MAIL_REWARD_ITEM,
  TOWN_MAIL_STARTED,
  TOWN_MAILS,
  canDeliverTownMail,
  deliverTownMail,
  talkTownMailElder,
  townMailsDelivered,
} from '../src/game/systems/TownMailQuest'

describe('小镇送信 S0-2', () => {
  beforeEach(() => {
    GameState.newGame()
  })

  it('M-01 阿禾接取后可向四户送信', () => {
    expect(talkTownMailElder().kind).toBe('start')
    expect(GameState.hasFlag(TOWN_MAIL_STARTED)).toBe(true)
    expect(talkTownMailElder().kind).toBe('wait')
    for (const m of TOWN_MAILS) {
      const npc = { id: m.npcIds[0], name: m.place, x: 0, y: 0, color: 0, lines: [] }
      expect(canDeliverTownMail(npc)?.id).toBe(m.id)
    }
  })

  it('M-02 送齐四封回阿禾得急救喷雾 ×3', () => {
    talkTownMailElder()
    for (const m of TOWN_MAILS) {
      const r = deliverTownMail(m, m.place)
      expect(GameState.hasFlag(m.flag)).toBe(true)
      if (townMailsDelivered() < TOWN_MAILS.length) expect(r.allDone).toBe(false)
      else expect(r.allDone).toBe(true)
    }
    expect(townMailsDelivered()).toBe(4)
    const before = GameState.itemCount(TOWN_MAIL_REWARD_ITEM)
    const r = talkTownMailElder()
    expect(r.kind).toBe('reward')
    expect(GameState.hasFlag(TOWN_MAIL_DONE)).toBe(true)
    expect(GameState.itemCount(TOWN_MAIL_REWARD_ITEM)).toBe(before + TOWN_MAIL_REWARD_COUNT)
    expect(talkTownMailElder().kind).toBe('skip')
  })
})
