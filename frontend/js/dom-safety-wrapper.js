/**
 * DOM 安全包裝器 - 防止 DOM 操作錯誤
 * 版本: 1.0
 * 作者: AI Image Generation Platform
 */

class DOMSafetyWrapper {
    constructor() {
        this.missingElements = new Set();
        this.warningCooldown = new Map(); // 防止重複警告
        this.cooldownTime = 5000; // 5秒冷卻時間
    }

    // ==================== 安全 DOM 查詢 ====================

    /**
     * 安全的 getElementById
     * @param {string} id - 元素ID
     * @param {boolean} silent - 是否靜默模式
     * @returns {Element|null} 
     */
    safeGetById(id, silent = false) {
        try {
            const element = document.getElementById(id);
            if (!element && !silent) {
                this.logMissingElement('ID', id);
            }
            return element;
        } catch (error) {
            this.logError('getElementById', id, error);
            return null;
        }
    }

    /**
     * 安全的 querySelector
     * @param {string} selector - CSS選擇器
     * @param {boolean} silent - 是否靜默模式
     * @returns {Element|null}
     */
    safeQuery(selector, silent = false) {
        try {
            const element = document.querySelector(selector);
            if (!element && !silent) {
                this.logMissingElement('Selector', selector);
            }
            return element;
        } catch (error) {
            this.logError('querySelector', selector, error);
            return null;
        }
    }

    /**
     * 安全的 querySelectorAll
     * @param {string} selector - CSS選擇器
     * @param {boolean} silent - 是否靜默模式
     * @returns {NodeList|Array}
     */
    safeQueryAll(selector, silent = false) {
        try {
            const elements = document.querySelectorAll(selector);
            if (elements.length === 0 && !silent) {
                this.logMissingElement('SelectorAll', selector);
            }
            return elements;
        } catch (error) {
            this.logError('querySelectorAll', selector, error);
            return [];
        }
    }

    // ==================== 安全 DOM 操作 ====================

    /**
     * 安全設置元素內容
     * @param {Element|string} elementOrId - 元素或ID
     * @param {string} content - 內容
     * @param {string} method - 設置方法 ('textContent' | 'innerHTML')
     * @returns {boolean} 是否成功
     */
    safeSetContent(elementOrId, content, method = 'textContent') {
        const element = this.getElement(elementOrId);
        if (!element) return false;

        try {
            element[method] = content;
            return true;
        } catch (error) {
            this.logError(method, elementOrId, error);
            return false;
        }
    }

    /**
     * 安全設置元素樣式
     * @param {Element|string} elementOrId - 元素或ID
     * @param {string|object} styleOrProperty - 樣式物件或屬性名
     * @param {string} value - 屬性值
     * @returns {boolean} 是否成功
     */
    safeSetStyle(elementOrId, styleOrProperty, value = null) {
        const element = this.getElement(elementOrId);
        if (!element) return false;

        try {
            if (typeof styleOrProperty === 'object') {
                // 批量設置樣式
                Object.assign(element.style, styleOrProperty);
            } else {
                // 設置單個樣式
                element.style[styleOrProperty] = value;
            }
            return true;
        } catch (error) {
            this.logError('setStyle', elementOrId, error);
            return false;
        }
    }

    /**
     * 安全添加/移除 CSS 類
     * @param {Element|string} elementOrId - 元素或ID
     * @param {string|Array} classNames - 類名
     * @param {string} action - 操作類型 ('add' | 'remove' | 'toggle')
     * @returns {boolean} 是否成功
     */
    safeModifyClass(elementOrId, classNames, action = 'add') {
        const element = this.getElement(elementOrId);
        if (!element) return false;

        try {
            const classes = Array.isArray(classNames) ? classNames : [classNames];
            
            classes.forEach(className => {
                switch (action) {
                    case 'add':
                        element.classList.add(className);
                        break;
                    case 'remove':
                        element.classList.remove(className);
                        break;
                    case 'toggle':
                        element.classList.toggle(className);
                        break;
                }
            });
            return true;
        } catch (error) {
            this.logError('modifyClass', elementOrId, error);
            return false;
        }
    }

    /**
     * 安全設置元素屬性
     * @param {Element|string} elementOrId - 元素或ID
     * @param {string|object} attrOrObject - 屬性名或屬性物件
     * @param {string} value - 屬性值
     * @returns {boolean} 是否成功
     */
    safeSetAttribute(elementOrId, attrOrObject, value = null) {
        const element = this.getElement(elementOrId);
        if (!element) return false;

        try {
            if (typeof attrOrObject === 'object') {
                // 批量設置屬性
                Object.entries(attrOrObject).forEach(([attr, val]) => {
                    element.setAttribute(attr, val);
                });
            } else {
                // 設置單個屬性
                element.setAttribute(attrOrObject, value);
            }
            return true;
        } catch (error) {
            this.logError('setAttribute', elementOrId, error);
            return false;
        }
    }

    /**
     * 安全添加事件監聽器
     * @param {Element|string} elementOrId - 元素或ID
     * @param {string} event - 事件類型
     * @param {Function} handler - 事件處理器
     * @param {object} options - 選項
     * @returns {boolean} 是否成功
     */
    safeAddEventListener(elementOrId, event, handler, options = {}) {
        const element = this.getElement(elementOrId);
        if (!element) return false;

        try {
            element.addEventListener(event, handler, options);
            
            // 註冊到資源管理器
            if (window.resourceManager) {
                window.resourceManager.registerEventListener(element, event, handler, options);
            }
            
            return true;
        } catch (error) {
            this.logError('addEventListener', elementOrId, error);
            return false;
        }
    }

