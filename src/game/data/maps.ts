/**
 * 地图与碰撞格子数据（原创色块地图）
 * @author zjh
 * @date 2026-10-14
 */

import type { Facing } from '../state/GameState'
import { decorBlocks } from './decor'
import { buildCanyon, buildHammerTown, buildMine } from './canyonMap'
import { buildDunes, buildObservatory } from './dunesMap'
import { buildCloudBridge, buildCloudFeather, buildCloudMill, buildCloudShrine, buildCloudStart } from './cloudMap'
import { buildBellHall, buildFrostPeak, buildFrostVillage, buildIceLake } from './frostMap'
import { buildForest } from './forestMap'
import { buildLake } from './lakeMap'
import { TS, borderWalls, fill, parseAscii, setRect } from './mapKit'

/** ice 冰面（霜粒鹅遭遇格）· bridge 浮桥（开放前视为水面）· dock 码头木板 */
export type TileKind =
  | 'grass'
  | 'ice'
  | 'bridge'
  | 'dock'
  | 'path'
  | 'wall'
  | 'water'
  | 'floor'
  | 'tall'
  | 'door'
  | 'warp'
  | 'rock'
  | 'ash'

export interface WarpDef {
  x: number
  y: number
  targetMap: string
  targetX: number
  targetY: number
  label?: string
  /** 需要某旗标才能通行 */
  requireFlag?: string
  /** 未满足条件时的提示 */
  lockedLines?: string[]
}

/**
 * talk 对话 · healer 回血 · clinic 小屋综合服务（回血/鉴定/休息）· shop 商店 · trainer/boss 对战
 * board 旅人告示板 · granny 记忆婆婆（遗忘/回忆技能）· storage 伙伴寄存所
 * sign 路边木牌（显示 lines）· prop 可调查的场景物件（音石、藤蔓；外观由装饰物或 texture 决定）
 */
export type NpcRole = 'talk' | 'healer' | 'clinic' | 'shop' | 'trainer' | 'boss' | 'board' | 'granny' | 'storage' | 'sign' | 'prop'

export interface TeamMember {
  speciesId: string
  level: number
  /** 指定特性；不填则按物种随机 */
  abilityId?: string
}

export interface NpcDef {
  id: string
  name: string
  x: number
  y: number
  color: number
  role?: NpcRole
  /** 默认对话行 */
  lines: string[]
  /** 按剧情进度覆盖台词：从上到下取第一个已达成旗标 */
  progressLines?: { flag: string; lines: string[] }[]
  /** 训练家/BOSS 的队伍 */
  team?: TeamMember[]
  /** 击败后写入的旗标 */
  defeatedKey?: string
  /** 战前台词 */
  challengeLines?: string[]
  /** 被击败后的台词 */
  afterLines?: string[]
  /** 需要该旗标（数组时需全部满足）才出现；「@」开头的含义同 hideIf */
  showIf?: string | string[]
  /**
   * 有该旗标（任一）后消失。以「@」开头的是进图时的时间 / 天气：
   * @night 夜晚、@rain 当前地图下雨（如路人夜里回家、雨天收摊）
   */
  hideIf?: string | string[]
  /** 剧情对话脚本 id（见 scenes/world/StoryEvents） */
  story?: string
  /** 连战：赢下本场后立即挑战的 NPC id */
  chainNext?: string
  /** 连战：本场是第二战，需先赢下的 NPC id（否则从第一战开始） */
  chainFirst?: string
  /** 连战失败时额外清掉的旗标；不填则只清第一场 */
  chainReset?: string[]
  /** 临时组队：本场由这位同伴的队伍代替玩家出战（胜负都不影响玩家队伍） */
  ally?: { name: string; team: TeamMember[] }
  /** 挑战台词之后、开战之前的旁白（不加 NPC 名字前缀） */
  preBattleLines?: string[]
  /** 胜利后回到大地图时播放一次的台词 */
  winLines?: string[]
  /** 胜利后额外写入的旗标 */
  winFlags?: string[]
  /** 胜利后发放一次的道具 */
  winItems?: string[]
  /** 输了也算见过：留在原地，写入这些旗标 */
  stayOnLoss?: boolean
  lossFlags?: string[]
  lossLines?: string[]
  /** 双打：双方各有两只同时在场 */
  doubles?: boolean
  /** prop 的贴图（不填则不显示，由装饰物负责外观） */
  texture?: string
  /** 闲逛半径（格，曼哈顿距离）：在出生点附近随机走动；不填则原地站立 */
  wander?: number
  /** 初始朝向（有四方向行走图时生效，默认朝下） */
  facing?: Facing
  /** 巡逻路线：从出生点出发，依次直线走到各路点再原路折返（与 wander 二选一） */
  patrol?: { x: number; y: number }[]
  /** 巡逻到路点时停下张望的方向（默认朝下） */
  patrolLook?: Facing
  /** 训练家视线（格）：未被击败时，玩家走进正前方这么远就会被发现并开战 */
  sight?: number
  /** 玩家停在身边时冒出的表情（如「♪」）；不填则只转身 */
  emote?: string
  /** 路人闲聊：和附近的路人面对面时轮流冒出的短句（不填则只用 emote 互动） */
  chat?: string[]
  /** prop 贴图轻轻上下浮动（如采集点） */
  bob?: boolean
  /** 训练家再战：击败后隔这么多天可以再次挑战（等级随队伍成长） */
  rematchDays?: number
}

