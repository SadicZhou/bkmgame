# 焰迹旅人 · Embertrail

网页类宝可梦风格的**短篇可玩体验**（原创设定，非任天堂/宝可梦 IP）。

**运行方式：** 仅本机 `F:\work\game`（不再依赖云端开发服）  
**远端仓库（稍后同步）：** https://github.com/SadicZhou/bkmgame  
**作者：** 周建豪  
**进度：** v3.0 开发完成，自测通过（2026-10-14，报告见 `test_report_20261014_1622.md`；9 属性 / PP / 状态 / 特性 / 资质与性格 / 初始三选一 / 昼夜天气 / 异色 / 随机异象与唯一精灵 / 寄存所 / 记忆婆婆 / 告示板）。v2 见 `docs/v2-design.md`；策划稿见 `docs/planning/00-总览.md`  
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
- **菜单 / 返回：** Esc / X，或右下「菜单」（队伍、背包、图鉴、异象录、存档、回标题）  
- **开局：** 在焰角兔 / 碧波龟 / 翠叶狐中三选一  
- **主线：** 晨曦小镇 → 青苔草地（击败巡护员苔解锁山道）→ 余烬山道 → 山顶 BOSS「焰心守护·烬」→ 通关结局  
- **小镇服务：** 旅人小屋的疗愈师岚（疗愈 / 资质鉴定 / 休息到天亮或夜晚）、杂货商麦、旅人告示板（天气、事件、传闻）、寄存员纳（存取 / 放生）、记忆婆婆（遗忘 / 回忆技能）  
- **战斗：** 9 种属性克制、本系 ×1.2、会心、PP（耗尽后只能挣扎）、命中与先制、灼烧 / 麻痹 / 冻结 / 混乱 / 寄生、能力升降、特性、天气与夜晚修正  
- **收服：** 野生战中使用「安抚果 / 蜜安抚果」，HP 越低、处于异常状态越容易成功；队伍满 6 只时送往寄存所  
- **成长：** 资质（D～S 评级，鉴定后看星级）+ 9 种性格；升级学招（槽满时选择替换）；Lv25 时 A/S 资质可觉醒  
- **世界：** 每 600 步昼夜交替、300 步换天气；野生伙伴有昼夜 / 天气偏好；1/400 异色、10% 强壮个体；引兽铃 / 驱兽香  
- **异象（通关后）：** 流星雨（晴夜·草地）、花海盛放（晴天白天·草地）、地火喷涌（白天·山道）会随机发生，期间该地图天气保持不变；收集小目标拿到「异象信物」可让收服率翻倍，且唯一精灵第一回合不会行动；逃跑或团灭后可回复再战（同一只），被击倒则 3 天内不再出现  
- **小提示：** 山顶 BOSS 是焰系，选焰角兔 / 翠叶狐开局时记得在路上收服岩系或潮系伙伴  
- **全灭：** 回到旅人小屋，遗失一半焰币

## 美术风格

**可爱像素（cute pixel）**：软圆轮廓、大头大眼、粉彩/暖亮色，约 16×16～32×32 可读块面。  
伙伴立绘的基调按物种自由选择（可爱 / 帅气 / 霸气），共同底线是"明亮、正派、不邪恶"，详见 [docs/art-guide.md](docs/art-guide.md)。  
伙伴立绘、场景背景、地图装饰物、玩家与 NPC 行走图均为 AI 生成的原创像素图；地图块、天气与氛围特效由代码实时绘制。所有图片缺失时都会回退到程序绘制，不影响运行。

## 素材来源

v1 **不依赖外部美术包**，保证克隆即可绿构建：

