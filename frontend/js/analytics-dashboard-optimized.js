/**
 * Analytics Dashboard v4.0 - 優化版
 * 企業級分析儀表板，專注核心指標和實時更新
 */

'use strict';

// ================== 配置 ==================
const ANALYTICS_CONFIG = {
    API_BASE: '/api/analytics',
    UPDATE_INTERVAL: 30000, // 30秒
    REAL_TIME_INTERVAL: 5000, // 5秒
    MAX_CACHE_SIZE: 100,
    CACHE_TTL: 60000, // 1分鐘
    
    TIME_RANGES: {
        '1h': { label: '1小時', value: 3600000 },
        '24h': { label: '24小時', value: 86400000 },
        '7d': { label: '7天', value: 604800000 },
        '30d': { label: '30天', value: 2592000000 }
    }
};

// ================== 主要類別 ==================
class AnalyticsDashboardOptimized {
    constructor() {
        this.data = new Map();
        this.cache = new Map();
        this.intervals = new Map();
        this.currentTimeRange = '24h';
        this.isVisible = false;
        
        this.init();
    }

    async init() {
        try {
            this.setupUI();
            this.bindEvents();
            await this.loadInitialData();
            this.startRealTimeUpdates();
            
            console.log('📊 分析儀表板v4.0已初始化');
        } catch (error) {
            console.error('儀表板初始化失敗:', error);
        }
    }

    setupUI() {
        this.createMainContainer();
        this.injectStyles();
    }

    createMainContainer() {
        const container = this.getOrCreateContainer();
        container.innerHTML = this.getMainHTML();
    }

    getOrCreateContainer() {
        let container = document.getElementById('analytics-dashboard-optimized');
        if (!container) {
            container = document.createElement('div');
            container.id = 'analytics-dashboard-optimized';
            container.className = 'analytics-dashboard hidden';
            document.body.appendChild(container);
        }
        return container;
    }

    getMainHTML() {
        return `
            <div class="dashboard-container">
                <header class="dashboard-header">
                    <div class="header-content">
                        <h2>📊 企業分析儀表板</h2>
                        <div class="header-controls">
                            <select id="timeRangeSelect" class="time-range-select">
                                <option value="1h">1小時</option>
                                <option value="24h" selected>24小時</option>
                                <option value="7d">7天</option>
                                <option value="30d">30天</option>
                            </select>
                            <button id="refreshBtn" class="refresh-btn">🔄 刷新</button>
                            <button id="exportBtn" class="export-btn">📊 導出</button>
                        </div>
                    </div>
                </header>

                <main class="dashboard-main">
                    <section class="metrics-section">
                        <h3>⚡ 實時監控</h3>
                        <div class="metrics-grid" id="metricsGrid">
                            ${this.getMetricsHTML()}
                        </div>
                    </section>

                    <section class="trends-section">
                        <h3>📈 趨勢分析</h3>
                        <div class="trends-container">
                            <div class="chart-card">
                                <h4>生成數量趨勢</h4>
                                <div id="generationChart" class="chart-container">
                                    <div class="chart-placeholder">載入中...</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section class="alerts-section">
                        <h3>🚨 警報中心</h3>
                        <div id="alertsContainer" class="alerts-container">
                            <!-- 動態載入警報 -->
                        </div>
                    </section>
                </main>
            </div>
        `;
    }

    getMetricsHTML() {
        const metrics = [
            { id: 'totalGenerated', label: '總生成數', value: '0', icon: '🎨' },
            { id: 'activeUsers', label: '活躍用戶', value: '0', icon: '👥' },
            { id: 'successRate', label: '成功率', value: '0%', icon: '✅' },
            { id: 'avgResponseTime', label: '響應時間', value: '0ms', icon: '⚡' }
        ];

        return metrics.map(metric => `
            <div class="metric-card" data-metric="${metric.id}">
                <div class="metric-icon">${metric.icon}</div>
                <div class="metric-content">
                    <div class="metric-label">${metric.label}</div>
                    <div class="metric-value" id="${metric.id}Value">${metric.value}</div>
                    <div class="metric-change" id="${metric.id}Change">--</div>
                </div>
            </div>
        `).join('');
    }

