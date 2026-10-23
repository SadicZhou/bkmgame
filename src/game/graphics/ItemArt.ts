/**
 * 道具最终像素稿：64×64，左上高光、描边和脚下的影子。
 * 列表里缩小后仍靠轮廓辨认，说明区按原大显示细节。
 * @author zjh
 * @date 2026-10-16
 */

import Phaser from 'phaser'
import { ITEM_ORDER } from '../data/items'
import { paintCanvas, type PixelPen } from './tiles/PixelPen'

const S = 64
const OUTLINE = 0x241c18

/**
 * 启动时画完全部道具图（已有贴图则跳过）
 * @author zjh
 * @date 2026-10-16
 */
export function paintItemArt(scene: Phaser.Scene): void {
  ITEM_ORDER.forEach((id, i) => {
    paintCanvas(scene, `item-${id}`, S, S, 5100 + i * 13, (p) => {
      const icon = new Icon()
      paintOne(icon, id)
      icon.paint(p)
    })
    scene.textures.get(`item-${id}`).setFilter(Phaser.Textures.FilterMode.NEAREST)
  })
}

/** 一块可描边的像素画布，0 表示空 */
class Icon {
  private readonly fill = new Uint32Array(S * S)
  private readonly mark = new Uint8Array(S * S)

  dot(x: number, y: number, color: number): void {
    const xi = Math.round(x)
    const yi = Math.round(y)
    if (xi < 1 || yi < 1 || xi >= S - 1 || yi >= S - 1 || color === 0) return
    const i = yi * S + xi
    this.fill[i] = color
    this.mark[i] = 1
  }

  rect(x: number, y: number, w: number, h: number, color: number): void {
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) this.dot(x + xx, y + yy, color)
  }

  /** 圆角矩形，角上收 2 像素 */
  round(x: number, y: number, w: number, h: number, color: number): void {
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        const corner = (xx < 2 || xx >= w - 2) && (yy < 2 || yy >= h - 2)
        const tip = xx === 0 || yy === 0 || xx === w - 1 || yy === h - 1
        if (corner && tip) continue
        this.dot(x + xx, y + yy, color)
      }
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: number): void {
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) this.dot(cx + x, cy + y, color)
      }
    }
  }

  /** 竖着的圆柱：左亮右暗 */
  tube(x: number, y: number, w: number, h: number, hi: number, mid: number, lo: number): void {
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        const t = xx / Math.max(1, w - 1)
        const c = t < 0.22 ? hi : t < 0.72 ? mid : lo
        this.dot(x + xx, y + yy, c)
      }
    }
  }

  paint(pen: PixelPen): void {
    for (let y = 2; y < S - 2; y++) {
      for (let x = 2; x < S - 2; x++) {
        if (!this.mark[y * S + x]) continue
        pen.px(x + 1, y + 4, 0x1a140f, 0.28)
      }
    }
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        if (this.mark[y * S + x]) continue
        if (this.near(x, y)) pen.px(x, y, OUTLINE)
      }
    }
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const c = this.fill[y * S + x]
        if (c) pen.px(x, y, c)
      }
    }
  }

  private near(x: number, y: number): boolean {
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const xx = x + dx
      const yy = y + dy
      if (xx < 0 || yy < 0 || xx >= S || yy >= S) continue
      if (this.mark[yy * S + xx]) return true
    }
    return false
  }
}