    // ==================== 批量操作 ====================

    /**
     * 批量檢查必需元素
     * @param {object} elementMap - 元素映射 {name: 'id'|'#selector'}
     * @returns {object} 檢查結果
     */
    checkRequiredElements(elementMap) {
        const results = {
            missing: [],
            found: [],
            success: true
        };

        Object.entries(elementMap).forEach(([name, selector]) => {
            const element = selector.startsWith('#') ? 
                this.safeQuery(selector, true) : 
                this.safeGetById(selector, true);

            if (element) {
                results.found.push(name);
            } else {
                results.missing.push(name);
                results.success = false;
            }
        });

        if (results.missing.length > 0) {
            console.warn('🚨 缺少必需的DOM元素:', results.missing);
        }

        return results;
    }

    /**
     * 批量初始化元素
     * @param {object} config - 配置物件
     * @returns {object} 初始化的元素
     */
    batchInitializeElements(config) {
        const elements = {};

        Object.entries(config).forEach(([key, selector]) => {
            if (typeof selector === 'string') {
                elements[key] = selector.startsWith('#') ? 
                    this.safeQuery(selector, true) :
                    this.safeGetById(selector, true);
            } else if (selector.id) {
                elements[key] = this.safeGetById(selector.id, true);
            } else if (selector.selector) {
                elements[key] = this.safeQuery(selector.selector, true);
            }
        });

        return elements;
    }

    // ==================== 工具方法 ====================

    /**
     * 獲取元素（支援元素物件或ID字串）
     * @param {Element|string} elementOrId - 元素或ID
     * @returns {Element|null}
     */
    getElement(elementOrId) {
        if (typeof elementOrId === 'string') {
            return this.safeGetById(elementOrId, true);
        }
        return elementOrId && elementOrId.nodeType === Node.ELEMENT_NODE ? elementOrId : null;
    }

    /**
     * 檢查元素是否可見
     * @param {Element|string} elementOrId - 元素或ID
     * @returns {boolean}
     */
    isElementVisible(elementOrId) {
        const element = this.getElement(elementOrId);
        if (!element) return false;

        return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
    }

    /**
     * 等待元素出現
     * @param {string} selector - 選擇器
     * @param {number} timeout - 超時時間（毫秒）
     * @returns {Promise<Element|null>}
     */
    waitForElement(selector, timeout = 5000) {
        return new Promise((resolve) => {
            const element = this.safeQuery(selector, true);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations) => {
                const element = this.safeQuery(selector, true);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // 註冊到資源管理器
            if (window.resourceManager) {
                window.resourceManager.registerObserver(observer);
            }

            // 超時處理
            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, timeout);
        });
    }

    // ==================== 錯誤處理 ====================

    logMissingElement(type, identifier) {
        const key = `${type}:${identifier}`;
        
        // 冷卻檢查
        if (this.warningCooldown.has(key)) {
            const lastWarning = this.warningCooldown.get(key);
            if (Date.now() - lastWarning < this.cooldownTime) {
                return; // 跳過重複警告
            }
        }

        this.missingElements.add(key);
        this.warningCooldown.set(key, Date.now());
        
        console.warn(`⚠️ DOM元素未找到 [${type}]: ${identifier}`);
    }

    logError(operation, identifier, error) {
        console.error(`❌ DOM操作失敗 [${operation}] ${identifier}:`, error);
    }

    // ==================== 統計和診斷 ====================

    getDiagnostics() {
        return {
            missingElements: Array.from(this.missingElements),
            missingCount: this.missingElements.size,
            cooldownEntries: this.warningCooldown.size,
            timestamp: Date.now()
        };
    }

    clearDiagnostics() {
        this.missingElements.clear();
        this.warningCooldown.clear();
    }

    // ==================== 全局攔截 ====================

    enableGlobalInterception() {
        // 攔截全局 DOM 方法
        if (!document._originalGetElementById) {
            document._originalGetElementById = document.getElementById;
            document._originalQuerySelector = document.querySelector;
            document._originalQuerySelectorAll = document.querySelectorAll;

            // 重寫方法
            document.getElementById = (id) => this.safeGetById(id);
            document.querySelector = (selector) => this.safeQuery(selector);
            document.querySelectorAll = (selector) => this.safeQueryAll(selector);

            console.log('✅ DOM安全攔截已啟用');
        }
    }

    disableGlobalInterception() {
        // 恢復原始方法
        if (document._originalGetElementById) {
            document.getElementById = document._originalGetElementById;
            document.querySelector = document._originalQuerySelector;
            document.querySelectorAll = document._originalQuerySelectorAll;

            delete document._originalGetElementById;
            delete document._originalQuerySelector;
            delete document._originalQuerySelectorAll;

            console.log('✅ DOM安全攔截已禁用');
        }
    }
}

// 創建全局實例
window.domSafety = new DOMSafetyWrapper();

// 自動啟用全局攔截（可選）
if (window.location.hostname !== 'localhost' && !window.location.search.includes('debug=true')) {
    // 生產環境自動啟用
    window.domSafety.enableGlobalInterception();
}

// 頁面卸載時清理
window.addEventListener('beforeunload', () => {
    window.domSafety.disableGlobalInterception();
});

console.log('✅ DOM安全包裝器已載入'); 