# 批量圖片生成器啟動腳本

Write-Host "🎨 啟動批量圖片生成器..." -ForegroundColor Cyan

# 檢查Python是否安裝
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ 找到 Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 錯誤: 未找到 Python，請先安裝 Python 3.8 或更高版本" -ForegroundColor Red
    Read-Host "按 Enter 鍵退出"
    exit 1
}

# 檢查是否需要安裝依賴
if (-not (Test-Path "venv")) {
    Write-Host "📦 創建虛擬環境..." -ForegroundColor Yellow
    python -m venv venv
}

# 激活虛擬環境
Write-Host "🔧 激活虛擬環境..." -ForegroundColor Yellow
try {
    & ".\venv\Scripts\Activate.ps1"
} catch {
    Write-Host "❌ 無法激活虛擬環境，請檢查 Python 安裝" -ForegroundColor Red
    Read-Host "按 Enter 鍵退出"
    exit 1
}

# 安裝依賴
Write-Host "📥 安裝必要的依賴套件..." -ForegroundColor Yellow
pip install -r requirements.txt

# 檢查GEMINI_API_KEY環境變量
$currentApiKey = $env:GEMINI_API_KEY
if (-not $currentApiKey) {
    Write-Host "⚠️  警告: 未設置 GEMINI_API_KEY 環境變量" -ForegroundColor Yellow
    Write-Host "請在 Google AI Studio (https://makersuite.google.com/app/apikey) 獲取 API 金鑰" -ForegroundColor Yellow
    $apiKey = Read-Host "請輸入您的 Gemini API 金鑰 (或按 Enter 跳過)"
    if ($apiKey) {
        $env:GEMINI_API_KEY = $apiKey
        Write-Host "✅ API 金鑰已設置" -ForegroundColor Green
    }
}

# 創建必要的目錄
if (-not (Test-Path "generated_images")) {
    New-Item -ItemType Directory -Name "generated_images" | Out-Null
    Write-Host "📁 已創建 generated_images 目錄" -ForegroundColor Green
}

# 啟動Flask應用
Write-Host "🚀 啟動 Flask 應用..." -ForegroundColor Green
Write-Host "🌐 應用將在 http://localhost:5000 運行" -ForegroundColor Cyan
Write-Host "按 Ctrl+C 停止服務" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Cyan

python app.py 