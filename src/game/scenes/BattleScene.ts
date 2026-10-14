/**
 * 回合制战斗场景：出招 / 道具 / 换人 / 逃跑
 * 逻辑层产出 BattleFrame 队列，本场景逐帧播放提示、血条与动画。
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import {
  SPECIES,
  TYPE_LABEL,
  displayName,
  getMoves,
  typeMultiplier,
} from '../data/creatures'
import { ITEMS, ITEM_ORDER } from '../data/items'
import { GameState, RESPAWN, type PendingBattle } from '../state/GameState'
import { Sfx } from '../systems/AudioBeeps'
import {
  activeEnemy,
  activePlayer,
  checkItem,
  playerFight,
  playerRun,
  playerSwitch,
  playerUseItem,
  startBattle,
  type BattleFrame,
  type BattleState,
  type SideSnap,
} from '../systems/BattleLogic'
import { HpBar } from '../ui/HpBar'
import { InputKeys } from '../ui/InputKeys'
import { ListPanel, type ListRow } from '../ui/ListPanel'
import { fadeIn, fadeToScene } from '../ui/Transition'

/** 指令按钮 */
interface BattleOption {
  label: string
  /** 选中时左侧说明 */
  info?: string
  disabled?: boolean
  onSelect: () => void
}

type Mode = 'play' | 'menu' | 'end' | 'idle'

const CHAR_MS = 16
const FRAME_HOLD_MS = 650
const BOX_Y = 344

export class BattleScene extends Phaser.Scene {
  private battle!: BattleState
  private pending!: PendingBattle
  private keys!: InputKeys
  private panel!: ListPanel
  private mode: Mode = 'idle'

  private playerSpr!: Phaser.GameObjects.Image
  private enemySpr!: Phaser.GameObjects.Image
  private readonly playerHome = { x: 170, y: 262 }
  private readonly enemyHome = { x: 470, y: 146 }

  private pName!: Phaser.GameObjects.Text
  private pHpText!: Phaser.GameObjects.Text
  private pHp!: HpBar
  private pExp!: HpBar
  private eName!: Phaser.GameObjects.Text
  private eHp!: HpBar
  private eDots: Phaser.GameObjects.Arc[] = []
  private enemyFainted = 0

  private msgText!: Phaser.GameObjects.Text
  private optLayer!: Phaser.GameObjects.Container
  private options: BattleOption[] = []
  private optIndex = 0
  private optBack?: () => void

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
    this.options = []
    this.eDots = []
    this.enemyFainted = 0
    this.lastFrame = undefined
    this.endAction = undefined

    this.battle = startBattle(GameState.party, pending.enemies, pending.kind, pending.trainerName)

    this.drawStage()
    this.buildHud()
    this.buildMessageBox()
    this.panel = new ListPanel(this)
    this.keys = new InputKeys(this)

    // 双方初始不可见，由入场帧滑入
    this.playerSpr.setAlpha(0)
    this.enemySpr.setAlpha(0)

