# 焰迹旅人 · Embertrail

网页类宝可梦风格的**短篇可玩体验**（原创设定，非任天堂/宝可梦 IP）。

**运行方式：** 仅本机 `F:\work\game`（不再依赖云端开发服）  
**远端仓库（稍后同步）：** https://github.com/SadicZhou/bkmgame  
**作者：** 周建豪  
**进度：** v1 可玩切片已完成（走图 / 对话 / 战斗 / 升级 / 存档）  
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
- **对话 / 确认：** 空格，或右下「对话」  
- **菜单：** Esc，或右下「菜单」（存档、看队伍、回标题）  
- **地图：** 晨曦小镇 → 东边进青苔草地；镇上木门进旅人小屋（疗愈回血）  
- **战斗：** 高草遇敌；巡护员苔可固定对战。出招 / 换人 / 逃跑，结束后回地图  
- **伙伴：** 焰角兔、碧波龟、翠叶狐、岩甲虫（野生战有几率安抚入队）

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

使用浏览器 `localStorage` 键 `embertrail-v1-save`。菜单 → 保存进度。

## 项目结构（摘要）

```
src/game/
  data/        伙伴与地图数据
  graphics/    占位贴图工厂
  scenes/      Boot / Title / World / Battle
  systems/     战斗逻辑、存档、音效
  state/       运行时全局状态
  ui/          触控垫
```
