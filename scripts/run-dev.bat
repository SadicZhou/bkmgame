@echo off
REM 在 F:\work\game 下双击或命令行运行本脚本启动开发服
REM @author zjh
REM @date 2026-10-14
cd /d "%~dp0.."
if not exist node_modules (
  echo 正在安装依赖...
  call npm install
)
echo 启动开发服务器（端口 45321）...
call npm run dev
pause