export interface MapDef {
  id: string
  name: string
  width: number
  height: number
  tileSize: number
  /** 行优先：每格 TileKind */
  tiles: TileKind[]
  warps: WarpDef[]
  npcs: NpcDef[]
  spawn: { x: number; y: number }
  /** 户外地图：有天气、计入异象判定步数（遭遇表见 encounters.ts） */
  outdoor: boolean
  /** 室内地图：不显示夜晚滤镜 */
  indoor?: boolean
  bgColor: number
  /** 覆盖默认 path 地砖贴图（如山路） */
  pathTexture?: string
  /** bridge 格在该旗标达成前视为水面 */
  bridgeFlag?: string
}

/**
 * 建造晨曦小镇
 * @author zjh
 * @date 2026-10-14
 */
function buildTown(): MapDef {
  const w = 16
  const h = 12
  const tiles = fill(w, h, 'path')
  borderWalls(tiles, w, h)
  setRect(tiles, w, 2, 2, 5, 4, 'grass')
  setRect(tiles, w, 10, 2, 13, 5, 'grass')
  setRect(tiles, w, 6, 7, 9, 9, 'grass')
  // 小屋入口
  tiles[3 * w + 3] = 'door'
  // 通往草地
  tiles[6 * w + 14] = 'warp'
  tiles[7 * w + 14] = 'warp'

  return {
    id: 'town',
    name: '晨曦小镇',
    width: w,
    height: h,
    tileSize: TS,
    tiles,
    bgColor: 0x8fd99a,
    spawn: { x: 8, y: 8 },
    outdoor: false,
    warps: [
      { x: 14, y: 6, targetMap: 'meadow', targetX: 2, targetY: 6, label: '青苔草地' },
      { x: 14, y: 7, targetMap: 'meadow', targetX: 2, targetY: 7, label: '青苔草地' },
      { x: 3, y: 3, targetMap: 'cabin', targetX: 4, targetY: 6, label: '旅人小屋' },
    ],
    npcs: [
      {
        id: 'elder',
        name: '旅长阿禾',
        x: 8,
        y: 4,
        color: 0xc49a6c,
        wander: 1,
        emote: '…',
        story: 'town_elder',
        chat: ['今天风真暖。', '嗯，嗯。', '年轻真好啊。'],
        lines: [
          '欢迎来到晨曦小镇，焰迹旅人。',
          '余烬山巅的火种最近忽明忽暗，守护它的熔鬃狮变得焦躁不安。',
          '先去东边的青苔草地，赢过巡护员苔，他会放你进山道。',
          '高草里的野生伙伴可以用「安抚信标」带回队伍，对方体力越低越容易成功。',
        ],
        progressLines: [
          {
            flag: 'chapter8_done',
            lines: ['初灯是小路点亮的。比我做的第一盏灯亮多了。', '灰烬之塔在余烬山再往上的地方。等你准备好了，我们就去。'],
          },
          {
            flag: 'chapter7_done',
            lines: ['两半照片我收好了。你若去钟楼，我会跟着。'],
          },
          {
            flag: 'chapter6_done',
            lines: ['昨晚的光……我在窗边站了很久。', '那孩子，每年冬天都去霜铃峰放灯吗。'],
          },
          {
            flag: 'chapter5_done',
            lines: ['星砂荒原的雷停了？穗来信说，第五颗星亮了。', '霜铃峰很冷，上路前让岚帮你们看看伤。'],
          },
          {
            flag: 'whale_beaten',
            lines: [
              '山巅的火种、湖心的灯台都亮起来了。你和伙伴们真了不起！',
              '可那些黑色灯罩……「熄灯会」到底想做什么呢？',
              '各地的异象还在出现，有空就去旅人告示板看看吧。',
            ],
          },
          {
            flag: 'boss_beaten',
            lines: [
              '火种又恢复了温暖的光，谢谢你，焰迹旅人！',
              '泉守汐托人捎信来，说南边的雾泉湖畔结了怪冰——从青苔草地南口就能过去。',
              '不过……最近各地的心火波动得厉害，总有人说看见了奇怪的「异象」。',
              '流星、花海、地火……据说每种异象都会唤来一只独一无二的伙伴。',
              '去东边的旅人告示板看看传闻吧。',
            ],
          },
          {
            flag: 'ranger_beaten',
            lines: [
              '你赢过苔了？了不起！',
              '余烬山道就在草地东边。熔鬃狮是焰属性，潮属性的伙伴会是好帮手。',
              '山道半途有温泉守望者，可以在那里歇脚。',
            ],
          },
        ],
      },
      {
        id: 'town_photo',
        name: '相框',
        role: 'prop',
        story: 'town_photo',
        x: 10,
        y: 4,
        color: 0xf0e6c8,
        lines: ['缺了一角的合照。'],
      },
      {
        id: 'night_clinic',
        name: '疗愈师岚',
        role: 'healer',
        showIf: 'night_started',
        hideIf: 'chapter8_done',
        x: 6,
        y: 9,
        color: 0x9b7ed9,
        lines: ['广场的救护站点着。今晚随便来，灯不会灭。'],
      },
      {
        id: 'night_lamp_square',
        name: '熄灯精英',
        role: 'trainer',
        showIf: 'night_started',
        hideIf: ['night_lamp_square', 'chapter8_done'],
        x: 8,
        y: 7,
        color: 0x3a3a48,
        defeatedKey: 'night_lamp_square',
        team: [
          { speciesId: 'inkcrow', level: 40 },
          { speciesId: 'nightcrow', level: 41 },
        ],
        lines: ['这盏灯，罩上就好。'],
        challengeLines: ['广场的灯归我们了。', '别过来。'],
        winLines: ['广场的灯重新亮了。'],
        winFlags: ['night_lamp_square'],
      },
      {
        id: 'night_lamp_inn',
        name: '熄灯精英',
        role: 'trainer',
        showIf: 'night_started',
        hideIf: ['night_lamp_inn', 'chapter8_done'],
        x: 4,
        y: 5,
        color: 0x3a3a48,
        defeatedKey: 'night_lamp_inn',
        team: [
          { speciesId: 'voltbadger', level: 41 },
          { speciesId: 'dunefin', level: 42 },
        ],
        lines: ['旅店门口的灯，也该歇了。'],
        challengeLines: ['这里没有留给你们的光。'],
        winLines: ['旅店的灯重新亮了。'],
        winFlags: ['night_lamp_inn'],
      },
      {
        id: 'night_lamp_shop',
        name: '熄灯精英',
        role: 'trainer',
        showIf: 'night_started',
        hideIf: ['night_lamp_shop', 'chapter8_done'],
        x: 5,
        y: 8,
        color: 0x3a3a48,
        defeatedKey: 'night_lamp_shop',
        team: [
          { speciesId: 'lanternlizard', level: 40 },
          { speciesId: 'whirlbat', level: 41 },
        ],
        lines: ['商店的灯太亮了。'],
        challengeLines: ['把这盏也罩上。'],
        winLines: ['商店的灯重新亮了。'],
        winFlags: ['night_lamp_shop'],
      },
      {
        id: 'night_lamp_home',
        name: '熄灯精英',
        role: 'trainer',
        showIf: 'night_started',
        hideIf: ['night_lamp_home', 'chapter8_done'],
        x: 10,
        y: 6,
        color: 0x3a3a48,
        defeatedKey: 'night_lamp_home',
        team: [
          { speciesId: 'skyfinch', level: 40 },
          { speciesId: 'chimekite', level: 42 },
        ],
        lines: ['旅长家的灯，尤其不能留。'],
        challengeLines: ['阿禾家，从这里开始暗。'],
        winLines: ['阿禾家门前的灯重新亮了。'],
        winFlags: ['night_lamp_home'],
      },
      {
        id: 'night_lamp_clock',
        name: '熄灯精英',
        role: 'trainer',
        showIf: 'night_started',
        hideIf: ['night_lamp_clock', 'chapter8_done'],
        x: 9,
        y: 3,
        color: 0x3a3a48,
        defeatedKey: 'night_lamp_clock',
        team: [
          { speciesId: 'frostfox', level: 42 },
          { speciesId: 'icecrown', level: 43 },
        ],
        lines: ['钟楼下的灯，是最后一盏。'],
        challengeLines: ['罩住它，全镇都会安静。'],
        winLines: ['钟楼的灯重新亮了。'],
        winFlags: ['night_lamp_clock'],
      },
      {
        id: 'mochen',
        name: '墨尘',
        role: 'trainer',
        showIf: 'night_relay_done',
        hideIf: 'mochen_met',
        x: 9,
        y: 2,
        color: 0x2a2838,
        defeatedKey: 'mochen_met',
        stayOnLoss: true,
        lossFlags: ['mochen_met'],
        team: [
          { speciesId: 'inkcrow', level: 44 },
          { speciesId: 'lanternlizard', level: 44 },
          { speciesId: 'icecrown', level: 44 },
          { speciesId: 'nightcrow', level: 45, abilityId: 'last_light' },
        ],
        lines: ['你就是师父的新徒弟。'],
        challengeLines: [
          '我在这个镇子长大。这些灯，有一半是我小时候帮着修的。',
          '所以我知道，只要熄掉钟楼的初灯，全镇的灯都会熄。',
          '别误会。我不想伤害任何人。',
          '让你的伙伴来回答吧。',
        ],
        winLines: ['墨尘看着夜幕鸦身上的光，什么都没说，消失在夜里。', '墨尘：灰烬之塔。最后一盏灯在那里。……来吧。'],
        lossLines: ['墨尘没有熄灯。他盯着自己的夜幕鸦，转身离开了。', '墨尘：灰烬之塔。最后一盏灯在那里。……来吧。'],
      },
      {
        id: 'hearthbear',
        name: '暖灯熊',
        role: 'boss',
        showIf: 'mochen_met',
        hideIf: 'bear_beaten',
        x: 9,
        y: 2,
        color: 0xffc878,
        defeatedKey: 'bear_beaten',
        team: [{ speciesId: 'hearthbear', level: 46 }],
        lines: ['钟楼里传来低沉的哼声。'],
        challengeLines: ['一只抱着大灯笼的熊走出来。它眯着眼，分不清你是谁。'],
        winLines: ['暖灯熊揉了揉眼睛，把灯笼抱紧了。它认出了你的伙伴。'],
      },
      {
        id: 'kid',
        name: '小路',
        x: 11,
        y: 8,
        color: 0xf0a0c0,
        wander: 3,
        emote: '♪',
        chat: ['一起玩吧！', '翠叶狐！', '嘿嘿～'],
        hideIf: '@night',
        lines: [
          '我在草丛里看见一只翠叶狐！',
          '听说伙伴到 9 级左右会进化，样子会变得超帅！',
        ],
        progressLines: [
          { flag: 'chapter8_done', lines: ['我的灯……亮了！', '暖灯熊把我的灯放进钟楼里了。全镇都亮了！'] },
          { flag: 'chapter7_done', lines: ['天上那只大鸟好大！', '它飞走的时候，我的小灯跟着亮了一下。'] },
          { flag: 'chapter6_done', lines: ['昨天晚上天上有彩色的光！', '妈妈说那是心火极光，一辈子都难得看到一次！'] },
          { flag: 'chapter5_done', lines: ['荒原上的星星好亮！', '我的小灯还没做好……等霜铃峰的雪化了，我再点给你看。'] },
          { flag: 'chapter4_done', lines: ['锤音镇的人送了我一把小锤子！', '我要用它做一盏灯——等我做好了给你看！'] },
        ],
      },
      {
        id: 'town_farmer',
        name: '农夫阿田',
        x: 11,
        y: 2,
        color: 0x5a7ec8,
        wander: 2,
        emote: '♪',
        chat: ['番茄红啦！', '吃饭了没？', '哈哈哈！'],
        hideIf: '@night',
        lines: ['今年的番茄长得特别好！都是托了火种的福。', '草地上的岩甲虫老爱啃我的篱笆……不过它们挺可爱的。'],
        progressLines: [
          { flag: 'whale_beaten', lines: ['湖边的冰化了，浇地的水也甜了！', '等收成了，送你一筐番茄尝尝。'] },
          { flag: 'boss_beaten', lines: ['山上的火种稳下来，地里也暖和了。', '你就是那位焰迹旅人吧？谢谢你啊！'] },
        ],
      },
      {
        id: 'town_florist',
        name: '卖花姑娘铃',
        x: 7,
        y: 10,
        color: 0xf0a040,
        wander: 2,
        emote: '♥',
        chat: ['要花吗？', '好香呀～', '送你一朵！'],
        hideIf: ['@night', '@rain'],
        lines: ['要来一朵晨曦花吗？据说能让伙伴心情变好哦。', '傍晚的时候，花香会飘满整条街～'],
        progressLines: [
          { flag: 'deer_beaten', lines: ['回音林的叶子会唱歌？好想去听一听！', '要是能采到那里的花就好了……'] },
          { flag: 'whale_beaten', lines: ['湖畔开了好多雾铃花，我每天都去采！', '你的伙伴看起来和你越来越亲了呢。'] },
        ],
      },
      {
        id: 'shop',
        name: '杂货商麦',
        role: 'shop',
        x: 5,
        y: 7,
        color: 0xe8c060,
        lines: ['欢迎光临！急救喷雾、清创贴、能量棒、安抚信标，还有折叠滑板～'],
        progressLines: [
          { flag: 'chapter8_done', lines: ['灯都亮回来了。欢迎光临，价格恢复平常。'] },
          { flag: 'night_started', lines: ['今晚的灯都灭了，存货我全摆出来了。半价，别客气。'] },
        ],
      },
      {
        id: 'board',
        name: '旅人告示板',
        role: 'board',
        x: 12,
        y: 5,
        color: 0xb08050,
        lines: ['告示板上贴满了天气预报和各地的传闻。'],
      },
      {
        id: 'granny',
        name: '记忆婆婆',
        role: 'granny',
        x: 3,
        y: 7,
        color: 0xb8a0d8,
        lines: ['孩子，伙伴们记性好着呢，忘掉的招式也能想起来。', '要我帮忙吗？'],
      },
      {
        id: 'storage',
        name: '寄存员纳',
        role: 'storage',
        x: 10,
        y: 9,
        color: 0x80c0a0,
        lines: ['这里是伙伴寄存所！队伍放不下的伙伴，我来好好照顾。'],
      },
    ],
  }
}

