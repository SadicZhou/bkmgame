@echo off
REM 一键剧情回归 · 慢速真实出招模式（作者：周建豪）
REM 需要先启动开发服务器：npm run dev 或双击 scripts\run-dev.bat
REM 用接近实际进度的队伍逐回合真实出招，右上角显示每场战斗的胜负、回合数与剩余 HP，用来检查战斗数值；本地存档会自动还原
start "" "http://127.0.0.1:45321/?regress=slow"
