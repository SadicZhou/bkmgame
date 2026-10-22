/**
 * 伙伴体型与配色表；异色由色相整体偏移得到
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'

export type CritterKind =
  | 'bunny'
  | 'turtle'
  | 'fox'
  | 'bug'
  | 'moth'
  | 'newt'
  | 'lion'
  | 'mouse'
  | 'bird'
  | 'mushroom'
  | 'dog'
  | 'lizard'
  | 'marten'
  | 'deer'
  | 'bear'

export interface CritterPalette {
  body: number
  belly: number
  accent: number
  ear: number
  kind: CritterKind
  /** 进化形态：加冠饰 / 纹样 */
  evolved?: boolean
  /** 三阶形态：大王冠 */
  crown?: boolean
  /** 额外装饰：晶簇 / 星纹 */
  extra?: 'crystal' | 'star'
}

/** 各物种配色（贴图 key = spr-物种id；异色为 spr-物种id-shiny） */
export const CRITTERS: Record<string, CritterPalette> = {
  flarehorn: { body: 0xff8f6b, belly: 0xffd4a8, accent: 0xffc857, ear: 0xffb08a, kind: 'bunny' },
  blazehorn: { body: 0xff6b4a, belly: 0xffd9a0, accent: 0xffe066, ear: 0xff9060, kind: 'bunny', evolved: true },
  pyrecrown: { body: 0xff5a3a, belly: 0xffe0a0, accent: 0xffd040, ear: 0xff8050, kind: 'bunny', evolved: true, crown: true },
  tideback: { body: 0x6eb8e8, belly: 0xc8eef8, accent: 0xa8e6ff, ear: 0x8fd0f0, kind: 'turtle' },
  torrentshell: { body: 0x4a90d0, belly: 0xd8f4ff, accent: 0xc8f0ff, ear: 0x70b0e8, kind: 'turtle', evolved: true },
  abyssshell: { body: 0x3a70b8, belly: 0xd0f0ff, accent: 0x90e0ff, ear: 0x5090d0, kind: 'turtle', evolved: true, crown: true },
  leafkit: { body: 0x7bc96b, belly: 0xd4f0a8, accent: 0xc8f26b, ear: 0x9ed88a, kind: 'fox' },
  grovefox: { body: 0x4fae5a, belly: 0xe0f8b8, accent: 0xf2e86b, ear: 0x78c870, kind: 'fox', evolved: true },
  sylvanfox: { body: 0x3e9a50, belly: 0xe8ffc0, accent: 0xffa0c0, ear: 0x60b868, kind: 'fox', evolved: true, crown: true },
  rockmite: { body: 0xc4a484, belly: 0xe8d8c8, accent: 0xd7ccc8, ear: 0xb09070, kind: 'bug' },
  bouldermite: { body: 0x9c7c5c, belly: 0xf0e4d8, accent: 0xe8dcd0, ear: 0x806040, kind: 'bug', evolved: true },
  cindermoth: { body: 0xe8a05a, belly: 0xfff0c8, accent: 0xfff0a0, ear: 0xd08040, kind: 'moth' },
  emberwing: { body: 0xff8048, belly: 0xfff0c0, accent: 0xffe060, ear: 0xff6030, kind: 'moth', evolved: true },
  mistnewt: { body: 0x8fd0c8, belly: 0xe8fff8, accent: 0xe0fff8, ear: 0x70b8b0, kind: 'newt' },
  wavefin: { body: 0x60b8e0, belly: 0xe8fbff, accent: 0xa0f0ff, ear: 0x4898c8, kind: 'newt', evolved: true },
  bubblefin: { body: 0x7ec8e8, belly: 0xe8f8ff, accent: 0xb0e8ff, ear: 0x5aa8d0, kind: 'newt' },
  coralfin: { body: 0xff90b0, belly: 0xffe8f0, accent: 0xffc0d8, ear: 0xe07090, kind: 'newt', evolved: true, crown: true },
  tidewhale: { body: 0x3a80c8, belly: 0xd0eef8, accent: 0x80d0f0, ear: 0x2868a8, kind: 'turtle', evolved: true, crown: true },
  magmane: { body: 0xd9483b, belly: 0xffd0a0, accent: 0xffb030, ear: 0xff7a30, kind: 'lion', evolved: true },
  puffmouse: { body: 0xe8d8c0, belly: 0xfff4e0, accent: 0xffb7c5, ear: 0xd8c0a0, kind: 'mouse' },
  bushtail: { body: 0xd8b890, belly: 0xfff0d8, accent: 0xffd0a0, ear: 0xc8a070, kind: 'mouse', evolved: true },
  wickling: { body: 0xf0a860, belly: 0xffe8c0, accent: 0xffe060, ear: 0xd08848, kind: 'lizard' },
  lanternlizard: { body: 0xe08040, belly: 0xfff0d0, accent: 0xfff080, ear: 0xc06830, kind: 'lizard', evolved: true },
  sproutcap: { body: 0xf0e8d0, belly: 0xfff8e8, accent: 0x7bc96b, ear: 0x5aa850, kind: 'mushroom' },
  parashroom: { body: 0xe8e0c8, belly: 0xfff8e8, accent: 0x4fae5a, ear: 0x3a9048, kind: 'mushroom', evolved: true },
  echodeer: { body: 0x7ad86a, belly: 0xe8f8d0, accent: 0xf0d060, ear: 0x5ab058, kind: 'deer', evolved: true, crown: true },
  echofrog: { body: 0x68c080, belly: 0xe0f8e8, accent: 0xa0e8b0, ear: 0x489868, kind: 'newt' },
  pebblepup: { body: 0xb8a088, belly: 0xe8dccc, accent: 0x8a7060, ear: 0x9a8068, kind: 'dog' },
  cragdog: { body: 0x9a8068, belly: 0xe0d0c0, accent: 0x6a5848, ear: 0x7a6450, kind: 'dog', evolved: true },
  drillmole: { body: 0x8a7060, belly: 0xe8d8c8, accent: 0xc4a484, ear: 0x6a5040, kind: 'mouse' },
  crystalbat: { body: 0xb0c0d0, belly: 0xf0f4f8, accent: 0x88d0e8, ear: 0x90a0b0, kind: 'moth', extra: 'crystal' },
  amberling: { body: 0xe8a040, belly: 0xffe0a0, accent: 0xfff0c0, ear: 0xc08030, kind: 'bug', extra: 'crystal' },
  shellfossil: { body: 0xc8b090, belly: 0xf0e0c8, accent: 0xa08060, ear: 0x8a7050, kind: 'turtle', evolved: true },
  ridgerhino: { body: 0xa09080, belly: 0xe0d4c4, accent: 0x706050, ear: 0x807060, kind: 'lion', evolved: true, crown: true },
  sparkpuff: { body: 0xf5e090, belly: 0xfff8d0, accent: 0xf5d442, ear: 0xe0c060, kind: 'mouse' },
  voltbadger: { body: 0xe8c040, belly: 0xfff0a0, accent: 0x705020, ear: 0xf5d442, kind: 'marten', evolved: true, extra: 'star' },
  dunefin: { body: 0xd8b070, belly: 0xf0e0b0, accent: 0x8a6840, ear: 0xc09050, kind: 'lizard', evolved: true },
  starcat: { body: 0x6a68b8, belly: 0xe8e4ff, accent: 0xf5d442, ear: 0x8880d0, kind: 'fox', extra: 'star' },
  stormfalcon: { body: 0xf0d060, belly: 0xfff6c0, accent: 0x4060a0, ear: 0xe0b030, kind: 'bird', evolved: true, crown: true },
  snowbun: { body: 0xf4f8ff, belly: 0xffffff, accent: 0xff8090, ear: 0xd0e0f0, kind: 'bunny' },
  frostfox: { body: 0xc8e4f8, belly: 0xf0f8ff, accent: 0x88c0e8, ear: 0xa0d0f0, kind: 'fox', extra: 'crystal' },
  frostwing: { body: 0xd8f0ff, belly: 0xffffff, accent: 0x9ad0f0, ear: 0xb8e0f8, kind: 'moth', evolved: true },
  frostcrane: { body: 0xe8f6ff, belly: 0xffffff, accent: 0x7ec8f0, ear: 0xc0e0f4, kind: 'bird', evolved: true, crown: true },
  chimekite: { body: 0xf0f4f8, belly: 0xffffff, accent: 0xf0c040, ear: 0xc8d8e8, kind: 'bird', evolved: true },
  cloudsheep: { body: 0xf4f8ff, belly: 0xffffff, accent: 0xb8d4f0, ear: 0xe8eef8, kind: 'deer' },
  cloudfin: { body: 0x9ad0f0, belly: 0xf0fbff, accent: 0xffffff, ear: 0x68b0d8, kind: 'lizard' },
  galeroc: { body: 0xf7fbff, belly: 0xfff6d8, accent: 0x68c8a8, ear: 0xd0e4f4, kind: 'bird', evolved: true, crown: true },
  hearthbear: { body: 0xc4844c, belly: 0xffe0a8, accent: 0xfff6c0, ear: 0x8a5a30, kind: 'bear', evolved: true },
  dawnphoenix: { body: 0xfff2c4, belly: 0xffe08a, accent: 0xfff8e8, ear: 0xf0c878, kind: 'bird', evolved: true },
  auroradeer: { body: 0x7ec8a0, belly: 0xe8fff4, accent: 0xc8a0ff, ear: 0x5a9a78, kind: 'deer', evolved: true, extra: 'star' },
  skylark: { body: 0xa8d8f0, belly: 0xf0faff, accent: 0xffd070, ear: 0x88c0e0, kind: 'bird' },
  skyfinch: { body: 0x78b8e8, belly: 0xffffff, accent: 0xffc040, ear: 0x5898d0, kind: 'bird', evolved: true },
  whirlbat: { body: 0x6ab868, belly: 0xe8f8d8, accent: 0xc8e870, ear: 0x489848, kind: 'moth' },
  frostgoose: { body: 0xe0eef8, belly: 0xffffff, accent: 0xa8d0e8, ear: 0xc0d8e8, kind: 'bird' },
  icecrown: { body: 0xc8e4f8, belly: 0xf8fcff, accent: 0x88c8f0, ear: 0xa8d4f0, kind: 'bird', evolved: true, crown: true },
  lanternray: { body: 0xa0b8d0, belly: 0xf0f4ff, accent: 0xffe080, ear: 0x7890b0, kind: 'newt', extra: 'star' },
  wisp: { body: 0xfff0c0, belly: 0xfffaf0, accent: 0xffe080, ear: 0xf0d080, kind: 'moth', extra: 'star' },
  glowwisp: { body: 0xffe080, belly: 0xfff8e0, accent: 0xfff0a0, ear: 0xe0c060, kind: 'moth', evolved: true, extra: 'star' },
  inkcrow: { body: 0x2a2a38, belly: 0x4a4858, accent: 0xffc878, ear: 0x1a1a28, kind: 'bird' },
  nightcrow: { body: 0x1a1830, belly: 0x3a3850, accent: 0xffe08a, ear: 0x101020, kind: 'bird', evolved: true, extra: 'star' },
  starmarten: { body: 0x5a5ab0, belly: 0xd8d8ff, accent: 0xfff080, ear: 0x7a7ad0, kind: 'marten', extra: 'star' },
  bloomdeer: { body: 0xd8b090, belly: 0xfff0e0, accent: 0xff9ac0, ear: 0x7bc96b, kind: 'deer' },
  magmashell: { body: 0x8a3a30, belly: 0xffc080, accent: 0xff6030, ear: 0xc05030, kind: 'turtle', evolved: true, extra: 'crystal' },
  rockidol: { body: 0x8a7860, belly: 0xd0c0a0, accent: 0xe8c878, ear: 0x6a5840, kind: 'lizard', evolved: true, extra: 'crystal' },
  mistcarp: { body: 0x90c8d8, belly: 0xe8f8ff, accent: 0xc0e8f0, ear: 0x70a8b8, kind: 'newt', extra: 'star' },
  tideshark: { body: 0x406888, belly: 0xb0d0e0, accent: 0x70b0d0, ear: 0x305068, kind: 'newt', evolved: true },
  plumeowl: { body: 0xd8e8f8, belly: 0xffffff, accent: 0xa0c8e8, ear: 0xb0c8e0, kind: 'bird', evolved: true, extra: 'star' },
  treesprite: { body: 0x6a9860, belly: 0xe8f8d8, accent: 0xc8e878, ear: 0x4a7848, kind: 'mushroom', evolved: true, extra: 'star' },
  thundercorn: { body: 0xf0d060, belly: 0xfff8d0, accent: 0x6080e0, ear: 0xe0b040, kind: 'lion', evolved: true, extra: 'star' },
  miragefox: { body: 0xe8b888, belly: 0xfff0e0, accent: 0xc0a0ff, ear: 0xd09870, kind: 'fox', evolved: true, extra: 'star' },
}

/**
 * 异色调色：色相整体偏移
 * @author zjh
 * @date 2026-10-14
 */
function shiftHue(color: number, shift: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color)
  const hsv = Phaser.Display.Color.RGBToHSV(c.red, c.green, c.blue)
  const out = Phaser.Display.Color.HSVToRGB((hsv.h + shift) % 1, hsv.s, hsv.v) as Phaser.Display.Color
  return out.color
}

export function shinyPalette(p: CritterPalette): CritterPalette {
  const s = 0.42
  return { ...p, body: shiftHue(p.body, s), belly: shiftHue(p.belly, s), accent: shiftHue(p.accent, s), ear: shiftHue(p.ear, s) }
}
