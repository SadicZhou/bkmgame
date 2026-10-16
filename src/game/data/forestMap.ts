/**
 * 第三章地图「回音林」：西南林口 → 苔与巡林者（临时组队）→ 三个回声岔口 → 四音石空地 → 藤蔓 → 执灯·绯 → 林心古树与林语鹿
 * 剧情节拍见 docs/story/03-第三章-回音.md；对话推进见 scenes/world/ForestStory，音石谜题见 systems/EchoStones。
 * @author zjh
 * @date 2026-10-15
 */

import { TS, parseAscii } from './mapKit'
import type { MapDef, NpcDef } from './maps'
import { MUSH_GRANNY, mushroomSpots } from './mushrooms'

/** 第三章旗标 */
export const FOREST_FLAGS = {
  unlocked: 'forest_unlocked',
  metMoss: 'forest_met_moss',
  teamBattle: 'forest_team_battle',
  stonesSolved: 'forest_stones_solved',
  kindler: 'kindler_beaten',
  kindlerStory: 'kindler_story',
  deer: 'deer_beaten',
} as const

/** 四音石：id 与正确顺序一致（大地 → 流水 → 林叶 → 飞鸟） */
export const ECHO_STONES = [
  { id: 'earth', name: '大地', sound: '咚', x: 5, y: 16 },
  { id: 'water', name: '流水', sound: '叮', x: 25, y: 16 },
  { id: 'leaf', name: '林叶', sound: '铃', x: 25, y: 11 },
  { id: 'bird', name: '飞鸟', sound: '啾', x: 4, y: 11 },
] as const

/** 音石点亮旗标 */
export const stoneLitFlag = (id: string) => `forest_stone_lit_${id}`

/** 回声岔口木牌 */
function signs(): NpcDef[] {
  return [
    {
      id: 'sign_a',
      name: '木牌',
      role: 'sign',
      x: 2,
      y: 20,
      color: 0x8a6a4a,
      lines: ['【回声岔口 · 一】', '左边传来清脆的铃声……', '（苔说过：回声从哪边来，路往往在另一边。）'],
    },
    {
      id: 'sign_b',
      name: '木牌',
      role: 'sign',
      x: 11,
      y: 21,
      color: 0x8a6a4a,
      lines: ['【回声岔口 · 二】', '上面传来蓬尾鼠的脚步声……'],
    },
    {
      id: 'sign_c',
      name: '木牌',
      role: 'sign',
      x: 19,
      y: 23,
      color: 0x8a6a4a,
      lines: ['【回声岔口 · 三】', '四面八方都是你自己的脚步声。', '（路边的伞灵菇在微微发光……）'],
    },
    {
      id: 'sign_carving',
      name: '古树根',
      role: 'sign',
      x: 13,
      y: 11,
      color: 0x6a4a2a,
      lines: ['（一截从林心古树延伸过来的老根，树皮上刻着字。）', '「先是大地，后是流水，再是林叶，最后是飞鸟。」'],
    },
  ]
}

/** 四音石（不画小人，外观由装饰物 decor-echostone 负责） */
function stones(): NpcDef[] {
  return ECHO_STONES.map((s) => ({
    id: `stone_${s.id}`,
    name: `${s.name}音石`,
    role: 'prop' as const,
    story: `stone_${s.id}`,
    x: s.x,
    y: s.y,
    color: 0x7a8a7a,
    lines: [],
  }))
}

/**
 * 建造回音林
 * @author zjh
 * @date 2026-10-15
 */
