// 🔧 提示詞增強系統
// 提示詞語法檢查、AI優化、翻譯、負面提示詞、模板庫

class PromptEnhancer {
    constructor() {
        this.templates = {};
        this.negativePhrases = [];
        this.isCollapsed = true;
        this.loadBuiltinTemplates();
        this.loadNegativePhrases();
        this.initializeUI();
    }

    // 初始化用戶界面
    initializeUI() {
        this.setupEventListeners();
        this.loadNegativeSuggestions();
        // 默認收起面板
        setTimeout(() => {
            this.togglePanel(false);
        }, 100);
    }

    // 設置事件監聽器
    setupEventListeners() {
        // 提示詞輸入變化時自動分析
        const promptsTextarea = document.getElementById('prompts');
        if (promptsTextarea) {
            promptsTextarea.addEventListener('input', () => {
                this.analyzePrompts();
            });
        }

        // 模板分類選擇
        const templateCategory = document.getElementById('templateCategory');
        if (templateCategory) {
            templateCategory.addEventListener('change', (e) => {
                this.loadTemplateSuggestions(e.target.value);
            });
        }

        // 負面提示詞變化
        const negativePrompts = document.getElementById('negativePrompts');
        if (negativePrompts) {
            negativePrompts.addEventListener('input', () => {
                this.updateNegativePrompts();
            });
        }
    }

    // 切換面板顯示/隱藏
    togglePanel(show = null) {
        const enhancerContent = document.getElementById('enhancerContent');
        const toggleButton = document.getElementById('toggleEnhancer');
        
        if (show === null) {
            this.isCollapsed = !this.isCollapsed;
        } else {
            this.isCollapsed = !show;
        }
        
        if (enhancerContent && toggleButton) {
            if (this.isCollapsed) {
                enhancerContent.style.display = 'none';
                toggleButton.textContent = i18n.t('prompt.enhancer.toggle');
                toggleButton.innerHTML = '展開 ▼';
            } else {
                enhancerContent.style.display = 'block';
                toggleButton.innerHTML = '收起 ▲';
                this.analyzePrompts(); // 展開時自動分析
            }
        }
    }

