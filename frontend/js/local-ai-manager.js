/**
 * Local AI 管理器 v2.8
 * 提供本地 AI 服務的前端管理界面
 */

class LocalAIManager {
    constructor() {
        this.apiEndpoint = '/api/local-ai';
        this.currentModels = [];
        this.serviceStatus = null;
        this.downloadProgress = new Map();
        this.generationInProgress = false;
        
        // 支援的模型列表
        this.supportedModels = {
            'llama2': {
                name: 'Llama 2',
                description: '通用對話模型',
                size: '3.8GB',
                category: 'general'
            },
            'codellama': {
                name: 'Code Llama',
                description: '代碼生成專用模型',
                size: '3.8GB',
                category: 'coding'
            },
            'llava': {
                name: 'LLaVA',
                description: '視覺語言模型，支援圖片分析',
                size: '4.5GB',
                category: 'vision'
            },
            'mistral': {
                name: 'Mistral',
                description: '高效能對話模型',
                size: '4.1GB',
                category: 'general'
            },
            'neural-chat': {
                name: 'Neural Chat',
                description: '專業對話模型',
                size: '3.8GB',
                category: 'chat'
            }
        };
        
        this.init();
        
        console.log('🤖 Local AI 管理器 v2.8 已初始化');
    }
    
    async init() {
        try {
            // 創建 UI
            this.createUI();
            
            // 設置事件監聽器
            this.setupEventListeners();
            
            // 檢查服務狀態
            await this.checkServiceStatus();
            
            // 載入已安裝的模型
            await this.loadAvailableModels();
            
            // 啟動定期狀態更新
            this.startStatusUpdates();
            
        } catch (error) {
            console.error('Local AI 管理器初始化失敗:', error);
            this.showNotification('Local AI 管理器初始化失敗', 'error');
        }
    }
    
    createUI() {
        const container = document.createElement('div');
        container.className = 'local-ai-manager';
        container.id = 'localAIManager';
        container.innerHTML = `
            <div class="local-ai-header">
                <h3>🤖 Local AI 管理中心</h3>
                <div class="status-indicators">
                    <span class="status-indicator" id="localAiStatus">
                        <i class="fas fa-circle"></i> 檢查中...
                    </span>
                    <button id="initializeLocalAI" class="btn-primary" style="display: none;">
                        <i class="fas fa-play"></i> 初始化服務
                    </button>
                </div>
            </div>
            
            <div class="local-ai-tabs">
                <button class="tab-button active" data-tab="models">模型管理</button>
                <button class="tab-button" data-tab="generate">文本生成</button>
                <button class="tab-button" data-tab="enhance">提示詞增強</button>
                <button class="tab-button" data-tab="analyze">圖片分析</button>
                <button class="tab-button" data-tab="system">系統資訊</button>
            </div>
            
            <div class="local-ai-content">
                ${this.createModelsTab()}
                ${this.createGenerateTab()}
                ${this.createEnhanceTab()}
                ${this.createAnalyzeTab()}
                ${this.createSystemTab()}
            </div>
        `;
        
        // 插入到適當位置
        const targetElement = document.querySelector('.ai-assistant-v27') || 
                            document.querySelector('.main-content') ||
                            document.body;
        targetElement.parentNode.insertBefore(container, targetElement.nextSibling);
    }
    