/**
 * 建造青苔草地
 * @author zjh
 * @date 2026-10-14
 */
function buildMeadow(): MapDef {
  const w = 18
  const h = 12
  const tiles = fill(w, h, 'grass')
  borderWalls(tiles, w, h)
  setRect(tiles, w, 1, 5, 3, 8, 'path')
  setRect(tiles, w, 4, 2, 14, 9, 'tall')
  setRect(tiles, w, 12, 1, 16, 3, 'water')
  tiles[6 * w + 1] = 'warp'
  tiles[7 * w + 1] = 'warp'
  // 横穿草地的安全步道，尽头通往余烬山道
  for (let x = 4; x <= 15; x++) {
    tiles[6 * w + x] = 'path'
    tiles[7 * w + x] = 'path'
  }
  tiles[6 * w + 16] = 'warp'
  tiles[7 * w + 16] = 'warp'
  // 南口：通往雾泉湖畔（第二章）
  for (let x = 8; x <= 9; x++) {
    tiles[10 * w + x] = 'path'
    tiles[11 * w + x] = 'warp'
  }

  const passLock = {
    requireFlag: 'ranger_beaten',
    lockedLines: ['前方是余烬山道，山路险峻。', '（巡护员苔守在这一带——先向他证明你的实力吧。）'],
  }
  const lakeLock = {
    requireFlag: 'lake_unlocked',
    lockedLines: ['南边的小路被浓雾挡住了，什么也看不清。', '（等余烬山巅的火种安定下来，再来看看吧。）'],
  }

  return {
    id: 'meadow',
    name: '青苔草地',
    width: w,
    height: h,
    tileSize: TS,
    tiles,
    bgColor: 0x6ecf7e,
    spawn: { x: 2, y: 6 },
    outdoor: true,
    warps: [
      { x: 1, y: 6, targetMap: 'town', targetX: 13, targetY: 6, label: '晨曦小镇' },
      { x: 1, y: 7, targetMap: 'town', targetX: 13, targetY: 7, label: '晨曦小镇' },
      { x: 16, y: 6, targetMap: 'pass', targetX: 2, targetY: 18, label: '余烬山道', ...passLock },
      { x: 16, y: 7, targetMap: 'pass', targetX: 2, targetY: 18, label: '余烬山道', ...passLock },
      { x: 8, y: 11, targetMap: 'lake', targetX: 9, targetY: 13, label: '雾泉湖畔', ...lakeLock },
      { x: 9, y: 11, targetMap: 'lake', targetX: 10, targetY: 13, label: '雾泉湖畔', ...lakeLock },
    ],
    npcs: [
      {
        id: 'ranger',
        name: '巡护员苔',
        role: 'trainer',
        x: 12,
        y: 5,
        color: 0x5b8c5a,
        facing: 'down',
        patrol: [{ x: 6, y: 5 }],
        patrolLook: 'down',
        sight: 3,
        rematchDays: 2,
        lines: [],
        team: [
          { speciesId: 'leafkit', level: 5 },
          { speciesId: 'rockmite', level: 5 },
        ],
        defeatedKey: 'ranger_beaten',
        challengeLines: [
          '想进余烬山道？先过我这一关！',
          '提醒你一句：我的岩甲虫可不怕火，潮属性和叶属性的招式才是它的克星。',
          '……战斗开始！',
        ],
        afterLines: ['你和伙伴配合得真好。', '山道入口就在草地东边，路上小心。'],
      },
    ],
  }
}

