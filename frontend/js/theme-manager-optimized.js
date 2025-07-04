/**
 * Theme Manager v3.0 - 優化版
 * 智能主題管理系統，支持明亮、黑暗和自動模式
 */

'use strict';

// ================== 配置 ==================
const THEME_CONFIG = {
    STORAGE_KEY: 'app_theme_preference',
    TRANSITION_DURATION: 300,
    AUTO_SWITCH_TIMES: {
        dark: 19, // 晚上7點切換到黑暗模式
        light: 6  // 早上6點切換到明亮模式
    },
    
    THEMES: {
        light: {
            name: '明亮模式',
            icon: '☀️',
            class: 'theme-light'
        },
        dark: {
            name: '黑暗模式', 
            icon: '🌙',
            class: 'theme-dark'
        },
        auto: {
            name: '自動模式',
            icon: '🔄',
            class: 'theme-auto'
        }
    }
};

// ================== 主題管理器類 ==================
class ThemeManagerOptimized {
    constructor() {
        this.currentTheme = 'auto';
        this.systemPreference = 'light';
        this.listeners = new Set();
        this.mediaQuery = null;
        this.autoSwitchTimer = null;
        
        this.init();
    }

    async init() {
        try {
            this.detectSystemPreference();
            this.loadUserPreference();
            this.setupMediaQuery();
            this.createThemeToggle();
            this.setupAutoSwitch();
            this.injectThemeStyles();
            this.applyTheme();
            
            console.log('🎨 主題管理器v3.0已初始化');
        } catch (error) {
            console.error('主題管理器初始化失敗:', error);
        }
    }

