/**
 * 用戶管理模組
 * 支援用戶註冊、登入、登出、個人資料管理
 */

class UserManager {
    constructor() {
        this.currentUser = null;
        this.sessionToken = null;
        this.isLoggedIn = false;
        
        this.init();
    }
    
    init() {
        this.loadStoredSession();
        this.initializeEventListeners();
        this.setupUI();
        this.updateUIState();
    }
    
    /**
     * 載入存儲的會話
     */
    loadStoredSession() {
        const storedSession = localStorage.getItem('user_session');
        const storedUser = localStorage.getItem('current_user');
        
        if (storedSession && storedUser) {
            try {
                this.sessionToken = JSON.parse(storedSession);
                this.currentUser = JSON.parse(storedUser);
                this.isLoggedIn = true;
                
                // 驗證會話是否仍然有效
                this.validateSession();
            } catch (error) {
                console.error('載入存儲會話失敗:', error);
                this.clearSession();
            }
        }
    }
    
    /**
     * 初始化事件監聽器
     */
    initializeEventListeners() {
        // 登入按鈕
        document.addEventListener('click', (e) => {
            if (e.target.matches('#loginBtn')) {
                this.showLoginModal();
            }
            
            if (e.target.matches('#registerBtn')) {
                this.showRegisterModal();
            }
            
            if (e.target.matches('#logoutBtn')) {
                this.logout();
            }
            
            if (e.target.matches('#profileBtn')) {
                this.showProfileModal();
            }
            
            // 模態框關閉
            if (e.target.matches('.user-modal-close, .user-modal-overlay')) {
                this.closeModal();
            }
        });
        
        // 表單提交
        document.addEventListener('submit', (e) => {
            if (e.target.matches('#loginForm')) {
                e.preventDefault();
                this.handleLogin(e.target);
            }
            
            if (e.target.matches('#registerForm')) {
                e.preventDefault();
                this.handleRegister(e.target);
            }
            
            if (e.target.matches('#profileForm')) {
                e.preventDefault();
                this.handleProfileUpdate(e.target);
            }
        });
    }
    
    /**
     * 設置用戶界面
     */
    setupUI() {
        // 如果用戶區域不存在，創建它
        if (!document.getElementById('userArea')) {
            this.createUserArea();
        }
    }
    
