/**
 * 針對具體元素的對比度修復器
 * 修復用戶反饋的特定對比度問題
 */

'use strict';

class SpecificContrastFixer {
    constructor() {
        this.init();
    }

    init() {
        this.injectSpecificFixes();
        this.setupPeriodicFixes();
        console.log('🔧 特定對比度修復器已啟動');
    }

    injectSpecificFixes() {
        if (document.getElementById('specific-contrast-fix')) return;

        const style = document.createElement('style');
        style.id = 'specific-contrast-fix';
        style.textContent = `
            /* ================== 用戶反饋特定修復 ================== */
            
            /* AI智能助手v2.7標題修復 */
            .theme-light h3,
            .theme-light .ai-assistant-header h3,
            .theme-light [class*="ai-assistant"] h3 {
                color: #212529 !important;
                font-weight: bold !important;
                text-shadow: none !important;
            }
            
            .theme-dark h3,
            .theme-dark .ai-assistant-header h3,
            .theme-dark [class*="ai-assistant"] h3 {
                color: #ffffff !important;
                font-weight: bold !important;
                text-shadow: none !important;
            }

            /* 原始提示詞標籤修復 */
            .theme-light .original-prompt-label,
            .theme-light .prompt-label,
            .theme-light label[for*="prompt"] {
                color: #212529 !important;
                font-weight: 500 !important;
                background-color: transparent !important;
            }

            .theme-dark .original-prompt-label,
            .theme-dark .prompt-label,
            .theme-dark label[for*="prompt"] {
                color: #ffffff !important;
                font-weight: 500 !important;
                background-color: transparent !important;
            }

            /* Gemini API金鑰標籤修復 */
            .theme-light label[for*="gemini"],
            .theme-light label[for*="Gemini"],
            .theme-light .gemini-label,
            .theme-light label[for*="key"],
            .theme-light label[for*="Key"] {
                color: #212529 !important;
                font-weight: 500 !important;
                background-color: transparent !important;
            }

            .theme-dark label[for*="gemini"],
            .theme-dark label[for*="Gemini"],
            .theme-dark .gemini-label,
            .theme-dark label[for*="key"],
            .theme-dark label[for*="Key"] {
                color: #ffffff !important;
                font-weight: 500 !important;
                background-color: transparent !important;
            }

            /* modelSelect下拉選項修復 */
            .theme-light select#modelSelect,
            .theme-light #modelSelect {
                background-color: #ffffff !important;
                color: #212529 !important;
                border: 2px solid #ced4da !important;
            }

            .theme-dark select#modelSelect,
            .theme-dark #modelSelect {
                background-color: #2d2d2d !important;
                color: #ffffff !important;
                border: 2px solid #404040 !important;
            }

            /* 所有option修復 */
            .theme-light select option,
            .theme-light option {
                background-color: #ffffff !important;
                color: #212529 !important;
            }

            .theme-dark select option,
            .theme-dark option {
                background-color: #2d2d2d !important;
                color: #ffffff !important;
            }

            /* 強制所有標籤可見 */
            .theme-light label {
                color: #212529 !important;
                background: transparent !important;
            }

            .theme-dark label {
                color: #ffffff !important;
                background: transparent !important;
            }
        `;

        document.head.appendChild(style);
    }

    setupPeriodicFixes() {
        // 每2秒檢查一次特定元素
        setInterval(() => {
            this.fixSpecificElements();
        }, 2000);
        
        // 立即執行一次
        setTimeout(() => {
            this.fixSpecificElements();
        }, 500);
    }

    fixSpecificElements() {
        const isDark = document.documentElement.classList.contains('theme-dark');
        const textColor = isDark ? '#ffffff' : '#212529';
        const bgColor = isDark ? '#2d2d2d' : '#ffffff';
        const borderColor = isDark ? '#404040' : '#ced4da';

        // 修復AI助手標題
        const aiTitles = document.querySelectorAll('h3');
        aiTitles.forEach(title => {
            if (title.textContent.includes('AI') || title.textContent.includes('智能助手')) {
                title.style.color = textColor;
                title.style.fontWeight = 'bold';
                title.style.textShadow = 'none';
            }
        });

        // 修復所有標籤
        const labels = document.querySelectorAll('label');
        labels.forEach(label => {
            label.style.color = textColor;
            label.style.backgroundColor = 'transparent';
            label.style.fontWeight = '500';
        });

        // 修復modelSelect
        const modelSelect = document.getElementById('modelSelect');
        if (modelSelect) {
            modelSelect.style.backgroundColor = bgColor;
            modelSelect.style.color = textColor;
            modelSelect.style.border = `2px solid ${borderColor}`;
            
            // 修復其選項
            const options = modelSelect.querySelectorAll('option');
            options.forEach(option => {
                option.style.backgroundColor = bgColor;
                option.style.color = textColor;
            });
        }

        // 修復所有select的option
        const allOptions = document.querySelectorAll('option');
        allOptions.forEach(option => {
            option.style.backgroundColor = bgColor;
            option.style.color = textColor;
        });

        // 修復可能包含"原始提示詞"的元素
        const textNodes = this.findTextNodes(document.body, '原始提示詞');
        textNodes.forEach(node => {
            if (node.parentElement) {
                node.parentElement.style.color = textColor;
            }
        });

        // 修復包含"Gemini API 金鑰"的元素
        const geminiNodes = this.findTextNodes(document.body, 'Gemini API 金鑰');
        geminiNodes.forEach(node => {
            if (node.parentElement) {
                node.parentElement.style.color = textColor;
                node.parentElement.style.fontWeight = '500';
            }
        });
    }

    findTextNodes(element, searchText) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.includes(searchText)) {
                textNodes.push(node);
            }
        }

        return textNodes;
    }

    // 手動強制修復
    forceFixAll() {
        console.log('強制修復所有特定對比度問題...');
        
        const isDark = document.documentElement.classList.contains('theme-dark');
        const textColor = isDark ? '#ffffff' : '#212529';
        const bgColor = isDark ? '#2d2d2d' : '#ffffff';

        // 強制修復所有可能的元素
        const selectors = [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'label', 'option', 'select'
        ];

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.color = textColor;
                
                if (selector === 'select' || selector === 'option') {
                    el.style.backgroundColor = bgColor;
                }
                
                if (selector.includes('h')) {
                    el.style.fontWeight = 'bold';
                } else if (selector === 'label') {
                    el.style.fontWeight = '500';
                    el.style.backgroundColor = 'transparent';
                }
            });
        });

        console.log('強制修復完成');
    }
}

// 自動初始化
let specificContrastFixer;

(() => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            specificContrastFixer = new SpecificContrastFixer();
        });
    } else {
        specificContrastFixer = new SpecificContrastFixer();
    }
    
    window.specificContrastFixer = specificContrastFixer;
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpecificContrastFixer };
}
