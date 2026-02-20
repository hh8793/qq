@echo off
echo ============================================
echo AgentLink 快速启动脚本
echo ============================================
echo.

echo [1/4] 检查 Node.js 和 npm...
node --version
npm --version
echo.

echo [2/4] 安装后端依赖...
call npm install
if %errorlevel% neq 0 (
    echo 安装失败，请检查网络连接
    pause
    exit /b 1
)
echo.

echo [3/4] 启动后端服务（Mock模式）...
start "AgentLink Backend" cmd /k "npm run dev:mock"
echo 后端服务已启动，访问 http://localhost:3000/api/v1
echo.

echo [4/4] 启动前端服务...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo 安装失败，请检查网络连接
    pause
    exit /b 1
)
start "AgentLink Frontend" cmd /k "npm run dev"
cd ..
echo.

echo ============================================
echo 启动完成！
echo ============================================
echo 后端API: http://localhost:3000/api/v1
echo 前端界面: http://localhost:3001
echo 健康检查: http://localhost:3000/health
echo ============================================
echo.
pause
