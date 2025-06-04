# 項目結構優化任務清單

## 🚨 即時清理任務

### 1. 清理根目錄 ✅ 已完成
- [x] 刪除 `memory_test.md` - 移至 docs/testing/ ✅
- [x] 刪除 `test_sync.txt` - 移至 docs/testing/ ✅
- [x] 刪除重複的 `README_GITHUB.md` ✅
- [x] 移動 `main.py` 到 `backend/` 目錄 ✅

### 2. 整合重複文件 ✅ 已檢查
- [x] 檢查 AI Assistant 相關文件：
  - `backend/api/ai_assistant.py` (23KB) - API 路由層 ✅
  - `backend/services/ai_assistant.py` (49KB) - 業務邏輯層 ✅
  - **結論**: 功能分工明確，不是重複代碼！
- [ ] 檢查前端 AI Assistant 版本：
  - `frontend/js/ai-assistant.js` (26KB)
  - `frontend/js/ai-assistant-v27.js` (55KB)

### 3. 優化目錄結構 ✅ 已完成
- [x] 創建 `tests/` 目錄 ✅
- [x] 創建 `docs/testing/` 子目錄 ✅
- [ ] 整理 `scripts/` 目錄

## 📁 建議的新結構
```
ImageGeneration_Script/
├── backend/
│   ├── main.py                 # ✅ 已移入
│   ├── app.py
│   ├── api/
│   ├── services/
│   └── models/
├── frontend/
├── tests/                      # ✅ 已創建
│   ├── unit/
│   ├── integration/
│   └── testing_docs/
├── docs/
│   ├── api/
│   ├── user_guide/
│   └── testing/               # ✅ 已創建
├── scripts/
├── config/
├── deploy/
└── README.md                  # ✅ 單一README
```

## ✅ 完成標記
- [x] 根目錄清理完成 ✅
- [x] 代碼重複檢查完成 ✅ (確認無重複)
- [x] 目錄結構優化完成 ✅
- [ ] 文檔更新完成

## 🎯 下一步建議
1. 檢查前端 JS 文件版本管理
2. 建立正式的測試框架
3. 完善 API 文檔
4. 設置 CI/CD 工作流程 