/**
 * 第二章地图「雾泉湖畔」：南岸草丛与冰面、码头钓鱼点、浮桥（搭好前是水面）、湖心岛灯台与沧澜鲸
 * 剧情节拍见 docs/v3.1-chapter2-design.md；对话推进见 scenes/world/StoryEvents。
 * @author zjh
 * @date 2026-10-15
 */

import { TS, parseAscii } from './mapKit'
import type { MapDef } from './maps'

/** 浮桥开放旗标 */
export const BRIDGE_FLAG = 'bridge_open'

/**
 * 建造雾泉湖畔
 * @author zjh
 * @date 2026-10-15
 */
export function buildLake(): MapDef {
  const { width, height, tiles } = parseAscii([
    '####################',
    '#~~~~~~~~~~~~~~~~~~#',
    '#~~~~~~~~~~~~~~~~~~#',
    '#~~~~~~~,,,,,~~~~~~#',
    '#~~~~~~~,,.,,~~~~~~#',
    '#~~~~~~~~~=~~~~~~~~#',
    '#~~~~~~~~~=~~~~~~~~#',
    '#~~~~~~~~---~~~~~~~#',
    '#~~~~,..........~~~#',
    '#,***,"""...""""",,#',
    '#****,"""...""""",,#',
    '#,**,,,,.....,,,,,,#',
    '#,,,,"""....,"""",,#',
    '#,,,,,,,,..,,,,,,,,#',
    '#########WW#########',
  ])

  return {
    id: 'lake',
    name: '雾泉湖畔',
    width,
    height,
    tileSize: TS,
    tiles,
    bgColor: 0x5aa8c8,
    pathTexture: 'tile-sand',
    bridgeFlag: BRIDGE_FLAG,
    spawn: { x: 9, y: 13 },
    outdoor: true,
    warps: [
      { x: 9, y: 14, targetMap: 'meadow', targetX: 8, targetY: 10, label: '青苔草地' },
      { x: 10, y: 14, targetMap: 'meadow', targetX: 9, targetY: 10, label: '青苔草地' },
    ],
    npcs: [
      {
        id: 'lake_shio',
        name: '泉守汐',
        story: 'lake_shio',
        x: 13,
        y: 11,
        color: 0x7ec8c0,
        lines: ['湖心的灯台还亮着吗……'],
      },
      {
        id: 'angler',
        name: '钓鱼少年澈',
        story: 'angler',
        x: 6,
        y: 13,
        color: 0x6aa0e0,
        lines: [
          '浮漂往下一沉、头顶冒出「！」的时候，马上按确认！',
          '太早或太晚，鱼都会溜走——不过没关系，再甩一竿就好。',
          '听说用好钓竿能钓到珊冠鱼，头顶的珊瑚冠可漂亮了。',
        ],
        progressLines: [
          {
            flag: 'whale_beaten',
            lines: ['湖面的冰都化了！沧澜鲸今天在湖心唱歌呢。', '你的好钓竿真棒，湖底深处的伙伴也会被吸引过来哦。'],
          },
        ],
      },
      {
        id: 'scout1',
        name: '熄灯会·斥候 澄',
        role: 'trainer',
        x: 9,
        y: 7,
        color: 0x3a4a78,
        showIf: 'lake_first_fish',
        hideIf: BRIDGE_FLAG,
        lines: [],
        team: [
          { speciesId: 'cindermoth', level: 14 },
          { speciesId: 'mistnewt', level: 15 },
        ],
        defeatedKey: 'scout1_beaten',
        chainNext: 'scout2',
        challengeLines: [
          '……又是你，焰迹旅人。山上那盏灯，是你重新点亮的吧？',
          '熄灯会只是想让世界安静下来。灯太亮了，伙伴们都睡不着。',
          '我们两人一组。想过这座码头，就连赢两场吧！',
        ],
        afterLines: ['……你的伙伴，好像一点也不怕光。'],
      },
      {
        id: 'scout2',
        name: '熄灯会·斥候 漆',
        role: 'trainer',
        x: 11,
        y: 7,
        color: 0x2a3a60,
        showIf: 'lake_first_fish',
        hideIf: BRIDGE_FLAG,
        lines: [],
        team: [
          { speciesId: 'pebblepup', level: 15 },
          { speciesId: 'skylark', level: 15 },
        ],
        defeatedKey: 'scout2_beaten',
        chainFirst: 'scout1',
        challengeLines: ['澄输了？那就换我来！', '不给你喘口气的机会——战斗开始！'],
        afterLines: ['我们……只是照命令做事。', '湖心的灯罩，就由你去摘吧。'],
      },
      {
        id: 'whale',
        name: '沧澜鲸',
        role: 'boss',
        x: 10,
        y: 2,
        color: 0x3a80c8,
        showIf: BRIDGE_FLAG,
        lines: [],
        team: [{ speciesId: 'tidewhale', level: 20 }],
        defeatedKey: 'whale_beaten',
        challengeLines: [
          '（巨大的鲸从湖心浮起，发出一声长长的哀鸣。）',
          '（灯台上的黑色灯罩让它痛苦地甩动尾鳍，湖面掀起了浪。）',
          '……让它平静下来吧！',
        ],
        afterLines: ['（沧澜鲸轻轻摆动尾鳍，湖面泛起温柔的涟漪。）'],
      },
    ],
  }
}