    fadeIn(this, 300)
    this.time.delayedCall(320, () => this.playFrames(() => this.showRoot()))
  }

  update(): void {
    const input = this.keys.poll()
    if (this.panel.isOpen) {
      this.panel.handle(input)
      return
    }
    if (this.mode === 'play' && input.confirm) {
      this.skipFrame()
    } else if (this.mode === 'menu') {
      this.handleMenuInput(input)
    } else if (this.mode === 'end' && input.confirm) {
      this.endAction?.()
    }
  }

  // ───────────────────────── 布局 ─────────────────────────

  private drawStage(): void {
    const { width, height } = this.scale
    const theme =
      this.pending.kind === 'boss'
        ? { sky: 0x3a1a1a, ground: 0x5a2a20, pad: 0x7a3a28 }
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

    this.enemySpr = this.add.image(this.enemyHome.x, this.enemyHome.y, 'spr-flarehorn').setScale(2.4)
    this.playerSpr = this.add.image(this.playerHome.x, this.playerHome.y, 'spr-flarehorn').setScale(2.6)
  }

  private buildHud(): void {
    // 敌方信息（左上）
    const eBox = this.add.container(20, 22)
    eBox.add(this.add.rectangle(0, 0, 250, 62, 0x102018, 0.9).setOrigin(0).setStrokeStyle(2, 0xa8e6c0))
    this.eName = this.add.text(12, 8, '', { fontSize: '15px', color: '#f0e6c8' })
    eBox.add(this.eName)
    eBox.add(this.add.text(12, 34, 'HP', { fontSize: '12px', color: '#ffd77a' }))
    this.eHp = new HpBar(this, eBox, 36, 41, 196, 8)
    if (this.battle.enemyParty.length > 1) {
      this.battle.enemyParty.forEach((_, i) => {
        const dot = this.add.circle(20 + 12 + i * 16, 94, 5, 0xff8f6b).setStrokeStyle(1, 0xffffff)
        this.eDots.push(dot)
      })
    }

    // 我方信息（右侧）
    const pBox = this.add.container(370, 214)
    pBox.add(this.add.rectangle(0, 0, 250, 84, 0x102018, 0.9).setOrigin(0).setStrokeStyle(2, 0xa8e6c0))
    this.pName = this.add.text(12, 8, '', { fontSize: '15px', color: '#e8f5ee' })
    pBox.add(this.pName)
    pBox.add(this.add.text(12, 34, 'HP', { fontSize: '12px', color: '#ffd77a' }))
    this.pHp = new HpBar(this, pBox, 36, 41, 196, 8)
    this.pHpText = this.add.text(236, 50, '', { fontSize: '13px', color: '#e8f5ee' }).setOrigin(1, 0)
    pBox.add(this.pHpText)
    pBox.add(this.add.text(12, 66, 'EXP', { fontSize: '10px', color: '#8fc8ff' }))
    this.pExp = new HpBar(this, pBox, 40, 72, 130, 4, 0x6aa8ff)
  }

  private buildMessageBox(): void {
    const { width, height } = this.scale
    this.add
      .rectangle(width / 2, BOX_Y + (height - BOX_Y) / 2, width - 16, height - BOX_Y - 8, 0x102018, 0.96)
      .setStrokeStyle(2, 0xe8a838)
      .setInteractive()
      .on('pointerdown', () => {
        if (this.mode === 'play') this.skipFrame()
        else if (this.mode === 'end') this.endAction?.()
      })
    this.msgText = this.add.text(26, BOX_Y + 16, '', {
      fontSize: '16px',
      color: '#e8f5ee',
      wordWrap: { width: width - 60, useAdvancedWrap: true },
      lineSpacing: 6,
    })
    this.optLayer = this.add.container(0, 0)
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
    this.clearOptions()
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

  private onTyped(): void {
    this.typeTimer?.remove()
    this.msgText.setText(this.currentText)
    this.typedAll = true
    this.holdTimer = this.time.delayedCall(FRAME_HOLD_MS, () => this.nextFrame())
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

    switch (f.anim) {
      case 'swapEnemy':
        GameState.markSeen(f.enemy.speciesId)
        this.slideIn(this.enemySpr, f.enemy.speciesId, this.enemyHome, 1)
        break
      case 'swapPlayer':
        this.slideIn(this.playerSpr, f.player.speciesId, this.playerHome, -1)
        break
      case 'hitEnemy':
        this.lunge(this.playerSpr, 1)
        this.hurt(this.enemySpr, (prev?.enemy.hp ?? f.enemy.hp) - f.enemy.hp, f.mult)
        break
      case 'hitPlayer':
        this.lunge(this.enemySpr, -1)
        this.hurt(this.playerSpr, (prev?.player.hp ?? f.player.hp) - f.player.hp, f.mult)
        break
      case 'faintEnemy':
        this.enemyFainted++
        this.eDots.forEach((d, i) => d.setFillStyle(i < this.enemyFainted ? 0x444444 : 0xff8f6b))
        this.faint(this.enemySpr)
        break
      case 'faintPlayer':
        this.faint(this.playerSpr)
        break
      case 'throw':
        this.throwBerry()
        break
      case 'catchOk':
        Sfx.win()
        this.tweens.add({ targets: this.enemySpr, scale: 0.2, alpha: 0, duration: 400 })
        this.sparkle(this.enemyHome.x, this.enemyHome.y, 0xffd6e0)
        break
      case 'catchFail':
        Sfx.cancel()
        this.tweens.add({ targets: this.enemySpr, angle: { from: -10, to: 10 }, yoyo: true, repeat: 2, duration: 80, onComplete: () => this.enemySpr.setAngle(0) })
        break
      case 'heal':
        Sfx.confirm()
        this.tintFlash(this.playerSpr, 0x8fff9a)
        this.sparkle(this.playerHome.x, this.playerHome.y, 0x8fff9a)
        break
      case 'levelUp':
        Sfx.win()
        this.tintFlash(this.playerSpr, 0xffe066)
        break
      case 'evolve':
        this.evolveFx(f.player.speciesId)
        break
      default:
        break
    }
  }

  private refreshHud(p: SideSnap, e: SideSnap, animate: boolean): void {
    const pType = TYPE_LABEL[SPECIES[p.speciesId].type]
    const eType = TYPE_LABEL[SPECIES[e.speciesId].type]
    this.pName.setText(`${p.name}  Lv.${p.level}  [${pType}]`)
    this.eName.setText(`${e.name}  Lv.${e.level}  [${eType}]`)
    this.pHp.set(p.hp, p.maxHp, animate)
    this.eHp.set(e.hp, e.maxHp, animate)
    this.pHpText.setText(`${p.hp}/${p.maxHp}`)
    this.pExp.set(p.exp, p.expNext, animate)
  }

  // ───────────────────────── 动画 ─────────────────────────

  private slideIn(
    spr: Phaser.GameObjects.Image,
    speciesId: string,
    home: { x: number; y: number },
    dir: 1 | -1,
  ): void {
    spr.setTexture(`spr-${speciesId}`).setAlpha(1).setAngle(0).clearTint()
    spr.setScale(spr === this.playerSpr ? 2.6 : 2.4)
    spr.setPosition(home.x + dir * 260, home.y)
    this.tweens.add({ targets: spr, x: home.x, duration: 360, ease: 'Back.easeOut' })
  }

  private lunge(spr: Phaser.GameObjects.Image, dir: 1 | -1): void {
    this.tweens.add({ targets: spr, x: spr.x + dir * 24, yoyo: true, duration: 90 })
  }

  private hurt(spr: Phaser.GameObjects.Image, dmg: number, mult?: number): void {
    Sfx.hit()
    this.time.delayedCall(120, () => {
      this.tweens.add({ targets: spr, alpha: 0.2, yoyo: true, repeat: 2, duration: 70, onComplete: () => spr.setAlpha(1) })
      if (mult && mult > 1) this.cameras.main.shake(180, 0.008)
      if (dmg > 0) {
        const t = this.add
          .text(spr.x, spr.y - 50, `-${dmg}`, {
            fontSize: mult && mult > 1 ? '22px' : '18px',
            color: mult && mult > 1 ? '#ffd040' : '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
          })
          .setOrigin(0.5)
          .setDepth(50)
        this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 700, onComplete: () => t.destroy() })
      }
    })
  }

  private faint(spr: Phaser.GameObjects.Image): void {
    Sfx.cancel()
    this.tweens.add({ targets: spr, y: spr.y + 40, alpha: 0, duration: 420, ease: 'Quad.easeIn' })
  }

  private tintFlash(spr: Phaser.GameObjects.Image, color: number): void {
    spr.setTint(color)
    this.time.delayedCall(300, () => spr.clearTint())
  }

  private sparkle(x: number, y: number, color: number): void {
    for (let i = 0; i < 10; i++) {
      const s = this.add.star(x, y, 4, 2, 5, color).setDepth(40)
      const a = (i / 10) * Math.PI * 2
      this.tweens.add({
        targets: s,
        x: x + Math.cos(a) * 60,
        y: y + Math.sin(a) * 60,
        alpha: 0,
        angle: 180,
        duration: 600,
        onComplete: () => s.destroy(),
      })
    }
  }

  private throwBerry(): void {
    Sfx.confirm()
    const berry = this.add.image(this.playerHome.x, this.playerHome.y - 20, 'spr-berry').setScale(2).setDepth(45)
    const state = { t: 0 }
    const sx = berry.x
    const sy = berry.y
    const ex = this.enemyHome.x
    const ey = this.enemyHome.y
    this.tweens.add({
      targets: state,
      t: 1,
      duration: 480,
      onUpdate: () => {
        berry.setPosition(sx + (ex - sx) * state.t, sy + (ey - sy) * state.t - Math.sin(state.t * Math.PI) * 120)
        berry.setAngle(state.t * 540)
      },
      onComplete: () => {
        this.tweens.add({ targets: berry, alpha: 0, duration: 300, delay: 300, onComplete: () => berry.destroy() })
      },
    })
  }

  private evolveFx(newSpecies: string): void {
    const spr = this.playerSpr
    this.cameras.main.flash(500, 255, 255, 255)
    spr.setTintFill(0xffffff)
    this.tweens.add({
      targets: spr,
      scale: { from: 2.6, to: 3.1 },
      yoyo: true,
      repeat: 3,
      duration: 120,
      onComplete: () => {
        spr.setTexture(`spr-${newSpecies}`).clearTint().setScale(2.6)
        this.sparkle(this.playerHome.x, this.playerHome.y, 0xffe066)
        Sfx.win()
      },
    })
  }

  // ───────────────────────── 指令菜单 ─────────────────────────

  private clearOptions(): void {
    this.optLayer.removeAll(true)
    this.options = []
    this.optBack = undefined
  }

  /**
   * 在消息框右侧显示 2×2 指令
   * @author zjh
   * @date 2026-10-14
   */
  private showOptions(prompt: string, options: BattleOption[], onBack?: () => void, index = 0): void {
    this.typeTimer?.remove()
    this.holdTimer?.remove()
    this.clearOptions()
    this.options = options
    this.optBack = onBack
    this.optIndex = Math.min(index, options.length - 1)
    this.mode = 'menu'
    this.msgText.setWordWrapWidth(270)
    this.currentText = prompt
    this.renderOptions()
  }

  private renderOptions(): void {
    this.optLayer.removeAll(true)
    const sel = this.options[this.optIndex]
    this.msgText.setText(sel?.info ? `${this.currentText}\n\n${sel.info}` : this.currentText)

    this.options.forEach((o, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = 390 + col * 160
      const y = BOX_Y + 30 + row * 50
      const selected = i === this.optIndex
      const bg = this.add
        .rectangle(x, y, 150, 40, selected ? 0x3a7a58 : 0x1c3a2c)
        .setStrokeStyle(2, selected ? 0xffd77a : 0x4a7a60)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (this.mode !== 'menu') return
          this.optIndex = i
          this.chooseOption()
        })
      const t = this.add
        .text(x, y, o.label, { fontSize: '15px', color: o.disabled ? '#6a7f74' : '#e8f5ee' })
        .setOrigin(0.5)
      this.optLayer.add([bg, t])
    })

    if (this.optBack) {
      const back = this.add
        .text(26, this.scale.height - 22, '◀ 返回', { fontSize: '13px', color: '#7ec8a3' })
        .setOrigin(0, 1)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          Sfx.cancel()
          this.optBack?.()
        })
      this.optLayer.add(back)
    }
  }

  private handleMenuInput(input: ReturnType<InputKeys['poll']>): void {
    const n = this.options.length
    let next = this.optIndex
    if (input.left) next = this.optIndex - 1
    if (input.right) next = this.optIndex + 1
    if (input.up) next = this.optIndex - 2
    if (input.down) next = this.optIndex + 2
    if (next !== this.optIndex && next >= 0 && next < n) {
      this.optIndex = next
      Sfx.step()
      this.renderOptions()
      return
    }
    if (input.confirm) this.chooseOption()
    else if (input.cancel && this.optBack) {
      Sfx.cancel()
      this.optBack()
    }
  }

  private chooseOption(): void {
    const o = this.options[this.optIndex]
    if (!o) return
    if (o.disabled) {
      Sfx.cancel()
      return
    }
    Sfx.confirm()
    o.onSelect()
  }

  private showRoot(index = 0): void {
    if (this.battle.over) {
      this.finish()
      return
    }
    const p = activePlayer(this.battle)
    this.showOptions(
      `${displayName(p)} 要怎么做？`,
      [
        { label: '出招', onSelect: () => this.showFight() },
        { label: '道具', onSelect: () => this.showBag() },
        { label: '换人', onSelect: () => this.showSwitch() },
        {
          label: '逃跑',
          info: this.battle.kind === 'wild' ? undefined : '这场对战无法逃跑。',
          disabled: this.battle.kind !== 'wild',
          onSelect: () => this.act(() => playerRun(this.battle)),
        },
      ],
      undefined,
      index,
    )
  }

  private showFight(): void {
    const p = activePlayer(this.battle)
    const enemyType = SPECIES[activeEnemy(this.battle).speciesId].type
    const options: BattleOption[] = getMoves(p).map((m, i) => {
      const mult = typeMultiplier(m.type, enemyType)
      const eff = mult > 1 ? '  ▲效果拔群' : mult < 1 ? '  ▼效果一般' : ''
      return {
        label: m.name,
        info: `[${TYPE_LABEL[m.type]}] 威力 ${m.power}${eff}`,
        onSelect: () => this.act(() => playerFight(this.battle, i)),
      }
    })
    this.showOptions('选择招式：', options, () => this.showRoot(0))
  }

  private showSwitch(): void {
    const rows: ListRow[] = this.battle.playerParty.map((c, i) => ({
      label: `${i === this.battle.activeIndex ? '▷ ' : ''}${displayName(c)} Lv.${c.level}`,
      right: c.hp > 0 ? `HP ${c.hp}/${c.maxHp}` : '倒下',
      icon: `spr-${c.speciesId}`,
      disabled: c.hp <= 0 || i === this.battle.activeIndex,
      detail: `[${TYPE_LABEL[SPECIES[c.speciesId].type]}] ${getMoves(c).map((m) => m.name).join(' / ')}`,
      onSelect: () => {
        this.panel.close()
        this.act(() => playerSwitch(this.battle, i))
      },
    }))
    this.panel.open({
      title: '换上哪只伙伴？',
      rows,
      onCancel: () => {
        this.panel.close()
        this.showRoot(2)
      },
    })
  }

  /**
   * 背包：安抚果直接对敌方使用；回复/复活类再选目标
   * @author zjh
   * @date 2026-10-14
   */
  private showBag(): void {
    const ids = ITEM_ORDER.filter((id) => GameState.itemCount(id) > 0)
    const rows: ListRow[] = ids.map((id) => {
      const it = ITEMS[id]
      const check = it.kind === 'catch' ? checkItem(this.battle, id, 0) : { ok: true }
      return {
        label: it.name,
        right: `×${GameState.itemCount(id)}`,
        detail: check.ok ? it.desc : `${it.desc}\n（${check.reason}）`,
        disabled: !check.ok,
        onSelect: () => {
          if (it.kind === 'catch') this.useItem(id, 0)
          else this.showItemTarget(id)
        },
      }
    })
    if (!rows.length) rows.push({ label: '（背包是空的）', disabled: true })
    this.panel.open({
      title: '背包',
      footer: `焰币 ${GameState.coins}`,
      rows,
      onCancel: () => {
        this.panel.close()
        this.showRoot(1)
      },
    })
  }

  private showItemTarget(itemId: string): void {
    const it = ITEMS[itemId]
    const rows: ListRow[] = this.battle.playerParty.map((c, i) => {
      const check = checkItem(this.battle, itemId, i)
      return {
        label: `${displayName(c)} Lv.${c.level}`,
        right: c.hp > 0 ? `HP ${c.hp}/${c.maxHp}` : '倒下',
        icon: `spr-${c.speciesId}`,
        disabled: !check.ok,
        detail: check.ok ? `对 ${displayName(c)} 使用 ${it.name}` : check.reason,
        onSelect: () => this.useItem(itemId, i),
      }
    })
    this.panel.open({ title: `对谁使用 ${it.name}？`, rows, onCancel: () => this.showBag() })
  }

  private useItem(itemId: string, target: number): void {
    if (!checkItem(this.battle, itemId, target).ok || !GameState.consumeItem(itemId)) return
    this.panel.close()
    this.act(() => playerUseItem(this.battle, itemId, target))
  }

  /** 执行一次行动并播放结果 */
  private act(fn: () => void): void {
    this.clearOptions()
    fn()
    this.playFrames(() => this.showRoot())
  }

  // ───────────────────────── 结算 ─────────────────────────

  /**
   * 战斗结束：写回金币/旗标/图鉴，处理全灭与 BOSS 胜利
   * @author zjh
   * @date 2026-10-14
   */
  private finish(): void {
    const b = this.battle
    const pending = this.pending
    const notes: string[] = []

    for (const c of b.playerParty) GameState.markCaught(c.speciesId)
    if (b.caught) {
      GameState.markCaught(b.caught.speciesId)
      notes.push(`${displayName(b.caught)} 已登记到图鉴！`)
    }

    let next: () => void = () => fadeToScene(this, 'World')

    if (b.won) {
      GameState.coins += b.coinsEarned
      if (pending.flagOnWin) GameState.setFlag(pending.flagOnWin, true)
      GameState.mapId = pending.returnMapId
      GameState.playerX = pending.returnX
      GameState.playerY = pending.returnY
      if (pending.isBoss) {
        notes.push('熔鬃狮安静下来，山巅的火种重新亮起温暖的光……')
        next = () => fadeToScene(this, 'Ending', 900)
      }
    } else if (b.fled) {
      GameState.mapId = pending.returnMapId
      GameState.playerX = pending.returnX
      GameState.playerY = pending.returnY
    } else {
      const lost = Math.floor(GameState.coins / 2)
      GameState.coins -= lost
      GameState.healAll()
      GameState.mapId = RESPAWN.mapId
      GameState.playerX = RESPAWN.x
      GameState.playerY = RESPAWN.y
      notes.push(`你慌忙带着伙伴回到了旅人小屋……（遗失了 ${lost} 焰币）`)
    }

    GameState.pendingBattle = null
    GameState.facing = 'down'

    const last = this.lastFrame
    if (last) {
      this.queue.push(...notes.map((text) => ({ ...last, text, anim: 'none' as const })))
    }
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