function paintOne(g: Icon, id: string): void {
  if (id === 'potion') spray(g, 0xbff6f0, 0x3ec8c0, 0x1a8f8a, 'cross')
  else if (id === 'super_potion') spray(g, 0xffe0b0, 0xf0a040, 0xc06818, 'chevron')
  else if (id === 'repel') spray(g, 0xd4ccf4, 0x7a68c8, 0x4a3c90, 'mist')
  else if (id === 'revive') bandage(g, 0x2f9a58, 0x187848)
  else if (id === 'full_heal') bandage(g, 0x3a78d0, 0x2458a0)
  else if (id === 'pp_fruit') energyBar(g)
  else if (id === 'pp_honey') battery(g)
  else if (id === 'soothe_berry') beacon(g, 0xd8f4ff, 0x48b0ff, 0x2060c0)
  else if (id === 'honey_berry') beacon(g, 0xfff6c8, 0xf0c040, 0xc08810)
  else if (id === 'lure_bell') bell(g, 0xfff0a8, 0xf0c84a, 0xc89820, false)
  else if (id === 'wind_chime') bell(g, 0xffffff, 0xd8e8f0, 0x98b0c0, true)
  else if (id === 'talent_fruit') card(g)
  else if (id === 'old_rod') rod(g, 'old')
  else if (id === 'good_rod') rod(g, 'good')
  else if (id === 'gold_rod') rod(g, 'gold')
  else if (id === 'strength_gloves') gloves(g)
  else if (id === 'dust_badge') badge(g)
  else if (id === 'star_charm') charm(g)
  else if (id === 'canyon_ore') ore(g)
  else if (id === 'hearth_stone') hearth(g)
  else if (id === 'book_rock_slide' || id === 'book_tailwind' || id === 'book_defog' || id === 'book_heart_echo') book(g)
  else if (id === 'charge_bottle') bottle(g)
  else if (id === 'fold_board') board(g)
  else if (id === 'star_glider') glider(g)
  else if (id === 'torn_photo') photoItem(g)
  else if (id === 'white_feather') feather(g)
  else if (id === 'kid_lamp') kidLamp(g)
  else if (id === 'gold_crown') crown(g)
  else if (id === 'travel_journal') journal(g)
  else if (id === 'fest_ribbon') festRibbon(g)
  else if (id === 'fest_lantern') festLantern(g)
  else if (id === 'fest_star') festStar(g)
  else if (id === 'snow_ball') snowBall(g)
  else if (id === 'coal_eyes') coalEyes(g)
  else if (id === 'ice_carrot') iceCarrot(g)
  else if (id === 'warm_scarf') warmScarf(g)
  else if (id === 'lamp_paper') lampPaper(g)
  else if (id === 'lamp_wick') lampWick(g)
  else if (id === 'aurora_dust') auroraDust(g)
  else if (id === 'wang_paper_lamp' || id === 'heart_paper_lamp') kidLamp(g)
  else if (id.startsWith('note_')) journal(g)
}

/** 喷雾罐：喷嘴、金属颈、标签和罐底 */
function spray(g: Icon, hi: number, mid: number, lo: number, mark: 'cross' | 'chevron' | 'mist'): void {
  g.round(27, 7, 12, 5, 0xf4f8fa)
  g.rect(30, 9, 4, 2, 0x8aa0aa)
  g.round(24, 12, 16, 5, 0xc5d2d8)
  g.rect(36, 10, 10, 3, 0xdfe8ec)
  g.ellipse(31, 13, 2, 1, 0x6a8088)
  g.tube(18, 17, 26, 36, hi, mid, lo)
  g.ellipse(31, 17, 12, 3, hi)
  g.ellipse(31, 52, 12, 3, lo)
  g.round(21, 28, 20, 14, 0xfffaf4)
  g.rect(22, 28, 18, 2, 0xe4d8cc)
  if (mark === 'cross') {
    g.rect(29, 31, 4, 8, 0xd84840)
    g.rect(27, 33, 8, 4, 0xd84840)
    g.rect(30, 32, 2, 4, 0xff8880)
  } else if (mark === 'chevron') {
    g.rect(26, 32, 4, 2, 0xc45a10)
    g.rect(28, 34, 4, 2, 0xc45a10)
    g.rect(30, 36, 4, 2, 0xc45a10)
    g.rect(32, 34, 4, 2, 0xe88828)
    g.rect(34, 32, 4, 2, 0xe88828)
  } else {
    g.ellipse(46, 16, 4, 3, 0xe4dcf8)
    g.ellipse(52, 20, 3, 2, 0xf4f0ff)
    g.ellipse(48, 24, 2, 2, 0xd0c8ee)
  }
  g.rect(22, 46, 18, 2, lo)
}

