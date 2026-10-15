/**
 * 回合制战斗场景：布局、帧播放、学招与结算衔接
 * 逻辑层产出 BattleFrame 队列，本场景逐帧播放提示、血条与动画（动画细节见 ui/BattleFx）；
 * 指令菜单见 battle/BattleMenus + battle/OptionMenu，战后写回见 battle/BattleSettle。
 * @author zjh
 * @date 2026-10-15
 */

import Phaser from 'phaser'
import { SPECIES, TYPE_LABEL } from '../data/creatures'
import { ownedBadgeTypes } from '../data/badges'
import { WEATHER_INFO } from '../data/weather'
import { setBattleCreatureScale } from '../graphics/CreatureArt'
import { addBackdrop, battleBackdropKey } from '../graphics/SceneArt'
import { GameState, type PendingBattle } from '../state/GameState'
import { Sfx } from '../systems/AudioBeeps'
import { startBattle, type BattleFrame, type BattleState, type SideSnap } from '../systems/BattleLogic'
import { STATUS_LABEL } from '../systems/StatusEffects'
import { isFullMoon } from '../systems/WorldClock'
import { BattleFx } from '../ui/BattleFx'
import { HpBar } from '../ui/HpBar'
import { InputKeys } from '../ui/InputKeys'
import { ListPanel } from '../ui/ListPanel'
import { openMoveReplace } from '../ui/MoveLearnFlow'
import { fadeIn, fadeToScene } from '../ui/Transition'
import { WeatherLayer } from '../ui/WeatherLayer'
import { BattleMenus } from './battle/BattleMenus'
import { settleBattle } from './battle/BattleSettle'
import { OptionMenu, type BattleOption } from './battle/OptionMenu'

type Mode = 'play' | 'menu' | 'end' | 'idle'

const CHAR_MS = 16
const FRAME_HOLD_MS = 650
const BOX_Y = 344
const PLAYER_SCALE = 2.6
const ENEMY_SCALE = 2.4
const HUD_DEPTH = 10

const STATUS_COLOR: Record<string, string> = { burn: '#ff8a5a', paralyze: '#ffe066', freeze: '#9ad8ff' }

export class BattleScene extends Phaser.Scene {
  private battle!: BattleState
  private pending!: PendingBattle
  private keys!: InputKeys
  private panel!: ListPanel
  private fx!: BattleFx
  private weatherLayer!: WeatherLayer
  private mode: Mode = 'idle'

  private playerSpr!: Phaser.GameObjects.Image
  private enemySpr!: Phaser.GameObjects.Image
  private readonly playerHome = { x: 170, y: 262 }
  private readonly enemyHome = { x: 470, y: 146 }

  private pName!: Phaser.GameObjects.Text
  private pStatus!: Phaser.GameObjects.Text
  private pHpText!: Phaser.GameObjects.Text
  private pHp!: HpBar
  private pExp!: HpBar
  private eName!: Phaser.GameObjects.Text
  private eStatus!: Phaser.GameObjects.Text
  private eHp!: HpBar
  private weatherText!: Phaser.GameObjects.Text
  private eDots: Phaser.GameObjects.Arc[] = []
  private enemyFainted = 0

  private msgText!: Phaser.GameObjects.Text
  private menu!: OptionMenu
  private commands!: BattleMenus

  private queue: BattleFrame[] = []
  private queueDone?: () => void
  private lastFrame?: BattleFrame
  private typeTimer?: Phaser.Time.TimerEvent
  private holdTimer?: Phaser.Time.TimerEvent
  private typedAll = false
  private currentText = ''
  private endAction?: () => void

  constructor() {
    super('Battle')
  }

  create(): void {
    const pending = GameState.pendingBattle
    if (!pending) {
      this.scene.start('World')
      return
    }
    this.pending = pending
    this.mode = 'idle'
    this.queue = []
    this.eDots = []
    this.enemyFainted = 0
    this.lastFrame = undefined
    this.endAction = undefined

    const token = pending.kind === 'unique' && GameState.world.phenomenon.token
    this.battle = startBattle(GameState.party, pending.enemies, pending.kind, {
      trainerName: pending.trainerName,
      weather: pending.weather,
      night: pending.night,
      token,
      badges: ownedBadgeTypes(GameState.hasFlag),
    })

    this.fx = new BattleFx(this)
    this.drawStage()
    this.weatherLayer = new WeatherLayer(this, 5, { w: this.scale.width, h: BOX_Y })
    this.weatherLayer.set(pending.weather, pending.night, isFullMoon(GameState.world.totalSteps))
    if (pending.kind === 'unique') this.weatherLayer.setExtraTint(0x8a6aff, 0.08)
    this.buildHud()
    this.buildMessageBox()
    this.panel = new ListPanel(this)
    this.keys = new InputKeys(this)
    this.commands = new BattleMenus({
      battle: this.battle,
      panel: this.panel,
      showOptions: (prompt, options, onBack, index) => this.showOptions(prompt, options, onBack, index),
      act: (fn) => this.act(fn),
      finish: () => this.finish(),
    })

    // 双方初始不可见，由入场帧滑入
    this.playerSpr.setAlpha(0)
    this.enemySpr.setAlpha(0)

    fadeIn(this, 300)
    this.time.delayedCall(320, () => this.playFrames(() => this.commands.root()))
  }

