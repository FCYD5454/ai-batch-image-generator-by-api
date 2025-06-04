/**
 * API 金鑰管理器前端模組
 * v2.6 新功能 - 安全的 API 金鑰管理
 */

class APIKeyManager {
    constructor() {
        this.apiEndpoint = '/api/api-keys';
        this.platforms = [];
        this.userApiKeys = [];
        this.isInitialized = false;
        
        // 初始化
        this.init();
        
        console.log('🔐 API 金鑰管理器已初始化');
    }
    
    async init() {
        try {
            // 載入支援的平台
            await this.loadSupportedPlatforms();
            
            // 設置 UI
            this.setupUI();
            
            // 載入用戶 API 金鑰
            await this.loadUserApiKeys();
            
            this.isInitialized = true;
        } catch (error) {
            console.error('API 金鑰管理器初始化失敗:', error);
        }
    }
    
    async loadSupportedPlatforms() {
        try {
            const response = await fetch(`${this.apiEndpoint}/platforms`);
            const data = await response.json();
            
            if (data.success) {
                this.platforms = data.platforms;
            }
        } catch (error) {
            console.error('載入支援平台失敗:', error);
        }
    }
    
    setupUI() {
        // 檢查是否已存在 API 金鑰管理面板
        if (document.getElementById('api-key-manager')) return;
        
        // 創建 API 金鑰管理面板
        const managerHTML = `
            <div class="api-key-manager" id="api-key-manager">
                <div class="manager-header">
                    <h3>🔐 API 金鑰管理</h3>
                    <div class="status-summary" id="keys-status-summary">
                        <span class="status-badge">尚未配置</span>
                    </div>
                </div>
                
                <div class="manager-content">
                    <!-- 快速添加區域 -->
                    <div class="quick-add-section">
                        <h4>🚀 快速添加 API 金鑰</h4>
                        <div class="platform-grid" id="platform-grid">
                            <!-- 平台按鈕將動態生成 -->
                        </div>
                    </div>
                    
                    <!-- API 金鑰列表 -->
                    <div class="keys-list-section">
                        <div class="section-header">
                            <h4>📋 已配置的 API 金鑰</h4>
                            <button class="refresh-btn" id="refresh-keys-btn" title="重新整理">
                                🔄
                            </button>
                        </div>
                        <div class="keys-list" id="keys-list">
                            <div class="loading-placeholder">載入中...</div>
                        </div>
                    </div>
                    
                    <!-- 使用統計 -->
                    <div class="usage-stats-section">
                        <h4>📊 使用統計</h4>
                        <div class="stats-grid" id="usage-stats-grid">
                            <!-- 統計數據將動態生成 -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 插入到頁面中（在用戶管理面板後面）
        const userManager = document.querySelector('.user-management');
        if (userManager) {
            userManager.insertAdjacentHTML('afterend', managerHTML);
        } else {
            // 如果找不到用戶管理面板，插入到 body
            document.body.insertAdjacentHTML('beforeend', managerHTML);
        }
        
        // 生成平台按鈕
        this.renderPlatformGrid();
        
        // 綁定事件
        this.bindEvents();
    }
    
    renderPlatformGrid() {
        const grid = document.getElementById('platform-grid');
        if (!grid) return;
        
        grid.innerHTML = this.platforms.map(platform => `
            <div class="platform-card" data-platform="${platform.name}">
                <div class="platform-icon">
                    ${this.getPlatformIcon(platform.name)}
                </div>
                <div class="platform-info">
                    <h5>${platform.display_name}</h5>
                    <p>${platform.description}</p>
                    <small>格式: ${platform.api_key_format}</small>
                </div>
                <button class="add-key-btn" data-platform="${platform.name}">
                    ➕ 添加金鑰
                </button>
            </div>
        `).join('');
    }
    
    getPlatformIcon(platformName) {
        const icons = {
            'openai': '🤖',
            'gemini': '💎',
            'stability': '🎨',
            'adobe': '🔥',
            'leonardo': '🎭'
        };
        return icons[platformName] || '🔧';
    }
    
    bindEvents() {
        // 添加 API 金鑰按鈕
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-key-btn')) {
                const platform = e.target.dataset.platform;
                this.showAddKeyModal(platform);
            }
            
            // 刪除 API 金鑰
            if (e.target.classList.contains('delete-key-btn')) {
                const keyId = e.target.dataset.keyId;
                this.deleteApiKey(keyId);
            }
            
            // 測試 API 金鑰
            if (e.target.classList.contains('test-key-btn')) {
                const platform = e.target.dataset.platform;
                const keyId = e.target.dataset.keyId;
                this.testApiKey(platform, keyId);
            }
            
            // 切換 API 金鑰狀態
            if (e.target.classList.contains('toggle-key-btn')) {
                const keyId = e.target.dataset.keyId;
                const isActive = e.target.dataset.active === 'true';
                this.toggleApiKey(keyId, !isActive);
            }
        });
        
        // 重新整理按鈕
        document.getElementById('refresh-keys-btn')?.addEventListener('click', () => {
            this.loadUserApiKeys();
        });
    }
    
    showAddKeyModal(platformName) {
        const platform = this.platforms.find(p => p.name === platformName);
        if (!platform) return;
        
        const modalHTML = `
            <div class="modal-overlay" id="add-key-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>添加 ${platform.display_name} API 金鑰</h3>
                        <button class="close-modal-btn">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="add-key-form">
                            <div class="form-group">
                                <label for="key-name">金鑰名稱 (可選)</label>
                                <input type="text" id="key-name" placeholder="例如: 主要金鑰">
                            </div>
                            
                            <div class="form-group">
                                <label for="api-key">API 金鑰 *</label>
                                <div class="input-with-action">
                                    <input type="password" id="api-key" required 
                                           placeholder="${platform.api_key_format}">
                                    <button type="button" class="toggle-visibility-btn">👁️</button>
                                </div>
                                <small>獲取金鑰: <a href="${platform.website}" target="_blank">${platform.website}</a></small>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="daily-limit">每日使用限制</label>
                                    <input type="number" id="daily-limit" placeholder="-1 (無限制)">
                                </div>
                                <div class="form-group">
                                    <label for="monthly-limit">每月使用限制</label>
                                    <input type="number" id="monthly-limit" placeholder="-1 (無限制)">
                                </div>
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" class="test-connection-btn">
                                    🔍 測試連接
                                </button>
                                <button type="submit" class="save-key-btn">
                                    💾 保存金鑰
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 綁定模態框事件
        this.bindModalEvents(platformName);
    }
    
