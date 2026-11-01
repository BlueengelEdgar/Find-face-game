# 寻找人群 V0.4

基于已上线 V0.3 的 Phaser 3 + Vite 项目迭代，保留原漫画人物资源与 GitHub Pages 部署流程。

## 体验变化
- 顶部仅关卡名、计时和进度条。游戏内不显示人物总数、批次人数、开发版本或样板入口，无返回/暂停/重开等多余顶部按钮。
- 每批目标完成后一起退出 180ms；新目标淡入上移 220ms、间隔 15ms，总配置时长 460ms。整个切换期间锁定输入并暂停计时。
- 有效错误点击增加 3 秒：红叉约 350ms、头像短促振动、红色 +3s 浮字约 600ms、计时器强调；支持时尝试 30ms 设备振动，缺失/异常正常降级。
- 一次持续触摸仅判定一次；拖动不连发，空白和已找到人物不罚，锁定期不罚，快速独立误点逐次加时。
- 第一关庆祝画面为 CONGRATULATIONS! / LEVEL COMPLETE!、用时与唯一 NEXT LEVEL 按钮。第二关同样庆祝，额外显示明确标注的模拟榜和重新挑战。
- 恢复本地暖色庭院/城镇背景，背景不参与点击。首屏只加载首关需要的人物，第二关按需准备资源。

## 第二关与屏幕适配
依照最新需求“不以150为硬性指标”，按大人物、关键区域遮挡与画面饱满度选择冻结布局。当前较高竖屏使用 75 位，紧凑竖屏使用 45 位，游戏内不显示这些数量，也不出现旧35人样板。

人物身份来自原150张独立资源，未换色复制或重新生成角色。关键区域按完整上部头型透明度轮廓计算，涵盖发型、帽子、脸部及眼镜；五官中央另做保护。详见 [V0.4 验收记录](docs/V04-VALIDATION.md)。

整局布局在开始时确定，视口变化不更换身份或队列。不足以维持当前构图时自动暂停并提示恢复竖屏，恢复后继续；进入后台也自动停表。页面不滚动，五个目标保留空间，无玩家缩放操作。

## 开发与测试
Node.js 22+，实际验证 24.19.0：
```sh
npm ci
npm run dev
npm test
npm run build
npm run test:browser
```
开发路径 `/Find-face-game/`。使用现有检出目录，不需要另建 Git worktree。
- npm test：17项状态、计时、惩罚、资源、配置回归。
- npm run test:browser：当前 V0.4 实际触摸、遮挡面积、动画、结算与断网文档回归。
- npm run test:offline：只检查自包含文档。历史 V0.3 浏览器脚本不适用于已修改的规则。
- 构建同时生成 `dist/find-crowd-v04.html`，可用 `python3 scripts/package-trial.py` 打包本地备份；它不替代现有 Pages 在线验收。

## 代码分工
- `src/model.js`：唯一目标队列、加时、独立暂停原因、批次状态机。
- `src/main.js`：460ms 批次协调、简洁 HUD、结算与纸屑。
- `src/scene.js`：按需加载、可见 alpha 命中、手势去重、红叉/浮字/振动、正确销毁旧对象。
- `src/levels.js`：关卡/屏幕策略；`src/art-layout.js`、`src/layout-*.json`：独立固定构图。
- `src/characters.js`、`public/art/v03/`：保留150张独立漫画人物。
- `src/backgrounds.js`、`public/art/backgrounds/`：本地环境资源。
- `scripts/fit-v04.py`、`scripts/audit-v04.*`：资源 alpha 与完整头部布局分析，仅维护时用 Python NumPy/Pillow，不是游戏/CI构建依赖。

## 验收与发布
真实 iPhone/iPad Safari、真实设备振动、实际工具栏/安全区、手指误触与低性能设备帧率仍需人工测试。Chromium 模拟与像素审计不能代替真机验收。保留原 Phaser 包体积提示。

本分支不修改 main、Pages 权限、仓库可见性、Vite base 或部署工作流，不合并、不公开发布。人工确认并合并后，原 GitHub Actions 才会更新现有 Pages 地址；合并前线上仍是先前版本。
