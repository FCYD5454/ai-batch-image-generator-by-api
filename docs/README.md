# 🎨 批量圖片生成器

一個使用 Google Gemini 2.0 Flash Preview Image Generation 模型的批量圖片生成網頁應用。

## ✨ 功能特色

- 🚀 **批量生成**: 支持同時處理多個不同的提示詞
- 🎯 **智能模型**: 使用最新的 Gemini 2.0 Flash Preview Image Generation 模型
- 🎨 **多種尺寸**: 支持 512x512、1024x1024、1024x768、768x1024 等多種圖片尺寸
- 📊 **實時進度**: 顯示生成進度和狀態
- 💾 **自動保存**: 生成的圖片自動保存到本地
- 📱 **響應式設計**: 支持桌面和移動設備
- 🌟 **現代化 UI**: 美觀的漸變背景和動畫效果

## 🛠️ 技術棧

### 前端
- HTML5 + CSS3 + JavaScript (ES6+)
- 響應式設計
- 現代化 UI/UX

### 後端
- Python Flask
- Google Generative AI SDK
- PIL (圖片處理)
- Flask-CORS (跨域支持)

## 📋 系統要求

- Python 3.8 或更高版本
- Google Gemini API 金鑰
- 網路連接

## 🚀 快速開始

### 1. 獲取 Gemini API 金鑰

1. 訪問 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 登錄您的 Google 帳號
3. 創建新的 API 金鑰
4. 保存金鑰供後續使用

### 2. 啟動應用

#### 方法一：使用啟動腳本（推薦）

```powershell
# 在 PowerShell 中運行
.\start.ps1
```

啟動腳本會自動：
- 檢查 Python 環境
- 創建虛擬環境
- 安裝依賴套件
- 提示輸入 API 金鑰
- 啟動應用

#### 方法二：手動啟動

```bash
# 1. 創建虛擬環境
python -m venv venv

# 2. 激活虛擬環境 (Windows)
venv\Scripts\activate

# 3. 安裝依賴
pip install -r requirements.txt

# 4. 設置環境變量
set GEMINI_API_KEY=your_api_key_here

# 5. 啟動應用
python app.py
```

### 3. 使用應用

1. 在瀏覽器中打開 `http://localhost:5000`
2. 在提示詞輸入框中輸入您想要生成的圖片描述（每行一個提示詞）
3. 選擇圖片尺寸和每個提示詞生成的圖片數量
4. 點擊「🚀 開始生成」按鈕
5. 等待生成完成，查看和下載結果

## 📝 使用範例

### 提示詞示例

```
一隻可愛的橘貓在花園裡玩耍
壯麗的日出山景，雲海翻騰
現代簡約風格的建築設計
抽象藝術風格的色彩畫作
寧靜的湖泊倒映著星空
```

### 生成流程

1. **輸入提示詞**: 在文本區域中每行輸入一個提示詞
2. **選擇設置**: 選擇圖片尺寸和數量
3. **開始生成**: 點擊生成按鈕
4. **查看進度**: 實時查看生成進度
5. **預覽結果**: 在網頁上直接預覽生成的圖片
6. **下載圖片**: 點擊下載按鈕保存圖片

## 📁 項目結構

```
ImageGeneration_Script/
├── index.html          # 主頁面
├── style.css           # 樣式文件
├── script.js           # 前端 JavaScript
├── app.py              # Flask 後端應用
├── requirements.txt    # Python 依賴
├── start.ps1          # PowerShell 啟動腳本
├── README.md          # 項目說明
└── generated_images/  # 生成的圖片存儲目錄
```

## ⚙️ 配置選項

### 環境變量

- `GEMINI_API_KEY`: Gemini API 金鑰（必需）

### 應用設置

- **圖片尺寸**: 支持 512x512、1024x1024、1024x768、768x1024
- **生成數量**: 每個提示詞可生成 1-5 張圖片
- **存儲位置**: 圖片保存在 `generated_images/` 目錄

## 🔧 進階設置

### 修改生成參數

編輯 `app.py` 中的 `generate_images_with_gemini` 函數：

```python
response = model.generate_content(
    prompt,
    generation_config=genai.GenerationConfig(
        temperature=0.7,  # 控制創意程度 (0.0-1.0)
    )
)
```

### 自定義圖片尺寸

在 `index.html` 中的 `imageSize` 選擇框中添加新選項：

```html
<option value="2048x2048">2048 x 2048</option>
```

## 🐛 常見問題

### Q: API 金鑰無效
**A**: 請確保：
1. API 金鑰正確複製
2. 金鑰具有 Gemini API 訪問權限
3. 帳號配額充足

### Q: 生成失敗
**A**: 可能原因：
1. 網路連接問題
2. API 限制或配額用盡
3. 提示詞包含不當內容

### Q: 圖片無法顯示
**A**: 檢查：
1. 瀏覽器控制台錯誤信息
2. `generated_images/` 目錄權限
3. Flask 應用是否正常運行

## 📈 性能優化

- **批量處理**: 應用會自動為每個提示詞添加延遲，避免 API 限制
- **圖片壓縮**: 可以在保存時調整圖片質量以減少文件大小
- **緩存機制**: 可以添加結果緩存避免重複生成

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權

本項目採用 MIT 授權條款。

## 🙏 致謝

- Google Generative AI 提供強大的圖片生成能力
- Flask 框架提供簡潔的 Web 應用開發體驗
- 所有開源套件的貢獻者

---

**享受創作的樂趣！** 🎨✨ 