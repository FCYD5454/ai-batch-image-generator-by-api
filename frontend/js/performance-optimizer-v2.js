/**
 * Performance Optimizer v2.0 - 優化版
 * 全面性能監控和優化模組
 */

'use strict';

// ================== 配置 ==================
const PERF_CONFIG = {
    MONITOR_INTERVAL: 1000, // 1秒
    MEMORY_THRESHOLD: 0.8, // 80%
    FPS_THRESHOLD: 30,
    NETWORK_TIMEOUT: 5000,
    CACHE_LIMIT: 50,
    
    OPTIMIZATION_MODES: {
        conservative: '保守模式',
        balanced: '平衡模式',
        aggressive: '激進模式'
    }
};

// ================== 性能優化器類 ==================
class PerformanceOptimizerV2 {
    constructor() {
        this.metrics = new Map();
        this.optimizations = new Set();
        this.monitors = new Map();
        this.mode = 'balanced';
        this.isActive = false;
        
        this.init();
    }

    async init() {
        try {
            this.setupMonitoring();
            this.setupOptimizations();
            this.bindEvents();
            this.start();
            
            console.log('⚡ 性能優化器v2.0已啟動');
        } catch (error) {
            console.error('性能優化器初始化失敗:', error);
        }
    }

    setupMonitoring() {
        // CPU 監控
        this.monitors.set('cpu', {
            check: () => this.monitorCPU(),
            interval: PERF_CONFIG.MONITOR_INTERVAL
        });

        // 記憶體監控
        this.monitors.set('memory', {
            check: () => this.monitorMemory(),
            interval: PERF_CONFIG.MONITOR_INTERVAL * 2
        });

        // FPS 監控
        this.monitors.set('fps', {
            check: () => this.monitorFPS(),
            interval: 500
        });

        // 網路監控
        this.monitors.set('network', {
            check: () => this.monitorNetwork(),
            interval: PERF_CONFIG.MONITOR_INTERVAL * 5
        });
    }

    setupOptimizations() {
        // 圖片延遲載入
        this.optimizations.add(this.setupLazyLoading.bind(this));
        
        // 資源預載
        this.optimizations.add(this.setupPreloading.bind(this));
        
        // DOM 優化
        this.optimizations.add(this.optimizeDOM.bind(this));
        
        // 事件優化
        this.optimizations.add(this.optimizeEvents.bind(this));
        
        // 記憶體清理
        this.optimizations.add(this.setupMemoryCleanup.bind(this));
    }

    start() {
        if (this.isActive) return;
        
        this.isActive = true;
        
        // 啟動所有監控
        this.monitors.forEach((monitor, name) => {
            const intervalId = setInterval(monitor.check, monitor.interval);
            monitor.intervalId = intervalId;
        });

        // 執行優化
        this.optimizations.forEach(optimization => {
            try {
                optimization();
            } catch (error) {
                console.warn('優化執行失敗:', error);
            }
        });

        this.showNotification('性能優化器已啟動', 'success');
    }

    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        // 停止所有監控
        this.monitors.forEach(monitor => {
            if (monitor.intervalId) {
                clearInterval(monitor.intervalId);
            }
        });

