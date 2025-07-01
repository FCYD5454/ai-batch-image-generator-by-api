/**
 * AI智能助手 v3.0 - 優化版
 * 專注核心功能，提升性能和用戶體驗
 */

'use strict';

// ================== 配置 ==================
const AI_CONFIG = {
    API_ENDPOINT: '/api/ai-assistant',
    DEBOUNCE_DELAY: 500,
    MAX_HISTORY: 50,
    CACHE_TTL: 300000, // 5分鐘
    
    COMPLEXITY_LEVELS: {
        light: { name: '輕量優化', description: '基本改善，保持原意' },
        moderate: { name: '中等優化', description: '平衡優化，增加細節' },
        aggressive: { name: '深度優化', description: '大幅改善，創意增強' },
        creative: { name: '創意優化', description: '藝術性重構，風格突出' }
    },
    
    LANGUAGES: {
        'zh-TW': '繁體中文',
        'zh-CN': '簡體中文', 
        'en': 'English',
        'ja': '日本語',
        'ko': '한국어'
    }
};

// ================== AI助手類 ==================
class AIAssistantOptimized {
    constructor() {
        this.isConfigured = false;
        this.cache = new Map();
        this.history = [];
        this.currentRequest = null;
        this.debounceTimers = new Map();
        
        this.init();
    }

    async init() {
        try {
            await this.checkStatus();
            this.setupUI();
            this.loadHistory();
            
            console.log('🤖 AI助手v3.0已初始化');
        } catch (error) {
            console.error('AI助手初始化失敗:', error);
        }
    }

    async checkStatus() {
        try {
            const response = await fetch(`${AI_CONFIG.API_ENDPOINT}/status`);
            const status = await response.json();
            this.isConfigured = status.configured;
            return status;
        } catch (error) {
            this.isConfigured = false;
            throw error;
        }
    }

    setupUI() {
        this.createMainInterface();
        this.bindEvents();
    }

    createMainInterface() {
        const container = this.getOrCreateContainer();
        container.innerHTML = this.getInterfaceHTML();
    }

    getOrCreateContainer() {
        let container = document.getElementById('ai-assistant-optimized');
        if (!container) {
            container = document.createElement('div');
            container.id = 'ai-assistant-optimized';
            container.className = 'ai-assistant-container';
            
            // 插入到適當位置
            const targetParent = document.querySelector('.settings-section') || document.body;
            targetParent.appendChild(container);
        }
        return container;
    }

    getInterfaceHTML() {
        return `
            <div class="ai-assistant-panel">
                <div class="ai-header">
                    <h3>🤖 AI智能助手</h3>
                    <div class="ai-status ${this.isConfigured ? 'online' : 'offline'}">
                        ${this.isConfigured ? '● 在線' : '○ 離線'}
                    </div>
                </div>
                
                <div class="ai-tabs">
                    <button class="ai-tab active" data-tab="enhance">增強</button>
                    <button class="ai-tab" data-tab="translate">翻譯</button>
                    <button class="ai-tab" data-tab="analyze">分析</button>
                </div>
                
                <div class="ai-content">
                    ${this.getEnhanceTabHTML()}
                    ${this.getTranslateTabHTML()}
                    ${this.getAnalyzeTabHTML()}
                </div>
                
                <div class="ai-history">
                    <h4>最近使用</h4>
                    <div class="history-list"></div>
                </div>
            </div>
        `;
    }

