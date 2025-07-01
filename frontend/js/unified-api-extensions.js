/**
 * 統一API管理器擴展 v1.0
 * 為統一API管理器添加處理器註冊和事件分發功能
 */

// 等待統一API管理器載入
document.addEventListener('DOMContentLoaded', function() {
    // 確保統一API管理器已載入
    if (!window.unifiedAPI) {
        console.error('統一API管理器未找到');
        return;
    }
    
    // ==================== 處理器註冊方法 ====================
    
    // 註冊認證處理器
    window.unifiedAPI.registerAuthHandler = function(authHandler) {
        this.authHandler = authHandler;
        console.log('✅ 認證處理器已註冊到統一API管理器');
        
        // 整合認證處理
        this.addInterceptor(async (url, options) => {
            if (url.includes('/api/') && this.authHandler) {
                const token = this.authHandler.getToken();
                if (token && this.authHandler.isAuthenticated()) {
                    options.headers = {
                        ...options.headers,
                        'Authorization': `Bearer ${token}`
                    };
                }
            }
            return options;
        });
    };
    
    // 註冊快取處理器
    window.unifiedAPI.registerCacheHandler = function(cacheHandler) {
        this.cacheHandler = cacheHandler;
        console.log('✅ 快取處理器已註冊到統一API管理器');
    };
    
    // ==================== 事件分發系統 ====================
    
    // 事件分發方法
    window.unifiedAPI.dispatchEvent = function(eventType, detail) {
        document.dispatchEvent(new CustomEvent(eventType, { detail }));
    };
    
    // ==================== 增強的攔截器 ====================
    
    // 保存原始攔截器方法
    const originalInterceptedFetch = window.unifiedAPI.interceptedFetch;
    
    // 增強的攔截器，支援事件分發和快取
    window.unifiedAPI.interceptedFetch = async function(url, options = {}) {
        const requestId = ++this.requestIdCounter;
        const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;
        
        // 分發請求開始事件
        this.dispatchEvent('apiRequestStart', { 
            requestId, 
            url: fullURL, 
            options: { ...options },
            timestamp: Date.now()
        });
        
        try {
            // 檢查快取
            if (this.cacheHandler && this.cacheHandler.shouldUseCache(options)) {
                const cacheKey = this.cacheHandler.generateCacheKey(fullURL, options);
                
                if (this.cacheHandler.cache.has(cacheKey)) {
                    const cachedResponse = this.cacheHandler.cache.get(cacheKey);
                    if (!this.cacheHandler.isCacheExpired(cachedResponse)) {
                        this.cacheHandler.performanceMetrics.cacheHits++;
                        
                        // 分發快取命中事件
                        this.dispatchEvent('apiRequestEnd', { 
                            requestId, 
                            url: fullURL, 
                            status: 200, 
                            cached: true,
                            timestamp: Date.now()
                        });
                        
                        return Promise.resolve(cachedResponse.response.clone());
                    }
                }
            }
            
            // 執行原始攔截邏輯
            const response = await originalInterceptedFetch.call(this, url, options);
            
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
                status: response.status,
                cached: false,
                timestamp: Date.now()
            });
            
            return response;
            
        } catch (error) {
            // 分發請求錯誤事件
            this.dispatchEvent('apiRequestError', { 
                requestId, 
                url: fullURL, 
                error: error.message,
                timestamp: Date.now()
            });
            
            // 如果有過期的快取，嘗試使用它
            if (this.cacheHandler) {
                const cacheKey = this.cacheHandler.generateCacheKey(fullURL, options);
                if (this.cacheHandler.cache.has(cacheKey)) {
                    const cachedResponse = this.cacheHandler.cache.get(cacheKey);
                    console.warn('使用過期快取回應網路錯誤:', error);
                    
                    // 分發使用過期快取事件
                    this.dispatchEvent('apiRequestEnd', { 
                        requestId, 
                        url: fullURL, 
                        status: 200, 
                        cached: true,
                        expired: true,
                        timestamp: Date.now()
                    });
                    
                    return cachedResponse.response.clone();
                }
            }
            
            throw error;
        }
    };
    
    // ==================== 認證錯誤處理增強 ====================
    
    // 保存原始認證錯誤處理方法
    const originalHandleAuthError = window.unifiedAPI.handleAuthError;
    
    // 增強的認證錯誤處理
    window.unifiedAPI.handleAuthError = async function(url, options) {
        if (this.authHandler) {
            try {
                await this.authHandler.handleAuthError();
                
                // 如果認證處理器成功刷新了token，重試請求
                if (this.authHandler.isAuthenticated()) {
                    const newToken = this.authHandler.getToken();
                    if (newToken) {
                        this.setToken(newToken);
                        
                        // 更新請求頭並重試
                        options.headers = {
                            ...options.headers,
                            'Authorization': `Bearer ${newToken}`
                        };
                        
                        return window._originalFetch(url, options);
                    }
                }
            } catch (error) {
                console.error('認證處理器處理失敗:', error);
            }
        }
        
        // 回退到原始處理方法
        return originalHandleAuthError.call(this, url, options);
    };
    
    // ==================== 初始化計數器 ====================
    
    // 初始化請求ID計數器
    if (!window.unifiedAPI.requestIdCounter) {
        window.unifiedAPI.requestIdCounter = 0;
    }
    
    console.log('🔧 統一API管理器擴展已載入');
});

// 提供全局事件監聽器幫助函數
window.onAPIRequestStart = function(callback) {
    document.addEventListener('apiRequestStart', callback);
};

window.onAPIRequestEnd = function(callback) {
    document.addEventListener('apiRequestEnd', callback);
};

window.onAPIRequestError = function(callback) {
    document.addEventListener('apiRequestError', callback);
};

console.log('�� 統一API管理器擴展腳本已載入'); 