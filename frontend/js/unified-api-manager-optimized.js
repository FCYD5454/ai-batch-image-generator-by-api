/**
 * 統一API管理器 v4.0 - 優化版
 * 現代化重構，改進錯誤處理、性能和可維護性
 */

'use strict';

// ================== 配置常數 ==================
const API_CONFIG = {
    BASE_URL: window.location.origin,
    ENDPOINTS: {
        GENERATE_IMAGE: '/api/generate-image',
        HEALTH: '/health',
        API_KEYS: '/api/api-keys',
        AUTH: '/api/auth'
    },
    TIMEOUTS: {
        DEFAULT: 30000,        // 30秒
        IMAGE_GENERATION: 120000, // 2分鐘
        HEALTH_CHECK: 5000     // 5秒
    },
    RETRY: {
        MAX_ATTEMPTS: 3,
        DELAY_BASE: 1000,
        DELAY_MULTIPLIER: 2
    },
    CACHE: {
        TTL: 300000,          // 5分鐘
        MAX_ENTRIES: 100
    }
};

// ================== 工具函數 ==================
class Utils {
    /**
     * 休眠函數
     * @param {number} ms - 毫秒
     * @returns {Promise}
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 深度克隆對象
     * @param {*} obj - 要克隆的對象
     * @returns {*}
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            Object.keys(obj).forEach(key => {
                clonedObj[key] = this.deepClone(obj[key]);
            });
            return clonedObj;
        }
    }

    /**
     * 生成唯一ID
     * @returns {string}
     */
    static generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 驗證URL格式
     * @param {string} url - URL字符串
     * @returns {boolean}
     */
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 清理和驗證API金鑰
     * @param {string} apiKey - API金鑰
     * @returns {string|null}
     */
    static sanitizeApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') return null;
        const cleaned = apiKey.trim();
        return cleaned.length >= 8 ? cleaned : null; // 最小長度驗證
    }
}

// ================== 錯誤類 ==================
class APIError extends Error {
    constructor(message, code, statusCode, details = {}) {
        super(message);
        this.name = 'APIError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            details: this.details,
            timestamp: this.timestamp
        };
    }
}

class NetworkError extends APIError {
    constructor(message, details = {}) {
        super(message, 'NETWORK_ERROR', 0, details);
        this.name = 'NetworkError';
    }
}

class AuthenticationError extends APIError {
    constructor(message, details = {}) {
        super(message, 'AUTH_ERROR', 401, details);
        this.name = 'AuthenticationError';
    }
}

class ValidationError extends APIError {
    constructor(message, details = {}) {
        super(message, 'VALIDATION_ERROR', 400, details);
        this.name = 'ValidationError';
    }
}

// ================== 請求緩存類 ==================
class RequestCache {
    constructor(maxEntries = API_CONFIG.CACHE.MAX_ENTRIES, ttl = API_CONFIG.CACHE.TTL) {
        this.cache = new Map();
        this.maxEntries = maxEntries;
        this.ttl = ttl;
    }

    /**
     * 生成緩存鍵
     * @param {string} method - HTTP方法
     * @param {string} url - URL
     * @param {*} data - 請求數據
     * @returns {string}
     */
    generateKey(method, url, data) {
        const dataStr = data ? JSON.stringify(data) : '';
        return `${method.toUpperCase()}:${url}:${btoa(dataStr)}`;
    }

    /**
     * 獲取緩存
     * @param {string} key - 緩存鍵
     * @returns {*|null}
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }

        return Utils.deepClone(entry.data);
    }

    /**
     * 設置緩存
     * @param {string} key - 緩存鍵
     * @param {*} data - 數據
     */
    set(key, data) {
        // 如果緩存已滿，刪除最舊的條目
        if (this.cache.size >= this.maxEntries) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            data: Utils.deepClone(data),
            expiry: Date.now() + this.ttl
        });
    }

    /**
     * 清空緩存
     */
    clear() {
        this.cache.clear();
    }

    /**
     * 獲取緩存統計
     * @returns {Object}
     */
    getStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;

        this.cache.forEach(entry => {
            if (now > entry.expiry) {
                expiredEntries++;
            } else {
                validEntries++;
            }
        });

        return {
            total: this.cache.size,
            valid: validEntries,
            expired: expiredEntries,
            maxEntries: this.maxEntries
        };
    }
}

