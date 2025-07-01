/**
 * 用戶體驗增強模組 v2.7
 * 提升可訪問性、響應式設計和錯誤處理
 */

class UXEnhancement {
    constructor() {
        this.touchSupport = 'ontouchstart' in window;
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.highContrast = window.matchMedia('(prefers-contrast: high)').matches;
        this.prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        this.notifications = [];
        this.errorQueue = [];
        this.accessibilityMode = localStorage.getItem('accessibilityMode') === 'true';
        
        this.init();
        console.log('✨ 用戶體驗增強模組 v2.7 已初始化');
    }
    
    init() {
        this.setupAccessibility();
        this.setupMobileOptimization();
        this.setupErrorHandling();
        this.setupKeyboardNavigation();
        this.setupTouchGestures();
        this.setupProgressIndicators();
        this.setupSmartDefaults();
        this.setupContextualHelp();
    }
    
    setupAccessibility() {
        // 添加 ARIA 標籤
        this.enhanceARIA();
        
        // 設置焦點管理
        this.setupFocusManagement();
        
        // 添加螢幕閱讀器支援
        this.setupScreenReaderSupport();
        
        // 設置高對比模式
        if (this.highContrast || this.accessibilityMode) {
            this.enableHighContrastMode();
        }
        
        // 添加跳轉連結
        this.addSkipLinks();
    }
    
