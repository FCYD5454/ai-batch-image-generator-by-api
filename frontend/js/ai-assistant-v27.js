/**
 * AI 智能助手前端模組 v2.7
 * 支援批量處理、翻譯、進階優化等功能
 */

class AIAssistantV27 {
    constructor() {
        this.apiEndpoint = '/api/ai-assistant';
        this.isConfigured = false;
        this.optimizationHistory = [];
        this.batchJobs = new Map();
        this.currentBatchJob = null;
        this.performanceMetrics = null;
        
        // 配置選項
        this.complexityOptions = {
            'light': '輕量優化',
            'moderate': '中等優化',
            'aggressive': '深度優化',
            'creative': '創意優化'
        };
        
        this.languageOptions = {
            'en': 'English',
            'zh': '中文',
            'ja': '日本語',
            'ko': '한국어',
            'fr': 'Français',
            'de': 'Deutsch',
            'es': 'Español'
        };
        
        // 初始化
        this.init();
        
        console.log('🤖 AI 智能助手 v2.7 已初始化');
    }
    
    async init() {
        try {
            // 檢查配置狀態
            await this.checkStatus();
            
            // 設置 UI
            this.setupUI();
            
            // 載入歷史記錄
            await this.loadOptimizationHistory();
            
            // 啟動定期更新
            this.startPeriodicUpdates();
            
        } catch (error) {
            console.error('AI 助手初始化失敗:', error);
            this.showNotification('AI 助手初始化失敗', 'error');
        }
    }
    
    setupUI() {
        // 創建主容器
        this.createMainContainer();
        
        // 設置事件監聽器
        this.setupEventListeners();
        
        // 初始化組件
        this.initializeComponents();
    }
    
    initializeComponents() {
        console.log('🔧 初始化AI助手組件...');
        // 組件初始化邏輯
        this.initializeFormElements();
        this.setupAdvancedFeatures();
        this.initializeDataBinding();
    }
    
    initializeFormElements() {
        // 初始化表單元素
        const promptInput = document.getElementById('prompt-input');
        if (promptInput) {
            promptInput.addEventListener('input', this.onPromptInputChange.bind(this));
        }
        
        const styleSelect = document.getElementById('style-select');
        if (styleSelect) {
            styleSelect.addEventListener('change', this.onStyleChange.bind(this));
        }
    }
    
    setupAdvancedFeatures() {
        // 設置進階功能
        this.setupAutoComplete();
        this.setupPromptSuggestions();
        this.setupKeyboardShortcuts();
    }
    
    initializeDataBinding() {
        // 初始化數據綁定
        this.bindFormData();
        this.loadUserPreferences();
    }
    
    onPromptInputChange(event) {
        // 處理提示詞輸入變化
        const value = event.target.value;
        this.updateCharacterCount(value);
        this.triggerAutoSuggestions(value);
    }
    
    onStyleChange(event) {
        // 處理風格變化
        const style = event.target.value;
        this.updateStyleRecommendations(style);
    }
    
    setupAutoComplete() {
        // 設置自動完成
        console.log('設置自動完成功能...');
    }
    
    setupPromptSuggestions() {
        // 設置提示詞建議
        console.log('設置提示詞建議...');
    }
    
