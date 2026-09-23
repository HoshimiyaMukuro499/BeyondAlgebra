@echo off
REM sim.bat — 快捷模拟运行脚本
REM 用法:
REM   sim.bat            默认: 50层, 5倍速
REM   sim.bat 30 3       30层, 3倍速
REM   sim.bat 0 5        无限直到死亡, 5倍速

set FLOOR=%1
set SPEED=%2
if "%FLOOR%"=="" set FLOOR=50
if "%SPEED%"=="" set SPEED=5

echo ====================================
echo   密纹轨迹 自动模拟 v9.10
echo   目标楼层: %FLOOR%  速度: %SPEED%x
echo ====================================
echo.

node "%~dp0simRunner.js" %FLOOR% %SPEED% "%~dp0sim_results.json"

echo.
echo 按任意键退出...
pause >nul