    bindModalEvents(platformName) {
        const modal = document.getElementById('add-key-modal');
        const form = document.getElementById('add-key-form');
        const apiKeyInput = document.getElementById('api-key');
        
        // 關閉模態框
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay') || 
                e.target.classList.contains('close-modal-btn')) {
                modal.remove();
            }
        });
        
        // 切換密碼可見性
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('toggle-visibility-btn')) {
                const input = apiKeyInput;
                if (input.type === 'password') {
                    input.type = 'text';
                    e.target.textContent = '🙈';
                } else {
                    input.type = 'password';
                    e.target.textContent = '👁️';
                }
            }
        });
        
        // 測試連接
        modal.addEventListener('click', async (e) => {
            if (e.target.classList.contains('test-connection-btn')) {
                const apiKey = apiKeyInput.value.trim();
                if (!apiKey) {
                    this.showMessage('請先輸入 API 金鑰', 'error');
                    return;
                }
                
                await this.testApiKeyConnection(platformName, apiKey);
            }
        });
        
        // 提交表單
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveApiKey(platformName, form);
        });
    }
    
    async testApiKeyConnection(platformName, apiKey) {
        try {
            this.showMessage('正在測試連接...', 'info');
            
            const response = await fetch(`${this.apiEndpoint}/test/${platformName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ api_key: apiKey })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage('✅ API 金鑰測試成功！', 'success');
            } else {
                this.showMessage(`❌ API 金鑰測試失敗: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showMessage(`測試失敗: ${error.message}`, 'error');
        }
    }
    
    async saveApiKey(platformName, form) {
        try {
            const formData = new FormData(form);
            const keyData = {
                platform_name: platformName,
                api_key: document.getElementById('api-key').value.trim(),
                key_name: document.getElementById('key-name').value.trim(),
                daily_limit: parseInt(document.getElementById('daily-limit').value) || -1,
                monthly_limit: parseInt(document.getElementById('monthly-limit').value) || -1
            };
            
            const response = await fetch(`${this.apiEndpoint}/store`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(keyData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage('✅ API 金鑰保存成功！', 'success');
                document.getElementById('add-key-modal').remove();
                await this.loadUserApiKeys();
            } else {
                this.showMessage(`❌ 保存失敗: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showMessage(`保存失敗: ${error.message}`, 'error');
        }
    }
    
    async loadUserApiKeys() {
        try {
            const response = await fetch(`${this.apiEndpoint}/list`);
            const data = await response.json();
            
            if (data.success) {
                this.userApiKeys = data.api_keys;
                this.renderApiKeysList();
                this.updateStatusSummary();
            }
        } catch (error) {
            console.error('載入 API 金鑰失敗:', error);
        }
    }
    
    renderApiKeysList() {
        const keysList = document.getElementById('keys-list');
        if (!keysList) return;
        
        if (this.userApiKeys.length === 0) {
            keysList.innerHTML = `
                <div class="empty-state">
                    <p>🔑 尚未添加任何 API 金鑰</p>
                    <p>請使用上方的平台卡片添加您的第一個 API 金鑰</p>
                </div>
            `;
            return;
        }
        
        keysList.innerHTML = this.userApiKeys.map(key => `
            <div class="api-key-item ${key.is_active ? 'active' : 'inactive'}">
                <div class="key-info">
                    <div class="key-header">
                        <span class="platform-badge ${key.platform_name}">
                            ${this.getPlatformIcon(key.platform_name)} 
                            ${this.getPlatformDisplayName(key.platform_name)}
                        </span>
                        <span class="key-name">${key.key_name || '預設金鑰'}</span>
                    </div>
                    
                    <div class="key-stats">
                        <span class="usage-count">使用次數: ${key.usage_count}</span>
                        <span class="created-date">
                            創建: ${new Date(key.created_at).toLocaleDateString()}
                        </span>
                        ${key.last_used ? `
                            <span class="last-used">
                                最後使用: ${new Date(key.last_used).toLocaleDateString()}
                            </span>
                        ` : ''}
                    </div>
                    
                    ${key.daily_limit > 0 || key.monthly_limit > 0 ? `
                        <div class="key-limits">
                            ${key.daily_limit > 0 ? `<span>日限: ${key.daily_limit}</span>` : ''}
                            ${key.monthly_limit > 0 ? `<span>月限: ${key.monthly_limit}</span>` : ''}
                        </div>
                    ` : ''}
                </div>
                
                <div class="key-actions">
                    <button class="test-key-btn" data-platform="${key.platform_name}" data-key-id="${key.id}" title="測試">
                        🔍
                    </button>
                    <button class="toggle-key-btn" data-key-id="${key.id}" data-active="${key.is_active}" 
                            title="${key.is_active ? '停用' : '啟用'}">
                        ${key.is_active ? '⏸️' : '▶️'}
                    </button>
                    <button class="delete-key-btn" data-key-id="${key.id}" title="刪除">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    getPlatformDisplayName(platformName) {
        const platform = this.platforms.find(p => p.name === platformName);
        return platform ? platform.display_name : platformName;
    }
    
    updateStatusSummary() {
        const summary = document.getElementById('keys-status-summary');
        if (!summary) return;
        
        const totalKeys = this.userApiKeys.length;
        const activeKeys = this.userApiKeys.filter(key => key.is_active).length;
        const platforms = [...new Set(this.userApiKeys.map(key => key.platform_name))].length;
        
        if (totalKeys === 0) {
            summary.innerHTML = '<span class="status-badge warning">尚未配置</span>';
        } else {
            summary.innerHTML = `
                <span class="status-badge success">${totalKeys} 個金鑰</span>
                <span class="status-badge info">${activeKeys} 個啟用</span>
                <span class="status-badge secondary">${platforms} 個平台</span>
            `;
        }
    }
    
    async deleteApiKey(keyId) {
        if (!confirm('確定要刪除這個 API 金鑰嗎？此操作無法撤銷。')) {
            return;
        }
        
        try {
            const response = await fetch(`${this.apiEndpoint}/delete/${keyId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage('✅ API 金鑰已刪除', 'success');
                await this.loadUserApiKeys();
            } else {
                this.showMessage(`❌ 刪除失敗: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showMessage(`刪除失敗: ${error.message}`, 'error');
        }
    }
    
    async toggleApiKey(keyId, isActive) {
        try {
            const response = await fetch(`${this.apiEndpoint}/toggle/${keyId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ is_active: isActive })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage(`✅ ${data.message}`, 'success');
                await this.loadUserApiKeys();
            } else {
                this.showMessage(`❌ 操作失敗: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showMessage(`操作失敗: ${error.message}`, 'error');
        }
    }
    
    async testApiKey(platformName, keyId) {
        try {
            this.showMessage('正在測試 API 金鑰...', 'info');
            
            // 這裡需要從用戶的金鑰中獲取實際的 API 金鑰
            // 由於安全原因，我們不在前端存儲實際的 API 金鑰
            // 所以這個功能需要後端支援
            this.showMessage('測試功能需要後端支援', 'warning');
        } catch (error) {
            this.showMessage(`測試失敗: ${error.message}`, 'error');
        }
    }
    
    showMessage(message, type = 'info') {
        // 創建消息通知
        const messageEl = document.createElement('div');
        messageEl.className = `message-notification ${type}`;
        messageEl.textContent = message;
        
        // 添加到頁面
        document.body.appendChild(messageEl);
        
        // 自動移除
        setTimeout(() => {
            messageEl.remove();
        }, 5000);
    }
    
    // 公共方法：獲取用戶的 API 金鑰（供其他模組使用）
    getUserApiKey(platformName) {
        const key = this.userApiKeys.find(k => 
            k.platform_name === platformName && k.is_active
        );
        return key ? key.id : null;
    }
    
    // 公共方法：檢查是否有可用的 API 金鑰
    hasActiveKey(platformName) {
        return this.userApiKeys.some(k => 
            k.platform_name === platformName && k.is_active
        );
    }
}

// 全局實例
let apiKeyManager = null;

// 初始化（在 DOM 載入後）
document.addEventListener('DOMContentLoaded', () => {
    // 檢查用戶是否已登入
    const userManager = window.userManager;
    if (userManager && userManager.isLoggedIn) {
        apiKeyManager = new APIKeyManager();
    }
    
    // 監聽用戶登入狀態變化
    document.addEventListener('userLoggedIn', () => {
        if (!apiKeyManager) {
            apiKeyManager = new APIKeyManager();
        }
    });
    
    document.addEventListener('userLoggedOut', () => {
        if (apiKeyManager) {
            const managerEl = document.getElementById('api-key-manager');
            if (managerEl) {
                managerEl.remove();
            }
            apiKeyManager = null;
        }
    });
});

// 導出到全局
window.apiKeyManager = apiKeyManager; 