    setupKeyboardShortcuts() {
        // 設置鍵盤快捷鍵
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.enhancePrompt();
            }
        });
    }
    
    bindFormData() {
        // 綁定表單數據
        console.log('綁定表單數據...');
    }
    
    loadUserPreferences() {
        // 載入用戶偏好設置
        const savedPrefs = localStorage.getItem('aiAssistantPrefs');
        if (savedPrefs) {
            try {
                const prefs = JSON.parse(savedPrefs);
                this.applyUserPreferences(prefs);
            } catch (error) {
                console.error('載入用戶偏好失敗:', error);
            }
        }
    }
    
    applyUserPreferences(prefs) {
        // 應用用戶偏好設置
        if (prefs.defaultStyle) {
            const styleSelect = document.getElementById('style-select');
            if (styleSelect) {
                styleSelect.value = prefs.defaultStyle;
            }
        }
    }
    
    updateCharacterCount(text) {
        // 更新字符計數
        const count = text.length;
        const countElement = document.getElementById('character-count');
        if (countElement) {
            countElement.textContent = `${count} 字符`;
        }
    }
    
    triggerAutoSuggestions(text) {
        // 觸發自動建議
        if (text.length > 3) {
            // 延遲觸發以避免過於頻繁的請求
            clearTimeout(this.suggestionTimeout);
            this.suggestionTimeout = setTimeout(() => {
                this.generateSuggestions(text);
            }, 300);
        }
    }
    
    generateSuggestions(text) {
        // 生成建議
        console.log('生成建議:', text);
    }
    
    updateStyleRecommendations(style) {
        // 更新風格推薦
        console.log('更新風格推薦:', style);
    }
    
    createMainContainer() {
        const container = document.getElementById('aiAssistantV27') || document.createElement('div');
        container.className = 'ai-assistant-v27';
        container.innerHTML = `
            <div class="ai-assistant-header">
                <h3>🤖 AI 智能助手 v2.7</h3>
                <div class="status-indicators">
                    <span class="status-indicator" id="ai-config-status">
                        <i class="fas fa-circle"></i> 未配置
                    </span>
                    <span class="status-indicator" id="ai-performance-indicator">
                        <i class="fas fa-tachometer-alt"></i> 性能分析
                    </span>
                </div>
            </div>
            
            <div class="ai-assistant-tabs">
                <button class="tab-button active" data-tab="enhance">提示詞優化</button>
                <button class="tab-button" data-tab="batch">批量處理</button>
                <button class="tab-button" data-tab="translate">翻譯</button>
                <button class="tab-button" data-tab="style">風格推薦</button>
                <button class="tab-button" data-tab="analytics">性能分析</button>
                <button class="tab-button" data-tab="history">歷史記錄</button>
            </div>
            
            <div class="ai-assistant-content">
                ${this.createEnhanceTab()}
                ${this.createBatchTab()}
                ${this.createTranslateTab()}
                ${this.createStyleTab()}
                ${this.createAnalyticsTab()}
                ${this.createHistoryTab()}
            </div>
        `;
        
        // 插入到適當位置（如果不是現有容器）
        if (!document.getElementById('aiAssistantV27')) {
            const targetElement = document.querySelector('.ai-assistant-container') || 
                                document.querySelector('.main-content') ||
                                document.body;
            targetElement.appendChild(container);
        }
    }
    
    createEnhanceTab() {
        return `
            <div class="tab-content active" id="enhance-tab">
                <div class="enhance-section">
                    <div class="input-group">
                        <label for="prompt-input">原始提示詞</label>
                        <textarea id="prompt-input" placeholder="輸入您的提示詞..." rows="4"></textarea>
                    </div>
                    
                    <div class="options-grid">
                        <div class="option-group">
                            <label for="style-select">風格</label>
                            <select id="style-select">
                                <option value="">自動檢測</option>
                                <option value="realistic">寫實風格</option>
                                <option value="anime">動漫風格</option>
                                <option value="digital-art">數位藝術</option>
                                <option value="oil-painting">油畫風格</option>
                                <option value="watercolor">水彩風格</option>
                                <option value="concept-art">概念藝術</option>
                            </select>
                        </div>
                        
                        <div class="option-group">
                            <label for="complexity-select">優化複雜度</label>
                            <select id="complexity-select">
                                ${Object.entries(this.complexityOptions).map(([key, value]) => 
                                    `<option value="${key}">${value}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="option-group">
                            <label for="target-language-select">目標語言</label>
                            <select id="target-language-select">
                                ${Object.entries(this.languageOptions).map(([key, value]) => 
                                    `<option value="${key}">${value}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="action-buttons">
                        <button id="enhance-button" class="primary-button">
                            <i class="fas fa-magic"></i> 優化提示詞
                        </button>
                        <button id="contextual-enhance-button" class="secondary-button">
                            <i class="fas fa-brain"></i> 上下文優化
                        </button>
                        <button id="quick-translate-button" class="secondary-button">
                            <i class="fas fa-language"></i> 快速翻譯
                        </button>
                    </div>
                    
                    <div class="enhancement-results" id="enhancement-results" style="display: none;">
                        <div class="result-header">
                            <h4>優化結果</h4>
                            <div class="result-actions">
                                <button id="copy-result-button" class="action-button">
                                    <i class="fas fa-copy"></i> 複製
                                </button>
                                <button id="save-result-button" class="action-button">
                                    <i class="fas fa-save"></i> 保存
                                </button>
                            </div>
                        </div>
                        
                        <div class="result-content">
                            <div class="optimized-prompt">
                                <label>優化後的提示詞</label>
                                <div id="optimized-prompt-text" class="result-text"></div>
                            </div>
                            
                            <div class="improvements-list">
                                <label>改進點</label>
                                <ul id="improvements-list"></ul>
                            </div>
                            
                            <div class="alternative-versions" id="alternative-versions" style="display: none;">
                                <label>替代版本</label>
                                <div id="alternative-versions-list"></div>
                            </div>
                            
                            <div class="technical-params" id="technical-params" style="display: none;">
                                <label>技術參數建議</label>
                                <div id="technical-params-content"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    createBatchTab() {
        return `
            <div class="tab-content" id="batch-tab">
                <div class="batch-section">
                    <div class="batch-header">
                        <h4>批量提示詞處理</h4>
                        <div class="batch-controls">
                            <button id="import-prompts-button" class="secondary-button">
                                <i class="fas fa-file-import"></i> 導入提示詞
                            </button>
                            <button id="add-prompt-button" class="secondary-button">
                                <i class="fas fa-plus"></i> 添加提示詞
                            </button>
                        </div>
                    </div>
                    
                    <div class="batch-prompts-container">
                        <div class="prompts-list" id="batch-prompts-list">
                            <div class="empty-state">
                                <i class="fas fa-list-ul"></i>
                                <p>尚未添加任何提示詞</p>
                                <p>點擊「添加提示詞」開始</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="batch-settings">
                        <div class="settings-grid">
                            <div class="setting-group">
                                <label for="batch-concurrent-limit">並發限制</label>
                                <input type="number" id="batch-concurrent-limit" value="3" min="1" max="10">
                            </div>
                            
                            <div class="setting-group">
                                <label for="batch-auto-retry">自動重試失敗任務</label>
                                <input type="checkbox" id="batch-auto-retry" checked>
                            </div>
                            
                            <div class="setting-group">
                                <label for="batch-pause-on-error">遇錯誤時暫停</label>
                                <input type="checkbox" id="batch-pause-on-error">
                            </div>
                        </div>
                    </div>
                    
                    <div class="batch-actions">
                        <button id="start-batch-button" class="primary-button" disabled>
                            <i class="fas fa-play"></i> 開始批量處理
                        </button>
                        <button id="pause-batch-button" class="secondary-button" disabled>
                            <i class="fas fa-pause"></i> 暫停
                        </button>
                        <button id="resume-batch-button" class="secondary-button" disabled>
                            <i class="fas fa-play"></i> 恢復
                        </button>
                        <button id="cancel-batch-button" class="danger-button" disabled>
                            <i class="fas fa-stop"></i> 取消
                        </button>
                    </div>
                    
                    <div class="batch-progress" id="batch-progress" style="display: none;">
                        <div class="progress-header">
                            <h5>處理進度</h5>
                            <span id="batch-progress-text">0%</span>
                        </div>
                        <div class="progress-bar">
                            <div id="batch-progress-fill" class="progress-fill"></div>
                        </div>
                        <div class="batch-stats" id="batch-stats"></div>
                    </div>
                    
                    <div class="batch-results" id="batch-results" style="display: none;">
                        <div class="results-header">
                            <h5>處理結果</h5>
                            <div class="results-actions">
                                <button id="export-batch-results" class="action-button">
                                    <i class="fas fa-download"></i> 導出結果
                                </button>
                            </div>
                        </div>
                        <div id="batch-results-content"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    createTranslateTab() {
        return `
            <div class="tab-content" id="translate-tab">
                <div class="translate-section">
                    <div class="input-group">
                        <label for="translate-input">原始提示詞</label>
                        <textarea id="translate-input" placeholder="輸入需要翻譯的提示詞..." rows="4"></textarea>
                    </div>
                    
                    <div class="translate-options">
                        <div class="option-group">
                            <label for="target-lang-select">目標語言</label>
                            <select id="target-lang-select">
                                ${Object.entries(this.languageOptions).map(([key, value]) => 
                                    `<option value="${key}">${value}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="option-group">
                            <label>
                                <input type="checkbox" id="preserve-terms-checkbox" checked>
                                保留技術術語
                            </label>
                        </div>
                    </div>
                    
                    <div class="action-buttons">
                        <button id="translate-button" class="primary-button">
                            <i class="fas fa-language"></i> 翻譯
                        </button>
                        <button id="detect-language-button" class="secondary-button">
                            <i class="fas fa-search"></i> 檢測語言
                        </button>
                    </div>
                    
                    <div class="translation-results" id="translation-results" style="display: none;">
                        <div class="result-header">
                            <h4>翻譯結果</h4>
                            <div class="quality-score" id="translation-quality">
                                <span>品質評分: </span>
                                <span id="quality-score">-</span>/10
                            </div>
                        </div>
                        
                        <div class="result-content">
                            <div class="translated-text">
                                <label>翻譯結果</label>
                                <div id="translated-text-content" class="result-text"></div>
                            </div>
                            
                            <div class="preserved-terms" id="preserved-terms" style="display: none;">
                                <label>保留的術語</label>
                                <div id="preserved-terms-list"></div>
                            </div>
                            
                            <div class="alternative-translations" id="alternative-translations" style="display: none;">
                                <label>替代翻譯</label>
                                <div id="alternative-translations-list"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    createStyleTab() {
        return `
            <div class="tab-content" id="style-tab">
                <div class="style-section">
                    <div class="input-group">
                        <label for="style-input">描述您想要的視覺效果</label>
                        <textarea id="style-input" placeholder="描述您的創意想法..." rows="3"></textarea>
                    </div>
                    
                    <div class="style-options">
                        <div class="option-group">
                            <label for="mood-select">情緒氛圍</label>
                            <select id="mood-select">
                                <option value="">自動推薦</option>
                                <option value="calm">平靜</option>
                                <option value="energetic">活力</option>
                                <option value="mysterious">神秘</option>
                                <option value="dramatic">戲劇性</option>
                                <option value="peaceful">寧靜</option>
                                <option value="intense">強烈</option>
                            </select>
                        </div>
                        
                        <div class="option-group">
                            <label for="genre-select">藝術類型</label>
                            <select id="genre-select">
                                <option value="">自動推薦</option>
                                <option value="portrait">人像</option>
                                <option value="landscape">風景</option>
                                <option value="abstract">抽象</option>
                                <option value="fantasy">奇幻</option>
                                <option value="sci-fi">科幻</option>
                                <option value="historical">歷史</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="action-buttons">
                        <button id="get-style-recommendations" class="primary-button">
                            <i class="fas fa-palette"></i> 獲取風格推薦
                        </button>
                    </div>
                    
                    <div class="style-recommendations" id="style-recommendations" style="display: none;">
                        <div class="recommendations-content" id="recommendations-content"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    createAnalyticsTab() {
        return `
            <div class="tab-content" id="analytics-tab">
                <div class="analytics-section">
                    <div class="analytics-header">
                        <h4>性能分析</h4>
                        <button id="refresh-analytics" class="secondary-button">
                            <i class="fas fa-sync-alt"></i> 刷新
                        </button>
                    </div>
                    
                    <div class="analytics-grid">
                        <div class="metric-card">
                            <div class="metric-header">
                                <h5>處理統計</h5>
                                <i class="fas fa-chart-line"></i>
                            </div>
                            <div class="metric-content" id="processing-stats">
                                <div class="metric-item">
                                    <span class="metric-label">總請求數</span>
                                    <span class="metric-value" id="total-requests">-</span>
                                </div>
                                <div class="metric-item">
                                    <span class="metric-label">平均處理時間</span>
                                    <span class="metric-value" id="avg-processing-time">-</span>
                                </div>
                                <div class="metric-item">
                                    <span class="metric-label">緩存命中率</span>
                                    <span class="metric-value" id="cache-hit-rate">-</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="metric-card">
                            <div class="metric-header">
                                <h5>批量處理</h5>
                                <i class="fas fa-tasks"></i>
                            </div>
                            <div class="metric-content" id="batch-stats-content">
                                <div class="metric-item">
                                    <span class="metric-label">活動任務</span>
                                    <span class="metric-value" id="active-tasks">-</span>
                                </div>
                                <div class="metric-item">
                                    <span class="metric-label">已完成任務</span>
                                    <span class="metric-value" id="completed-tasks">-</span>
                                </div>
                                <div class="metric-item">
                                    <span class="metric-label">成功率</span>
                                    <span class="metric-value" id="success-rate">-</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="metric-card">
                            <div class="metric-header">
                                <h5>系統狀態</h5>
                                <i class="fas fa-server"></i>
                            </div>
                            <div class="metric-content" id="system-status">
                                <div class="metric-item">
                                    <span class="metric-label">運行狀態</span>
                                    <span class="metric-value status-indicator" id="system-running-status">-</span>
                                </div>
                                <div class="metric-item">
                                    <span class="metric-label">工作線程</span>
                                    <span class="metric-value" id="worker-threads">-</span>
                                </div>
                                <div class="metric-item">
                                    <span class="metric-label">記憶體使用</span>
                                    <span class="metric-value" id="memory-usage">-</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="recommendations-section">
                        <h5>優化建議</h5>
                        <div id="performance-recommendations" class="recommendations-list"></div>
                    </div>
                    
                    <div class="analytics-actions">
                        <button id="clear-cache-button" class="secondary-button">
                            <i class="fas fa-trash"></i> 清除緩存
                        </button>
                        <button id="export-analytics-button" class="secondary-button">
                            <i class="fas fa-download"></i> 導出數據
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    createHistoryTab() {
        return `
            <div class="tab-content" id="history-tab">
                <div class="history-section">
                    <div class="history-header">
                        <h4>優化歷史記錄</h4>
                        <div class="history-controls">
                            <select id="history-filter">
                                <option value="all">全部</option>
                                <option value="today">今天</option>
                                <option value="week">本週</option>
                                <option value="month">本月</option>
                            </select>
                            <button id="clear-history-button" class="danger-button">
                                <i class="fas fa-trash"></i> 清除歷史
                            </button>
                        </div>
                    </div>
                    
                    <div class="history-stats" id="history-stats">
                        <div class="stat-item">
                            <span class="stat-label">總優化次數</span>
                            <span class="stat-value" id="total-optimizations">-</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">最常用風格</span>
                            <span class="stat-value" id="popular-style">-</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">平均每日使用</span>
                            <span class="stat-value" id="daily-average">-</span>
                        </div>
                    </div>
                    
                    <div class="history-list" id="history-list">
                        <div class="loading-state">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>載入歷史記錄中...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        // 標籤切換
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-button')) {
                this.switchTab(e.target.dataset.tab);
            }
        });
        
        // 提示詞優化
        document.getElementById('enhance-button')?.addEventListener('click', () => {
            this.enhancePrompt();
        });
        
        document.getElementById('contextual-enhance-button')?.addEventListener('click', () => {
            this.contextualOptimize();
        });
        
        document.getElementById('quick-translate-button')?.addEventListener('click', () => {
            this.quickTranslate();
        });
        
        // 批量處理
        document.getElementById('add-prompt-button')?.addEventListener('click', () => {
            this.addBatchPrompt();
        });
        
        document.getElementById('start-batch-button')?.addEventListener('click', () => {
            this.startBatchProcessing();
        });
        
        document.getElementById('pause-batch-button')?.addEventListener('click', () => {
            this.pauseBatchJob();
        });
        
        document.getElementById('resume-batch-button')?.addEventListener('click', () => {
            this.resumeBatchJob();
        });
        
        document.getElementById('cancel-batch-button')?.addEventListener('click', () => {
            this.cancelBatchJob();
        });
        
        // 翻譯
        document.getElementById('translate-button')?.addEventListener('click', () => {
            this.translatePrompt();
        });
        
        // 風格推薦
        document.getElementById('get-style-recommendations')?.addEventListener('click', () => {
            this.getStyleRecommendations();
        });
        
        // 性能分析
        document.getElementById('refresh-analytics')?.addEventListener('click', () => {
            this.loadPerformanceAnalytics();
        });
        
        document.getElementById('clear-cache-button')?.addEventListener('click', () => {
            this.clearCache();
        });
        
        document.getElementById('export-analytics-button')?.addEventListener('click', () => {
            this.exportAnalyticsData();
        });
    }
    
    switchTab(tabName) {
        // 移除所有活動狀態
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // 激活選中的標籤
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // 載入對應數據
        this.loadTabData(tabName);
    }
    
    async loadTabData(tabName) {
        switch (tabName) {
            case 'analytics':
                await this.loadPerformanceAnalytics();
                break;
            case 'history':
                await this.loadOptimizationHistory();
                break;
            case 'batch':
                await this.loadBatchJobStatus();
                break;
        }
    }
    
    async enhancePrompt() {
        const promptInput = document.getElementById('prompt-input');
        const styleSelect = document.getElementById('style-select');
        const complexitySelect = document.getElementById('complexity-select');
        const languageSelect = document.getElementById('target-language-select');
        const enhanceButton = document.getElementById('enhance-button');
        
        const prompt = promptInput.value.trim();
        if (!prompt) {
            this.showNotification('請輸入提示詞', 'warning');
            return;
        }
        
        enhanceButton.disabled = true;
        enhanceButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 優化中...';
        
        try {
            const response = await this.makeRequest('/enhance-prompt', {
                method: 'POST',
                body: JSON.stringify({
                    prompt: prompt,
                    style: styleSelect.value || null,
                    complexity: complexitySelect.value,
                    target_language: languageSelect.value
                })
            });
            
            if (response.success) {
                this.displayEnhancementResult(response);
                this.showNotification('提示詞優化成功', 'success');
            } else {
                throw new Error(response.error || '優化失敗');
            }
            
        } catch (error) {
            console.error('提示詞優化失敗:', error);
            this.showNotification(`優化失敗: ${error.message}`, 'error');
        } finally {
            enhanceButton.disabled = false;
            enhanceButton.innerHTML = '<i class="fas fa-magic"></i> 優化提示詞';
        }
    }
    
    displayEnhancementResult(response) {
        const resultsContainer = document.getElementById('enhancement-results');
        const result = response.result;
        
        // 顯示優化後的提示詞
        document.getElementById('optimized-prompt-text').textContent = result.optimized_prompt;
        
        // 顯示改進點
        const improvementsList = document.getElementById('improvements-list');
        improvementsList.innerHTML = result.improvements.map(improvement => 
            `<li>${improvement}</li>`
        ).join('');
        
        // 顯示替代版本（如果有）
        if (result.alternative_versions && result.alternative_versions.length > 0) {
            const alternativeVersions = document.getElementById('alternative-versions');
            const alternativeVersionsList = document.getElementById('alternative-versions-list');
            
            alternativeVersionsList.innerHTML = result.alternative_versions.map((version, index) => 
                `<div class="alternative-version">
                    <label>版本 ${index + 1}</label>
                    <div class="alternative-text">${version}</div>
                </div>`
            ).join('');
            
            alternativeVersions.style.display = 'block';
        }
        
        // 顯示技術參數（如果有）
        if (result.technical_params) {
            const technicalParams = document.getElementById('technical-params');
            const technicalParamsContent = document.getElementById('technical-params-content');
            
            technicalParamsContent.innerHTML = `
                <div class="param-grid">
                    <div class="param-item">
                        <label>推薦步數</label>
                        <span>${result.technical_params.recommended_steps}</span>
                    </div>
                    <div class="param-item">
                        <label>CFG Scale</label>
                        <span>${result.technical_params.cfg_scale}</span>
                    </div>
                    <div class="param-item">
                        <label>採樣器</label>
                        <span>${result.technical_params.sampler || 'DPM++ 2M Karras'}</span>
                    </div>
                    <div class="param-item">
                        <label>解析度</label>
                        <span>${result.technical_params.resolution || '1024x1024'}</span>
                    </div>
                </div>
                <div class="quality-tips">
                    <label>品質建議</label>
                    <p>${result.technical_params.quality_tips}</p>
                </div>
            `;
            
            technicalParams.style.display = 'block';
        }
        
        resultsContainer.style.display = 'block';
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }
    
    async loadOptimizationHistory() {
        try {
            const response = await this.makeRequest('/optimization-history');
            
            if (response.success) {
                this.optimizationHistory = response.recent_history;
                this.displayOptimizationHistory(response);
            }
            
        } catch (error) {
            console.error('載入優化歷史失敗:', error);
        }
    }
    
    displayOptimizationHistory(data) {
        const historyList = document.getElementById('history-list');
        const historyStats = document.getElementById('history-stats');
        
        // 更新統計
        document.getElementById('total-optimizations').textContent = data.total_optimizations;
        document.getElementById('popular-style').textContent = 
            data.statistics.popular_styles[0]?.[0] || '無';
        document.getElementById('daily-average').textContent = 
            Math.round(data.statistics.average_daily_optimizations * 10) / 10;
        
        // 顯示歷史記錄
        if (data.recent_history.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>尚無優化歷史記錄</p>
                </div>
            `;
        } else {
            historyList.innerHTML = data.recent_history.map(record => `
                <div class="history-item">
                    <div class="history-header">
                        <span class="history-date">${new Date(record.timestamp).toLocaleString()}</span>
                        <span class="history-style">${record.style || '無風格'}</span>
                        <span class="history-complexity">${this.complexityOptions[record.complexity] || record.complexity}</span>
                    </div>
                    <div class="history-content">
                        <div class="original-prompt">
                            <label>原始：</label>
                            <span>${record.original}</span>
                        </div>
                        <div class="optimized-prompt">
                            <label>優化：</label>
                            <span>${record.optimized}</span>
                        </div>
                    </div>
                    <div class="history-actions">
                        <button class="action-button" onclick="window.aiAssistantV27.reUsePrompt('${record.optimized}')">
                            <i class="fas fa-redo"></i> 重用
                        </button>
                        <button class="action-button" onclick="window.aiAssistantV27.copyToClipboard('${record.optimized}')">
                            <i class="fas fa-copy"></i> 複製
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }
    
    async loadPerformanceAnalytics() {
        try {
            const response = await this.makeRequest('/performance-analytics');
            
            if (response.success) {
                this.displayPerformanceAnalytics(response.performance_metrics);
                this.displayRecommendations(response.recommendations);
            }
            
        } catch (error) {
            console.error('載入性能分析失敗:', error);
        }
    }
    
    async loadBatchJobStatus() {
        try {
            // 載入批量作業狀態
            const response = await this.makeRequest('/batch/jobs');
            
            if (response.success) {
                this.displayBatchJobs(response.jobs || []);
            } else {
                // 如果沒有作業，顯示空狀態
                this.displayEmptyBatchState();
            }
            
        } catch (error) {
            console.error('載入批量作業狀態失敗:', error);
            this.displayEmptyBatchState();
        }
    }
    
    displayBatchJobs(jobs) {
        const batchResultsContainer = document.getElementById('batch-results');
        const batchStatsContainer = document.getElementById('batch-stats');
        
        if (!batchResultsContainer || !batchStatsContainer) {
            console.warn('批量作業顯示容器不存在');
            return;
        }
        
        if (jobs.length === 0) {
            this.displayEmptyBatchState();
            return;
        }
        
        // 統計信息
        const activeJobs = jobs.filter(job => job.status === 'processing').length;
        const completedJobs = jobs.filter(job => job.status === 'completed').length;
        const failedJobs = jobs.filter(job => job.status === 'failed').length;
        
        batchStatsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-value">${activeJobs}</span>
                    <span class="stat-label">進行中</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${completedJobs}</span>
                    <span class="stat-label">已完成</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${failedJobs}</span>
                    <span class="stat-label">失敗</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${jobs.length}</span>
                    <span class="stat-label">總計</span>
                </div>
            </div>
        `;
        
        // 作業列表
        const jobsList = jobs.map(job => `
            <div class="batch-job-item" data-job-id="${job.id}">
                <div class="job-header">
                    <h5>${job.name}</h5>
                    <span class="job-status status-${job.status}">${this.getStatusText(job.status)}</span>
                </div>
                <div class="job-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${job.progress || 0}%"></div>
                    </div>
                    <span class="progress-text">${Math.round(job.progress || 0)}%</span>
                </div>
                <div class="job-details">
                    <span>任務數: ${job.total_tasks || 0}</span>
                    <span>創建時間: ${new Date(job.created_at).toLocaleString()}</span>
                </div>
                <div class="job-actions">
                    ${this.getJobActionButtons(job)}
                </div>
            </div>
        `).join('');
        
        batchResultsContainer.innerHTML = jobsList;
        batchResultsContainer.style.display = 'block';
    }
    
    displayEmptyBatchState() {
        const batchResultsContainer = document.getElementById('batch-results');
        const batchStatsContainer = document.getElementById('batch-stats');
        
        if (batchStatsContainer) {
            batchStatsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <p>尚無批量作業</p>
                </div>
            `;
        }
        
        if (batchResultsContainer) {
            batchResultsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-plus-circle"></i>
                    <p>點擊「開始批量處理」創建第一個作業</p>
                </div>
            `;
            batchResultsContainer.style.display = 'block';
        }
    }
    
    getStatusText(status) {
        const statusMap = {
            'pending': '等待中',
            'processing': '處理中',
            'completed': '已完成',
            'failed': '失敗',
            'paused': '已暫停',
            'cancelled': '已取消'
        };
        return statusMap[status] || status;
    }
    
    getJobActionButtons(job) {
        switch (job.status) {
            case 'processing':
                return `
                    <button class="action-btn pause-job" data-job-id="${job.id}">
                        <i class="fas fa-pause"></i> 暫停
                    </button>
                    <button class="action-btn cancel-job" data-job-id="${job.id}">
                        <i class="fas fa-stop"></i> 取消
                    </button>
                `;
            case 'paused':
                return `
                    <button class="action-btn resume-job" data-job-id="${job.id}">
                        <i class="fas fa-play"></i> 恢復
                    </button>
                    <button class="action-btn cancel-job" data-job-id="${job.id}">
                        <i class="fas fa-stop"></i> 取消
                    </button>
                `;
            case 'completed':
                return `
                    <button class="action-btn view-results" data-job-id="${job.id}">
                        <i class="fas fa-eye"></i> 查看結果
                    </button>
                    <button class="action-btn download-results" data-job-id="${job.id}">
                        <i class="fas fa-download"></i> 下載
                    </button>
                `;
            case 'failed':
                return `
                    <button class="action-btn retry-job" data-job-id="${job.id}">
                        <i class="fas fa-redo"></i> 重試
                    </button>
                    <button class="action-btn view-logs" data-job-id="${job.id}">
                        <i class="fas fa-file-alt"></i> 查看日誌
                    </button>
                `;
            default:
                return '';
        }
    }
    
    async updateBatchJobStatus() {
        if (this.currentBatchJob) {
            try {
                const response = await this.makeRequest(`/batch/job-status/${this.currentBatchJob.id}`);
                if (response.success) {
                    this.currentBatchJob = response;
                    this.updateBatchProgressDisplay(response);
                }
            } catch (error) {
                console.error('更新批量作業狀態失敗:', error);
            }
        }
    }
    
    updateBatchProgressDisplay(jobStatus) {
        const progressContainer = document.getElementById('batch-progress');
        const progressFill = document.getElementById('batch-progress-fill');
        const progressText = document.getElementById('batch-progress-text');
        
        if (progressContainer && progressFill && progressText) {
            progressContainer.style.display = 'block';
            progressFill.style.width = `${jobStatus.progress || 0}%`;
            progressText.textContent = `${Math.round(jobStatus.progress || 0)}%`;
        }
    }
    
    displayPerformanceAnalytics(metrics) {
        // 處理統計
        document.getElementById('total-requests').textContent = metrics.total_requests;
        document.getElementById('avg-processing-time').textContent = `${metrics.average_processing_time}s`;
        document.getElementById('cache-hit-rate').textContent = `${metrics.cache_hit_rate}%`;
        
        // 批量處理統計
        document.getElementById('active-tasks').textContent = metrics.active_batch_tasks;
        document.getElementById('completed-tasks').textContent = metrics.completed_batch_tasks;
        document.getElementById('success-rate').textContent = 
            `${Math.round((metrics.completed_batch_tasks / Math.max(1, metrics.total_requests)) * 100)}%`;
        
        // 系統狀態
        const systemStatus = document.getElementById('system-running-status');
        systemStatus.textContent = '運行中';
        systemStatus.className = 'metric-value status-indicator status-running';
        
        document.getElementById('worker-threads').textContent = '5';
        document.getElementById('memory-usage').textContent = `${metrics.cache_size} 項緩存`;
    }
    
    displayRecommendations(recommendations) {
        const recommendationsContainer = document.getElementById('performance-recommendations');
        
        if (!recommendations || recommendations.length === 0) {
            recommendationsContainer.innerHTML = '<p class="no-recommendations">系統運行良好，無需優化</p>';
            return;
        }
        
        recommendationsContainer.innerHTML = recommendations.map(rec => `
            <div class="recommendation-item">
                <i class="fas fa-lightbulb"></i>
                <span>${rec}</span>
            </div>
        `).join('');
    }
    
    async checkStatus() {
        try {
            const response = await this.makeRequest('/status');
            
            if (response.success) {
                this.isConfigured = response.ai_assistant.configured;
                this.updateStatusIndicators(response);
            }
            
        } catch (error) {
            console.error('檢查狀態失敗:', error);
        }
    }
    
    updateStatusIndicators(status) {
        const configStatus = document.getElementById('ai-config-status');
        
        if (this.isConfigured) {
            configStatus.innerHTML = '<i class="fas fa-circle status-ok"></i> 已配置';
            configStatus.className = 'status-indicator status-ok';
        } else {
            configStatus.innerHTML = '<i class="fas fa-circle status-error"></i> 未配置';
            configStatus.className = 'status-indicator status-error';
        }
    }
    
    async makeRequest(endpoint, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
            }
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        const response = await fetch(`${this.apiEndpoint}${endpoint}`, finalOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    }
    
    showNotification(message, type = 'info') {
        // 創建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // 添加到頁面
        const container = document.querySelector('.notifications-container') || this.createNotificationsContainer();
        container.appendChild(notification);
        
        // 自動移除
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
    
    createNotificationsContainer() {
        const container = document.createElement('div');
        container.className = 'notifications-container';
        document.body.appendChild(container);
        return container;
    }
    
    startPeriodicUpdates() {
        // 每30秒更新一次狀態
        setInterval(() => {
            this.checkStatus();
            
            // 如果有活動的批量作業，更新進度
            if (this.currentBatchJob) {
                this.updateBatchJobStatus();
            }
        }, 30000);
    }
    
    // 輔助方法
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('已複製到剪貼板', 'success');
        }).catch(() => {
            this.showNotification('複製失敗', 'error');
        });
    }
    
    reUsePrompt(prompt) {
        document.getElementById('prompt-input').value = prompt;
        this.switchTab('enhance');
        this.showNotification('提示詞已載入到優化器', 'success');
    }
}

// 全局實例
window.aiAssistantV27 = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    window.aiAssistantV27 = new AIAssistantV27();
    
    // 監聽用戶登入狀態變化
    document.addEventListener('userLoggedIn', () => {
        if (window.aiAssistantV27) {
            window.aiAssistantV27.checkStatus();
        }
    });
    
    document.addEventListener('userLoggedOut', () => {
        if (window.aiAssistantV27) {
            window.aiAssistantV27.updateStatusIndicators({
                api_configured: false,
                user_logged_in: false
            });
        }
    });
}); 