// ================== 重試邏輯類 ==================
class RetryHandler {
    constructor(maxAttempts = API_CONFIG.RETRY.MAX_ATTEMPTS, baseDelay = API_CONFIG.RETRY.DELAY_BASE) {
        this.maxAttempts = maxAttempts;
        this.baseDelay = baseDelay;
    }

    /**
     * 執行帶重試的函數
     * @param {Function} fn - 要執行的函數
     * @param {Array} args - 函數參數
     * @param {Function} shouldRetry - 判斷是否應該重試的函數
     * @returns {Promise}
     */
    async execute(fn, args = [], shouldRetry = this.defaultShouldRetry) {
        let lastError;

        for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
            try {
                return await fn.apply(this, args);
            } catch (error) {
                lastError = error;

                if (attempt === this.maxAttempts || !shouldRetry(error, attempt)) {
                    throw error;
                }

                const delay = this.calculateDelay(attempt);
                console.warn(`請求失敗，${delay}ms後進行第${attempt + 1}次重試:`, error.message);
                await Utils.sleep(delay);
            }
        }

        throw lastError;
    }

    /**
     * 計算重試延遲時間
     * @param {number} attempt - 當前重試次數
     * @returns {number}
     */
    calculateDelay(attempt) {
        return this.baseDelay * Math.pow(API_CONFIG.RETRY.DELAY_MULTIPLIER, attempt - 1);
    }

    /**
     * 默認重試判斷邏輯
     * @param {Error} error - 錯誤對象
     * @param {number} attempt - 當前重試次數
     * @returns {boolean}
     */
    defaultShouldRetry(error, attempt) {
        // 網絡錯誤或5xx服務器錯誤才重試
        if (error instanceof NetworkError) return true;
        if (error instanceof APIError && error.statusCode >= 500) return true;
        if (error.name === 'AbortError') return false; // 用戶取消不重試
        return false;
    }
}

// ================== API金鑰管理器類 ==================
class APIKeyManager {
    constructor() {
        this.keys = new Map();
        this.encrypted = true;
        this.storageKey = 'encrypted_api_keys';
        this.loadStoredKeys();
    }

    /**
     * 簡單加密（實際應用中應使用更強的加密）
     * @param {string} text - 要加密的文本
     * @returns {string}
     */
    encrypt(text) {
        return btoa(encodeURIComponent(text));
    }

    /**
     * 簡單解密
     * @param {string} encrypted - 加密的文本
     * @returns {string}
     */
    decrypt(encrypted) {
        try {
            return decodeURIComponent(atob(encrypted));
        } catch {
            return '';
        }
    }