/** 贴片：粘边、纱布织纹和十字 */
function bandage(g: Icon, cross: number, crossDark: number): void {
  g.round(6, 22, 52, 22, 0xf3ead8)
  g.rect(6, 24, 12, 18, 0xe4cfa6)
  g.rect(46, 24, 12, 18, 0xe4cfa6)
  for (let y = 26; y < 40; y += 3) {
    g.dot(10, y, 0xc8b48a)
    g.dot(14, y + 1, 0xc8b48a)
    g.dot(50, y, 0xc8b48a)
    g.dot(54, y + 1, 0xc8b48a)
  }
  g.round(18, 26, 28, 14, 0xfffdf8)
  for (let y = 28; y < 38; y += 2) g.rect(20, y, 24, 1, 0xf0e8dc)
  g.rect(30, 28, 4, 10, crossDark)
  g.rect(26, 31, 12, 4, crossDark)
  g.rect(31, 29, 2, 6, cross)
  g.rect(27, 32, 8, 2, cross)
}

/** 能量棒：锡纸扭结，开窗露出燕麦，和贴片的横条分开 */
function energyBar(g: Icon): void {
  g.rect(3, 26, 7, 3, 0xfff0c0)
  g.rect(5, 29, 6, 3, 0xd8a048)
  g.rect(3, 32, 7, 3, 0xfff0c0)
  g.rect(5, 35, 6, 3, 0xd8a048)
  g.rect(54, 26, 7, 3, 0xfff0c0)
  g.rect(53, 29, 6, 3, 0xd8a048)
  g.rect(54, 32, 7, 3, 0xfff0c0)
  g.rect(53, 35, 6, 3, 0xd8a048)
  g.round(10, 20, 44, 24, 0xc46a18)
  g.rect(12, 22, 10, 20, 0xf6c45a)
  g.rect(24, 22, 8, 20, 0xe09028)
  g.rect(34, 22, 8, 20, 0xf6c45a)
  g.rect(42, 22, 8, 20, 0xe09028)
  g.round(18, 26, 28, 12, 0xc4986a)
  g.dot(22, 30, 0x8a6840)
  g.dot(28, 33, 0xf0e0c0)
  g.dot(34, 29, 0x8a6840)
  g.dot(40, 32, 0xf0e0c0)
  g.rect(14, 22, 2, 18, 0xfff6d0)
}

/** 满格电池：金属帽、三格电量和一条清楚的闪电 */
function battery(g: Icon): void {
  g.round(24, 4, 16, 8, 0xc8d0cc)
  g.rect(27, 6, 10, 3, 0xf7fbf8)
  g.round(14, 12, 36, 46, 0x145028)
  g.tube(16, 14, 32, 42, 0xb8f0c4, 0x248a40, 0x145028)
  g.rect(20, 18, 24, 8, 0xe8ffd8)
  g.rect(20, 28, 24, 8, 0x7ad880)
  g.rect(20, 38, 24, 8, 0x3aaa58)
  g.rect(20, 26, 24, 2, 0x145028)
  g.rect(20, 36, 24, 2, 0x145028)
  g.rect(30, 20, 4, 8, 0xfff4b0)
  g.rect(24, 26, 10, 4, 0xfff4b0)
  g.rect(30, 30, 4, 8, 0xfff4b0)
  g.rect(18, 16, 3, 36, 0xdcffe8)
}

/** 信标：玻璃灯头、天线和底座指示灯 */
function beacon(g: Icon, hi: number, mid: number, lo: number): void {
  g.rect(30, 4, 4, 8, 0x8a98a0)
  g.ellipse(32, 6, 3, 2, 0xd8e0e4)
  g.ellipse(32, 20, 12, 10, lo)
  g.ellipse(32, 19, 9, 7, mid)
  g.ellipse(29, 16, 3, 2, hi)
  g.rect(22, 18, 2, 8, 0x5a6870)
  g.rect(40, 18, 2, 8, 0x5a6870)
  g.round(18, 28, 28, 8, 0x8a98a0)
  g.round(16, 34, 32, 20, 0x3a4450)
  g.rect(18, 36, 3, 14, 0x6a7884)
  g.round(22, 38, 6, 6, mid)
  g.round(30, 38, 6, 6, 0x5a6870)
  g.round(38, 38, 6, 6, 0x5a6870)
  g.rect(20, 48, 24, 3, 0x2a3440)
  g.round(14, 52, 36, 5, 0x242c34)
}

