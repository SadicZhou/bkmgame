/**
 * 回合制战斗场景：出招 / 换人 / 逃跑
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import {
  SPECIES,
  TYPE_LABEL,
  displayName,
} from '../data/creatures'
import { GameState } from '../state/GameState'
import {
  playerFight,
  playerRun,
  playerSwitch,
  startBattle,
  type BattleState,
} from '../systems/BattleLogic'
import { Sfx } from '../systems/AudioBeeps'
import { createCreature } from '../data/creatures'

export class BattleScene extends Phaser.Scene {
  private battle!: BattleState
  private logText!: Phaser.GameObjects.Text
  private playerHud!: Phaser.GameObjects.Text
  private enemyHud!: Phaser.GameObjects.Text
  private playerSpr!: Phaser.GameObjects.Image
  private enemySpr!: Phaser.GameObjects.Image
  private buttons: Phaser.GameObjects.Container[] = []
  private btnLayer!: Phaser.GameObjects.Container

  constructor() {
    super('Battle')
  }

  create(): void {
    const pending = GameState.pendingBattle
    if (!pending) {
      this.scene.start('World')
      return
    }

    // 若队伍全灭则给一只临时回血的焰角兔，避免卡死（新局不应发生）
    if (!GameState.party.some((c) => c.hp > 0)) {
      GameState.party = [createCreature('flarehorn', 5)]
    }

    this.battle = startBattle(
      GameState.party,
      pending.enemy,
      pending.kind,
      pending.trainerName,
    )

    const { width, height } = this.scale
    this.add.rectangle(0, 0, width, height, 0x1b2830).setOrigin(0)
    this.add.rectangle(0, height * 0.55, width, height * 0.45, 0x0f1a14).setOrigin(0)

    // 场地装饰
    this.add.ellipse(width * 0.72, height * 0.38, 160, 40, 0x2a4a3a, 0.5)
    this.add.ellipse(width * 0.28, height * 0.52, 160, 40, 0x2a4a3a, 0.5)

    const enemy = this.battle.enemy
    this.enemySpr = this.add
      .image(width * 0.72, height * 0.28, `spr-${enemy.speciesId}`)
      .setScale(2.2)
    this.enemyHud = this.add.text(width * 0.52, 24, '', {
      fontSize: '14px',
      color: '#f0e6c8',
      backgroundColor: '#00000066',
      padding: { x: 8, y: 6 },
    })

    const active = this.battle.playerParty[this.battle.activeIndex]
    this.playerSpr = this.add
      .image(width * 0.28, height * 0.48, `spr-${active.speciesId}`)
      .setScale(2.2)
    this.playerHud = this.add.text(24, height * 0.42, '', {
      fontSize: '14px',
      color: '#e8f5ee',
      backgroundColor: '#00000066',
      padding: { x: 8, y: 6 },
    })

    this.logText = this.add.text(20, height * 0.58, '', {
      fontSize: '14px',
      color: '#d5ebe0',
      wordWrap: { width: width - 40 },
      lineSpacing: 4,
    })

    this.btnLayer = this.add.container(0, 0)
    this.refreshAll()
    this.showRootMenu()
  }

  private refreshAll(): void {
    const p = this.battle.playerParty[this.battle.activeIndex]
    const e = this.battle.enemy
    const psp = SPECIES[p.speciesId]
    const esp = SPECIES[e.speciesId]

    this.playerHud.setText(
      `${displayName(p)}  Lv.${p.level}  [${TYPE_LABEL[psp.type]}]\nHP ${p.hp}/${p.maxHp}`,
    )
    this.enemyHud.setText(
      `${displayName(e)}  Lv.${e.level}  [${TYPE_LABEL[esp.type]}]\nHP ${e.hp}/${e.maxHp}`,
    )
    this.playerSpr.setTexture(`spr-${p.speciesId}`)
    this.enemySpr.setTexture(`spr-${e.speciesId}`)
    this.enemySpr.setAlpha(e.hp > 0 ? 1 : 0.35)

    const tail = this.battle.log.slice(-5).join('\n')
    this.logText.setText(tail)
  }

  private clearButtons(): void {
    for (const b of this.buttons) b.destroy(true)
    this.buttons = []
    this.btnLayer.removeAll(true)
  }

  private addBtn(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    w = 140,
  ): void {
    const bg = this.add
      .rectangle(0, 0, w, 36, 0x2a5a42)
      .setStrokeStyle(1, 0xa8e6c0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => bg.setFillStyle(0x3a7a58))
      .on('pointerout', () => bg.setFillStyle(0x2a5a42))
      .on('pointerdown', () => {
        Sfx.confirm()
        onClick()
      })
    const text = this.add.text(0, 0, label, { fontSize: '14px', color: '#e8f5ee' }).setOrigin(0.5)
    const c = this.add.container(x, y, [bg, text])
    this.btnLayer.add(c)
    this.buttons.push(c)
  }

  private showRootMenu(): void {
    this.clearButtons()
    if (this.battle.over) {
      this.showEndActions()
      return
    }
    const y = this.scale.height - 48
    const cx = this.scale.width / 2
    this.addBtn(cx - 170, y, '出招', () => this.showFightMenu())
    this.addBtn(cx - 10, y, '换人', () => this.showSwitchMenu())
    this.addBtn(cx + 150, y, '逃跑', () => this.doRun())
  }

  private showFightMenu(): void {
    this.clearButtons()
    const p = this.battle.playerParty[this.battle.activeIndex]
    const moves = SPECIES[p.speciesId].moves
    const baseY = this.scale.height - 100
    moves.forEach((m, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      this.addBtn(
        100 + col * 180,
        baseY + row * 44,
        `${m.name} (${m.power})`,
        () => this.doFight(i),
        160,
      )
    })
    this.addBtn(this.scale.width - 80, this.scale.height - 40, '返回', () => this.showRootMenu(), 100)
  }

  private showSwitchMenu(): void {
    this.clearButtons()
    const baseY = this.scale.height - 120
    this.battle.playerParty.forEach((c, i) => {
      const sp = SPECIES[c.speciesId]
      const label = `${sp.name} Lv.${c.level} ${c.hp}/${c.maxHp}`
      this.addBtn(
        this.scale.width / 2,
        baseY + i * 40,
        label,
        () => this.doSwitch(i),
        260,
      )
    })
    this.addBtn(this.scale.width - 80, this.scale.height - 36, '返回', () => this.showRootMenu(), 100)
  }

  private doFight(moveIndex: number): void {
    this.clearButtons()
    playerFight(this.battle, moveIndex)
    Sfx.hit()
    this.refreshAll()
    this.afterAction()
  }

  private doSwitch(index: number): void {
    this.clearButtons()
    playerSwitch(this.battle, index)
    this.refreshAll()
    this.afterAction()
  }

  private doRun(): void {
    this.clearButtons()
    playerRun(this.battle)
    this.refreshAll()
    this.afterAction()
  }

  private afterAction(): void {
    if (this.battle.over) {
      if (this.battle.won) Sfx.win()
      else Sfx.cancel()
      // 同步队伍回 GameState
      GameState.party = this.battle.playerParty.map((c) => ({ ...c }))
      const pending = GameState.pendingBattle
      if (this.battle.won && pending?.flagOnWin) {
        GameState.setFlag(pending.flagOnWin, true)
      }
      // 全灭：送回小镇并回血
      if (!this.battle.won && !this.battle.fled) {
        GameState.healAll()
        GameState.mapId = 'town'
        GameState.playerX = 8
        GameState.playerY = 8
      }
      this.showEndActions()
      return
    }
    this.showRootMenu()
  }

  private showEndActions(): void {
    this.clearButtons()
    const msg = this.battle.fled
      ? '已逃离战斗'
      : this.battle.won
        ? '胜利！'
        : '战败……已送回晨曦小镇'
    this.add
      .text(this.scale.width / 2, this.scale.height - 90, msg, {
        fontSize: '18px',
        color: '#f0e6c8',
      })
      .setOrigin(0.5)

    this.addBtn(this.scale.width / 2, this.scale.height - 44, '返回地图', () => {
      const pending = GameState.pendingBattle
      if (pending && (this.battle.won || this.battle.fled)) {
        GameState.mapId = pending.returnMapId
        GameState.playerX = pending.returnX
        GameState.playerY = pending.returnY
      }
      GameState.pendingBattle = null
      this.scene.start('World')
    }, 180)
  }
}
