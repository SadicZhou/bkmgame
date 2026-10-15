/**
 * 一键剧情回归（仅开发模式）：打开 http://127.0.0.1:45321/?regress=1 自动运行
 * 第一章头目 → 章节卡 → 湖畔 → 泉守汐 → 钓鱼 → 斥候连战 → 浮桥与鲸跃 → 沧澜鲸 → Ending → 灯台点亮
 * → 回音林 → 苔 → 临时组队 → 四音石 → 执灯·绯 → 林语鹿 → 第三章章节卡 → 羁绊页
 * 驱动真实场景（对话、移动、开战）。两种战斗方式：
 * - 快速（?regress=1）：胜负直接写入结果后走正常结算，只验证剧情流程；
 * - 慢速（?regress=slow）：用接近实际进度的队伍逐回合真实出招，记录回合数与剩余 HP，用来检查战斗数值。
 * 运行前备份本地存档，结束后还原，不会弄丢玩家进度。
 * @author zjh
 * @date 2026-10-15
 */

import type Phaser from 'phaser'
import { createCreature, type CreatureInstance } from '../game/data/creatures'
import { ECHO_STONES, FOREST_FLAGS, stoneLitFlag } from '../game/data/forestMap'
import type { Facing } from '../game/state/GameState'
import { GameState } from '../game/state/GameState'
import { SAVE_KEY } from '../game/systems/SaveSystem'
import { fightOut, type BattleProbe } from './autoBattle'

/** 回归中需要访问的 WorldScene 内部能力（开发调试专用） */
interface WorldProbe extends Phaser.Scene {
  busy: boolean
  dialogue: { isOpen: boolean; advance(): void }
  fishing: { active: boolean; overlay: { confirm(): void; phase: string } }
  tryInteract(): void
  tryMove(dx: number, dy: number): void
  setFacing(f: Facing): void
}

interface StepResult {
  name: string
  ok: boolean
  ms: number
  note: string
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** 两种模式的初始队伍：快速模式等级拉满保证流程，慢速模式贴近第一章通关时的实际进度 */
const PARTY: Record<'fast' | 'slow', () => CreatureInstance[]> = {
  fast: () => [createCreature('torrentshell', 30), createCreature('leafkit', 28)],
  slow: () => [createCreature('torrentshell', 15), createCreature('grovefox', 14), createCreature('pebblepup', 13)],
}

/** 慢速模式的初始背包：第一章通关时手头大致会有的伤药 */
const SLOW_BAG: [string, number][] = [
  ['potion', 6],
  ['super_potion', 3],
]

class Runner {
  readonly results: StepResult[] = []
  private readonly game: Phaser.Game
  /** 慢速模式：真实出招 */
  readonly real: boolean
  /** 当前步骤中各场战斗的摘要，写进该步说明 */
  private battleNotes: string[] = []

  constructor(game: Phaser.Game, real: boolean) {
    this.game = game
    this.real = real
  }

  /** 等待真实时间；浏览器在后台不刷新帧时手动推进，保证计时器与补间照常运行 */
  async wait(ms: number): Promise<void> {
    const end = performance.now() + ms
    while (performance.now() < end) {
      const frame = this.game.loop.frame
      await sleep(20)
      if (this.game.loop.frame === frame) this.game.step(performance.now(), 20)
    }
  }

  async until(cond: () => boolean, timeout = 10000): Promise<boolean> {
    const end = performance.now() + timeout
    while (!cond()) {
      if (performance.now() > end) return false
      await this.wait(60)
    }
    return true
  }

  active(key: string): boolean {
    return this.game.scene.isActive(key)
  }

  scene<T extends Phaser.Scene>(key: string): T {
    return this.game.scene.getScene(key) as T
  }

  world(): WorldProbe {
    return this.scene<WorldProbe>('World')
  }

  /** 摆好位置后（重新）进入大地图 */
  async enterWorld(mapId: string, x: number, y: number, facing: Facing): Promise<WorldProbe> {
    GameState.mapId = mapId
    GameState.playerX = x
    GameState.playerY = y
    GameState.facing = facing
    const cur = this.game.scene.getScenes(true)[0]
    cur.scene.start('World')
    await this.until(() => this.active('World') && !this.world().busy)
    await this.wait(900)
    return this.world()
  }