/** 铃铛；风铃再加一条穗 */
function bell(g: Icon, hi: number, mid: number, lo: number, tassel: boolean): void {
  g.ellipse(32, 8, 4, 3, 0xc4a060)
  g.rect(30, 10, 4, 4, 0x8a6840)
  g.ellipse(32, 28, 16, 14, lo)
  g.ellipse(32, 26, 14, 12, mid)
  g.ellipse(27, 20, 4, 3, hi)
  g.rect(24, 34, 16, 3, lo)
  g.rect(30, 30, 4, 8, 0x6a5428)
  g.ellipse(32, 40, 3, 3, 0xfff0c0)
  if (tassel) {
    g.rect(31, 42, 2, 10, 0xf0c0c8)
    g.round(28, 50, 8, 6, 0xe08088)
    g.dot(30, 52, 0xffe0e4)
  }
}

/** 资质卡：像一张带芯片的训练卡 */
function card(g: Icon): void {
  g.round(12, 8, 40, 48, 0xfffaf3)
  g.rect(14, 10, 36, 8, 0x2f6a48)
  g.dot(18, 13, 0xfff6c0)
  g.round(18, 22, 14, 16, 0xd7efe4)
  g.ellipse(25, 27, 4, 3, 0x3a7a58)
  g.rect(21, 31, 8, 4, 0x2f6a48)
  g.ellipse(42, 26, 5, 5, 0xf0c040)
  g.rect(40, 24, 4, 2, 0xfff0a8)
  g.round(34, 34, 12, 8, 0xe8c878)
  g.rect(36, 36, 8, 4, 0xc8a050)
  for (const y of [36, 40, 44]) g.rect(18, y, y === 44 ? 12 : 14, 2, 0xe4d8c8)
}

/** 钓竿：把手、渔轮和导线环 */
function rod(g: Icon, kind: 'old' | 'good' | 'gold'): void {
  const blank = kind === 'gold' ? 0xf0c040 : kind === 'good' ? 0x7ec8e8 : 0xc49a6c
  const blankHi = kind === 'gold' ? 0xfff0a8 : kind === 'good' ? 0xd8f4ff : 0xe8d0b0
  g.round(8, 46, 16, 10, 0x6a4030)
  g.rect(10, 48, 12, 2, 0xc4a080)
  g.rect(10, 52, 12, 2, 0xc4a080)
  g.ellipse(18, 44, 6, 6, 0xe8e4dc)
  g.ellipse(18, 44, 3, 3, 0x6a5848)
  g.rect(22, 42, 4, 2, 0x8a7868)
  for (let i = 0; i < 26; i++) {
    g.rect(20 + i, 40 - i, 3, 3, i % 5 === 0 ? 0xf4f4f4 : blank)
    g.dot(20 + i, 39 - i, blankHi)
  }
  g.rect(46, 12, 8, 2, 0xf8f8f8)
  if (kind !== 'old') {
    g.ellipse(50, 18, 4, 3, kind === 'gold' ? 0xffe080 : 0xb8e8ff)
    g.rect(47, 17, 5, 2, 0xffffff)
    g.dot(52, 16, kind === 'gold' ? 0xc08020 : 0x4080c0)
  }
}

