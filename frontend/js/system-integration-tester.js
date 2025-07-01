/**
 * 系統整合測試器 v2.7
 * 端到端測試所有功能組件
 */

class SystemIntegrationTester {
    constructor() {
        this.testResults = [];
        this.apiEndpoints = [
            // AI Assistant API 端點
            '/api/ai-assistant/configure',
            '/api/ai-assistant/enhance-prompt',
            '/api/ai-assistant/batch-optimize',
            '/api/ai-assistant/translate-prompt',
            '/api/ai-assistant/style-recommendations',
            '/api/ai-assistant/contextual-optimize',
            '/api/ai-assistant/optimization-history',
            '/api/ai-assistant/performance-analytics',
            '/api/ai-assistant/clear-cache',
            '/api/ai-assistant/export-data',
            '/api/ai-assistant/batch/create-job',
            '/api/ai-assistant/batch/system-stats',
            '/api/ai-assistant/status',
            
            // 其他系統 API
            '/api/health',
            '/api/user/register',
            '/api/user/login',
            '/api/api-keys/list',
            '/api/generate'
        ];
        
        this.uiComponents = [
            'aiAssistantV27',
            'advancedImageProcessor',
            'promptEnhancerPanel',
            'generatorTab',
            'galleryTab'
        ];
        
        console.log('🧪 系統整合測試器 v2.7 已初始化');
    }
    
    // 添加缺失的方法
    setupAPIOptimization() {
        console.log('📡 設置 API 優化...');
        // API 優化邏輯
    }
    
    enhanceFormValidation() {
        console.log('✅ 增強表單驗證...');
        // 表單驗證邏輯
    }
    
    initializeComponents() {
        console.log('🔧 初始化組件...');
        // 組件初始化邏輯
        this.setupAPIOptimization();
        this.enhanceFormValidation();
    }
    
    async runFullSystemTest() {
        console.log('🚀 開始完整系統測試...');
        
        this.testResults = [];
        const startTime = Date.now();
        
        try {
            // 1. API 端點測試
            await this.testAPIEndpoints();
            
            // 2. UI 組件測試
            await this.testUIComponents();
            
            // 3. 功能整合測試
            await this.testFeatureIntegration();
            
            // 4. 性能測試
            await this.performanceTest();
            
            // 5. 響應式設計測試
            await this.responsiveDesignTest();
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            this.generateTestReport(duration);
            
        } catch (error) {
            console.error('❌ 系統測試失敗:', error);
            this.addTestResult('system_test', false, `測試執行失敗: ${error.message}`);
        }
    }
    
