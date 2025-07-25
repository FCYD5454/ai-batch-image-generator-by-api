/**
 * 整合修復腳本 v1.0
 * 修復前端和後端連接問題，整合所有模組使用統一API管理器
 */

console.log('🔧 正在載入整合修復腳本...');

// 等待所有依賴載入完成
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 開始執行整合修復...');
    
    // 擴展統一API管理器以支持註冊功能
    if (window.unifiedAPI && !window.unifiedAPI.registerAuthHandler) {
        // 添加處理器註冊方法
        window.unifiedAPI.registerAuthHandler = function(authHandler) {
            this.authHandler = authHandler;
            console.log('✅ 認證處理器已註冊');
            
            // 添加認證攔截器
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
        
        window.unifiedAPI.registerCacheHandler = function(cacheHandler) {
            this.cacheHandler = cacheHandler;
            console.log('✅ 快取處理器已註冊');
        };
        
        // 添加事件分發方法
        window.unifiedAPI.dispatchEvent = function(eventType, detail) {
            document.dispatchEvent(new CustomEvent(eventType, { detail }));
        };
        
        // 增強攔截器以支持事件分發
        if (!window.unifiedAPI._eventEnhanced) {
            const originalInterceptedFetch = window.unifiedAPI.interceptedFetch;
            
            window.unifiedAPI.interceptedFetch = async function(url, options = {}) {
                const requestId = ++this.requestIdCounter || 1;
                const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;
                
                // 分發請求開始事件
                this.dispatchEvent('apiRequestStart', { 
                    requestId, 
                    url: fullURL, 
                    options: { ...options },
                    timestamp: Date.now()
                });
                
                try {
                    const response = await originalInterceptedFetch.call(this, url, options);
                    
                    // 分發請求完成事件
                    this.dispatchEvent('apiRequestEnd', { 
                        requestId, 
                        url: fullURL, 
                        status: response.status,
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
                    
                    throw error;
                }
            };
            
            window.unifiedAPI._eventEnhanced = true;
            window.unifiedAPI.requestIdCounter = 0;
        }
        
        console.log('🔧 統一API管理器擴展完成');
    }
    
    // 設置UX增強事件監聽
    document.addEventListener('apiRequestStart', (event) => {
        if (window.uxEnhancement && window.uxEnhancement.showLoadingIndicator) {
            event.detail.loadingId = window.uxEnhancement.showLoadingIndicator('正在處理請求...');
        }
    });
    
    document.addEventListener('apiRequestEnd', (event) => {
        if (window.uxEnhancement && window.uxEnhancement.hideLoadingIndicator && event.detail.loadingId) {
            window.uxEnhancement.hideLoadingIndicator(event.detail.loadingId);
        }
    });
    
    document.addEventListener('apiRequestError', (event) => {
        if (window.uxEnhancement && window.uxEnhancement.hideLoadingIndicator && event.detail.loadingId) {
            window.uxEnhancement.hideLoadingIndicator(event.detail.loadingId);
        }
    });
    
    console.log('🎉 整合修復完成！');
});

console.log('🚀 整合修復腳本載入完成');