    detectSystemPreference() {
        if (window.matchMedia) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this.systemPreference = darkModeQuery.matches ? 'dark' : 'light';
        }
    }

    loadUserPreference() {
        try {
            const saved = localStorage.getItem(THEME_CONFIG.STORAGE_KEY);
            if (saved && THEME_CONFIG.THEMES[saved]) {
                this.currentTheme = saved;
            }
        } catch (error) {
            console.warn('載入主題偏好失敗:', error);
        }
    }

    setupMediaQuery() {
        if (!window.matchMedia) return;

        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleChange = (e) => {
            this.systemPreference = e.matches ? 'dark' : 'light';
            
            if (this.currentTheme === 'auto') {
                this.applyTheme();
            }
            
            this.notifyListeners('system-change', this.systemPreference);
        };

        if (this.mediaQuery.addEventListener) {
            this.mediaQuery.addEventListener('change', handleChange);
        } else {
            this.mediaQuery.addListener(handleChange);
        }
    }

    createThemeToggle() {
        if (document.getElementById('theme-toggle-optimized')) return;

        const toggle = this.createToggleElement();
        this.insertToggleIntoDOM(toggle);
        this.bindToggleEvents(toggle);
    }

    createToggleElement() {
        const toggle = document.createElement('div');
        toggle.id = 'theme-toggle-optimized';
        toggle.className = 'theme-toggle-container';
        
        toggle.innerHTML = `
            <div class="theme-toggle-wrapper">
                <button class="theme-toggle-btn" 
                        aria-label="切換主題模式"
                        title="點擊切換主題">
                    <span class="theme-icon">${this.getCurrentIcon()}</span>
                    <span class="theme-label">${this.getCurrentLabel()}</span>
                </button>
                
                <div class="theme-dropdown" id="theme-dropdown">
                    <div class="theme-dropdown-header">主題設定</div>
                    ${Object.entries(THEME_CONFIG.THEMES).map(([key, theme]) => `
                        <button class="theme-option ${key === this.currentTheme ? 'active' : ''}"
                                data-theme="${key}"
                                aria-pressed="${key === this.currentTheme}">
                            <span class="theme-option-icon">${theme.icon}</span>
                            <span class="theme-option-label">${theme.name}</span>
                            ${key === this.currentTheme ? '<span class="check-mark">✓</span>' : ''}
                        </button>
                    `).join('')}
                    
                    <div class="theme-dropdown-footer">
                        <div class="auto-switch-info" ${this.currentTheme === 'auto' ? '' : 'style="display:none"'}>
                            <small>自動模式：${THEME_CONFIG.AUTO_SWITCH_TIMES.light}:00-${THEME_CONFIG.AUTO_SWITCH_TIMES.dark}:00 明亮模式</small>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return toggle;
    }

    insertToggleIntoDOM(toggle) {
        const insertionPoints = [
            '.header-controls',
            '.navigation',
            '.toolbar',
            'header',
            'nav',
            'body'
        ];

        for (const selector of insertionPoints) {
            const target = document.querySelector(selector);
            if (target) {
                if (selector === 'body') {
                    toggle.classList.add('floating-toggle');
                }
                target.appendChild(toggle);
                break;
            }
        }
    }

    bindToggleEvents(toggle) {
        const toggleBtn = toggle.querySelector('.theme-toggle-btn');
        const dropdown = toggle.querySelector('.theme-dropdown');
        const options = toggle.querySelectorAll('.theme-option');

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown(dropdown);
        });

        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const theme = option.dataset.theme;
                this.setTheme(theme);
                this.hideDropdown(dropdown);
            });
        });

        document.addEventListener('click', () => {
            this.hideDropdown(dropdown);
        });

        toggle.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideDropdown(dropdown);
                toggleBtn.focus();
            }
        });
    }

    toggleDropdown(dropdown) {
        const isVisible = dropdown.classList.contains('visible');
        
        if (isVisible) {
            this.hideDropdown(dropdown);
        } else {
            this.showDropdown(dropdown);
        }
    }

    showDropdown(dropdown) {
        dropdown.classList.add('visible');
        dropdown.setAttribute('aria-hidden', 'false');
        
        const firstOption = dropdown.querySelector('.theme-option');
        if (firstOption) {
            firstOption.focus();
        }
    }

    hideDropdown(dropdown) {
        dropdown.classList.remove('visible');
        dropdown.setAttribute('aria-hidden', 'true');
    }

    setTheme(theme) {
        if (!THEME_CONFIG.THEMES[theme]) return;

        const oldTheme = this.currentTheme;
        this.currentTheme = theme;

        this.saveUserPreference();
        this.applyTheme();
        this.updateToggleUI();
        
        this.notifyListeners('theme-change', {
            from: oldTheme,
            to: theme,
            effective: this.getEffectiveTheme()
        });

        this.showThemeChangeNotification(theme);
    }

    applyTheme() {
        const effectiveTheme = this.getEffectiveTheme();
        const root = document.documentElement;
        
        root.style.transition = `all ${THEME_CONFIG.TRANSITION_DURATION}ms ease`;
        
        Object.values(THEME_CONFIG.THEMES).forEach(theme => {
            root.classList.remove(theme.class);
        });

        root.classList.add(THEME_CONFIG.THEMES[effectiveTheme].class);
        
        this.applyCSSVariables(effectiveTheme);
        this.updateMetaThemeColor(effectiveTheme);
        
        setTimeout(() => {
            root.style.transition = '';
        }, THEME_CONFIG.TRANSITION_DURATION);
    }

    getEffectiveTheme() {
        if (this.currentTheme === 'auto') {
            const now = new Date();
            const hour = now.getHours();
            
            if (hour >= THEME_CONFIG.AUTO_SWITCH_TIMES.dark || 
                hour < THEME_CONFIG.AUTO_SWITCH_TIMES.light) {
                return 'dark';
            } else {
                return 'light';
            }
        }
        
        return this.currentTheme;
    }

    applyCSSVariables(theme) {
        const root = document.documentElement;
        const variables = this.getThemeVariables(theme);
        
        Object.entries(variables).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });
    }

    getThemeVariables(theme) {
        const themes = {
            light: {
                // 基礎顏色 - 高對比度優化
                '--bg-color': '#ffffff',
                '--bg-secondary': '#f8f9fa',
                '--text-color': '#212529',          // 更深的文字顏色，提高對比度
                '--text-secondary': '#495057',      // 更深的次要文字顏色
                '--text-muted': '#6c757d',          // 靜音文字顏色
                '--border-color': '#dee2e6',
                
                // 主題色彩
                '--primary-color': '#0056b3',       // 更深的藍色，提高可讀性
                '--primary-text': '#ffffff',
                '--success-color': '#155724',       // 更深的綠色
                '--success-text': '#ffffff',
                '--warning-color': '#856404',       // 更深的黃色
                '--warning-text': '#ffffff',
                '--error-color': '#721c24',         // 更深的紅色
                '--error-text': '#ffffff',
                '--info-color': '#004085',          // 信息色
                '--info-text': '#ffffff',
                
                // 組件背景
                '--card-bg': '#ffffff',
                '--card-border': '#dee2e6',
                '--input-bg': '#ffffff',
                '--input-border': '#ced4da',
                '--input-text': '#212529',
                '--button-bg': '#0056b3',
                '--button-text': '#ffffff',
                '--button-border': '#0056b3',
                
                // 導航和標題
                '--nav-bg': '#ffffff',
                '--nav-text': '#212529',
                '--nav-border': '#dee2e6',
                '--header-bg': '#ffffff',
                '--header-text': '#212529',
                
                // 效果
                '--shadow': '0 2px 8px rgba(0,0,0,0.15)',
                '--shadow-hover': '0 4px 12px rgba(0,0,0,0.2)',
                
                // 鏈接顏色
                '--link-color': '#0056b3',
                '--link-hover': '#004085',
                '--link-visited': '#6f42c1'
            },
            dark: {
                // 基礎顏色 - 高對比度優化
                '--bg-color': '#121212',            // 更深的背景色
                '--bg-secondary': '#1e1e1e',        // 次要背景色
                '--text-color': '#ffffff',          // 純白文字，最高對比度
                '--text-secondary': '#e0e0e0',      // 次要文字，高對比度
                '--text-muted': '#a0a0a0',          // 靜音文字顏色
                '--border-color': '#333333',        // 邊框顏色
                
                // 主題色彩 - 深色模式優化
                '--primary-color': '#64b5f6',       // 更亮的藍色，在深色背景上清晰可見
                '--primary-text': '#000000',        // 黑色文字，在亮色背景上清晰
                '--success-color': '#81c784',       // 更亮的綠色
                '--success-text': '#000000',
                '--warning-color': '#ffb74d',       // 更亮的橙色
                '--warning-text': '#000000',
                '--error-color': '#e57373',         // 更亮的紅色
                '--error-text': '#000000',
                '--info-color': '#4fc3f7',          // 信息色
                '--info-text': '#000000',
                
                // 組件背景 - 深色優化
                '--card-bg': '#1e1e1e',             // 卡片背景
                '--card-border': '#333333',
                '--input-bg': '#2d2d2d',            // 輸入框背景
                '--input-border': '#404040',
                '--input-text': '#ffffff',          // 輸入框文字為白色
                '--button-bg': '#64b5f6',           // 按鈕背景
                '--button-text': '#000000',         // 按鈕文字為黑色，對比度更高
                '--button-border': '#64b5f6',
                
                // 導航和標題
                '--nav-bg': '#1e1e1e',
                '--nav-text': '#ffffff',
                '--nav-border': '#333333',
                '--header-bg': '#1e1e1e',
                '--header-text': '#ffffff',
                
                // 效果
                '--shadow': '0 2px 8px rgba(0,0,0,0.4)',
                '--shadow-hover': '0 4px 12px rgba(0,0,0,0.5)',
                
                // 鏈接顏色 - 深色模式優化
                '--link-color': '#64b5f6',
                '--link-hover': '#42a5f5',
                '--link-visited': '#ba68c8'
            }
        };

        return themes[theme] || themes.light;
    }

    updateMetaThemeColor(theme) {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }

        const colors = {
            light: '#ffffff',
            dark: '#1a1a1a'
        };

        metaThemeColor.content = colors[theme] || colors.light;
    }

    updateToggleUI() {
        const toggle = document.getElementById('theme-toggle-optimized');
        if (!toggle) return;

        const icon = toggle.querySelector('.theme-icon');
        const label = toggle.querySelector('.theme-label');
        
        if (icon) icon.textContent = this.getCurrentIcon();
        if (label) label.textContent = this.getCurrentLabel();

        const options = toggle.querySelectorAll('.theme-option');
        options.forEach(option => {
            const isActive = option.dataset.theme === this.currentTheme;
            option.classList.toggle('active', isActive);
            option.setAttribute('aria-pressed', isActive);
            
            const checkMark = option.querySelector('.check-mark');
            if (isActive && !checkMark) {
                option.innerHTML += '<span class="check-mark">✓</span>';
            } else if (!isActive && checkMark) {
                checkMark.remove();
            }
        });

        const autoInfo = toggle.querySelector('.auto-switch-info');
        if (autoInfo) {
            autoInfo.style.display = this.currentTheme === 'auto' ? 'block' : 'none';
        }
    }

    getCurrentIcon() {
        if (this.currentTheme === 'auto') {
            return THEME_CONFIG.THEMES.auto.icon;
        }
        return THEME_CONFIG.THEMES[this.getEffectiveTheme()].icon;
    }

    getCurrentLabel() {
        if (this.currentTheme === 'auto') {
            const effective = this.getEffectiveTheme();
            return `自動 (${THEME_CONFIG.THEMES[effective].name})`;
        }
        return THEME_CONFIG.THEMES[this.currentTheme].name;
    }

    saveUserPreference() {
        try {
            localStorage.setItem(THEME_CONFIG.STORAGE_KEY, this.currentTheme);
        } catch (error) {
            console.warn('保存主題偏好失敗:', error);
        }
    }

    showThemeChangeNotification(theme) {
        const message = `已切換到${THEME_CONFIG.THEMES[theme].name}`;
        
        if (window.uxEnhancement?.showNotification) {
            window.uxEnhancement.showNotification(message, 'info');
        }
    }

    setupAutoSwitch() {
        if (this.autoSwitchTimer) {
            clearInterval(this.autoSwitchTimer);
        }

        this.autoSwitchTimer = setInterval(() => {
            if (this.currentTheme === 'auto') {
                this.applyTheme();
            }
        }, 60000);
    }

    injectThemeStyles() {
        if (document.getElementById('theme-manager-styles')) return;

        // 注入對比度修復樣式
        this.injectContrastFixStyles();

        const style = document.createElement('style');
        style.id = 'theme-manager-styles';
        style.textContent = `
            .theme-toggle-container {
                position: relative;
                user-select: none;
            }
            
            .theme-toggle-container.floating-toggle {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
            }
            
            .theme-toggle-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                background: var(--card-bg);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                color: var(--text-color);
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 14px;
            }
            
            .theme-toggle-btn:hover {
                background: var(--bg-secondary);
                transform: translateY(-1px);
                box-shadow: var(--shadow);
            }
            
            .theme-icon {
                font-size: 16px;
                line-height: 1;
            }
            
            .theme-dropdown {
                position: absolute;
                top: 100%;
                right: 0;
                margin-top: 8px;
                background: var(--card-bg);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                box-shadow: var(--shadow);
                min-width: 200px;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px);
                transition: all 0.2s ease;
                z-index: 1000;
            }
            
            .theme-dropdown.visible {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }
            
            .theme-dropdown-header {
                padding: 12px 16px;
                font-weight: 600;
                color: var(--text-color);
                border-bottom: 1px solid var(--border-color);
                font-size: 14px;
            }
            
            .theme-option {
                display: flex;
                align-items: center;
                gap: 12px;
                width: 100%;
                padding: 12px 16px;
                background: none;
                border: none;
                color: var(--text-color);
                cursor: pointer;
                transition: background-color 0.2s ease;
                font-size: 14px;
            }
            
            .theme-option:hover {
                background: var(--bg-secondary);
            }
            
            .theme-option.active {
                background: var(--primary-color);
                color: white;
            }
            
            .theme-option-icon {
                font-size: 16px;
                line-height: 1;
            }
            
            .theme-option-label {
                flex: 1;
                text-align: left;
            }
            
            .check-mark {
                font-weight: bold;
                margin-left: auto;
            }
            
            .theme-dropdown-footer {
                padding: 8px 16px;
                border-top: 1px solid var(--border-color);
            }
            
            .auto-switch-info {
                font-size: 12px;
                color: var(--text-secondary);
                text-align: center;
            }
            
            .theme-light {
                color-scheme: light;
            }
            
            .theme-dark {
                color-scheme: dark;
            }
            
            @media (max-width: 768px) {
                .theme-toggle-container.floating-toggle {
                    top: 10px;
                    right: 10px;
                }
                
                .theme-toggle-btn {
                    padding: 6px 12px;
                    font-size: 12px;
                }
                
                .theme-label {
                    display: none;
                }
                
                .theme-dropdown {
                    right: auto;
                    left: 0;
                    min-width: 180px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    addListener(callback) {
        if (typeof callback === 'function') {
            this.listeners.add(callback);
        }
    }

    removeListener(callback) {
        this.listeners.delete(callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.warn('主題監聽器回調失敗:', error);
            }
        });
    }

    getTheme() {
        return this.currentTheme;
    }

    getEffectiveThemeMode() {
        return this.getEffectiveTheme();
    }

    toggleTheme() {
        const themes = Object.keys(THEME_CONFIG.THEMES);
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.setTheme(themes[nextIndex]);
    }
}

// ================== 初始化 ==================
let themeManager;

(() => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            themeManager = new ThemeManagerOptimized();
        });
    } else {
        themeManager = new ThemeManagerOptimized();
    }
    
    window.themeManager = themeManager;
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ThemeManagerOptimized };
}
