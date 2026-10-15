@echo off
REM 一键剧情回归（作者：周建豪）
REM 需要先启动开发服务器：npm run dev 或双击 scripts\run-dev.bat
REM 浏览器打开后自动跑完「第一章头目 -> 湖畔 -> 沧澜鲸 -> 结局 -> 灯台点亮」，右上角显示结果；本地存档会自动还原
start "" "http://127.0.0.1:45321/?regress=1"