/** 一双有缝线的手套 */
function gloves(g: Icon): void {
  const one = (x: number) => {
    g.round(x + 3, 18, 6, 12, 0xf0b070)
    g.round(x + 9, 12, 6, 16, 0xf0b070)
    g.round(x + 15, 18, 6, 12, 0xf0b070)
    g.round(x, 26, 24, 26, 0xe07030)
    g.rect(x + 4, 30, 16, 2, 0xf8c8a0)
    g.rect(x + 6, 36, 2, 8, 0xc85820)
    g.rect(x + 12, 36, 2, 8, 0xc85820)
    g.round(x + 2, 46, 20, 6, 0xa84818)
    g.rect(x + 4, 47, 8, 2, 0xf0c080)
  }
  one(4)
  one(34)
}

/** 旧徽章：绶带和金属边 */
function badge(g: Icon): void {
  g.rect(27, 6, 10, 14, 0xc44840)
  g.rect(22, 12, 8, 12, 0xa83830)
  g.rect(34, 12, 8, 12, 0xa83830)
  g.ellipse(32, 36, 16, 16, 0x8a8074)
  g.ellipse(32, 36, 13, 13, 0xf0e6d4)
  g.ellipse(32, 36, 9, 9, 0xd4c4a8)
  g.rect(30, 30, 4, 12, 0x6a5340)
  g.rect(26, 34, 12, 4, 0x6a5340)
  g.rect(28, 28, 4, 3, 0xffffff)
  for (let a = 0; a < 8; a++) {
    const x = 32 + Math.round(Math.cos((a / 8) * Math.PI * 2) * 15)
    const y = 36 + Math.round(Math.sin((a / 8) * Math.PI * 2) * 15)
    g.dot(x, y, 0xfff6e8)
  }
}

/** 星砂护符：束口小袋和漏出来的沙 */
function charm(g: Icon): void {
  g.rect(26, 8, 12, 4, 0xc49848)
  g.rect(24, 12, 16, 4, 0xe8c878)
  g.round(16, 16, 32, 32, 0xf0c878)
  g.rect(20, 18, 4, 22, 0xfff0c0)
  g.ellipse(32, 30, 6, 5, 0xfff6a0)
  g.rect(30, 26, 4, 8, 0xffffff)
  g.rect(26, 30, 12, 3, 0xffe080)
  g.dot(14, 50, 0xfff6a0)
  g.dot(44, 48, 0xfff6a0)
  g.dot(48, 40, 0xffffff)
  g.rect(40, 52, 3, 2, 0xffe080)
  g.dot(18, 44, 0xfff6c8)
}

/** 三块矿石切面 */
function ore(g: Icon): void {
  g.round(10, 30, 22, 22, 0x5a5568)
  g.round(30, 26, 24, 26, 0x6a6578)
  g.round(22, 14, 20, 22, 0x9a94a8)
  g.rect(28, 18, 8, 10, 0xe4e0f0)
  g.rect(30, 16, 3, 8, 0xffffff)
  g.rect(16, 36, 6, 6, 0xb0a8c0)
  g.rect(40, 38, 8, 6, 0x4a4558)
}

/** 暖炉石：裂纹里透着火 */
function hearth(g: Icon): void {
  g.ellipse(32, 36, 18, 16, 0x8a3828)
  g.ellipse(32, 35, 15, 13, 0xe07038)
  g.rect(22, 30, 3, 12, 0xffd090)
  g.rect(28, 24, 3, 16, 0xffe8b0)
  g.rect(36, 28, 3, 12, 0xffc070)
  g.rect(30, 34, 8, 3, 0xfff0c0)
  g.rect(26, 24, 4, 3, 0xffffff)
  g.dot(44, 28, 0xffe0a0)
}

/** 技能书：厚书页、封面岩石和丝带 */
function book(g: Icon): void {
  g.round(18, 12, 34, 42, 0xf6ecdc)
  for (const y of [18, 24, 30, 36]) g.rect(22, y, 22, 2, 0xe0d0b8)
  g.round(10, 8, 30, 48, 0x8a5030)
  g.rect(12, 12, 4, 40, 0xc48858)
  g.round(16, 18, 16, 14, 0xd8c098)
  g.rect(22, 16, 4, 16, 0xf0e0c0)
  g.rect(18, 22, 12, 4, 0xf0e0c0)
  g.rect(20, 44, 6, 12, 0xc44840)
  g.rect(20, 54, 8, 3, 0xa83028)
}

