/**
 * 用戶體驗增強模組 v3.0 - 優化版
 * 精簡高效的UX增強，專注核心功能
 */

'use strict';

// ================== 核心配置 ==================
const UX_CONFIG = {
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 300,
    NOTIFICATION_TIMEOUT: 5000,
    FOCUS_TRAP_SELECTOR: 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    STORAGE_KEYS: {
        ACCESSIBILITY_MODE: 'ux_accessibility_mode',
        USER_PREFERENCES: 'ux_user_preferences',
        FORM_DATA: 'ux_form_autosave'
    }
};

// ================== 用戶偏好檢測 ==================
class UserPreferences {
    constructor() {
        this.preferences = this.detectSystemPreferences();
        this.loadStoredPreferences();
    }

    detectSystemPreferences() {
        return {
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            highContrast: window.matchMedia('(prefers-contrast: high)').matches,
            darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
            touchSupport: 'ontouchstart' in window,
            mobile: window.innerWidth <= 768
        };
    }

    loadStoredPreferences() {
        try {
            const stored = localStorage.getItem(UX_CONFIG.STORAGE_KEYS.USER_PREFERENCES);
            if (stored) {
                Object.assign(this.preferences, JSON.parse(stored));
            }
        } catch (error) {
            console.warn('載入用戶偏好失敗:', error);
        }
    }

    savePreferences() {
        try {
            localStorage.setItem(
                UX_CONFIG.STORAGE_KEYS.USER_PREFERENCES,
                JSON.stringify(this.preferences)
            );
        } catch (error) {
            console.warn('保存用戶偏好失敗:', error);
        }
    }

    get(key) {
        return this.preferences[key];
    }

    set(key, value) {
        this.preferences[key] = value;
        this.savePreferences();
    }
}

// ================== 無障礙增強 ==================
class AccessibilityEnhancer {
    constructor(userPrefs) {
        this.userPrefs = userPrefs;
        this.announcer = this.createScreenReaderAnnouncer();
        this.focusHistory = [];
    }

    init() {
        this.enhanceARIA();
        this.setupFocusManagement();
        this.setupKeyboardNavigation();
        this.setupHighContrastMode();
        this.addSkipLinks();
    }

    createScreenReaderAnnouncer() {
        const announcer = document.createElement('div');
        announcer.id = 'sr-announcer';
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.style.cssText = `
            position: absolute !important;
            left: -10000px !important;
            width: 1px !important;
            height: 1px !important;
            overflow: hidden !important;
        `;
        document.body.appendChild(announcer);
        return announcer;
    }

    announce(message, priority = 'polite') {
        if (!message) return;
        
        this.announcer.setAttribute('aria-live', priority);
        this.announcer.textContent = message;
        
        setTimeout(() => {
            this.announcer.textContent = '';
        }, 1000);
    }

