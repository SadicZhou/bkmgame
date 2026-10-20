/**
 * 第七章剧情：风车、合照、绯的信、鹏背送回小镇、阿禾坦白
 * @author zjh
 * @date 2026-10-16
 */

import { GameState } from '../../state/GameState'
import { Sfx } from '../../systems/AudioBeeps'
import { MILL_A, MILL_B, MILL_C, toggleMill, type MillId } from '../../systems/Cloud'
import { dexComplete } from '../../systems/Postgame'
import type { StoryHost } from './StoryEvents'

function mill(id: MillId): (host: StoryHost, name: string) => void {
  return (host, name) => {
    const on = toggleMill(
      id,
      (k) => GameState.hasFlag(k),
      (k, v) => GameState.setFlag(k, v),
      (k) => GameState.clearFlag(k),
    )
    Sfx.confirm()
    host.say([`${name}：叶片转了过去。现在是${on ? '顺风，朝神殿' : '逆风，朝来路'}。`])
  }
}

function pillar(host: StoryHost, name: string): void {
  if (!GameState.hasFlag('cloud_unlocked') || GameState.itemCount('star_glider') <= 0) {
    host.say([`${name}：风很大，没有翅膀站不稳。`])
    return
  }
  host.say([`${name}：星砂滑翔翼张开了。`, '云接住了你。起风岛就在前面。'], () => host.travel('cloudstart', 5, 5))
}

function photo(host: StoryHost): void {
  if (GameState.hasFlag('cloud_photo')) {
    host.say(['半张照片已经在背包里。'])
    return
  }
  GameState.addItem('torn_photo', 1)
  GameState.setFlag('cloud_photo', true)
  Sfx.win()
  const extra = GameState.itemCount('dust_badge') > 0 ? ['徽章上的「尘」，和这行字是同一个字。'] : []
  host.say(['一个瘦瘦的少年，肩膀上停着一小团光。', '背面一行字：「尘 与 灯灯，旅团第三年。」', ...extra], () => host.toast('获得了重要物品「合照残角」'))
}

function letter(host: StoryHost): void {
  host.say(['信：我不上来。风太大，灯会灭。', '信：你问完他，回来告诉我，师父是怎么说的。'])
}

function fly(host: StoryHost): void {
  host.say(['脚下依次亮起余烬、雾泉、回音、磐谷、星砂、霜铃。', '六座灯和云上这一座，连成一只鸟的形状。', '它把你放回了晨曦小镇。'], () => host.travel('town', 8, 6))
}

function townPhoto(host: StoryHost): void {
  if (!GameState.hasFlag('cloud_photo')) {
    host.say(['相框缺了右下角。', '背面什么都看不见。'])
    return
  }
  host.say(GameState.hasFlag('he_confessed') ? ['两半照片对在一起了。少年还是那样笑着。'] : ['残角刚好补上右下角。', '你还没把这张照片拿给阿禾看。'])
}

const ANSWERS = [
  { id: 'warm', label: '火会伤人，也会温暖人', line: '……是啊。这句话，我本该十年前就告诉他。' },
  { id: 'guard', label: '重要的是谁来守护它', line: '守护。对。灯灯就是这样做的。' },
  { id: 'silent', label: '不说话，看向身边的伙伴', line: '他看着你的伙伴，笑了：你已经回答了。' },
]

/**
 * 阿禾的坦白。没到云阶时交给原来的台词
 * @author zjh
 * @date 2026-10-16
 */
function townElder(host: StoryHost, name: string): boolean {
  if (GameState.hasFlag('game_clear') && !GameState.hasFlag('dex_complete') && dexComplete(GameState.dex.caught)) {
    GameState.addItem('travel_journal', 1)
    GameState.setFlag('dex_complete', true)
    host.say([
      `${name}：图鉴……都收齐了。`,
      `${name}：这一本是旅团的旧手账。从前每个执灯人都要往里面写自己遇见的伙伴。`,
      `${name}：现在，该你写了。带着它走，异色的伙伴会更容易露面。`,
      `${name}：等你再看见结局那一幕，会多一点暖光。`,
    ])
    host.toast('获得了重要物品「旅团手账」')
    return true
  }
  if (!GameState.hasFlag('roc_beaten') || GameState.hasFlag('he_confessed')) return false
  if (!GameState.hasFlag('cloud_photo')) {
    host.say([`${name}：你从云上下来了。`, `${name}：先把那半张照片找回来，我才说得出口。`])
    return true
  }
  host.say(
    [
      `${name}：……鸢都告诉你了。`,
      `${name}：是。那天晚上，我选了村子。`,
      `${name}：我跑上山的时候，尘——墨尘——没有哭。他只问我：「师父，火是不是很坏？」`,
      `${name}：我什么都没回答。我怕我说「不是」，他会恨我；我怕我说「是」，他会恨火。`,
      `${name}：结果他只恨了火。他从来没恨过我。所以他才走得那么远。`,
      `${name}：（把两半照片对在一起）十年了。我一直在等一个能替我回答的人。`,
      `${name}：旅人。你说，火是不是很坏？`,
    ],
    () => {
      host.choose(
        '火是不是很坏？',
        ANSWERS.map((a) => ({ id: a.id, label: a.label })),
        (id) => {
          const picked = ANSWERS.find((a) => a.id === id) ?? ANSWERS[0]
          GameState.setFlag('he_answer', picked.id)
          GameState.setFlag('he_confessed', true)
          GameState.setFlag('chapter7_done', true)
          host.say(
            [
              `${name}：${picked.line}`,
              `${name}：剩下两座灯。一座是小镇的初灯，一座在灰烬之塔。`,
              `${name}：墨尘一定会回小镇。那是他长大的地方。`,
              `${name}：这一次，我不会再什么都不说。`,
            ],
            () => host.goChapter({ title: '第七章完 · 云阶', subtitle: '新的旅途：初灯（小镇的夜里）', badge: 'gale' }),
          )
        },
      )
    },
  )
  return true
}

export const CLOUD_STORIES = {
  cloud_pillar: pillar,
  cloud_mill_a: mill('a'),
  cloud_mill_b: mill('b'),
  cloud_mill_c: mill('c'),
  cloud_photo: photo,
  cloud_letter: letter,
  cloud_fly: fly,
  town_photo: townPhoto,
  town_elder: townElder,
}

export const CLOUD_MILL_FLAGS = [MILL_A, MILL_B, MILL_C]
