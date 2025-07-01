# 前端重構計畫 (Frontend Refactor Plan)

## 1. 現狀分析 (Current State Analysis)

目前的 `frontend` 目錄存在嚴重的技術債，主要體現在以下幾個方面：

*   **結構混亂 (Chaotic Structure):** `js/` 和 `css/` 目錄中存在大量功能重複、命名不一致的檔案（例如 `script.js`, `script-optimized.js`, `error-patches.js`）。
*   **樣式管理失控 (Uncontrolled Styles):** 多個 CSS 檔案試圖解決相同的問題（例如暗黑模式、顏色修正），這會導致樣式規則的衝突、覆蓋和不可預測性。維護成本極高。
*   **缺乏建置工具 (Lack of Build Tools):** 專案缺少現代化的前端建置工具（如 Vite, Webpack）。所有資源都是手動管理，這導致無法進行程式碼壓縮、模組化打包、開發伺服器熱更新等現代化開發實踐。
*   **全域作用域污染 (Global Scope Pollution):** 大量腳本可能會在全域 `window` 物件上附加變數和函式，增加衝突風險。

## 2. 重構目標 (Refactoring Goals)

*   **引入建置工具:** 採用 Vite 作為開發和建置工具，以實現模組化、高效的開發流程。
*   **統一化樣式管理:** 將所有 CSS 整合為單一入口點，並使用 CSS 變數實現可維護的主題化（亮色/暗色模式）。
*   **模組化 JavaScript:** 將 JavaScript 程式碼拆分為 ES 模組，明確依賴關係，避免全域污染。
*   **清晰的檔案結構:** 建立一個直觀、可預測的檔案和目錄結構。

## 3. 建議的技術棧 (Proposed Tech Stack)

*   **建置工具 (Build Tool):** [Vite](https://vitejs.dev/) - 以其極速的冷啟動和熱模組替換 (HMR) 而聞名，設定簡單，非常適合為現有專案帶來現代化開發體驗。
*   **樣式 (Styling):** 原生 CSS，但採用 BEM (Block, Element, Modifier) 命名約定和 CSS 變數。

## 4. 建議的檔案結構 (Proposed File Structure)

```
frontend/
├── src/
│   ├── js/
│   │   ├── main.js             # 應用程式主入口
│   │   ├── api/                # 專門處理後端 API 請求的模組
│   │   │   └── index.js
│   │   ├── components/         # 可重用 UI 元件的邏輯 (例如，圖片庫、模態框)
│   │   │   ├── gallery.js
│   │   │   └── theme-toggle.js
│   │   ├── services/           # 處理非 UI 邏輯 (例如，狀態管理、認證)
│   │   │   └── auth.js
│   │   └── utils/              # 通用輔助函式
│   │       └── dom.js
│   ├── css/
│   │   ├── main.css            # 樣式主入口
│   │   ├── base/               # 基礎樣式 (重設、排版、CSS 變數)
│   │   │   ├── _reset.css
│   │   │   └── _variables.css
│   │   └── components/         # 對應 UI 元件的樣式
│   │       ├── _buttons.css
│   │       └── _gallery.css
│   └── assets/                 # 靜態資源 (圖示等)
│       └── logo.svg
├── index.html                  #唯一的 HTML 入口頁面
└── package.json                #專案依賴與腳本
```

## 5. 遷移步驟 (Migration Steps)

1.  **初始化 Vite:**
    *   在 `frontend/` 目錄下執行 `npm create vite@latest . -- --template vanilla`。
    *   這將會建立 `package.json`, `vite.config.js` 和一個基本的 `src` 目錄結構。

2.  **整理 HTML:**
    *   將現有的 `frontend/index.html` 內容轉移到 `frontend/src/index.html`，並移除所有舊的 `<script>` 和 `<link>` 標籤。
    *   在 `<body>` 標籤的末尾只保留一個 `<script type="module" src="/src/js/main.js"></script>`。

3.  **合併與重構 CSS:**
    *   在 `src/css/base/_variables.css` 中定義亮色與暗色模式的顏色變數。
    *   將所有舊 CSS 檔案的內容，逐步、有選擇地合併到新的 `src/css/` 結構中，並在 `src/css/main.css` 中用 `@import` 引入。
    *   刪除所有舊的 CSS 檔案。

4.  **重構 JavaScript:**
    *   將舊的 JavaScript 檔案按功能拆分，並改寫為 ES 模組。
    *   將它們移動到新的 `src/js/` 目錄結構中。
    *   在 `src/js/main.js` 中引入並初始化所有必要的模組。
    *   刪除所有舊的 JS 檔案。

5.  **更新開發流程:**
    *   開發時，在 `frontend/` 目錄下執行 `npm run dev`。
    *   部署時，執行 `npm run build`，它將會在 `frontend/dist` 目錄下生成優化過的靜態檔案。 