/** 蓄雷瓶：木塞、玻璃高光和电液 */
function bottle(g: Icon): void {
  g.round(26, 5, 12, 7, 0xa07848)
  g.rect(28, 8, 8, 3, 0xd8b080)
  g.round(28, 12, 8, 8, 0xe8f6fc)
  g.round(18, 18, 28, 36, 0xd4f2fa)
  g.rect(22, 20, 4, 22, 0xffffff)
  g.round(22, 34, 20, 16, 0xf0d040)
  g.rect(24, 36, 16, 3, 0xfff0a0)
  g.rect(30, 36, 3, 8, 0xfff6c0)
  g.rect(27, 39, 9, 3, 0xfff6c0)
  g.ellipse(42, 28, 2, 2, 0xffffff)
  g.dot(38, 40, 0xfff6c0)
}

/** 折叠滑板：侧面两只大轮，避免看成一排灯 */
function board(g: Icon): void {
  g.round(8, 16, 50, 10, 0x0e4e3c)
  g.round(10, 14, 44, 8, 0x2a9a78)
  g.rect(14, 16, 36, 2, 0xd8fff0)
  g.round(4, 18, 12, 8, 0x1a7a5c)
  g.rect(18, 24, 10, 6, 0xb0b8c0)
  g.rect(38, 24, 10, 6, 0xb0b8c0)
  g.ellipse(22, 40, 9, 9, 0x14161a)
  g.ellipse(44, 40, 9, 9, 0x14161a)
  g.ellipse(22, 40, 4, 4, 0x6a7278)
  g.ellipse(44, 40, 4, 4, 0x6a7278)
  g.dot(20, 37, 0xc8d0d4)
  g.dot(42, 37, 0xc8d0d4)
}

/** 星砂滑翔翼：两片张开的布翼和竹骨 */
function glider(g: Icon): void {
  g.round(6, 28, 22, 10, 0xf0d878)
  g.round(36, 28, 22, 10, 0xf0d878)
  g.rect(8, 30, 18, 3, 0xfff6c8)
  g.rect(38, 30, 18, 3, 0xfff6c8)
  g.rect(28, 24, 8, 18, 0xc4a060)
  g.rect(30, 26, 4, 14, 0xe8d0a0)
  g.dot(16, 32, 0xffffff)
  g.dot(46, 32, 0xffffff)
}

/** 合照残角：缺了右下的纸 */
function photoItem(g: Icon): void {
  g.round(14, 10, 36, 40, 0xfffaf3)
  g.rect(18, 14, 28, 20, 0xd7e8f0)
  g.ellipse(28, 22, 5, 5, 0xc4a574)
  g.ellipse(40, 24, 3, 3, 0xfff6a0)
  g.rect(18, 38, 16, 2, 0xd8d0c4)
  g.rect(18, 42, 12, 2, 0xd8d0c4)
}

/** 千灯穗：暖色丝带 */
function festRibbon(g: Icon): void {
  g.rect(28, 10, 8, 36, 0xe07050)
  g.rect(30, 12, 4, 32, 0xffc080)
  g.ellipse(32, 44, 10, 6, 0xffe08a)
  g.dot(32, 18, 0xfff6c8)
}

/** 纸灯饰：小灯笼 */
function festLantern(g: Icon): void {
  g.rect(30, 10, 4, 8, 0xc4a060)
  g.round(20, 18, 24, 28, 0xffe0a0)
  g.rect(24, 26, 16, 12, 0xfff6c8)
  g.dot(32, 30, 0xfffaf0)
  g.rect(22, 44, 20, 3, 0xe0b060)
}

/** 星火别针：小星 */
function festStar(g: Icon): void {
  g.ellipse(32, 30, 10, 10, 0xffe08a)
  g.rect(30, 16, 4, 28, 0xffc878)
  g.rect(18, 28, 28, 4, 0xffc878)
  g.dot(32, 30, 0xfffaf0)
}