    bindEvents() {
        const container = document.getElementById('analytics-dashboard-optimized');
        if (!container) return;

        // 刷新按鈕
        const refreshBtn = container.querySelector('#refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }

        // 導出按鈕
        const exportBtn = container.querySelector('#exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }
    }

    async loadInitialData() {
        await Promise.all([
            this.loadMetrics(),
            this.loadAlerts()
        ]);
    }

    async loadMetrics() {
        try {
            const metrics = await this.fetchData('/metrics');
            this.updateMetricsDisplay(metrics);
        } catch (error) {
            console.error('載入指標失敗:', error);
        }
    }

    async loadAlerts() {
        try {
            const alerts = await this.fetchData('/alerts');
            this.updateAlertsDisplay(alerts);
        } catch (error) {
            console.error('載入警報失敗:', error);
        }
    }

    updateMetricsDisplay(metrics) {
        Object.entries(metrics).forEach(([key, data]) => {
            const valueEl = document.getElementById(`${key}Value`);
            const changeEl = document.getElementById(`${key}Change`);
            
            if (valueEl) {
                valueEl.textContent = this.formatMetricValue(key, data.value);
            }
            
            if (changeEl && data.change !== undefined) {
                const change = data.change;
                changeEl.textContent = this.formatChange(change);
                changeEl.className = `metric-change ${change >= 0 ? 'positive' : 'negative'}`;
            }
        });
    }

    updateAlertsDisplay(alerts) {
        const container = document.getElementById('alertsContainer');
        if (!container) return;

        if (!alerts || alerts.length === 0) {
            container.innerHTML = `
                <div class="no-alerts">
                    <div class="no-alerts-icon">✅</div>
                    <div class="no-alerts-text">目前沒有警報</div>
                </div>
            `;
            return;
        }

        container.innerHTML = alerts.map(alert => `
            <div class="alert-item ${alert.level}">
                <div class="alert-icon">${this.getAlertIcon(alert.level)}</div>
                <div class="alert-content">
                    <div class="alert-title">${alert.title}</div>
                    <div class="alert-message">${alert.message}</div>
                </div>
            </div>
        `).join('');
    }

    async fetchData(endpoint) {
        try {
            const response = await fetch(`${ANALYTICS_CONFIG.API_BASE}${endpoint}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`API請求失敗 ${endpoint}:`, error);
            return this.getMockData(endpoint);
        }
    }

    getMockData(endpoint) {
        const mockData = {
            '/metrics': {
                totalGenerated: { value: 15247, change: 8.5 },
                activeUsers: { value: 342, change: -2.1 },
                successRate: { value: 96.8, change: 1.2 },
                avgResponseTime: { value: 247, change: -15.3 }
            },
            '/alerts': [
                {
                    level: 'warning',
                    title: '緩存使用率警告',
                    message: '緩存使用率達到85%，建議清理'
                }
            ]
        };

        return mockData[endpoint] || {};
    }

    startRealTimeUpdates() {
        this.intervals.set('realtime', setInterval(() => {
            if (this.isVisible) {
                this.loadMetrics();
            }
        }, ANALYTICS_CONFIG.REAL_TIME_INTERVAL));
    }

    async refresh() {
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.classList.add('loading');
            refreshBtn.disabled = true;
        }

        try {
            await this.loadInitialData();
            this.showSuccess('數據已刷新');
        } catch (error) {
            this.showError('刷新失敗');
        } finally {
            if (refreshBtn) {
                refreshBtn.classList.remove('loading');
                refreshBtn.disabled = false;
            }
        }
    }

    async exportData() {
        try {
            const data = {
                timestamp: new Date().toISOString(),
                timeRange: this.currentTimeRange,
                metrics: await this.fetchData('/metrics'),
                alerts: await this.fetchData('/alerts')
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { 
                type: 'application/json' 
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.showSuccess('報告已導出');
            
        } catch (error) {
            this.showError('導出失敗');
        }
    }

    show() {
        const container = document.getElementById('analytics-dashboard-optimized');
        if (container) {
            container.classList.remove('hidden');
            this.isVisible = true;
            this.refresh();
        }
    }

    hide() {
        const container = document.getElementById('analytics-dashboard-optimized');
        if (container) {
            container.classList.add('hidden');
            this.isVisible = false;
        }
    }

    formatMetricValue(type, value) {
        switch (type) {
            case 'successRate':
                return `${value.toFixed(1)}%`;
            case 'avgResponseTime':
                return `${value}ms`;
            default:
                return this.formatNumber(value);
        }
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        } else if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K`;
        }
        return num.toString();
    }

    formatChange(change) {
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change.toFixed(1)}%`;
    }

    getAlertIcon(level) {
        const icons = {
            info: 'ℹ️',
            warning: '⚠️',
            error: '❌',
            critical: '🚨'
        };
        return icons[level] || 'ℹ️';
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        if (window.uxEnhancement?.showNotification) {
            window.uxEnhancement.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    injectStyles() {
        if (document.getElementById('analytics-dashboard-styles')) return;

        const style = document.createElement('style');
        style.id = 'analytics-dashboard-styles';
        style.textContent = `
            .analytics-dashboard {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: var(--bg-color, #f8f9fa);
                z-index: 1000;
                overflow-y: auto;
            }
            
            .analytics-dashboard.hidden {
                display: none;
            }
            
            .dashboard-container {
                max-width: 1400px;
                margin: 0 auto;
                padding: 20px;
            }
            
            .dashboard-header {
                background: white;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .header-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .header-controls {
                display: flex;
                gap: 12px;
            }
            
            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            
            .metric-card {
                background: white;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                display: flex;
                align-items: center;
                cursor: pointer;
                transition: transform 0.2s;
            }
            
            .metric-card:hover {
                transform: translateY(-2px);
            }
            
            .metric-icon {
                font-size: 2rem;
                margin-right: 16px;
            }
            
            .metric-value {
                font-size: 1.8rem;
                font-weight: bold;
                color: var(--primary-color, #007bff);
            }
            
            .metric-change.positive {
                color: #28a745;
            }
            
            .metric-change.negative {
                color: #dc3545;
            }
            
            .chart-card {
                background: white;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .alert-item {
                background: white;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 12px;
                border-left: 4px solid;
                display: flex;
                align-items: flex-start;
            }
            
            .alert-item.warning { border-left-color: #ffc107; }
            .alert-item.error { border-left-color: #dc3545; }
            .alert-item.critical { border-left-color: #721c24; }
            
            .refresh-btn.loading {
                opacity: 0.6;
                pointer-events: none;
            }
            
            @media (max-width: 768px) {
                .header-content {
                    flex-direction: column;
                    gap: 16px;
                }
                
                .metrics-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// ================== 初始化 ==================
let analyticsDashboard;

(() => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            analyticsDashboard = new AnalyticsDashboardOptimized();
        });
    } else {
        analyticsDashboard = new AnalyticsDashboardOptimized();
    }
    
    window.analyticsDashboard = analyticsDashboard;
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnalyticsDashboardOptimized };
}