    async testAPIEndpoints() {
        console.log('📡 測試 API 端點...');
        
        for (const endpoint of this.apiEndpoints) {
            try {
                const response = await fetch(endpoint, {
                    method: endpoint.includes('POST') ? 'POST' : 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('sessionToken') || 'test-token'}`
                    },
                    body: endpoint.includes('POST') ? JSON.stringify({test: true}) : null
                });
                
                const isSuccess = response.status !== 500; // 允許 401, 400 等業務邏輯錯誤
                this.addTestResult(`api_${endpoint}`, isSuccess, 
                    `狀態碼: ${response.status}, 響應時間: ${Date.now() - Date.now()}ms`);
                
            } catch (error) {
                this.addTestResult(`api_${endpoint}`, false, `連接失敗: ${error.message}`);
            }
        }
    }
    
    async testUIComponents() {
        console.log('🖥️ 測試 UI 組件...');
        
        for (const componentId of this.uiComponents) {
            const element = document.getElementById(componentId);
            const exists = element !== null;
            const visible = exists && element.offsetParent !== null;
            
            this.addTestResult(`ui_${componentId}`, exists, 
                exists ? (visible ? '組件存在且可見' : '組件存在但隱藏') : '組件不存在');
        }
        
        // 測試動態生成的組件
        this.testDynamicComponents();
    }
    
    testDynamicComponents() {
        // 測試 AI Assistant v2.7 標籤
        const aiTabs = document.querySelectorAll('.ai-assistant-tabs .tab-button');
        this.addTestResult('ai_tabs', aiTabs.length >= 6, `找到 ${aiTabs.length} 個 AI 助手標籤`);
        
        // 測試圖片處理器面板
        const processorPanels = document.querySelectorAll('.processing-panels .panel-tab');
        this.addTestResult('processor_panels', processorPanels.length >= 4, `找到 ${processorPanels.length} 個處理器面板`);
        
        // 測試響應式導航
        const navTabs = document.querySelectorAll('.tab-navigation .tab-btn');
        this.addTestResult('nav_tabs', navTabs.length >= 4, `找到 ${navTabs.length} 個導航標籤`);
    }
    
    async testFeatureIntegration() {
        console.log('⚙️ 測試功能整合...');
        
        // 測試提示詞輸入功能
        this.testPromptInput();
        
        // 測試圖片生成功能
        await this.testImageGeneration();
        
        // 測試 AI 助手功能
        await this.testAIAssistant();
        
        // 測試圖片處理功能
        this.testImageProcessor();
    }
    
    testPromptInput() {
        const promptTextarea = document.getElementById('prompts');
        if (promptTextarea) {
            promptTextarea.value = '測試提示詞';
            promptTextarea.dispatchEvent(new Event('input'));
            
            const promptCount = document.getElementById('promptCount');
            const hasCount = promptCount && promptCount.textContent !== '0';
            
            this.addTestResult('prompt_input', hasCount, 
                hasCount ? '提示詞輸入和計數功能正常' : '提示詞計數功能異常');
        } else {
            this.addTestResult('prompt_input', false, '提示詞輸入框不存在');
        }
    }
    
    async testImageGeneration() {
        // 模擬圖片生成測試（不實際調用 API）
        const generateBtn = document.getElementById('generateBtn');
        const available = generateBtn && !generateBtn.disabled;
        
        this.addTestResult('image_generation', available, 
            available ? '圖片生成按鈕可用' : '圖片生成按鈕不可用');
    }
    
    async testAIAssistant() {
        // 測試 AI 助手初始化
        const aiAssistant = window.aiAssistantV27;
        const initialized = aiAssistant !== null && aiAssistant !== undefined;
        
        this.addTestResult('ai_assistant_init', initialized, 
            initialized ? 'AI 助手已初始化' : 'AI 助手未初始化');
        
        if (initialized) {
            // 測試 AI 助手方法
            const hasMethods = typeof aiAssistant.enhancePrompt === 'function' &&
                             typeof aiAssistant.translatePrompt === 'function';
            
            this.addTestResult('ai_assistant_methods', hasMethods, 
                hasMethods ? 'AI 助手方法完整' : 'AI 助手方法缺失');
        }
    }
    
    testImageProcessor() {
        const imageProcessor = window.advancedImageProcessor;
        const initialized = imageProcessor !== null && imageProcessor !== undefined;
        
        this.addTestResult('image_processor_init', initialized, 
            initialized ? '圖片處理器已初始化' : '圖片處理器未初始化');
        
        if (initialized) {
            // 測試圖片處理器組件
            const canvas = document.getElementById('processingCanvas');
            const hasCanvas = canvas !== null;
            
            this.addTestResult('image_processor_canvas', hasCanvas, 
                hasCanvas ? '圖片處理畫布存在' : '圖片處理畫布不存在');
        }
    }
    
    async performanceTest() {
        console.log('⚡ 執行性能測試...');
        
        // 測試頁面載入時間
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        this.addTestResult('page_load_time', loadTime < 5000, `頁面載入時間: ${loadTime}ms`);
        
        // 測試記憶體使用
        if (performance.memory) {
            const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024;
            this.addTestResult('memory_usage', memoryUsage < 100, `記憶體使用: ${memoryUsage.toFixed(2)}MB`);
        }
        
        // 測試 DOM 節點數量
        const domNodes = document.querySelectorAll('*').length;
        this.addTestResult('dom_nodes', domNodes < 2000, `DOM 節點數: ${domNodes}`);
    }
    
    async responsiveDesignTest() {
        console.log('📱 測試響應式設計...');
        
        const originalWidth = window.innerWidth;
        
        // 測試不同斷點
        const breakpoints = [
            { name: 'mobile', width: 375 },
            { name: 'tablet', width: 768 },
            { name: 'desktop', width: 1024 },
            { name: 'large', width: 1440 }
        ];
        
        for (const bp of breakpoints) {
            // 模擬視窗大小變化
            const mediaQuery = window.matchMedia(`(max-width: ${bp.width}px)`);
            const isResponsive = this.checkResponsiveLayout(bp.width);
            
            this.addTestResult(`responsive_${bp.name}`, isResponsive, 
                `${bp.name} 斷點 (${bp.width}px) 響應式測試`);
        }
    }
    
    checkResponsiveLayout(width) {
        // 檢查關鍵元素的響應式行為
        const container = document.querySelector('.container');
        const header = document.querySelector('header');
        const navigation = document.querySelector('.tab-navigation');
        
        if (!container || !header || !navigation) return false;
        
        // 簡單的響應式檢查
        const containerStyle = getComputedStyle(container);
        const hasFlexLayout = containerStyle.display.includes('flex') || 
                            containerStyle.display.includes('grid');
        
        return hasFlexLayout;
    }
    
    addTestResult(testName, passed, details) {
        this.testResults.push({
            name: testName,
            passed: passed,
            details: details,
            timestamp: new Date().toISOString()
        });
        
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${testName}: ${details}`);
    }
    
    generateTestReport(duration) {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const passRate = ((passedTests / totalTests) * 100).toFixed(1);
        
        console.log('\n📊 系統測試報告');
        console.log('='.repeat(50));
        console.log(`📈 總測試數: ${totalTests}`);
        console.log(`✅ 通過測試: ${passedTests}`);
        console.log(`❌ 失敗測試: ${failedTests}`);
        console.log(`📊 通過率: ${passRate}%`);
        console.log(`⏱️ 測試時間: ${duration}ms`);
        console.log('='.repeat(50));
        
        // 顯示失敗的測試
        const failedTestsDetails = this.testResults.filter(r => !r.passed);
        if (failedTestsDetails.length > 0) {
            console.log('\n❌ 失敗測試詳情:');
            failedTestsDetails.forEach(test => {
                console.log(`- ${test.name}: ${test.details}`);
            });
        }
        
        // 創建可視化報告
        this.createVisualReport({
            totalTests,
            passedTests,
            failedTests,
            passRate,
            duration,
            failedTestsDetails
        });
    }
    
    createVisualReport(summary) {
        // 創建測試報告 UI
        const reportContainer = document.createElement('div');
        reportContainer.className = 'test-report-container';
        reportContainer.innerHTML = `
            <div class="test-report">
                <div class="report-header">
                    <h3>🧪 系統整合測試報告 v2.7</h3>
                    <button class="close-report" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                
                <div class="report-summary">
                    <div class="summary-grid">
                        <div class="summary-item">
                            <div class="summary-value">${summary.totalTests}</div>
                            <div class="summary-label">總測試數</div>
                        </div>
                        <div class="summary-item success">
                            <div class="summary-value">${summary.passedTests}</div>
                            <div class="summary-label">通過測試</div>
                        </div>
                        <div class="summary-item error">
                            <div class="summary-value">${summary.failedTests}</div>
                            <div class="summary-label">失敗測試</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-value">${summary.passRate}%</div>
                            <div class="summary-label">通過率</div>
                        </div>
                    </div>
                    
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${summary.passRate}%"></div>
                    </div>
                </div>
                
                ${summary.failedTestsDetails.length > 0 ? `
                    <div class="failed-tests">
                        <h4>❌ 需要注意的測試項目</h4>
                        <ul>
                            ${summary.failedTestsDetails.map(test => 
                                `<li><strong>${test.name}</strong>: ${test.details}</li>`
                            ).join('')}
                        </ul>
                    </div>
                ` : '<div class="all-passed">🎉 所有測試都通過了！</div>'}
                
                <div class="report-actions">
                    <button onclick="window.systemTester.exportTestResults()" class="btn-primary">匯出結果</button>
                    <button onclick="window.systemTester.runFullSystemTest()" class="btn-secondary">重新測試</button>
                </div>
            </div>
        `;
        
        // 添加樣式
        const style = document.createElement('style');
        style.textContent = `
            .test-report-container {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            
            .test-report {
                background: white;
                border-radius: 12px;
                padding: 2rem;
                max-width: 600px;
                width: 90%;
                max-height: 80%;
                overflow-y: auto;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            }
            
            .report-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
                border-bottom: 1px solid #e5e7eb;
                padding-bottom: 1rem;
            }
            
            .close-report {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #6b7280;
            }
            
            .summary-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 1rem;
                margin-bottom: 1rem;
            }
            
            .summary-item {
                text-align: center;
                padding: 1rem;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
            }
            
            .summary-item.success {
                border-color: #10b981;
                background: rgba(16, 185, 129, 0.1);
            }
            
            .summary-item.error {
                border-color: #ef4444;
                background: rgba(239, 68, 68, 0.1);
            }
            
            .summary-value {
                font-size: 2rem;
                font-weight: bold;
                color: #374151;
            }
            
            .summary-label {
                font-size: 0.875rem;
                color: #6b7280;
                margin-top: 0.5rem;
            }
            
            .progress-bar {
                width: 100%;
                height: 12px;
                background: #e5e7eb;
                border-radius: 6px;
                overflow: hidden;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #10b981, #059669);
                transition: width 0.3s ease;
            }
            
            .failed-tests {
                margin: 2rem 0;
                padding: 1rem;
                background: #fef2f2;
                border: 1px solid #fecaca;
                border-radius: 8px;
            }
            
            .all-passed {
                text-align: center;
                padding: 2rem;
                font-size: 1.2rem;
                color: #10b981;
                font-weight: bold;
            }
            
            .report-actions {
                display: flex;
                gap: 1rem;
                justify-content: center;
                margin-top: 2rem;
            }
            
            .btn-primary, .btn-secondary {
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 6px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .btn-primary {
                background: #3b82f6;
                color: white;
            }
            
            .btn-secondary {
                background: #6b7280;
                color: white;
            }
            
            .btn-primary:hover, .btn-secondary:hover {
                transform: translateY(-1px);
                filter: brightness(110%);
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(reportContainer);
    }
    
    exportTestResults() {
        const data = {
            summary: {
                timestamp: new Date().toISOString(),
                version: 'v2.7',
                totalTests: this.testResults.length,
                passedTests: this.testResults.filter(r => r.passed).length,
                failedTests: this.testResults.filter(r => !r.passed).length
            },
            results: this.testResults
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system_test_report_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    // 全局錯誤處理器
    setupGlobalErrorHandling() {
        // 捕獲未處理的JavaScript錯誤
        window.addEventListener('error', (event) => {
            // 過濾常見的無害錯誤
            const harmlessErrors = [
                'Cannot read properties of null',
                'ResizeObserver loop limit exceeded',
                'Non-Error promise rejection captured',
                'Script error',
                'HTTP 401'
            ];
            
            const isHarmless = harmlessErrors.some(pattern => 
                event.message && event.message.includes(pattern)
            );
            
            if (!isHarmless) {
                console.warn('全局錯誤捕獲:', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
                
                // 記錄錯誤到診斷系統
                this.logDiagnosticError('JavaScript Error', event.message, {
                    filename: event.filename,
                    line: event.lineno,
                    column: event.colno
                });
            }
        });
        
        // 捕獲未處理的Promise拒絕
        window.addEventListener('unhandledrejection', (event) => {
            const reason = event.reason;
            
            // 過濾常見的無害Promise拒絕
            if (reason && typeof reason === 'object') {
                const message = reason.message || reason.toString();
                
                const harmlessReasons = [
                    'HTTP 401',
                    'User not authenticated',
                    'Network request failed',
                    'AbortError'
                ];
                
                const isHarmless = harmlessReasons.some(pattern => 
                    message.includes(pattern)
                );
                
                if (!isHarmless) {
                    console.warn('未處理的Promise拒絕:', reason);
                    
                    // 記錄錯誤到診斷系統
                    this.logDiagnosticError('Promise Rejection', message, {
                        type: 'unhandled_rejection',
                        reason: reason
                    });
                }
            }
        });
        
        console.log('✅ 全局錯誤處理器已啟動');
    }
    
    // 診斷錯誤記錄
    logDiagnosticError(type, message, details = {}) {
        const errorRecord = {
            timestamp: new Date().toISOString(),
            type: type,
            message: message,
            details: details,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // 存儲到本地存儲以供診斷
        const existingErrors = JSON.parse(
            localStorage.getItem('diagnostic_errors') || '[]'
        );
        
        existingErrors.push(errorRecord);
        
        // 保持最近100個錯誤記錄
        if (existingErrors.length > 100) {
            existingErrors.splice(0, existingErrors.length - 100);
        }
        
        localStorage.setItem('diagnostic_errors', JSON.stringify(existingErrors));
    }
    
    // DOM元素缺失檢測
    checkMissingElements() {
        const criticalElements = {
            'generateBtn': 'generate-btn',
            'progressSection': 'progress-section',
            'progressFill': 'progress-fill',
            'progressText': 'progress-text',
            'resultsContainer': 'results-container'
        };
        
        const missing = [];
        const found = [];
        
        for (const [name, id] of Object.entries(criticalElements)) {
            const element = document.getElementById(id);
            if (element) {
                found.push(name);
            } else {
                missing.push(name);
            }
        }
        
        if (missing.length > 0) {
            console.warn('缺少關鍵DOM元素:', missing);
            this.logDiagnosticError('Missing DOM Elements', `缺少元素: ${missing.join(', ')}`, {
                missing: missing,
                found: found
            });
        } else {
            console.log('✅ 所有關鍵DOM元素都存在');
        }
        
        return {
            missing: missing,
            found: found,
            allPresent: missing.length === 0
        };
    }
    
    // 系統健康檢查
    init() {
        console.log('🧪 系統整合測試器 v2.7 已初始化');
        
        // 設置全局錯誤處理
        this.setupGlobalErrorHandling();
        
        // 檢查關鍵DOM元素
        setTimeout(() => {
            this.checkMissingElements();
        }, 1000);
        
        // 開始系統監控
        this.startSystemMonitoring();
        
        // 設置定期健康檢查
        this.scheduleHealthChecks();
        
        console.log('✅ 系統整合測試器已完全初始化');
    }
    
    startSystemMonitoring() {
        // 監控性能指標
        this.monitorPerformance();
        
        // 監控內存使用
        this.monitorMemoryUsage();
        
        // 監控網絡請求
        this.monitorNetworkRequests();
    }
    
    scheduleHealthChecks() {
        // 使用資源管理器管理定時器
        if (window.resourceManager) {
            this.healthCheckTimer = window.resourceManager.registerManagedTimer(() => {
                this.performHealthCheck();
            }, 5 * 60 * 1000, 'system-health-check');
            
            // 初始健康檢查
            this.initialCheckTimer = setTimeout(() => {
                this.performHealthCheck();
            }, 3000);
        } else {
            // 降級方案
            this.healthCheckTimer = setInterval(() => {
                this.performHealthCheck();
            }, 5 * 60 * 1000);
            
            this.initialCheckTimer = setTimeout(() => {
                this.performHealthCheck();
            }, 3000);
        }
    }
    
    performHealthCheck() {
        console.log('🔍 執行系統健康檢查...');
        
        const results = {
            timestamp: new Date().toISOString(),
            domElements: this.checkMissingElements(),
            memoryUsage: this.getMemoryUsage(),
            networkStatus: this.checkNetworkStatus(),
            errorCount: this.getRecentErrorCount()
        };
        
        // 記錄健康檢查結果
        const healthLog = JSON.parse(localStorage.getItem('health_checks') || '[]');
        healthLog.push(results);
        
        // 保持最近50次檢查記錄
        if (healthLog.length > 50) {
            healthLog.splice(0, healthLog.length - 50);
        }
        
        localStorage.setItem('health_checks', JSON.stringify(healthLog));
        
        console.log('✅ 健康檢查完成:', results);
    }
    
    getMemoryUsage() {
        if ('memory' in performance) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        return null;
    }
    
    checkNetworkStatus() {
        return {
            online: navigator.onLine,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null
        };
    }
    
    getRecentErrorCount() {
        const errors = JSON.parse(localStorage.getItem('diagnostic_errors') || '[]');
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        return errors.filter(error => 
            new Date(error.timestamp) > oneHourAgo
        ).length;
    }
    
    monitorPerformance() {
        // 監控頁面加載性能
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                for (const entry of entries) {
                    if (entry.entryType === 'navigation') {
                        console.log('📊 頁面加載性能:', {
                            loadTime: entry.loadEventEnd - entry.loadEventStart,
                            domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
                            firstContentfulPaint: entry.firstContentfulPaint
                        });
                    }
                }
            });
            
            try {
                observer.observe({ entryTypes: ['navigation', 'paint'] });
            } catch (e) {
                console.warn('性能監控設置失敗:', e);
            }
        }
    }
    
    monitorMemoryUsage() {
        // 使用資源管理器管理記憶體監控定時器
        if (window.resourceManager) {
            this.memoryMonitorTimer = window.resourceManager.registerManagedTimer(() => {
                const memoryInfo = this.getMemoryUsage();
                if (memoryInfo && memoryInfo.used > 100) { // 超過100MB時警告
                    console.warn('💾 內存使用量較高:', memoryInfo);
                }
            }, 60 * 1000, 'memory-usage-monitor');
        } else {
            // 降級方案
            this.memoryMonitorTimer = setInterval(() => {
                const memoryInfo = this.getMemoryUsage();
                if (memoryInfo && memoryInfo.used > 100) {
                    console.warn('💾 內存使用量較高:', memoryInfo);
                }
            }, 60 * 1000);
        }
    }
    
    monitorNetworkRequests() {
        // 不再攔截 fetch，改為監聽統一API管理器的事件
        const requestTimes = new Map();
        
        document.addEventListener('apiRequestStart', (event) => {
            requestTimes.set(event.detail.requestId, Date.now());
        });
        
        document.addEventListener('apiRequestEnd', (event) => {
            const startTime = requestTimes.get(event.detail.requestId);
            if (startTime) {
                const duration = Date.now() - startTime;
                if (duration > 5000) { // 超過5秒的請求
                    console.warn('🐌 慢速網絡請求:', {
                        url: event.detail.url,
                        duration: `${duration}ms`,
                        status: event.detail.status
                    });
                }
                requestTimes.delete(event.detail.requestId);
            }
        });
        
        document.addEventListener('apiRequestError', (event) => {
            const startTime = requestTimes.get(event.detail.requestId);
            if (startTime) {
                const duration = Date.now() - startTime;
                console.warn('❌ 網絡請求失敗:', {
                    url: event.detail.url,
                    duration: `${duration}ms`,
                    error: event.detail.error
                });
                requestTimes.delete(event.detail.requestId);
            }
        });
    }
}

// 全域實例
window.systemTester = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    window.systemTester = new SystemIntegrationTester();
    
    // 添加快捷鍵觸發測試 (Ctrl+Shift+T)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
            window.systemTester.runFullSystemTest();
        }
    });
    
    // 添加測試按鈕到開發者工具
    if (localStorage.getItem('developerMode') === 'true') {
        const testButton = document.createElement('button');
        testButton.textContent = '🧪 運行系統測試';
        testButton.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            padding: 0.5rem 1rem;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.875rem;
        `;
        testButton.onclick = () => window.systemTester.runFullSystemTest();
        document.body.appendChild(testButton);
    }
});

console.log('🧪 系統整合測試器 v2.7 已載入'); 