    enhanceARIA() {
        // 為無標籤按鈕添加描述
        document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])').forEach(btn => {
            const text = btn.textContent.trim() || btn.title || '按鈕';
            btn.setAttribute('aria-label', text);
        });

        // 增強表單元素
        document.querySelectorAll('input, textarea, select').forEach(input => {
            if (!input.getAttribute('aria-describedby')) {
                const label = document.querySelector(`label[for="${input.id}"]`);
                const helper = input.nextElementSibling?.classList.contains('help-text') 
                    ? input.nextElementSibling : null;
                
                if (helper) {
                    const helperId = helper.id || `help-${input.id}`;
                    helper.id = helperId;
                    input.setAttribute('aria-describedby', helperId);
                }
            }
        });
    }

    setupFocusManagement() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                this.handleTabKeyPress(e);
            }
            if (e.key === 'Escape') {
                this.handleEscapeKey(e);
            }
        });

        // 記錄焦點歷史
        document.addEventListener('focusin', (e) => {
            this.focusHistory.push(e.target);
            if (this.focusHistory.length > 10) {
                this.focusHistory.shift();
            }
        });
    }

    handleTabKeyPress(e) {
        const modal = document.querySelector('.modal.active, .dialog[open]');
        if (modal) {
            this.trapFocus(e, modal);
        }
    }

    trapFocus(e, container) {
        const focusableElements = Array.from(container.querySelectorAll(UX_CONFIG.FOCUS_TRAP_SELECTOR))
            .filter(el => !el.disabled && el.offsetParent !== null);

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
        }
    }

    handleEscapeKey(e) {
        // 關閉模態框
        const modal = document.querySelector('.modal.active');
        if (modal) {
            modal.classList.remove('active');
            this.restoreFocus();
            e.preventDefault();
        }

        // 關閉下拉菜單
        const dropdown = document.querySelector('.dropdown.open');
        if (dropdown) {
            dropdown.classList.remove('open');
            e.preventDefault();
        }
    }

    restoreFocus() {
        const lastFocused = this.focusHistory[this.focusHistory.length - 2];
        if (lastFocused && document.contains(lastFocused)) {
            lastFocused.focus();
        }
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+/ 顯示鍵盤快捷鍵說明
            if (e.ctrlKey && e.key === '/') {
                this.showKeyboardShortcuts();
                e.preventDefault();
            }

            // Enter 鍵處理
            if (e.key === 'Enter' && e.target.matches('.tab-btn, .button-like')) {
                e.target.click();
                e.preventDefault();
            }
        });
    }

    showKeyboardShortcuts() {
        const shortcuts = [
            { key: 'Tab', desc: '在元素間導航' },
            { key: 'Space/Enter', desc: '激活按鈕或連結' },
            { key: 'Esc', desc: '關閉對話框或選單' },
            { key: 'Ctrl+/', desc: '顯示此說明' },
            { key: 'Alt+1,2,3...', desc: '切換標籤頁' }
        ];

        const content = shortcuts
            .map(s => `<div><kbd>${s.key}</kbd> ${s.desc}</div>`)
            .join('');

        this.showModal('鍵盤快捷鍵', content);
    }

    setupHighContrastMode() {
        if (this.userPrefs.get('highContrast')) {
            this.enableHighContrast();
        }
    }

    enableHighContrast() {
        document.documentElement.classList.add('high-contrast');
        
        if (!document.getElementById('high-contrast-styles')) {
            const style = document.createElement('style');
            style.id = 'high-contrast-styles';
            style.textContent = `
                .high-contrast {
                    --focus-color: #ffff00;
                    --error-color: #ff0000;
                    --success-color: #00ff00;
                    --border-width: 2px;
                }
                .high-contrast *:focus {
                    outline: 3px solid var(--focus-color) !important;
                    outline-offset: 2px !important;
                }
                .high-contrast button, .high-contrast input, .high-contrast select {
                    border: var(--border-width) solid currentColor !important;
                }
            `;
            document.head.appendChild(style);
        }
    }

    addSkipLinks() {
        if (!document.getElementById('skip-links')) {
            const skipLinks = document.createElement('div');
            skipLinks.id = 'skip-links';
            skipLinks.innerHTML = `
                <a href="#main-content" class="skip-link">跳至主要內容</a>
                <a href="#navigation" class="skip-link">跳至導航</a>
            `;
            
            const style = document.createElement('style');
            style.textContent = `
                .skip-link {
                    position: absolute;
                    top: -40px;
                    left: 6px;
                    background: #000;
                    color: #fff;
                    padding: 8px;
                    text-decoration: none;
                    z-index: 10000;
                    border-radius: 4px;
                }
                .skip-link:focus {
                    top: 6px;
                }
            `;
            document.head.appendChild(style);
            document.body.insertBefore(skipLinks, document.body.firstChild);
        }
    }

    showModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', 'modal-title');
        modal.innerHTML = `
            <div class="modal-content">
                <h2 id="modal-title">${title}</h2>
                <div class="modal-body">${content}</div>
                <button class="modal-close" aria-label="關閉對話框">×</button>
            </div>
        `;

        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
            this.restoreFocus();
        });

        document.body.appendChild(modal);
        modal.querySelector('.modal-close').focus();
    }
}

// ================== 表單增強 ==================
class FormEnhancer {
    constructor(userPrefs) {
        this.userPrefs = userPrefs;
        this.debounceTimers = new Map();
        this.validators = this.createValidators();
    }

    init() {
        this.enhanceAllForms();
        this.setupAutoSave();
        this.setupValidation();
    }

    createValidators() {
        return {
            email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            url: (value) => {
                try {
                    new URL(value);
                    return true;
                } catch {
                    return false;
                }
            },
            required: (value) => value.trim().length > 0,
            minLength: (value, min) => value.length >= min,
            maxLength: (value, max) => value.length <= max
        };
    }

    enhanceAllForms() {
        document.querySelectorAll('form').forEach(form => this.enhanceForm(form));
        
        // 監控動態添加的表單
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.matches('form')) {
                            this.enhanceForm(node);
                        } else {
                            node.querySelectorAll('form').forEach(form => this.enhanceForm(form));
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }

    enhanceForm(form) {
        if (form.hasAttribute('data-enhanced')) return;
        form.setAttribute('data-enhanced', 'true');

        // 添加提交處理
        form.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // 增強輸入字段
        form.querySelectorAll('input, textarea, select').forEach(field => {
            this.enhanceField(field);
        });

        // 添加表單狀態指示器
        this.addFormIndicators(form);
    }

