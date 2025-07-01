/**
 * 載入指示器修正腳本
 * 專門解決重複顯示"正在處理請求..."的問題
 */

class LoadingIndicatorFix {
    constructor() {
        this.activeIndicators = new Set();
        this.maxIndicators = 1; // 最多只允許1個載入指示器
        this.isBlockingRequests = false;
        this.init();
    }

    init() {
        console.log('🔧 載入指示器修正已啟動');
        this.interceptUXEnhancement();
        this.interceptAPIEvents();
        this.setupTabClickFix();
        this.startPeriodicCleanup();
    }

    // 攔截並修正 UX Enhancement 的載入指示器
    interceptUXEnhancement() {
        // 等待 UX Enhancement 載入
        const waitForUXEnhancement = () => {
            if (window.uxEnhancement || window.UXEnhancement) {
                this.fixUXEnhancement();
            } else {
                setTimeout(waitForUXEnhancement, 500);
            }
        };
        waitForUXEnhancement();

        // 也監聽全局對象
        Object.defineProperty(window, 'uxEnhancement', {
            set: (value) => {
                this._uxEnhancement = value;
                if (value) this.fixUXEnhancement();
            },
            get: () => this._uxEnhancement
        });
    }

    fixUXEnhancement() {
        const uxInstance = window.uxEnhancement || window.UXEnhancement;
        if (!uxInstance) return;

        console.log('🔧 修正 UX Enhancement 載入指示器');

        // 保存原始方法
        const originalShowLoadingIndicator = uxInstance.showLoadingIndicator;
        const originalHideLoadingIndicator = uxInstance.hideLoadingIndicator;

        // 重寫 showLoadingIndicator 方法
        uxInstance.showLoadingIndicator = (message = '載入中...') => {
            // 檢查是否已經有太多載入指示器
            if (this.activeIndicators.size >= this.maxIndicators) {
                console.log('🚫 已達到載入指示器上限，跳過新的指示器');
                return Array.from(this.activeIndicators)[0]; // 返回現有指示器的 ID
            }

            // 檢查是否有相同消息的指示器
            const existingIndicators = document.querySelectorAll('.loading-indicator');
            for (const indicator of existingIndicators) {
                const messageElement = indicator.querySelector('.loading-message');
                if (messageElement && messageElement.textContent === message) {
                    console.log('🚫 跳過重複的載入指示器:', message);
                    return indicator.id.replace('loading-', '');
                }
            }

            // 調用原始方法
            const id = originalShowLoadingIndicator.call(uxInstance, message);
            this.activeIndicators.add(id);
            
            console.log('✅ 顯示載入指示器:', message, 'ID:', id);
            return id;
        };

        // 重寫 hideLoadingIndicator 方法
        uxInstance.hideLoadingIndicator = (id) => {
            if (this.activeIndicators.has(id)) {
                this.activeIndicators.delete(id);
                console.log('✅ 隱藏載入指示器 ID:', id);
            }
            
            return originalHideLoadingIndicator.call(uxInstance, id);
        };

        // 修正 enhanceProgressFeedback 方法
        if (uxInstance.enhanceProgressFeedback) {
            uxInstance.enhanceProgressFeedback = () => {
                console.log('🔧 使用修正的進度反饋');
                
                // 移除舊的事件監聽器
                document.removeEventListener('apiRequestStart', this.handleAPIRequestStart);
                document.removeEventListener('apiRequestEnd', this.handleAPIRequestEnd);
                document.removeEventListener('apiRequestError', this.handleAPIRequestError);
                
                // 添加新的事件監聽器
                document.addEventListener('apiRequestStart', this.handleAPIRequestStart.bind(this));
                document.addEventListener('apiRequestEnd', this.handleAPIRequestEnd.bind(this));
                document.addEventListener('apiRequestError', this.handleAPIRequestError.bind(this));
            };
        }
    }

    // API 事件處理器
    handleAPIRequestStart = (event) => {
        if (this.isBlockingRequests) {
            console.log('🚫 請求被阻止，跳過載入指示器');
            return;
        }

        // 只有在沒有活動指示器時才顯示新的
        if (this.activeIndicators.size === 0) {
            const loadingId = window.uxEnhancement?.showLoadingIndicator('正在處理請求...');
            if (loadingId && event.detail) {
                event.detail.loadingId = loadingId;
            }
        } else {
            console.log('🚫 已有活動載入指示器，跳過新的');
        }
    };

