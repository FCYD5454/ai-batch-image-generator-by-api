/**
 * 生成歷史管理模組
 * 提供歷史記錄查看、搜尋、匯出等功能
 */

class HistoryManager {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalPages = 1;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadHistory();
    }

    bindEvents() {
        // 重新整理按鈕
        const refreshBtn = document.getElementById('refreshHistory');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadHistory();
            });
        }

        // 匯出歷史按鈕
        const exportBtn = document.getElementById('exportHistory');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportHistory();
            });
        }
    }

    async loadHistory() {
        try {
            this.showLoading();
            
            const params = new URLSearchParams({
                page: this.currentPage,
                page_size: this.pageSize
            });

            const response = await fetch(`/api/images/history?${params}`);
            const data = await response.json();

            if (data.success) {
                this.renderHistoryList(data.data.history);
                this.renderPagination(data.data.pagination);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('載入歷史記錄失敗:', error);
            this.showError('載入歷史記錄失敗: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    renderHistoryList(history) {
        const container = document.getElementById('historyList');
        if (!container) return;

        if (history.length === 0) {
            container.innerHTML = `
                <div class="empty-history">
                    <div class="empty-icon">📜</div>
                    <h3>還沒有生成歷史</h3>
                    <p>開始生成一些圖片來創建歷史記錄吧！</p>
                </div>
            `;
            return;
        }

        const html = history.map(record => this.renderHistoryItem(record)).join('');
        container.innerHTML = html;
    }

    renderHistoryItem(record) {
        const successRate = record.image_count > 0 ? 
            ((record.success_count / record.image_count) * 100).toFixed(1) : 0;
        
        return `
            <div class="history-item">
                <div class="history-prompt">
                    ${this.escapeHtml(record.prompt)}
                </div>
                
                <div class="history-meta">
                    <div class="meta-item">
                        <span class="meta-label">API 提供商</span>
                        <span class="meta-value">${record.api_provider}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">模型</span>
                        <span class="meta-value">${record.model_name || '預設'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">圖片尺寸</span>
                        <span class="meta-value">${record.image_size}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">請求數量</span>
                        <span class="meta-value">${record.image_count}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">實際生成</span>
                        <span class="meta-value">${record.actual_images}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">生成時間</span>
                        <span class="meta-value">${this.formatDate(record.local_created_at)}</span>
                    </div>
                </div>
                
                <div class="history-stats">
                    <span class="stat-badge stat-success">
                        成功: ${record.success_count}
                    </span>
                    <span class="stat-badge stat-failed">
                        失敗: ${record.failed_count}
                    </span>
                    <span class="stat-badge stat-time">
                        耗時: ${record.total_time ? record.total_time.toFixed(2) + 's' : '未知'}
                    </span>
                    <span class="stat-badge">
                        成功率: ${successRate}%
                    </span>
                </div>
                
                <div class="history-actions">
                    <button class="btn-small" onclick="historyManager.regenerateFromHistory(${record.id})">
                        重新生成
                    </button>
                    <button class="btn-small" onclick="historyManager.viewHistoryImages(${record.id})">
                        查看圖片
                    </button>
                </div>
            </div>
        `;
    }

    async regenerateFromHistory(recordId) {
        try {
            // 獲取歷史記錄詳情
            const response = await fetch(`/api/images/history/${recordId}`);
            const data = await response.json();
            
            if (data.success) {
                const record = data.data;
                
                // 切換到生成器標籤頁
                switchTab('generator');
                
                // 填充表單
                document.getElementById('prompts').value = record.prompt;
                document.getElementById('apiProvider').value = record.api_provider;
                document.getElementById('imageSize').value = record.image_size;
                document.getElementById('imageCount').value = record.image_count;
                
                // 觸發API提供商變更事件
                document.getElementById('apiProvider').dispatchEvent(new Event('change'));
                
                alert('歷史記錄已載入到生成器，您可以重新生成圖片！');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('載入歷史記錄失敗:', error);
            alert('載入歷史記錄失敗: ' + error.message);
        }
    }

    async viewHistoryImages(recordId) {
        // 切換到畫廊標籤頁並過濾該記錄的圖片
        switchTab('gallery');
        
        // 如果畫廊有搜尋功能，可以根據 generation_id 過濾
        // 這裡簡化處理，直接顯示畫廊
        if (window.imageGallery) {
            window.imageGallery.loadImageGallery();
        }
    }

    async exportHistory() {
        try {
            const response = await fetch('/api/images/export/history');
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `generation_history_${new Date().getTime()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                alert('歷史記錄匯出成功！');
            } else {
                const data = await response.json();
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('匯出歷史記錄失敗:', error);
            alert('匯出歷史記錄失敗: ' + error.message);
        }
    }

    renderPagination(pagination) {
        const container = document.getElementById('historyPagination');
        if (!container) return;

        const { current_page, total_pages, has_prev, has_next } = pagination;
        this.totalPages = total_pages;

        let html = `
            <div class="pagination">
                <button class="page-btn" ${!has_prev ? 'disabled' : ''} 
                        onclick="historyManager.goToPage(${current_page - 1})">
                    上一頁
                </button>
                
                <span class="page-info">
                    第 ${current_page} 頁 / 共 ${total_pages} 頁
                </span>
                
                <button class="page-btn" ${!has_next ? 'disabled' : ''} 
                        onclick="historyManager.goToPage(${current_page + 1})">
                    下一頁
                </button>
            </div>
        `;

        container.innerHTML = html;
    }

    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.loadHistory();
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-TW') + ' ' + date.toLocaleTimeString('zh-TW', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showLoading() {
        const container = document.getElementById('historyList');
        if (container) {
            container.innerHTML = `
                <div class="loading-gallery">
                    <div class="spinner"></div>
                    <p>載入歷史記錄中...</p>
                </div>
            `;
        }
    }

    hideLoading() {
        // Loading will be replaced by actual content
    }

    showError(message) {
        const container = document.getElementById('historyList');
        if (container) {
            container.innerHTML = `
                <div class="error-gallery">
                    <div class="error-icon">❌</div>
                    <h3>載入失敗</h3>
                    <p>${message}</p>
                    <button onclick="historyManager.loadHistory()">重試</button>
                </div>
            `;
        }
    }
}

// 初始化歷史管理器
let historyManager = null;
document.addEventListener('DOMContentLoaded', () => {
    historyManager = new HistoryManager();
}); 