| 资源 | 来源 | 说明 |
|------|------|------|
| 全部 29 种伙伴立绘（含守护兽与 3 只唯一伙伴，每种含异色，共 58 张） | **AI 生成原创像素图**（原图 `art-src/creatures/`，处理后 `public/assets/creatures/`） | 144×144 透明 PNG；处理脚本 `python scripts/process-sprites.py` |
| 战斗背景 ×4、标题 / 选伙伴 / 结局背景 | **AI 生成原创像素图**（`art-src/backgrounds/` → `public/assets/backgrounds/`） | 处理脚本 `python scripts/process-backgrounds.py` |
| 地图装饰物 ×9（小屋、水井、杂货摊、温泉、火盆、床、壁炉、盆栽、地毯） | **AI 生成原创像素图**（`art-src/decor/` → `public/assets/decor/`） | 摆放与碰撞见 `src/game/data/decor.ts`；处理脚本 `python scripts/process-decor.py` |
| 玩家行走图（4 方向 × 3 帧）、9 位 NPC | **AI 生成原创像素图**（`art-src/chars/` → `public/assets/chars/`） | 每帧 32×40；处理脚本 `python scripts/process-chars.py` |
| 地图块（草地变体、树林 / 山崖 / 木墙、动态水面 / 高草 / 灰烬 / 传送点） | **代码逐像素绘制**（`src/game/graphics/tiles/`） | 按坐标挑变体，按地图换墙；铺设见 `src/game/ui/MapRenderer.ts` |
| 天气与氛围（雨溅、雷电、雾、沙、雪、晴光、心火、夜晚提灯光圈、萤火虫、余烬） | **Phaser 粒子**（`src/game/ui/weather/`） | 由 `src/game/ui/WeatherLayer.ts` 统一调度 |
| 告示板 / 事件物件 | **仓库内运行时生成**（`src/game/graphics/ObjectArt.ts`） | 原创像素占位 |
| 音效 | **Web Audio 合成短音**（`src/game/systems/AudioBeeps.ts`） | 无外部 OST，无扒曲 |
| 背景音乐 | 暂无（静音 + 提示音） | 可后续加 1～2 条 CC0 loop |

### 可选升级（未内置，勿阻塞可玩）

若以后要换更漂亮的图：

1. 仅使用 **CC0 / 公有领域** 且偏可爱/软像素的包（例如 Kenney、OpenGameArt CC0）。  
2. 把文件放进 `public/assets/`，在 README 本表追加署名。  
3. 在 `BootScene` / `PixelFactory` 改为加载图片 key，替换同名纹理即可。  
4. **禁止** 宝可梦/任天堂素材、粉丝图、需付费授权的商用包、游戏 OST 扒曲。

## 存档

使用浏览器 `localStorage` 键 `embertrail-v3-save`（菜单 → 保存进度；通关时自动存档）。旧版 `embertrail-v2-save` / `embertrail-v1-save` 会在读档时自动迁移（补齐资质、性格、PP 与世界状态，旧档保留不删）。

## 测试

```bat
npm test
```

Vitest 单元测试位于 `tests/`，覆盖属性克制、资质分布、伤害计算、状态与 PP、遭遇概率、存档迁移、世界时钟与异象。

平衡性模拟（主线胜率、唯一精灵收服率）默认跳过，需要时运行：

```bat
set SIM=1 && set SIM_MATE=rockmite && set SIM_PASS_MATE=mistnewt && npx vitest run tests/balance.sim.test.ts
```

浏览器自测截图保存在 `test-artifacts/v3/`。

## 项目结构（摘要）

```
src/game/
  data/        属性、技能、特性、性格、物种、遭遇表、天气、异象、道具、地图
  graphics/    运行时像素贴图：PixelFactory 入口 + tiles/（地图块）/ 伙伴配色 / 伙伴绘制 / 人物物件 / 特效小纹理；
               CreatureArt 负责立绘加载与缩放（战斗中二阶 ×1.1、三阶 ×1.2，脚底对齐站台）；
               SceneArt 加载背景与装饰物，CharArt 加载人物行走图
  scenes/      Boot / Title / Starter / World / Battle / Ending
  systems/     战斗（Core/Calc/Logic/AI/状态/特性）、资质、成长、遭遇、世界时钟、异象、存档、音效
  state/       运行时全局状态（队伍、寄存所、背包、图鉴、旗标、世界）
  ui/          输入、对话框、列表面板、菜单、小镇服务、学招替换、地图铺设、装饰层、天气层（weather/）、事件表现、战斗特效
tests/         Vitest 单元测试
docs/          设计文档与策划稿（docs/planning）
```

开发模式下控制台可用 `__GS`（全局状态）与 `__game`（Phaser 实例）调试，生产构建不包含。
