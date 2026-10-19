/**
 * 通关后出现的人和旧地：冠军之路九连战、灯灯的五处足迹
 * 连战的后八位不站在路上，只在上一场胜利后被叫出来
 * @author zjh
 * @date 2026-10-19
 */

import type { NpcDef } from './maps'

interface Fight {
  id: string
  name: string
  color: number
  line: string
  team: { speciesId: string; level: number }[]
  doubles?: boolean
}

const FIGHTS: Fight[] = [
  { id: 'champ_moss', name: '巡护员苔', color: 0x5b8c5a, line: '苔：公告上写了，从我开始。九个人，中间只让你喘一口气。', team: [{ speciesId: 'sylvanfox', level: 55 }, { speciesId: 'echofrog', level: 55 }] },
  { id: 'champ_peak', name: '登山客峰', color: 0x8a6a4a, line: '峰：山道那次不算。这次我带了真正的火。', team: [{ speciesId: 'blazehorn', level: 56 }, { speciesId: 'emberwing', level: 56 }] },
  { id: 'champ_shio', name: '泉守汐', color: 0x7ec8c0, line: '汐：湖心的灯还亮着。让我看看你现在的伙伴。', team: [{ speciesId: 'torrentshell', level: 56 }, { speciesId: 'wavefin', level: 56 }] },
  { id: 'champ_fei', name: '执灯·绯', color: 0xe07050, line: '绯：我不会再站到你对面很久。这一场，还是要认真。', team: [{ speciesId: 'lanternlizard', level: 57 }, { speciesId: 'pyrecrown', level: 57 }] },
  { id: 'champ_anvil', name: '掘手·砧', color: 0xc08050, line: '砧：锤还热着。来。', team: [{ speciesId: 'cragdog', level: 57 }, { speciesId: 'bouldermite', level: 57 }] },
  {
    id: 'champ_twins',
    name: '朔与望',
    color: 0xd0e8f8,
    line: '望：两个人一起。朔说，别手下留情。',
    doubles: true,
    team: [
      { speciesId: 'icecrown', level: 58 },
      { speciesId: 'frostfox', level: 58 },
    ],
  },
  { id: 'champ_kite', name: '司风·鸢', color: 0x88c0d8, line: '鸢：面具不戴了。风还在。', team: [{ speciesId: 'chimekite', level: 58 }, { speciesId: 'skyfinch', level: 58 }] },
  { id: 'champ_he', name: '旅长阿禾', color: 0xf0d8a8, line: '阿禾：我晚到过一次。这一次，我站在你面前。', team: [{ speciesId: 'nightcrow', level: 59 }, { speciesId: 'sylvanfox', level: 59 }, { speciesId: 'blazehorn', level: 59 }] },
  {
    id: 'champ_mochen',
    name: '墨尘',
    color: 0x2a2a38,
    line: '墨尘：灯灯在看。打完这一场，路就是你的了。',
    team: [
      { speciesId: 'inkcrow', level: 60 },
      { speciesId: 'lanternlizard', level: 60 },
      { speciesId: 'nightcrow', level: 60 },
    ],
  },
]

/**
 * 九连战。第一位站在镇口，其余只在连战里出现
 * @author zjh
 * @date 2026-10-19
 */
function championNpcs(): NpcDef[] {
  return FIGHTS.map((f, i) => {
    const last = i === FIGHTS.length - 1
    const prev = FIGHTS.slice(0, i).map((p) => `${p.id}_beaten`)
    return {
      id: f.id,
      name: f.name,
      role: 'trainer',
      x: i === 0 ? 8 : 1,
      y: i === 0 ? 10 : 1,
      color: f.color,
      offstage: i > 0,
      showIf: 'game_clear',
      hideIf: 'champion_clear',
      defeatedKey: `${f.id}_beaten`,
      chainNext: last ? undefined : FIGHTS[i + 1].id,
      chainReset: prev.length ? prev : undefined,
      doubles: f.doubles,
      challengeLines: [f.line],
      lines: ['……'],
      team: f.team,
      winFlags: last ? ['champion_clear', 'champion_title'] : undefined,
      winItems: last ? ['gold_crown'] : undefined,
      winLines: last ? ['九盏灯都为你让了一次路。称号「焰迹冠军」，和这顶金冠饰，是你的了。'] : undefined,
    }
  })
}

/**
 * 各地通关后才看得到的人和记号
 * @author zjh
 * @date 2026-10-19
 */
export function postgameNpcs(mapId: string): NpcDef[] {
  if (mapId === 'town') {
    return [
      ...championNpcs(),
      {
        id: 'trace_mochen',
        name: '墨尘',
        story: 'trace_mochen',
        showIf: 'game_clear',
        hideIf: 'trace_done',
        x: 9,
        y: 10,
        color: 0x2a2a38,
        lines: ['墨尘：灯灯走过的地方，我都记得。'],
      },
      {
        id: 'trace_town',
        name: '旧灯芯',
        story: 'trace_town',
        showIf: 'trace_started',
        hideIf: 'trace_town',
        x: 10,
        y: 10,
        color: 0xffe08a,
        lines: ['钟楼下面，有一点没熄的暖光。'],
      },
    ]
  }
  if (mapId === 'pass') {
    return [
      {
        id: 'trace_pass',
        name: '旧火种',
        story: 'trace_pass',
        showIf: 'trace_started',
        hideIf: 'trace_pass',
        x: 4,
        y: 18,
        color: 0xff8f6b,
        lines: ['山道入口的石头还是热的。'],
      },
    ]
  }
  if (mapId === 'lake') {
    return [
      {
        id: 'trace_lake',
        name: '旧涟漪',
        story: 'trace_lake',
        showIf: 'trace_started',
        hideIf: 'trace_lake',
        x: 10,
        y: 13,
        color: 0x8ec8e0,
        lines: ['湖边的水纹里，有一点很小的光。'],
      },
    ]
  }
  if (mapId === 'forest') {
    return [
      {
        id: 'trace_forest',
        name: '旧铃音',
        story: 'trace_forest',
        showIf: 'trace_started',
        hideIf: 'trace_forest',
        x: 2,
        y: 24,
        color: 0x7ecf8a,
        lines: ['树皮上有一道被小爪子蹭过的痕。'],
      },
    ]
  }
  if (mapId === 'towertop') {
    return [
      {
        id: 'trace_tower',
        name: '旧灯台',
        story: 'trace_tower',
        showIf: 'trace_started',
        hideIf: 'trace_tower',
        x: 3,
        y: 3,
        color: 0xfff2c4,
        lines: ['灯台的灰还在，光已经不在灰里了。'],
      },
    ]
  }
  return []
}
