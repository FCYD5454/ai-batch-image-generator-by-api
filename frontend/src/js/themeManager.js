const THEME_KEY = 'theme';
const DARK_THEME = 'dark';
const LIGHT_THEME = 'light';

class ThemeManager {
    constructor(toggleButtonSelector) {
        this.toggleButton = document.querySelector(toggleButtonSelector);
        if (!this.toggleButton) {
            console.error('Theme toggle button not found');
            return;
        }
        
        this.currentTheme = localStorage.getItem(THEME_KEY) || LIGHT_THEME;
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.toggleButton.addEventListener('click', () => this.toggleTheme());
    }

    toggleTheme() {
        this.currentTheme = (this.currentTheme === DARK_THEME) ? LIGHT_THEME : DARK_THEME;
        this.applyTheme(this.currentTheme);
    }

    applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
        
        // 更新按鈕圖示或文字 (可選)
        const icon = this.toggleButton.querySelector('i');
        if (icon) {
            if (theme === DARK_THEME) {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            } else {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            }
        }
    }
}

export default ThemeManager; 