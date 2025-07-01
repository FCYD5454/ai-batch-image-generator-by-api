/**
 * 性能優化器 v2.7
 * 提升系統響應速度和用戶體驗
 */

class PerformanceOptimizer {
    constructor() {
        this.cache = new Map();
        this.observers = new Map();
        this.preloadedImages = new Set();
        this.performanceMetrics = {
            cacheHits: 0,
            cacheMisses: 0,
            lazyLoadCount: 0,
            optimizationCount: 0
        };
        
        this.config = {
            cacheSize: 100,
            imageCacheSize: 50,
            prefetchDelay: 1000,
            lazyLoadThreshold: '10px'
        };
        
        this.init();
        console.log('⚡ 性能優化器 v2.7 已初始化');
    }
    
    init() {
        this.setupResourceOptimization();
        this.setupLazyLoading();
        this.setupCaching();
        this.setupPerformanceMonitoring();
        this.optimizeExistingElements();
    }
    
    setupResourceOptimization() {
        // 預載入關鍵資源
        this.preloadCriticalResources();
        
        // 優化圖片載入
        this.optimizeImageLoading();
        
        // 壓縮和快取 API 響應
        this.setupAPIOptimization();
        
        // 延遲載入非關鍵腳本
        this.deferNonCriticalScripts();
    }
    