/**
 * 建造余烬山道（第三区域，终点为 BOSS）
 * @author zjh
 * @date 2026-10-14
 */
function buildPass(): MapDef {
  const { width, height, tiles } = parseAscii([
    '##############',
    '#RRR......RRR#',
    '#RR........RR#',
    '#R..^^..^^..R#',
    '#R.^^^..^^^.R#',
    '#RR..R..R..RR#',
    '#....^^^^..RR#',
    '#....^^^^...R#',
    '#RR........RR#',
    '#R^^^RR..^^^R#',
    '#R^^^RR..^^^R#',
    '#R.......R..R#',
    '#RR..^^^^...R#',
    '#~~..^^^^..RR#',
    '#~~.......^^R#',
    '#R..RR....^^R#',
    '#R^^RR..R...R#',
    '#R^^....RR..R#',
    '#W.........RR#',
    '##############',
  ])

  return {
    id: 'pass',
    name: '余烬山道',
    width,
    height,
    tileSize: TS,
    tiles,
    bgColor: 0x6b4a3a,
    pathTexture: 'tile-mountain-path',
    spawn: { x: 2, y: 18 },
    outdoor: true,
    warps: [{ x: 1, y: 18, targetMap: 'meadow', targetX: 15, targetY: 6, label: '青苔草地' }],
    npcs: [
      {
        id: 'hiker',
        name: '登山客峰',
        role: 'trainer',
        x: 8,
        y: 11,
        color: 0x8a6a4a,
        facing: 'down',
        patrol: [{ x: 3, y: 11 }],
        patrolLook: 'down',
        sight: 3,
        rematchDays: 2,
        lines: [],
        team: [
          { speciesId: 'mistnewt', level: 9 },
          { speciesId: 'rockmite', level: 9 },
        ],
        defeatedKey: 'hiker_beaten',
        challengeLines: ['山道上的风可不温柔！让我看看你的本事！', '……战斗开始！'],
        afterLines: [
          '山顶的熔鬃狮很强，先去温泉那里休整一下吧。',
          '对了，它浑身是火——潮系和岩系的伙伴能克制它，叶系和焰系就别硬碰了。',
          '这条山道的雾泉螈、草地上的岩甲虫和碧波龟都很适合带上去。',
        ],
      },
      {
        id: 'spring',
        name: '泉守汐',
        role: 'healer',
        x: 3,
        y: 8,
        color: 0x7ec8c0,
        lines: [
          '温泉的热气能让伙伴们恢复元气。',
          '（队伍已全部恢复！）',
          '山顶就在北边。守护兽的火焰很烈，带上潮系或岩系的伙伴会安心很多。祝你好运。',
        ],
      },
      {
        id: 'boss',
        name: '焰心守护·烬',
        role: 'boss',
        x: 7,
        y: 1,
        color: 0xff7050,
        lines: [],
        team: [
          { speciesId: 'cindermoth', level: 11 },
          { speciesId: 'magmane', level: 13 },
        ],
        defeatedKey: 'boss_beaten',
        challengeLines: [
          '……旅人，你也是来夺走火种的吗？',
          '熔鬃狮在咆哮，火种的光芒已经乱了。',
          '若你真心守护它——就用你与伙伴的羁绊证明吧！',
          '……战斗开始！',
        ],
        afterLines: ['火种重新安静下来了。', '谢谢你，焰迹旅人。这条山道永远欢迎你。'],
      },
    ],
  }
}

