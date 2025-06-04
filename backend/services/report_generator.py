"""
企業級報告生成器 v3.0
支持多種格式輸出、自動化調度和高級可視化功能
"""

import asyncio
import json
import logging
import os
import tempfile
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import base64
import sqlite3

# 嘗試導入可選的依賴
try:
    import matplotlib.pyplot as plt
    import matplotlib.dates as mdates
    import seaborn as sns
    import pandas as pd
    VISUALIZATION_AVAILABLE = True
except ImportError:
    VISUALIZATION_AVAILABLE = False

try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

logger = logging.getLogger(__name__)

class ReportFormat(Enum):
    """報告格式"""
    JSON = "json"
    HTML = "html"
    PDF = "pdf"
    CSV = "csv"
    EXCEL = "excel"

class ReportType(Enum):
    """報告類型"""
    EXECUTIVE_SUMMARY = "executive_summary"
    DETAILED_ANALYTICS = "detailed_analytics"
    PERFORMANCE_DASHBOARD = "performance_dashboard"
    TREND_ANALYSIS = "trend_analysis"
    USER_BEHAVIOR = "user_behavior"
    BUSINESS_VALUE = "business_value"
    CUSTOM = "custom"

class VisualizationType(Enum):
    """可視化類型"""
    LINE_CHART = "line_chart"
    BAR_CHART = "bar_chart"
    PIE_CHART = "pie_chart"
    HEATMAP = "heatmap"
    SCATTER_PLOT = "scatter_plot"
    AREA_CHART = "area_chart"

@dataclass
class ReportTemplate:
    """報告模板"""
    template_id: str
    name: str
    description: str
    report_type: ReportType
    sections: List[str]
    default_format: ReportFormat
    include_visualizations: bool
    auto_refresh_interval: Optional[int]  # 分鐘
    recipients: List[str]
    created_by: int
    created_at: datetime

@dataclass
class ReportSection:
    """報告章節"""
    section_id: str
    title: str
    content: str
    data: Dict[str, Any]
    visualizations: List[Dict[str, Any]]
    order_index: int

