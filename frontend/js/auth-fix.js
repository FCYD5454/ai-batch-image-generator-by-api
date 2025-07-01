/**
 * 認證修復腳本 v3.0
 * 解決前端認證流程和token管理問題
 */

class AuthenticationFix {
    constructor() {
        this.token = null;
        this.user = null;
        this.refreshTimer = null;
        this.isAuthenticated = false;
        
        this.init();
        console.log('🔐 認證修復系統已初始化');
    }
    
    init() {
        this.loadStoredAuth();
        this.setupTokenRefresh();
        this.interceptAPIRequests();
        this.setupAuthEventListeners();
    }
    
    loadStoredAuth() {
        try {
            const storedToken = localStorage.getItem('sessionToken');
            const storedUser = localStorage.getItem('userData');
            
            if (storedToken && storedUser) {
                this.token = storedToken;
                this.user = JSON.parse(storedUser);
                this.isAuthenticated = true;
                
                // 驗證token有效性
                this.validateToken();
            }
        } catch (error) {
            console.error('載入存儲的認證信息失敗:', error);
            this.clearAuthData();
        }
    }
    
    async validateToken() {
        try {
            const response = await fetch('/api/auth/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                console.log('✅ Token驗證成功');
                this.updateUIAfterAuth();
            } else {
                console.log('❌ Token無效，清除認證數據');
                this.clearAuthData();
            }
        } catch (error) {
            console.error('Token驗證失敗:', error);
            // 如果驗證失敗，仍然嘗試使用現有token，可能是網絡問題
        }
    }
    
    setupTokenRefresh() {
        // 設置定期刷新token
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        this.refreshTimer = setInterval(() => {
            if (this.isAuthenticated) {
                this.refreshToken();
            }
        }, 20 * 60 * 1000); // 每20分鐘刷新一次
    }
    
    async refreshToken() {
        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.updateAuthData(data.token, data.user);
                console.log('🔄 Token刷新成功');
            }
        } catch (error) {
            console.error('Token刷新失敗:', error);
        }
    }
    
    interceptAPIRequests() {
        // 不再攔截 fetch，改為與統一API管理器整合
        if (window.unifiedAPI) {
            // 註冊認證處理器到統一API管理器
            window.unifiedAPI.registerAuthHandler({
                getToken: () => this.token,
                isAuthenticated: () => this.isAuthenticated,
                handleAuthError: () => this.handleAuthError(),
                refreshToken: () => this.refreshToken()
            });
            console.log('✅ 認證處理器已註冊到統一API管理器');
        } else {
            // 如果統一API管理器還未載入，延遲註冊
            setTimeout(() => this.interceptAPIRequests(), 100);
        }
    }
    
    async handleAuthError() {
        try {
            // 嘗試刷新token
            await this.refreshToken();
        } catch (error) {
            // 如果刷新失敗，清除認證數據
            console.log('認證失敗，需要重新登入');
            this.clearAuthData();
            this.showLoginPrompt();
        }
    }
    
    setupAuthEventListeners() {
        // 監聽登入表單提交
        document.addEventListener('submit', async (e) => {
            if (e.target.id === 'loginForm') {
                e.preventDefault();
                await this.handleLogin(e.target);
            }
        });
        
        // 監聽登出按鈕
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('logout-btn')) {
                this.logout();
            }
        });
    }
    
    async handleLogin(form) {
        const formData = new FormData(form);
        const username = formData.get('username') || formData.get('email');
        const password = formData.get('password');
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.updateAuthData(data.token, data.user);
                this.hideLoginModal();
                this.showSuccessMessage('登入成功！');
            } else {
                const error = await response.json();
                this.showErrorMessage(error.message || '登入失敗');
            }
        } catch (error) {
            console.error('登入請求失敗:', error);
            this.showErrorMessage('網絡錯誤，請稍後再試');
        }
    }
    
    updateAuthData(token, user) {
        this.token = token;
        this.user = user;
        this.isAuthenticated = true;
        
        // 保存到localStorage
        localStorage.setItem('sessionToken', token);
        localStorage.setItem('userData', JSON.stringify(user));
        
        this.updateUIAfterAuth();
    }
    
    updateUIAfterAuth() {
        // 更新UI以反映認證狀態
        document.body.classList.add('authenticated');
        
        // 隱藏登入按鈕，顯示用戶信息
        const loginBtn = document.querySelector('.login-btn');
        const userInfo = document.querySelector('.user-info');
        
        if (loginBtn) loginBtn.style.display = 'none';
        if (userInfo) {
            userInfo.style.display = 'block';
            userInfo.textContent = this.user?.username || '用戶';
        }
        
        // 觸發認證成功事件
        document.dispatchEvent(new CustomEvent('authSuccess', { 
            detail: { user: this.user, token: this.token } 
        }));
    }
    
    clearAuthData() {
        this.token = null;
        this.user = null;
        this.isAuthenticated = false;
        
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('userData');
        
        document.body.classList.remove('authenticated');
        
        // 顯示登入按鈕，隱藏用戶信息
        const loginBtn = document.querySelector('.login-btn');
        const userInfo = document.querySelector('.user-info');
        
        if (loginBtn) loginBtn.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
    }
    
    logout() {
        this.clearAuthData();
        this.showSuccessMessage('已成功登出');
        
        // 重載頁面以清除所有狀態
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
    
    showLoginPrompt() {
        const loginModal = document.querySelector('#loginModal');
        if (loginModal) {
            loginModal.classList.add('active');
        } else {
            // 如果沒有登入模態框，顯示簡單提示
            this.showErrorMessage('請先登入以使用此功能');
        }
    }
    
    hideLoginModal() {
        const loginModal = document.querySelector('#loginModal');
        if (loginModal) {
            loginModal.classList.remove('active');
        }
    }
    
    showSuccessMessage(message) {
        this.showNotification(message, 'success');
    }
    
    showErrorMessage(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type = 'info') {
        // 創建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // 添加樣式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6b7280'};
        `;
        
        document.body.appendChild(notification);
        
        // 動畫顯示
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 自動隱藏
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // 公共API方法
    getToken() {
        return this.token;
    }
    
    getUser() {
        return this.user;
    }
    
    isLoggedIn() {
        return this.isAuthenticated;
    }
    
    // 認證請求包裝器
    async makeAuthenticatedRequest(url, options = {}) {
        // 靜默處理認證錯誤，避免大量日誌
        try {
            // 檢查是否有認證請求函數
            if (typeof window.authRequest === 'function') {
                return await window.authRequest(url, options);
            }
            
            // 備用：直接發送請求
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...options.headers
                }
            });
            
            // 靜默處理401錯誤，因為這是模擬數據的預期行為
            if (response.status === 401) {
                return null; // 靜默返回null，讓調用者處理
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
            
        } catch (error) {
            // 僅在非401錯誤時記錄日誌
            if (!error.message.includes('401')) {
                console.warn('認證請求失敗:', error.message);
            }
            return null;
        }
    }
}

// 初始化認證修復系統
window.authFix = new AuthenticationFix();

// 為其他腳本提供認證檢查功能
window.requireAuth = function() {
    if (!window.authFix.isLoggedIn()) {
        window.authFix.showLoginPrompt();
        return false;
    }
    return true;
};

// 為其他腳本提供認證請求功能
window.authRequest = function(url, options = {}) {
    if (!window.authFix) {
        console.error('認證系統未初始化');
        return Promise.reject(new Error('認證系統未初始化'));
    }
    return window.authFix.makeAuthenticatedRequest(url, options);
}; 