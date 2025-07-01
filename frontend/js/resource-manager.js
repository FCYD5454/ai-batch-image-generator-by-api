/**
 * 統一資源管理器 - 解決記憶體洩漏和資源清理問題
 * 版本: 1.0
 * 作者: AI Image Generation Platform
 */

class ResourceManager {
    constructor() {
        this.timers = new Map(); // 定時器追蹤
        this.eventListeners = new Map(); // 事件監聽器追蹤
        this.observers = new Set(); // Observer 物件追蹤
        this.components = new Map(); // 組件生命週期追蹤
        this.cleanupHandlers = new Set(); // 自定義清理處理器
        
        this.memoryThreshold = 150; // MB - 記憶體警告閾值
        this.maxCacheSize = 1000; // 最大快取項目數
        
        this.isInitialized = false;
        this.isDestroyed = false;
        
        // 性能監控指標
        this.metrics = {
            timersCount: 0,
            listenersCount: 0,
            observersCount: 0,
            memoryUsage: 0,
            lastCleanup: Date.now()
        };
        
        this.init();
    }
    
    init() {
        if (this.isInitialized) {
            console.warn('ResourceManager 已經初始化');
            return;
        }
        
        console.log('🚀 初始化資源管理器...');
        
        // 設置頁面卸載清理
        this.setupPageUnloadCleanup();
        
        // 設置定期清理
        this.setupPeriodicCleanup();
        
        // 設置記憶體監控
        this.setupMemoryMonitoring();
        
        // 攔截原生定時器函數
        this.interceptTimerFunctions();
        
        // 攔截 addEventListener
        this.interceptEventListeners();
        
        this.isInitialized = true;
        console.log('✅ 資源管理器初始化完成');
    }
    
    // ==================== 定時器管理 ====================
    
    interceptTimerFunctions() {
        // 保存原始函數
        if (!window._originalSetInterval) {
            window._originalSetInterval = window.setInterval;
            window._originalSetTimeout = window.setTimeout;
            window._originalClearInterval = window.clearInterval;
            window._originalClearTimeout = window.clearTimeout;
        }
        
        // 攔截 setInterval
        window.setInterval = (callback, delay, ...args) => {
            const timerId = window._originalSetInterval(callback, delay, ...args);
            this.registerTimer(timerId, 'interval', callback, delay);
            return timerId;
        };
        
        // 攔截 setTimeout
        window.setTimeout = (callback, delay, ...args) => {
            const timerId = window._originalSetTimeout(callback, delay, ...args);
            this.registerTimer(timerId, 'timeout', callback, delay);
            return timerId;
        };
        
        // 攔截 clearInterval
        window.clearInterval = (timerId) => {
            this.unregisterTimer(timerId);
            return window._originalClearInterval(timerId);
        };
        
        // 攔截 clearTimeout
        window.clearTimeout = (timerId) => {
            this.unregisterTimer(timerId);
            return window._originalClearTimeout(timerId);
        };
    }
    
    registerTimer(timerId, type, callback, delay) {
        this.timers.set(timerId, {
            id: timerId,
            type: type,
            callback: callback,
            delay: delay,
            createdAt: Date.now(),
            stackTrace: new Error().stack
        });
        
        this.metrics.timersCount++;
        
        // 如果是長時間定時器，給出警告
        if (delay >= 300000) { // 5分鐘以上
            console.warn(`⚠️ 長時間定時器創建: ${delay}ms`, { timerId, type });
        }
    }
    
    unregisterTimer(timerId) {
        if (this.timers.has(timerId)) {
            this.timers.delete(timerId);
            this.metrics.timersCount--;
        }
    }
    
    clearAllTimers() {
        console.log(`🧹 清理 ${this.timers.size} 個定時器...`);
        
        for (const [timerId, timerInfo] of this.timers) {
            if (timerInfo.type === 'interval') {
                window._originalClearInterval(timerId);
            } else {
                window._originalClearTimeout(timerId);
            }
        }
        
        this.timers.clear();
        this.metrics.timersCount = 0;
    }
    
    // ==================== 事件監聽器管理 ====================
    
