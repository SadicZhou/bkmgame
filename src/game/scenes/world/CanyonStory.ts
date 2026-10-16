/**
 * 第四章剧情：锤婆、峰的怪力手套、化石、矿车道岔
 * 剧本见 docs/story/04-第四章-磐谷.md
 * @author zjh
 * @date 2026-10-16
 */

import { createCreature } from '../../data/creatures'
import { CANYON_FLAGS, FOSSILS, fossilFlag, switchFlag } from '../../data/canyonMap'
import { GameState } from '../../state/GameState'
import { Sfx } from '../../systems/AudioBeeps'
import { resetBoulders } from '../../systems/Boulders'
import { cartStop, routeCode, switchDir, toggleSwitch } from '../../systems/MineCart'
import type { StoryHost } from './StoryEvents'

const has = (k: string) => GameState.hasFlag(k)

function hammerGranny(host: StoryHost, name: string): void {
  const say = (lines: string[], after?: () => void) => host.say(lines.map((l) => `${name}：${l}`), after)
  const fossils = FOSSILS.filter((f) => has(fossilFlag(f.id))).length
  if (!has(CANYON_FLAGS.fossilDone) && fossils >= FOSSILS.length) {
    const where = GameState.addCreature(createCreature('shellfossil', 25))
    GameState.setFlag(CANYON_FLAGS.fossilDone, true)
    Sfx.win()
    say(
      [
        '三块都齐了……这纹路，我年轻时在矿道最深处见过。',
        '（化石轻轻响了一声，一只甲纹龟从石壳里探出头。）',
        where === 'party' ? '甲纹龟加入了队伍！' : '队伍满了，甲纹龟在寄存所等你。',
      ],
      () => host.refreshHud(),
    )
    return
  }
  if (!has(CANYON_FLAGS.metGranny)) {
    say(
      [
        '外乡人？这时候来锤音镇，可不是好时候。',
        '以前每天清早，全镇的锤子一起敲，叮叮当当，峡谷都会跟着唱。',
        '现在？敲一下，山就抖三下。矿道塌了两条，孩子们都不敢进山了。',
        '……我孙子砧说，是岩灯台的错。他跟着一群黑衣人进山了。',
        fossils ? `你捡到的化石先放我这儿（${fossils}/3）。三块凑齐，我也许能把里面的东西叫醒。` : '峡谷里有时候能挖到化石。捡到了拿来给我看看。',
      ],
      () => GameState.setFlag(CANYON_FLAGS.metGranny, true),
    )
    return
  }
  if (!has(CANYON_FLAGS.anvil)) {
    say([
      '砧还在矿道里。',
      '进山的路被落石堵了，镇口的峰有办法。',
      `化石 ${fossils}/3。凑齐三块，给我看看。`,
    ])
    return
  }
  if (!has(CANYON_FLAGS.rhino)) {
    say(['灯台旁边那只犀牛……是我儿子救下来的孩子。', '拜托了。让山安静下来。'])
    return
  }
  say(['听见了吗？锤子又响了。', '砧说他留下修矿道。这样就好。'])
}

function canyonPeak(host: StoryHost, name: string): void {
  const say = (lines: string[], after?: () => void) => host.say(lines.map((l) => `${name}：${l}`), after)
  if (GameState.itemCount('strength_gloves') <= 0) {
    say(['哈！是你！上次被你打得落花流水，我回去练了整整一个月。', '千岩峡谷我熟。峡谷里的路被落石堵了，得靠伙伴的力气推开。', '拿着这个——「怪力手套」。戴上它，岩系或者一般系伙伴就能推动大石头。'], () => {
      GameState.addItem('strength_gloves', 1)
      GameState.setFlag(CANYON_FLAGS.gloves, true)
      host.toast('获得了怪力手套')
      host.refreshHud()
    })
    return
  }
  say(['面朝大石头按确认，它就会挪一格。', '推错了也不怕，峡谷入口的木牌可以把石头复位。', '矿道在峡谷最北边。三处落石都推开才能进去。'])
}

function boulderReset(host: StoryHost): void {
  const n = resetBoulders((k) => GameState.getFlag(k), (k, v) => GameState.setFlag(k, v), (x, y) => x === GameState.playerX && y === GameState.playerY)
  host.say([n ? '巨石轰隆隆地滚回了原处。' : '石头都在原来的位置上。'], () => host.redraw())
}