    /**
     * 加載存儲的API金鑰
     */
    loadStoredKeys() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const keys = JSON.parse(stored);
                Object.entries(keys).forEach(([provider, encryptedKey]) => {
                    const decryptedKey = this.decrypt(encryptedKey);
                    if (decryptedKey) {
                        this.keys.set(provider, decryptedKey);
                    }
                });
            }
        } catch (error) {
            console.error('載入API金鑰失敗:', error);
        }
    }

    /**
     * 保存API金鑰到本地存儲
     */
    saveKeys() {
        try {
            const keysObj = {};
            this.keys.forEach((key, provider) => {
                keysObj[provider] = this.encrypt(key);
            });
            localStorage.setItem(this.storageKey, JSON.stringify(keysObj));
        } catch (error) {
            console.error('保存API金鑰失敗:', error);
        }
    }

    /**
     * 設置API金鑰
     * @param {string} provider - 提供商名稱
     * @param {string} key - API金鑰
     * @returns {boolean}
     */
    setKey(provider, key) {
        const sanitizedKey = Utils.sanitizeApiKey(key);
        if (!sanitizedKey) {
            throw new ValidationError(`無效的API金鑰: ${provider}`);
        }

        this.keys.set(provider, sanitizedKey);
        this.saveKeys();
        return true;
    }

    /**
     * 獲取API金鑰
     * @param {string} provider - 提供商名稱
     * @returns {string|null}
     */
    getKey(provider) {
        return this.keys.get(provider) || null;
    }

    /**
     * 移除API金鑰
     * @param {string} provider - 提供商名稱
     * @returns {boolean}
     */
    removeKey(provider) {
        const result = this.keys.delete(provider);
        if (result) {
            this.saveKeys();
        }
        return result;
    }

    /**
     * 清空所有API金鑰
     */
    clearAll() {
        this.keys.clear();
        localStorage.removeItem(this.storageKey);
    }

    /**
     * 獲取所有已配置的提供商
     * @returns {Array}
     */
    getConfiguredProviders() {
        return Array.from(this.keys.keys());
    }

    /**
     * 驗證API金鑰格式
     * @param {string} provider - 提供商名稱
     * @param {string} key - API金鑰
     * @returns {boolean}
     */
    validateKeyFormat(provider, key) {
        const patterns = {
            gemini: /^AIza[0-9A-Za-z-_]{35}$/,
            openai: /^sk-[a-zA-Z0-9]{48}$/,
            stability: /^sk-[a-zA-Z0-9]{32,}$/,
            adobe_firefly: /^[a-f0-9]{32}$/,
            leonardo_ai: /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/
        };

        const pattern = patterns[provider];
        return pattern ? pattern.test(key) : key.length >= 8;
    }
}

// ================== 主要統一API管理器類 ==================
class UnifiedAPIManager {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.keyManager = new APIKeyManager();
        this.cache = new RequestCache();
        this.retryHandler = new RetryHandler();
        this.requestQueue = new Map();
        this.activeRequests = new Set();
        
        // 認證相關
        this.authToken = null;
        this.isRefreshingToken = false;
        
        // 統計信息
        this.stats = {
            requests: 0,
            successes: 0,
            failures: 0,
            cacheHits: 0,
            retries: 0
        };

