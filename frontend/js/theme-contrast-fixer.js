/**
 * 主題對比度修復器 - 解決明暗模式文字和背景顏色相似問題
 */

'use strict';

class ThemeContrastFixer {
    constructor() {
        this.init();
    }

    init() {
        this.injectContrastStyles();
        console.log('🎨 主題對比度修復器已啟動');
    }

    injectContrastStyles() {
        if (document.getElementById('theme-contrast-fix')) return;

        const style = document.createElement('style');
        style.id = 'theme-contrast-fix';
        style.textContent = `
            /* ================== 明亮模式高對比度修復 ================== */
            .theme-light, html.theme-light, body.theme-light {
                --text-color: #212529 !important;
                --text-secondary: #495057 !important;
                --text-muted: #6c757d !important;
                --bg-color: #ffffff !important;
                --bg-secondary: #f8f9fa !important;
                --card-bg: #ffffff !important;
                --border-color: #dee2e6 !important;
                --primary-color: #0056b3 !important;
                --success-color: #155724 !important;
                --warning-color: #856404 !important;
                --error-color: #721c24 !important;
                --input-bg: #ffffff !important;
                --input-text: #212529 !important;
                --button-bg: #0056b3 !important;
                --button-text: #ffffff !important;
                --link-color: #0056b3 !important;
            }

            /* ================== 黑暗模式高對比度修復 ================== */
            .theme-dark, html.theme-dark, body.theme-dark {
                --text-color: #ffffff !important;
                --text-secondary: #e0e0e0 !important;
                --text-muted: #b0b0b0 !important;
                --bg-color: #121212 !important;
                --bg-secondary: #1e1e1e !important;
                --card-bg: #1e1e1e !important;
                --border-color: #404040 !important;
                --primary-color: #64b5f6 !important;
                --success-color: #81c784 !important;
                --warning-color: #ffb74d !important;
                --error-color: #e57373 !important;
                --input-bg: #2d2d2d !important;
                --input-text: #ffffff !important;
                --button-bg: #64b5f6 !important;
                --button-text: #000000 !important;
                --link-color: #64b5f6 !important;
            }

            /* ================== 強制文字對比度 ================== */
            .theme-light body, .theme-light p, .theme-light h1, 
            .theme-light h2, .theme-light h3, .theme-light h4, 
            .theme-light h5, .theme-light h6, .theme-light span, 
            .theme-light div, .theme-light label, .theme-light li {
                color: #212529 !important;
            }

            .theme-dark body, .theme-dark p, .theme-dark h1, 
            .theme-dark h2, .theme-dark h3, .theme-dark h4, 
            .theme-dark h5, .theme-dark h6, .theme-dark span, 
            .theme-dark div, .theme-dark label, .theme-dark li {
                color: #ffffff !important;
            }

            /* ================== 表單元素修復 ================== */
            .theme-light input, .theme-light textarea, .theme-light select {
                background-color: #ffffff !important;
                color: #212529 !important;
                border-color: #ced4da !important;
            }

            .theme-dark input, .theme-dark textarea, .theme-dark select {
                background-color: #2d2d2d !important;
                color: #ffffff !important;
                border-color: #404040 !important;
            }

            /* ================== 按鈕修復 ================== */
            .theme-light button, .theme-light .btn {
                background-color: #0056b3 !important;
                color: #ffffff !important;
                border-color: #0056b3 !important;
            }

            .theme-dark button, .theme-dark .btn {
                background-color: #64b5f6 !important;
                color: #000000 !important;
                border-color: #64b5f6 !important;
            }

            /* ================== 卡片和容器修復 ================== */
            .theme-light .card, .theme-light .panel, .theme-light .container {
                background-color: #ffffff !important;
                color: #212529 !important;
            }

            .theme-dark .card, .theme-dark .panel, .theme-dark .container {
                background-color: #1e1e1e !important;
                color: #ffffff !important;
            }

            /* ================== 鏈接修復 ================== */
            .theme-light a {
                color: #0056b3 !important;
            }

            .theme-dark a {
                color: #64b5f6 !important;
            }

            /* ================== 主題切換器修復 ================== */
            .theme-light .theme-toggle-btn {
                background-color: #ffffff !important;
                color: #212529 !important;
                border-color: #dee2e6 !important;
            }

            .theme-dark .theme-toggle-btn {
                background-color: #1e1e1e !important;
                color: #ffffff !important;
                border-color: #404040 !important;
            }

            .theme-light .theme-dropdown {
                background-color: #ffffff !important;
                color: #212529 !important;
                border-color: #dee2e6 !important;
            }

            .theme-dark .theme-dropdown {
                background-color: #1e1e1e !important;
                color: #ffffff !important;
                border-color: #404040 !important;
            }

            /* ================== 特定元素修復 ================== */
            
            /* AI助手標題修復 */
            .theme-light h3, .theme-light .ai-assistant-header h3 {
                color: #212529 !important;
            }
            
            .theme-dark h3, .theme-dark .ai-assistant-header h3 {
                color: #ffffff !important;
            }

            /* 原始提示詞標籤修復 */
            .theme-light .original-prompt-label,
            .theme-light .prompt-label {
                color: #212529 !important;
            }

            .theme-dark .original-prompt-label,
            .theme-dark .prompt-label {
                color: #ffffff !important;
            }

            /* API金鑰標籤修復 */
            .theme-light .api-key-label,
            .theme-light label[for*="key"],
            .theme-light label[for*="Key"] {
                color: #212529 !important;
            }

            .theme-dark .api-key-label,
            .theme-dark label[for*="key"],
            .theme-dark label[for*="Key"] {
                color: #ffffff !important;
            }

            /* Select選項修復 */
            .theme-light select option {
                background-color: #ffffff !important;
                color: #212529 !important;
            }

            .theme-dark select option {
                background-color: #2d2d2d !important;
                color: #ffffff !important;
            }

            /* modelSelect特別修復 */
            .theme-light #modelSelect option {
                background-color: #ffffff !important;
                color: #212529 !important;
            }

            .theme-dark #modelSelect option {
                background-color: #2d2d2d !important;
                color: #ffffff !important;
            }

            /* Gemini API金鑰區域修復 */
            .theme-light .gemini-api-section,
            .theme-light .api-section {
                color: #212529 !important;
            }

            .theme-dark .gemini-api-section,
            .theme-dark .api-section {
                color: #ffffff !important;
            }

            /* 強制修復所有標籤 */
            .theme-light label {
                color: #212529 !important;
            }

            .theme-dark label {
                color: #ffffff !important;
            }

            /* 強制修復所有選項 */
            .theme-light option {
                background-color: #ffffff !important;
                color: #212529 !important;
            }

            .theme-dark option {
                background-color: #2d2d2d !important;
                color: #ffffff !important;
            }
        `;

        document.head.appendChild(style);
    }

    // 手動強制修復方法
    fixAllContrast() {
        const root = document.documentElement;
        const isDark = root.classList.contains('theme-dark');

        if (isDark) {
            root.style.setProperty('--text-color', '#ffffff', 'important');
            root.style.setProperty('--bg-color', '#121212', 'important');
            root.style.setProperty('--card-bg', '#1e1e1e', 'important');
        } else {
            root.style.setProperty('--text-color', '#212529', 'important');
            root.style.setProperty('--bg-color', '#ffffff', 'important');
            root.style.setProperty('--card-bg', '#ffffff', 'important');
        }

        console.log('已強制修復所有對比度問題');
    }
}

// 自動初始化
let contrastFixer;

(() => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            contrastFixer = new ThemeContrastFixer();
        });
    } else {
        contrastFixer = new ThemeContrastFixer();
    }
    
    window.contrastFixer = contrastFixer;
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ThemeContrastFixer };
}
