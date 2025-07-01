// 可選模組
// 這是一個可選的模組檔案，包含額外的功能擴展

console.log('🔧 可選模組已載入');

// 可選模組管理器
class OptionalModules {
    constructor() {
        this.modules = new Map();
        this.loadedModules = new Set();
        this.init();
    }
    
    init() {
        console.log('🎛️ 可選模組管理器已初始化');
        this.registerDefaultModules();
    }
    
    registerDefaultModules() {
        // 註冊預設的可選模組
        this.registerModule('theme-switcher', {
            name: '主題切換器',
            description: '提供主題切換功能',
            load: () => this.loadThemeSwitcher()
        });
        
        this.registerModule('keyboard-shortcuts', {
            name: '鍵盤快捷鍵',
            description: '提供鍵盤快捷鍵支援',
            load: () => this.loadKeyboardShortcuts()
        });
        
        this.registerModule('auto-save', {
            name: '自動儲存',
            description: '提供自動儲存功能',
            load: () => this.loadAutoSave()
        });
    }
    
    registerModule(id, config) {
        this.modules.set(id, config);
        console.log(`📝 已註冊模組: ${config.name}`);
    }
    
    loadModule(id) {
        const module = this.modules.get(id);
        if (!module) {
            console.warn(`⚠️ 找不到模組: ${id}`);
            return false;
        }
        
        if (this.loadedModules.has(id)) {
            console.log(`ℹ️ 模組已載入: ${module.name}`);
            return true;
        }
        
        try {
            module.load();
            this.loadedModules.add(id);
            console.log(`✅ 模組載入成功: ${module.name}`);
            return true;
        } catch (error) {
            console.error(`❌ 模組載入失敗: ${module.name}`, error);
            return false;
        }
    }
    
    loadThemeSwitcher() {
        // 主題切換器功能
        console.log('🎨 主題切換器已載入');
    }
    
    loadKeyboardShortcuts() {
        // 鍵盤快捷鍵功能
        console.log('⌨️ 鍵盤快捷鍵已載入');
    }
    
    loadAutoSave() {
        // 自動儲存功能
        console.log('💾 自動儲存已載入');
    }
    
    getLoadedModules() {
        return Array.from(this.loadedModules);
    }
    
    getAllModules() {
        return Array.from(this.modules.keys());
    }
}

// 自動初始化
if (typeof window !== 'undefined') {
    window.optionalModules = new OptionalModules();
} 