    createModelsTab() {
        return `
            <div class="tab-content active" id="models-tab">
                <div class="models-section">
                    <div class="section-header">
                        <h4>可用模型</h4>
                        <button id="refreshModels" class="btn-secondary">
                            <i class="fas fa-sync-alt"></i> 重新整理
                        </button>
                    </div>
                    
                    <div class="models-grid" id="modelsGrid">
                        <div class="loading-state">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>載入模型列表中...</p>
                        </div>
                    </div>
                    
                    <div class="download-section">
                        <h4>下載新模型</h4>
                        <div class="model-categories">
                            ${Object.entries(this.supportedModels).map(([key, model]) => `
                                <div class="model-card" data-model="${key}">
                                    <div class="model-info">
                                        <h5>${model.name}</h5>
                                        <p>${model.description}</p>
                                        <span class="model-size">大小: ${model.size}</span>
                                        <span class="model-category">${model.category}</span>
                                    </div>
                                    <div class="model-actions">
                                        <button class="download-model-btn" data-model="${key}">
                                            <i class="fas fa-download"></i> 下載
                                        </button>
                                    </div>
                                    <div class="download-progress" id="progress-${key}" style="display: none;">
                                        <div class="progress-bar">
                                            <div class="progress-fill"></div>
                                        </div>
                                        <span class="progress-text">0%</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    createGenerateTab() {
        return `
            <div class="tab-content" id="generate-tab">
                <div class="generate-section">
                    <div class="model-selection">
                        <label for="selectedModel">選擇模型</label>
                        <select id="selectedModel">
                            <option value="">請先安裝模型...</option>
                        </select>
                    </div>
                    
                    <div class="generation-settings">
                        <div class="setting-group">
                            <label for="systemPrompt">系統提示詞 (可選)</label>
                            <textarea id="systemPrompt" rows="2" placeholder="設定 AI 的角色和行為..."></textarea>
                        </div>
                        
                        <div class="setting-group">
                            <label for="userPrompt">用戶輸入</label>
                            <textarea id="userPrompt" rows="4" placeholder="輸入您的問題或請求..."></textarea>
                        </div>
                        
                        <div class="advanced-settings">
                            <details>
                                <summary>進階設定</summary>
                                <div class="settings-grid">
                                    <div class="setting-item">
                                        <label for="temperature">創意度 (Temperature)</label>
                                        <input type="range" id="temperature" min="0" max="2" step="0.1" value="0.7">
                                        <span class="value-display">0.7</span>
                                    </div>
                                    <div class="setting-item">
                                        <label for="maxTokens">最大生成長度</label>
                                        <input type="number" id="maxTokens" min="50" max="4000" value="1000">
                                    </div>
                                    <div class="setting-item">
                                        <label>
                                            <input type="checkbox" id="streamResponse" checked>
                                            即時串流回應
                                        </label>
                                    </div>
                                </div>
                            </details>
                        </div>
                    </div>
                    
                    <div class="generation-controls">
                        <button id="generateText" class="btn-primary" disabled>
                            <i class="fas fa-magic"></i> 生成文本
                        </button>
                        <button id="clearGeneration" class="btn-secondary">
                            <i class="fas fa-trash"></i> 清除
                        </button>
                    </div>
                    
                    <div class="generation-output" id="generationOutput" style="display: none;">
                        <div class="output-header">
                            <h4>生成結果</h4>
                            <div class="output-actions">
                                <button id="copyOutput" class="action-btn">
                                    <i class="fas fa-copy"></i> 複製
                                </button>
                                <button id="saveOutput" class="action-btn">
                                    <i class="fas fa-save"></i> 保存
                                </button>
                            </div>
                        </div>
                        <div class="output-content" id="outputContent">
                            <div class="streaming-indicator">
                                <i class="fas fa-circle pulse"></i> 生成中...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    createEnhanceTab() {
        return `
            <div class="tab-content" id="enhance-tab">
                <div class="enhance-section">
                    <div class="enhance-input">
                        <label for="originalPrompt">原始提示詞</label>
                        <textarea id="originalPrompt" rows="4" placeholder="輸入您要增強的提示詞..."></textarea>
                    </div>
                    
                    <div class="enhance-options">
                        <div class="option-group">
                            <label for="enhanceStyle">增強風格</label>
                            <select id="enhanceStyle">
                                <option value="detailed">詳細描述</option>
                                <option value="creative">創意擴展</option>
                                <option value="technical">技術專業</option>
                                <option value="artistic">藝術風格</option>
                                <option value="simple">簡潔明瞭</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="enhance-controls">
                        <button id="enhancePromptLocal" class="btn-primary">
                            <i class="fas fa-wand-magic-sparkles"></i> 本地增強
                        </button>
                    </div>
                    
                    <div class="enhance-results" id="enhanceResults" style="display: none;">
                        <div class="result-header">
                            <h4>增強結果</h4>
                        </div>
                        <div class="enhanced-prompt" id="enhancedPrompt"></div>
                        <div class="enhancement-suggestions" id="enhancementSuggestions"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    createAnalyzeTab() {
        return `
            <div class="tab-content" id="analyze-tab">
                <div class="analyze-section">
                    <div class="image-upload">
                        <div class="upload-area" id="imageUploadArea">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>拖放圖片或點擊上傳</p>
                            <input type="file" id="imageUpload" accept="image/*" style="display: none;">
                        </div>
                        <div class="uploaded-image" id="uploadedImageContainer" style="display: none;">
                            <img id="uploadedImage" alt="上傳的圖片">
                        </div>
                    </div>
                    
                    <div class="analysis-options">
                        <div class="option-group">
                            <label for="analysisQuestion">分析問題 (可選)</label>
                            <input type="text" id="analysisQuestion" placeholder="請描述這張圖片...">
                        </div>
                        
                        <div class="preset-questions">
                            <h5>快捷問題</h5>
                            <div class="question-buttons">
                                <button class="question-btn" data-question="請描述這張圖片的內容">描述內容</button>
                                <button class="question-btn" data-question="這張圖片的主要色彩是什麼？">分析色彩</button>
                                <button class="question-btn" data-question="圖片中有哪些物體？">識別物體</button>
                                <button class="question-btn" data-question="這張圖片的情緒氛圍如何？">情緒分析</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="analysis-controls">
                        <button id="analyzeImage" class="btn-primary" disabled>
                            <i class="fas fa-search"></i> 分析圖片
                        </button>
                    </div>
                    
                    <div class="analysis-results" id="analysisResults" style="display: none;">
                        <div class="result-header">
                            <h4>分析結果</h4>
                        </div>
                        <div class="analysis-content" id="analysisContent"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    createSystemTab() {
        return `
            <div class="tab-content" id="system-tab">
                <div class="system-section">
                    <div class="system-info" id="systemInfo">
                        <div class="loading-state">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>載入系統資訊中...</p>
                        </div>
                    </div>
                    
                    <div class="system-controls">
                        <button id="refreshSystemInfo" class="btn-secondary">
                            <i class="fas fa-sync-alt"></i> 重新整理
                        </button>
                        <button id="cleanupService" class="btn-warning">
                            <i class="fas fa-broom"></i> 清理服務
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        // 標籤切換
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-button') && e.target.closest('.local-ai-manager')) {
                this.switchTab(e.target.dataset.tab);
            }
        });
        
