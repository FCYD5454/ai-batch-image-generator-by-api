/**
 * 統計分析管理模組
 * 提供統計數據顯示和分析功能
 */

class StatisticsManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadStatistics();
    }

    bindEvents() {
        // 重新整理統計按鈕
        const refreshBtn = document.getElementById('refreshStats');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadStatistics();
            });
        }
    }

    async loadStatistics() {
        try {
            this.showLoading();
            
            const response = await fetch('/api/images/statistics');
            const data = await response.json();

            if (data.success) {
                this.renderBasicStats(data.data.basic);
                this.renderProviderStats(data.data.by_provider);
                this.renderDailyStats(data.data.daily);
                this.renderSuccessStats(data.data.success_rate);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('載入統計數據失敗:', error);
            this.showError('載入統計數據失敗: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    renderBasicStats(stats) {
        const container = document.getElementById('basicStats');
        if (!container) return;

        const avgRating = stats.avg_rating ? parseFloat(stats.avg_rating).toFixed(1) : '0.0';
        
        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${stats.total_images || 0}</div>
                <div class="stat-label">總圖片數</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.favorite_images || 0}</div>
                <div class="stat-label">收藏圖片</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${avgRating}</div>
                <div class="stat-label">平均評分</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.total_providers || 0}</div>
                <div class="stat-label">使用的API</div>
            </div>
        `;
    }

    renderProviderStats(providerStats) {
        const container = document.getElementById('providerStats');
        if (!container) return;

        if (!providerStats || providerStats.length === 0) {
            container.innerHTML = `
                <div class="empty-stats">
                    <p>暫無提供商使用統計</p>
                </div>
            `;
            return;
        }

        const html = providerStats.map(provider => `
            <div class="provider-item">
                <div class="provider-info">
                    <span class="provider-name">${this.getProviderDisplayName(provider.api_provider)}</span>
                    <div class="provider-bar">
                        <div class="provider-bar-fill" style="width: ${this.calculatePercentage(provider.count, providerStats)}%"></div>
                    </div>
                </div>
                <span class="provider-count">${provider.count}</span>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    renderDailyStats(dailyStats) {
        const container = document.getElementById('dailyStats');
        if (!container) return;

        if (!dailyStats || dailyStats.length === 0) {
            container.innerHTML = `
                <div class="empty-stats">
                    <p>暫無最近7天的統計數據</p>
                </div>
            `;
            return;
        }

        // 填充缺失的日期（最近7天）
        const fullStats = this.fillMissingDates(dailyStats, 7);
        
        const html = fullStats.map(day => `
            <div class="daily-item">
                <div class="daily-date">${this.formatShortDate(day.date)}</div>
                <div class="daily-count">${day.count}</div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    renderSuccessStats(successStats) {
        const container = document.getElementById('successStats');
        if (!container) return;

        const totalAttempts = (successStats.total_success || 0) + (successStats.total_failed || 0);
        const successRate = totalAttempts > 0 ? 
            ((successStats.total_success / totalAttempts) * 100).toFixed(1) : 0;

        container.innerHTML = `
            <div class="success-item success-rate">
                <div class="stat-number">${successRate}%</div>
                <div class="stat-label">成功率</div>
            </div>
            <div class="success-item success-total">
                <div class="stat-number">${successStats.total_success || 0}</div>
                <div class="stat-label">成功生成</div>
            </div>
            <div class="success-item success-failed">
                <div class="stat-number">${successStats.total_failed || 0}</div>
                <div class="stat-label">生成失敗</div>
            </div>
            <div class="success-item">
                <div class="stat-number">${successStats.total_generations || 0}</div>
                <div class="stat-label">總生成次數</div>
            </div>
        `;
    }

    getProviderDisplayName(provider) {
        const names = {
            'gemini': 'Google Gemini',
            'openai': 'OpenAI DALL-E',
            'stability': 'Stability AI',
            'custom': '自定義 API',
            'midjourney': 'Midjourney'
        };
        return names[provider] || provider;
    }

    calculatePercentage(count, allProviders) {
        const total = allProviders.reduce((sum, p) => sum + p.count, 0);
        return total > 0 ? (count / total) * 100 : 0;
    }

    fillMissingDates(dailyStats, days) {
        const result = [];
        const today = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const existing = dailyStats.find(stat => stat.date === dateStr);
            result.push({
                date: dateStr,
                count: existing ? existing.count : 0
            });
        }
        
        return result;
    }

    formatShortDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const diffTime = today - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return '今天';
        if (diffDays === 1) return '昨天';
        if (diffDays === 2) return '前天';
        
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }

    showLoading() {
        const sections = ['basicStats', 'providerStats', 'dailyStats', 'successStats'];
        sections.forEach(sectionId => {
            const container = document.getElementById(sectionId);
            if (container) {
                container.innerHTML = `
                    <div class="loading-stats">
                        <div class="spinner"></div>
                        <p>載入統計中...</p>
                    </div>
                `;
            }
        });
    }

    hideLoading() {
        // Loading will be replaced by actual content
    }

    showError(message) {
        const sections = ['basicStats', 'providerStats', 'dailyStats', 'successStats'];
        sections.forEach(sectionId => {
            const container = document.getElementById(sectionId);
            if (container) {
                container.innerHTML = `
                    <div class="error-stats">
                        <div class="error-icon">❌</div>
                        <p>${message}</p>
                        <button onclick="statisticsManager.loadStatistics()">重試</button>
                    </div>
                `;
            }
        });
    }
}

// 初始化統計管理器
let statisticsManager = null;
document.addEventListener('DOMContentLoaded', () => {
    statisticsManager = new StatisticsManager();
}); 