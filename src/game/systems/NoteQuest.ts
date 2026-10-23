/**
 * 支线 S8-2「阿禾的旧笔记」：第八章后从书架接任务，五处地图捡笔记页，交回得技能书心火共鸣
 * @author zjh
 * @date 2026-10-23
 */

import { GameState } from '../state/GameState'

/** 一页旅团笔记 */
export interface NotePage {
  id: string
  /** 道具与旗标共用前缀 note_ */
  itemId: string
  flag: string
  name: string
  place: string
  mapId: string
  x: number
  y: number
  /** 捡起时短句 */
  findLine: string
}

export const NOTE_PAGES: NotePage[] = [
  {
    id: 'ember',
    itemId: 'note_ember',
    flag: 'got_note_ember',
    name: '余烬页',
    place: '青苔草地',
    mapId: 'meadow',
    x: 3,
    y: 9,
    findLine: '草丛边压着一页发黄的笔记，边上画着小火苗。',
  },
  {
    id: 'tide',
    itemId: 'note_tide',
    flag: 'got_note_tide',
    name: '雾泉页',
    place: '雾泉湖畔',
    mapId: 'lake',
    x: 4,
    y: 12,
    findLine: '码头木板缝里夹着一页，墨迹被水汽洇开了。',
  },
  {
    id: 'leaf',
    itemId: 'note_leaf',
    flag: 'got_note_leaf',
    name: '回音页',
    place: '回音林',
    mapId: 'forest',
    x: 4,
    y: 26,
    findLine: '树根旁卷着一页，页角画着铃铛。',
  },
  {
    id: 'stone',
    itemId: 'note_stone',
    flag: 'got_note_stone',
    name: '磐谷页',
    place: '锤音镇',
    mapId: 'hammer',
    x: 10,
    y: 5,
    findLine: '炉边石台上压着一页，沾了一点铁屑。',
  },
  {
    id: 'volt',
    itemId: 'note_volt',
    flag: 'got_note_volt',
    name: '星砂页',
    place: '星砂荒原',
    mapId: 'dunes',
    x: 14,
    y: 6,
    findLine: '沙窝里露出一页，边角被雷光照过似的发黄。',
  },
]

export const NOTES_DONE = 'side_notes_done'
export const NOTES_STARTED = 'side_notes_started'
export const BOOK_HEART = 'book_heart_echo'

export function notesCollected(): number {
  return NOTE_PAGES.filter((p) => GameState.hasFlag(p.flag) || GameState.itemCount(p.itemId) > 0).length
}

export function notesReady(): boolean {
  return NOTE_PAGES.every((p) => GameState.itemCount(p.itemId) > 0 || GameState.hasFlag(p.flag))
}

export function notesActive(): boolean {
  return GameState.hasFlag('chapter8_done') && !GameState.hasFlag(NOTES_DONE)
}

/**
 * 捡起一页笔记
 * @author zjh
 * @date 2026-10-23
 */
export function pickNotePage(pageId: string): { lines: string[] } | { reason: string } {
  if (!GameState.hasFlag('chapter8_done')) return { reason: '（现在还不是翻旧纸的时候。）' }
  const page = NOTE_PAGES.find((p) => p.id === pageId)
  if (!page) return { reason: '没有这一页。' }
  if (GameState.hasFlag(page.flag) || GameState.itemCount(page.itemId) > 0) {
    return { reason: `已经有「${page.name}」了。` }
  }
  GameState.addItem(page.itemId, 1)
  GameState.setFlag(page.flag, true)
  GameState.setFlag(NOTES_STARTED, true)
  return {
    lines: [page.findLine, `拿到了「${page.name}」。（笔记 ${notesCollected()}/${NOTE_PAGES.length}）`],
  }
}

/**
 * 书架交还：五页齐了换技能书
 * @author zjh
 * @date 2026-10-23
 */
export function turnInNotes(): { lines: string[] } | { reason: string } {
  if (GameState.hasFlag(NOTES_DONE)) return { reason: '笔记已经订好了。心火共鸣的书在你背包里。' }
  if (!GameState.hasFlag('chapter8_done')) return { reason: '书架上落满灰。等小镇的灯都亮了再来吧。' }
  if (!notesReady()) {
    const miss = NOTE_PAGES.filter((p) => GameState.itemCount(p.itemId) <= 0 && !GameState.hasFlag(p.flag)).map(
      (p) => `${p.place}的${p.name}`,
    )
    GameState.setFlag(NOTES_STARTED, true)
    return {
      reason: `还缺：${miss.join('、')}。散落在青苔草地、雾泉湖畔、回音林、锤音镇和星砂荒原。`,
    }
  }
  for (const p of NOTE_PAGES) {
    if (GameState.itemCount(p.itemId) > 0) GameState.consumeItem(p.itemId)
  }
  GameState.addItem(BOOK_HEART, 1)
  GameState.setFlag(NOTES_DONE, true)
  return {
    lines: [
      '阿禾把五页纸小心压平，订进旧手账的夹层。',
      '阿禾：这一页……是灯灯写的「心火共鸣」。你们拿去吧，会用得上。',
      '获得了技能书「心火共鸣」！',
    ],
  }
}