/**
 * 建造旅人小屋（室内）
 * @author zjh
 * @date 2026-10-14
 */
function buildCabin(): MapDef {
  const w = 10
  const h = 8
  const tiles = fill(w, h, 'floor')
  borderWalls(tiles, w, h)
  tiles[7 * w + 4] = 'warp'
  tiles[7 * w + 5] = 'warp'

  return {
    id: 'cabin',
    name: '旅人小屋',
    width: w,
    height: h,
    tileSize: TS,
    tiles,
    bgColor: 0xd4a86a,
    spawn: { x: 4, y: 5 },
    outdoor: false,
    indoor: true,
    warps: [
      { x: 4, y: 7, targetMap: 'town', targetX: 3, targetY: 4, label: '晨曦小镇' },
      { x: 5, y: 7, targetMap: 'town', targetX: 3, targetY: 4, label: '晨曦小镇' },
    ],
    npcs: [
      {
        id: 'healer',
        name: '疗愈师岚',
        role: 'clinic',
        x: 5,
        y: 3,
        color: 0x9b7ed9,
        lines: ['欢迎回来，旅人。要做点什么？'],
        progressLines: [
          { flag: 'chapter8_done', lines: ['钟楼上的灯是小路点的。你也坐下，我看看有没有擦伤。'] },
          { flag: 'chapter7_done', lines: ['从云上下来的人，耳朵里都有风声。坐下，我看看。'] },
          { flag: 'chapter6_done', lines: ['从霜铃峰下来的人，身上都还留着一点冷。来，坐一会儿。', '极光的晚上，连伤药都觉得没那么苦了。'] },
          { flag: 'chapter5_done', lines: ['荒原的沙暴伤人。来，我先看看你们。', '下一程是霜铃峰，记得带足伤药。'] },
        ],
      },
    ],
  }
}