  /** 把当前对话全部点完 */
  async closeDialogue(ws: WorldProbe): Promise<void> {
    for (let i = 0; i < 40 && ws.dialogue.isOpen; i++) {
      ws.dialogue.advance()
      await this.wait(40)
      ws.dialogue.advance()
      await this.wait(80)
    }
  }

  /** 推进对话直到进入战斗 */
  async toBattle(ws: WorldProbe): Promise<boolean> {
    for (let i = 0; i < 40 && !this.active('Battle'); i++) {
      if (ws.dialogue.isOpen) {
        ws.dialogue.advance()
        await this.wait(40)
        ws.dialogue.advance()
      }
      await this.wait(120)
    }
    return this.until(() => this.active('Battle') && !!this.scene<BattleProbe>('Battle').battle)
  }

  /**
   * 打赢当前战斗并走正常结算，返回结算后进入的场景
   * 快速模式直接判胜；慢速模式真实出招，输了返回 'lost'
   */
  async winBattle(): Promise<string> {
    await this.wait(900)
    const bs = this.scene<BattleProbe>('Battle')
    if (!bs.battle) return ''
    if (this.real) {
      const enemy = bs.battle.enemyParty.map((c) => `Lv.${c.level}`).join('/')
      const rep = await fightOut(bs, () => this.wait(30))
      const potions = rep.potions ? `，用药 ${rep.potions}` : ''
      this.battleNotes.push(`${rep.won ? '胜' : '负'} ${rep.turns} 回合${potions}（敌 ${enemy}；剩余 ${rep.hpLeft}）`)
      if (!rep.won) {
        bs.endAction?.()
        await this.until(() => !this.active('Battle'), 5000)
        return 'lost'
      }
    } else {
      bs.battle.won = true
      bs.battle.fled = false
      bs.finish()
    }
    await this.until(() => !!bs.endAction, 20000)
    bs.endAction?.()
    await this.until(() => !this.active('Battle'), 5000)
    await this.wait(600)
    return this.game.scene.getScenes(true)[0]?.scene.key ?? ''
  }

