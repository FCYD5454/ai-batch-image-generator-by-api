# ImageGeneration_Script v3.0

一個功能強大的 AI 圖片生成平台，整合了多個第三方及本地的 AI 模型。

## 快速入門 (Quick Start)

本專案使用 Docker 進行容器化，請確保您已安裝 Docker 和 Docker Compose。

### 1. 環境設定 (Environment Setup)

在專案的根目錄下，您需要建立一個名為 `.env` 的檔案。此檔案用於存放您的 API 金鑰和應用程式密鑰。

您可以複製以下內容到您的 `.env` 檔案中，並填入對應的值：

```env
# 複製此檔案為 .env 並填入您的金鑰
# Copy this file to .env and fill in your keys

# Flask 應用程式的密鑰，用於 session 加密等
# 一個隨機的長字串即可，例如 `openssl rand -hex 32`
SECRET_KEY=YOUR_SUPER_SECRET_KEY

# 各個 AI 模型的 API 金鑰 (至少填寫一個)
GEMINI_API_KEY=
OPENAI_API_KEY=
STABILITY_API_KEY=

# 其他可選服務的 API 金鑰 (如果有的話)
# REPLICATE_API_TOKEN=
# ADOBE_API_KEY=
# LEONARDO_API_KEY=
```

### 2. 啟動專案 (Running the Project)

完成 `.env` 檔案的設定後，開啟您的終端機，在專案根目錄下執行以下指令：

```bash
docker-compose up --build
```

此指令將會建置 Docker 映像檔並啟動所有必要的服務（主應用程式、Redis等）。

應用程式啟動後，您可以透過瀏覽器訪問 `http://localhost:5000` 來使用。
