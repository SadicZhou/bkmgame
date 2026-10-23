/**
 * 支线 S8-2「阿禾的旧笔记」剧情：书架交还与五处捡页
 * @author zjh
 * @date 2026-10-23
 */

import { NOTE_PAGES, pickNotePage, turnInNotes } from '../../systems/NoteQuest'
import type { StoryFn, StoryHost } from './StoryEvents'

/**
 * 阿禾家旁的旧书架
 * @author zjh
 * @date 2026-10-23
 */
function aheNotes(host: StoryHost): void {
  const result = turnInNotes()
  if ('reason' in result) {
    host.say([result.reason])
    return
  }
  host.say(result.lines, () => {
    host.toast('获得技能书「心火共鸣」')
    host.toast('支线「阿禾的旧笔记」完成')
    host.refreshHud()
  })
}

function pickNote(pageId: string): StoryFn {
  return (host) => {
    const result = pickNotePage(pageId)
    if ('reason' in result) {
      host.say([result.reason])
      return
    }
    host.say(result.lines, () => host.refreshNpcs())
  }
}

export const NOTE_STORIES: Record<string, StoryFn> = {
  ahe_notes: aheNotes,
  ...Object.fromEntries(NOTE_PAGES.map((p) => [`pick_note_${p.id}`, pickNote(p.id)])),
}
