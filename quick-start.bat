@echo off
echo ============================================
echo AgentLink 快速启动
echo ============================================
echo.

REM 检查 node_modules 是否存在
if not exist "node_modules" (
    echo [1/3] 首次运行，正在安装依赖...
    call npm install --legacy-peer-deps
    if %errorlevel% neq 0 (
        echo 安装失败
        pause
        exit /b 1
    )
) else (
    echo [1/3] 依赖已安装
)
echo.

echo [2/3] 启动后端服务...
set USE_MOCK_DB=true
call npx ts-node src/index-mock.ts
