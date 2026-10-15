/**
 * 钓鱼控制：甩竿条件 → 浮漂小游戏（FishingOverlay）→ 上钩抽取、体长、钓鱼记录、大赛判定 → 野生战
 * @author zjh
 * @date 2026-10-15
 */

import { SPECIES } from '../../data/creatures'
import { GameState } from '../../state/GameState'
import { canFishAt, rodKindOf, type RodKind } from '../../systems/Fishing'
import { anglerRecord, judgeContest, recordCatch, recordFlag, rollFishSize } from '../../systems/FishLog'
import { weatherOf } from '../../systems/WorldClock'
import { hasFishing, rollFishing } from '../../systems/WorldTick'
import { FishingOverlay } from '../../ui/FishingOverlay'
import type { WorldHost } from './WorldHost'

export class FishingController {
  private readonly host: WorldHost
  readonly overlay: FishingOverlay

  constructor(host: WorldHost) {
    this.host = host
    this.overlay = new FishingOverlay(host.scene)
  }

  get active(): boolean {
    return this.overlay.active
  }

  /** 钓鱼进行中的每帧输入 */
  update(confirm: boolean): void {
    this.overlay.update()
    if (confirm) this.overlay.confirm()
  }

  /**
   * 面朝 (x, y) 按确认：是水面、有钓竿且本地图有钓鱼遭遇表时开始钓鱼
   * @author zjh
   * @date 2026-10-15
   */
  tryFish(x: number, y: number): void {
    const { host } = this
    const map = host.map
    if (!canFishAt(map, x, y, GameState.hasFlag)) return
    const rod = rodKindOf((id) => GameState.itemCount(id))
    if (!rod || !hasFishing(map.id, rod)) {
      if (hasFishing(map.id, 'rod')) host.toast('水里好像有伙伴在游……要是有钓竿就好了')
      return
    }
    if (!host.hasAbleCreature()) {
      host.toast('伙伴们都累坏了，先去休息吧')
      return
    }
    const ts = map.tileSize
    this.overlay.start(host.playerXY(), { x: x * ts + ts / 2, y: y * ts + ts / 2 }, {
      onEnd: (result) => {
        if (result === 'early') return host.toast('还没咬钩……')
        if (result === 'escaped') return host.toast('鱼溜走了……再试一次吧')
        this.onHooked(rod)
      },
    })
  }

  /**
   * 上钩：抽物种 → 随机体长 → 登记钓鱼记录 / 判定大赛 → 台词 → 野生战
   * @author zjh
   * @date 2026-10-15
   */
  private onHooked(rod: RodKind): void {
    const { host } = this
    const caught = rollFishing(host.map.id, rod)
    if (!caught) {
      host.toast('钓上来的小家伙看了你一眼，游走了（驱兽香生效中）')
      return
    }
    const { enemy, strong } = caught
    const w = GameState.world
    const size = rollFishSize(enemy.speciesId, strong)
    const rec = recordCatch(w, enemy.speciesId, size)
    const weather = weatherOf(w, host.map.id)
    const contest = judgeContest(w, GameState.day(), enemy.speciesId, size, weather)
    GameState.setFlag('lake_first_fish', true)

    const name = SPECIES[enemy.speciesId].name
    const lines = [`钓到了！是${name}！（体长 ${size} cm）`]
    if (rec.first) lines.push(`「${name}」登记进了钓鱼记录！`)
    else if (rec.newBest) lines.push(`刷新了${name}的最大体长记录！`)
    if (rec.newBest && size > anglerRecord(enemy.speciesId) && !GameState.hasFlag(recordFlag(enemy.speciesId))) {
      lines.push(`超过了澈的纪录（${anglerRecord(enemy.speciesId)} cm）！去给他看看吧。`)
    }
    if (contest) lines.push('达到了钓鱼大赛的目标！战斗结束后去告诉钓鱼少年澈吧。')
    host.dialogue.open(lines, () => host.startWildBattle(enemy))
  }
}