    interceptEventListeners() {
        if (!Element.prototype._originalAddEventListener) {
            Element.prototype._originalAddEventListener = Element.prototype.addEventListener;
            Element.prototype._originalRemoveEventListener = Element.prototype.removeEventListener;
            Document.prototype._originalAddEventListener = Document.prototype.addEventListener;
            Document.prototype._originalRemoveEventListener = Document.prototype.removeEventListener;
            Window.prototype._originalAddEventListener = Window.prototype.addEventListener;
            Window.prototype._originalRemoveEventListener = Window.prototype.removeEventListener;
        }
        
        // 攔截 addEventListener
        const interceptAddEventListener = (original) => {
            return function(type, listener, options) {
                window.resourceManager?.registerEventListener(this, type, listener, options);
                return original.call(this, type, listener, options);
            };
        };
        
        // 攔截 removeEventListener
        const interceptRemoveEventListener = (original) => {
            return function(type, listener, options) {
                window.resourceManager?.unregisterEventListener(this, type, listener, options);
                return original.call(this, type, listener, options);
            };
        };
        
        Element.prototype.addEventListener = interceptAddEventListener(Element.prototype._originalAddEventListener);
        Element.prototype.removeEventListener = interceptRemoveEventListener(Element.prototype._originalRemoveEventListener);
        Document.prototype.addEventListener = interceptAddEventListener(Document.prototype._originalAddEventListener);
        Document.prototype.removeEventListener = interceptRemoveEventListener(Document.prototype._originalRemoveEventListener);
        Window.prototype.addEventListener = interceptAddEventListener(Window.prototype._originalAddEventListener);
        Window.prototype.removeEventListener = interceptRemoveEventListener(Window.prototype._originalRemoveEventListener);
    }
    
    registerEventListener(target, type, listener, options) {
        const key = this.getEventListenerKey(target, type, listener);
        
        this.eventListeners.set(key, {
            target: target,
            type: type,
            listener: listener,
            options: options,
            createdAt: Date.now(),
            stackTrace: new Error().stack
        });
        
        this.metrics.listenersCount++;
    }
    
    unregisterEventListener(target, type, listener) {
        const key = this.getEventListenerKey(target, type, listener);
        
        if (this.eventListeners.has(key)) {
            this.eventListeners.delete(key);
            this.metrics.listenersCount--;
        }
    }
    
    getEventListenerKey(target, type, listener) {
        return `${target.constructor.name}-${type}-${listener.toString().substring(0, 50)}`;
    }
    
    clearAllEventListeners() {
        console.log(`🧹 清理 ${this.eventListeners.size} 個事件監聽器...`);
        
        for (const [key, listenerInfo] of this.eventListeners) {
            try {
                const { target, type, listener, options } = listenerInfo;
                if (target._originalRemoveEventListener) {
                    target._originalRemoveEventListener(type, listener, options);
                } else if (target.removeEventListener) {
                    target.removeEventListener(type, listener, options);
                }
            } catch (error) {
                console.warn('清理事件監聽器時出錯:', error);
            }
        }
        
        this.eventListeners.clear();
        this.metrics.listenersCount = 0;
    }
    
    // ==================== Observer 管理 ====================
    
    registerObserver(observer, type = 'unknown') {
        observer._resourceManagerType = type;
        observer._resourceManagerCreatedAt = Date.now();
        this.observers.add(observer);
        this.metrics.observersCount++;
        
        console.log(`📊 註冊 Observer: ${type}`);
    }
    
    unregisterObserver(observer) {
        if (this.observers.has(observer)) {
            this.observers.delete(observer);
            this.metrics.observersCount--;
        }
    }
    
    clearAllObservers() {
        console.log(`🧹 清理 ${this.observers.size} 個 Observer...`);
        
        for (const observer of this.observers) {
            try {
                if (observer.disconnect) {
                    observer.disconnect();
                } else if (observer.stop) {
                    observer.stop();
                } else if (observer.close) {
                    observer.close();
                }
            } catch (error) {
                console.warn('清理 Observer 時出錯:', error);
            }
        }
        
        this.observers.clear();
        this.metrics.observersCount = 0;
    }
    
