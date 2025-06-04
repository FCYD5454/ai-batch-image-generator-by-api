/**
 * AI 智能助手前端模組
 * 提供 ChatGPT 整合的智能功能
 * v2.5 新功能
 */

class AIAssistant {
    constructor() {
        this.isConfigured = false;
        this.isProcessing = false;
        this.apiEndpoint = '/api/ai-assistant';
        this.suggestionCache = new Map();
        this.processingQueue = [];
        
        // 初始化事件監聽器
        this.initializeEventListeners();
        
        // 檢查 AI 助手狀態
        this.checkStatus();
        
        console.log('🤖 AI 智能助手模組已初始化');
    }
    
    /**
     * 初始化事件監聽器
     */
    initializeEventListeners() {
        // API 金鑰配置
        document.addEventListener('DOMContentLoaded', () => {
            this.setupConfigurationUI();
            this.setupPromptEnhancementUI();
            this.setupImageAnalysisUI();
            this.setupSmartTagsUI();
        });
    }
    
    /**
     * 設置配置界面
     */
    setupConfigurationUI() {
        // 檢查是否已有配置按鈕
        const existingButton = document.getElementById('ai-assistant-config-btn');
        if (existingButton) return;
        
        // 創建 AI 助手配置面板
        const configHTML = `
            <div class="ai-assistant-config" id="ai-assistant-config">
                <div class="config-header">
                    <h3>🤖 AI 智能助手</h3>
                    <span class="status-indicator" id="ai-status-indicator">❌ 未配置</span>
                </div>
                <div class="config-content">
                    <div class="api-key-input">
                        <label for="openai-api-key">OpenAI API 金鑰:</label>
                        <div class="input-group">
                            <input type="password" 
                                   id="openai-api-key" 
                                   placeholder="sk-..." 
                                   class="api-key-field">
                            <button type="button" 
                                    id="test-ai-connection" 
                                    class="test-btn">
                                測試連接
                            </button>
                            <button type="button" 
                                    id="configure-ai-assistant" 
                                    class="configure-btn">
                                配置
                            </button>
                        </div>
                    </div>
                    <div class="ai-features" id="ai-features" style="display: none;">
                        <div class="feature-grid">
                            <button class="feature-btn" id="quick-enhance-btn">
                                ⚡ 快速增強
                            </button>
                            <button class="feature-btn" id="batch-enhance-btn">
                                📦 批量處理
                            </button>
                            <button class="feature-btn" id="style-suggestions-btn">
                                🎨 風格建議
                            </button>
                            <button class="feature-btn" id="smart-analysis-btn">
                                🔍 智能分析
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 插入到提示詞增強面板後面
        const promptPanel = document.querySelector('.prompt-enhancement');
        if (promptPanel) {
            promptPanel.insertAdjacentHTML('afterend', configHTML);
        }
        
        // 綁定事件
        document.getElementById('test-ai-connection')?.addEventListener('click', () => {
            this.testConnection();
        });
        
        document.getElementById('configure-ai-assistant')?.addEventListener('click', () => {
            this.configureAssistant();
        });
        
        document.getElementById('quick-enhance-btn')?.addEventListener('click', () => {
            this.quickEnhancePrompt();
        });
        
        document.getElementById('batch-enhance-btn')?.addEventListener('click', () => {
            this.showBatchEnhanceModal();
        });
        
        document.getElementById('style-suggestions-btn')?.addEventListener('click', () => {
            this.showStyleSuggestions();
        });
        
        document.getElementById('smart-analysis-btn')?.addEventListener('click', () => {
            this.showImageAnalysisModal();
        });
    }
    
    /**
     * 設置提示詞增強界面
     */
    setupPromptEnhancementUI() {
        // 在提示詞輸入框添加增強按鈕
        const promptTextarea = document.getElementById('prompt');
        if (promptTextarea && !document.getElementById('ai-enhance-btn')) {
            const enhanceButton = document.createElement('button');
            enhanceButton.id = 'ai-enhance-btn';
            enhanceButton.type = 'button';
            enhanceButton.className = 'ai-enhance-btn';
            enhanceButton.innerHTML = '🤖 AI 增強';
            enhanceButton.onclick = () => this.enhanceCurrentPrompt();
            
            // 添加到提示詞輸入框旁邊
            promptTextarea.parentElement.appendChild(enhanceButton);
        }
    }
    
    /**
     * 設置圖片分析界面
     */
    setupImageAnalysisUI() {
        // 為每張生成的圖片添加分析按鈕
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList?.contains('generated-image')) {
                        this.addAnalysisButton(node);
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    /**
     * 設置智能標籤界面
     */
    setupSmartTagsUI() {
        // 在圖片管理面板添加智能標籤按鈕
        const galleryContainer = document.getElementById('gallery-container');
        if (galleryContainer && !document.getElementById('smart-tags-btn')) {
            const smartTagsButton = document.createElement('button');
            smartTagsButton.id = 'smart-tags-btn';
            smartTagsButton.className = 'ai-feature-btn';
            smartTagsButton.innerHTML = '🏷️ 智能標籤';
            smartTagsButton.onclick = () => this.generateSmartTagsForAll();
            
            const controls = galleryContainer.querySelector('.gallery-controls');
            if (controls) {
                controls.appendChild(smartTagsButton);
            }
        }
    }
    
    /**
     * 檢查 AI 助手狀態
     */
    async checkStatus() {
        try {
            const response = await fetch(`${this.apiEndpoint}/status`);
            const data = await response.json();
            
            if (data.success) {
                this.isConfigured = data.status.is_configured;
                this.updateStatusUI(this.isConfigured);
            }
        } catch (error) {
            console.error('檢查 AI 助手狀態失敗:', error);
        }
    }
    
    /**
     * 測試 API 連接
     */
    async testConnection() {
        const apiKey = document.getElementById('openai-api-key')?.value?.trim();
        if (!apiKey) {
            this.showMessage('請輸入 OpenAI API 金鑰', 'error');
            return;
        }
        
        const testBtn = document.getElementById('test-ai-connection');
        const originalText = testBtn.textContent;
        testBtn.textContent = '測試中...';
        testBtn.disabled = true;
        
        try {
            const response = await fetch(`${this.apiEndpoint}/test-connection`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ api_key: apiKey })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage('✅ API 金鑰有效，連接成功！', 'success');
            } else {
                this.showMessage(`❌ ${data.error}`, 'error');
            }
        } catch (error) {
            this.showMessage(`❌ 連接測試失敗: ${error.message}`, 'error');
        } finally {
            testBtn.textContent = originalText;
            testBtn.disabled = false;
        }
    }
    
    /**
     * 配置 AI 助手
     */
    async configureAssistant() {
        const apiKey = document.getElementById('openai-api-key')?.value?.trim();
        if (!apiKey) {
            this.showMessage('請輸入 OpenAI API 金鑰', 'error');
            return;
        }
        
        const configureBtn = document.getElementById('configure-ai-assistant');
        const originalText = configureBtn.textContent;
        configureBtn.textContent = '配置中...';
        configureBtn.disabled = true;
        
        try {
            const response = await fetch(`${this.apiEndpoint}/configure`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ api_key: apiKey })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.isConfigured = true;
                this.updateStatusUI(true);
                this.showMessage('✅ AI 助手配置成功！', 'success');
                
                // 清空輸入框保護隱私
                document.getElementById('openai-api-key').value = '***已配置***';
                document.getElementById('openai-api-key').disabled = true;
                
            } else {
                this.showMessage(`❌ ${data.error}`, 'error');
            }
        } catch (error) {
            this.showMessage(`❌ 配置失敗: ${error.message}`, 'error');
        } finally {
            configureBtn.textContent = originalText;
            configureBtn.disabled = false;
        }
    }
    
    /**
     * 快速增強當前提示詞
     */
    async quickEnhancePrompt() {
        if (!this.isConfigured) {
            this.showMessage('請先配置 AI 助手', 'warning');
            return;
        }
        
        const promptTextarea = document.getElementById('prompt');
        const currentPrompt = promptTextarea?.value?.trim();
        
        if (!currentPrompt) {
            this.showMessage('請先輸入提示詞', 'warning');
            return;
        }
        
        const enhanceBtn = document.getElementById('ai-enhance-btn');
        const originalText = enhanceBtn?.textContent;
        if (enhanceBtn) {
            enhanceBtn.textContent = '🤖 增強中...';
            enhanceBtn.disabled = true;
        }
        
        try {
            const response = await fetch(`${this.apiEndpoint}/quick-enhance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt: currentPrompt })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // 更新提示詞輸入框
                promptTextarea.value = data.enhanced_prompt;
                
                // 顯示改進建議
                this.showEnhancementResults(data);
                
                this.showMessage('✅ 提示詞已增強！', 'success');
            } else {
                this.showMessage(`❌ ${data.error}`, 'error');
            }
        } catch (error) {
            this.showMessage(`❌ 增強失敗: ${error.message}`, 'error');
        } finally {
            if (enhanceBtn) {
                enhanceBtn.textContent = originalText;
                enhanceBtn.disabled = false;
            }
        }
    }
    
    /**
     * 增強指定的提示詞
     */
    async enhancePrompt(prompt, options = {}) {
        if (!this.isConfigured) {
            throw new Error('AI 助手未配置');
        }
        
        const requestData = {
            prompt: prompt,
            style: options.style || null,
            target_language: options.target_language || 'en',
            complexity: options.complexity || 'moderate'
        };
        
        const response = await fetch(`${this.apiEndpoint}/enhance-prompt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        return await response.json();
    }
    
    /**
     * 分析圖片
     */
    async analyzeImage(imageData, prompt = null) {
        if (!this.isConfigured) {
            throw new Error('AI 助手未配置');
        }
        
        const requestData = {
            image_base64: imageData,
            prompt: prompt
        };
        
        const response = await fetch(`${this.apiEndpoint}/analyze-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        return await response.json();
    }
    
    /**
     * 生成智能標籤
     */
    async generateSmartTags(options = {}) {
        if (!this.isConfigured) {
            throw new Error('AI 助手未配置');
        }
        
        const requestData = {
            image_base64: options.imageData || null,
            prompt: options.prompt || null,
            style: options.style || null
        };
        
        const response = await fetch(`${this.apiEndpoint}/generate-tags`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        return await response.json();
    }
    
    /**
     * 獲取風格建議
     */
    async getStyleSuggestions(userInput) {
        if (!this.isConfigured) {
            throw new Error('AI 助手未配置');
        }
        
        const response = await fetch(`${this.apiEndpoint}/style-suggestions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_input: userInput })
        });
        
        return await response.json();
    }
    
    /**
     * 批量增強提示詞
     */
    async batchEnhancePrompts(prompts, options = {}) {
        if (!this.isConfigured) {
            throw new Error('AI 助手未配置');
        }
        
        const requestData = {
            prompts: prompts,
            style: options.style || null,
            complexity: options.complexity || 'moderate'
        };
        
        const response = await fetch(`${this.apiEndpoint}/batch-enhance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        return await response.json();
    }
    
    /**
     * 顯示增強結果
     */
    showEnhancementResults(data) {
        const modal = this.createModal('AI 增強結果', `
            <div class="enhancement-results">
                <div class="result-section">
                    <h4>📝 原始提示詞</h4>
                    <div class="prompt-text">${data.original_prompt}</div>
                </div>
                <div class="result-section">
                    <h4>✨ 增強後提示詞</h4>
                    <div class="prompt-text enhanced">${data.enhanced_prompt}</div>
                </div>
                ${data.improvements ? `
                <div class="result-section">
                    <h4>💡 改進建議</h4>
                    <ul class="improvements-list">
                        ${data.improvements.map(improvement => `<li>${improvement}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                <div class="result-section">
                    <h4>⏱️ 處理時間</h4>
                    <div class="processing-time">${data.processing_time?.toFixed(2) || 0} 秒</div>
                </div>
            </div>
        `);
        
        this.showModal(modal);
    }
    
    /**
     * 顯示批量增強模態框
     */
    showBatchEnhanceModal() {
        if (!this.isConfigured) {
            this.showMessage('請先配置 AI 助手', 'warning');
            return;
        }
        
        const modal = this.createModal('批量提示詞增強', `
            <div class="batch-enhance-form">
                <div class="form-group">
                    <label for="batch-prompts">提示詞列表 (每行一個，最多10個):</label>
                    <textarea id="batch-prompts" 
                              rows="8" 
                              placeholder="a beautiful landscape&#10;a futuristic city&#10;an abstract painting&#10;..."></textarea>
                </div>
                <div class="form-group">
                    <label for="batch-style">目標風格 (可選):</label>
                    <select id="batch-style">
                        <option value="">自動選擇</option>
                        <option value="realistic">寫實</option>
                        <option value="anime">動漫</option>
                        <option value="oil_painting">油畫</option>
                        <option value="watercolor">水彩</option>
                        <option value="digital_art">數位藝術</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="batch-complexity">優化程度:</label>
                    <select id="batch-complexity">
                        <option value="light">輕度優化</option>
                        <option value="moderate" selected>中度優化</option>
                        <option value="aggressive">深度優化</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="aiAssistant.processBatchEnhancement()">
                        🚀 開始批量增強
                    </button>
                </div>
            </div>
        `);
        
        this.showModal(modal);
    }
    
    /**
     * 處理批量增強
     */
    async processBatchEnhancement() {
        const promptsText = document.getElementById('batch-prompts').value.trim();
        const style = document.getElementById('batch-style').value;
        const complexity = document.getElementById('batch-complexity').value;
        
        if (!promptsText) {
            this.showMessage('請輸入提示詞列表', 'warning');
            return;
        }
        
        const prompts = promptsText.split('\n')
            .map(p => p.trim())
            .filter(p => p.length > 0);
        
        if (prompts.length === 0) {
            this.showMessage('請輸入有效的提示詞', 'warning');
            return;
        }
        
        if (prompts.length > 10) {
            this.showMessage('最多只能處理 10 個提示詞', 'warning');
            return;
        }
        
        // 顯示處理進度
        this.showProcessingModal(prompts.length);
        
        try {
            const data = await this.batchEnhancePrompts(prompts, { style, complexity });
            
            if (data.success) {
                this.showBatchResults(data);
            } else {
                this.showMessage(`❌ ${data.error}`, 'error');
            }
        } catch (error) {
            this.showMessage(`❌ 批量處理失敗: ${error.message}`, 'error');
        }
    }
    
    /**
     * 顯示批量處理結果
     */
    showBatchResults(data) {
        const resultsHTML = data.results.map((result, index) => `
            <div class="batch-result-item ${result.success ? 'success' : 'failed'}">
                <div class="result-index">#${index + 1}</div>
                <div class="result-content">
                    <div class="original-prompt">
                        <strong>原始:</strong> ${result.original}
                    </div>
                    ${result.success ? `
                        <div class="enhanced-prompt">
                            <strong>增強:</strong> ${result.enhanced}
                        </div>
                    ` : `
                        <div class="error-message">
                            <strong>錯誤:</strong> ${result.error}
                        </div>
                    `}
                </div>
            </div>
        `).join('');
        
        const modal = this.createModal('批量增強結果', `
            <div class="batch-results">
                <div class="results-summary">
                    <span class="success-count">成功: ${data.summary.successful}</span>
                    <span class="failed-count">失敗: ${data.summary.failed}</span>
                    <span class="total-count">總計: ${data.summary.total}</span>
                </div>
                <div class="results-list">
                    ${resultsHTML}
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="aiAssistant.downloadBatchResults(${JSON.stringify(data).replace(/"/g, '&quot;')})">
                        💾 下載結果
                    </button>
                </div>
            </div>
        `);
        
        this.showModal(modal);
    }
    
    /**
     * 更新狀態界面
     */
    updateStatusUI(isConfigured) {
        const statusIndicator = document.getElementById('ai-status-indicator');
        const aiFeatures = document.getElementById('ai-features');
        
        if (statusIndicator) {
            statusIndicator.textContent = isConfigured ? '✅ 已配置' : '❌ 未配置';
            statusIndicator.className = `status-indicator ${isConfigured ? 'configured' : 'not-configured'}`;
        }
        
        if (aiFeatures) {
            aiFeatures.style.display = isConfigured ? 'block' : 'none';
        }
    }
    
    /**
     * 為圖片添加分析按鈕
     */
    addAnalysisButton(imageElement) {
        if (!this.isConfigured) return;
        
        const analysisBtn = document.createElement('button');
        analysisBtn.className = 'ai-analysis-btn';
        analysisBtn.innerHTML = '🔍 AI 分析';
        analysisBtn.onclick = () => this.analyzeImageElement(imageElement);
        
        // 添加按鈕到圖片容器
        const imageContainer = imageElement.closest('.image-container') || imageElement;
        imageContainer.appendChild(analysisBtn);
    }
    
    /**
     * 創建模態框
     */
    createModal(title, content) {
        return `
            <div class="ai-modal" id="ai-modal">
                <div class="ai-modal-content">
                    <div class="ai-modal-header">
                        <h3>${title}</h3>
                        <button class="ai-modal-close" onclick="aiAssistant.closeModal()">&times;</button>
                    </div>
                    <div class="ai-modal-body">
                        ${content}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 顯示模態框
     */
    showModal(modalHTML) {
        // 移除現有模態框
        const existingModal = document.getElementById('ai-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 添加新模態框
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    /**
     * 關閉模態框
     */
    closeModal() {
        const modal = document.getElementById('ai-modal');
        if (modal) {
            modal.remove();
        }
    }
    
    /**
     * 顯示訊息
     */
    showMessage(message, type = 'info') {
        // 創建訊息元素
        const messageElement = document.createElement('div');
        messageElement.className = `ai-message ai-message-${type}`;
        messageElement.textContent = message;
        
        // 添加到頁面頂部
        document.body.insertBefore(messageElement, document.body.firstChild);
        
        // 自動移除
        setTimeout(() => {
            messageElement.remove();
        }, 5000);
    }
    
    /**
     * 顯示處理進度模態框
     */
    showProcessingModal(totalItems) {
        const modal = this.createModal('批量處理中...', `
            <div class="processing-container">
                <div class="processing-animation">
                    <div class="spinner"></div>
                </div>
                <div class="processing-text">
                    正在處理 ${totalItems} 個提示詞...
                </div>
                <div class="processing-progress">
                    <div class="progress-bar" id="progress-bar"></div>
                </div>
            </div>
        `);
        
        this.showModal(modal);
    }
}

// 創建全局實例
window.aiAssistant = new AIAssistant(); 