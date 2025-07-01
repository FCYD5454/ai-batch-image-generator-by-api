/**
 * 標籤載入和模型下載修正
 * 解決重複"正在處理請求..."和"進度容器不存在"問題
 */

class TabLoadingFix {
    constructor() {
        this.isFixing = false;
        this.loadingStates = new Map();
        this.init();
    }

    init() {
        console.log('🔧 標籤載入修正已啟動');
        this.fixTabLoading();
        this.fixModelDownload();
        this.preventDuplicateLoading();
    }

    // 修正標籤載入重複請求問題
    fixTabLoading() {
        console.log('修正標籤載入');
        // 攔截並優化 AI Assistant v2.7 的標籤切換
        const originalSwitchTab = window.aiAssistantV27?.switchTab;
        if (window.aiAssistantV27 && originalSwitchTab) {
            window.aiAssistantV27.switchTab = (tabName) => {
                // 防止重複載入同一個標籤
                if (this.loadingStates.get(`ai-${tabName}`) === 'loading') {
                    console.log(`標籤 ${tabName} 正在載入中，跳過重複請求`);
                    return;
                }

                this.loadingStates.set(`ai-${tabName}`, 'loading');
                
                try {
                    originalSwitchTab.call(window.aiAssistantV27, tabName);
                } finally {
                    // 延遲清除載入狀態
                    setTimeout(() => {
                        this.loadingStates.set(`ai-${tabName}`, 'loaded');
                    }, 1000);
                }
            };
        }

        // 攔截並優化 Local AI Manager 的標籤切換
        const originalLocalSwitchTab = window.localAIManager?.switchTab;
        if (window.localAIManager && originalLocalSwitchTab) {
            window.localAIManager.switchTab = (tabName) => {
                // 防止重複載入同一個標籤
                if (this.loadingStates.get(`local-${tabName}`) === 'loading') {
                    console.log(`Local AI 標籤 ${tabName} 正在載入中，跳過重複請求`);
                    return;
                }

                this.loadingStates.set(`local-${tabName}`, 'loading');
                
                try {
                    originalLocalSwitchTab.call(window.localAIManager, tabName);
                } finally {
                    // 延遲清除載入狀態
                    setTimeout(() => {
                        this.loadingStates.set(`local-${tabName}`, 'loaded');
                    }, 1000);
                }
            };
        }
    }

    // 修正模型下載進度容器問題
    fixModelDownload() {
        console.log('修正模型下載');
        // 確保進度容器正確創建
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('download-model-btn') || 
                e.target.closest('.download-model-btn')) {
                
                const button = e.target.classList.contains('download-model-btn') ? 
                               e.target : e.target.closest('.download-model-btn');
                
                const modelName = button.dataset.model;
                if (modelName) {
                    this.ensureProgressContainer(modelName);
                }
            }
        });
    }

    // 確保進度容器存在
    ensureProgressContainer(modelName) {
        let progressContainer = document.getElementById(`progress-${modelName}`);
        
        if (!progressContainer) {
            console.log(`創建缺失的進度容器: progress-${modelName}`);
            
            // 找到對應的模型卡片
            const modelCard = document.querySelector(`[data-model="${modelName}"]`);
            if (modelCard) {
                // 創建進度容器
                progressContainer = document.createElement('div');
                progressContainer.className = 'download-progress';
                progressContainer.id = `progress-${modelName}`;
                progressContainer.style.display = 'none';
                progressContainer.innerHTML = `
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <span class="progress-text">0%</span>
                `;
                
                // 插入到模型卡片中
                modelCard.appendChild(progressContainer);
                console.log(`✅ 已創建進度容器: progress-${modelName}`);
            } else {
                console.error(`找不到模型卡片: ${modelName}`);
            }
        }
        
        return progressContainer;
    }

    // 防止重複載入指示器
    preventDuplicateLoading() {
        // 監聽 API 請求事件，防止重複顯示載入指示器
        let activeLoadingIndicators = new Set();

        document.addEventListener('apiRequestStart', (event) => {
            const { url } = event.detail;
            
            // 如果同一個 URL 已經在載入中，不要顯示新的載入指示器
            if (activeLoadingIndicators.has(url)) {
                event.stopPropagation();
                return;
            }
            
            activeLoadingIndicators.add(url);
        });

        document.addEventListener('apiRequestEnd', (event) => {
            const { url } = event.detail;
            activeLoadingIndicators.delete(url);
        });

        document.addEventListener('apiRequestError', (event) => {
            const { url } = event.detail;
            activeLoadingIndicators.delete(url);
        });
    }

    // 修正 UX Enhancement 的重複載入指示器問題
    fixUXEnhancement() {
        if (window.uxEnhancement) {
            const originalShowLoadingIndicator = window.uxEnhancement.showLoadingIndicator;
            
            window.uxEnhancement.showLoadingIndicator = (message) => {
                // 檢查是否已經有相同的載入指示器
                const existingIndicators = document.querySelectorAll('.loading-indicator');
                for (const indicator of existingIndicators) {
                    if (indicator.textContent.includes(message)) {
                        console.log('跳過重複的載入指示器:', message);
                        return indicator.id; // 返回現有指示器的 ID
                    }
                }
                
                return originalShowLoadingIndicator.call(window.uxEnhancement, message);
            };
        }
    }

    // 清理載入狀態
    clearLoadingStates() {
        this.loadingStates.clear();
        console.log('🧹 已清理所有載入狀態');
    }

    // 獲取當前載入狀態
    getLoadingStates() {
        return Object.fromEntries(this.loadingStates);
    }
}

// 等待頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    // 延遲初始化，確保其他組件已載入
    setTimeout(() => {
        window.tabLoadingFix = new TabLoadingFix();
    }, 2000);
});

// 也監聽其他組件載入事件
document.addEventListener('aiAssistantV27Loaded', () => {
    if (!window.tabLoadingFix) {
        window.tabLoadingFix = new TabLoadingFix();
    } else {
        window.tabLoadingFix.fixTabLoading();
    }
});

document.addEventListener('localAIManagerLoaded', () => {
    if (!window.tabLoadingFix) {
        window.tabLoadingFix = new TabLoadingFix();
    } else {
        window.tabLoadingFix.fixTabLoading();
    }
});

// 提供全局修正函數
window.fixTabLoading = () => {
    if (window.tabLoadingFix) {
        window.tabLoadingFix.clearLoadingStates();
        window.tabLoadingFix.fixTabLoading();
        window.tabLoadingFix.fixModelDownload();
        console.log('🔧 手動重新應用標籤載入修正');
    }
};

console.log('🚀 標籤載入修正腳本已載入'); 