    enhanceField(field) {
        // 實時驗證
        this.setupRealtimeValidation(field);
        
        // 自動保存
        if (field.matches('input[type="text"], textarea')) {
            this.setupFieldAutoSave(field);
        }

        // 智能建議
        if (field.type === 'email') {
            this.setupEmailSuggestions(field);
        }
    }

    setupRealtimeValidation(field) {
        const validateField = () => {
            const result = this.validateField(field);
            this.showValidationResult(field, result);
        };

        const debouncedValidate = this.debounce(validateField, UX_CONFIG.DEBOUNCE_DELAY);

        field.addEventListener('input', debouncedValidate);
        field.addEventListener('blur', validateField);
    }

    validateField(field) {
        const value = field.value;
        const rules = this.getValidationRules(field);
        
        for (const rule of rules) {
            const isValid = this.validators[rule.type](value, rule.param);
            if (!isValid) {
                return { valid: false, message: rule.message };
            }
        }
        
        return { valid: true };
    }

    getValidationRules(field) {
        const rules = [];
        
        if (field.required) {
            rules.push({
                type: 'required',
                message: '此欄位為必填'
            });
        }
        
        if (field.type === 'email') {
            rules.push({
                type: 'email',
                message: '請輸入有效的電子郵件地址'
            });
        }
        
        if (field.type === 'url') {
            rules.push({
                type: 'url',
                message: '請輸入有效的網址'
            });
        }
        
        if (field.minLength) {
            rules.push({
                type: 'minLength',
                param: field.minLength,
                message: `至少需要 ${field.minLength} 個字符`
            });
        }
        
        return rules;
    }

    showValidationResult(field, result) {
        const container = field.parentElement;
        const existingError = container.querySelector('.error-message');
        
        if (existingError) {
            existingError.remove();
        }
        
        field.classList.remove('error', 'valid');
        
        if (!result.valid) {
            field.classList.add('error');
            field.setAttribute('aria-invalid', 'true');
            
            const errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.textContent = result.message;
            errorElement.setAttribute('role', 'alert');
            
            container.appendChild(errorElement);
        } else if (field.value) {
            field.classList.add('valid');
            field.setAttribute('aria-invalid', 'false');
        }
    }

    setupAutoSave() {
        const saveForm = this.debounce(() => {
            const formData = this.collectFormData();
            this.saveFormData(formData);
        }, 2000);

        document.addEventListener('input', (e) => {
            if (e.target.matches('input, textarea, select')) {
                saveForm();
            }
        });

        // 載入已保存的數據
        this.loadFormData();
    }

    setupFieldAutoSave(field) {
        const saveField = this.debounce(() => {
            const key = `field_${field.id || field.name}`;
            try {
                localStorage.setItem(key, field.value);
                this.showAutoSaveIndicator(field);
            } catch (error) {
                console.warn('自動保存失敗:', error);
            }
        }, 1000);

        field.addEventListener('input', saveField);

        // 載入已保存的值
        const key = `field_${field.id || field.name}`;
        const savedValue = localStorage.getItem(key);
        if (savedValue && !field.value) {
            field.value = savedValue;
            this.showRestoredIndicator(field);
        }
    }