  update(_time: number, delta: number): void {
    this.weatherLayer?.update(delta)
    const input = this.keys.poll()
    if (this.panel.isOpen) {
      this.panel.handle(input)
      return
    }
    if (this.mode === 'play' && input.confirm) {
      this.skipFrame()
    } else if (this.mode === 'menu') {
      this.menu.handle(input)
    } else if (this.mode === 'end' && input.confirm) {
      this.endAction?.()
    }
  }

  // ───────────────────────── 布局 ─────────────────────────

  private drawStage(): void {
    if (addBackdrop(this, battleBackdropKey(this.pending))) {
      this.add.ellipse(this.enemyHome.x, this.enemyHome.y + 50, 170, 34, 0x000000, 0.22)
      this.add.ellipse(this.playerHome.x, this.playerHome.y + 56, 190, 38, 0x000000, 0.25)
    } else {
      this.drawPlainStage()
    }
    this.enemySpr = setBattleCreatureScale(this.add.image(this.enemyHome.x, this.enemyHome.y, 'spr-flarehorn'), ENEMY_SCALE)
    this.playerSpr = setBattleCreatureScale(this.add.image(this.playerHome.x, this.playerHome.y, 'spr-flarehorn'), PLAYER_SCALE)
  }

  /** 缺背景图时的纯色场地 */
  private drawPlainStage(): void {
    const { width, height } = this.scale
    const theme =
      this.pending.kind === 'boss'
        ? { sky: 0x3a1a1a, ground: 0x5a2a20, pad: 0x7a3a28 }
        : this.pending.kind === 'unique'
          ? { sky: 0x1a1438, ground: 0x2a2450, pad: 0x4a3a7a }
          : this.pending.returnMapId === 'pass'
            ? { sky: 0x4a3430, ground: 0x6b4a3a, pad: 0x8a6450 }
            : { sky: 0x1b3a40, ground: 0x2a5a3a, pad: 0x3a7a4a }
    this.add.rectangle(0, 0, width, height, theme.sky).setOrigin(0)
    this.add.rectangle(0, 190, width, BOX_Y - 190, theme.ground).setOrigin(0)
    // 远处小光点
    for (let i = 0; i < 14; i++) {
      const dot = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(10, 180),
        Phaser.Math.Between(1, 2),
        0xffffff,
        0.35,
      )
      this.tweens.add({ targets: dot, alpha: 0.05, yoyo: true, repeat: -1, duration: Phaser.Math.Between(800, 1800) })
    }
    this.add.ellipse(this.enemyHome.x, this.enemyHome.y + 46, 190, 44, theme.pad, 0.9)
    this.add.ellipse(this.playerHome.x, this.playerHome.y + 50, 210, 50, theme.pad, 0.9)
  }

  private buildHud(): void {
    // 敌方信息（左上）
    const eBox = this.add.container(20, 22).setDepth(HUD_DEPTH)
    eBox.add(this.add.rectangle(0, 0, 250, 62, 0x102018, 0.9).setOrigin(0).setStrokeStyle(2, 0xa8e6c0))
    this.eName = this.add.text(12, 8, '', { fontSize: '15px', color: '#f0e6c8' })
    this.eStatus = this.add.text(238, 8, '', { fontSize: '13px', color: '#ffffff' }).setOrigin(1, 0)
    eBox.add([this.eName, this.eStatus])
    eBox.add(this.add.text(12, 34, 'HP', { fontSize: '12px', color: '#ffd77a' }))
    this.eHp = new HpBar(this, eBox, 36, 41, 196, 8)
    if (this.battle.enemyParty.length > 1) {
      this.battle.enemyParty.forEach((_, i) => {
        const dot = this.add.circle(32 + i * 16, 94, 5, 0xff8f6b).setStrokeStyle(1, 0xffffff).setDepth(HUD_DEPTH)
        this.eDots.push(dot)
      })
    }

    // 我方信息（右侧）
    const pBox = this.add.container(370, 214).setDepth(HUD_DEPTH)
    pBox.add(this.add.rectangle(0, 0, 250, 84, 0x102018, 0.9).setOrigin(0).setStrokeStyle(2, 0xa8e6c0))
    this.pName = this.add.text(12, 8, '', { fontSize: '15px', color: '#e8f5ee' })
    this.pStatus = this.add.text(238, 8, '', { fontSize: '13px', color: '#ffffff' }).setOrigin(1, 0)
    pBox.add([this.pName, this.pStatus])
    pBox.add(this.add.text(12, 34, 'HP', { fontSize: '12px', color: '#ffd77a' }))
    this.pHp = new HpBar(this, pBox, 36, 41, 196, 8)
    this.pHpText = this.add.text(236, 50, '', { fontSize: '13px', color: '#e8f5ee' }).setOrigin(1, 0)
    pBox.add(this.pHpText)
    pBox.add(this.add.text(12, 66, 'EXP', { fontSize: '10px', color: '#8fc8ff' }))
    this.pExp = new HpBar(this, pBox, 40, 72, 130, 4, 0x6aa8ff)

    // 天气 / 时段（右上）
    this.weatherText = this.add
      .text(this.scale.width - 14, 10, '', { fontSize: '13px', color: '#e8f5ee', backgroundColor: '#10201899', padding: { x: 6, y: 3 } })
      .setOrigin(1, 0)
      .setDepth(HUD_DEPTH)
    this.refreshWeatherText(this.pending.weather)
  }

  private refreshWeatherText(weather: BattleFrame['weather']): void {
    const time = this.pending.night ? '☾ 夜' : '☼ 昼'
    const w = weather ? `${WEATHER_INFO[weather].icon} ${WEATHER_INFO[weather].label}` : '无天气'
    this.weatherText.setText(`${time} · ${w}`)
  }

  private buildMessageBox(): void {
    const { width, height } = this.scale
    this.add
      .rectangle(width / 2, BOX_Y + (height - BOX_Y) / 2, width - 16, height - BOX_Y - 8, 0x102018, 0.96)
      .setStrokeStyle(2, 0xe8a838)
      .setDepth(HUD_DEPTH)
      .setInteractive()
      .on('pointerdown', () => {
        if (this.mode === 'play') this.skipFrame()
        else if (this.mode === 'end') this.endAction?.()
      })
    this.msgText = this.add
      .text(26, BOX_Y + 16, '', {
        fontSize: '16px',
        color: '#e8f5ee',
        wordWrap: { width: width - 60, useAdvancedWrap: true },
        lineSpacing: 6,
      })
      .setDepth(HUD_DEPTH)
    this.menu = new OptionMenu(this, this.msgText, BOX_Y, HUD_DEPTH + 1)
  }

  // ───────────────────────── 帧播放 ─────────────────────────

  /**
   * 取走逻辑层新产生的帧并依次播放
   * @author zjh
   * @date 2026-10-14
   */
  private playFrames(onDone: () => void): void {
    this.queue.push(...this.battle.frames.splice(0))
    this.queueDone = onDone
    this.menu.clear()
    this.mode = 'play'
    this.nextFrame()
  }

  private nextFrame(): void {
    this.typeTimer?.remove()
    this.holdTimer?.remove()
    const f = this.queue.shift()
    if (!f) {
      this.mode = 'idle'
      const cb = this.queueDone
      this.queueDone = undefined
      cb?.()
      return
    }
    this.applyFrame(f)
    this.typeText(f.text)
  }

  private typeText(text: string): void {
    this.currentText = text
    this.typedAll = false
    let shown = 0
    this.msgText.setWordWrapWidth(this.scale.width - 60)
    this.msgText.setText('')
    this.typeTimer = this.time.addEvent({
      delay: CHAR_MS,
      loop: true,
      callback: () => {
        shown++
        this.msgText.setText(text.slice(0, shown))
        if (shown >= text.length) this.onTyped()
      },
    })
  }

  /** 打字完成；掉帧时打字计时器可能在同一帧回调多次，需保证只生效一次 */
  private onTyped(): void {
    if (this.typedAll) return
    this.typeTimer?.remove()
    this.msgText.setText(this.currentText)
    this.typedAll = true
    this.holdTimer?.remove()
    const hold = this.time.delayedCall(FRAME_HOLD_MS, () => {
      if (this.holdTimer === hold && this.mode === 'play') this.nextFrame()
    })
    this.holdTimer = hold
  }

  /** 确认键：打字中补全，否则立即下一帧 */
  private skipFrame(): void {
    if (!this.typedAll) this.onTyped()
    else this.nextFrame()
  }

  /**
   * 应用一帧：刷新 HUD、播放动画
   * @author zjh
   * @date 2026-10-14
   */
  private applyFrame(f: BattleFrame): void {
    const prev = this.lastFrame
    this.lastFrame = f
    this.refreshHud(f.player, f.enemy, !!prev)
    const pDmg = (prev?.player.hp ?? f.player.hp) - f.player.hp
    const eDmg = (prev?.enemy.hp ?? f.enemy.hp) - f.enemy.hp

    switch (f.anim) {
      case 'swapEnemy':
        GameState.markSeen(f.enemy.speciesId)
        this.slideIn(this.enemySpr, f.enemy.sprite, this.enemyHome, 1, ENEMY_SCALE)
        if (f.enemy.shiny) this.time.delayedCall(380, () => this.fx.sparkle(this.enemyHome.x, this.enemyHome.y, 0xfff0a0, 14))
        break
      case 'swapPlayer':
        this.slideIn(this.playerSpr, f.player.sprite, this.playerHome, -1, PLAYER_SCALE)
        break
      case 'hitEnemy':
        this.fx.lunge(this.playerSpr, 1)
        this.fx.hurt(this.enemySpr, eDmg, f.mult)
        break
      case 'hitPlayer':
        this.fx.lunge(this.enemySpr, -1)
        this.fx.hurt(this.playerSpr, pDmg, f.mult)
        break
      case 'hurtEnemy':
        this.fx.hurt(this.enemySpr, eDmg)
        break
      case 'hurtPlayer':
        this.fx.hurt(this.playerSpr, pDmg)
        break
      case 'miss':
        this.fx.floatText(this.scale.width / 2, 170, 'MISS', '#a8c8ff', 18)
        Sfx.cancel()
        break
      case 'faintEnemy':
        this.enemyFainted++
        this.eDots.forEach((d, i) => d.setFillStyle(i < this.enemyFainted ? 0x444444 : 0xff8f6b))
        this.fx.faint(this.enemySpr)
        break
      case 'faintPlayer':
        this.fx.faint(this.playerSpr)
        break
      case 'throw':
        this.fx.throwBerry(this.playerHome, this.enemyHome)
        break
      case 'catchOk':
        Sfx.win()
        this.tweens.add({ targets: this.enemySpr, scale: this.enemySpr.scale * 0.08, alpha: 0, duration: 400 })
        this.fx.sparkle(this.enemyHome.x, this.enemyHome.y, 0xffd6e0)
        break
      case 'catchFail':
        Sfx.cancel()
        this.tweens.add({ targets: this.enemySpr, angle: { from: -10, to: 10 }, yoyo: true, repeat: 2, duration: 80, onComplete: () => this.enemySpr.setAngle(0) })
        break
      case 'heal':
        Sfx.confirm()
        this.fx.tintFlash(this.playerSpr, 0x8fff9a)
        this.fx.sparkle(this.playerHome.x, this.playerHome.y, 0x8fff9a)
        break
      case 'healEnemy':
        Sfx.confirm()
        this.fx.tintFlash(this.enemySpr, 0x8fff9a)
        this.fx.sparkle(this.enemyHome.x, this.enemyHome.y, 0x8fff9a)
        break
      case 'buffPlayer':
        this.fx.statArrows(this.playerSpr, true)
        break
      case 'buffEnemy':
        this.fx.statArrows(this.enemySpr, true)
        break
      case 'debuffPlayer':
        this.fx.statArrows(this.playerSpr, false)
        break
      case 'debuffEnemy':
        this.fx.statArrows(this.enemySpr, false)
        break
      case 'statusPlayer':
        this.fx.statusPulse(this.playerSpr)
        break
      case 'statusEnemy':
        this.fx.statusPulse(this.enemySpr)
        break
      case 'weather':
        this.refreshWeatherText(f.weather)
        this.weatherLayer.set(f.weather, this.pending.night, isFullMoon(GameState.world.totalSteps))
        break
      case 'levelUp':
        Sfx.win()
        this.fx.tintFlash(this.playerSpr, 0xffe066)
        break
      case 'evolve':
        this.fx.evolve(this.playerSpr, f.player.sprite, this.playerHome, PLAYER_SCALE)
        break
      case 'awaken':
        this.fx.evolve(this.playerSpr, f.player.sprite, this.playerHome, PLAYER_SCALE, 0xff9a40)
        break
      default:
        break
    }
  }

  private statusTag(s: SideSnap): string {
    const parts: string[] = []
    if (s.status) parts.push(STATUS_LABEL[s.status])
    if (s.confused) parts.push('乱')
    return parts.join(' ')
  }

  private refreshHud(p: SideSnap, e: SideSnap, animate: boolean): void {
    const pType = TYPE_LABEL[SPECIES[p.speciesId].type]
    const eType = TYPE_LABEL[SPECIES[e.speciesId].type]
    this.pName.setText(`${p.name} Lv.${p.level} [${pType}]`)
    this.eName.setText(`${e.name} Lv.${e.level} [${eType}]`)
    this.pStatus.setText(this.statusTag(p)).setColor(STATUS_COLOR[p.status ?? ''] ?? '#d8a8ff')
    this.eStatus.setText(this.statusTag(e)).setColor(STATUS_COLOR[e.status ?? ''] ?? '#d8a8ff')
    this.pHp.set(p.hp, p.maxHp, animate)
    this.eHp.set(e.hp, e.maxHp, animate)
    this.pHpText.setText(`${p.hp}/${p.maxHp}`)
    this.pExp.set(p.exp, p.expNext, animate)
    this.refreshWeatherText(this.lastFrame?.weather ?? this.pending.weather)
  }

  private slideIn(spr: Phaser.GameObjects.Image, texture: string, home: { x: number; y: number }, dir: 1 | -1, scale: number): void {
    setBattleCreatureScale(spr.setTexture(texture).setAlpha(1).setAngle(0).clearTint(), scale)
    spr.setPosition(home.x + dir * 260, home.y)
    this.tweens.add({ targets: spr, x: home.x, duration: 360, ease: 'Back.easeOut' })
  }

  // ───────────────────────── 指令菜单 ─────────────────────────

  /** 停止打字计时，显示一组指令（具体菜单见 battle/BattleMenus） */
  private showOptions(prompt: string, options: BattleOption[], onBack?: () => void, index = 0): void {
    this.typeTimer?.remove()
    this.holdTimer?.remove()
    this.mode = 'menu'
    this.currentText = prompt
    this.menu.show(prompt, options, onBack, index)
  }

  /** 执行一次行动并播放结果，播完回到根菜单 */
  private act(fn: () => void): void {
    this.menu.clear()
    fn()
    this.playFrames(() => this.commands.root())
  }

  // ───────────────────────── 结算 ─────────────────────────

  /**
   * 战斗结束：数据写回见 battle/BattleSettle；这里逐个处理学招，播完提示后切场景
   * @author zjh
   * @date 2026-10-15
   */
  private finish(): void {
    const { notes, next: to } = settleBattle(this.battle, this.pending)
    const next = to
      ? () => fadeToScene(this, to.scene, 900, to.scene === 'Chapter' ? to.data : undefined)
      : () => fadeToScene(this, 'World')
    this.processLearns([...this.battle.pendingLearns], notes, () => this.showNotes(notes, next))
  }

  /**
   * 依次弹出技能替换面板，结果追加到 notes
   * @author zjh
   * @date 2026-10-14
   */
  private processLearns(list: { uid: string; moveId: string }[], notes: string[], done: () => void): void {
    const item = list.shift()
    if (!item) {
      done()
      return
    }
    const c = [...GameState.party, ...GameState.storage].find((x) => x.uid === item.uid)
    if (!c || c.moves.some((m) => m.id === item.moveId)) {
      this.processLearns(list, notes, done)
      return
    }
    this.mode = 'idle'
    openMoveReplace(this.panel, c, item.moveId, (msg) => {
      this.panel.close()
      notes.push(msg)
      this.processLearns(list, notes, done)
    })
  }

  private showNotes(notes: string[], next: () => void): void {
    const last = this.lastFrame
    if (last) this.queue.push(...notes.map((text) => ({ ...last, text, anim: 'none' as const })))
    this.playFrames(() => {
      this.msgText.setText(`${this.currentText}\n\n▶ 按空格 / 点击继续`)
      this.mode = 'end'
      this.endAction = () => {
        this.endAction = undefined
        this.mode = 'idle'
        next()
      }
    })
  }
}