export function buildForest(): MapDef {
  const { width, height, tiles } = parseAscii([
    '##############################',
    '#########,,,,,,,,,,,,#########',
    '########,,,,,,,,,,,,,,########',
    '########,,,,,,,,,,,,,,########',
    '#########,,,,,,,,,,,,#########',
    '###########,,,,,,,,###########',
    '###############............W##',
    '###############.##############',
    '###############.##############',
    '###############.##############',
    '####,,,,,,,,,,,.,,,,,,,,,,####',
    '###,,,,,,,,,,,,.,,,,,,,,,,,###',
    '###,,""""",,,,...,,""""",,,###',
    '###,,""""",,,.....,""""",,~~##',
    '###,,""""",,,,...,,""""",,~~##',
    '###RR,,,,,,,,,,.,,,,,,,,,,~~##',
    '####R,,,,,,,,,,.,,,,,,,,,,~###',
    '#####,,,,,,,,,,.,,,,,,,,,,####',
    '###############.##############',
    '#""######"""###.......########',
    '#"########"##########.########',
    '#".........##########.########',
    '##.##,####.##########.####"###',
    '##.#######.##########.####"###',
    '##.#######.."""""""..."""""###',
    '##.##################"########',
    '##.##################"########',
    '##W###########################',
  ])

  return {
    id: 'forest',
    name: '回音林',
    width,
    height,
    tileSize: TS,
    tiles,
    bgColor: 0x3a7a4a,
    spawn: { x: 2, y: 26 },
    outdoor: true,
    warps: [
      { x: 2, y: 27, targetMap: 'lake', targetX: 18, targetY: 9, label: '雾泉湖畔' },
      {
        x: 27,
        y: 6,
        targetMap: 'canyon',
        targetX: 6,
        targetY: 13,
        label: '千岩峡谷',
        requireFlag: 'canyon_unlocked',
        lockedLines: ['东边的山路还被藤蔓和落石封着。', '（回音林的事情了结之后，再往这边走吧。）'],
      },
    ],
    npcs: [
      {
        id: 'forest_moss',
        name: '巡护员苔',
        story: 'forest_moss',
        x: 2,
        y: 25,
        color: 0x5b8c5a,
        hideIf: FOREST_FLAGS.metMoss,
        lines: [],
      },
      {
        id: 'forest_moss2',
        name: '巡护员苔',
        story: 'forest_moss',
        x: 5,
        y: 22,
        color: 0x5b8c5a,
        wander: 1,
        showIf: FOREST_FLAGS.metMoss,
        lines: [],
      },
      {
        id: 'forest_patrol',
        name: '熄灯会·巡林者',
        role: 'trainer',
        x: 7,
        y: 21,
        color: 0x2a3a60,
        showIf: FOREST_FLAGS.metMoss,
        hideIf: FOREST_FLAGS.teamBattle,
        lines: [],
        team: [
          { speciesId: 'bushtail', level: 20 },
          { speciesId: 'sproutcap', level: 20 },
        ],
        ally: { name: '苔', team: [{ speciesId: 'grovefox', level: 26 }] },
        defeatedKey: FOREST_FLAGS.teamBattle,
        challengeLines: ['执灯大人在里面办事，闲人止步！'],
        preBattleLines: ['苔：旅人，你的伙伴一路走来累了吧？这一场——让我的森冠狐上！'],
        winLines: [
          '苔：漂亮！……咳，我是说，我的森冠狐很漂亮。',
          '苔：前面的路会「骗人」。回声从左边来，路往往在右边。记住了！',
        ],
      },
      {
        id: 'forest_herbalist',
        name: '采药人柏',
        role: 'trainer',
        x: 24,
        y: 17,
        color: 0x6a8a3a,
        facing: 'left',
        patrol: [{ x: 17, y: 17 }],
        patrolLook: 'up',
        sight: 3,
        rematchDays: 2,
        lines: [],
        team: [
          { speciesId: 'sproutcap', level: 21 },
          { speciesId: 'parashroom', level: 22 },
        ],
        defeatedKey: 'forest_herbalist_beaten',
        challengeLines: ['嘘——别踩到我的药草！', '……既然来了，就让我看看你的伙伴有没有好好吃药。'],
        afterLines: ['伙伴受伤的时候，别忘了用伤药。', '空地四角的音石……我采药的时候常听见它们自己在响。'],
      },
      ...signs(),
      ...stones(),
      MUSH_GRANNY,
      ...mushroomSpots(),
      {
        id: 'forest_vines',
        name: '藤蔓',
        role: 'prop',
        texture: 'obj-vines',
        x: 15,
        y: 9,
        color: 0x3a6a2a,
        hideIf: FOREST_FLAGS.stonesSolved,
        lines: ['粗壮的藤蔓把通往深处的小路缠得密不透风。', '（空地四角的音石……也许和古树根上的刻字有关。）'],
      },
      {
        id: 'kindler',
        name: '执灯·绯',
        role: 'trainer',
        x: 15,
        y: 7,
        color: 0xc84a3a,
        hideIf: FOREST_FLAGS.kindler,
        lines: [],
        team: [
          { speciesId: 'inkcrow', level: 21 },
          { speciesId: 'lanternlizard', level: 22 },
          { speciesId: 'whirlbat', level: 23 },
        ],
        defeatedKey: FOREST_FLAGS.kindler,
        challengeLines: [
          '你就是那个到处点灯的旅人？',
          '你知道火烧起来是什么样子吗？我知道。我七岁那年，整座村子都是红的。',
          '首领把我从火里背出来。他说，只要没有火，就不会再有人失去家。',
          '所以——这盏灯，我一定要熄掉。',
        ],
        winLines: [
          '绯：……为什么。为什么你的伙伴会这样护着你？',
          '绯：首领的伙伴也是这样护着他的。可是那天晚上，那只小小的光……没有回来。',
          '绯：（她握紧那盏熄灭的灯）首领说那是心火的错。……是吗？',
          '绯：我不会再拦你了。但你最好想清楚——点亮灯台，真的不会有人受伤吗？',
          '（你注意到，绯的墨烬鸦整场都没有对你的伙伴用过全力。）',
        ],
        winFlags: [FOREST_FLAGS.kindlerStory],
      },
      {
        id: 'echodeer',
        name: '林语鹿',
        role: 'boss',
        x: 15,
        y: 4,
        color: 0x7ad86a,
        lines: [],
        team: [{ speciesId: 'echodeer', level: 24 }],
        defeatedKey: FOREST_FLAGS.deer,
        challengeLines: [
          '（林心古树下，鹿角挂着上百颗小铃铛，却一声不响。）',
          '（林语鹿看着你。它张开嘴——没有声音。）',
          '（它低下头，鹿角对准了你。）',
        ],
        afterLines: ['（林语鹿轻轻摇了摇头，鹿角上的铃铛叮叮当当地响。）'],
      },
    ],
  }
}