export const MAPS: Record<string, MapDef> = {
  town: buildTown(),
  meadow: buildMeadow(),
  pass: buildPass(),
  cabin: buildCabin(),
  lake: buildLake(),
  forest: buildForest(),
  hammer: buildHammerTown(),
  canyon: buildCanyon(),
  mine: buildMine(),
  dunes: buildDunes(),
  observatory: buildObservatory(),
  frostvillage: buildFrostVillage(),
  frostpeak: buildFrostPeak(),
  icelake: buildIceLake(),
  bellhall: buildBellHall(),
  cloudstart: buildCloudStart(),
  cloudfeather: buildCloudFeather(),
  cloudmill: buildCloudMill(),
  cloudbridge: buildCloudBridge(),
  cloudshrine: buildCloudShrine(),
}

/**
 * 地图上可放置事件物件的空地：可通行、非传送/门、无 NPC
 * @author zjh
 * @date 2026-10-14
 */
export function openTiles(map: MapDef): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const k = map.tiles[y * map.width + x]
      if (isSolid(k) || k === 'warp' || k === 'door' || k === 'bridge' || decorBlocks(map.id, x, y)) continue
      if (map.npcs.some((n) => n.x === x && n.y === y)) continue
      if (map.warps.some((w) => w.x === x && w.y === y)) continue
      out.push({ x, y })
    }
  }
  return out
}