    getEnhanceTabHTML() {
        return `
            <div class="ai-tab-content active" data-tab="enhance">
                <div class="enhance-controls">
                    <label>優化程度：</label>
                    <select id="enhance-complexity">
                        ${Object.entries(AI_CONFIG.COMPLEXITY_LEVELS)
                            .map(([key, config]) => 
                                `<option value="${key}">${config.name}</option>`
                            ).join('')}
                    </select>
                </div>
                
                <div class="prompt-input-section">
                    <textarea id="prompt-input" 
                             placeholder="輸入您的提示詞..."
                             rows="4"></textarea>
                    <div class="input-actions">
                        <button id="enhance-btn" class="primary-btn">
                            ✨ 智能增強
                        </button>
                        <span class="char-count">0/500</span>
                    </div>
                </div>
                
                <div class="enhancement-result" style="display:none;">
                    <h4>增強結果：</h4>
                    <div class="result-content"></div>
                    <div class="result-actions">
                        <button class="copy-btn">📋 複製</button>
                        <button class="use-btn">✅ 使用</button>
                        <button class="save-btn">💾 保存</button>
                    </div>
                </div>
            </div>
        `;
    }

    getTranslateTabHTML() {
        return `
            <div class="ai-tab-content" data-tab="translate">
                <div class="translate-controls">
                    <div class="language-selector">
                        <label>目標語言：</label>
                        <select id="target-language">
                            ${Object.entries(AI_CONFIG.LANGUAGES)
                                .map(([code, name]) => 
                                    `<option value="${code}">${name}</option>`
                                ).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="translate-section">
                    <button id="translate-btn" class="primary-btn">
                        🌐 智能翻譯
                    </button>
                </div>
                
                <div class="translation-result" style="display:none;">
                    <h4>翻譯結果：</h4>
                    <div class="result-content"></div>
                    <div class="result-actions">
                        <button class="copy-btn">📋 複製</button>
                        <button class="use-btn">✅ 使用</button>
                    </div>
                </div>
            </div>
        `;
    }

