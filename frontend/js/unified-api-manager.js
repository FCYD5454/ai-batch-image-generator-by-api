/**
 * 統一API管理器 v3.0
 * 解決前後端連接問題，統一API調用、認證和錯誤處理
 */

class UnifiedAPIManager {
    constructor() {
        this.baseURL = window.location.origin;
        this.token = null;
        this.apiKeys = new Map();
        this.requestQueue = [];
        this.isRefreshing = false;
        this.interceptors = [];
        
        // 註冊的處理器
        this.authHandler = null;
        this.cacheHandler = null;
        this.requestIdCounter = 0;
        
        this.init();
        console.log('🔧 統一API管理器已初始化');
    }
    
    init() {
        this.loadStoredAuth();
        this.setupSingleInterceptor();
        this.loadStoredAPIKeys();
        this.setupErrorHandling();
    }
    
    // ==================== 認證管理 ====================
    
    loadStoredAuth() {
        try {
            this.token = localStorage.getItem('sessionToken');
            if (this.token) {
                console.log('✅ 已載入存儲的認證Token');
            }
        } catch (error) {
            console.error('載入認證信息失敗:', error);
        }
    }
    
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('sessionToken', token);
        } else {
            localStorage.removeItem('sessionToken');
        }
    }
    
    getToken() {
        return this.token;
    }
    
    isAuthenticated() {
        return !!this.token;
    }
    
    // ==================== API金鑰管理 ====================
    
    loadStoredAPIKeys() {
        try {
            const storedKeys = localStorage.getItem('apiKeys');
            if (storedKeys) {
                const keys = JSON.parse(storedKeys);
                Object.entries(keys).forEach(([provider, key]) => {
                    this.apiKeys.set(provider, key);
                });
                console.log(`✅ 已載入 ${this.apiKeys.size} 個API金鑰`);
            }
        } catch (error) {
            console.error('載入API金鑰失敗:', error);
        }
    }
    
    async getAPIKey(provider) {
        // 1. 優先從內存中獲取
        if (this.apiKeys.has(provider)) {
            return this.apiKeys.get(provider);
        }
        
        // 2. 嘗試從後端API金鑰管理器獲取（使用原始fetch避免遞歸）
        try {
            const response = await window._originalFetch(`${this.baseURL}/api/api-keys/list`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {})
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.keys) {
                    const key = data.keys.find(k => k.platform === provider && k.is_active);
                    if (key) {
                        this.apiKeys.set(provider, key.encrypted_key);
                        return key.encrypted_key;
                    }
                }
            }
        } catch (error) {
            console.warn(`從後端獲取${provider} API金鑰失敗:`, error);
        }
        
        // 3. 回退到HTML輸入框
        const inputElement = document.getElementById(`${provider}ApiKey`);
        if (inputElement && inputElement.value.trim()) {
            const key = inputElement.value.trim();
            this.setAPIKey(provider, key);
            return key;
        }
        
        return null;
    }
    
    setAPIKey(provider, key) {
        this.apiKeys.set(provider, key);
        this.saveAPIKeys();
    }
    
    saveAPIKeys() {
        try {
            const keysObj = Object.fromEntries(this.apiKeys);
            localStorage.setItem('apiKeys', JSON.stringify(keysObj));
        } catch (error) {
            console.error('保存API金鑰失敗:', error);
        }
    }
    
    // ==================== 統一請求攔截器 ====================
    
    setupSingleInterceptor() {
        // 保存原始fetch
        if (!window._originalFetch) {
            window._originalFetch = window.fetch;
        }
        
        // 設置統一攔截器
        window.fetch = async (url, options = {}) => {
            return this.interceptedFetch(url, options);
        };
        
        console.log('🔄 統一請求攔截器已設置');
    }
    
    async interceptedFetch(url, options = {}) {
        try {
            // 處理相對URL
            const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;
            
            // 應用攔截器
            options = await this.applyInterceptors(fullURL, options);
            
            // 添加認證頭
            if (fullURL.includes('/api/') && this.token) {
                options.headers = {
                    ...options.headers,
                    'Authorization': `Bearer ${this.token}`
                };
            }
            
            // 添加默認頭
            options.headers = {
                'Content-Type': 'application/json',
                ...options.headers
            };
            
            // 執行請求
            const response = await window._originalFetch(fullURL, options);
            
            // 處理認證錯誤
            if (response.status === 401 && this.isAuthenticated()) {
                return this.handleAuthError(fullURL, options);
            }
            
            // 處理其他錯誤
            if (!response.ok) {
                await this.handleAPIError(response, fullURL);
            }
            
            return response;
            
        } catch (error) {
            // 增強的網絡錯誤處理
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.showErrorNotification('網絡連接失敗，請檢查網絡設置');
            } else if (error.name === 'AbortError') {
                this.showErrorNotification('請求已取消');
            } else if (error.message && error.message.includes('API')) {
                this.showErrorNotification(`API錯誤: ${error.message}`);
            } else {
                this.showErrorNotification(`網絡錯誤: ${error.message || '未知錯誤'}`);
            }
            
            console.error('API請求失敗:', error);
            throw error;
        }
    }
    
    async applyInterceptors(url, options) {
        for (const interceptor of this.interceptors) {
            try {
                options = await interceptor(url, options);
            } catch (error) {
                console.error('攔截器執行失敗:', error);
            }
        }
        return options;
    }
    
    addInterceptor(interceptor) {
        this.interceptors.push(interceptor);
    }
    
    // ==================== 錯誤處理 ====================
    
    setupErrorHandling() {
        // 全局錯誤處理
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason && event.reason.message && event.reason.message.includes('API')) {
                console.error('未處理的API錯誤:', event.reason);
                this.showErrorNotification('API請求失敗，請稍後再試');
                event.preventDefault();
            }
        });
    }
    
    async handleAuthError(url, options) {
        if (this.isRefreshing) {
            // 如果正在刷新，將請求加入隊列
            return new Promise((resolve, reject) => {
                this.requestQueue.push({ url, options, resolve, reject });
            });
        }
        
        this.isRefreshing = true;
        
        try {
            // 嘗試刷新Token
            const refreshResponse = await window._originalFetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (refreshResponse.ok) {
                const data = await refreshResponse.json();
                this.setToken(data.token);
                
                // 重試原始請求
                options.headers = {
                    ...options.headers,
                    'Authorization': `Bearer ${this.token}`
                };
                
                const retryResponse = await window._originalFetch(url, options);
                
                // 處理隊列中的請求
                this.processRequestQueue();
                
                return retryResponse;
            } else {
                throw new Error('Token刷新失敗');
            }
        } catch (error) {
            console.error('認證錯誤處理失敗:', error);
            this.clearAuth();
            this.showLoginPrompt();
            throw error;
        } finally {
            this.isRefreshing = false;
        }
    }
    
    async handleAPIError(response, url) {
        let errorMessage = '';
        
        try {
            // 嘗試獲取響應文本
            const responseText = await response.text();
            
            if (responseText) {
                try {
                    // 嘗試解析為JSON
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.error || errorData.message || responseText;
                } catch (e) {
                    // 不是JSON，使用原始文本
                    errorMessage = responseText;
                }
            }
        } catch (e) {
            // 無法讀取響應體
            errorMessage = '無法讀取錯誤信息';
        }
        
        // 如果沒有具體錯誤信息，使用狀態碼
        if (!errorMessage) {
            const errorMessages = {
                400: '請求參數錯誤',
                401: '認證失敗，請檢查登入狀態',
                403: '沒有權限執行此操作',
                404: '請求的資源不存在',
                500: '服務器內部錯誤',
                502: '網關錯誤',
                503: '服務暫時不可用'
            };
            errorMessage = errorMessages[response.status] || `請求失敗 (${response.status})`;
        }
        
        // 顯示錯誤通知
        switch (response.status) {
            case 400:
                this.showErrorNotification(`請求錯誤: ${errorMessage}`);
                break;
            case 403:
                this.showErrorNotification('權限不足，請檢查您的訪問權限');
                break;
            case 404:
                this.showErrorNotification('請求的資源不存在');
                break;
            case 429:
                this.showErrorNotification('請求過於頻繁，請稍後再試');
                break;
            case 500:
                this.showErrorNotification('服務器內部錯誤，請稍後再試');
                break;
            default:
                this.showErrorNotification(errorMessage);
        }
        
        throw new Error(errorMessage);
    }
    
    processRequestQueue() {
        while (this.requestQueue.length > 0) {
            const { url, options, resolve, reject } = this.requestQueue.shift();
            
            // 更新認證頭
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${this.token}`
            };
            
            window._originalFetch(url, options)
                .then(resolve)
                .catch(reject);
        }
    }
    
    clearAuth() {
        this.setToken(null);
        this.requestQueue = [];
    }
    
    // ==================== 便捷方法 ====================
    
    async makeRequest(url, options = {}) {
        const response = await fetch(url, options);
        return response.json();
    }
    
    async get(url, options = {}) {
        return this.makeRequest(url, { ...options, method: 'GET' });
    }
    
    async post(url, data, options = {}) {
        return this.makeRequest(url, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    async put(url, data, options = {}) {
        return this.makeRequest(url, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    async delete(url, options = {}) {
        return this.makeRequest(url, { ...options, method: 'DELETE' });
    }
    
    // ==================== 生成圖片專用方法 ====================
    
    async generateImage(prompt, options = {}) {
        const {
            imageSize = '1024x1024',
            imageCount = 1,
            apiProvider = 'gemini',
            model = ''
        } = options;
        
        // 獲取API金鑰
        const apiKey = await this.getAPIKey(apiProvider);
        if (!apiKey && apiProvider !== 'midjourney') {
            throw new Error(`請設置 ${apiProvider} API 金鑰`);
        }
        
        const requestData = {
            prompt,
            image_size: imageSize,
            image_count: imageCount,
            api_provider: apiProvider,
            api_key: apiKey,
            model: model || this.getDefaultModel(apiProvider)
        };
        
        return this.post('/api/generate-image', requestData);
    }
    
    // 自定義API生成方法
    async generateImageWithCustomAPI(prompt, options = {}) {
        const {
            apiUrl,
            apiKey,
            model = '',
            imageSize = '1024x1024',
            imageCount = 1,
            customHeaders = {},
            requestTemplate = '',
            format = 'json'
        } = options;
        
        if (!apiUrl) {
            throw new Error('請輸入 API 端點 URL');
        }
        
        // 構建請求頭
        let headers = {
            'Content-Type': 'application/json',
            ...customHeaders
        };
        
        // 如果有API金鑰，添加到請求頭
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
        
        // 構建請求體
        let requestBody;
        if (requestTemplate) {
            try {
                requestBody = requestTemplate
                    .replace(/{PROMPT}/g, prompt)
                    .replace(/{SIZE}/g, imageSize)
                    .replace(/{COUNT}/g, imageCount)
                    .replace(/{MODEL}/g, model || '');
                
                requestBody = JSON.parse(requestBody);
            } catch (e) {
                throw new Error('請求模板格式錯誤，請使用有效的 JSON 格式');
            }
        } else {
            requestBody = {
                prompt: prompt,
                size: imageSize,
                n: imageCount
            };
            if (model) requestBody.model = model;
        }
        
        const requestOptions = {
            method: 'POST',
            headers: headers,
            body: format === 'json' ? JSON.stringify(requestBody) : new URLSearchParams(requestBody)
        };
        
        // 使用統一攔截器（通過fetch調用會被自動攔截）
        const response = await fetch(apiUrl, requestOptions);
        
        if (!response.ok) {
            throw new Error(`API 請求失敗: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        return this.parseCustomApiResponse(result);
    }
    
    // 解析自定義API響應
    parseCustomApiResponse(response) {
        // 嘗試識別不同的響應格式
        if (response.images) {
            return { success: true, images: response.images };
        } else if (response.data) {
            // OpenAI格式
            const images = response.data.map(item => ({
                url: item.url,
                base64: item.b64_json
            }));
            return { success: true, images: images };
        } else if (response.artifacts) {
            // Stability AI格式
            const images = response.artifacts.map(artifact => ({
                base64: artifact.base64
            }));
            return { success: true, images: images };
        } else if (response.url || response.b64_json) {
            // 單張圖片格式
            return { 
                success: true, 
                images: [{ 
                    url: response.url, 
                    base64: response.b64_json 
                }] 
            };
        } else {
            // 未知格式，嘗試直接返回
            return { success: false, error: '無法解析API響應格式' };
        }
    }
    
    getDefaultModel(provider) {
        const defaultModels = {
            'gemini': 'gemini-2.0-flash-preview-image-generation',
            'openai': 'dall-e-3',
            'stability': 'stable-diffusion-xl-1024-v1-0',
            'adobe_firefly': 'firefly-v3',
            'leonardo_ai': 'leonardo-creative'
        };
        return defaultModels[provider] || '';
    }
    
    // ==================== UI通知 ====================
    
    showErrorNotification(message) {
        this.showNotification(message, 'error');
    }
    
    showSuccessNotification(message) {
        this.showNotification(message, 'success');
    }
    
    showNotification(message, type = 'info') {
        // 創建通知元素
        const notification = document.createElement('div');
        notification.className = `api-notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // 添加樣式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.4;
            animation: slideIn 0.3s ease-out;
            background: ${type === 'error' ? '#fee' : type === 'success' ? '#efe' : '#eef'};
            border-left: 4px solid ${type === 'error' ? '#e53e3e' : type === 'success' ? '#38a169' : '#3182ce'};
            color: ${type === 'error' ? '#c53030' : type === 'success' ? '#2f855a' : '#2c5282'};
        `;
        
        document.body.appendChild(notification);
        
        // 自動移除
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    getNotificationIcon(type) {
        switch (type) {
            case 'error': return '❌';
            case 'success': return '✅';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
        }
    }
    
    showLoginPrompt() {
        // 顯示登入提示
        this.showNotification('認證已過期，請重新登入', 'warning');
        
        // 如果有登入模態框，顯示它
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.style.display = 'block';
        }
    }
}

