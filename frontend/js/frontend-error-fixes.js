/**
 * 前端錯誤修復腳本 - 修復所有DOM操作安全問題
 * 版本: 1.0
 * 作者: AI Image Generation Platform
 */

class FrontendErrorFixes {
    constructor() {
        this.fixedFunctions = new Set();
        this.errorCount = 0;
        this.warnings = [];
        
        this.init();
    }
    
    init() {
        console.log('🔧 前端錯誤修復器啟動...');
        
        // 修復現有函數中的DOM操作
        this.patchDOMOperations();
        
        // 增強錯誤處理
        this.enhanceErrorHandling();
        
        // 修復事件監聽器
        this.fixEventListeners();
        
        // 修復異步操作
        this.enhanceAsyncOperations();
        
        console.log('✅ 前端錯誤修復完成');
    }
    
    // ==================== DOM操作修復 ====================
    
    patchDOMOperations() {
        // 修復updatePromptCount函數
        if (window.updatePromptCount) {
            const original = window.updatePromptCount;
            window.updatePromptCount = () => {
                try {
                    const prompts = this.safeExecute(() => window.getPrompts(), []);
                    const promptCountSpan = this.safeGetElement('promptCount');
                    if (promptCountSpan) {
                        promptCountSpan.textContent = prompts.length;
                    }
                } catch (error) {
                    console.error('❌ updatePromptCount 錯誤:', error);
                    try { original(); } catch (e) {}
                }
            };
            this.fixedFunctions.add('updatePromptCount');
        }
        
        // 修復updateProgress函數
        if (window.updateProgress) {
            const original = window.updateProgress;
            window.updateProgress = (percentage, text) => {
                try {
                    const progressFill = this.safeGetElement('progressFill');
                    const progressText = this.safeGetElement('progressText');
                    if (progressFill) progressFill.style.width = percentage + '%';
                    if (progressText) progressText.textContent = text;
                } catch (error) {
                    console.error('❌ updateProgress 錯誤:', error);
                    try { original(percentage, text); } catch (e) {}
                }
            };
            this.fixedFunctions.add('updateProgress');
        }
        
        // 修復 user-management 模組的 DOM 操作
        this.fixUserManagementDOM();
        
        // 修復 analytics-dashboard 模組的 DOM 操作
        this.fixAnalyticsDashboardDOM();
        
        // 修復 system-integration-tester 模組的 DOM 操作
        this.fixSystemTesterDOM();
    }
    
    fixUserManagementDOM() {
        // 如果用戶管理模組存在，修復其DOM操作
        if (window.userManager && window.userManager.updateElement) {
            const original = window.userManager.updateElement;
            window.userManager.updateElement = (id, value) => {
                try {
                    const element = this.safeGetElement(id);
                    if (element) {
                        element.textContent = value;
                    } else {
                        console.warn(`⚠️ 用戶管理：無法找到元素 ${id}`);
                    }
                } catch (error) {
                    console.error(`❌ 用戶管理：更新元素 ${id} 失敗:`, error);
                    try {
                        original(id, value);
                    } catch (e) {
                        console.error('❌ 原始方法也失敗:', e);
                    }
                }
            };
            this.fixedFunctions.add('userManager.updateElement');
        }
    }
    
    fixAnalyticsDashboardDOM() {
        // 如果分析儀表板存在，修復其DOM操作
        if (window.analyticsDashboard && window.analyticsDashboard.updateElement) {
            const original = window.analyticsDashboard.updateElement;
            window.analyticsDashboard.updateElement = (id, value) => {
                try {
                    const element = this.safeGetElement(id);
                    if (element) {
                        element.textContent = value;
                    } else {
                        console.warn(`⚠️ 分析儀表板：無法找到元素 ${id}`);
                    }
                } catch (error) {
                    console.error(`❌ 分析儀表板：更新元素 ${id} 失敗:`, error);
                    try {
                        original(id, value);
                    } catch (e) {
                        console.error('❌ 原始方法也失敗:', e);
                    }
                }
            };
            this.fixedFunctions.add('analyticsDashboard.updateElement');
        }
    }
    
    fixSystemTesterDOM() {
        // 如果系統測試器存在，修復其DOM操作
        if (window.systemTester && window.systemTester.updateElement) {
            const original = window.systemTester.updateElement;
            window.systemTester.updateElement = (id, value) => {
                try {
                    const element = this.safeGetElement(id);
                    if (element) {
                        element.textContent = value;
                    } else {
                        console.warn(`⚠️ 系統測試器：無法找到元素 ${id}`);
                    }
                } catch (error) {
                    console.error(`❌ 系統測試器：更新元素 ${id} 失敗:`, error);
                    try {
                        original(id, value);
                    } catch (e) {
                        console.error('❌ 原始方法也失敗:', e);
                    }
                }
            };
            this.fixedFunctions.add('systemTester.updateElement');
        }
    }
    
    // ==================== 錯誤處理增強 ====================
    
    enhanceErrorHandling() {
        // 全局錯誤處理增強（如果尚未存在）
        if (!window._frontendErrorHandlerInstalled) {
            window.addEventListener('error', (event) => {
                this.errorCount++;
                
                // 特別處理DOM相關錯誤
                if (event.message && (
                    event.message.includes('Cannot read properties of null') ||
                    event.message.includes('getElementById') ||
                    event.message.includes('querySelector')
                )) {
                    console.error('🚨 DOM操作錯誤:', {
                        message: event.message,
                        filename: event.filename,
                        line: event.lineno,
                        column: event.colno
                    });
                    
                    // 嘗試自動修復
                    this.attemptAutoFix(event);
                }
            });
            
            window._frontendErrorHandlerInstalled = true;
            this.fixedFunctions.add('globalErrorHandler');
        }
    }
    