    showAutoSaveIndicator(field) {
        const indicator = document.createElement('span');
        indicator.className = 'autosave-indicator';
        indicator.textContent = '✓ 已保存';
        indicator.style.cssText = `
            font-size: 12px;
            color: #10b981;
            margin-left: 8px;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        
        const existing = field.parentElement.querySelector('.autosave-indicator');
        if (existing) existing.remove();
        
        field.parentElement.appendChild(indicator);
        
        setTimeout(() => indicator.style.opacity = '1', 10);
        setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => indicator.remove(), 300);
        }, 2000);
    }

    showRestoredIndicator(field) {
        const indicator = document.createElement('span');
        indicator.className = 'restored-indicator';
        indicator.textContent = '↻ 已恢復';
        indicator.style.cssText = `
            font-size: 12px;
            color: #3b82f6;
            margin-left: 8px;
        `;
        
        field.parentElement.appendChild(indicator);
        
        setTimeout(() => indicator.remove(), 3000);
    }

    setupEmailSuggestions(field) {
        const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
        
        field.addEventListener('input', this.debounce(() => {
            const value = field.value;
            const atIndex = value.indexOf('@');
            
            if (atIndex > 0 && atIndex < value.length - 1) {
                const username = value.substring(0, atIndex);
                const domain = value.substring(atIndex + 1);
                
                const suggestions = commonDomains
                    .filter(d => d.startsWith(domain))
                    .slice(0, 3)
                    .map(d => `${username}@${d}`);
                
                this.showEmailSuggestions(field, suggestions);
            }
        }, 300));
    }

    showEmailSuggestions(field, suggestions) {
        const existing = document.querySelector('.email-suggestions');
        if (existing) existing.remove();
        
        if (suggestions.length === 0) return;
        
        const container = document.createElement('div');
        container.className = 'email-suggestions';
        container.style.cssText = `
            position: absolute;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            z-index: 1000;
            max-height: 120px;
            overflow-y: auto;
        `;
        
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.textContent = suggestion;
            item.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid #eee;
            `;
            
            item.addEventListener('click', () => {
                field.value = suggestion;
                container.remove();
                field.focus();
            });
            
            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = '#f0f0f0';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = '';
            });
            
            container.appendChild(item);
        });
        
        field.parentElement.style.position = 'relative';
        field.parentElement.appendChild(container);
        
        // 點擊外部關閉
        setTimeout(() => {
            document.addEventListener('click', function closeOnClickOutside(e) {
                if (!container.contains(e.target) && e.target !== field) {
                    container.remove();
                    document.removeEventListener('click', closeOnClickOutside);
                }
            });
        }, 100);
    }

    collectFormData() {
        const forms = document.querySelectorAll('form[data-enhanced]');
        const data = {};
        
        forms.forEach(form => {
            const formData = new FormData(form);
            const formId = form.id || 'default';
            data[formId] = {};
            
            formData.forEach((value, key) => {
                data[formId][key] = value;
            });
        });
        
        return data;
    }

    saveFormData(data) {
        try {
            localStorage.setItem(UX_CONFIG.STORAGE_KEYS.FORM_DATA, JSON.stringify(data));
        } catch (error) {
            console.warn('保存表單數據失敗:', error);
        }
    }

    loadFormData() {
        try {
            const data = localStorage.getItem(UX_CONFIG.STORAGE_KEYS.FORM_DATA);
            if (data) {
                const formData = JSON.parse(data);
                this.restoreFormData(formData);
            }
        } catch (error) {
            console.warn('載入表單數據失敗:', error);
        }
    }

    restoreFormData(data) {
        Object.entries(data).forEach(([formId, formData]) => {
            const form = formId === 'default' 
                ? document.querySelector('form') 
                : document.getElementById(formId);
            
            if (form) {
                Object.entries(formData).forEach(([name, value]) => {
                    const field = form.querySelector(`[name="${name}"]`);
                    if (field && !field.value) {
                        field.value = value;
                    }
                });
            }
        });
    }

    addFormIndicators(form) {
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
        if (submitBtn && !submitBtn.querySelector('.loading-spinner')) {
            submitBtn.style.position = 'relative';
        }
    }

    handleFormSubmit(e) {
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
        
        // 顯示載入狀態
        if (submitBtn) {
            this.showButtonLoading(submitBtn);
        }
        
        // 驗證表單
        const isValid = this.validateForm(form);
        if (!isValid) {
            e.preventDefault();
            if (submitBtn) {
                this.hideButtonLoading(submitBtn);
            }
            return false;
        }
    }

    validateForm(form) {
        let isValid = true;
        const fields = form.querySelectorAll('input, textarea, select');
        
        fields.forEach(field => {
            const result = this.validateField(field);
            this.showValidationResult(field, result);
            if (!result.valid) {
                isValid = false;
            }
        });
        
        if (!isValid) {
            const firstError = form.querySelector('.error');
            if (firstError) {
                firstError.focus();
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        
        return isValid;
    }

    showButtonLoading(button) {
        button.disabled = true;
        button.setAttribute('data-original-text', button.textContent);
        
        const spinner = document.createElement('span');
        spinner.className = 'loading-spinner';
        spinner.innerHTML = '⏳';
        spinner.style.marginRight = '8px';
        
        button.textContent = '處理中...';
        button.insertBefore(spinner, button.firstChild);
    }

    hideButtonLoading(button) {
        button.disabled = false;
        const originalText = button.getAttribute('data-original-text');
        if (originalText) {
            button.textContent = originalText;
            button.removeAttribute('data-original-text');
        }
        
        const spinner = button.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    }

    debounce(func, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
}

// ================== 通知系統 ==================
class NotificationSystem {
    constructor() {
        this.container = this.createContainer();
        this.notifications = [];
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(container);
        return container;
    }

    show(message, type = 'info', options = {}) {
        const notification = this.createNotification(message, type, options);
        this.container.appendChild(notification);
        this.notifications.push(notification);
        
        // 動畫顯示
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        });
        
        // 自動關閉
        if (options.autoClose !== false) {
            setTimeout(() => {
                this.hide(notification);
            }, options.duration || UX_CONFIG.NOTIFICATION_TIMEOUT);
        }
        
        return notification;
    }

    createNotification(message, type, options) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.setAttribute('role', 'alert');
        notification.style.cssText = `
            background: ${this.getTypeColor(type)};
            color: white;
            padding: 12px 16px;
            margin-bottom: 8px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s ease;
            position: relative;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        const icon = this.getTypeIcon(type);
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            margin-left: auto;
            padding: 0;
            width: 20px;
            height: 20px;
        `;
        
        closeBtn.addEventListener('click', () => this.hide(notification));
        
        notification.innerHTML = `
            <span class="notification-icon">${icon}</span>
            <span class="notification-message">${message}</span>
        `;
        notification.appendChild(closeBtn);
        
        return notification;
    }

    getTypeColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }

    getTypeIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    hide(notification) {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }, 300);
    }

    clear() {
        this.notifications.forEach(notification => this.hide(notification));
    }
}