  async step(name: string, run: () => Promise<string | true>): Promise<boolean> {
    const t0 = performance.now()
    this.battleNotes = []
    if (this.real) GameState.healAll()
    let ok = false
    let note = ''
    try {
      const r = await run()
      ok = r === true
      note = r === true ? '' : r
    } catch (e) {
      note = e instanceof Error ? e.message : String(e)
    }
    note = [note, ...this.battleNotes].filter(Boolean).join('；')
    this.results.push({ name, ok, ms: Math.round(performance.now() - t0), note })
    return ok
  }
}

const check = (cond: boolean, msg: string): string | true => (cond ? true : msg)

/** 慢速模式挑战沧澜鲸的队伍：按泉守汐的提示练到 Lv20 以上 */
const SLOW_WHALE_PARTY = () => [createCreature('torrentshell', 21), createCreature('grovefox', 19), createCreature('pebblepup', 18)]

/** 慢速模式进入第三章时的队伍：练到 Lv22~24，并在林中收了一只旋叶蝠 */
const SLOW_CH3_PARTY = () => [createCreature('torrentshell', 24), createCreature('whirlbat', 22), createCreature('grovefox', 22)]

/** 音石旁的站位与朝向 */
const STONE_SPOTS: Record<string, [number, number, Facing]> = {
  earth: [6, 16, 'left'],
  water: [24, 16, 'right'],
  leaf: [24, 11, 'right'],
  bird: [5, 11, 'left'],
}

/**
 * 第三章「回音」节拍：湖畔东口 → 苔 → 临时组队 → 四音石 → 绯 → 林语鹿 → 章节卡 → 羁绊页
 * @author zjh
 * @date 2026-10-15
 */
function chapter3Steps(r: Runner): [string, () => Promise<string | true>][] {
  const has = GameState.hasFlag
  /** 战后剧情台词（GameState.notices）会在回到大地图后弹出，点完再继续 */
  const settle = async () => {
    await r.until(() => r.active('World') && !r.world().busy, 8000)
    await r.wait(400)
    await r.closeDialogue(r.world())
    await r.until(() => !r.world().busy, 5000)
  }
  const knock = async (id: string) => {
    const [x, y, f] = STONE_SPOTS[id]
    const ws = await r.enterWorld('forest', x, y, f)
    ws.tryInteract()
    await r.wait(300)
    await r.closeDialogue(ws)
    await r.until(() => r.active('World') && !r.world().busy, 5000)
  }
  return [
    [
      '湖畔东口 → 回音林',
      async () => {
        if (r.real) GameState.party = SLOW_CH3_PARTY()
        const ws = await r.enterWorld('lake', 18, 9, 'right')
        ws.tryMove(1, 0)
        await r.wait(800)
        await r.until(() => r.active('World') && !r.world().busy)
        return check(GameState.mapId === 'forest', `停在 ${GameState.mapId}`)
      },
    ],
    [
      '遇见巡护员苔',
      async () => {
        const ws = await r.enterWorld('forest', 2, 26, 'up')
        ws.tryInteract()
        await r.wait(300)
        await r.closeDialogue(ws)
        return check(has(FOREST_FLAGS.metMoss), '没有写入 forest_met_moss')
      },
    ],
    [
      '临时组队：苔的森冠狐出战，玩家队伍不受影响',
      async () => {
        const before = GameState.party.map((c) => `${c.uid}:${c.hp}:${c.exp}`).join()
        const ws = await r.enterWorld('forest', 6, 21, 'right')
        ws.tryInteract()
        if (!(await r.toBattle(ws))) return '巡林者没有开战'
        const lead = r.scene<BattleProbe>('Battle').battle!.playerParty[0]
        if (lead.speciesId !== 'grovefox' || GameState.party.includes(lead)) return `出战的不是苔的伙伴（${lead.speciesId}）`
        if ((await r.winBattle()) === 'lost') return '苔的森冠狐输了'
        await settle()
        const after = GameState.party.map((c) => `${c.uid}:${c.hp}:${c.exp}`).join()
        return check(has(FOREST_FLAGS.teamBattle) && before === after, '旗标缺失或玩家队伍被改动')
      },
    ],
    [
      '四音石：敲错全灭 → 按刻字顺序解开 → 藤蔓退开',
      async () => {
        await knock('earth')
        await knock('leaf')
        if (has(stoneLitFlag('earth'))) return '敲错后音石没有熄灭'
        for (const s of ECHO_STONES) await knock(s.id)
        return check(has(FOREST_FLAGS.stonesSolved), '没有写入 forest_stones_solved')
      },
    ],
    [
      '执灯·绯 → 战后真相台词',
      async () => {
        const ws = await r.enterWorld('forest', 15, 8, 'up')
        ws.tryInteract()
        if (!(await r.toBattle(ws))) return '绯没有开战'
        if ((await r.winBattle()) === 'lost') return '输给了绯'
        await settle()
        return check(has(FOREST_FLAGS.kindler) && has(FOREST_FLAGS.kindlerStory), '旗标不完整')
      },
    ],
    [
      '林语鹿胜利 → 第三章章节卡 + 叶之徽记',
      async () => {
        const ws = await r.enterWorld('forest', 15, 5, 'up')
        ws.tryInteract()
        if (!(await r.toBattle(ws))) return '没有进入林语鹿战'
        const next = await r.winBattle()
        if (next === 'lost') return '输给了林语鹿'
        return check(next === 'Chapter' && has('chapter3_done') && has('badge_leaf'), `去向 ${next}，旗标不完整`)
      },
    ],
    [
      '章节卡 → 菜单出现「羁绊」页',
      async () => {
        await r.wait(2000)
        r.scene<Phaser.Scene & { leave(): void }>('Chapter').leave()
        if (!(await r.until(() => r.active('World') && !r.world().busy))) return '没有回到大地图'
        const ws = r.world() as WorldProbe & { menus: { openMain(): void; panel: { close(): void } } }
        ws.menus.openMain()
        const panel = ws.menus.panel as unknown as { opts: { title: string; rows: { label: string; onSelect?: () => void }[] } }
        const row = panel.opts.rows.find((x) => x.label === '羁绊')
        row?.onSelect?.()
        const ok = !!row && panel.opts.title === '羁绊' && panel.opts.rows.length >= GameState.party.length
        ws.menus.panel.close()
        return check(ok, row ? '羁绊页内容不完整' : '菜单里没有「羁绊」')
      },
    ],
  ]
}

/**
 * 依次执行剧情节拍；某一步失败后跳过后续步骤
 * @author zjh
 * @date 2026-10-15
 */
async function runSteps(r: Runner): Promise<void> {
  const has = GameState.hasFlag
  const steps: [string, () => Promise<string | true>][] = [
    [
      '第一章头目：熔鬃狮胜利 → 章节卡',
      async () => {
        GameState.newGame('tideback')
        GameState.party = PARTY[r.real ? 'slow' : 'fast']()
        if (r.real) for (const [id, n] of SLOW_BAG) GameState.addItem(id, n)
        // 视线训练家都标记为已击败，免得巡逻时把回归脚本的玩家拦下来
        GameState.flags = { ranger_beaten: true, hiker_beaten: true, lake_fisher_beaten: true, forest_herbalist_beaten: true }
        const ws = await r.enterWorld('pass', 7, 2, 'up')
        ws.tryInteract()
        if (!(await r.toBattle(ws))) return '没有进入守护兽战'
        const next = await r.winBattle()
        return check(next === 'Chapter' && has('chapter1_done') && has('badge_flame') && has('lake_unlocked'), `去向 ${next}，旗标不完整`)
      },
    ],
    [
      '章节卡 → 回到余烬山道',
      async () => {
        await r.wait(2000)
        r.scene<Phaser.Scene & { leave(): void }>('Chapter').leave()
        const back = await r.until(() => r.active('World'))
        return check(back && GameState.mapId === 'pass', `当前地图 ${GameState.mapId}`)
      },
    ],
    [
      '青苔草地南口 → 雾泉湖畔',
      async () => {
        const ws = await r.enterWorld('meadow', 8, 9, 'down')
        for (let i = 0; i < 4 && GameState.mapId === 'meadow'; i++) {
          ws.tryMove(0, 1)
          await r.wait(600)
        }
        await r.until(() => r.active('World') && !r.world().busy)
        return check(GameState.mapId === 'lake', `停在 ${GameState.mapId}`)
      },
    ],
    [
      '泉守汐：获得旧钓竿',
      async () => {
        const ws = await r.enterWorld('lake', 13, 12, 'up')
        ws.tryInteract()
        await r.closeDialogue(ws)
        await r.closeDialogue(ws)
        return check(GameState.itemCount('old_rod') === 1 && has('lake_met_shio'), '没有拿到旧钓竿')
      },
    ],
    [
      '钓鱼：上钩 → 野生战 → 钓鱼记录',
      async () => {
        const ws = await r.enterWorld('lake', 7, 8, 'up')
        for (let i = 0; i < 8 && !ws.dialogue.isOpen; i++) {
          ws.tryInteract()
          await r.until(() => ws.fishing.overlay.phase === 'bite', 5000)
          ws.fishing.overlay.confirm()
          await r.wait(500)
        }
        if (!(await r.toBattle(ws))) return '钓鱼没有进入战斗'
        await r.winBattle()
        const logged = Object.keys(GameState.world.fishLog ?? {}).length > 0
        return check(has('lake_first_fish') && logged, '没有写入 lake_first_fish / 钓鱼记录')
      },
    ],
    [
      '熄灯会斥候连战 ×2',
      async () => {
        const ws = await r.enterWorld('lake', 9, 8, 'up')
        ws.tryInteract()
        if (!(await r.toBattle(ws))) return '斥候甲没有开战'
        await r.winBattle()
        if (!(await r.toBattle(r.world()))) return '斥候乙没有自动接上'
        await r.winBattle()
        return check(has('scout1_beaten') && has('scout2_beaten'), '连战旗标不完整')
      },
    ],
    [
      '浮桥演出 + 沧澜鲸跃出水面',
      async () => {
        const ws = await r.enterWorld('lake', 13, 12, 'up')
        ws.tryInteract()
        for (let i = 0; i < 20 && !has('bridge_open'); i++) await r.closeDialogue(ws)
        if (!has('bridge_open')) return '没有写入 bridge_open'
        await r.wait(1500)
        const done = await r.until(() => r.active('World') && !r.world().busy, 15000)
        return check(done, '演出没有结束')
      },
    ],
    [
      '沧澜鲸胜利 → Ending',
      async () => {
        if (r.real) GameState.party = SLOW_WHALE_PARTY()
        const ws = await r.enterWorld('lake', 10, 3, 'up')
        ws.tryInteract()
        if (!(await r.toBattle(ws))) return '没有进入沧澜鲸战'
        const next = await r.winBattle()
        await r.until(() => r.active('Ending'), 5000)
        const rewards = GameState.itemCount('good_rod') === 1 && has('badge_tide') && has('chapter2_done')
        return check(r.active('Ending') && rewards, `去向 ${next}，奖励${rewards ? '齐全' : '缺失'}`)
      },
    ],
    [
      '继续冒险 → 灯台点亮',
      async () => {
        await r.wait(1500)
        r.scene<Phaser.Scene & { press(i: number): void }>('Ending').press(0)
        if (!(await r.until(() => r.active('World') && r.world().dialogue.isOpen, 15000))) return '没有播放灯台点亮'
        await r.closeDialogue(r.world())
        await r.until(() => r.active('World') && !r.world().busy, 8000)
        return check(has('lighthouse_lit_seen') && has(FOREST_FLAGS.unlocked), '没有写入 lighthouse_lit_seen / forest_unlocked')
      },
    ],
    ...chapter3Steps(r),
  ]
  for (const [name, run] of steps) {
    if (!(await r.step(name, run))) break
  }
  const ran = new Set(r.results.map((x) => x.name))
  for (const [name] of steps) if (!ran.has(name)) r.results.push({ name, ok: false, ms: 0, note: '前一步失败，已跳过' })
}

/** 右上角结果面板 */
function showReport(results: StepResult[], real: boolean): void {
  const pass = results.filter((x) => x.ok).length
  const box = document.createElement('div')
  box.style.cssText =
    'position:fixed;top:12px;right:12px;z-index:9999;max-width:460px;max-height:90vh;overflow:auto;padding:12px 14px;border-radius:10px;' +
    'background:#101c18ee;color:#e8f5ee;font:13px/1.6 system-ui,"Microsoft YaHei",sans-serif;box-shadow:0 6px 20px #0008'
  const mode = real ? '慢速 · 真实出招' : '快速'
  const title = `<b>剧情回归（${mode}） ${pass}/${results.length} ${pass === results.length ? '✅ 全部通过' : '❌ 有失败'}</b>`
  const rows = results
    .map((x) => {
      const color = x.ok ? '#a8e6c0' : '#ffb0a0'
      return `<div>${x.ok ? '✅' : '❌'} ${x.name} <span style="opacity:.6">${x.ms}ms</span>${x.note ? `<br><span style="color:${color}">　${x.note}</span>` : ''}</div>`
    })
    .join('')
  box.innerHTML = `${title}${rows}<div style="opacity:.6;margin-top:6px">本地存档已还原。点击关闭。</div>`
  box.onclick = () => box.remove()
  document.body.appendChild(box)
}

/**
 * 入口：等待标题画面 → 备份存档 → 跑全部节拍 → 还原存档 → 展示结果
 * @param real 慢速模式：真实出招直到分出胜负
 * @author zjh
 * @date 2026-10-15
 */
export async function runStoryRegression(game: Phaser.Game, real = false): Promise<StepResult[]> {
  const r = new Runner(game, real)
  await r.until(() => r.active('Title'), 30000)
  const backup = localStorage.getItem(SAVE_KEY)
  const errors: string[] = []
  const onError = (e: ErrorEvent) => errors.push(e.message)
  window.addEventListener('error', onError)
  try {
    await runSteps(r)
  } finally {
    window.removeEventListener('error', onError)
    if (backup === null) localStorage.removeItem(SAVE_KEY)
    else localStorage.setItem(SAVE_KEY, backup)
  }
  if (errors.length) r.results.push({ name: '运行期间无脚本错误', ok: false, ms: 0, note: errors.slice(0, 3).join(' | ') })
  else r.results.push({ name: '运行期间无脚本错误', ok: true, ms: 0, note: '' })

  Object.assign(window, { __regressResult: r.results })
  console.table(r.results)
  showReport(r.results, real)
  game.scene.getScenes(true)[0]?.scene.start('Title')
  return r.results
}