    // 分析提示詞
    async analyzePrompts() {
        const promptsTextarea = document.getElementById('prompts');
        if (!promptsTextarea) return;

        const prompts = promptsTextarea.value.trim();
        
        // 更新基本統計
        this.updateBasicStats(prompts);
        
        // 如果有內容，進行詳細分析
        if (prompts) {
            try {
                const response = await fetch('/api/analyze-prompt', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ prompt: prompts })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        this.displayAnalysisResults(data.analysis);
                    }
                }
            } catch (error) {
                console.error('分析提示詞時出錯:', error);
            }
        } else {
            this.clearAnalysisResults();
        }
    }

    // 更新基本統計
    updateBasicStats(prompts) {
        const lengthElement = document.getElementById('promptLength');
        if (lengthElement) {
            lengthElement.textContent = prompts.length;
        }
    }

    // 顯示分析結果
    displayAnalysisResults(analysis) {
        // 更新複雜度
        const complexityElement = document.getElementById('promptComplexity');
        if (complexityElement) {
            complexityElement.textContent = this.getComplexityDisplayName(analysis.complexity);
            complexityElement.className = `complexity-${analysis.complexity}`;
        }

        // 更新品質分數
        const qualityElement = document.getElementById('qualityScore');
        if (qualityElement) {
            qualityElement.textContent = `${analysis.quality_score}/100`;
            qualityElement.className = this.getQualityClass(analysis.quality_score);
        }

        // 顯示語法檢查結果
        this.displaySyntaxResults(analysis.suggestions);
    }

    // 清除分析結果
    clearAnalysisResults() {
        const complexityElement = document.getElementById('promptComplexity');
        const qualityElement = document.getElementById('qualityScore');
        const syntaxResults = document.getElementById('syntaxResults');

        if (complexityElement) complexityElement.textContent = '-';
        if (qualityElement) qualityElement.textContent = '0/100';
        if (syntaxResults) {
            syntaxResults.innerHTML = '<div class="syntax-status">等待分析...</div>';
        }
    }

    // 顯示語法檢查結果
    displaySyntaxResults(suggestions) {
        const syntaxResults = document.getElementById('syntaxResults');
        if (!syntaxResults) return;

        if (suggestions && suggestions.length > 0) {
            syntaxResults.innerHTML = `
                <div class="syntax-status warning">發現 ${suggestions.length} 個建議</div>
                <ul class="suggestion-list">
                    ${suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                </ul>
            `;
        } else {
            syntaxResults.innerHTML = '<div class="syntax-status success">語法檢查通過 ✅</div>';
        }
    }

    // 獲取複雜度顯示名稱
    getComplexityDisplayName(complexity) {
        const names = {
            'simple': '簡單',
            'moderate': '中等',
            'complex': '複雜'
        };
        return names[complexity] || complexity;
    }

    // 獲取品質分數樣式類
    getQualityClass(score) {
        if (score >= 80) return 'quality-excellent';
        if (score >= 60) return 'quality-good';
        if (score >= 40) return 'quality-average';
        return 'quality-poor';
    }

    // 優化提示詞
    async optimizePrompts() {
        const promptsTextarea = document.getElementById('prompts');
        const optimizationResults = document.getElementById('optimizationResults');
        
        if (!promptsTextarea || !optimizationResults) return;

        const prompts = promptsTextarea.value.trim();
        if (!prompts) {
            alert('請先輸入提示詞！');
            return;
        }

        optimizationResults.innerHTML = '<div class="loading">正在優化中...</div>';

        try {
            // 這裡可以集成真實的 AI 優化 API
            // 目前提供基本的優化建議
            const optimized = this.performBasicOptimization(prompts);
            
            optimizationResults.innerHTML = `
                <div class="optimization-result">
                    <h5>優化建議:</h5>
                    <div class="optimized-prompt">${optimized}</div>
                    <button onclick="promptEnhancer.applyOptimization('${optimized.replace(/'/g, "\\'")}')">
                        應用優化
                    </button>
                </div>
            `;
        } catch (error) {
            optimizationResults.innerHTML = '<div class="error">優化失敗，請稍後重試</div>';
            console.error('優化提示詞時出錯:', error);
        }
    }

    // 基本優化邏輯
    performBasicOptimization(prompts) {
        let optimized = prompts;
        
        // 添加技術參數
        if (!optimized.toLowerCase().includes('high quality') && 
            !optimized.toLowerCase().includes('detailed')) {
            optimized += ', high quality, detailed';
        }
        
        // 添加攝影參數
        if (optimized.toLowerCase().includes('portrait') && 
            !optimized.toLowerCase().includes('professional')) {
            optimized = optimized.replace('portrait', 'professional portrait photography');
        }
        
        // 添加光線描述
        if (!optimized.toLowerCase().includes('light') && 
            !optimized.toLowerCase().includes('shadow')) {
            optimized += ', natural lighting';
        }
        
        return optimized;
    }

    // 應用優化結果
    applyOptimization(optimizedText) {
        const promptsTextarea = document.getElementById('prompts');
        if (promptsTextarea) {
            promptsTextarea.value = optimizedText;
            this.analyzePrompts(); // 重新分析
        }
    }

    // 翻譯提示詞
    async translatePrompts() {
        const promptsTextarea = document.getElementById('prompts');
        const targetLanguage = document.getElementById('targetLanguage');
        const optimizationResults = document.getElementById('optimizationResults');
        
        if (!promptsTextarea || !targetLanguage || !optimizationResults) return;

        const prompts = promptsTextarea.value.trim();
        const targetLang = targetLanguage.value;
        
        if (!prompts) {
            alert('請先輸入提示詞！');
            return;
        }

        optimizationResults.innerHTML = '<div class="loading">正在翻譯中...</div>';

        try {
            // 這裡可以集成翻譯 API (Google Translate, DeepL 等)
            const translated = this.performBasicTranslation(prompts, targetLang);
            
            optimizationResults.innerHTML = `
                <div class="translation-result">
                    <h5>翻譯結果 (${this.getLanguageName(targetLang)}):</h5>
                    <div class="translated-prompt">${translated}</div>
                    <button onclick="promptEnhancer.applyTranslation('${translated.replace(/'/g, "\\'")}')">
                        應用翻譯
                    </button>
                </div>
            `;
        } catch (error) {
            optimizationResults.innerHTML = '<div class="error">翻譯失敗，請稍後重試</div>';
            console.error('翻譯提示詞時出錯:', error);
        }
    }

    // 基本翻譯邏輯 (簡化版本)
    performBasicTranslation(text, targetLang) {
        // 這是簡化的翻譯邏輯，實際應用中應該使用專業的翻譯 API
        const translations = {
            'en': {
                '美麗': 'beautiful',
                '風景': 'landscape',
                '人像': 'portrait',
                '攝影': 'photography',
                '日落': 'sunset',
                '城市': 'city'
            },
            'ja': {
                'beautiful': '美しい',
                'landscape': '風景',
                'portrait': 'ポートレート',
                'photography': '写真',
                'sunset': '夕日',
                'city': '都市'
            }
        };
        
        let translated = text;
        const langTranslations = translations[targetLang];
        
        if (langTranslations) {
            Object.keys(langTranslations).forEach(key => {
                const regex = new RegExp(key, 'gi');
                translated = translated.replace(regex, langTranslations[key]);
            });
        }
        
        return translated;
    }

    // 應用翻譯結果
    applyTranslation(translatedText) {
        const promptsTextarea = document.getElementById('prompts');
        if (promptsTextarea) {
            promptsTextarea.value = translatedText;
            this.analyzePrompts(); // 重新分析
        }
    }

    // 獲取語言名稱
    getLanguageName(langCode) {
        const names = {
            'zh-TW': '繁體中文',
            'zh-CN': '简体中文',
            'en': 'English',
            'ja': '日本語',
            'ko': '한국어'
        };
        return names[langCode] || langCode;
    }

    // 載入內建模板
    loadBuiltinTemplates() {
        this.templates = {
            'portrait': [
                'professional portrait photography',
                'natural lighting, soft shadows',
                'shallow depth of field, bokeh background',
                'studio lighting setup',
                'candid expression, authentic emotion'
            ],
            'landscape': [
                'golden hour lighting',
                'dramatic sky with clouds',
                'wide angle perspective',
                'natural colors, vibrant scenery',
                'mountain vista, serene valley'
            ],
            'abstract': [
                'geometric patterns',
                'fluid dynamics, organic shapes',
                'vibrant color palette',
                'minimal composition',
                'contemporary art style'
            ],
            'fantasy': [
                'magical atmosphere',
                'ethereal lighting effects',
                'mystical creatures',
                'enchanted forest setting',
                'otherworldly landscape'
            ],
            'anime': [
                'anime art style',
                'detailed character design',
                'expressive eyes',
                'vibrant hair colors',
                'manga illustration'
            ],
            'realistic': [
                'photorealistic rendering',
                'high detail textures',
                'natural lighting',
                'ultra high resolution',
                'professional photography'
            ]
        };
    }

    // 載入負面提示詞短語
    loadNegativePhrases() {
        this.negativePhrases = [
            'blurry', 'low quality', 'worst quality', 'out of focus',
            'ugly', 'deformed', 'mutated', 'extra limbs',
            'poorly drawn', 'bad anatomy', 'wrong proportions',
            'watermark', 'signature', 'text', 'username',
            'cut off', 'cropped', 'bad composition',
            'artificial', 'plastic', 'fake looking'
        ];
    }

    // 載入負面提示詞建議
    loadNegativeSuggestions() {
        const suggestionsContainer = document.getElementById('negativeSuggestions');
        if (!suggestionsContainer) return;

        suggestionsContainer.innerHTML = this.negativePhrases
            .map(phrase => `
                <span class="suggestion-tag" onclick="promptEnhancer.addNegativePhrase('${phrase}')">
                    ${phrase}
                </span>
            `).join('');
    }

    // 添加負面提示詞短語
    addNegativePhrase(phrase) {
        const negativePrompts = document.getElementById('negativePrompts');
        if (!negativePrompts) return;

        const currentValue = negativePrompts.value.trim();
        const phrases = currentValue ? currentValue.split(',').map(p => p.trim()) : [];
        
        if (!phrases.includes(phrase)) {
            phrases.push(phrase);
            negativePrompts.value = phrases.join(', ');
            this.updateNegativePrompts();
        }
    }

    // 更新負面提示詞
    updateNegativePrompts() {
        const negativePrompts = document.getElementById('negativePrompts');
        if (negativePrompts) {
            // 這裡可以添加負面提示詞的驗證邏輯
            console.log('負面提示詞已更新:', negativePrompts.value);
        }
    }

    // 載入模板建議
    async loadTemplateSuggestions(category) {
        const suggestionsContainer = document.getElementById('templateSuggestions');
        if (!suggestionsContainer) return;

        if (!category) {
            suggestionsContainer.innerHTML = '';
            return;
        }

        try {
            const response = await fetch(`/api/prompt-suggestions?category=${category}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.displayTemplateSuggestions(data.suggestions);
                }
            }
        } catch (error) {
            console.error('載入模板建議時出錯:', error);
            // 使用本地模板作為備用
            this.displayTemplateSuggestions(this.templates[category] || []);
        }
    }

    // 顯示模板建議
    displayTemplateSuggestions(suggestions) {
        const suggestionsContainer = document.getElementById('templateSuggestions');
        if (!suggestionsContainer) return;

        if (Array.isArray(suggestions)) {
            suggestionsContainer.innerHTML = suggestions
                .map(suggestion => `
                    <div class="template-suggestion" onclick="promptEnhancer.applyTemplate('${suggestion.replace(/'/g, "\\'")}')">
                        ${suggestion}
                    </div>
                `).join('');
        } else {
            // 如果 suggestions 是對象，顯示所有分類
            suggestionsContainer.innerHTML = Object.keys(suggestions)
                .map(category => `
                    <div class="template-category">
                        <h5>${category}</h5>
                        ${suggestions[category].map(suggestion => `
                            <div class="template-suggestion" onclick="promptEnhancer.applyTemplate('${suggestion.replace(/'/g, "\\'")}')">
                                ${suggestion}
                            </div>
                        `).join('')}
                    </div>
                `).join('');
        }
    }

    // 應用模板
    applyTemplate(template) {
        const promptsTextarea = document.getElementById('prompts');
        if (promptsTextarea) {
            const currentValue = promptsTextarea.value.trim();
            if (currentValue) {
                promptsTextarea.value = currentValue + '\n' + template;
            } else {
                promptsTextarea.value = template;
            }
            this.analyzePrompts(); // 重新分析
        }
    }

    // 保存為模板
    saveAsTemplate() {
        const promptsTextarea = document.getElementById('prompts');
        const templateCategory = document.getElementById('templateCategory');
        
        if (!promptsTextarea || !templateCategory) return;

        const prompts = promptsTextarea.value.trim();
        const category = templateCategory.value;
        
        if (!prompts) {
            alert('請先輸入提示詞！');
            return;
        }
        
        if (!category) {
            alert('請選擇模板分類！');
            return;
        }

        // 保存到本地存儲
        const customTemplates = JSON.parse(localStorage.getItem('customTemplates') || '{}');
        if (!customTemplates[category]) {
            customTemplates[category] = [];
        }
        
        if (!customTemplates[category].includes(prompts)) {
            customTemplates[category].push(prompts);
            localStorage.setItem('customTemplates', JSON.stringify(customTemplates));
            
            alert('模板已保存！');
            this.loadTemplateSuggestions(category); // 重新載入建議
        } else {
            alert('該模板已存在！');
        }
    }

    // 獲取負面提示詞
    getNegativePrompts() {
        const negativePrompts = document.getElementById('negativePrompts');
        return negativePrompts ? negativePrompts.value.trim() : '';
    }
}

// 全局函數，供 HTML 調用
function toggleEnhancerPanel() {
    if (window.promptEnhancer) {
        window.promptEnhancer.togglePanel();
    }
}

function optimizePrompts() {
    if (window.promptEnhancer) {
        window.promptEnhancer.optimizePrompts();
    }
}

function translatePrompts() {
    if (window.promptEnhancer) {
        window.promptEnhancer.translatePrompts();
    }
}

function saveAsTemplate() {
    if (window.promptEnhancer) {
        window.promptEnhancer.saveAsTemplate();
    }
}

// 初始化提示詞增強器
document.addEventListener('DOMContentLoaded', () => {
    window.promptEnhancer = new PromptEnhancer();
});

// 導出類供其他模塊使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PromptEnhancer;
} 