        // 初始化服務
        document.getElementById('initializeLocalAI')?.addEventListener('click', () => {
            this.initializeService();
        });
        
        // 模型管理
        document.getElementById('refreshModels')?.addEventListener('click', () => {
            this.loadAvailableModels();
        });
        
        // 下載模型
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('download-model-btn')) {
                const modelName = e.target.dataset.model;
                this.downloadModel(modelName);
            }
        });
        
        // 文本生成
        document.getElementById('generateText')?.addEventListener('click', () => {
            this.generateText();
        });
        
        document.getElementById('clearGeneration')?.addEventListener('click', () => {
            this.clearGeneration();
        });
        
        // 提示詞增強
        document.getElementById('enhancePromptLocal')?.addEventListener('click', () => {
            this.enhancePrompt();
        });
        
        // 圖片分析
        document.getElementById('imageUpload')?.addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files[0]);
        });
        
        document.getElementById('imageUploadArea')?.addEventListener('click', () => {
            document.getElementById('imageUpload').click();
        });
        
        document.getElementById('analyzeImage')?.addEventListener('click', () => {
            this.analyzeImage();
        });
        
        // 系統控制
        document.getElementById('refreshSystemInfo')?.addEventListener('click', () => {
            this.loadSystemInfo();
        });
        
        document.getElementById('cleanupService')?.addEventListener('click', () => {
            this.cleanupService();
        });
        
        // 設定值更新
        document.getElementById('temperature')?.addEventListener('input', (e) => {
            e.target.nextElementSibling.textContent = e.target.value;
        });
        
        // 快捷問題
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('question-btn')) {
                document.getElementById('analysisQuestion').value = e.target.dataset.question;
            }
        });
    }
    
    switchTab(tabName) {
        // 移除所有活動狀態
        document.querySelectorAll('.local-ai-manager .tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.local-ai-manager .tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // 激活選中的標籤
        document.querySelector(`.local-ai-manager [data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // 載入對應數據
        this.loadTabData(tabName);
    }
    
    async loadTabData(tabName) {
        switch (tabName) {
            case 'models':
                await this.loadAvailableModels();
                break;
            case 'system':
                await this.loadSystemInfo();
                break;
        }
    }
    
    async checkServiceStatus() {
        try {
            const response = await this.makeRequest('/status');
            this.serviceStatus = response;
            this.updateStatusDisplay();
            
        } catch (error) {
            console.error('檢查服務狀態失敗:', error);
            this.updateStatusDisplay(false);
        }
    }
    
    updateStatusDisplay(isRunning = null) {
        const statusElement = document.getElementById('localAiStatus');
        const initButton = document.getElementById('initializeLocalAI');
        
        if (isRunning === null && this.serviceStatus) {
            isRunning = this.serviceStatus.ollama_status === 'running';
        }
        
        if (isRunning) {
            statusElement.innerHTML = '<i class="fas fa-circle status-ok"></i> 服務運行中';
            statusElement.className = 'status-indicator status-ok';
            initButton.style.display = 'none';
        } else {
            statusElement.innerHTML = '<i class="fas fa-circle status-error"></i> 服務未運行';
            statusElement.className = 'status-indicator status-error';
            initButton.style.display = 'inline-flex';
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
        // 重用現有的通知系統
        if (window.aiAssistantV27?.showNotification) {
            window.aiAssistantV27.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
    
    startStatusUpdates() {
        // 每30秒檢查一次服務狀態
        setInterval(() => {
            this.checkServiceStatus();
        }, 30000);
    }
    
    async initializeService() {
        try {
            const initButton = document.getElementById('initializeLocalAI');
            initButton.disabled = true;
            initButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 初始化中...';
            
            const response = await this.makeRequest('/initialize', {
                method: 'POST'
            });
            
            if (response.success) {
                this.showNotification('Local AI 服務初始化成功', 'success');
                await this.checkServiceStatus();
            } else {
                throw new Error(response.error || '初始化失敗');
            }
            
        } catch (error) {
            console.error('初始化服務失敗:', error);
            this.showNotification(`初始化失敗: ${error.message}`, 'error');
        } finally {
            const initButton = document.getElementById('initializeLocalAI');
            initButton.disabled = false;
            initButton.innerHTML = '<i class="fas fa-play"></i> 初始化服務';
        }
    }
    
    async loadAvailableModels() {
        try {
            const modelsGrid = document.getElementById('modelsGrid');
            modelsGrid.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>載入模型列表中...</p></div>';
            
            const response = await this.makeRequest('/models');
            this.currentModels = response.models || [];
            
            this.displayAvailableModels();
            this.updateModelSelection();
            
        } catch (error) {
            console.error('載入模型列表失敗:', error);
            const modelsGrid = document.getElementById('modelsGrid');
            modelsGrid.innerHTML = '<div class="loading-state"><i class="fas fa-exclamation-triangle"></i><p>載入失敗</p></div>';
        }
    }
    
    displayAvailableModels() {
        const modelsGrid = document.getElementById('modelsGrid');
        
        if (this.currentModels.length === 0) {
            modelsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-robot"></i>
                    <p>目前沒有安裝任何模型</p>
                    <p>請從下方下載區域安裝模型</p>
                </div>
            `;
        } else {
            modelsGrid.innerHTML = this.currentModels.map(model => `
                <div class="installed-model">
                    <div class="model-info">
                        <h5>${model.name}</h5>
                        <p>大小: ${model.size}</p>
                        <p>最後修改: ${new Date(model.modified_at).toLocaleDateString()}</p>
                    </div>
                    <div class="model-actions">
                        <button class="remove-model-btn" data-model="${model.name}">
                            <i class="fas fa-trash"></i> 移除
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }
    
    updateModelSelection() {
        const modelSelect = document.getElementById('selectedModel');
        modelSelect.innerHTML = '<option value="">選擇模型...</option>';
        
        this.currentModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = model.name;
            modelSelect.appendChild(option);
        });
        
        // 更新生成按鈕狀態
        const generateBtn = document.getElementById('generateText');
        if (generateBtn) {
            generateBtn.disabled = this.currentModels.length === 0;
        }
    }
    
    async downloadModel(modelName) {
        try {
            const button = document.querySelector(`[data-model="${modelName}"] .download-model-btn`);
            const progressContainer = document.getElementById(`progress-${modelName}`);
            
            // 檢查DOM元素是否存在
            if (!button) {
                console.error(`下載按鈕不存在: ${modelName}`);
                this.showNotification('下載按鈕不存在', 'error');
                return;
            }
            
            if (!progressContainer) {
                console.error(`進度容器不存在: ${modelName}`);
                this.showNotification('進度容器不存在', 'error');
                return;
            }
            
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 下載中...';
            progressContainer.style.display = 'block';
            
            const response = await fetch(`${this.apiEndpoint}/models/download`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
                },
                body: JSON.stringify({ model_name: modelName })
            });
            
            if (!response.ok) {
                throw new Error('下載請求失敗');
            }
            
            const reader = response.body.getReader();
            const progressFill = progressContainer.querySelector('.progress-fill');
            const progressText = progressContainer.querySelector('.progress-text');
            
            // 檢查進度元素
            if (!progressFill || !progressText) {
                console.warn('進度元素不完整，使用備用顯示方式');
            }
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.progress !== undefined && progressFill && progressText) {
                                const progress = Math.round(data.progress);
                                progressFill.style.width = `${progress}%`;
                                progressText.textContent = `${progress}%`;
                            }
                            
                            if (data.status === 'completed') {
                                this.showNotification(`模型 ${modelName} 下載完成`, 'success');
                                await this.loadAvailableModels();
                                break;
                            }
                            
                            if (data.status === 'error') {
                                throw new Error(data.error || '下載失敗');
                            }
                        } catch (e) {
                            // 忽略JSON解析錯誤
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error('下載模型失敗:', error);
            this.showNotification(`下載失敗: ${error.message}`, 'error');
        } finally {
            // 安全地重置按鈕和進度條
            const button = document.querySelector(`[data-model="${modelName}"] .download-model-btn`);
            const progressContainer = document.getElementById(`progress-${modelName}`);
            
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-download"></i> 下載';
            }
            
            if (progressContainer) {
                progressContainer.style.display = 'none';
            }
        }
    }
    
    async generateText() {
        try {
            const modelSelect = document.getElementById('selectedModel');
            const systemPrompt = document.getElementById('systemPrompt').value;
            const userPrompt = document.getElementById('userPrompt').value;
            const temperature = parseFloat(document.getElementById('temperature').value);
            const maxTokens = parseInt(document.getElementById('maxTokens').value);
            const streamResponse = document.getElementById('streamResponse').checked;
            
            if (!modelSelect.value) {
                this.showNotification('請選擇模型', 'warning');
                return;
            }
            
            if (!userPrompt.trim()) {
                this.showNotification('請輸入提示詞', 'warning');
                return;
            }
            
            const generateBtn = document.getElementById('generateText');
            const outputContainer = document.getElementById('generationOutput');
            const outputContent = document.getElementById('outputContent');
            
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
            outputContainer.style.display = 'block';
            outputContent.innerHTML = '<div class="streaming-indicator"><i class="fas fa-circle pulse"></i> 生成中...</div>';
            
            this.generationInProgress = true;
            
            const requestData = {
                model_name: modelSelect.value,
                prompt: userPrompt,
                system_prompt: systemPrompt || null,
                temperature: temperature,
                max_tokens: maxTokens,
                stream: streamResponse
            };
            
            if (streamResponse) {
                await this.handleStreamingGeneration(requestData);
            } else {
                await this.handleNormalGeneration(requestData);
            }
            
        } catch (error) {
            console.error('生成文本失敗:', error);
            this.showNotification(`生成失敗: ${error.message}`, 'error');
        } finally {
            const generateBtn = document.getElementById('generateText');
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-magic"></i> 生成文本';
            this.generationInProgress = false;
        }
    }
    
    async handleStreamingGeneration(requestData) {
        const response = await fetch(`${this.apiEndpoint}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error('生成請求失敗');
        }
        
        const reader = response.body.getReader();
        const outputContent = document.getElementById('outputContent');
        let fullText = '';
        
        outputContent.innerHTML = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.text) {
                            fullText += data.text;
                            outputContent.textContent = fullText;
                        }
                        
                        if (data.done) {
                            return;
                        }
                    } catch (e) {
                        // 忽略JSON解析錯誤
                    }
                }
            }
        }
    }
    
    async handleNormalGeneration(requestData) {
        const response = await this.makeRequest('/generate', {
            method: 'POST',
            body: JSON.stringify(requestData)
        });
        
        const outputContent = document.getElementById('outputContent');
        outputContent.textContent = response.text || '生成完成，但沒有返回內容';
    }
    
    clearGeneration() {
        document.getElementById('systemPrompt').value = '';
        document.getElementById('userPrompt').value = '';
        document.getElementById('generationOutput').style.display = 'none';
    }
    
    async enhancePrompt() {
        try {
            const originalPrompt = document.getElementById('originalPrompt').value;
            const style = document.getElementById('enhanceStyle').value;
            
            if (!originalPrompt.trim()) {
                this.showNotification('請輸入要增強的提示詞', 'warning');
                return;
            }
            
            const enhanceBtn = document.getElementById('enhancePromptLocal');
            enhanceBtn.disabled = true;
            enhanceBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 增強中...';
            
            const response = await this.makeRequest('/enhance-prompt', {
                method: 'POST',
                body: JSON.stringify({
                    original_prompt: originalPrompt,
                    style: style
                })
            });
            
            if (response.success) {
                this.displayEnhanceResults(response);
                this.showNotification('提示詞增強完成', 'success');
            } else {
                throw new Error(response.error || '增強失敗');
            }
            
        } catch (error) {
            console.error('增強提示詞失敗:', error);
            this.showNotification(`增強失敗: ${error.message}`, 'error');
        } finally {
            const enhanceBtn = document.getElementById('enhancePromptLocal');
            enhanceBtn.disabled = false;
            enhanceBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> 本地增強';
        }
    }
    
    displayEnhanceResults(response) {
        const resultsContainer = document.getElementById('enhanceResults');
        const enhancedPrompt = document.getElementById('enhancedPrompt');
        const suggestions = document.getElementById('enhancementSuggestions');
        
        enhancedPrompt.textContent = response.enhanced_prompt;
        
        if (response.suggestions && response.suggestions.length > 0) {
            suggestions.innerHTML = `
                <h5>改進建議:</h5>
                <ul>
                    ${response.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                </ul>
            `;
        } else {
            suggestions.innerHTML = '';
        }
        
        resultsContainer.style.display = 'block';
    }
    
    handleImageUpload(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const uploadArea = document.getElementById('imageUploadArea');
            const imageContainer = document.getElementById('uploadedImageContainer');
            const image = document.getElementById('uploadedImage');
            
            uploadArea.style.display = 'none';
            image.src = e.target.result;
            imageContainer.style.display = 'block';
            
            document.getElementById('analyzeImage').disabled = false;
        };
        reader.readAsDataURL(file);
    }
    
    async analyzeImage() {
        try {
            const image = document.getElementById('uploadedImage');
            const question = document.getElementById('analysisQuestion').value || '請描述這張圖片';
            
            if (!image.src) {
                this.showNotification('請先上傳圖片', 'warning');
                return;
            }
            
            const analyzeBtn = document.getElementById('analyzeImage');
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 分析中...';
            
            // 將圖片轉換為 base64
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = async () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const imageData = canvas.toDataURL('image/jpeg', 0.8);
                
                try {
                    const response = await this.makeRequest('/analyze-image', {
                        method: 'POST',
                        body: JSON.stringify({
                            image_data: imageData,
                            question: question
                        })
                    });
                    
                    this.displayAnalysisResults(response);
                    this.showNotification('圖片分析完成', 'success');
                    
                } catch (error) {
                    console.error('分析圖片失敗:', error);
                    this.showNotification(`分析失敗: ${error.message}`, 'error');
                } finally {
                    analyzeBtn.disabled = false;
                    analyzeBtn.innerHTML = '<i class="fas fa-search"></i> 分析圖片';
                }
            };
            
            img.src = image.src;
            
        } catch (error) {
            console.error('圖片分析失敗:', error);
            this.showNotification(`分析失敗: ${error.message}`, 'error');
        }
    }
    
    displayAnalysisResults(response) {
        const resultsContainer = document.getElementById('analysisResults');
        const content = document.getElementById('analysisContent');
        
        content.textContent = response.analysis || '分析完成，但沒有返回結果';
        resultsContainer.style.display = 'block';
    }
    
    async loadSystemInfo() {
        try {
            const systemInfo = document.getElementById('systemInfo');
            systemInfo.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>載入系統資訊中...</p></div>';
            
            const response = await this.makeRequest('/system-info');
            
            this.displaySystemInfo(response);
            
        } catch (error) {
            console.error('載入系統資訊失敗:', error);
            const systemInfo = document.getElementById('systemInfo');
            systemInfo.innerHTML = '<div class="loading-state"><i class="fas fa-exclamation-triangle"></i><p>載入失敗</p></div>';
        }
    }
    
    displaySystemInfo(info) {
        const systemInfo = document.getElementById('systemInfo');
        
        systemInfo.innerHTML = `
            <div class="system-metrics">
                <h4>系統狀態</h4>
                <div class="metrics-grid">
                    <div class="metric-item">
                        <label>Ollama 狀態</label>
                        <span class="status-${info.ollama_status === 'running' ? 'ok' : 'error'}">
                            ${info.ollama_status || '未知'}
                        </span>
                    </div>
                    <div class="metric-item">
                        <label>已安裝模型</label>
                        <span>${info.installed_models || 0}</span>
                    </div>
                    <div class="metric-item">
                        <label>可用記憶體</label>
                        <span>${info.available_memory || '未知'}</span>
                    </div>
                    <div class="metric-item">
                        <label>GPU 支援</label>
                        <span>${info.gpu_available ? '是' : '否'}</span>
                    </div>
                </div>
            </div>
            
            <div class="performance-metrics">
                <h4>性能指標</h4>
                <div class="metrics-grid">
                    <div class="metric-item">
                        <label>CPU 使用率</label>
                        <span>${info.cpu_usage || 0}%</span>
                    </div>
                    <div class="metric-item">
                        <label>記憶體使用率</label>
                        <span>${info.memory_usage || 0}%</span>
                    </div>
                    <div class="metric-item">
                        <label>磁碟使用率</label>
                        <span>${info.disk_usage || 0}%</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    async cleanupService() {
        try {
            const cleanupBtn = document.getElementById('cleanupService');
            cleanupBtn.disabled = true;
            cleanupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 清理中...';
            
            const response = await this.makeRequest('/cleanup', {
                method: 'POST'
            });
            
            if (response.success) {
                this.showNotification('服務清理完成', 'success');
                await this.checkServiceStatus();
                await this.loadSystemInfo();
            } else {
                throw new Error(response.error || '清理失敗');
            }
            
        } catch (error) {
            console.error('清理服務失敗:', error);
            this.showNotification(`清理失敗: ${error.message}`, 'error');
        } finally {
            const cleanupBtn = document.getElementById('cleanupService');
            cleanupBtn.disabled = false;
            cleanupBtn.innerHTML = '<i class="fas fa-broom"></i> 清理服務';
        }
    }

    setGeneratingState(isGenerating) {
        // 安全檢查DOM元素
        const generateBtn = document.getElementById('generate-btn');
        const stopBtn = document.getElementById('stop-generation-btn');
        
        if (!generateBtn) {
            console.error('生成按鈕不存在');
            return;
        }
        
        if (!stopBtn) {
            console.error('停止按鈕不存在');
            return;
        }
        
        this.isGenerating = isGenerating;
        
        if (isGenerating) {
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
            stopBtn.style.display = 'inline-block';
        } else {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 生成';
            stopBtn.style.display = 'none';
        }
        
        // 更新其他相關元素狀態
        const modelSelect = document.getElementById('model-select');
        const inputTextarea = document.getElementById('input-text');
        
        if (modelSelect) {
            modelSelect.disabled = isGenerating;
        }
        
        if (inputTextarea) {
            inputTextarea.disabled = isGenerating;
        }
    }
}

// 全局實例
window.localAIManager = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 延遲初始化，確保其他組件先載入
    setTimeout(() => {
        window.localAIManager = new LocalAIManager();
    }, 1000);
}); 