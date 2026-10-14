# 焰迹旅人 · Embertrail

网页类宝可梦风格的**短篇可玩体验**（原创设定，非任天堂/宝可梦 IP）。

**运行方式：** 仅本机 `F:\work\game`（不再依赖云端开发服）  
**远端仓库（稍后同步）：** https://github.com/SadicZhou/bkmgame  
**作者：** 周建豪  
**进度：** v2 已完成（主线通关 / 道具与收服 / 成长进化 / 图鉴 / 战斗与画面打磨），详见 `docs/v2-design.md`  
**技术栈：** Vite + TypeScript + Phaser 3

## 如何运行（Windows 本地 · 唯一推荐）

```bat
cd /d F:\work\game
npm install
npm run dev
```

或双击 `scripts\run-dev.bat`。浏览器打开 `http://127.0.0.1:45321`。

```bat
npm run build
npm run preview
```

### 首次把代码放到 F:\work\game

若目录还是空的，任选其一：

1. 解压 `embertrail-local.zip` 到 `F:\work\game`  
2. GitHub 就绪后：`git clone https://github.com/SadicZhou/bkmgame.git F:\work\game`

## 怎么玩

- **移动：** 方向键 / WASD，或左下角虚拟摇杆  
- **对话 / 确认：** 空格 / 回车 / Z，或右下「对话」  
- **菜单 / 返回：** Esc / X，或右下「菜单」（队伍、背包、图鉴、存档、回标题）  
- **主线：** 晨曦小镇 → 青苔草地（击败巡护员苔解锁山道）→ 余烬山道 → 山顶 BOSS「焰心守护·烬」→ 通关结局  
- **地点：** 旅人小屋 / 山道温泉可回血；镇上杂货商麦可用焰币买道具  
- **战斗：** 出招 / 道具 / 换人 / 逃跑；属性克制、本系加成、会心一击；训练家与 BOSS 有多只伙伴  
- **收服：** 野生战中使用「安抚果 / 蜜安抚果」，对手 HP 越低越容易成功（队伍上限 6 只）  
- **成长：** 升级学新招（最多 4 招），9 级进化；其余存活伙伴分享 30% 经验  
- **全灭：** 回到旅人小屋，遗失一半焰币  
- **伙伴（11 种）：** 焰角兔→炽角兔、碧波龟→涌潮龟、翠叶狐→森冠狐、岩甲虫→磐甲虫、烬尘蛾、雾泉螈、熔鬃狮（BOSS，不可收服）

## 美术风格

**可爱像素（cute pixel）**：软圆轮廓、大头大眼、粉彩/暖亮色，约 16×16～32×32 可读块面。  
当前全部为**可替换占位**；玩法优先，不要求玩家提供素材。

## 素材来源

v1 **不依赖外部美术包**，保证克隆即可绿构建：

| 资源 | 来源 | 说明 |
|------|------|------|
| 地砖 / 玩家 / NPC / 4 只伙伴 | **仓库内运行时生成**（`src/game/graphics/PixelFactory.ts`） | 原创可爱像素占位，无 IP 风险 |
| 音效 | **Web Audio 合成短音**（`src/game/systems/AudioBeeps.ts`） | 无外部 OST，无扒曲 |
| 背景音乐 | 暂无（静音 + 提示音） | 可后续加 1～2 条 CC0 loop |

### 可选升级（未内置，勿阻塞可玩）

若以后要换更漂亮的图：

1. 仅使用 **CC0 / 公有领域** 且偏可爱/软像素的包（例如 Kenney、OpenGameArt CC0）。  
2. 把文件放进 `public/assets/`，在 README 本表追加署名。  
3. 在 `BootScene` / `PixelFactory` 改为加载图片 key，替换同名纹理即可。  
4. **禁止** 宝可梦/任天堂素材、粉丝图、需付费授权的商用包、游戏 OST 扒曲。

## 存档

使用浏览器 `localStorage` 键 `embertrail-v2-save`（菜单 → 保存进度；通关时自动存档）。旧版 `embertrail-v1-save` 会在读档时自动迁移。

## 项目结构（摘要）

```
src/game/
  data/        伙伴（学招表/进化）、道具、地图数据
  graphics/    占位贴图工厂（11 种伙伴、玩家四方向、地砖）
  scenes/      Boot / Title / World / Battle / Ending
  systems/     战斗逻辑、成长（升级/学招/进化）、存档、音效
  state/       运行时全局状态（队伍、背包、焰币、图鉴、旗标）
  ui/          输入、对话框、列表面板、地图菜单、血条、过渡、触控垫
docs/          设计文档
```

开发模式下控制台可用 `__GS`（全局状态）与 `__game`（Phaser 实例）调试，生产构建不包含。
