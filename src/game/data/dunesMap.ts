/**
 * 第五章地图：星砂荒原、观星台
 * 落雷与避雷针规则见 systems/Dunes.ts
 * @author zjh
 * @date 2026-10-16
 */

import { TS, parseAscii } from './mapKit'
import type { MapDef, NpcDef } from './maps'
import { DUNE_FLAGS, ROD_IDS, rodFlag } from '../systems/Dunes'

const RODS: { i: (typeof ROD_IDS)[number]; x: number; y: number }[] = [
  { i: 1, x: 4, y: 5 },
  { i: 2, x: 7, y: 5 },
  { i: 3, x: 13, y: 5 },
  { i: 4, x: 16, y: 5 },
]

function rodNpcs(): NpcDef[] {
  return RODS.map((r) => ({
    id: `dune_rod_${r.i}`,
    name: `避雷针·${r.i}`,
    role: 'prop',
    story: `dune_rod_${r.i}`,
    x: r.x,
    y: r.y,
    color: 0xf5d442,
    lines: ['这根避雷针已经亮着了。'],
    hideIf: rodFlag(r.i),
  }))
}

/**
 * 星砂荒原。南边回峡谷和观星台，中间是落雷带，北边石门后是雷心坑
 * @author zjh
 * @date 2026-10-16
 */
export function buildDunes(): MapDef {
  const { width, height, tiles } = parseAscii([
    '####################',
    '##..............W.##',
    '##................##',
    '####################',
    '##................##',
    '##................##',
    '##..""......""....##',
    '##................##',
    '########W###W#######',
    '####################',
  ])
  return {
    id: 'dunes',
    name: '星砂荒原',
    width,
    height,
    tileSize: TS,
    tiles,
    bgColor: 0xe8c878,
    spawn: { x: 8, y: 7 },
    outdoor: true,
    warps: [
      { x: 8, y: 8, targetMap: 'canyon', targetX: 19, targetY: 13, label: '千岩峡谷' },
      { x: 12, y: 8, targetMap: 'observatory', targetX: 5, targetY: 3, label: '观星台' },
      {
        x: 16,
        y: 1,
        targetMap: 'frostvillage',
        targetX: 5,
        targetY: 3,
        label: '霜铃山麓',
        requireFlag: 'frost_unlocked',
        lockedLines: ['北边的山还盖在雷云后面。', '雷鸣隼飞走以后，这条路才会开。'],
      },
    ],
    npcs: [
      ...rodNpcs(),
      {
        id: 'dune_shuo',
        name: '朔',
        x: 5,
        y: 7,
        color: 0xc8d0e0,
        story: 'dune_twins',
        lines: ['……'],
        hideIf: DUNE_FLAGS.twins,
      },
      {
        id: 'dune_wang',
        name: '望',
        x: 6,
        y: 7,
        color: 0xb0b8d0,
        lines: ['……'],
        hideIf: DUNE_FLAGS.twins,
      },
      {
        id: 'kindler',
        name: '执灯·绯',
        role: 'trainer',
        x: 9,
        y: 2,
        color: 0xe07050,
        showIf: DUNE_FLAGS.rods,
        lines: ['灯台的事，我们以后再说。'],
        team: [
          { speciesId: 'inkcrow', level: 30 },
          { speciesId: 'lanternlizard', level: 31 },
          { speciesId: 'whirlbat', level: 30 },
          { speciesId: 'voltbadger', level: 32 },
        ],
        defeatedKey: DUNE_FLAGS.kindler,
        challengeLines: [
          '又见面了。这一次，我不是来挡路的。',
          '雷鸣隼被锁在雷心里。你要进去，就先让我看看，你的伙伴还肯跟着你。',
        ],
        winLines: [
          '绯：……够了。',
          '绯：灯灯是我以前的伙伴。十年前的火里，它为了救一个人熄灭了。',
          '绯：那个人就是首领。他从此认定，心火是灾祸。',
          '绯：我还没想好要不要相信他。可雷鸣隼是无辜的。带它离开雷心吧。',
          '（绯的焰灯蜥靠过来。它的光很暖。）',
        ],
      },
      {
        id: 'stormfalcon',
        name: '雷鸣隼',
        role: 'boss',
        x: 10,
        y: 1,
        color: 0xf5d442,
        showIf: DUNE_FLAGS.kindler,
        lines: [],
        team: [{ speciesId: 'stormfalcon', level: 34 }],
        defeatedKey: DUNE_FLAGS.falcon,
        challengeLines: ['（雷心坑中央，一只隼被细细的锁链缠住翅膀。它每扇一次，天上就落下一条雷。）'],
        winLines: [
          '（锁链烧断了。雷声停了半拍，沙暴散开，远处的霜铃峰映着一层极光。）',
          '绯：第五颗星亮了。',
          '绯：下一座灯台在霜铃峰。朔和望已经先走了。',
        ],
      },
    ],
  }
}

/**
 * 观星台：星图师穗在这里把星图和蓄雷瓶交给旅人
 * @author zjh
 * @date 2026-10-16
 */
export function buildObservatory(): MapDef {
  const { width, height, tiles } = parseAscii([
    '###########',
    '#_________#',
    '#_________#',
    '#_________#',
    '#####W#####',
    '###########',
  ])
  return {
    id: 'observatory',
    name: '观星台',
    width,
    height,
    tileSize: TS,
    tiles,
    bgColor: 0x2a2848,
    spawn: { x: 5, y: 3 },
    outdoor: false,
    indoor: true,
    warps: [{ x: 5, y: 4, targetMap: 'dunes', targetX: 12, targetY: 7, label: '星砂荒原' }],
    npcs: [
      {
        id: 'dune_sui',
        name: '星图师穗',
        x: 5,
        y: 2,
        color: 0xf0e0a0,
        story: 'dune_sui',
        lines: ['星图在你菜单里。九颗星，亮了的才算数。'],
      },
    ],
  }
}
