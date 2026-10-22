/**
 * 第六章地图：霜铃山麓、霜铃峰、冰湖、铃殿
 * 冰滑与寒冷见 systems/Frost.ts
 * @author zjh
 * @date 2026-10-16
 */

import { TS, parseAscii } from './mapKit'
import type { MapDef } from './maps'
import { postgameNpcs } from './postgameNpcs'

/**
 * 山麓村。雪伯把暖炉石交给旅人
 * @author zjh
 * @date 2026-10-16
 */
export function buildFrostVillage(): MapDef {
  const { width, height, tiles } = parseAscii([
    '##############',
    '#____________#',
    '#____________#',
    '#____________#',
    '######W#######',
    '##############',
  ])
  return {
    id: 'frostvillage',
    name: '霜铃山麓',
    width,
    height,
    tileSize: TS,
    tiles,
    bgColor: 0xd8e4f0,
    spawn: { x: 6, y: 3 },
    outdoor: false,
    indoor: true,
    warps: [{ x: 6, y: 4, targetMap: 'frostpeak', targetX: 4, targetY: 6, label: '霜铃峰' }],
    npcs: [
      {
        id: 'frost_elder',
        name: '村长雪伯',
        x: 6,
        y: 2,
        color: 0xe8f0ff,
        story: 'frost_elder',
        lines: ['带着暖炉石上山。篝火边按确认，就能把寒气烘掉。'],
      },
      {
        id: 'snow_kid',
        name: '雪孩·团团',
        x: 2,
        y: 2,
        color: 0xffe8c8,
        story: 'snow_kid',
        lines: ['我们要办雪人大赛！'],
      },
      {
        id: 'snow_pile',
        name: '雪人台',
        role: 'prop',
        story: 'snow_pile',
        x: 10,
        y: 2,
        color: 0xf0f8ff,
        lines: ['一块踩实的雪地，正好堆雪人。'],
      },
      {
        id: 'ice_carrot_spot',
        name: '冰胡萝卜',
        role: 'prop',
        story: 'pick_ice_carrot',
        x: 3,
        y: 3,
        color: 0xffa040,
        hideIf: 'got_ice_carrot',
        lines: ['菜窖边滚出来一根结冰的胡萝卜。'],
      },
    ],
  }
}

/**
 * 霜铃峰。往北是铃殿，往东是冰湖。每一步都在积寒冷
 * @author zjh
 * @date 2026-10-16
 */
export function buildFrostPeak(): MapDef {
  const { width, height, tiles } = parseAscii([
    '################',
    '########W#######',
    '##............##',
    '##..""....""..##',
    '##............##',
    '##............##',
    '##............##',
    '####W#######W###',
    '################',
  ])
  return {
    id: 'frostpeak',
    name: '霜铃峰',
    width,
    height,
    tileSize: TS,
    tiles,
    bgColor: 0xc5d4e4,
    spawn: { x: 4, y: 6 },
    outdoor: true,
    warps: [
      { x: 4, y: 7, targetMap: 'frostvillage', targetX: 6, targetY: 3, label: '霜铃山麓' },
      { x: 12, y: 7, targetMap: 'icelake', targetX: 2, targetY: 1, label: '冰湖' },
      {
        x: 8,
        y: 1,
        targetMap: 'bellhall',
        targetX: 5,
        targetY: 4,
        label: '铃殿',
        requireFlag: 'frost_slide_solved',
        lockedLines: ['北风把路封住了。', '冰湖那边的路还没走通。'],
      },
    ],
    npcs: [
      {
        id: 'frost_fire',
        name: '篝火',
        role: 'prop',
        story: 'frost_fire',
        x: 3,
        y: 5,
        color: 0xff8040,
        lines: ['火还暖着。'],
      },
      {
        id: 'coal_eyes_spot',
        name: '小炭块',
        role: 'prop',
        story: 'pick_coal_eyes',
        x: 4,
        y: 5,
        color: 0x404040,
        hideIf: 'got_coal_eyes',
        lines: ['篝火旁有几块还热着的炭。'],
      },
      {
        id: 'snow_ball_spot',
        name: '新雪堆',
        role: 'prop',
        story: 'pick_snow_ball',
        x: 10,
        y: 5,
        color: 0xf4faff,
        hideIf: 'got_snow_ball',
        lines: ['刚落的雪，正好团成圆球。'],
      },
      {
        id: 'cloud_pillar',
        name: '风柱',
        role: 'prop',
        story: 'cloud_pillar',
        x: 2,
        y: 2,
        color: 0xd8f4ff,
        lines: ['风往天上吹。'],
      },
    ],
  }
}