    getAnalyzeTabHTML() {
        return `
            <div class="ai-tab-content" data-tab="analyze">
                <div class="analyze-section">
                    <button id="analyze-btn" class="primary-btn">
                        📊 分析提示詞
                    </button>
                </div>
                
                <div class="analysis-result" style="display:none;">
                    <h4>分析結果：</h4>
                    <div class="analysis-metrics"></div>
                    <div class="analysis-suggestions"></div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const container = document.getElementById('ai-assistant-optimized');
        if (!container) return;

        // 標籤切換
        container.addEventListener('click', (e) => {
            if (e.target.matches('.ai-tab')) {
                this.switchTab(e.target.dataset.tab);
            }
        });

        // 功能按鈕
        this.bindFunctionButtons(container);
        
        // 輸入監聽
        this.bindInputEvents(container);
    }

    bindFunctionButtons(container) {
        // 增強按鈕
        const enhanceBtn = container.querySelector('#enhance-btn');
        if (enhanceBtn) {
            enhanceBtn.addEventListener('click', () => this.enhancePrompt());
        }

        // 翻譯按鈕
        const translateBtn = container.querySelector('#translate-btn');
        if (translateBtn) {
            translateBtn.addEventListener('click', () => this.translatePrompt());
        }

        // 分析按鈕
        const analyzeBtn = container.querySelector('#analyze-btn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.analyzePrompt());
        }

        // 結果操作按鈕
        container.addEventListener('click', (e) => {
            if (e.target.matches('.copy-btn')) {
                this.copyResult(e.target);
            } else if (e.target.matches('.use-btn')) {
                this.useResult(e.target);
            } else if (e.target.matches('.save-btn')) {
                this.saveToHistory(e.target);
            }
        });
    }

    bindInputEvents(container) {
        const promptInput = container.querySelector('#prompt-input');
        if (promptInput) {
            // 字符計數
            promptInput.addEventListener('input', (e) => {
                this.updateCharCount(e.target.value.length);
            });

            // 實時建議（防抖）
            promptInput.addEventListener('input', (e) => {
                this.debounce('suggestions', () => {
                    this.generateSuggestions(e.target.value);
                }, AI_CONFIG.DEBOUNCE_DELAY);
            });

            // 快捷鍵
            promptInput.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    e.preventDefault();
                    this.enhancePrompt();
                }
            });
        }
    }

    switchTab(tabName) {
        const container = document.getElementById('ai-assistant-optimized');
        
        // 更新標籤狀態
        container.querySelectorAll('.ai-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // 更新內容顯示
        container.querySelectorAll('.ai-tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.tab === tabName);
        });
    }

    async enhancePrompt() {
        const promptInput = document.getElementById('prompt-input');
        const complexitySelect = document.getElementById('enhance-complexity');
        const enhanceBtn = document.getElementById('enhance-btn');
        
        if (!promptInput || !promptInput.value.trim()) {
            this.showNotification('請輸入提示詞', 'warning');
            return;
        }

        const prompt = promptInput.value.trim();
        const complexity = complexitySelect?.value || 'moderate';

        try {
            this.setButtonLoading(enhanceBtn, true);
            
            const result = await this.makeRequest('/enhance', {
                prompt,
                complexity,
                preferences: this.getUserPreferences()
            });

            this.displayEnhanceResult(result);
            this.addToHistory('enhance', prompt, result);
            
        } catch (error) {
            this.showNotification('增強失敗: ' + error.message, 'error');
        } finally {
            this.setButtonLoading(enhanceBtn, false);
        }
    }

    async translatePrompt() {
        const promptInput = document.getElementById('prompt-input');
        const targetLang = document.getElementById('target-language');
        const translateBtn = document.getElementById('translate-btn');
        
        if (!promptInput || !promptInput.value.trim()) {
            this.showNotification('請輸入要翻譯的文本', 'warning');
            return;
        }

        try {
            this.setButtonLoading(translateBtn, true);
            
            const result = await this.makeRequest('/translate', {
                text: promptInput.value.trim(),
                targetLanguage: targetLang?.value || 'en'
            });

            this.displayTranslateResult(result);
            
        } catch (error) {
            this.showNotification('翻譯失敗: ' + error.message, 'error');
        } finally {
            this.setButtonLoading(translateBtn, false);
        }
    }

    async analyzePrompt() {
        const promptInput = document.getElementById('prompt-input');
        const analyzeBtn = document.getElementById('analyze-btn');
        
        if (!promptInput || !promptInput.value.trim()) {
            this.showNotification('請輸入要分析的提示詞', 'warning');
            return;
        }

        try {
            this.setButtonLoading(analyzeBtn, true);
            
            const result = await this.makeRequest('/analyze', {
                prompt: promptInput.value.trim()
            });

            this.displayAnalyzeResult(result);
            
        } catch (error) {
            this.showNotification('分析失敗: ' + error.message, 'error');
        } finally {
            this.setButtonLoading(analyzeBtn, false);
        }
    }

    displayEnhanceResult(result) {
        const resultDiv = document.querySelector('.enhancement-result');
        const contentDiv = resultDiv?.querySelector('.result-content');
        
        if (resultDiv && contentDiv) {
            contentDiv.innerHTML = `
                <div class="enhanced-prompt">
                    <h5>增強後的提示詞：</h5>
                    <div class="prompt-text">${this.escapeHtml(result.enhanced_prompt)}</div>
                </div>
                ${result.improvements ? `
                    <div class="improvements">
                        <h5>改進說明：</h5>
                        <ul>
                            ${result.improvements.map(imp => `<li>${this.escapeHtml(imp)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            `;
            
            resultDiv.style.display = 'block';
            resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    displayTranslateResult(result) {
        const resultDiv = document.querySelector('.translation-result');
        const contentDiv = resultDiv?.querySelector('.result-content');
        
        if (resultDiv && contentDiv) {
            contentDiv.innerHTML = `
                <div class="translated-text">
                    ${this.escapeHtml(result.translated_text)}
                </div>
                ${result.confidence ? `
                    <div class="confidence">
                        信心度: ${(result.confidence * 100).toFixed(1)}%
                    </div>
                ` : ''}
            `;
            
            resultDiv.style.display = 'block';
        }
    }

    displayAnalyzeResult(result) {
        const resultDiv = document.querySelector('.analysis-result');
        const metricsDiv = resultDiv?.querySelector('.analysis-metrics');
        const suggestionsDiv = resultDiv?.querySelector('.analysis-suggestions');
        
        if (resultDiv && metricsDiv && suggestionsDiv) {
            metricsDiv.innerHTML = `
                <div class="metrics-grid">
                    <div class="metric">
                        <span class="label">清晰度:</span>
                        <span class="value">${result.clarity || 'N/A'}</span>
                    </div>
                    <div class="metric">
                        <span class="label">創意度:</span>
                        <span class="value">${result.creativity || 'N/A'}</span>
                    </div>
                    <div class="metric">
                        <span class="label">複雜度:</span>
                        <span class="value">${result.complexity || 'N/A'}</span>
                    </div>
                </div>
            `;
            
            if (result.suggestions) {
                suggestionsDiv.innerHTML = `
                    <h5>改進建議：</h5>
                    <ul>
                        ${result.suggestions.map(s => `<li>${this.escapeHtml(s)}</li>`).join('')}
                    </ul>
                `;
            }
            
            resultDiv.style.display = 'block';
        }
    }

    async makeRequest(endpoint, data) {
        // 檢查緩存
        const cacheKey = `${endpoint}:${JSON.stringify(data)}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const response = await fetch(`${AI_CONFIG.API_ENDPOINT}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`請求失敗: ${response.status}`);
        }

        const result = await response.json();
        
        // 緩存結果
        this.setCache(cacheKey, result);
        
        return result;
    }

    // 工具方法
    debounce(key, func, delay) {
        clearTimeout(this.debounceTimers.get(key));
        this.debounceTimers.set(key, setTimeout(func, delay));
    }

    setButtonLoading(button, loading) {
        if (!button) return;
        
        if (loading) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = '處理中...';
            button.classList.add('loading');
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || button.textContent;
            button.classList.remove('loading');
        }
    }

    updateCharCount(count) {
        const charCountEl = document.querySelector('.char-count');
        if (charCountEl) {
            charCountEl.textContent = `${count}/500`;
            charCountEl.classList.toggle('warning', count > 450);
        }
    }

    copyResult(button) {
        const content = button.closest('.ai-tab-content').querySelector('.result-content');
        if (content) {
            const text = content.textContent.trim();
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('已複製到剪貼板', 'success');
            });
        }
    }

    useResult(button) {
        const content = button.closest('.ai-tab-content').querySelector('.result-content');
        if (content) {
            const text = content.textContent.trim();
            const promptInput = document.getElementById('prompts') || document.getElementById('prompt-input');
            if (promptInput) {
                promptInput.value = text;
                this.showNotification('已應用到提示詞', 'success');
            }
        }
    }

    addToHistory(type, original, result) {
        this.history.unshift({
            type,
            original,
            result,
            timestamp: new Date().toISOString()
        });

        // 限制歷史記錄數量
        if (this.history.length > AI_CONFIG.MAX_HISTORY) {
            this.history = this.history.slice(0, AI_CONFIG.MAX_HISTORY);
        }

        this.saveHistory();
        this.updateHistoryDisplay();
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < AI_CONFIG.CACHE_TTL) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    saveHistory() {
        try {
            localStorage.setItem('ai_assistant_history', JSON.stringify(this.history));
        } catch (error) {
            console.warn('保存歷史記錄失敗:', error);
        }
    }

    loadHistory() {
        try {
            const saved = localStorage.getItem('ai_assistant_history');
            if (saved) {
                this.history = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('載入歷史記錄失敗:', error);
        }
    }

    getUserPreferences() {
        return {
            language: document.documentElement.lang || 'zh-TW',
            theme: document.documentElement.getAttribute('data-theme') || 'light'
        };
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        if (window.uxEnhancement) {
            window.uxEnhancement.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// ================== 初始化 ==================
let aiAssistant;

(() => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            aiAssistant = new AIAssistantOptimized();
        });
    } else {
        aiAssistant = new AIAssistantOptimized();
    }
    
    window.aiAssistant = aiAssistant;
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AIAssistantOptimized };
} 