    handleAPIRequestEnd = (event) => {
        if (event.detail?.loadingId) {
            window.uxEnhancement?.hideLoadingIndicator(event.detail.loadingId);
        }
        
        // 清理所有載入指示器（以防萬一）
        this.cleanupStaleIndicators();
    };

    handleAPIRequestError = (event) => {
        if (event.detail?.loadingId) {
            window.uxEnhancement?.hideLoadingIndicator(event.detail.loadingId);
        }
        
        // 清理所有載入指示器
        this.cleanupStaleIndicators();
    };

    // 攔截 API 事件來防止重複載入指示器
    interceptAPIEvents() {
        let eventCount = 0;
        const maxEventsPerSecond = 3; // 每秒最多3個事件
        
        // 攔截 apiRequestStart 事件
        const originalAddEventListener = document.addEventListener;
        document.addEventListener = function(type, listener, options) {
            if (type === 'apiRequestStart') {
                const wrappedListener = (event) => {
                    eventCount++;
                    
                    // 重置事件計數器
                    setTimeout(() => { eventCount = Math.max(0, eventCount - 1); }, 1000);
                    
                    // 如果事件太頻繁，忽略它們
                    if (eventCount > maxEventsPerSecond) {
                        console.log('🚫 API 事件太頻繁，忽略');
                        return;
                    }
                    
                    listener(event);
                };
                originalAddEventListener.call(this, type, wrappedListener, options);
            } else {
                originalAddEventListener.call(this, type, listener, options);
            }
        };
    }

    // 修正標籤點擊引起的問題
    setupTabClickFix() {
        document.addEventListener('click', (e) => {
            const isTabButton = e.target.classList.contains('tab-button') || 
                               e.target.closest('.tab-button');
            
            if (isTabButton) {
                console.log('🔧 標籤點擊修正');
                
                // 阻止後續請求一段時間
                this.isBlockingRequests = true;
                
                // 清理現有載入指示器
                this.cleanupStaleIndicators();
                
                // 1秒後重新允許請求
                setTimeout(() => {
                    this.isBlockingRequests = false;
                }, 1000);
            }
        });
    }

    // 清理過期的載入指示器
    cleanupStaleIndicators() {
        const indicators = document.querySelectorAll('.loading-indicator');
        indicators.forEach(indicator => {
            indicator.remove();
        });
        this.activeIndicators.clear();
        console.log('🧹 已清理所有載入指示器');
    }

    // 定期清理
    startPeriodicCleanup() {
        setInterval(() => {
            // 檢查是否有孤立的載入指示器
            const indicators = document.querySelectorAll('.loading-indicator');
            if (indicators.length > this.maxIndicators) {
                console.log('🧹 檢測到過多載入指示器，執行清理');
                this.cleanupStaleIndicators();
            }
        }, 5000); // 每5秒檢查一次
    }

    // 手動清理函數
    forceCleanup() {
        this.cleanupStaleIndicators();
        this.isBlockingRequests = false;
        console.log('🔧 強制清理完成');
    }

    // 獲取狀態
    getStatus() {
        return {
            activeIndicators: this.activeIndicators.size,
            isBlocking: this.isBlockingRequests,
            indicatorsInDOM: document.querySelectorAll('.loading-indicator').length
        };
    }
}

// 立即初始化
document.addEventListener('DOMContentLoaded', () => {
    window.loadingIndicatorFix = new LoadingIndicatorFix();
});

// 如果已經載入完成，立即初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.loadingIndicatorFix = new LoadingIndicatorFix();
    });
} else {
    window.loadingIndicatorFix = new LoadingIndicatorFix();
}

// 提供全局修正函數
window.fixLoadingIndicators = () => {
    if (window.loadingIndicatorFix) {
        window.loadingIndicatorFix.forceCleanup();
    } else {
        window.loadingIndicatorFix = new LoadingIndicatorFix();
    }
    console.log('🔧 手動修正載入指示器');
};

console.log('🚀 載入指示器修正腳本已載入'); 