// ================== 主要UX增強類 ==================
class UXEnhancementOptimized {
    constructor() {
        this.userPrefs = new UserPreferences();
        this.accessibility = new AccessibilityEnhancer(this.userPrefs);
        this.formEnhancer = new FormEnhancer(this.userPrefs);
        this.notifications = new NotificationSystem();
        
        this.init();
    }

    init() {
        this.accessibility.init();
        this.formEnhancer.init();
        this.setupResponsiveDesign();
        this.setupProgressIndicators();
        this.setupErrorHandling();
        
        console.log('✨ UX增強模組 v3.0 已初始化');
    }

    setupResponsiveDesign() {
        // 監聽視口變化
        const mediaQuery = window.matchMedia('(max-width: 768px)');
        const handleViewportChange = (e) => {
            this.userPrefs.set('mobile', e.matches);
            document.documentElement.classList.toggle('mobile-layout', e.matches);
        };
        
        mediaQuery.addListener(handleViewportChange);
        handleViewportChange(mediaQuery);
        
        // 處理方向變化
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.accessibility.announce('螢幕方向已改變');
            }, 500);
        });
    }

    setupProgressIndicators() {
        // 為表單添加進度指示器
        document.addEventListener('submit', (e) => {
            if (e.target.matches('form')) {
                this.showFormProgress(e.target);
            }
        });
    }

    showFormProgress(form) {
        const progress = document.createElement('div');
        progress.className = 'form-progress';
        progress.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <div class="progress-text">處理中...</div>
        `;
        
        form.appendChild(progress);
        
        // 模擬進度
        let percent = 0;
        const interval = setInterval(() => {
            percent += Math.random() * 20;
            if (percent >= 100) {
                percent = 100;
                clearInterval(interval);
            }
            
            const fill = progress.querySelector('.progress-fill');
            if (fill) {
                fill.style.width = `${percent}%`;
            }
        }, 200);
    }

    setupErrorHandling() {
        // 全局錯誤處理
        window.addEventListener('error', (e) => {
            console.error('頁面錯誤:', e.error);
            this.notifications.show('頁面發生錯誤，請重新整理頁面', 'error');
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('未處理的Promise錯誤:', e.reason);
            this.notifications.show('操作失敗，請稍後再試', 'error');
        });
    }

    // 公共API方法
    showNotification(message, type = 'info', options = {}) {
        return this.notifications.show(message, type, options);
    }

    announce(message, priority = 'polite') {
        this.accessibility.announce(message, priority);
    }

    validateForm(form) {
        return this.formEnhancer.validateForm(form);
    }

    toggleAccessibilityMode() {
        const isEnabled = this.userPrefs.get('accessibilityMode');
        this.userPrefs.set('accessibilityMode', !isEnabled);
        
        if (!isEnabled) {
            this.accessibility.enableHighContrast();
            this.announce('無障礙模式已啟用');
        } else {
            document.documentElement.classList.remove('high-contrast');
            this.announce('無障礙模式已關閉');
        }
    }

    destroy() {
        this.notifications.clear();
        console.log('UX增強模組已銷毀');
    }
}

// ================== 初始化 ==================
let uxEnhancement;

// 自動初始化
(() => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            uxEnhancement = new UXEnhancementOptimized();
        });
    } else {
        uxEnhancement = new UXEnhancementOptimized();
    }
    
    // 暴露到全局作用域
    window.uxEnhancement = uxEnhancement;
})();

// 導出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UXEnhancementOptimized, uxEnhancement };
} 