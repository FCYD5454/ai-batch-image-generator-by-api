# ImageGeneration_Script v3.0 部署腳本
# 支援多種部署方式

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("docker", "local", "heroku", "cloud")]
    [string]$DeployType,
    
    [string]$AppName = "imagegeneration-script",
    [string]$Port = "5000"
)

Write-Host "🚀 開始部署 ImageGeneration_Script v3.0..." -ForegroundColor Green

switch ($DeployType) {
    "docker" {
        Write-Host "📦 Docker 容器化部署..." -ForegroundColor Yellow
        
        # 檢查 Docker 是否安裝
        if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
            Write-Error "❌ Docker 未安裝！請先安裝 Docker Desktop"
            exit 1
        }
        
        # 建立映像
        Write-Host "🔨 建立 Docker 映像..." -ForegroundColor Cyan
        docker build -t $AppName`:latest .
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Docker 映像建立成功" -ForegroundColor Green
            
            # 停止現有容器
            docker stop $AppName 2>$null
            docker rm $AppName 2>$null
            
            # 啟動新容器
            Write-Host "🚀 啟動容器..." -ForegroundColor Cyan
            docker run -d -p $Port`:5000 --name $AppName $AppName`:latest
            
            Write-Host "✅ 部署完成！應用運行在 http://localhost:$Port" -ForegroundColor Green
        } else {
            Write-Error "❌ Docker 映像建立失敗"
            exit 1
        }
    }
    
    "local" {
        Write-Host "💻 本地部署..." -ForegroundColor Yellow
        
        # 檢查 Python
        if (!(Get-Command python -ErrorAction SilentlyContinue)) {
            Write-Error "❌ Python 未安裝！請先安裝 Python 3.7+"
            exit 1
        }
        
        # 安裝依賴
        Write-Host "📦 安裝依賴..." -ForegroundColor Cyan
        pip install -r config/requirements.txt
        
        # 設定環境變數
        $env:FLASK_ENV = "production"
        $env:FLASK_DEBUG = "False"
        
        # 啟動應用
        Write-Host "🚀 啟動應用..." -ForegroundColor Cyan
        python main.py
    }
    
    "heroku" {
        Write-Host "☁️ Heroku 部署..." -ForegroundColor Yellow
        
        # 檢查 Heroku CLI
        if (!(Get-Command heroku -ErrorAction SilentlyContinue)) {
            Write-Error "❌ Heroku CLI 未安裝！請先安裝 Heroku CLI"
            exit 1
        }
        
        # 初始化 Git (如果需要)
        if (!(Test-Path .git)) {
            git init
            git add .
            git commit -m "Initial commit for deployment"
        }
        
        # 創建 Heroku 應用
        Write-Host "🔨 創建 Heroku 應用..." -ForegroundColor Cyan
        heroku create $AppName
        
        # 設定環境變數
        heroku config:set FLASK_ENV=production
        heroku config:set FLASK_DEBUG=False
        
        # 部署
        Write-Host "🚀 部署到 Heroku..." -ForegroundColor Cyan
        git push heroku main
        
        Write-Host "✅ Heroku 部署完成！" -ForegroundColor Green
        heroku open
    }
    
    "cloud" {
        Write-Host "☁️ 雲端部署指南..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "請選擇您偏好的雲端平台：" -ForegroundColor White
        Write-Host "1. Railway.app - 最簡單的部署方式" -ForegroundColor Cyan
        Write-Host "   - 訪問 https://railway.app" -ForegroundColor Gray
        Write-Host "   - 連接 GitHub repository" -ForegroundColor Gray
        Write-Host "   - 自動檢測 Dockerfile 並部署" -ForegroundColor Gray
        Write-Host ""
        Write-Host "2. Google Cloud Run - 企業級解決方案" -ForegroundColor Cyan
        Write-Host "   - gcloud run deploy $AppName --source . --platform managed" -ForegroundColor Gray
        Write-Host ""
        Write-Host "3. AWS App Runner - Amazon 的容器服務" -ForegroundColor Cyan
        Write-Host "   - 透過 AWS Console 設定" -ForegroundColor Gray
        Write-Host ""
        Write-Host "4. DigitalOcean App Platform - 開發者友好" -ForegroundColor Cyan
        Write-Host "   - 透過 DigitalOcean Console 設定" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "🎉 部署流程完成！" -ForegroundColor Green
Write-Host "💡 提示：記得在生產環境中設定您的 API 金鑰" -ForegroundColor Yellow 