class EnterpriseReportGenerator:
    """企業級報告生成器"""
    
    def __init__(self, db_service=None):
        self.db_service = db_service
        self.report_cache = {}
        self.templates = {}
        
        # 初始化樣式配置
        self.style_config = {
            'primary_color': '#2C3E50',
            'secondary_color': '#3498DB',
            'accent_color': '#E74C3C',
            'success_color': '#27AE60',
            'warning_color': '#F39C12',
            'font_family': 'Arial, sans-serif',
            'chart_style': 'seaborn-v0_8' if VISUALIZATION_AVAILABLE else 'default'
        }
        
        # 初始化預定義模板
        self._init_default_templates()
        
        # 初始化報告數據庫
        self._init_reports_db()
        
        logger.info(f"企業級報告生成器初始化完成 - PDF支援: {PDF_AVAILABLE}, 可視化支援: {VISUALIZATION_AVAILABLE}")
    
    def _init_reports_db(self):
        """初始化報告數據庫"""
        try:
            db_path = os.path.join('data', 'reports.db')
            os.makedirs(os.path.dirname(db_path), exist_ok=True)
            
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # 報告模板表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS report_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    template_id TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    report_type TEXT NOT NULL,
                    sections_json TEXT NOT NULL,
                    default_format TEXT NOT NULL,
                    include_visualizations BOOLEAN DEFAULT 1,
                    auto_refresh_interval INTEGER,
                    recipients_json TEXT,
                    created_by INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 生成的報告表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS generated_reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    report_id TEXT UNIQUE NOT NULL,
                    template_id TEXT,
                    title TEXT NOT NULL,
                    format TEXT NOT NULL,
                    file_path TEXT,
                    file_size INTEGER,
                    generation_time_seconds REAL,
                    status TEXT DEFAULT 'completed',
                    error_message TEXT,
                    generated_by INTEGER,
                    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP
                )
            ''')
            
            # 報告調度表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS report_schedules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    schedule_id TEXT UNIQUE NOT NULL,
                    template_id TEXT NOT NULL,
                    cron_expression TEXT NOT NULL,
                    next_run_time TIMESTAMP,
                    last_run_time TIMESTAMP,
                    is_active BOOLEAN DEFAULT 1,
                    created_by INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.commit()
            logger.info("報告數據庫表初始化完成")
            
        except Exception as e:
            logger.error(f"初始化報告數據庫失敗: {str(e)}")
        finally:
            conn.close()
    
    def _init_default_templates(self):
        """初始化預定義模板"""
        self.templates = {
            'executive_summary': ReportTemplate(
                template_id='executive_summary',
                name='高管摘要報告',
                description='為高層管理人員提供的簡潔業務概覽',
                report_type=ReportType.EXECUTIVE_SUMMARY,
                sections=['key_metrics', 'performance_highlights', 'critical_alerts', 'recommendations'],
                default_format=ReportFormat.PDF,
                include_visualizations=True,
                auto_refresh_interval=60,  # 每小時
                recipients=['admin@company.com'],
                created_by=1,
                created_at=datetime.now()
            ),
            'detailed_analytics': ReportTemplate(
                template_id='detailed_analytics',
                name='詳細分析報告',
                description='包含完整數據分析和深入洞察的報告',
                report_type=ReportType.DETAILED_ANALYTICS,
                sections=['performance_metrics', 'trend_analysis', 'user_behavior', 'quality_metrics', 'business_value'],
                default_format=ReportFormat.HTML,
                include_visualizations=True,
                auto_refresh_interval=1440,  # 每日
                recipients=['analytics@company.com'],
                created_by=1,
                created_at=datetime.now()
            ),
            'performance_dashboard': ReportTemplate(
                template_id='performance_dashboard',
                name='性能儀表板',
                description='實時性能監控和系統健康狀態',
                report_type=ReportType.PERFORMANCE_DASHBOARD,
                sections=['real_time_metrics', 'system_health', 'alerts', 'resource_utilization'],
                default_format=ReportFormat.HTML,
                include_visualizations=True,
                auto_refresh_interval=15,  # 每15分鐘
                recipients=['ops@company.com'],
                created_by=1,
                created_at=datetime.now()
            )
        }
    
    async def generate_report(self, 
                            template_id: str,
                            format_type: ReportFormat = ReportFormat.HTML,
                            time_period: str = "30d",
                            custom_sections: Optional[List[str]] = None,
                            include_raw_data: bool = False) -> Dict[str, Any]:
        """生成報告"""
        try:
            start_time = datetime.now()
            report_id = f"report_{template_id}_{int(start_time.timestamp())}"
            
            # 獲取模板
            template = self.templates.get(template_id)
            if not template:
                return {
                    'success': False,
                    'error': f'未找到模板: {template_id}'
                }
            
            # 收集數據
            sections_data = await self._collect_report_data(
                template, time_period, custom_sections
            )
            
            # 生成可視化（如果需要）
            visualizations = {}
            if template.include_visualizations and VISUALIZATION_AVAILABLE:
                visualizations = await self._generate_visualizations(sections_data)
            
            # 根據格式生成報告
            if format_type == ReportFormat.HTML:
                report_content = self._generate_html_report(template, sections_data, visualizations)
                file_extension = '.html'
            elif format_type == ReportFormat.PDF and PDF_AVAILABLE:
                report_content = self._generate_pdf_report(template, sections_data, visualizations)
                file_extension = '.pdf'
            elif format_type == ReportFormat.JSON:
                report_content = self._generate_json_report(template, sections_data, visualizations)
                file_extension = '.json'
            else:
                return {
                    'success': False,
                    'error': f'不支持的報告格式: {format_type.value}'
                }
            
            # 保存報告文件
            file_path = await self._save_report_file(report_id, report_content, file_extension)
            
            # 計算生成時間
            generation_time = (datetime.now() - start_time).total_seconds()
            
            # 保存報告記錄
            await self._save_report_record(
                report_id, template_id, template.name, format_type.value,
                file_path, len(str(report_content)), generation_time
            )
            
            return {
                'success': True,
                'report_id': report_id,
                'template_id': template_id,
                'format': format_type.value,
                'file_path': file_path,
                'generation_time_seconds': round(generation_time, 2),
                'download_url': f'/api/analytics/reports/{report_id}/download',
                'metadata': {
                    'title': template.name,
                    'time_period': time_period,
                    'sections_count': len(sections_data),
                    'visualizations_count': len(visualizations),
                    'file_size': len(str(report_content))
                }
            }
            
        except Exception as e:
            logger.error(f"生成報告失敗: {str(e)}")
            return {
                'success': False,
                'error': f'生成報告失敗: {str(e)}'
            }
    
    async def _collect_report_data(self, 
                                 template: ReportTemplate,
                                 time_period: str,
                                 custom_sections: Optional[List[str]] = None) -> Dict[str, Any]:
        """收集報告數據"""
        sections = custom_sections or template.sections
        data = {}
        
        for section in sections:
            try:
                if section == 'key_metrics':
                    data[section] = await self._get_key_metrics(time_period)
                elif section == 'performance_metrics':
                    data[section] = await self._get_performance_metrics(time_period)
                elif section == 'trend_analysis':
                    data[section] = await self._get_trend_analysis(time_period)
                elif section == 'user_behavior':
                    data[section] = await self._get_user_behavior_data(time_period)
                elif section == 'quality_metrics':
                    data[section] = await self._get_quality_metrics(time_period)
                elif section == 'business_value':
                    data[section] = await self._get_business_value_data(time_period)
                elif section == 'real_time_metrics':
                    data[section] = await self._get_real_time_metrics()
                elif section == 'system_health':
                    data[section] = await self._get_system_health()
                elif section == 'alerts':
                    data[section] = await self._get_alerts()
                else:
                    data[section] = {'error': f'未知的章節類型: {section}'}
                    
            except Exception as e:
                logger.error(f"收集章節數據失敗 {section}: {str(e)}")
                data[section] = {'error': str(e)}
        
        return data
    
    async def _generate_visualizations(self, sections_data: Dict[str, Any]) -> Dict[str, Any]:
        """生成可視化圖表"""
        if not VISUALIZATION_AVAILABLE:
            return {}
        
        visualizations = {}
        
        try:
            # 設置圖表樣式
            plt.style.use('default')
            
            # 為每個章節生成相應的圖表
            for section_name, section_data in sections_data.items():
                if 'error' in section_data:
                    continue
                
                if section_name == 'performance_metrics':
                    visualizations[section_name] = self._create_performance_charts(section_data)
                elif section_name == 'trend_analysis':
                    visualizations[section_name] = self._create_trend_charts(section_data)
                elif section_name == 'user_behavior':
                    visualizations[section_name] = self._create_behavior_charts(section_data)
                elif section_name == 'key_metrics':
                    visualizations[section_name] = self._create_metrics_charts(section_data)
                    
        except Exception as e:
            logger.error(f"生成可視化失敗: {str(e)}")
        
        return visualizations
    
    def _create_performance_charts(self, data: Dict[str, Any]) -> List[str]:
        """創建性能圖表"""
        charts = []
        
        try:
            # 性能指標雷達圖
            if 'metrics' in data:
                metrics = data['metrics']
                
                fig, ax = plt.subplots(figsize=(10, 6), subplot_kw=dict(projection='polar'))
                
                categories = list(metrics.keys())[:6]  # 最多6個指標
                values = [metrics.get(cat, 0) for cat in categories]
                
                # 歸一化值到0-1範圍
                max_val = max(values) if values else 1
                normalized_values = [v/max_val for v in values]
                
                angles = [i * 2 * 3.14159 / len(categories) for i in range(len(categories))]
                angles += angles[:1]  # 閉合圖形
                normalized_values += normalized_values[:1]
                
                ax.plot(angles, normalized_values, 'o-', linewidth=2)
                ax.fill(angles, normalized_values, alpha=0.25)
                ax.set_xticks(angles[:-1])
                ax.set_xticklabels(categories)
                ax.set_ylim(0, 1)
                
                plt.title('性能指標雷達圖')
                
                # 保存圖表
                chart_path = self._save_chart(fig, 'performance_radar')
                charts.append(chart_path)
                plt.close(fig)
                
        except Exception as e:
            logger.error(f"創建性能圖表失敗: {str(e)}")
        
        return charts
    
    def _create_trend_charts(self, data: Dict[str, Any]) -> List[str]:
        """創建趨勢圖表"""
        charts = []
        
        try:
            # 模擬趨勢數據
            dates = [datetime.now() - timedelta(days=i) for i in range(30, 0, -1)]
            values = [0.8 + 0.1 * (i % 7) / 7 for i in range(30)]
            
            fig, ax = plt.subplots(figsize=(12, 6))
            
            ax.plot(dates, values, marker='o', linewidth=2, markersize=4)
            ax.set_xlabel('日期')
            ax.set_ylabel('指標值')
            ax.set_title('30天趨勢分析')
            ax.grid(True, alpha=0.3)
            
            # 格式化x軸日期
            ax.xaxis.set_major_formatter(mdates.DateFormatter('%m/%d'))
            plt.xticks(rotation=45)
            plt.tight_layout()
            
            chart_path = self._save_chart(fig, 'trend_line')
            charts.append(chart_path)
            plt.close(fig)
            
        except Exception as e:
            logger.error(f"創建趨勢圖表失敗: {str(e)}")
        
        return charts
    
    def _save_chart(self, fig, chart_name: str) -> str:
        """保存圖表"""
        try:
            chart_dir = os.path.join('data', 'charts')
            os.makedirs(chart_dir, exist_ok=True)
            
            chart_filename = f"{chart_name}_{int(datetime.now().timestamp())}.png"
            chart_path = os.path.join(chart_dir, chart_filename)
            
            fig.savefig(chart_path, dpi=300, bbox_inches='tight')
            return chart_path
            
        except Exception as e:
            logger.error(f"保存圖表失敗: {str(e)}")
            return ""
    
    def _generate_html_report(self, 
                            template: ReportTemplate,
                            sections_data: Dict[str, Any],
                            visualizations: Dict[str, Any]) -> str:
        """生成HTML報告"""
        html_template = f"""
        <!DOCTYPE html>
        <html lang="zh-TW">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{template.name}</title>
            <style>
                body {{
                    font-family: {self.style_config['font_family']};
                    line-height: 1.6;
                    color: #333;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, {self.style_config['primary_color']}, {self.style_config['secondary_color']});
                    color: white;
                    padding: 30px;
                    border-radius: 10px;
                    margin-bottom: 30px;
                }}
                .section {{
                    background: white;
                    border-radius: 8px;
                    padding: 25px;
                    margin-bottom: 25px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }}
                .metric-card {{
                    display: inline-block;
                    background: #f8f9fa;
                    padding: 20px;
                    margin: 10px;
                    border-radius: 8px;
                    border-left: 4px solid {self.style_config['accent_color']};
                }}
                .chart-container {{
                    text-align: center;
                    margin: 20px 0;
                }}
                table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                }}
                th, td {{
                    border: 1px solid #ddd;
                    padding: 12px;
                    text-align: left;
                }}
                th {{
                    background-color: {self.style_config['primary_color']};
                    color: white;
                }}
                .success {{ color: {self.style_config['success_color']}; }}
                .warning {{ color: {self.style_config['warning_color']}; }}
                .error {{ color: {self.style_config['accent_color']}; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>{template.name}</h1>
                <p>生成時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                <p>{template.description}</p>
            </div>
        """
        
        # 添加各個章節
        for section_name, section_data in sections_data.items():
            if 'error' in section_data:
                continue
                
            html_template += f"""
            <div class="section">
                <h2>{self._get_section_title(section_name)}</h2>
                {self._format_section_content(section_name, section_data)}
            </div>
            """
        
        html_template += """
            <div class="section">
                <p><em>此報告由 ImageGeneration_Script v3.0 企業分析引擎自動生成</em></p>
            </div>
        </body>
        </html>
        """
        
        return html_template
    
    def _get_section_title(self, section_name: str) -> str:
        """獲取章節標題"""
        titles = {
            'key_metrics': '關鍵指標',
            'performance_metrics': '性能指標',
            'trend_analysis': '趨勢分析',
            'user_behavior': '用戶行為',
            'quality_metrics': '質量指標',
            'business_value': '商業價值',
            'real_time_metrics': '實時指標',
            'system_health': '系統健康',
            'alerts': '系統警報'
        }
        return titles.get(section_name, section_name.replace('_', ' ').title())
    
    def _format_section_content(self, section_name: str, data: Dict[str, Any]) -> str:
        """格式化章節內容"""
        if section_name == 'key_metrics' and 'metrics' in data:
            metrics = data['metrics']
            content = ""
            for key, value in metrics.items():
                if isinstance(value, (int, float)):
                    content += f'<div class="metric-card"><strong>{key}:</strong> {value}</div>'
            return content
        
        elif section_name == 'performance_metrics':
            return self._format_performance_metrics(data)
        
        elif section_name == 'alerts' and isinstance(data, list):
            if not data:
                return '<p class="success">✅ 無系統警報</p>'
            
            content = '<ul>'
            for alert in data:
                alert_type = alert.get('type', 'info')
                css_class = 'error' if alert_type == 'error' else 'warning'
                content += f'<li class="{css_class}">⚠️ {alert.get("message", "未知警報")}</li>'
            content += '</ul>'
            return content
        
        else:
            # 默認格式化為JSON
            return f'<pre>{json.dumps(data, indent=2, ensure_ascii=False)}</pre>'
    
    def _format_performance_metrics(self, data: Dict[str, Any]) -> str:
        """格式化性能指標"""
        if 'metrics' not in data:
            return '<p>無性能數據</p>'
        
        metrics = data['metrics']
        content = '<table>'
        content += '<tr><th>指標</th><th>值</th><th>狀態</th></tr>'
        
        for key, value in metrics.items():
            status = '✅ 良好'
            if isinstance(value, float):
                if 'rate' in key and value < 0.8:
                    status = '⚠️ 需要關注'
                elif 'time' in key and value > 100:
                    status = '⚠️ 需要關注'
            
            content += f'<tr><td>{key}</td><td>{value}</td><td>{status}</td></tr>'
        
        content += '</table>'
        return content
    
    async def _save_report_file(self, report_id: str, content: str, extension: str) -> str:
        """保存報告文件"""
        try:
            reports_dir = os.path.join('data', 'reports')
            os.makedirs(reports_dir, exist_ok=True)
            
            filename = f"{report_id}{extension}"
            file_path = os.path.join(reports_dir, filename)
            
            if extension == '.json':
                with open(file_path, 'w', encoding='utf-8') as f:
                    if isinstance(content, dict):
                        json.dump(content, f, indent=2, ensure_ascii=False)
                    else:
                        f.write(content)
            else:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
            
            return file_path
            
        except Exception as e:
            logger.error(f"保存報告文件失敗: {str(e)}")
            raise
    
    async def _save_report_record(self, 
                                report_id: str,
                                template_id: str,
                                title: str,
                                format_type: str,
                                file_path: str,
                                file_size: int,
                                generation_time: float):
        """保存報告記錄"""
        try:
            db_path = os.path.join('data', 'reports.db')
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO generated_reports 
                (report_id, template_id, title, format, file_path, file_size, generation_time_seconds)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (report_id, template_id, title, format_type, file_path, file_size, generation_time))
            
            conn.commit()
            
        except Exception as e:
            logger.error(f"保存報告記錄失敗: {str(e)}")
        finally:
            conn.close()
    
    # 模擬數據獲取方法（在實際實現中會連接到真實的分析服務）
    async def _get_key_metrics(self, time_period: str) -> Dict[str, Any]:
        return {
            'metrics': {
                'total_projects': 1247,
                'success_rate': 0.91,
                'user_satisfaction': 0.84,
                'system_uptime': 99.8
            }
        }
    
    async def _get_performance_metrics(self, time_period: str) -> Dict[str, Any]:
        return {
            'metrics': {
                'average_response_time': 245,
                'cpu_utilization': 0.67,
                'memory_usage': 0.72,
                'error_rate': 0.012
            }
        }
    
    async def _get_real_time_metrics(self) -> Dict[str, Any]:
        return {
            'active_users': 89,
            'queue_length': 3,
            'processing_tasks': 12
        }
    
    async def _get_alerts(self) -> List[Dict[str, Any]]:
        return []  # 無警報

# 全局報告生成器實例
report_generator = EnterpriseReportGenerator()

def get_report_generator() -> EnterpriseReportGenerator:
    """獲取報告生成器實例"""
    return report_generator 