        this.init();
    }

    /**
     * 初始化
     */
    init() {
        this.loadAuthToken();
        this.setupFetchInterceptor();
        this.setupErrorHandling();
        this.startPeriodicCleanup();
        
        console.log('🔧 統一API管理器v4.0已初始化');
    }

    /**
     * 載入認證令牌
     */
    loadAuthToken() {
        try {
            this.authToken = localStorage.getItem('auth_token');
        } catch (error) {
            console.warn('載入認證令牌失敗:', error);
        }
    }

    /**
     * 設置fetch攔截器
     */
    setupFetchInterceptor() {
        if (!window._originalFetch) {
            window._originalFetch = window.fetch;
        }

        window.fetch = (url, options = {}) => {
            return this.interceptedFetch(url, options);
        };
    }

    /**
     * 攔截的fetch函數
     * @param {string|Request} input - URL或Request對象
     * @param {Object} options - fetch選項
     * @returns {Promise<Response>}
     */
    async interceptedFetch(input, options = {}) {
        const requestId = Utils.generateId();
        
        try {
            this.stats.requests++;
            
            // 標準化請求
            const { url, config } = this.normalizeRequest(input, options);
            
            // 檢查緩存
            if (this.shouldUseCache(config.method, url)) {
                const cacheKey = this.cache.generateKey(config.method, url, config.body);
                const cached = this.cache.get(cacheKey);
                if (cached) {
                    this.stats.cacheHits++;
                    return new Response(JSON.stringify(cached), {
                        status: 200,
                        statusText: 'OK',
                        headers: { 'content-type': 'application/json' }
                    });
                }
            }

            // 添加到活動請求集合
            this.activeRequests.add(requestId);

            // 執行請求（帶重試）
            const response = await this.retryHandler.execute(
                () => this.makeRequest(url, config),
                [],
                (error, attempt) => {
                    if (error instanceof APIError && error.statusCode === 429) {
                        this.stats.retries++;
                        return true; // 重試速率限制錯誤
                    }
                    return this.retryHandler.defaultShouldRetry(error, attempt);
                }
            );

            // 處理響應
            const result = await this.processResponse(response, url, config);
            
            // 緩存成功的響應
            if (response.ok && this.shouldUseCache(config.method, url)) {
                const cacheKey = this.cache.generateKey(config.method, url, config.body);
                this.cache.set(cacheKey, result);
            }

            this.stats.successes++;
            return response;

        } catch (error) {
            this.stats.failures++;
            throw this.enhanceError(error, input, options);
        } finally {
            this.activeRequests.delete(requestId);
        }
    }

    /**
     * 標準化請求
     * @param {string|Request} input - 輸入
     * @param {Object} options - 選項
     * @returns {Object}
     */
    normalizeRequest(input, options) {
        let url, config;

        if (input instanceof Request) {
            url = input.url;
            config = {
                method: input.method,
                headers: Object.fromEntries(input.headers.entries()),
                body: input.body,
                ...options
            };
        } else {
            url = input.startsWith('http') ? input : `${this.baseURL}${input}`;
            config = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                ...options
            };
        }

        // 添加認證頭
        if (this.authToken && url.includes('/api/')) {
            config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        // 添加請求ID和時間戳
        config.headers['X-Request-ID'] = Utils.generateId();
        config.headers['X-Request-Time'] = new Date().toISOString();

        return { url, config };
    }

    /**
     * 執行實際請求
     * @param {string} url - URL
     * @param {Object} config - 配置
     * @returns {Promise<Response>}
     */
    async makeRequest(url, config) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, this.getTimeoutForUrl(url));

        try {
            const response = await window._originalFetch(url, {
                ...config,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw this.createErrorFromResponse(response, url);
            }

            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new NetworkError('請求超時', { url, timeout: this.getTimeoutForUrl(url) });
            }
            
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new NetworkError('網絡連接失敗', { url, originalError: error.message });
            }
            
            throw error;
        }
    }

    /**
     * 處理響應
     * @param {Response} response - 響應對象
     * @param {string} url - URL
     * @param {Object} config - 配置
     * @returns {Promise<*>}
     */
    async processResponse(response, url, config) {
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
            try {
                return await response.json();
            } catch (error) {
                throw new APIError('響應解析失敗', 'PARSE_ERROR', response.status, {
                    url,
                    contentType,
                    originalError: error.message
                });
            }
        }

        if (contentType?.includes('text/')) {
            return await response.text();
        }

        return await response.blob();
    }

    /**
     * 從響應創建錯誤
     * @param {Response} response - 響應對象
     * @param {string} url - URL
     * @returns {APIError}
     */
    createErrorFromResponse(response, url) {
        const statusCode = response.status;
        
        if (statusCode === 401) {
            return new AuthenticationError('認證失敗', { url, statusCode });
        }
        
        if (statusCode === 400) {
            return new ValidationError('請求參數錯誤', { url, statusCode });
        }
        
        if (statusCode >= 500) {
            return new APIError('服務器內部錯誤', 'SERVER_ERROR', statusCode, { url });
        }
        
        return new APIError(`HTTP錯誤 ${statusCode}`, 'HTTP_ERROR', statusCode, { url });
    }

    /**
     * 增強錯誤信息
     * @param {Error} error - 原始錯誤
     * @param {*} input - 輸入
     * @param {Object} options - 選項
     * @returns {Error}
     */
    enhanceError(error, input, options) {
        if (error instanceof APIError) {
            return error;
        }

        return new APIError(
            error.message || '未知錯誤',
            'UNKNOWN_ERROR',
            0,
            {
                originalError: error.name,
                input: typeof input === 'string' ? input : '[Request Object]',
                method: options.method || 'GET'
            }
        );
    }

    /**
     * 判斷是否應該使用緩存
     * @param {string} method - HTTP方法
     * @param {string} url - URL
     * @returns {boolean}
     */
    shouldUseCache(method, url) {
        if (method.toUpperCase() !== 'GET') return false;
        if (url.includes('/auth/')) return false;
        if (url.includes('/generate-image')) return false;
        return true;
    }

    /**
     * 獲取URL對應的超時時間
     * @param {string} url - URL
     * @returns {number}
     */
    getTimeoutForUrl(url) {
        if (url.includes('/generate-image')) {
            return API_CONFIG.TIMEOUTS.IMAGE_GENERATION;
        }
        if (url.includes('/health')) {
            return API_CONFIG.TIMEOUTS.HEALTH_CHECK;
        }
        return API_CONFIG.TIMEOUTS.DEFAULT;
    }

    /**
     * 設置錯誤處理
     */
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('全局錯誤:', event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('未處理的Promise拒絕:', event.reason);
        });
    }

    /**
     * 開始定期清理
     */
    startPeriodicCleanup() {
        setInterval(() => {
            this.cleanup();
        }, 300000); // 每5分鐘清理一次
    }

    /**
     * 清理資源
     */
    cleanup() {
        // 清理過期緩存
        const stats = this.cache.getStats();
        if (stats.expired > 0) {
            console.log(`清理了 ${stats.expired} 個過期緩存條目`);
        }

        // 重置統計信息（如果請求數量過大）
        if (this.stats.requests > 10000) {
            const successRate = (this.stats.successes / this.stats.requests * 100).toFixed(2);
            console.log(`重置統計信息 - 成功率: ${successRate}%`);
            
            this.stats = {
                requests: 0,
                successes: 0,
                failures: 0,
                cacheHits: 0,
                retries: 0
            };
        }
    }

    // ================== 公共API方法 ==================

    /**
     * 生成圖片
     * @param {string} prompt - 提示詞
     * @param {Object} options - 選項
     * @returns {Promise<Object>}
     */
    async generateImage(prompt, options = {}) {
        const {
            imageSize = '1024x1024',
            imageCount = 1,
            apiProvider = 'gemini',
            model = ''
        } = options;

        // 驗證參數
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            throw new ValidationError('提示詞不能為空');
        }

        if (imageCount < 1 || imageCount > 5) {
            throw new ValidationError('圖片數量必須在1-5之間');
        }

        // 獲取API金鑰
        const apiKey = this.keyManager.getKey(apiProvider);
        if (!apiKey && apiProvider !== 'midjourney') {
            throw new ValidationError(`請設置 ${apiProvider} API 金鑰`);
        }

        // 驗證API金鑰格式
        if (apiKey && !this.keyManager.validateKeyFormat(apiProvider, apiKey)) {
            throw new ValidationError(`${apiProvider} API 金鑰格式無效`);
        }

        const requestData = {
            prompt: prompt.trim(),
            image_size: imageSize,
            image_count: imageCount,
            api_provider: apiProvider,
            api_key: apiKey,
            model: model || this.getDefaultModel(apiProvider)
        };

        return await this.post(API_CONFIG.ENDPOINTS.GENERATE_IMAGE, requestData);
    }

    /**
     * 使用自定義API生成圖片
     * @param {string} prompt - 提示詞
     * @param {Object} options - 選項
     * @returns {Promise<Object>}
     */
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

        // 驗證參數
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            throw new ValidationError('提示詞不能為空');
        }

        if (!apiUrl || !Utils.isValidUrl(apiUrl)) {
            throw new ValidationError('請輸入有效的 API 端點 URL');
        }

        // 構建請求頭
        const headers = {
            'Content-Type': 'application/json',
            ...customHeaders
        };

        if (apiKey) {
            headers.Authorization = `Bearer ${apiKey}`;
        }

        // 構建請求體
        let requestBody;
        if (requestTemplate) {
            try {
                requestBody = requestTemplate
                    .replace(/{PROMPT}/g, prompt.trim())
                    .replace(/{SIZE}/g, imageSize)
                    .replace(/{COUNT}/g, imageCount)
                    .replace(/{MODEL}/g, model || '');
                
                requestBody = JSON.parse(requestBody);
            } catch (error) {
                throw new ValidationError('請求模板格式錯誤，請使用有效的 JSON 格式');
            }
        } else {
            requestBody = {
                prompt: prompt.trim(),
                size: imageSize,
                n: imageCount
            };
            if (model) requestBody.model = model;
        }

        const requestOptions = {
            method: 'POST',
            headers,
            body: format === 'json' ? JSON.stringify(requestBody) : new URLSearchParams(requestBody)
        };

        const response = await window._originalFetch(apiUrl, requestOptions);
        
        if (!response.ok) {
            throw new APIError(`自定義API請求失敗: ${response.status} ${response.statusText}`, 'CUSTOM_API_ERROR', response.status);
        }

        const result = await response.json();
        return this.parseCustomApiResponse(result);
    }

    /**
     * 解析自定義API響應
     * @param {Object} response - 響應對象
     * @returns {Object}
     */
    parseCustomApiResponse(response) {
        // OpenAI格式
        if (response.data) {
            const images = response.data.map(item => ({
                url: item.url,
                base64: item.b64_json
            }));
            return { success: true, images };
        }

        // Stability AI格式
        if (response.artifacts) {
            const images = response.artifacts.map(artifact => ({
                base64: artifact.base64
            }));
            return { success: true, images };
        }

        // 通用格式
        if (response.images) {
            return { success: true, images: response.images };
        }

        // 單張圖片格式
        if (response.url || response.b64_json) {
            return { 
                success: true, 
                images: [{ 
                    url: response.url, 
                    base64: response.b64_json 
                }] 
            };
        }

        return { success: false, error: '無法解析API響應格式' };
    }

    /**
     * 獲取默認模型
     * @param {string} provider - 提供商
     * @returns {string}
     */
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

    /**
     * GET請求
     * @param {string} url - URL
     * @param {Object} options - 選項
     * @returns {Promise<*>}
     */
    async get(url, options = {}) {
        const response = await fetch(url, { method: 'GET', ...options });
        return await response.json();
    }

    /**
     * POST請求
     * @param {string} url - URL
     * @param {*} data - 數據
     * @param {Object} options - 選項
     * @returns {Promise<*>}
     */
    async post(url, data, options = {}) {
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(data),
            ...options
        });
        return await response.json();
    }

    /**
     * PUT請求
     * @param {string} url - URL
     * @param {*} data - 數據
     * @param {Object} options - 選項
     * @returns {Promise<*>}
     */
    async put(url, data, options = {}) {
        const response = await fetch(url, {
            method: 'PUT',
            body: JSON.stringify(data),
            ...options
        });
        return await response.json();
    }

    /**
     * DELETE請求
     * @param {string} url - URL
     * @param {Object} options - 選項
     * @returns {Promise<*>}
     */
    async delete(url, options = {}) {
        const response = await fetch(url, { method: 'DELETE', ...options });
        return await response.json();
    }

    /**
     * 獲取統計信息
     * @returns {Object}
     */
    getStats() {
        return {
            ...this.stats,
            cache: this.cache.getStats(),
            activeRequests: this.activeRequests.size,
            configuredProviders: this.keyManager.getConfiguredProviders()
        };
    }

    /**
     * 重置統計信息
     */
    resetStats() {
        this.stats = {
            requests: 0,
            successes: 0,
            failures: 0,
            cacheHits: 0,
            retries: 0
        };
    }

    /**
     * 清空緩存
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * 取消所有活動請求
     */
    cancelAllRequests() {
        // 注意：實際實現需要更複雜的邏輯來跟踪和取消請求
        console.log(`取消 ${this.activeRequests.size} 個活動請求`);
        this.activeRequests.clear();
    }

    /**
     * 銷毀實例
     */
    destroy() {
        this.cancelAllRequests();
        this.clearCache();
        this.keyManager.clearAll();
        
        // 恢復原始fetch
        if (window._originalFetch) {
            window.fetch = window._originalFetch;
            delete window._originalFetch;
        }
        
        console.log('統一API管理器已銷毀');
    }
}

// ================== 初始化和導出 ==================
// 創建全局實例
const unifiedAPIManager = new UnifiedAPIManager();

// 暴露到全局作用域
window.unifiedAPI = unifiedAPIManager;

// 導出類和實例
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        UnifiedAPIManager,
        APIError,
        NetworkError,
        AuthenticationError,
        ValidationError,
        unifiedAPIManager
    };
}

console.log('✅ 統一API管理器v4.0已載入'); 