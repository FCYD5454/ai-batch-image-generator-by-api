# 📚 ImageGeneration_Script v3.0 發布指南

## 🎯 概述

本指南將協助您將 ImageGeneration_Script v3.0 企業級 AI 創意協作平台發布到各種環境中。

## 🚀 快速開始

### 一鍵部署 (推薦)

```powershell
# 使用我們的部署腳本
.\deploy\deploy.ps1 -DeployType docker

# 或其他選項
.\deploy\deploy.ps1 -DeployType local
.\deploy\deploy.ps1 -DeployType heroku -AppName "your-app-name"
.\deploy\deploy.ps1 -DeployType cloud
```

## 📋 發布前檢查清單

### ✅ 必要準備
- [ ] Python 3.7+ 已安裝
- [ ] 所有依賴已列在 `config/requirements.txt`
- [ ] API 金鑰已準備 (Gemini, OpenAI, Stability AI)
- [ ] 資料庫檔案存在於 `data/` 目錄
- [ ] 靜態檔案完整 (CSS, JS, 圖片)

### ✅ 安全設定
- [ ] 生產環境金鑰已設定
- [ ] CORS 設定正確
- [ ] Debug 模式已關閉
- [ ] SSL 憑證已準備 (如需要)

### ✅ 效能優化
- [ ] 靜態檔案壓縮
- [ ] 資料庫索引已建立
- [ ] 快取策略已設定
- [ ] 日誌級別已調整

## 🐳 Docker 部署 (推薦)

### 方式 1: 簡單部署
```powershell
# 建立映像
docker build -t imagegeneration-script:v3.0 .

# 執行容器
docker run -d -p 5000:5000 --name imagegeneration-app imagegeneration-script:v3.0
```

### 方式 2: Docker Compose (完整環境)
```powershell
cd deploy
docker-compose up -d
```

### Docker 優勢
- ✅ 環境一致性
- ✅ 簡易部署
- ✅ 容易擴展
- ✅ 容器化管理

## ☁️ 雲端平台部署

### 1. Railway (最簡單)

**步驟：**
1. 訪問 [Railway.app](https://railway.app)
2. 登入並點擊 "New Project"
3. 選擇 "Deploy from GitHub repo"
4. 連接您的 repository
5. Railway 自動檢測 Dockerfile 並部署

**優勢：**
- ✅ 零配置部署
- ✅ 自動 HTTPS
- ✅ 免費額度
- ✅ 自動擴展

### 2. Heroku

**步驟：**
```powershell
# 安裝 Heroku CLI
# 下載：https://devcenter.heroku.com/articles/heroku-cli

# 登入
heroku login

# 創建應用
heroku create your-app-name

# 設定環境變數
heroku config:set FLASK_ENV=production
heroku config:set SECRET_KEY=your-secret-key

# 部署
git push heroku main
```

**優勢：**
- ✅ 成熟平台
- ✅ 豐富插件
- ✅ CI/CD 整合
- ✅ 詳細文檔

### 3. Google Cloud Run

**步驟：**
```powershell
# 安裝 Google Cloud SDK
# 下載：https://cloud.google.com/sdk/docs/install

# 認證
gcloud auth login

# 設定專案
gcloud config set project YOUR_PROJECT_ID

# 部署
gcloud run deploy imagegeneration-script \
  --source . \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated
```

**優勢：**
- ✅ 按需付費
- ✅ 自動擴展
- ✅ 企業級安全
- ✅ 全球部署

### 4. DigitalOcean App Platform

**步驟：**
1. 登入 [DigitalOcean](https://cloud.digitalocean.com)
2. 點擊 "Create" → "Apps"
3. 連接 GitHub repository
4. 選擇自動部署設定
5. 設定環境變數
6. 點擊 "Create Resources"

**優勢：**
- ✅ 開發者友好
- ✅ 透明定價
- ✅ 內建監控
- ✅ 簡單設定

## 💻 VPS 伺服器部署

### 使用 Nginx + Gunicorn

**1. 伺服器準備**
```bash
# 更新系統
sudo apt update && sudo apt upgrade -y

# 安裝必要軟體
sudo apt install python3-pip nginx git -y

# 安裝 Python 依賴
pip3 install gunicorn
```

**2. 應用設定**
```bash
# 下載專案
git clone https://github.com/yourusername/ImageGeneration_Script.git
cd ImageGeneration_Script

# 安裝依賴
pip3 install -r config/requirements.txt

# 測試執行
gunicorn -w 4 -b 0.0.0.0:5000 main:app
```

**3. Nginx 設定**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**4. 系統服務設定**
```ini
# /etc/systemd/system/imagegeneration.service
[Unit]
Description=ImageGeneration Script v3.0
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/path/to/ImageGeneration_Script
ExecStart=/usr/local/bin/gunicorn -w 4 -b 127.0.0.1:5000 main:app
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# 啟用服務
sudo systemctl enable imagegeneration
sudo systemctl start imagegeneration
```

## 🔐 生產環境安全設定

### 環境變數設定
```bash
# 設定必要的環境變數
export FLASK_ENV=production
export FLASK_DEBUG=False
export SECRET_KEY="your-super-secret-key"
export GEMINI_API_KEY="your-gemini-key"
export OPENAI_API_KEY="your-openai-key"
export STABILITY_API_KEY="your-stability-key"
```

### SSL 憑證設定
```bash
# 使用 Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 防火牆設定
```bash
# UFW 設定
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

## 📊 監控與維護

### 日誌管理
```python
# 在 main.py 中加入日誌設定
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
```

### 健康檢查
```python
# 加入健康檢查端點
@app.route('/health')
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
```

### 效能監控
- 使用 New Relic 或 DataDog 進行 APM 監控
- 設定 Prometheus + Grafana 進行指標收集
- 使用 Sentry 進行錯誤追蹤

## 🎯 發布後驗證

### 功能測試
- [ ] 首頁載入正常
- [ ] API 端點回應正常
- [ ] 圖片生成功能正常
- [ ] 檔案上傳/下載正常
- [ ] 使用者認證正常

### 效能測試
```bash
# 使用 ab 進行簡單負載測試
ab -n 1000 -c 10 http://yourdomain.com/

# 使用 curl 測試 API
curl -X GET http://yourdomain.com/api/health
```

### 安全檢查
- [ ] HTTPS 強制重定向
- [ ] 安全標頭設定正確
- [ ] API 金鑰未暴露
- [ ] 檔案權限設定正確

## 🚀 自動化 CI/CD

### GitHub Actions 範例
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy to Railway
      uses: railwayapp/railway-deploy@v1
      with:
        railway-token: ${{ secrets.RAILWAY_TOKEN }}
```

## 📞 技術支援

如果在發布過程中遇到問題：

1. **檢查日誌檔案** - 查看 `app.log` 獲取錯誤資訊
2. **驗證環境變數** - 確保所有必要變數已設定
3. **測試本地環境** - 先在本地確保功能正常
4. **查閱平台文檔** - 參考對應雲端平台的官方文檔

## 🎉 恭喜！

您的 ImageGeneration_Script v3.0 企業級 AI 創意協作平台現已成功發布！

記得定期更新依賴套件並監控系統效能。 