    /**
     * 創建用戶區域
     */
    createUserArea() {
        const topControls = document.querySelector('.top-controls');
        if (!topControls) return;
        
        const userArea = document.createElement('div');
        userArea.id = 'userArea';
        userArea.className = 'user-area';
        
        userArea.innerHTML = `
            <div class="user-controls">
                <div class="guest-controls" id="guestControls">
                    <button class="user-btn" id="loginBtn">
                        <i class="fas fa-sign-in-alt"></i>
                        <span data-i18n="login">登入</span>
                    </button>
                    <button class="user-btn secondary" id="registerBtn">
                        <i class="fas fa-user-plus"></i>
                        <span data-i18n="register">註冊</span>
                    </button>
                </div>
                <div class="user-controls-authenticated" id="userControlsAuth" style="display: none;">
                    <div class="user-info">
                        <div class="user-avatar">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <div class="user-details">
                            <div class="username" id="displayUsername"></div>
                            <div class="user-role" id="displayUserRole"></div>
                        </div>
                    </div>
                    <div class="user-menu">
                        <button class="user-btn" id="profileBtn">
                            <i class="fas fa-user-cog"></i>
                            <span data-i18n="profile">個人資料</span>
                        </button>
                        <button class="user-btn" id="logoutBtn">
                            <i class="fas fa-sign-out-alt"></i>
                            <span data-i18n="logout">登出</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        topControls.appendChild(userArea);
    }
    
    /**
     * 更新UI狀態
     */
    updateUIState() {
        const guestControls = document.getElementById('guestControls');
        const userControlsAuth = document.getElementById('userControlsAuth');
        const displayUsername = document.getElementById('displayUsername');
        const displayUserRole = document.getElementById('displayUserRole');
        
        if (this.isLoggedIn && this.currentUser) {
            if (guestControls) guestControls.style.display = 'none';
            if (userControlsAuth) userControlsAuth.style.display = 'flex';
            
            if (displayUsername) {
                displayUsername.textContent = this.currentUser.username;
            }
            if (displayUserRole) {
                displayUserRole.textContent = this.getRoleDisplayName(this.currentUser.role);
            }
        } else {
            if (guestControls) guestControls.style.display = 'flex';
            if (userControlsAuth) userControlsAuth.style.display = 'none';
        }
    }
    
    /**
     * 獲取角色顯示名稱
     */
    getRoleDisplayName(role) {
        const roleNames = {
            'admin': '管理員',
            'user': '用戶',
            'premium': '高級用戶'
        };
        return roleNames[role] || '用戶';
    }
    
    /**
     * 顯示登入模態框
     */
    showLoginModal() {
        const modalHTML = `
            <div class="user-modal-overlay">
                <div class="user-modal">
                    <div class="user-modal-header">
                        <h3>用戶登入</h3>
                        <button class="user-modal-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="user-modal-body">
                        <form id="loginForm">
                            <div class="form-group">
                                <label for="loginUsernameEmail">用戶名或郵件</label>
                                <input type="text" id="loginUsernameEmail" name="username_or_email" required>
                            </div>
                            <div class="form-group">
                                <label for="loginPassword">密碼</label>
                                <input type="password" id="loginPassword" name="password" required>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn-primary">
                                    <i class="fas fa-sign-in-alt"></i>
                                    登入
                                </button>
                                <button type="button" class="btn-secondary" onclick="userManager.showRegisterModal()">
                                    還沒有帳戶？註冊
                                </button>
                            </div>
                        </form>
                        <div id="loginMessage" class="message" style="display: none;"></div>
                    </div>
                </div>
            </div>
        `;
        
        this.showModal(modalHTML);
    }
    
    /**
     * 顯示註冊模態框
     */
    showRegisterModal() {
        const modalHTML = `
            <div class="user-modal-overlay">
                <div class="user-modal">
                    <div class="user-modal-header">
                        <h3>用戶註冊</h3>
                        <button class="user-modal-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="user-modal-body">
                        <form id="registerForm">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="registerFirstName">名字</label>
                                    <input type="text" id="registerFirstName" name="first_name">
                                </div>
                                <div class="form-group">
                                    <label for="registerLastName">姓氏</label>
                                    <input type="text" id="registerLastName" name="last_name">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="registerUsername">用戶名</label>
                                <input type="text" id="registerUsername" name="username" required 
                                       pattern="[a-zA-Z0-9_]{3,50}" 
                                       title="3-50個字符，只能包含字母、數字和下劃線">
                            </div>
                            <div class="form-group">
                                <label for="registerEmail">電子郵件</label>
                                <input type="email" id="registerEmail" name="email" required>
                            </div>
                            <div class="form-group">
                                <label for="registerPassword">密碼</label>
                                <input type="password" id="registerPassword" name="password" required
                                       minlength="8" title="至少8位字符，包含字母和數字">
                                <div class="password-strength" id="passwordStrength"></div>
                            </div>
                            <div class="form-group">
                                <label for="registerConfirmPassword">確認密碼</label>
                                <input type="password" id="registerConfirmPassword" name="confirm_password" required>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn-primary">
                                    <i class="fas fa-user-plus"></i>
                                    註冊
                                </button>
                                <button type="button" class="btn-secondary" onclick="userManager.showLoginModal()">
                                    已有帳戶？登入
                                </button>
                            </div>
                        </form>
                        <div id="registerMessage" class="message" style="display: none;"></div>
                    </div>
                </div>
            </div>
        `;
        
        this.showModal(modalHTML);
        
        // 添加密碼強度檢查
        this.setupPasswordStrengthChecker();
    }
    
    /**
     * 顯示個人資料模態框
     */
    showProfileModal() {
        if (!this.isLoggedIn) {
            this.showMessage('請先登入', 'error');
            return;
        }
        
        const user = this.currentUser;
        const modalHTML = `
            <div class="user-modal-overlay">
                <div class="user-modal profile-modal">
                    <div class="user-modal-header">
                        <h3>個人資料</h3>
                        <button class="user-modal-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="user-modal-body">
                        <div class="profile-tabs">
                            <button class="tab-btn active" data-tab="basic">基本資料</button>
                            <button class="tab-btn" data-tab="preferences">偏好設置</button>
                            <button class="tab-btn" data-tab="activity">活動記錄</button>
                        </div>
                        
                        <div class="profile-tab-content" id="basicTab">
                            <form id="profileForm">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="profileFirstName">名字</label>
                                        <input type="text" id="profileFirstName" name="first_name" 
                                               value="${user.first_name || ''}">
                                    </div>
                                    <div class="form-group">
                                        <label for="profileLastName">姓氏</label>
                                        <input type="text" id="profileLastName" name="last_name" 
                                               value="${user.last_name || ''}">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>用戶名</label>
                                    <input type="text" value="${user.username}" readonly>
                                </div>
                                <div class="form-group">
                                    <label>電子郵件</label>
                                    <input type="email" value="${user.email}" readonly>
                                </div>
                                <div class="form-group">
                                    <label>角色</label>
                                    <input type="text" value="${this.getRoleDisplayName(user.role)}" readonly>
                                </div>
                                <div class="form-actions">
                                    <button type="submit" class="btn-primary">
                                        <i class="fas fa-save"></i>
                                        更新資料
                                    </button>
                                </div>
                            </form>
                        </div>
                        
                        <div class="profile-tab-content" id="preferencesTab" style="display: none;">
                            <div class="preferences-section">
                                <h4>界面偏好</h4>
                                <div class="form-group">
                                    <label for="themePreference">主題</label>
                                    <select id="themePreference">
                                        <option value="light">淺色主題</option>
                                        <option value="dark">深色主題</option>
                                        <option value="auto">自動</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="languagePreference">語言</label>
                                    <select id="languagePreference">
                                        <option value="zh-TW">繁體中文</option>
                                        <option value="zh-CN">簡體中文</option>
                                        <option value="en">English</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="preferences-section">
                                <h4>生成偏好</h4>
                                <div class="form-group">
                                    <label for="defaultApiProvider">預設AI平台</label>
                                    <select id="defaultApiProvider">
                                        <option value="gemini">Google Gemini</option>
                                        <option value="openai">OpenAI DALL-E</option>
                                        <option value="stability">Stability AI</option>
                                        <option value="adobe_firefly">Adobe Firefly</option>
                                        <option value="leonardo_ai">Leonardo AI</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="defaultImageSize">預設圖片尺寸</label>
                                    <select id="defaultImageSize">
                                        <option value="512x512">512x512</option>
                                        <option value="1024x1024">1024x1024</option>
                                        <option value="1536x1536">1536x1536</option>
                                        <option value="2048x2048">2048x2048</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" class="btn-primary" onclick="userManager.savePreferences()">
                                    <i class="fas fa-save"></i>
                                    保存偏好
                                </button>
                            </div>
                        </div>
                        
                        <div class="profile-tab-content" id="activityTab" style="display: none;">
                            <div class="activity-list" id="activityList">
                                <div class="loading">載入中...</div>
                            </div>
                        </div>
                        
                        <div id="profileMessage" class="message" style="display: none;"></div>
                    </div>
                </div>
            </div>
        `;
        
        this.showModal(modalHTML);
        this.setupProfileTabs();
        this.loadUserPreferences();
    }
    
    /**
     * 設置個人資料標籤頁
     */
    setupProfileTabs() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.tab-btn')) {
                const tabName = e.target.dataset.tab;
                
                // 更新標籤頁狀態
                document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                
                // 顯示對應內容
                document.querySelectorAll('.profile-tab-content').forEach(content => {
                    content.style.display = 'none';
                });
                
                const targetTab = document.getElementById(tabName + 'Tab');
                if (targetTab) {
                    targetTab.style.display = 'block';
                    
                    // 如果是活動記錄標籤，載入活動數據
                    if (tabName === 'activity') {
                        this.loadUserActivities();
                    }
                }
            }
        });
    }
    
    /**
     * 設置密碼強度檢查器
     */
    setupPasswordStrengthChecker() {
        const passwordInput = document.getElementById('registerPassword');
        const strengthIndicator = document.getElementById('passwordStrength');
        
        if (passwordInput && strengthIndicator) {
            passwordInput.addEventListener('input', (e) => {
                const password = e.target.value;
                const strength = this.calculatePasswordStrength(password);
                
                strengthIndicator.innerHTML = `
                    <div class="strength-bar">
                        <div class="strength-fill strength-${strength.level}" 
                             style="width: ${strength.score}%"></div>
                    </div>
                    <div class="strength-text">${strength.text}</div>
                `;
            });
        }
    }
    
    /**
     * 計算密碼強度
     */
    calculatePasswordStrength(password) {
        let score = 0;
        let level = 'weak';
        let text = '弱';
        
        if (password.length >= 8) score += 25;
        if (/[a-z]/.test(password)) score += 25;
        if (/[A-Z]/.test(password)) score += 25;
        if (/\d/.test(password)) score += 25;
        if (/[^a-zA-Z0-9]/.test(password)) score += 25;
        
        if (score >= 75) {
            level = 'strong';
            text = '強';
        } else if (score >= 50) {
            level = 'medium';
            text = '中等';
        }
        
        return { score: Math.min(score, 100), level, text };
    }
    
    /**
     * 處理登入
     */
    async handleLogin(form) {
        const formData = new FormData(form);
        const data = {
            username_or_email: formData.get('username_or_email'),
            password: formData.get('password')
        };
        
        try {
            this.showMessage('正在登入...', 'info', 'loginMessage');
            
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentUser = result.user;
                this.sessionToken = result.session.token;
                this.isLoggedIn = true;
                
                // 存儲會話
                localStorage.setItem('current_user', JSON.stringify(this.currentUser));
                localStorage.setItem('user_session', JSON.stringify(this.sessionToken));
                
                this.updateUIState();
                this.closeModal();
                this.showMessage('登入成功！', 'success');
                
                // 刷新頁面數據
                this.refreshUserData();
                
            } else {
                this.showMessage(result.error || '登入失敗', 'error', 'loginMessage');
            }
            
        } catch (error) {
            console.error('登入錯誤:', error);
            this.showMessage('登入失敗，請檢查網路連接', 'error', 'loginMessage');
        }
    }
    
    /**
     * 處理註冊
     */
    async handleRegister(form) {
        const formData = new FormData(form);
        
        // 驗證密碼確認
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm_password');
        
        if (password !== confirmPassword) {
            this.showMessage('密碼確認不匹配', 'error', 'registerMessage');
            return;
        }
        
        const data = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: password,
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name')
        };
        
        try {
            this.showMessage('正在註冊...', 'info', 'registerMessage');
            
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showMessage('註冊成功！請登入', 'success', 'registerMessage');
                setTimeout(() => {
                    this.showLoginModal();
                }, 2000);
            } else {
                this.showMessage(result.error || '註冊失敗', 'error', 'registerMessage');
            }
            
        } catch (error) {
            console.error('註冊錯誤:', error);
            this.showMessage('註冊失敗，請檢查網路連接', 'error', 'registerMessage');
        }
    }
    
    /**
     * 處理個人資料更新
     */
    async handleProfileUpdate(form) {
        const formData = new FormData(form);
        const data = {
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name')
        };
        
        try {
            this.showMessage('正在更新...', 'info', 'profileMessage');
            
            const response = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 更新本地用戶資訊
                this.currentUser.first_name = data.first_name;
                this.currentUser.last_name = data.last_name;
                localStorage.setItem('current_user', JSON.stringify(this.currentUser));
                
                this.showMessage('個人資料更新成功！', 'success', 'profileMessage');
            } else {
                this.showMessage(result.error || '更新失敗', 'error', 'profileMessage');
            }
            
        } catch (error) {
            console.error('更新錯誤:', error);
            this.showMessage('更新失敗，請檢查網路連接', 'error', 'profileMessage');
        }
    }
    
    /**
     * 登出
     */
    async logout() {
        try {
            if (this.sessionToken) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.sessionToken}`
                    }
                });
            }
        } catch (error) {
            console.error('登出API調用失敗:', error);
        }
        
        this.clearSession();
        this.showMessage('已登出', 'info');
    }
    
    /**
     * 清除會話
     */
    clearSession() {
        this.currentUser = null;
        this.sessionToken = null;
        this.isLoggedIn = false;
        
        localStorage.removeItem('current_user');
        localStorage.removeItem('user_session');
        
        this.updateUIState();
    }
    
    /**
     * 驗證會話
     */
    async validateSession() {
        if (!this.sessionToken) {
            return false;
        }
        
        try {
            const response = await fetch('/api/auth/validate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`
                }
            });
            
            const result = await response.json();
            
            if (result.success && result.valid) {
                this.currentUser = result.user;
                this.isLoggedIn = true;
                this.updateUIState();
                return true;
            } else {
                this.clearSession();
                return false;
            }
            
        } catch (error) {
            console.error('會話驗證失敗:', error);
            this.clearSession();
            return false;
        }
    }
    
    /**
     * 載入用戶偏好
     */
    loadUserPreferences() {
        if (!this.currentUser || !this.currentUser.preferences) return;
        
        const prefs = this.currentUser.preferences;
        
        // 設置偏好值
        const elements = {
            'themePreference': prefs.theme || 'auto',
            'languagePreference': prefs.language || 'zh-TW',
            'defaultApiProvider': prefs.default_api_provider || 'gemini',
            'defaultImageSize': prefs.default_image_size || '1024x1024'
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });
    }
    
    /**
     * 保存偏好設置
     */
    async savePreferences() {
        const preferences = {
            theme: document.getElementById('themePreference')?.value || 'auto',
            language: document.getElementById('languagePreference')?.value || 'zh-TW',
            default_api_provider: document.getElementById('defaultApiProvider')?.value || 'gemini',
            default_image_size: document.getElementById('defaultImageSize')?.value || '1024x1024'
        };
        
        try {
            this.showMessage('正在保存偏好...', 'info', 'profileMessage');
            
            const response = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({ preferences })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentUser.preferences = preferences;
                localStorage.setItem('current_user', JSON.stringify(this.currentUser));
                
                this.showMessage('偏好設置保存成功！', 'success', 'profileMessage');
                
                // 應用主題變更
                if (preferences.theme !== 'auto') {
                    document.documentElement.setAttribute('data-theme', preferences.theme);
                }
                
            } else {
                this.showMessage(result.error || '保存失敗', 'error', 'profileMessage');
            }
            
        } catch (error) {
            console.error('保存偏好失敗:', error);
            this.showMessage('保存失敗，請檢查網路連接', 'error', 'profileMessage');
        }
    }
    
    /**
     * 載入用戶活動記錄
     */
    async loadUserActivities() {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;
        
        try {
            activityList.innerHTML = '<div class="loading">載入中...</div>';
            
            const response = await fetch('/api/auth/activities?limit=20', {
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                if (result.activities.length === 0) {
                    activityList.innerHTML = '<div class="empty-state">暫無活動記錄</div>';
                } else {
                    const activitiesHTML = result.activities.map(activity => `
                        <div class="activity-item">
                            <div class="activity-action">${this.getActivityDisplayName(activity.action)}</div>
                            <div class="activity-time">${new Date(activity.created_at).toLocaleString()}</div>
                            <div class="activity-ip">${activity.ip_address || 'N/A'}</div>
                        </div>
                    `).join('');
                    
                    activityList.innerHTML = activitiesHTML;
                }
            } else {
                activityList.innerHTML = '<div class="error">載入活動記錄失敗</div>';
            }
            
        } catch (error) {
            console.error('載入活動記錄失敗:', error);
            activityList.innerHTML = '<div class="error">載入活動記錄失敗</div>';
        }
    }
    
    /**
     * 獲取活動顯示名稱
     */
    getActivityDisplayName(action) {
        const actionNames = {
            'user_registered': '用戶註冊',
            'user_login': '用戶登入',
            'user_logout': '用戶登出',
            'profile_updated': '更新個人資料',
            'image_generated': '生成圖片',
            'image_downloaded': '下載圖片'
        };
        return actionNames[action] || action;
    }
    
    /**
     * 刷新用戶數據
     */
    async refreshUserData() {
        // 這裡可以刷新與用戶相關的數據
        // 例如圖片記錄、統計等
        console.log('用戶數據已刷新');
    }
    
    /**
     * 顯示模態框
     */
    showModal(modalHTML) {
        // 移除現有模態框
        this.closeModal();
        
        // 添加新模態框
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.body.classList.add('modal-open');
    }
    
    /**
     * 關閉模態框
     */
    closeModal() {
        const modals = document.querySelectorAll('.user-modal-overlay');
        modals.forEach(modal => modal.remove());
        document.body.classList.remove('modal-open');
    }
    
    /**
     * 顯示消息
     */
    showMessage(message, type = 'info', targetId = null) {
        if (targetId) {
            const target = document.getElementById(targetId);
            if (target) {
                target.innerHTML = `<div class="message-${type}">${message}</div>`;
                target.style.display = 'block';
            }
        } else {
            // 顯示全局消息
            const messageEl = document.createElement('div');
            messageEl.className = `notification notification-${type}`;
            messageEl.textContent = message;
            
            document.body.appendChild(messageEl);
            
            setTimeout(() => {
                messageEl.remove();
            }, 3000);
        }
    }
    
    /**
     * 獲取當前用戶
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * 檢查是否已登入
     */
    isUserLoggedIn() {
        return this.isLoggedIn;
    }
    
    /**
     * 獲取會話令牌
     */
    getSessionToken() {
        return this.sessionToken;
    }
}

// 初始化用戶管理器
const userManager = new UserManager(); 