    attemptAutoFix(errorEvent) {
        const message = errorEvent.message;
        
        // 嘗試識別和修復常見錯誤
        if (message.includes('promptCountSpan')) {
            console.log('🔧 嘗試修復 promptCountSpan 相關錯誤...');
            const element = this.safeGetElement('promptCount');
            if (!element) {
                this.warnings.push('promptCount 元素缺失');
            }
        }
        
        if (message.includes('generateBtn')) {
            console.log('🔧 嘗試修復 generateBtn 相關錯誤...');
            const element = this.safeGetElement('generateBtn');
            if (!element) {
                this.warnings.push('generateBtn 元素缺失');
            }
        }
        
        if (message.includes('progressFill') || message.includes('progressText')) {
            console.log('🔧 嘗試修復進度條相關錯誤...');
            const progressFill = this.safeGetElement('progressFill');
            const progressText = this.safeGetElement('progressText');
            if (!progressFill) this.warnings.push('progressFill 元素缺失');
            if (!progressText) this.warnings.push('progressText 元素缺失');
        }
    }
    
    // ==================== 事件監聽器修復 ====================
    
    fixEventListeners() {
        // 創建安全的事件監聽器添加函數
        window.safeAddEventListener = (elementOrId, event, handler, options = {}) => {
            try {
                const element = typeof elementOrId === 'string' ? 
                    this.safeGetElement(elementOrId) : elementOrId;
                
                if (element && element.addEventListener) {
                    element.addEventListener(event, handler, options);
                    
                    // 註冊到資源管理器（如果存在）
                    if (window.resourceManager) {
                        window.resourceManager.registerEventListener(element, event, handler, options);
                    }
                    
                    return true;
                } else {
                    console.warn(`⚠️ 無法為 ${elementOrId} 添加事件監聽器：元素不存在或不支援事件`);
                    return false;
                }
            } catch (error) {
                console.error(`❌ 添加事件監聽器失敗:`, error);
                return false;
            }
        };
        
        this.fixedFunctions.add('safeAddEventListener');
    }
    
    // ==================== 異步操作增強 ====================
    
    enhanceAsyncOperations() {
        // 創建安全的異步DOM操作
        window.safeAsyncDOMOperation = async (operation, retries = 3) => {
            for (let i = 0; i < retries; i++) {
                try {
                    return await operation();
                } catch (error) {
                    console.warn(`⚠️ DOM操作重試 ${i + 1}/${retries}:`, error);
                    
                    if (i === retries - 1) {
                        console.error('❌ DOM操作最終失敗:', error);
                        throw error;
                    }
                    
                    // 等待一小段時間再重試
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        };
        
        this.fixedFunctions.add('safeAsyncDOMOperation');
    }
    
    // ==================== 工具方法 ====================
    
    safeGetElement(id) {
        try {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`⚠️ 元素不存在: ${id}`);
            }
            return element;
        } catch (error) {
            console.error(`❌ 獲取元素失敗: ${id}`, error);
            return null;
        }
    }
    
    safeExecute(func, defaultValue = null) {
        try {
            return func();
        } catch (error) {
            console.error('❌ 安全執行失敗:', error);
            return defaultValue;
        }
    }
    
    // ==================== 診斷和統計 ====================
    
    getDiagnostics() {
        return {
            fixedFunctions: Array.from(this.fixedFunctions),
            fixedCount: this.fixedFunctions.size,
            errorCount: this.errorCount,
            warnings: this.warnings,
            timestamp: new Date().toISOString()
        };
    }
    
    generateReport() {
        const diagnostics = this.getDiagnostics();
        
        console.group('📋 前端錯誤修復報告');
        console.log('✅ 已修復的函數:', diagnostics.fixedFunctions);
        console.log('📊 修復數量:', diagnostics.fixedCount);
        console.log('🚨 捕獲錯誤數:', diagnostics.errorCount);
        console.log('⚠️ 警告列表:', diagnostics.warnings);
        console.groupEnd();
        
        return diagnostics;
    }
    
    // ==================== 批量DOM檢查 ====================
    
    validateCriticalElements() {
        const criticalElements = [
            'prompts',
            'promptCount', 
            'generateBtn',
            'clearBtn',
            'apiProvider',
            'resultsContainer'
        ];
        
        const results = {
            missing: [],
            found: [],
            total: criticalElements.length
        };
        
        criticalElements.forEach(id => {
            const element = this.safeGetElement(id);
            if (element) {
                results.found.push(id);
            } else {
                results.missing.push(id);
            }
        });
        
        results.success = results.missing.length === 0;
        results.coverage = (results.found.length / results.total * 100).toFixed(1);
        
        if (!results.success) {
            console.warn('🚨 關鍵元素缺失:', results.missing);
        } else {
            console.log('✅ 所有關鍵元素都存在');
        }
        
        return results;
    }
}

// 自動創建並運行修復器
window.frontendErrorFixes = new FrontendErrorFixes();

// 延遲驗證（等待頁面完全載入）
setTimeout(() => {
    const validation = window.frontendErrorFixes.validateCriticalElements();
    console.log('🎯 關鍵元素覆蓋率:', validation.coverage + '%');
    
    // 生成最終報告
    window.frontendErrorFixes.generateReport();
}, 2000);

// 頁面卸載時清理
window.addEventListener('beforeunload', () => {
    if (window.frontendErrorFixes) {
        const finalReport = window.frontendErrorFixes.generateReport();
        console.log('🏁 前端修復器最終報告:', finalReport);
    }
});

console.log('✅ 前端錯誤修復腳本已載入'); 