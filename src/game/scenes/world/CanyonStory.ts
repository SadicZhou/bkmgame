/**
 * 第四章剧情：锤婆、峰的怪力手套、化石、矿车道岔
 * 剧本见 docs/story/04-第四章-磐谷.md
 * @author zjh
 * @date 2026-10-16
 */

import { createCreature } from '../../data/creatures'
import { CANYON_FLAGS, FOSSILS, fossilFlag, oreFlag, switchFlag } from '../../data/canyonMap'
import { GameState } from '../../state/GameState'
import { Sfx } from '../../systems/AudioBeeps'
import { resetBoulders } from '../../systems/Boulders'
import { cartStop, RACE_ROUTES, raceGrade, routeCode, switchDir, toggleSwitch } from '../../systems/MineCart'
import { rockSlideReason, teachRockSlide } from '../../systems/MoveBooks'
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

function oreStory(id: string) {
  return (host: StoryHost): void => {
    if (has(oreFlag(id))) {
      host.say(['这块矿石已经捡走了。'])
      return
    }
    GameState.setFlag(oreFlag(id), true)
    GameState.addItem('canyon_ore', 1)
    Sfx.confirm()
    host.say([`捡到一块峡谷矿石。（${GameState.itemCount('canyon_ore')}/5）`, '锤音镇的锤铺学徒正在收集这种矿石。'], () => host.refreshNpcs())
  }
}

function apprentice(host: StoryHost, name: string): void {
  if (GameState.itemCount('wind_chime') > 0) {
    host.say([`${name}：风铃坠带着就行。出战时，伙伴会快上一点点。`])
    return
  }
  const n = GameState.itemCount('canyon_ore')
  if (n < 5) {
    host.say([
      `${name}：师父不让我敲大锤，说山会抖。`,
      `${name}：小坠子总可以做吧？峡谷里散着 5 块矿石，捡齐了我给你敲一个风铃坠。`,
      `${name}：你现在有 ${n} 块。`,
    ])
    return
  }
  for (let i = 0; i < 5; i++) GameState.consumeItem('canyon_ore')
  GameState.addItem('wind_chime', 1)
  Sfx.win()
  host.say([`${name}：叮——好了！`, `${name}：风铃坠给你。带着它战斗，速度会快上一点点。`], () => host.refreshHud())
}

function miner(host: StoryHost, name: string): void {
  if (!has(CANYON_FLAGS.cartFixed)) {
    host.say([
      `${name}：这车我修了二十年。`,
      `${name}：轨道上有三个道岔，扳错了就会冲进死路——不过死路尽头会撞上缓冲木，不疼！`,
      `${name}：面朝道岔按确认可以扳动。坐上矿车，它会自己往前冲。`,
    ])
    return
  }
  const active = GameState.getFlag('race_code')
  if (typeof active === 'string' && active) {
    const route = RACE_ROUTES.find((r) => r.code === active)
    host.say([`${name}：比赛还在进行。把道岔扳成 ${active}（${route?.name ?? ''}），${route?.par ?? 24} 步之内坐上矿车。`])
    return
  }
  const pending = RACE_ROUTES.find((r) => !has(`race_gold_${r.id}`))
  if (!pending) {
    host.say([`${name}：三条路都是金牌。岩崩的技能书你收好，别再来撞缓冲木了。`])
    return
  }
  host.say(
    [
      `${name}：矿车修好了，要不要比一比？`,
      `${name}：这一趟去「${pending.name}」，路线 ${pending.code}。`,
      `${name}：从现在起 ${pending.par} 步之内坐上车，就算金牌。三条都拿到，我把岩崩的技能书给你。`,
    ],
    () => {
      GameState.setFlag('race_code', pending.code)
      GameState.setFlag('race_start', GameState.world.totalSteps)
    },
  )
}

/**
 * 若正在竞速，按到达的路线结算；返回要追加的台词
 * @author zjh
 * @date 2026-10-16
 */
function finishRace(code: string): string[] {
  const target = GameState.getFlag('race_code')
  if (typeof target !== 'string' || !target) return []
  const route = RACE_ROUTES.find((r) => r.code === target)
  if (!route) return []
  const start = Number(GameState.getFlag('race_start') ?? 0)
  const steps = Math.max(0, GameState.world.totalSteps - start)
  GameState.setFlag('race_code', '')
  const grade = raceGrade(steps, route.par, code, target)
  if (grade === 'miss') return [`（比赛要的是 ${target}，这趟是 ${code}。再去找阿岩重来吧。）`]
  if (grade === 'slow') return [`（用了 ${steps} 步，金牌要在 ${route.par} 步以内。）`]
  GameState.setFlag(`race_gold_${route.id}`, true)
  if (!RACE_ROUTES.every((r) => has(`race_gold_${r.id}`))) {
    const left = RACE_ROUTES.filter((r) => !has(`race_gold_${r.id}`)).length
    return [`（金牌！这条路用了 ${steps} 步。还剩 ${left} 条。）`]
  }
  if (has('race_book')) return [`（金牌！三条路都跑完了。）`]
  GameState.setFlag('race_book', true)
  const pupil = GameState.party.find((c) => !rockSlideReason(c))
  if (pupil) return [`（金牌！三条路都跑完了。）`, teachRockSlide(pupil)]
  GameState.addItem('book_rock_slide', 1)
  return [`（金牌！三条路都跑完了。）`, '技能书放进背包了。岩系伙伴技能没满时，打开就能学岩崩。']
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
  const extra = finishRace(code)
  const line = `（矿车哐当一声，顺着路线 ${code} 冲了出去……）`
  if (stop === 'bump') {
    host.say([line, '（尽头是一排缓冲木。车停了，人没事。）', '阿岩说只有一条路能到矿道深处。', ...extra])
    return
  }
  if (stop === 'chest') {
    host.say([line, '（支路尽头有一只旧箱子。）', has(CANYON_FLAGS.chest) ? '箱子已经空了。' : '找到了好伤药！', ...extra], () => {
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
    host.say([line, '（另一条支路，地上散着铃铛。）', has(CANYON_FLAGS.side) ? '没有别的东西了。' : '捡到了引兽铃！', ...extra], () => {
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
  host.say([line, '（矿车冲进了矿道深处，灯台的方向亮着一点光。）', ...extra], () => {
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
  hammer_apprentice: apprentice,
  canyon_peak: canyonPeak,
  boulder_reset: boulderReset,
  canyon_miner: miner,
  mine_cart: mineCart,
  mine_badge: mineBadge,
  ...Object.fromEntries(FOSSILS.map((f) => [`fossil_${f.id}`, fossilStory(f.id)])),
  ...Object.fromEntries(['1', '2', '3', '4', '5'].map((id) => [`ore_${id}`, oreStory(id)])),
  ...Object.fromEntries([1, 2, 3].map((i) => [`cart_sw${i}`, switchStory(i)])),
}

/** 给界面用：道岔现在朝哪边（测试会直接看旗标） */
export function cartFacing(i: number): string {
  return switchDir(i, (k) => GameState.getFlag(k))
}