        this.showNotification('性能優化器已停止', 'info');
    }

    monitorCPU() {
        if (!window.performance) return;

        const now = performance.now();
        const entries = performance.getEntriesByType('navigation');
        
        if (entries.length > 0) {
            const navigation = entries[0];
            const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
            
            this.updateMetric('cpu', {
                loadTime,
                timestamp: now
            });
        }
    }

    monitorMemory() {
        if (!performance.memory) return;

        const memory = performance.memory;
        const usage = memory.usedJSHeapSize / memory.totalJSHeapSize;
        
        this.updateMetric('memory', {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            usage: usage,
            timestamp: performance.now()
        });

        // 記憶體警告
        if (usage > PERF_CONFIG.MEMORY_THRESHOLD) {
            this.triggerMemoryCleanup();
        }
    }

    monitorFPS() {
        let lastTime = performance.now();
        let frames = 0;

        const countFrames = () => {
            frames++;
            const currentTime = performance.now();
            
            if (currentTime >= lastTime + 1000) {
                const fps = Math.round((frames * 1000) / (currentTime - lastTime));
                
                this.updateMetric('fps', {
                    value: fps,
                    timestamp: currentTime
                });

                // FPS 警告
                if (fps < PERF_CONFIG.FPS_THRESHOLD) {
                    this.optimizeRendering();
                }

                frames = 0;
                lastTime = currentTime;
            }

            requestAnimationFrame(countFrames);
        };

        requestAnimationFrame(countFrames);
    }

    monitorNetwork() {
        if (!navigator.connection) return;

        const connection = navigator.connection;
        
        this.updateMetric('network', {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData,
            timestamp: performance.now()
        });

        // 根據網路狀況調整
        if (connection.saveData || connection.effectiveType === 'slow-2g') {
            this.enableDataSavingMode();
        }
    }

    setupLazyLoading() {
        // 圖片延遲載入
        const images = document.querySelectorAll('img[data-src]');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });

            images.forEach(img => imageObserver.observe(img));
        } else {
            // 降級處理
            images.forEach(img => {
                img.src = img.dataset.src;
            });
        }
    }

    setupPreloading() {
        // 預載重要資源
        const criticalResources = [
            '/api/status',
            '/assets/css/critical.css'
        ];

        criticalResources.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = url;
            link.as = url.endsWith('.css') ? 'style' : 'fetch';
            document.head.appendChild(link);
        });
    }

    optimizeDOM() {
        // DOM 批量更新
        const observer = new MutationObserver((mutations) => {
            const batchUpdates = [];
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    batchUpdates.push(mutation);
                }
            });

            if (batchUpdates.length > 10) {
                this.batchDOMUpdates(batchUpdates);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    optimizeEvents() {
        // 事件委託
        const eventCache = new Map();

        document.addEventListener('click', (e) => {
            this.handleDelegatedEvent('click', e, eventCache);
        });

        document.addEventListener('input', (e) => {
            this.handleDelegatedEvent('input', e, eventCache);
        });
    }

    setupMemoryCleanup() {
        // 定期記憶體清理
        setInterval(() => {
            this.cleanupMemory();
        }, 30000); // 30秒
    }

    triggerMemoryCleanup() {
        console.warn('記憶體使用率過高，執行清理...');
        
        // 清理緩存
        this.clearCache();
        
        // 清理未使用的DOM元素
        this.cleanupUnusedElements();
        
        // 手動垃圾回收（如果支援）
        if (window.gc) {
            window.gc();
        }
    }

    optimizeRendering() {
        console.warn('FPS過低，優化渲染...');
        
        // 減少動畫
        this.reduceAnimations();
        
        // 降低渲染品質
        this.lowerRenderQuality();
        
        // 延遲非關鍵渲染
        this.deferNonCriticalRender();
    }

    enableDataSavingMode() {
        console.info('啟用數據節省模式');
        
        // 降低圖片品質
        this.lowerImageQuality();
        
        // 禁用自動播放
        this.disableAutoplay();
        
        // 減少網路請求
        this.reduceNetworkRequests();
    }

    updateMetric(name, value) {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        
        const values = this.metrics.get(name);
        values.push(value);
        
        // 限制歷史記錄長度
        if (values.length > 100) {
            values.shift();
        }
    }

    getMetrics() {
        const result = {};
        
        this.metrics.forEach((values, name) => {
            if (values.length > 0) {
                const latest = values[values.length - 1];
                result[name] = {
                    current: latest,
                    history: values.slice(-10) // 最近10個值
                };
            }
        });
        
        return result;
    }

    getPerformanceReport() {
        const metrics = this.getMetrics();
        const recommendations = this.generateRecommendations();
        
        return {
            timestamp: new Date().toISOString(),
            mode: this.mode,
            active: this.isActive,
            metrics,
            recommendations,
            optimizations: Array.from(this.optimizations).length
        };
    }

    generateRecommendations() {
        const recommendations = [];
        const metrics = this.getMetrics();

        // 記憶體建議
        if (metrics.memory?.current.usage > 0.7) {
            recommendations.push({
                type: 'memory',
                message: '記憶體使用率偏高，建議清理緩存',
                priority: 'high'
            });
        }

        // FPS建議
        if (metrics.fps?.current.value < 30) {
            recommendations.push({
                type: 'rendering',
                message: 'FPS較低，建議減少動畫效果',
                priority: 'medium'
            });
        }

        // 網路建議
        if (metrics.network?.current.effectiveType === 'slow-2g') {
            recommendations.push({
                type: 'network',
                message: '網路連線較慢，建議啟用輕量模式',
                priority: 'high'
            });
        }

        return recommendations;
    }

    setMode(mode) {
        if (PERF_CONFIG.OPTIMIZATION_MODES[mode]) {
            this.mode = mode;
            this.applyModeSettings();
            console.log(`性能模式已切換為: ${PERF_CONFIG.OPTIMIZATION_MODES[mode]}`);
        }
    }

    applyModeSettings() {
        switch (this.mode) {
            case 'conservative':
                PERF_CONFIG.MONITOR_INTERVAL = 2000;
                PERF_CONFIG.MEMORY_THRESHOLD = 0.9;
                break;
            case 'balanced':
                PERF_CONFIG.MONITOR_INTERVAL = 1000;
                PERF_CONFIG.MEMORY_THRESHOLD = 0.8;
                break;
            case 'aggressive':
                PERF_CONFIG.MONITOR_INTERVAL = 500;
                PERF_CONFIG.MEMORY_THRESHOLD = 0.6;
                break;
        }
    }

    // 工具方法
    clearCache() {
        // 清理各種緩存
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    caches.delete(name);
                });
            });
        }
    }

    cleanupUnusedElements() {
        // 移除隱藏和未使用的元素
        const hiddenElements = document.querySelectorAll('[style*="display: none"]');
        hiddenElements.forEach(el => {
            if (!el.dataset.keepHidden) {
                el.remove();
            }
        });
    }

    reduceAnimations() {
        document.body.style.setProperty('--animation-duration', '0.1s');
    }

    lowerRenderQuality() {
        const canvas = document.querySelectorAll('canvas');
        canvas.forEach(c => {
            if (c.getContext) {
                const ctx = c.getContext('2d');
                if (ctx) {
                    ctx.imageSmoothingEnabled = false;
                }
            }
        });
    }

    bindEvents() {
        // 頁面可見性變化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onPageHidden();
            } else {
                this.onPageVisible();
            }
        });

        // 窗口大小變化
        window.addEventListener('resize', this.debounce(() => {
            this.onWindowResize();
        }, 250));
    }

    onPageHidden() {
        // 頁面隱藏時暫停非必要監控
        this.monitors.forEach((monitor, name) => {
            if (name !== 'memory') {
                clearInterval(monitor.intervalId);
            }
        });
    }

    onPageVisible() {
        // 頁面顯示時恢復監控
        this.monitors.forEach((monitor, name) => {
            if (!monitor.intervalId) {
                monitor.intervalId = setInterval(monitor.check, monitor.interval);
            }
        });
    }

    onWindowResize() {
        // 窗口大小變化時的優化
        this.optimizeForViewport();
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    showNotification(message, type = 'info') {
        if (window.uxEnhancement?.showNotification) {
            window.uxEnhancement.showNotification(message, type);
        } else {
            console.log(`[PERF ${type.toUpperCase()}] ${message}`);
        }
    }
}

// ================== 初始化 ==================
let performanceOptimizer;

(() => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            performanceOptimizer = new PerformanceOptimizerV2();
        });
    } else {
        performanceOptimizer = new PerformanceOptimizerV2();
    }
    
    window.performanceOptimizer = performanceOptimizer;
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PerformanceOptimizerV2 };
}
