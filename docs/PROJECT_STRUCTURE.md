# 📁 優化後的項目結構

```
ImageGeneration_Script/
├── 📁 frontend/                 # 前端文件
│   ├── 📁 css/
│   │   └── style.css           # 樣式文件
│   ├── 📁 js/
│   │   └── script.js           # JavaScript 邏輯
│   └── index.html              # 主頁面
├── 📁 backend/                 # 後端文件
│   ├── 📁 api/                 # API 路由
│   ├── 📁 services/            # 業務邏輯服務
│   └── app.py                  # Flask 應用主文件
├── 📁 config/                  # 配置文件
│   ├── config.py               # 應用配置
│   ├── requirements.txt        # Python 依賴
│   └── config_example.txt      # 配置示例
├── 📁 scripts/                 # 啟動腳本
│   ├── start.bat               # Windows 批處理啟動
│   ├── start_english.ps1       # PowerShell 啟動（英文）
│   └── start_simple.ps1        # 簡化啟動腳本
├── 📁 docs/                    # 文檔
│   └── README.md               # 項目說明
├── 📁 assets/                  # 資源文件
│   └── 📁 images/              # 生成的圖片
├── 📁 venv/                    # 虛擬環境（自動生成）
├── main.py                     # 主啟動文件
└── start.bat                   # 快速啟動腳本
```

## 🎯 優化優點

1. **清晰分離**: 前端、後端、配置完全分離
2. **易於維護**: 相關文件集中管理
3. **可擴展性**: 模塊化結構便於添加新功能
4. **標準化**: 符合現代 Web 應用最佳實踐
5. **部署友好**: 結構清晰便於 Docker 化和部署

## 🚀 使用方式

### 快速啟動
```bash
# 雙擊 start.bat 或在命令行運行
start.bat
```

### 手動啟動
```bash
# 1. 激活虛擬環境
venv\Scripts\activate.bat

# 2. 安裝依賴
pip install -r config\requirements.txt

# 3. 啟動應用
python main.py
```