/**
 * 冰湖三区：左上教学、中间直滑、下方要先把冰块推开
 * @author zjh
 * @date 2026-10-16
 */
export function buildIceLake(): MapDef {
  const { width, height, tiles } = parseAscii([
    '################',
    '##.***##########',
    '##...*##########',
    '#####-##########',
    '################',
    '##.****-########',
    '##########.#####',
    '########.***-###',
    '##########.#####',
    '####W###########',
    '################',
  ])
  return {
    id: 'icelake',
    name: '冰湖',
    width,
    height,
    tileSize: TS,
    tiles,
    bgColor: 0xd0e8f8,
    spawn: { x: 2, y: 1 },
    outdoor: true,
    warps: [{ x: 4, y: 9, targetMap: 'frostpeak', targetX: 12, targetY: 6, label: '霜铃峰' }],
    npcs: [
      {
        id: 'frost_shio',
        name: '泉守汐',
        x: 2,
        y: 2,
        color: 0x7ec8e0,
        story: 'frost_shio',
        lines: ['发光的地方能停住。滑错了，走回起点就行。'],
      },
      ...postgameNpcs('icelake'),
    ],
  }
}

/**
 * 峰顶铃殿。双子守在门前，霜铃鹤冻在殿中
 * @author zjh
 * @date 2026-10-16
 */
export function buildBellHall(): MapDef {
  const { width, height, tiles } = parseAscii([
    '###########',
    '#_________#',
    '#_________#',
    '#_________#',
    '#_________#',
    '#####W#####',
    '###########',
  ])
  return {
    id: 'bellhall',
    name: '铃殿',
    width,
    height,
    tileSize: TS,
    tiles,
    bgColor: 0xb8c8dc,
    spawn: { x: 5, y: 4 },
    outdoor: false,
    indoor: true,
    warps: [{ x: 5, y: 5, targetMap: 'frostpeak', targetX: 8, targetY: 2, label: '霜铃峰' }],
    npcs: [
      {
        id: 'frost_shuo',
        name: '朔',
        role: 'trainer',
        doubles: true,
        x: 5,
        y: 3,
        color: 0xd0d8e8,
        showIf: 'frost_slide_solved',
        lines: ['望，我们留下。'],
        team: [
          { speciesId: 'icecrown', level: 35 },
          { speciesId: 'cragdog', level: 34 },
          { speciesId: 'frostwing', level: 36 },
          { speciesId: 'skyfinch', level: 34 },
        ],
        defeatedKey: 'twins_beaten',
        challengeLines: [
          '到此为止。',
          '望从小就怕火。首领说，熄掉所有灯台，世界上就不会再有能伤人的火。',
          '一起上，望。这是最后一座离我们最近的灯了。',
        ],
        preBattleLines: ['望：（小声）……哥哥。', '（朔与望同时走上前来。你的前两只伙伴一起迎了上去。）'],
        winLines: [
          '朔：……输了。',
          '望：哥哥，你看。',
          '（心火映在冰铃上，铃里亮起一点点彩色的光。）',
          '望：好漂亮……一点都不可怕。我一直想看心火极光。',
          '望：首领哥哥每年冬天都来这里放一盏纸灯，说是给一个朋友。',
          '朔：望……你从来没跟我说过。',
          '望：因为哥哥一直在保护我呀。这一次，换我们保护灯吧。',
        ],
      },
      {
        id: 'frostcrane',
        name: '霜铃鹤',
        role: 'boss',
        x: 5,
        y: 1,
        color: 0xd8f4ff,
        showIf: 'twins_beaten',
        lines: [],
        team: [{ speciesId: 'frostcrane', level: 38 }],
        defeatedKey: 'crane_beaten',
        hideIf: 'crane_beaten',
        challengeLines: ['（铃殿中央，一只冰蓝的鹤冻在冰柱里。冰柱外缠着黑色灯罩的锁链。它的眼睛动了一下。）'],
        winLines: [
          '（冰柱碎开。霜铃鹤展翅，峰顶的冰铃一齐响了起来。）',
          '（心火极光从峰顶铺开，一直延伸到晨曦小镇的夜空。）',
          '望：（伸手碰了碰伙伴身上的火，笑出了声）',
          '朔：我们不回去了。旅人，小心首领身边那个戴风筝面具的人。鸢什么都知道，却什么都不说。',
        ],
      },
      ...postgameNpcs('bellhall'),
    ],
  }
}
