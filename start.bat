@echo off
echo 🚀 啟動 AI 批量圖片生成器...
echo.

REM 檢查 Python 是否存在
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 錯誤: 找不到 Python，請先安裝 Python 3.7 或更高版本
    echo 下載地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo ✅ Python 已找到
echo.

REM 檢查必要的套件
echo 🔍 檢查必要的 Python 套件...
python -c "import flask, flask_cors, google.generativeai, openai, requests, PIL" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo 📦 安裝缺失的套件...
    python -m pip install flask flask-cors google-generativeai openai requests pillow
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ 套件安裝失敗，請檢查網路連接或手動安裝
        pause
        exit /b 1
    )
)

echo ✅ 所有套件已準備就緒
echo.

REM 創建必要的目錄
if not exist "data" mkdir data
if not exist "assets\images" mkdir assets\images
if not exist "generated_images" mkdir generated_images

echo 📁 目錄結構已準備完成
echo.

REM 啟動應用程序
echo 🌐 啟動 Web 服務器...
echo 服務將運行在: http://localhost:5000
echo 按 Ctrl+C 停止服務
echo.

python main.py

pause