    preloadCriticalResources() {
        const criticalResources = [
            { href: '/css/style.css', as: 'style' },
            { href: '/js/user-management.js', as: 'script' },
            { href: '/api/health', as: 'fetch' }
        ];
        
        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource.href;
            link.as = resource.as;
            
            if (resource.as === 'style') {
                link.onload = () => {
                    link.rel = 'stylesheet';
                };
            }
            
            document.head.appendChild(link);
        });
    }
    
    optimizeImageLoading() {
        // 實作漸進式圖片載入
        document.addEventListener('DOMContentLoaded', () => {
            this.setupProgressiveImageLoading();
        });
        
        // 設置圖片快取
        this.setupImageCache();
    }
    
    setupProgressiveImageLoading() {
        const images = document.querySelectorAll('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    this.loadImageProgressively(img);
                    imageObserver.unobserve(img);
                }
            });
        }, {
            rootMargin: this.config.lazyLoadThreshold
        });
        
        images.forEach(img => imageObserver.observe(img));
        this.observers.set('images', imageObserver);
    }
    
    loadImageProgressively(img) {
        const src = img.dataset.src;
        const lowQualitySrc = img.dataset.lowSrc;
        
        // 先載入低質量版本
        if (lowQualitySrc) {
            img.src = lowQualitySrc;
            img.classList.add('loading');
        }
        
        // 預載入高質量版本
        const highQualityImg = new Image();
        highQualityImg.onload = () => {
            img.src = src;
            img.classList.remove('loading');
            img.classList.add('loaded');
            this.performanceMetrics.lazyLoadCount++;
        };
        
        highQualityImg.onerror = () => {
            img.classList.remove('loading');
            img.classList.add('error');
        };
        
        highQualityImg.src = src;
    }
    
    setupImageCache() {
        const imageCache = new Map();
        
        // 攔截圖片請求並使用快取
        const originalSetAttribute = HTMLImageElement.prototype.setAttribute;
        HTMLImageElement.prototype.setAttribute = function(name, value) {
            if (name === 'src' && imageCache.has(value)) {
                this.src = imageCache.get(value);
                return;
            }
            
            originalSetAttribute.call(this, name, value);
            
            if (name === 'src') {
                imageCache.set(value, value);
            }
        };
    }
    
    setupLazyLoading() {
        // 延遲載入組件
        this.setupComponentLazyLoading();
        
        // 延遲載入內容
        this.setupContentLazyLoading();
    }
    
    setupComponentLazyLoading() {
        const lazyComponents = document.querySelectorAll('[data-lazy-component]');
        
        const componentObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const componentName = element.dataset.lazyComponent;
                    this.loadComponent(componentName, element);
                    componentObserver.unobserve(element);
                }
            });
        });
        
        lazyComponents.forEach(component => componentObserver.observe(component));
        this.observers.set('components', componentObserver);
    }
    
    loadComponent(componentName, container) {
        // 動態載入組件
        switch (componentName) {
            case 'advanced-gallery':
                this.loadAdvancedGallery(container);
                break;
            case 'statistics-dashboard':
                this.loadStatsDashboard(container);
                break;
            case 'user-preferences':
                this.loadUserPreferences(container);
                break;
            default:
                console.warn(`未知的延遲載入組件: ${componentName}`);
        }
    }
    
    setupContentLazyLoading() {
        // 延遲載入大型內容區塊
        const lazyContent = document.querySelectorAll('[data-lazy-content]');
        
        const contentObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    this.loadContent(element);
                    contentObserver.unobserve(element);
                }
            });
        });
        
        lazyContent.forEach(content => contentObserver.observe(content));
    }
    
    loadContent(element) {
        const contentUrl = element.dataset.lazyContent;
        
        fetch(contentUrl)
            .then(response => response.text())
            .then(html => {
                element.innerHTML = html;
                element.classList.add('lazy-loaded');
                this.performanceMetrics.lazyLoadCount++;
            })
            .catch(error => {
                console.error('延遲載入內容失敗:', error);
                element.innerHTML = '<p>載入失敗，請重試</p>';
            });
    }
    
    setupCaching() {
        // API 響應快取
        this.setupAPICache();
        
        // 本地儲存快取
        this.setupLocalStorageCache();
        
        // 記憶體快取
        this.setupMemoryCache();
    }
    
    setupAPIOptimization() {
        console.log('📡 設置 API 優化...');
        // API 優化邏輯
        this.optimizeAPIRequests();
        this.setupRequestCaching();
        this.setupRequestDebouncing();
    }
    
    optimizeAPIRequests() {
        // 優化 API 請求
        this.requestCache = new Map();
        this.requestQueue = [];
        this.batchSize = 5;
    }
    
    setupRequestCaching() {
        // 設置請求快取（與 setupAPICache 配合）
        console.log('設置請求快取優化...');
    }
    
    setupRequestDebouncing() {
        // 設置請求防抖
        this.debounceTimers = new Map();
    }
    
    deferNonCriticalScripts() {
        console.log('⏰ 延遲載入非關鍵腳本...');
        // 延遲載入非關鍵腳本的邏輯
        setTimeout(() => {
            this.loadDeferredScripts();
        }, 1000); // 1秒後載入
    }
    
    loadDeferredScripts() {
        // 載入延遲的腳本
        const deferredScripts = [
            '/js/advanced-features.js',
            '/js/optional-modules.js'
        ];
        
        deferredScripts.forEach(scriptUrl => {
            const script = document.createElement('script');
            script.src = scriptUrl;
            script.async = true;
            script.onerror = () => {
                console.log(`延遲腳本載入失敗: ${scriptUrl} (這是正常的，如果腳本不存在)`);
            };
            document.head.appendChild(script);
        });
    }
    
    setupAPICache() {
        // 不再攔截 fetch，改為與統一API管理器整合
        if (window.unifiedAPI) {
            // 註冊快取處理器到統一API管理器
            window.unifiedAPI.registerCacheHandler({
                generateCacheKey: this.generateCacheKey.bind(this),
                shouldUseCache: this.shouldUseCache.bind(this),
                shouldCache: this.shouldCache.bind(this),
                cacheResponse: this.cacheResponse.bind(this),
                isCacheExpired: this.isCacheExpired.bind(this),
                cache: this.cache,
                performanceMetrics: this.performanceMetrics
            });
            console.log('✅ 快取處理器已註冊到統一API管理器');
        } else {
            // 如果統一API管理器還未載入，延遲註冊
            setTimeout(() => this.setupAPICache(), 100);
        }
    }
    
    generateCacheKey(url, options) {
        const method = options.method || 'GET';
        const body = options.body || '';
        return `${method}:${url}:${btoa(body)}`;
    }
    
    shouldUseCache(options) {
        const method = options.method || 'GET';
        return method === 'GET' && !options.cache || options.cache !== 'no-cache';
    }
    
    shouldCache(response, options) {
        return response.ok && 
               (options.method || 'GET') === 'GET' && 
               response.headers.get('content-type')?.includes('application/json');
    }
    
    cacheResponse(key, response) {
        if (this.cache.size >= this.config.cacheSize) {
            // 移除最舊的快取項目
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            response: response.clone(),
            timestamp: Date.now(),
            ttl: 5 * 60 * 1000 // 5分鐘
        });
    }
    
    isCacheExpired(cachedItem) {
        return Date.now() - cachedItem.timestamp > cachedItem.ttl;
    }
    
    setupLocalStorageCache() {
        // 優化 localStorage 使用
        const originalSetItem = localStorage.setItem;
        const originalGetItem = localStorage.getItem;
        
        const memoryCache = new Map();
        
        localStorage.setItem = function(key, value) {
            memoryCache.set(key, value);
            originalSetItem.call(this, key, value);
        };
        
        localStorage.getItem = function(key) {
            if (memoryCache.has(key)) {
                return memoryCache.get(key);
            }
            
            const value = originalGetItem.call(this, key);
            if (value !== null) {
                memoryCache.set(key, value);
            }
            return value;
        };
    }
    
    setupMemoryCache() {
        // 使用資源管理器管理定時器
        if (window.resourceManager) {
            this.cacheCleanupTimer = window.resourceManager.registerManagedTimer(() => {
                this.cleanupCache();
            }, 5 * 60 * 1000, 'cache-cleanup');
        } else {
            // 降級方案
            this.cacheCleanupTimer = setInterval(() => {
                this.cleanupCache();
            }, 5 * 60 * 1000);
        }
        
        // 註冊清理方法
        if (window.resourceManager) {
            window.resourceManager.registerCleanupHandler(() => {
                if (this.cacheCleanupTimer) {
                    clearInterval(this.cacheCleanupTimer);
                }
                this.clearCache();
            });
        }
    }
    
    cleanupCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (this.isCacheExpired(value)) {
                this.cache.delete(key);
            }
        }
        
        console.log(`🧹 快取清理完成，剩餘項目: ${this.cache.size}`);
    }
    
    setupPerformanceMonitoring() {
        // 監控關鍵性能指標
        this.monitorCoreWebVitals();
        
        // 監控資源載入
        this.monitorResourceLoading();
        
        // 監控用戶互動
        this.monitorUserInteractions();
    }
    
    monitorCoreWebVitals() {
        // 監控 LCP (Largest Contentful Paint)
        const lcpObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            console.log('LCP:', lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        
        // 監控 FID (First Input Delay)
        const fidObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
                console.log('FID:', entry.processingStart - entry.startTime);
            });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        
        // 監控 CLS (Cumulative Layout Shift)
        const clsObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
                if (!entry.hadRecentInput) {
                    console.log('CLS:', entry.value);
                }
            });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        
        // 註冊 Observer 到資源管理器
        if (window.resourceManager) {
            window.resourceManager.registerObserver(lcpObserver, 'LCP-monitor');
            window.resourceManager.registerObserver(fidObserver, 'FID-monitor');
            window.resourceManager.registerObserver(clsObserver, 'CLS-monitor');
        }
        
        // 保存引用以便後續清理
        this.performanceObservers = [lcpObserver, fidObserver, clsObserver];
    }
    
    monitorResourceLoading() {
        const resourceObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
                if (entry.duration > 1000) { // 載入時間超過1秒
                    console.warn(`慢速資源載入: ${entry.name} (${entry.duration}ms)`);
                }
            });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        
        // 註冊到資源管理器
        if (window.resourceManager) {
            window.resourceManager.registerObserver(resourceObserver, 'resource-loading-monitor');
        }
        
        // 保存引用
        if (!this.performanceObservers) {
            this.performanceObservers = [];
        }
        this.performanceObservers.push(resourceObserver);
    }
    
    monitorUserInteractions() {
        let interactionCount = 0;
        
        ['click', 'scroll', 'keydown'].forEach(eventType => {
            document.addEventListener(eventType, () => {
                interactionCount++;
                
                if (interactionCount % 100 === 0) {
                    this.reportPerformanceMetrics();
                }
            }, { passive: true });
        });
    }
    
    optimizeExistingElements() {
        // 優化現有圖片
        this.optimizeImages();
        
        // 優化表單
        this.optimizeForms();
        
        // 優化動畫
        this.optimizeAnimations();
    }
    
    optimizeImages() {
        const images = document.querySelectorAll('img:not([data-optimized])');
        
        images.forEach(img => {
            // 添加載入狀態
            img.addEventListener('load', () => {
                img.classList.add('loaded');
            });
            
            img.addEventListener('error', () => {
                img.classList.add('error');
            });
            
            // 標記為已優化
            img.dataset.optimized = 'true';
            this.performanceMetrics.optimizationCount++;
        });
    }
    
    optimizeForms() {
        const forms = document.querySelectorAll('form:not([data-optimized])');
        
        forms.forEach(form => {
            // 防止重複提交
            form.addEventListener('submit', (e) => {
                const submitBtn = form.querySelector('[type="submit"]');
                if (submitBtn && submitBtn.disabled) {
                    e.preventDefault();
                    return false;
                }
                
                if (submitBtn) {
                    submitBtn.disabled = true;
                    setTimeout(() => {
                        submitBtn.disabled = false;
                    }, 2000);
                }
            });
            
            form.dataset.optimized = 'true';
        });
    }
    
    optimizeAnimations() {
        // 減少動畫在低性能設備上的影響
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        
        if (prefersReducedMotion.matches) {
            document.documentElement.style.setProperty('--animation-duration', '0.01ms');
            document.documentElement.style.setProperty('--transition-duration', '0.01ms');
        }
    }
    
    // 公開方法
    preloadResource(url, type = 'fetch') {
        return new Promise((resolve, reject) => {
            if (this.preloadedImages.has(url)) {
                resolve(url);
                return;
            }
            
            if (type === 'image') {
                const img = new Image();
                img.onload = () => {
                    this.preloadedImages.add(url);
                    resolve(url);
                };
                img.onerror = reject;
                img.src = url;
            } else {
                fetch(url)
                    .then(response => response.blob())
                    .then(() => {
                        this.preloadedImages.add(url);
                        resolve(url);
                    })
                    .catch(reject);
            }
        });
    }
    
    clearCache() {
        this.cache.clear();
        this.preloadedImages.clear();
        
        // 清除 localStorage 快取
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('cache_')) {
                localStorage.removeItem(key);
            }
        });
        
        console.log('🧹 所有快取已清除');
    }
    
    getPerformanceReport() {
        const cacheHitRate = this.performanceMetrics.cacheHits / 
                           (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) * 100;
        
        return {
            ...this.performanceMetrics,
            cacheHitRate: isNaN(cacheHitRate) ? 0 : cacheHitRate.toFixed(1),
            cacheSize: this.cache.size,
            preloadedResources: this.preloadedImages.size
        };
    }
    
    reportPerformanceMetrics() {
        const report = this.getPerformanceReport();
        console.log('📊 性能報告:', report);
        
        // 如果性能不佳，觸發優化
        if (report.cacheHitRate < 50) {
            console.log('🔧 觸發性能優化...');
            this.triggerOptimizations();
        }
    }
    
    triggerOptimizations() {
        // 清理未使用的快取
        this.cleanupCache();
        
        // 預載入常用資源
        this.preloadCommonResources();
        
        // 壓縮大型 DOM 元素
        this.compressDOMElements();
    }
    
    preloadCommonResources() {
        const commonResources = [
            '/api/user/profile',
            '/api/api-keys/list',
            '/api/ai-assistant/status'
        ];
        
        commonResources.forEach(url => {
            this.preloadResource(url);
        });
    }
    
    compressDOMElements() {
        // 移除不可見的元素
        const hiddenElements = document.querySelectorAll('[style*="display: none"]');
        hiddenElements.forEach(el => {
            if (!el.dataset.keepHidden) {
                el.remove();
            }
        });
        
        // 壓縮空白文本節點
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    return node.textContent.trim() === '' ? 
                           NodeFilter.FILTER_ACCEPT : 
                           NodeFilter.FILTER_REJECT;
                }
            }
        );
        
        const emptyTextNodes = [];
        let node;
        while (node = walker.nextNode()) {
            emptyTextNodes.push(node);
        }
        
        emptyTextNodes.forEach(node => node.remove());
    }
}

// 全域實例
window.performanceOptimizer = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    window.performanceOptimizer = new PerformanceOptimizer();
    
    // 開發模式下添加性能監控面板
    if (localStorage.getItem('developerMode') === 'true') {
        const perfButton = document.createElement('button');
        perfButton.textContent = '⚡ 性能報告';
        perfButton.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            z-index: 9999;
            padding: 0.5rem 1rem;
            background: #8b5cf6;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.875rem;
        `;
        perfButton.onclick = () => {
            const report = window.performanceOptimizer.getPerformanceReport();
            alert(JSON.stringify(report, null, 2));
        };
        document.body.appendChild(perfButton);
    }
});

console.log('⚡ 性能優化器 v2.7 已載入'); 