    // ==================== 組件生命週期管理 ====================
    
    registerComponent(name, component) {
        this.components.set(name, {
            instance: component,
            createdAt: Date.now(),
            destroyed: false
        });
        
        console.log(`🔗 註冊組件: ${name}`);
    }
    
    unregisterComponent(name) {
        if (this.components.has(name)) {
            const componentInfo = this.components.get(name);
            
            // 調用組件的清理方法
            if (componentInfo.instance.destroy) {
                componentInfo.instance.destroy();
            } else if (componentInfo.instance.cleanup) {
                componentInfo.instance.cleanup();
            }
            
            componentInfo.destroyed = true;
            this.components.delete(name);
            
            console.log(`🗑️ 卸載組件: ${name}`);
        }
    }
    
    clearAllComponents() {
        console.log(`🧹 清理 ${this.components.size} 個組件...`);
        
        for (const [name, componentInfo] of this.components) {
            if (!componentInfo.destroyed) {
                this.unregisterComponent(name);
            }
        }
    }
    
    // ==================== 記憶體監控 ====================
    
    setupMemoryMonitoring() {
        // 每2分鐘檢查一次記憶體使用
        this.registerManagedTimer(() => {
            this.checkMemoryUsage();
        }, 2 * 60 * 1000, 'memory-monitor');
    }
    
