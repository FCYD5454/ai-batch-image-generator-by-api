# 批量圖片生成器啟動腳本

Write-Host "🎨 啟動批量圖片生成器..." -ForegroundColor Cyan

# 檢查Python
Write-Host "🔍 檢查 Python 環境..." -ForegroundColor Yellow
python --version

# 創建虛擬環境
if (!(Test-Path "venv")) {
    Write-Host "📦 創建虛擬環境..." -ForegroundColor Yellow
    python -m venv venv
}

# 激活虛擬環境
Write-Host "🔧 激活虛擬環境..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# 安裝依賴
Write-Host "📥 安裝依賴套件..." -ForegroundColor Yellow
pip install -r requirements.txt

# 創建圖片存儲目錄
if (!(Test-Path "generated_images")) {
    New-Item -ItemType Directory -Name "generated_images"
    Write-Host "📁 已創建 generated_images 目錄" -ForegroundColor Green
}

# 啟動應用
Write-Host "🚀 啟動應用..." -ForegroundColor Green
Write-Host "🌐 請在瀏覽器中訪問: http://localhost:5000" -ForegroundColor Cyan
Write-Host "💡 所有 API 配置都可以在網頁界面中完成" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Cyan

python app.py 