function fossilStory(id: string) {
  return (host: StoryHost): void => {
    if (has(fossilFlag(id))) {
      host.say(['这里的化石已经捡走了。'])
      return
    }
    GameState.setFlag(fossilFlag(id), true)
    const n = FOSSILS.filter((f) => has(fossilFlag(f.id))).length
    Sfx.confirm()
    host.say([`捡到一块还温热的化石。（${n}/${FOSSILS.length}）`, '锤音镇的锤婆也许知道这是什么。'], () => host.refreshNpcs())
  }
}

function miner(host: StoryHost, name: string): void {
  host.say([
    `${name}：这车我修了二十年。`,
    `${name}：轨道上有三个道岔，扳错了就会冲进死路——不过死路尽头会撞上缓冲木，不疼！`,
    `${name}：面朝道岔按确认可以扳动。坐上矿车，它会自己往前冲。`,
  ])
}

function switchStory(i: number) {
  return (host: StoryHost, name: string): void => {
    const next = toggleSwitch(i, (k) => GameState.getFlag(k))
    GameState.setFlag(switchFlag(i), next)
    Sfx.step()
    host.say([`${name}扳向了${next === 'L' ? '左边' : '右边'}。`, `现在的路线：${routeCode((k) => GameState.getFlag(k))}`])
  }
}

function mineCart(host: StoryHost): void {
  const code = routeCode((k) => GameState.getFlag(k))
  const stop = cartStop(code)
  const line = `（矿车哐当一声，顺着路线 ${code} 冲了出去……）`
  if (stop === 'bump') {
    host.say([line, '（尽头是一排缓冲木。车停了，人没事。）', '阿岩说只有一条路能到矿道深处。'])
    return
  }
  if (stop === 'chest') {
    host.say([line, '（支路尽头有一只旧箱子。）', has(CANYON_FLAGS.chest) ? '箱子已经空了。' : '找到了好伤药！'], () => {
      if (!has(CANYON_FLAGS.chest)) {
        GameState.addItem('super_potion', 2)
        GameState.setFlag(CANYON_FLAGS.chest, true)
        host.toast('获得了好伤药 ×2')
      }
      GameState.playerX = 4
      GameState.playerY = 8
      host.redraw()
    })
    return
  }
  if (stop === 'side') {
    host.say([line, '（另一条支路，地上散着铃铛。）', has(CANYON_FLAGS.side) ? '没有别的东西了。' : '捡到了引兽铃！'], () => {
      if (!has(CANYON_FLAGS.side)) {
        GameState.addItem('lure_bell', 1)
        GameState.setFlag(CANYON_FLAGS.side, true)
        host.toast('获得了引兽铃')
      }
      GameState.playerX = 6
      GameState.playerY = 8
      host.redraw()
    })
    return
  }
  host.say([line, '（矿车冲进了矿道深处，灯台的方向亮着一点光。）'], () => {
    GameState.setFlag(CANYON_FLAGS.deep, true)
    GameState.setFlag(CANYON_FLAGS.cartFixed, true)
    GameState.playerX = 15
    GameState.playerY = 3
    GameState.facing = 'up'
    host.redraw()
  })
}

function mineBadge(host: StoryHost): void {
  if (GameState.itemCount('dust_badge') > 0) {
    host.say(['旧徽章已经在背包里了。'])
    return
  }
  GameState.addItem('dust_badge', 1)
  GameState.setFlag('got_dust_badge', true)
  Sfx.confirm()
  host.say(['（尘土里躺着一枚旧徽章，背面刻着一个「尘」字。）', '获得了旧徽章。'], () => {
    host.refreshHud()
    host.refreshNpcs()
  })
}

/** 第四章剧情脚本 */
export const CANYON_STORIES: Record<string, (host: StoryHost, name: string) => void> = {
  hammer_granny: hammerGranny,
  canyon_peak: canyonPeak,
  boulder_reset: boulderReset,
  canyon_miner: miner,
  mine_cart: mineCart,
  mine_badge: mineBadge,
  ...Object.fromEntries(FOSSILS.map((f) => [`fossil_${f.id}`, fossilStory(f.id)])),
  ...Object.fromEntries([1, 2, 3].map((i) => [`cart_sw${i}`, switchStory(i)])),
}

/** 给界面用：道岔现在朝哪边（测试会直接看旗标） */
export function cartFacing(i: number): string {
  return switchDir(i, (k) => GameState.getFlag(k))
}