/** bridge 只在 resolveTile 之后出现，此时已确定可走 */
export function isSolid(kind: TileKind): boolean {
  return kind === 'wall' || kind === 'water' || kind === 'rock'
}

/** 是否为遇敌草丛（草地高草 / 山道灰烬草） */
export function isTallGrass(kind: TileKind): boolean {
  return kind === 'tall' || kind === 'ash'
}

/** 原始格子（不考虑剧情旗标） */
export function tileAt(map: MapDef, x: number, y: number): TileKind | null {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return null
  return map.tiles[y * map.width + x]
}

/** 剧情旗标判定 */
export type HasFlag = (k: string) => boolean

/**
 * 按剧情状态解析后的格子：浮桥未开放时为水面。碰撞、渲染、钓鱼判定都应使用它
 * @author zjh
 * @date 2026-10-15
 */
export function resolveTile(map: MapDef, x: number, y: number, hasFlag: HasFlag): TileKind | null {
  const k = tileAt(map, x, y)
  if (k === 'bridge' && map.bridgeFlag && !hasFlag(map.bridgeFlag)) return 'water'
  return k
}

/**
 * 当前剧情状态下可见的 NPC
 * @author zjh
 * @date 2026-10-15
 */
export function visibleNpcs(map: MapDef, hasFlag: HasFlag): NpcDef[] {
  const hidden = (h: NpcDef['hideIf']) => (Array.isArray(h) ? h.some(hasFlag) : !!h && hasFlag(h))
  const shown = (s: NpcDef['showIf']) => (Array.isArray(s) ? s.every(hasFlag) : !s || hasFlag(s))
  return map.npcs.filter((n) => shown(n.showIf) && !hidden(n.hideIf))
}

/**
 * 根据剧情旗标选出 NPC 当前台词
 * @author zjh
 * @date 2026-10-14
 */
export function npcLines(npc: NpcDef, hasFlag: (k: string) => boolean): string[] {
  const hit = npc.progressLines?.find((p) => hasFlag(p.flag))
  return hit ? hit.lines : npc.lines
}