// 創建全局實例
window.unifiedAPI = new UnifiedAPIManager();

// 添加CSS動畫
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .notification-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        margin-left: auto;
        opacity: 0.7;
    }
    
    .notification-close:hover {
        opacity: 1;
    }
`;
document.head.appendChild(style);

// ==================== 處理器註冊 ====================

// 擴展 UnifiedAPIManager 類別以支援處理器註冊
UnifiedAPIManager.prototype.registerAuthHandler = function(authHandler) {
    this.authHandler = authHandler;
    console.log('✅ 認證處理器已註冊');
};

UnifiedAPIManager.prototype.registerCacheHandler = function(cacheHandler) {
    this.cacheHandler = cacheHandler;
    console.log('✅ 快取處理器已註冊');
};

// 更新攔截器以支援事件分發和快取
UnifiedAPIManager.prototype._originalInterceptedFetch = UnifiedAPIManager.prototype.interceptedFetch;
UnifiedAPIManager.prototype.interceptedFetch = async function(url, options = {}) {
    const requestId = ++this.requestIdCounter;
    const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    
    // 分發請求開始事件
    this.dispatchEvent('apiRequestStart', { 
        requestId, 
        url: fullURL, 
        options: { ...options } 
    });
    
    try {
        // 檢查快取
        if (this.cacheHandler && this.cacheHandler.shouldUseCache(options)) {
            const cacheKey = this.cacheHandler.generateCacheKey(fullURL, options);
            
            if (this.cacheHandler.cache.has(cacheKey)) {
                const cachedResponse = this.cacheHandler.cache.get(cacheKey);
                if (!this.cacheHandler.isCacheExpired(cachedResponse)) {
                    this.cacheHandler.performanceMetrics.cacheHits++;
                    this.dispatchEvent('apiRequestEnd', { 
                        requestId, 
                        url: fullURL, 
                        status: 200, 
                        cached: true 
                    });
                    return Promise.resolve(cachedResponse.response.clone());
                }
            }
        }
        
        // 執行原始攔截邏輯
        const response = await this._originalInterceptedFetch(url, options);
        
        // 快取響應
        if (this.cacheHandler && this.cacheHandler.shouldCache(response, options)) {
            const cacheKey = this.cacheHandler.generateCacheKey(fullURL, options);
            this.cacheHandler.cacheResponse(cacheKey, response);
            this.cacheHandler.performanceMetrics.cacheMisses++;
        }
        
        // 分發請求完成事件
        this.dispatchEvent('apiRequestEnd', { 
            requestId, 
            url: fullURL, 
            status: response.status 
        });
        
        return response;
        
    } catch (error) {
        // 分發請求錯誤事件
        this.dispatchEvent('apiRequestError', { 
            requestId, 
            url: fullURL, 
            error: error.message 
        });
        
        // 如果有過期的快取，嘗試使用它
        if (this.cacheHandler) {
            const cacheKey = this.cacheHandler.generateCacheKey(fullURL, options);
            if (this.cacheHandler.cache.has(cacheKey)) {
                const cachedResponse = this.cacheHandler.cache.get(cacheKey);
                console.warn('使用過期快取回應網路錯誤:', error);
                return cachedResponse.response.clone();
            }
        }
        
        throw error;
    }
};

// 事件分發方法
UnifiedAPIManager.prototype.dispatchEvent = function(eventType, detail) {
    document.dispatchEvent(new CustomEvent(eventType, { detail }));
};

console.log('🚀 統一API管理器載入完成');