/** 旅团手账：旧封面和一枚暖色书签 */
function journal(g: Icon): void {
  g.round(16, 10, 32, 44, 0x8a6040)
  g.rect(18, 12, 28, 40, 0xc49a6c)
  g.rect(20, 16, 24, 2, 0xe8d0a8)
  g.rect(20, 22, 18, 2, 0xd8c090)
  g.rect(20, 28, 20, 2, 0xd8c090)
  g.rect(20, 34, 14, 2, 0xd8c090)
  g.rect(42, 20, 4, 18, 0xe07050)
  g.dot(44, 18, 0xffc080)
}

/** 金冠饰：细冠和一颗暖色宝石 */
function crown(g: Icon): void {
  g.rect(16, 34, 32, 8, 0xf0c85a)
  g.rect(18, 36, 28, 4, 0xffe08a)
  g.rect(16, 22, 6, 14, 0xe0b040)
  g.rect(29, 16, 6, 20, 0xf0c85a)
  g.rect(42, 22, 6, 14, 0xe0b040)
  g.ellipse(32, 30, 4, 4, 0xfff6c8)
  g.dot(32, 29, 0xfffaf0)
}

/** 白风羽 */
function feather(g: Icon): void {
  g.ellipse(32, 30, 8, 18, 0xf7fbff)
  g.rect(31, 16, 2, 28, 0xd0d8e0)
  g.rect(28, 24, 4, 2, 0xe8eef4)
  g.rect(34, 28, 4, 2, 0xe8eef4)
  g.dot(30, 20, 0xffffff)
}

/** 圆雪球 */
function snowBall(g: Icon): void {
  g.ellipse(32, 34, 14, 12, 0xf4faff)
  g.ellipse(32, 32, 12, 10, 0xffffff)
  g.dot(28, 30, 0xe8f0f8)
}

/** 炭眼睛 */
function coalEyes(g: Icon): void {
  g.ellipse(24, 32, 6, 5, 0x303030)
  g.ellipse(40, 32, 6, 5, 0x303030)
  g.dot(24, 31, 0x606060)
  g.dot(40, 31, 0x606060)
}

/** 冰胡萝卜 */
function iceCarrot(g: Icon): void {
  g.rect(30, 18, 4, 22, 0xff9030)
  g.rect(29, 16, 6, 4, 0x50a040)
  g.rect(28, 20, 8, 16, 0xc8e8ff)
}

/** 御寒围巾 */
function warmScarf(g: Icon): void {
  g.rect(16, 28, 32, 8, 0xe05050)
  g.rect(18, 30, 28, 4, 0xff7070)
  g.rect(14, 34, 8, 12, 0xc04040)
  g.rect(42, 34, 8, 12, 0xc04040)
}

/** 薄灯纸 */
function lampPaper(g: Icon): void {
  g.rect(18, 16, 28, 32, 0xfff8e8)
  g.rect(20, 18, 24, 28, 0xfff0d0)
  g.rect(22, 22, 20, 2, 0xe8d8b0)
}

/** 软灯芯 */
function lampWick(g: Icon): void {
  g.rect(30, 14, 4, 28, 0xe8d0a0)
  g.ellipse(32, 14, 4, 4, 0xfff0c0)
  g.dot(32, 12, 0xff8040)
}

/** 极光碎屑 */
function auroraDust(g: Icon): void {
  g.dot(24, 28, 0xa0e8ff)
  g.dot(32, 24, 0xffc0e0)
  g.dot(40, 30, 0xc0ffd0)
  g.dot(28, 36, 0xffe080)
  g.dot(36, 34, 0xd0d0ff)
}

/** 小路的灯：纸灯笼和短提手 */
function kidLamp(g: Icon): void {
  g.rect(30, 12, 4, 8, 0xc4a060)
  g.round(22, 20, 20, 24, 0xffe0a0)
  g.rect(26, 26, 12, 10, 0xfff6c8)
  g.dot(32, 30, 0xfffaf0)
  g.rect(24, 42, 16, 3, 0xe0b060)
}