    checkMemoryUsage() {
        if ('memory' in performance) {
            const memInfo = performance.memory;
            const usedMB = Math.round(memInfo.usedJSHeapSize / 1024 / 1024);
            const totalMB = Math.round(memInfo.totalJSHeapSize / 1024 / 1024);
            const limitMB = Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024);
            
            this.metrics.memoryUsage = usedMB;
            
            // 記憶體使用過高警告
            if (usedMB > this.memoryThreshold) {
                console.warn(`💾 記憶體使用過高: ${usedMB}MB / ${limitMB}MB`);
                this.triggerEmergencyCleanup();
            }
            
            // 記錄資源使用狀況
            if (usedMB > 100) { // 超過100MB時記錄
                console.log(`📊 資源使用狀況:`, {
                    memory: `${usedMB}MB / ${limitMB}MB`,
                    timers: this.metrics.timersCount,
                    listeners: this.metrics.listenersCount,
                    observers: this.metrics.observersCount
                });
            }
        }
    }
    
    triggerEmergencyCleanup() {
        console.warn('🚨 觸發緊急清理程序...');
        
        // 清理過期的快取
        this.clearExpiredCaches();
        
        // 清理長時間未使用的定時器
        this.clearOldTimers();
        
        // 強制垃圾回收（如果支援）
        if (window.gc) {
            window.gc();
        }
        
        this.metrics.lastCleanup = Date.now();
    }
    
    clearExpiredCaches() {
        // 通知所有組件清理快取
        for (const [name, componentInfo] of this.components) {
            const component = componentInfo.instance;
            if (component.clearCache) {
                component.clearCache();
            } else if (component.cache && component.cache.clear) {
                component.cache.clear();
            }
        }
    }
    
    clearOldTimers() {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const toDelete = [];
        
        for (const [timerId, timerInfo] of this.timers) {
            if (timerInfo.createdAt < oneHourAgo && timerInfo.type === 'interval') {
                toDelete.push(timerId);
            }
        }
        
        toDelete.forEach(timerId => {
            console.log(`🗑️ 清理長時間定時器: ${timerId}`);
            if (this.timers.get(timerId)?.type === 'interval') {
                window._originalClearInterval(timerId);
            } else {
                window._originalClearTimeout(timerId);
            }
            this.unregisterTimer(timerId);
        });
    }
    
    // ==================== 清理管理 ====================
    
    registerManagedTimer(callback, delay, name = 'unnamed') {
        // 使用原始函數或降級到現有函數
        const setIntervalFunc = window._originalSetInterval || setInterval;
        
        const timerId = setIntervalFunc(() => {
            try {
                callback();
            } catch (error) {
                console.error(`定時器執行出錯 (${name}):`, error);
            }
        }, delay);
        
        this.registerTimer(timerId, 'interval', callback, delay);
        return timerId;
    }
    
    registerCleanupHandler(handler) {
        this.cleanupHandlers.add(handler);
    }
    
    setupPageUnloadCleanup() {
        window.addEventListener('beforeunload', () => {
            this.destroy();
        });
        
        window.addEventListener('pagehide', () => {
            this.destroy();
        });
        
        // 處理 SPA 路由變化
        if (window.addEventListener) {
            window.addEventListener('popstate', () => {
                this.partialCleanup();
            });
        }
    }
    
    setupPeriodicCleanup() {
        // 每10分鐘執行一次定期清理
        this.registerManagedTimer(() => {
            this.performPeriodicCleanup();
        }, 10 * 60 * 1000, 'periodic-cleanup');
    }
    
    performPeriodicCleanup() {
        console.log('🧹 執行定期清理...');
        
        // 清理過期的快取
        this.clearExpiredCaches();
        
        // 清理已完成的 setTimeout
        this.clearCompletedTimeouts();
        
        // 檢查組件狀態
        this.checkComponentHealth();
        
        this.metrics.lastCleanup = Date.now();
    }
    
    clearCompletedTimeouts() {
        // setTimeout 完成後自動清理（如果還在追蹤中）
        const toDelete = [];
        
        for (const [timerId, timerInfo] of this.timers) {
            if (timerInfo.type === 'timeout' && 
                Date.now() - timerInfo.createdAt > timerInfo.delay + 1000) {
                toDelete.push(timerId);
            }
        }
        
        toDelete.forEach(timerId => this.unregisterTimer(timerId));
    }
    
    checkComponentHealth() {
        for (const [name, componentInfo] of this.components) {
            const component = componentInfo.instance;
            
            // 檢查組件是否還有效
            if (component.destroyed || component.isDestroyed) {
                this.unregisterComponent(name);
            }
        }
    }
    
    partialCleanup() {
        console.log('🧹 執行部分清理...');
        this.clearExpiredCaches();
        this.clearCompletedTimeouts();
    }
    
    // ==================== 公開方法 ====================
    
    getResourceReport() {
        const report = {
            timestamp: new Date().toISOString(),
            metrics: { ...this.metrics },
            details: {
                timers: Array.from(this.timers.values()),
                listeners: Array.from(this.eventListeners.values()),
                observers: Array.from(this.observers).map(obs => ({
                    type: obs._resourceManagerType || 'unknown',
                    createdAt: obs._resourceManagerCreatedAt
                })),
                components: Array.from(this.components.entries()).map(([name, info]) => ({
                    name,
                    createdAt: info.createdAt,
                    destroyed: info.destroyed
                }))
            }
        };
        
        return report;
    }
    
    destroy() {
        if (this.isDestroyed) {
            return;
        }
        
        console.log('🗑️ 銷毀資源管理器...');
        
        // 執行自定義清理處理器
        for (const handler of this.cleanupHandlers) {
            try {
                handler();
            } catch (error) {
                console.error('清理處理器執行出錯:', error);
            }
        }
        
        // 清理所有資源
        this.clearAllTimers();
        this.clearAllEventListeners();
        this.clearAllObservers();
        this.clearAllComponents();
        
        // 恢復原始函數
        if (window._originalSetInterval) {
            window.setInterval = window._originalSetInterval;
            window.setTimeout = window._originalSetTimeout;
            window.clearInterval = window._originalClearInterval;
            window.clearTimeout = window._originalClearTimeout;
        }
        
        this.isDestroyed = true;
        console.log('✅ 資源管理器已銷毀');
    }
}

// 全域實例
window.resourceManager = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    if (!window.resourceManager) {
        window.resourceManager = new ResourceManager();
        
        // 提供便利方法
        window.registerObserver = (observer, type) => window.resourceManager.registerObserver(observer, type);
        window.registerComponent = (name, component) => window.resourceManager.registerComponent(name, component);
        window.getResourceReport = () => window.resourceManager.getResourceReport();
    }
});

console.log('🛡️ 資源管理器模組 v1.0 已載入'); 