    enhanceARIA() {
        // 為動態內容添加 ARIA 標籤
        const buttons = document.querySelectorAll('button:not([aria-label])');
        buttons.forEach(btn => {
            if (!btn.getAttribute('aria-label') && btn.textContent.trim()) {
                btn.setAttribute('aria-label', btn.textContent.trim());
            }
        });
        
        // 為表單元素添加描述
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label && !input.getAttribute('aria-describedby')) {
                const helpText = label.nextElementSibling;
                if (helpText && helpText.classList.contains('help-text')) {
                    input.setAttribute('aria-describedby', helpText.id || `help-${input.id}`);
                }
            }
        });
        
        // 為導航元素添加 ARIA
        const nav = document.querySelector('.tab-navigation');
        if (nav) {
            nav.setAttribute('role', 'navigation');
            nav.setAttribute('aria-label', '主要導航');
        }
    }
    
    setupFocusManagement() {
        // 管理焦點順序
        this.setupFocusTrap();
        
        // 添加可見焦點指示器
        this.enhanceFocusIndicators();
        
        // 自動焦點管理
        this.setupAutoFocus();
    }
    
    setupFocusTrap() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const modal = document.querySelector('.modal.active, .popup.active');
                if (modal) {
                    this.trapFocus(e, modal);
                }
            }
        });
    }
    
    trapFocus(e, container) {
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    }
    
    enhanceFocusIndicators() {
        const style = document.createElement('style');
        style.textContent = `
            *:focus {
                outline: 3px solid #4f46e5 !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 0 1px rgba(79, 70, 229, 0.3) !important;
            }
            
            .focus-visible:focus {
                outline: 3px solid #10b981 !important;
            }
            
            .high-contrast *:focus {
                outline: 4px solid #ffff00 !important;
                outline-offset: 2px !important;
                background: rgba(255, 255, 0, 0.1) !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    setupAutoFocus() {
        // 自動聚焦到錯誤字段
        document.addEventListener('DOMContentLoaded', () => {
            const errorField = document.querySelector('.error input, .error textarea');
            if (errorField) {
                setTimeout(() => errorField.focus(), 100);
            }
        });
        
        // 模態框開啟時聚焦
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList?.contains('modal')) {
                        const firstInput = node.querySelector('input, button');
                        if (firstInput) {
                            setTimeout(() => firstInput.focus(), 100);
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    setupScreenReaderSupport() {
        // 創建螢幕閱讀器公告區
        const announcer = document.createElement('div');
        announcer.id = 'screen-reader-announcer';
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        document.body.appendChild(announcer);
        
        // 全域公告函數
        window.announceToScreenReader = (message) => {
            announcer.textContent = message;
            setTimeout(() => {
                announcer.textContent = '';
            }, 1000);
        };
    }
    
    enableHighContrastMode() {
        document.documentElement.classList.add('high-contrast');
        
        const style = document.createElement('style');
        style.textContent = `
            .high-contrast {
                --bg-color: #000000 !important;
                --text-color: #ffffff !important;
                --border-color: #ffffff !important;
                --primary-color: #ffff00 !important;
                --secondary-color: #00ffff !important;
                --error-color: #ff6b6b !important;
                --success-color: #51cf66 !important;
            }
            
            .high-contrast * {
                background-color: var(--bg-color) !important;
                color: var(--text-color) !important;
                border-color: var(--border-color) !important;
            }
            
            .high-contrast button, .high-contrast .btn {
                background-color: var(--primary-color) !important;
                color: #000000 !important;
                border: 2px solid var(--text-color) !important;
            }
            
            .high-contrast img {
                filter: contrast(150%) brightness(150%) !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    addSkipLinks() {
        const skipLinks = document.createElement('div');
        skipLinks.className = 'skip-links';
        skipLinks.innerHTML = `
            <a href="#main-content" class="skip-link">跳至主要內容</a>
            <a href="#navigation" class="skip-link">跳至導航</a>
            <a href="#search" class="skip-link">跳至搜尋</a>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            .skip-links {
                position: absolute;
                top: -100px;
                left: 0;
                z-index: 10000;
            }
            
            .skip-link {
                position: absolute;
                top: 0;
                left: 0;
                padding: 1rem;
                background: #000;
                color: #fff;
                text-decoration: none;
                transform: translateY(-100%);
                transition: transform 0.3s;
            }
            
            .skip-link:focus {
                transform: translateY(0);
            }
        `;
        
        document.head.appendChild(style);
        document.body.insertBefore(skipLinks, document.body.firstChild);
    }
    
    setupMobileOptimization() {
        // 觸控優化
        this.optimizeTouchTargets();
        
        // 視窗調整
        this.setupViewportOptimization();
        
        // 手勢支援
        this.setupGestureSupport();
        
        // 方向變化處理
        this.handleOrientationChange();
    }
    
    optimizeTouchTargets() {
        if (this.touchSupport) {
            const style = document.createElement('style');
            style.textContent = `
                @media (pointer: coarse) {
                    button, .btn, a, input, select {
                        min-height: 44px !important;
                        min-width: 44px !important;
                        padding: 12px !important;
                    }
                    
                    .tab-btn {
                        padding: 16px 12px !important;
                    }
                    
                    .slider-thumb {
                        width: 28px !important;
                        height: 28px !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    setupViewportOptimization() {
        // 動態調整視窗
        const updateViewport = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        window.addEventListener('resize', updateViewport);
        window.addEventListener('orientationchange', updateViewport);
        updateViewport();
    }
    
    setupGestureSupport() {
        if (this.touchSupport) {
            // 滑動手勢
            this.setupSwipeGestures();
            
            // 捏合縮放
            this.setupPinchZoom();
        }
    }
    
    setupSwipeGestures() {
        let startX = 0;
        let startY = 0;
        let endX = 0;
        let endY = 0;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            endY = e.changedTouches[0].clientY;
            
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            
            // 水平滑動切換標籤
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                const tabNavigation = document.querySelector('.tab-navigation');
                if (tabNavigation) {
                    if (deltaX > 0) {
                        this.switchToPreviousTab();
                    } else {
                        this.switchToNextTab();
                    }
                }
            }
        }, { passive: true });
    }
    
    handleOrientationChange() {
        window.addEventListener('orientationchange', () => {
            // 延遲處理，等待瀏覽器完成方向變化
            setTimeout(() => {
                this.adjustLayoutForOrientation();
                this.announceOrientationChange();
            }, 100);
        });
    }
    
    adjustLayoutForOrientation() {
        const isLandscape = window.innerWidth > window.innerHeight;
        document.documentElement.classList.toggle('landscape', isLandscape);
        document.documentElement.classList.toggle('portrait', !isLandscape);
        
        // 觸發自定義事件
        document.dispatchEvent(new CustomEvent('orientationAdjusted', {
            detail: { isLandscape }
        }));
    }
    
    announceOrientationChange() {
        const orientation = window.innerWidth > window.innerHeight ? '橫向' : '直向';
        window.announceToScreenReader?.(`螢幕方向已變更為${orientation}模式`);
    }
    
    setupErrorHandling() {
        // 全域錯誤處理
        this.setupGlobalErrorHandler();
        
        // 表單驗證增強
        this.enhanceFormValidation();
        
        // 友善錯誤訊息
        this.setupFriendlyErrorMessages();
        
        // 錯誤恢復機制
        this.setupErrorRecovery();
    }
    
    setupFriendlyErrorMessages() {
        console.log('💬 設置友善錯誤訊息...');
        // 友善錯誤訊息設置
        this.errorMessageTemplates = {
            network: '網路連線似乎有問題，請檢查您的網路狀態',
            server: '服務器暫時無法回應，請稍後再試',
            validation: '請檢查您輸入的資料是否正確',
            permission: '您沒有執行此操作的權限',
            timeout: '操作超時，請重新嘗試'
        };
    }
    
    setupErrorRecovery() {
        console.log('🔧 設置錯誤恢復機制...');
        // 錯誤恢復機制
        this.recoveryStrategies = {
            retry: () => window.location.reload(),
            refresh: () => window.location.reload(),
            goBack: () => window.history.back(),
            clearCache: () => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
            }
        };
    }
    
    enhanceFormValidation() {
        console.log('✅ 增強表單驗證...');
        // 表單驗證增強邏輯
        this.setupRealTimeValidation();
        this.setupFormAccessibility();
        this.setupValidationMessages();
    }
    
    setupRealTimeValidation() {
        // 即時表單驗證
        document.addEventListener('input', (e) => {
            if (e.target.matches('input, textarea, select')) {
                this.validateField(e.target);
            }
        });
    }
    
    setupFormAccessibility() {
        // 增強表單可訪問性
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            this.enhanceFormAria(form);
        });
    }
    
    setupValidationMessages() {
        // 設置驗證訊息
        this.validationMessages = {
            required: '此欄位為必填',
            email: '請輸入有效的電子郵件地址',
            password: '密碼長度至少8個字符',
            confirm: '密碼確認不匹配'
        };
    }
    
    validateField(field) {
        // 驗證單個欄位
        const isValid = field.checkValidity();
        field.classList.toggle('invalid', !isValid);
        field.classList.toggle('valid', isValid);
        
        if (!isValid) {
            this.showFieldError(field);
        } else {
            this.hideFieldError(field);
        }
    }
    
    enhanceFormAria(form) {
        // 增強表單 ARIA 屬性
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
                const label = form.querySelector(`label[for="${input.id}"]`);
                if (label) {
                    input.setAttribute('aria-labelledby', label.id || (label.id = `label-${input.id}`));
                }
            }
        });
    }
    
    showFieldError(field) {
        // 顯示欄位錯誤
        const errorId = `error-${field.name || field.id}`;
        let errorElement = document.getElementById(errorId);
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = errorId;
            errorElement.className = 'field-error';
            errorElement.setAttribute('role', 'alert');
            field.parentNode.insertBefore(errorElement, field.nextSibling);
        }
        
        errorElement.textContent = field.validationMessage || this.validationMessages.required;
        field.setAttribute('aria-describedby', errorId);
    }
    
    hideFieldError(field) {
        // 隱藏欄位錯誤
        const errorId = `error-${field.name || field.id}`;
        const errorElement = document.getElementById(errorId);
        
        if (errorElement) {
            errorElement.remove();
            field.removeAttribute('aria-describedby');
        }
    }
    
    setupGlobalErrorHandler() {
        window.addEventListener('error', (e) => {
            this.handleError({
                type: 'javascript',
                message: e.message,
                filename: e.filename,
                line: e.lineno,
                column: e.colno,
                stack: e.error?.stack
            });
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            this.handleError({
                type: 'promise',
                message: e.reason?.message || e.reason,
                stack: e.reason?.stack
            });
        });
    }
    
    handleError(errorInfo) {
        console.error('系統錯誤:', errorInfo);
        
        // 記錄錯誤
        this.errorQueue.push({
            ...errorInfo,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        });
        
        // 顯示友善錯誤訊息
        this.showFriendlyError(errorInfo);
        
        // 如果是關鍵錯誤，提供恢復選項
        if (this.isCriticalError(errorInfo)) {
            this.offerErrorRecovery();
        }
    }
    
    showFriendlyError(errorInfo) {
        const friendlyMessages = {
            'javascript': '抱歉，頁面出現了一些問題。請重新整理頁面或稍後再試。',
            'promise': '系統正在處理您的請求時遇到了問題。請稍後再試。',
            'network': '網路連線似乎有問題。請檢查您的網路連線。',
            'timeout': '操作逾時。請稍後再試或聯繫支援團隊。'
        };
        
        const message = friendlyMessages[errorInfo.type] || '發生未知錯誤，請聯繫支援團隊。';
        
        this.showNotification(message, 'error', {
            persistent: true,
            actions: [
                {
                    text: '重新整理',
                    action: () => window.location.reload()
                },
                {
                    text: '回報問題',
                    action: () => this.reportError(errorInfo)
                }
            ]
        });
    }
    
    isCriticalError(errorInfo) {
        const criticalPatterns = [
            /cannot read property/i,
            /is not a function/i,
            /script error/i,
            /network error/i
        ];
        
        return criticalPatterns.some(pattern => 
            pattern.test(errorInfo.message)
        );
    }
    
    offerErrorRecovery() {
        const recoveryOptions = document.createElement('div');
        recoveryOptions.className = 'error-recovery-panel';
        recoveryOptions.innerHTML = `
            <div class="recovery-content">
                <h3>🔧 系統恢復選項</h3>
                <p>系統偵測到嚴重錯誤，以下是一些恢復選項：</p>
                <div class="recovery-actions">
                    <button onclick="this.parentElement.parentElement.parentElement.remove(); window.location.reload();">
                        🔄 重新載入頁面
                    </button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove(); localStorage.clear(); window.location.reload();">
                        🧹 清除快取並重新載入
                    </button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove(); window.uxEnhancement.enableSafeMode();">
                        ⚡ 進入安全模式
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(recoveryOptions);
    }
    
    enableSafeMode() {
        localStorage.setItem('safeMode', 'true');
        
        // 禁用非關鍵功能
        document.querySelectorAll('.advanced-feature').forEach(el => {
            el.style.display = 'none';
        });
        
        // 簡化 UI
        document.documentElement.classList.add('safe-mode');
        
        this.showNotification('已進入安全模式。部分功能已暫時停用以確保穩定性。', 'info');
    }
    
    setupKeyboardNavigation() {
        // 改進鍵盤導航
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'Escape':
                    this.handleEscapeKey();
                    break;
                case 'Enter':
                    this.handleEnterKey(e);
                    break;
                case 'ArrowLeft':
                case 'ArrowRight':
                    this.handleArrowKeys(e);
                    break;
            }
        });
        
        // 添加快捷鍵
        this.setupKeyboardShortcuts();
    }
    
    handleEscapeKey() {
        // 關閉模態框
        const modal = document.querySelector('.modal.active, .popup.active');
        if (modal) {
            modal.classList.remove('active');
            return;
        }
        
        // 清除選擇
        const selected = document.querySelector('.selected');
        if (selected) {
            selected.classList.remove('selected');
            return;
        }
        
        // 取消焦點
        if (document.activeElement && document.activeElement.blur) {
            document.activeElement.blur();
        }
    }
    
    setupKeyboardShortcuts() {
        const shortcuts = {
            'ctrl+k': () => this.focusSearch(),
            'ctrl+/': () => this.showShortcutHelp(),
            'alt+1': () => this.switchToTab(0),
            'alt+2': () => this.switchToTab(1),
            'alt+3': () => this.switchToTab(2),
            'alt+4': () => this.switchToTab(3)
        };
        
        document.addEventListener('keydown', (e) => {
            const key = [
                e.ctrlKey ? 'ctrl' : '',
                e.altKey ? 'alt' : '',
                e.shiftKey ? 'shift' : '',
                e.key.toLowerCase()
            ].filter(Boolean).join('+');
            
            if (shortcuts[key]) {
                e.preventDefault();
                shortcuts[key]();
            }
        });
    }
    
    handleEnterKey(e) {
        // 處理Enter鍵
        if (e.target.matches('button, [role="button"]')) {
            e.target.click();
        }
    }
    
    handleArrowKeys(e) {
        // 處理方向鍵導航
        const focusableElements = document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const currentIndex = Array.from(focusableElements).indexOf(document.activeElement);
        
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            const nextIndex = (currentIndex + 1) % focusableElements.length;
            focusableElements[nextIndex]?.focus();
            e.preventDefault();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            const prevIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
            focusableElements[prevIndex]?.focus();
            e.preventDefault();
        }
    }
    
    focusSearch() {
        // 聚焦搜索框
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="搜索"], input[placeholder*="search"]');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }
    
    showShortcutHelp() {
        // 顯示快捷鍵幫助
        this.showNotification(`
            <h4>鍵盤快捷鍵</h4>
            <ul>
                <li><kbd>Ctrl</kbd> + <kbd>K</kbd> - 搜索</li>
                <li><kbd>Ctrl</kbd> + <kbd>/</kbd> - 顯示幫助</li>
                <li><kbd>Alt</kbd> + <kbd>1-4</kbd> - 切換標籤</li>
                <li><kbd>Esc</kbd> - 關閉彈框</li>
            </ul>
        `, 'info', { duration: 8000 });
    }
    
    setupTouchGestures() {
        if (!this.touchSupport) return;
        
        // 長按手勢
        this.setupLongPress();
        
        // 雙擊手勢
        this.setupDoubleTap();
    }
    
    setupLongPress() {
        let pressTimer;
        
        document.addEventListener('touchstart', (e) => {
            pressTimer = setTimeout(() => {
                this.handleLongPress(e.target);
            }, 500);
        });
        
        document.addEventListener('touchend', () => {
            clearTimeout(pressTimer);
        });
        
        document.addEventListener('touchmove', () => {
            clearTimeout(pressTimer);
        });
    }
    
    handleLongPress(element) {
        // 顯示上下文選單
        if (element.dataset.contextMenu) {
            this.showContextMenu(element);
        }
        
        // 觸覺回饋
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }
    
    showContextMenu(element) {
        // 創建上下文選單
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
            <div class="context-menu-item" onclick="this.parentElement.remove();">複製</div>
            <div class="context-menu-item" onclick="this.parentElement.remove();">分享</div>
            <div class="context-menu-item" onclick="this.parentElement.remove();">更多選項</div>
        `;
        
        // 定位選單
        const rect = element.getBoundingClientRect();
        menu.style.top = `${rect.bottom + window.scrollY}px`;
        menu.style.left = `${rect.left + window.scrollX}px`;
        
        document.body.appendChild(menu);
        
        // 點擊其他地方時隱藏選單
        setTimeout(() => {
            document.addEventListener('click', () => {
                menu.remove();
            }, { once: true });
        }, 100);
    }
    
    setupProgressIndicators() {
        // 為長時間操作添加進度指示器
        this.enhanceProgressFeedback();
        
        // 載入狀態指示
        this.setupLoadingIndicators();
    }
    
    setupLoadingIndicators() {
        console.log('⏳ 設置載入指示器...');
        // 為按鈕添加載入狀態
        this.enhanceButtonLoadingStates();
        
        // 為表單提交添加載入指示
        this.enhanceFormSubmissionIndicators();
        
        // 設置頁面載入指示器
        this.setupPageLoadIndicators();
    }
    
    enhanceButtonLoadingStates() {
        // 為按鈕添加載入狀態處理
        document.addEventListener('click', (e) => {
            if (e.target.matches('button[type="submit"], .btn-submit')) {
                this.showButtonLoading(e.target);
            }
        });
    }
    
    showButtonLoading(button) {
        if (button.classList.contains('loading')) return;
        
        const originalText = button.textContent;
        button.classList.add('loading');
        button.disabled = true;
        button.textContent = '處理中...';
        
        // 自動恢復（防止卡住）
        setTimeout(() => {
            this.hideButtonLoading(button, originalText);
        }, 10000);
    }
    
    hideButtonLoading(button, originalText) {
        button.classList.remove('loading');
        button.disabled = false;
        button.textContent = originalText;
    }
    
    enhanceFormSubmissionIndicators() {
        // 為表單提交添加載入指示
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                this.showFormLoadingIndicator(form);
            });
        });
    }
    
    showFormLoadingIndicator(form) {
        const overlay = document.createElement('div');
        overlay.className = 'form-loading-overlay';
        overlay.innerHTML = `
            <div class="form-loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-message">正在提交表單...</div>
            </div>
        `;
        
        form.style.position = 'relative';
        form.appendChild(overlay);
        
        // 自動移除（防止卡住）
        setTimeout(() => {
            if (overlay.parentElement) {
                overlay.remove();
            }
        }, 30000);
    }
    
    setupPageLoadIndicators() {
        // 頁面載入進度指示器
        if (document.readyState === 'loading') {
            this.showPageLoadingIndicator();
            
            document.addEventListener('DOMContentLoaded', () => {
                this.hidePageLoadingIndicator();
            });
        }
    }
    
    showPageLoadingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'page-loading-indicator';
        indicator.className = 'page-loading-indicator';
        indicator.innerHTML = `
            <div class="loading-bar">
                <div class="loading-progress"></div>
            </div>
        `;
        
        document.body.appendChild(indicator);
    }
    
    hidePageLoadingIndicator() {
        const indicator = document.getElementById('page-loading-indicator');
        if (indicator) {
            indicator.style.opacity = '0';
            setTimeout(() => {
                indicator.remove();
            }, 300);
        }
    }
    
    enhanceProgressFeedback() {
        // 不再攔截 fetch，改為監聽統一API管理器的事件
        document.addEventListener('apiRequestStart', (event) => {
            event.detail.loadingId = this.showLoadingIndicator('正在處理請求...');
        });
        
        document.addEventListener('apiRequestEnd', (event) => {
            if (event.detail.loadingId) {
                this.hideLoadingIndicator(event.detail.loadingId);
            }
        });
        
        document.addEventListener('apiRequestError', (event) => {
            if (event.detail.loadingId) {
                this.hideLoadingIndicator(event.detail.loadingId);
            }
        });
    }
    
    showLoadingIndicator(message = '載入中...') {
        const id = Date.now().toString();
        const indicator = document.createElement('div');
        indicator.id = `loading-${id}`;
        indicator.className = 'loading-indicator';
        indicator.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
            </div>
        `;
        
        document.body.appendChild(indicator);
        return id;
    }
    
    hideLoadingIndicator(id) {
        const indicator = document.getElementById(`loading-${id}`);
        if (indicator) {
            indicator.remove();
        }
    }
    
    setupSmartDefaults() {
        // 智能表單填充
        this.setupSmartFormFilling();
        
        // 自動儲存功能
        this.setupAutoSave();
        
        // 記住用戶偏好
        this.setupPreferenceMemory();
    }
    
    setupAutoSave() {
        console.log('💾 設置自動儲存功能...');
        // 為文本區域和長表單設置自動儲存
        const formElements = document.querySelectorAll('textarea, input[type="text"], input[type="email"]');
        
        formElements.forEach(element => {
            let saveTimer;
            
            element.addEventListener('input', () => {
                clearTimeout(saveTimer);
                saveTimer = setTimeout(() => {
                    this.autoSaveField(element);
                }, 2000); // 2秒後自動儲存
            });
            
            // 載入已儲存的值
            this.loadSavedValue(element);
        });
    }
    
    autoSaveField(element) {
        const fieldId = element.id || element.name;
        if (fieldId && element.value.trim()) {
            localStorage.setItem(`autosave_${fieldId}`, element.value);
            this.showAutoSaveIndicator(element);
        }
    }
    
    loadSavedValue(element) {
        const fieldId = element.id || element.name;
        if (fieldId) {
            const savedValue = localStorage.getItem(`autosave_${fieldId}`);
            if (savedValue && !element.value) {
                element.value = savedValue;
                this.showRestoredIndicator(element);
            }
        }
    }
    
    showAutoSaveIndicator(element) {
        // 顯示自動儲存指示器
        const indicator = document.createElement('span');
        indicator.className = 'autosave-indicator';
        indicator.textContent = '已自動儲存';
        indicator.style.cssText = `
            position: absolute;
            top: -20px;
            right: 0;
            font-size: 0.75rem;
            color: #10b981;
            opacity: 1;
            transition: opacity 0.3s;
        `;
        
        element.parentElement.style.position = 'relative';
        element.parentElement.appendChild(indicator);
        
        setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => indicator.remove(), 300);
        }, 2000);
    }
    
    showRestoredIndicator(element) {
        // 顯示恢復內容指示器
        const indicator = document.createElement('div');
        indicator.className = 'restored-indicator';
        indicator.innerHTML = `
            <span>💾 已恢復先前輸入的內容</span>
            <button onclick="this.parentElement.remove(); localStorage.removeItem('autosave_${element.id || element.name}'); location.reload();">清除</button>
        `;
        element.parentElement.insertBefore(indicator, element);
    }
    
    setupPreferenceMemory() {
        console.log('🧠 設置用戶偏好記憶...');
        // 記住用戶的選擇和設置
        this.rememberFormSelections();
        this.rememberUIPreferences();
    }
    
    rememberFormSelections() {
        // 記住選擇框和單選按鈕的選擇
        const selectElements = document.querySelectorAll('select, input[type="radio"], input[type="checkbox"]');
        
        selectElements.forEach(element => {
            const prefKey = `pref_${element.name || element.id}`;
            
            // 載入儲存的偏好
            const savedValue = localStorage.getItem(prefKey);
            if (savedValue) {
                if (element.type === 'checkbox') {
                    element.checked = savedValue === 'true';
                } else if (element.type === 'radio') {
                    if (element.value === savedValue) {
                        element.checked = true;
                    }
                } else {
                    element.value = savedValue;
                }
            }
            
            // 儲存新的選擇
            element.addEventListener('change', () => {
                if (element.type === 'checkbox') {
                    localStorage.setItem(prefKey, element.checked);
                } else {
                    localStorage.setItem(prefKey, element.value);
                }
            });
        });
    }
    
    rememberUIPreferences() {
        // 記住 UI 偏好（如摺疊面板狀態）
        const collapsibleElements = document.querySelectorAll('[data-collapsible]');
        
        collapsibleElements.forEach(element => {
            const prefKey = `ui_${element.dataset.collapsible}`;
            const savedState = localStorage.getItem(prefKey);
            
            if (savedState === 'collapsed') {
                element.classList.add('collapsed');
            }
            
            element.addEventListener('click', () => {
                element.classList.toggle('collapsed');
                localStorage.setItem(prefKey, element.classList.contains('collapsed') ? 'collapsed' : 'expanded');
            });
        });
    }
    
    setupSmartFormFilling() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            form.addEventListener('input', (e) => {
                const field = e.target;
                if (field.type === 'email' && field.value.includes('@')) {
                    this.suggestEmailDomains(field);
                }
            });
        });
    }
    
    suggestEmailDomains(emailField) {
        const commonDomains = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
            'qq.com', '163.com', '126.com', 'sina.com'
        ];
        
        const email = emailField.value;
        const atIndex = email.indexOf('@');
        
        if (atIndex > 0) {
            const username = email.substring(0, atIndex);
            const domain = email.substring(atIndex + 1);
            
            // 如果域名不完整，顯示建議
            if (domain.length > 0 && domain.length < 10) {
                const suggestions = commonDomains.filter(d => 
                    d.startsWith(domain.toLowerCase())
                );
                
                if (suggestions.length > 0) {
                    this.showEmailSuggestions(emailField, username, suggestions);
                }
            }
        }
    }
    
    showEmailSuggestions(field, username, suggestions) {
        // 移除現有的建議
        const existingSuggestions = document.querySelector('.email-suggestions');
        if (existingSuggestions) {
            existingSuggestions.remove();
        }
        
        const suggestionContainer = document.createElement('div');
        suggestionContainer.className = 'email-suggestions';
        suggestionContainer.innerHTML = `
            <div class="suggestion-title">建議的電子郵件:</div>
            ${suggestions.map(domain => `
                <div class="suggestion-item" onclick="this.parentElement.parentElement.querySelector('input').value='${username}@${domain}'; this.parentElement.remove();">
                    ${username}@${domain}
                </div>
            `).join('')}
        `;
        
        field.parentElement.style.position = 'relative';
        field.parentElement.appendChild(suggestionContainer);
        
        // 點擊其他地方時隱藏建議
        document.addEventListener('click', (e) => {
            if (!suggestionContainer.contains(e.target) && e.target !== field) {
                suggestionContainer.remove();
            }
        }, { once: true });
    }
    
    setupContextualHelp() {
        // 添加上下文相關的幫助
        this.addHelpButtons();
        
        // 工具提示增強
        this.enhanceTooltips();
        
        // 新手引導
        this.setupOnboarding();
    }
    
    enhanceTooltips() {
        console.log('💡 增強工具提示...');
        // 為有 title 屬性的元素增強工具提示
        const elementsWithTooltips = document.querySelectorAll('[title], [data-tooltip]');
        
        elementsWithTooltips.forEach(element => {
            const tooltipText = element.getAttribute('title') || element.getAttribute('data-tooltip');
            if (tooltipText) {
                // 移除原生 title 以避免重複顯示
                element.removeAttribute('title');
                
                element.addEventListener('mouseenter', (e) => {
                    this.showTooltip(e.target, tooltipText);
                });
                
                element.addEventListener('mouseleave', () => {
                    this.hideTooltip();
                });
                
                element.addEventListener('focus', (e) => {
                    this.showTooltip(e.target, tooltipText);
                });
                
                element.addEventListener('blur', () => {
                    this.hideTooltip();
                });
            }
        });
    }
    
    showTooltip(element, text) {
        this.hideTooltip(); // 隱藏現有的工具提示
        
        const tooltip = document.createElement('div');
        tooltip.id = 'enhanced-tooltip';
        tooltip.className = 'enhanced-tooltip';
        tooltip.textContent = text;
        
        document.body.appendChild(tooltip);
        
        // 定位工具提示
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let top = rect.top - tooltipRect.height - 8;
        let left = rect.left + (rect.width - tooltipRect.width) / 2;
        
        // 確保工具提示在視窗內
        if (top < 0) {
            top = rect.bottom + 8;
            tooltip.classList.add('below');
        }
        
        if (left < 0) {
            left = 8;
        } else if (left + tooltipRect.width > window.innerWidth) {
            left = window.innerWidth - tooltipRect.width - 8;
        }
        
        tooltip.style.top = `${top + window.scrollY}px`;
        tooltip.style.left = `${left + window.scrollX}px`;
        tooltip.style.opacity = '1';
    }
    
    hideTooltip() {
        const tooltip = document.getElementById('enhanced-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }
    
    setupOnboarding() {
        console.log('🎯 設置新手引導...');
        // 檢查是否是新用戶
        const isFirstVisit = !localStorage.getItem('has_visited');
        
        if (isFirstVisit) {
            setTimeout(() => {
                this.startOnboardingTour();
            }, 2000); // 延遲2秒開始引導
        }
        
        // 添加手動觸發引導的按鈕
        this.addOnboardingTrigger();
    }
    
    startOnboardingTour() {
        const onboardingSteps = [
            {
                element: '.tab-navigation',
                title: '歡迎使用！',
                content: '這裡是主要導航區域，您可以切換不同的功能模組。',
                position: 'bottom'
            },
            {
                element: '#prompt-input',
                title: '提示詞輸入',
                content: '在這裡輸入您的圖片生成提示詞。',
                position: 'top'
            },
            {
                element: '.ai-assistant-container',
                title: 'AI 助手',
                content: 'AI 助手可以幫助您優化提示詞和分析圖片。',
                position: 'left'
            }
        ];
        
        this.showOnboardingStep(onboardingSteps, 0);
        localStorage.setItem('has_visited', 'true');
    }
    
    showOnboardingStep(steps, stepIndex) {
        if (stepIndex >= steps.length) {
            this.completeOnboarding();
            return;
        }
        
        const step = steps[stepIndex];
        const targetElement = document.querySelector(step.element);
        
        if (!targetElement) {
            // 如果目標元素不存在，跳到下一步
            this.showOnboardingStep(steps, stepIndex + 1);
            return;
        }
        
        // 創建遮罩層
        const overlay = document.createElement('div');
        overlay.className = 'onboarding-overlay';
        
        // 創建高亮區域
        const highlight = document.createElement('div');
        highlight.className = 'onboarding-highlight';
        
        // 創建說明框
        const tooltip = document.createElement('div');
        tooltip.className = 'onboarding-tooltip';
        tooltip.innerHTML = `
            <h3>${step.title}</h3>
            <p>${step.content}</p>
            <div class="onboarding-controls">
                <button onclick="this.closest('.onboarding-overlay').remove()">跳過</button>
                <button onclick="window.uxEnhancement.showOnboardingStep(${JSON.stringify(steps)}, ${stepIndex + 1}); this.closest('.onboarding-overlay').remove();">
                    ${stepIndex === steps.length - 1 ? '完成' : '下一步'} (${stepIndex + 1}/${steps.length})
                </button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        overlay.appendChild(highlight);
        overlay.appendChild(tooltip);
        
        // 定位高亮和說明框
        this.positionOnboardingElements(targetElement, highlight, tooltip, step.position);
    }
    
    positionOnboardingElements(target, highlight, tooltip, position) {
        const rect = target.getBoundingClientRect();
        
        // 設置高亮位置
        highlight.style.top = `${rect.top + window.scrollY - 4}px`;
        highlight.style.left = `${rect.left + window.scrollX - 4}px`;
        highlight.style.width = `${rect.width + 8}px`;
        highlight.style.height = `${rect.height + 8}px`;
        
        // 設置說明框位置
        const tooltipRect = tooltip.getBoundingClientRect();
        let top, left;
        
        switch (position) {
            case 'top':
                top = rect.top - tooltipRect.height - 16;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'bottom':
                top = rect.bottom + 16;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.left - tooltipRect.width - 16;
                break;
            case 'right':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.right + 16;
                break;
            default:
                top = rect.bottom + 16;
                left = rect.left;
        }
        
        tooltip.style.top = `${top + window.scrollY}px`;
        tooltip.style.left = `${left + window.scrollX}px`;
    }
    
    completeOnboarding() {
        this.showNotification('🎉 歡迎完成新手引導！您現在可以開始使用所有功能了。', 'success');
    }
    
    addOnboardingTrigger() {
        // 添加一個按鈕讓用戶可以重新觀看引導
        const helpButton = document.createElement('button');
        helpButton.className = 'onboarding-trigger';
        helpButton.innerHTML = '❓';
        helpButton.title = '重新觀看新手引導';
        helpButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 80px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #8b5cf6;
            color: white;
            border: none;
            font-size: 20px;
            cursor: pointer;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        helpButton.onclick = () => {
            this.startOnboardingTour();
        };
        
        document.body.appendChild(helpButton);
    }
    
    addHelpButtons() {
        const complexElements = document.querySelectorAll(
            '.complex-feature, [data-help], .advanced-control'
        );
        
        complexElements.forEach(element => {
            const helpButton = document.createElement('button');
            helpButton.className = 'help-button';
            helpButton.innerHTML = '?';
            helpButton.setAttribute('aria-label', '顯示幫助');
            helpButton.onclick = () => this.showContextualHelp(element);
            
            element.style.position = 'relative';
            element.appendChild(helpButton);
        });
    }
    
    showContextualHelp(element) {
        const helpText = element.dataset.help || '這是一個進階功能，需要更多說明。';
        
        this.showNotification(helpText, 'info', {
            position: 'near-element',
            element: element
        });
    }
    
    // 公開方法
    showNotification(message, type = 'info', options = {}) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-message">${message}</div>
                ${options.actions ? `
                    <div class="notification-actions">
                        ${options.actions.map(action => 
                            `<button onclick="${action.action}">${action.text}</button>`
                        ).join('')}
                    </div>
                ` : ''}
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 自動消失（除非設定為持久）
        if (!options.persistent) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 5000);
        }
        
        // 螢幕閱讀器公告
        window.announceToScreenReader?.(message);
        
        return notification;
    }
    
    switchToTab(index) {
        const tabs = document.querySelectorAll('.tab-btn');
        if (tabs[index]) {
            tabs[index].click();
        }
    }
    
    reportError(errorInfo) {
        // 開啟錯誤報告表單
        const errorReport = this.createErrorReportForm(errorInfo);
        document.body.appendChild(errorReport);
    }
    
    createErrorReportForm(errorInfo) {
        const form = document.createElement('div');
        form.className = 'error-report-form';
        form.innerHTML = `
            <div class="form-content">
                <h3>回報問題</h3>
                <textarea placeholder="請描述您遇到的問題..."></textarea>
                <button onclick="this.parentElement.parentElement.remove()">發送</button>
                <button onclick="this.parentElement.parentElement.remove()">取消</button>
            </div>
        `;
        return form;
    }
    
    // DOM 安全操作工具
    safeQuery(selector) {
        try {
            const element = document.querySelector(selector);
            if (!element) {
                console.warn(`元素未找到: ${selector}`);
            }
            return element;
        } catch (error) {
            console.error(`查詢元素時出錯: ${selector}`, error);
            return null;
        }
    }
    
    safeQueryById(id) {
        try {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`ID元素未找到: ${id}`);
            }
            return element;
        } catch (error) {
            console.error(`通過ID查詢元素時出錯: ${id}`, error);
            return null;
        }
    }
    
    safeStyle(element, property, value) {
        if (!element) {
            console.warn('嘗試設置null元素的樣式');
            return false;
        }
        
        try {
            element.style[property] = value;
            return true;
        } catch (error) {
            console.error(`設置樣式時出錯: ${property} = ${value}`, error);
            return false;
        }
    }
    
    safeAddClass(element, className) {
        if (!element) {
            console.warn('嘗試為null元素添加類名');
            return false;
        }
        
        try {
            element.classList.add(className);
            return true;
        } catch (error) {
            console.error(`添加類名時出錯: ${className}`, error);
            return false;
        }
    }
    
    safeRemoveClass(element, className) {
        if (!element) {
            console.warn('嘗試從null元素移除類名');
            return false;
        }
        
        try {
            element.classList.remove(className);
            return true;
        } catch (error) {
            console.error(`移除類名時出錯: ${className}`, error);
            return false;
        }
    }
    
    safeInnerHTML(element, html) {
        if (!element) {
            console.warn('嘗試設置null元素的innerHTML');
            return false;
        }
        
        try {
            element.innerHTML = html;
            return true;
        } catch (error) {
            console.error('設置innerHTML時出錯', error);
            return false;
        }
    }
    
    safeTextContent(element, text) {
        if (!element) {
            console.warn('嘗試設置null元素的textContent');
            return false;
        }
        
        try {
            element.textContent = text;
            return true;
        } catch (error) {
            console.error('設置textContent時出錯', error);
            return false;
        }
    }
    
    // 批量DOM檢查
    checkRequiredElements(elements) {
        const missing = [];
        
        for (const [name, selector] of Object.entries(elements)) {
            const element = typeof selector === 'string' ? 
                document.querySelector(selector) : 
                document.getElementById(selector);
                
            if (!element) {
                missing.push(name);
            }
        }
        
        if (missing.length > 0) {
            console.warn('缺少必需的DOM元素:', missing);
            return false;
        }
        
        return true;
    }
}

// 全域實例
window.uxEnhancement = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    window.uxEnhancement = new UXEnhancement();
});

console.log('✨ 用戶體驗增強模組 v2.7 已載入'); 