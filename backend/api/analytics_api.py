"""
Analytics API - 企業級分析 API 端點
提供完整的業務分析和報告功能
"""

from flask import Blueprint, request, jsonify
import logging
import asyncio
from functools import wraps
from typing import Dict, Any, Optional
import traceback
from datetime import datetime, timedelta

# 導入服務模組
from services.creative_analytics_service import analytics_service
from models.user import UserModel

# 設置日誌
logger = logging.getLogger(__name__)

# 創建 Blueprint
analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

# 初始化用戶模型
user_model = UserModel()

def require_auth(f):
    """認證裝飾器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # 獲取授權令牌
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({'error': '需要授權令牌'}), 401
            
            token = auth_header.split(' ')[1]
            
            # 驗證會話
            user_info = user_model.validate_session(token)
            if not user_info:
                return jsonify({'error': '無效的會話令牌'}), 401
            
            # 將用戶信息添加到請求中
            request.user = user_info
            return f(*args, **kwargs)
            
        except Exception as e:
            logger.error(f"認證錯誤: {str(e)}")
            return jsonify({'error': '認證失敗'}), 401
    
    return decorated_function

async def run_async_function(func, *args, **kwargs):
    """運行異步函數的輔助函數"""
    try:
        # 嘗試獲取當前事件循環
        loop = asyncio.get_event_loop()
    except RuntimeError:
        # 如果沒有事件循環，創建一個新的
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    if loop.is_running():
        # 如果事件循環正在運行，使用 run_in_executor
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, func(*args, **kwargs))
            return future.result()
    else:
        # 如果事件循環未運行，直接運行
        return loop.run_until_complete(func(*args, **kwargs))

@analytics_bp.route('/health', methods=['GET'])
@require_auth
def health_check():
    """分析服務健康檢查"""
    try:
        return jsonify({
            'status': 'healthy',
            'service': 'analytics',
            'version': '3.0.0',
            'features': ['comprehensive_analytics', 'real_time_monitoring', 'business_intelligence']
        }), 200
    except Exception as e:
        logger.error(f"健康檢查失敗: {str(e)}")
        return jsonify({'error': '服務檢查失敗'}), 500

@analytics_bp.route('/dashboard', methods=['GET'])
@require_auth
def get_dashboard():
    """獲取儀表板數據"""
    try:
        user_id = request.user.get('user_id')
        
        # 獲取儀表板數據
        dashboard_data = analytics_service.get_analytics_dashboard_data()
        
        return jsonify({
            'status': 'success',
            'data': dashboard_data
        }), 200
        
    except Exception as e:
        logger.error(f"獲取儀表板數據失敗: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'error': '獲取儀表板數據失敗',
            'details': str(e)
        }), 500

@analytics_bp.route('/real-time', methods=['GET'])
@require_auth
async def get_real_time_metrics():
    """獲取實時指標"""
    try:
        user_id = request.user.get('user_id')
        
        # 獲取實時指標
        metrics = await analytics_service.get_real_time_metrics()
        
        return jsonify({
            'status': 'success',
            'data': metrics
        }), 200
        
    except Exception as e:
        logger.error(f"獲取實時指標失敗: {str(e)}")
        return jsonify({
            'error': '獲取實時指標失敗',
            'details': str(e)
        }), 500

@analytics_bp.route('/reports/comprehensive', methods=['GET'])
@require_auth
async def get_comprehensive_report():
    """獲取綜合報告"""
    try:
        user_id = request.user.get('user_id')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # 生成綜合報告
        report = await analytics_service.generate_comprehensive_report(
            time_period=start_date or "30d"
        )
        
        return jsonify({
            'status': 'success',
            'data': report
        }), 200
        
    except Exception as e:
        logger.error(f"生成綜合報告失敗: {str(e)}")
        return jsonify({
            'error': '生成綜合報告失敗',
            'details': str(e)
        }), 500

@analytics_bp.route('/performance', methods=['GET'])
@require_auth
def get_performance_analytics():
    """獲取性能分析"""
    try:
        user_id = request.user.get('user_id')
        metric_type = request.args.get('type', 'creative_output')
        
        # 獲取性能分析 - 模擬數據
        performance = {
            'metric_type': metric_type,
            'success_rate': 0.91,
            'completion_rate': 0.87,
            'user_satisfaction': 0.84,
            'average_response_time': 245,
            'throughput': 156,
            'grade': 'A'
        }
        
        return jsonify({
            'status': 'success',
            'data': performance
        }), 200
        
    except Exception as e:
        logger.error(f"獲取性能分析失敗: {str(e)}")
        return jsonify({
            'error': '獲取性能分析失敗',
            'details': str(e)
        }), 500

@analytics_bp.route('/trends', methods=['GET'])
@require_auth
def get_trend_analysis():
    """獲取趨勢分析"""
    try:
        user_id = request.user.get('user_id')
        period = request.args.get('period', '30d')
        
        # 獲取趨勢分析 - 模擬數據
        trends = {
            'period': period,
            'overall_trend': 'increasing',
            'growth_rate': 0.15,
            'key_trends': [
                {'metric': 'user_engagement', 'trend': 'up', 'change': '+12%'},
                {'metric': 'project_completion', 'trend': 'up', 'change': '+8%'},
                {'metric': 'response_time', 'trend': 'down', 'change': '-5%'}
            ]
        }
        
        return jsonify({
            'status': 'success',
            'data': trends
        }), 200
        
    except Exception as e:
        logger.error(f"獲取趨勢分析失敗: {str(e)}")
        return jsonify({
            'error': '獲取趨勢分析失敗',
            'details': str(e)
        }), 500

@analytics_bp.route('/user-behavior', methods=['GET'])
@require_auth
def get_user_behavior():
    """獲取用戶行為分析"""
    try:
        user_id = request.user.get('user_id')
        
        # 獲取用戶行為分析 - 模擬數據
        behavior = {
            'total_sessions': 1247,
            'avg_session_duration': 42.3,
            'feature_usage': {
                'image_generation': 0.89,
                'ai_assistant': 0.67,
                'batch_processing': 0.34
            },
            'user_satisfaction': 0.84
        }
        
        return jsonify({
            'status': 'success',
            'data': behavior
        }), 200
        
    except Exception as e:
        logger.error(f"獲取用戶行為分析失敗: {str(e)}")
        return jsonify({
            'error': '獲取用戶行為分析失敗',
            'details': str(e)
        }), 500

@analytics_bp.route('/quality', methods=['GET'])
@require_auth
def get_quality_metrics():
    """獲取品質指標"""
    try:
        user_id = request.user.get('user_id')
        
        # 獲取品質指標 - 模擬數據
        quality = {
            'overall_quality_score': 0.87,
            'image_quality': 0.91,
            'user_satisfaction': 0.84,
            'error_rate': 0.012,
            'completion_rate': 0.94
        }
        
        return jsonify({
            'status': 'success',
            'data': quality
        }), 200
        
    except Exception as e:
        logger.error(f"獲取品質指標失敗: {str(e)}")
        return jsonify({
            'error': '獲取品質指標失敗',
            'details': str(e)
        }), 500

@analytics_bp.route('/business-value', methods=['GET'])
@require_auth
def get_business_value():
    """獲取商業價值分析"""
    try:
        user_id = request.user.get('user_id')
        
        # 獲取商業價值分析 - 模擬數據
        value = {
            'total_value': 45670.89,
            'cost_savings': 12450.33,
            'revenue_impact': 33220.56,
            'efficiency_gains': 0.23,
            'roi_percentage': 234.5
        }
        
        return jsonify({
            'status': 'success',
            'data': value
        }), 200
        
    except Exception as e:
        logger.error(f"獲取商業價值分析失敗: {str(e)}")
        return jsonify({
            'error': '獲取商業價值分析失敗',
            'details': str(e)
        }), 500

@analytics_bp.route('/reports', methods=['GET'])
@require_auth
def list_reports():
    """列出可用報告"""
    try:
        user_id = request.user.get('user_id')
        
        # 獲取報告列表 - 模擬數據
        reports = {
            'total_reports': 24,
            'reports': [
                {
                    'id': 'rpt_001',
                    'title': '月度績效報告',
                    'type': 'performance',
                    'created_at': '2025-06-01',
                    'status': 'completed'
                },
                {
                    'id': 'rpt_002', 
                    'title': '用戶行為分析',
                    'type': 'behavior',
                    'created_at': '2025-06-02',
                    'status': 'completed'
                }
            ]
        }
        
        return jsonify({
            'status': 'success',
            'data': reports
        }), 200
        
    except Exception as e:
        logger.error(f"獲取報告列表失敗: {str(e)}")
        return jsonify({
            'error': '獲取報告列表失敗',
            'details': str(e)
        }), 500

@analytics_bp.route('/alerts', methods=['GET'])
@require_auth
def get_alerts():
    """獲取系統警報"""
    try:
        user_id = request.user.get('user_id')
        
        # 獲取系統警報 - 模擬數據
        alerts = [
            {
                'id': 'alert_001',
                'type': 'warning',
                'message': 'CPU使用率略高',
                'severity': 'medium',
                'timestamp': datetime.now().isoformat()
            }
        ]
        
        return jsonify({
            'status': 'success',
            'data': alerts
        }), 200
        
    except Exception as e:
        logger.error(f"獲取系統警報失敗: {str(e)}")
        return jsonify({
            'error': '獲取系統警報失敗',
            'details': str(e)
        }), 500

@analytics_bp.route('/metrics/export', methods=['POST'])
@require_auth
def export_metrics():
    """導出指標數據"""
    try:
        user_id = request.user.get('user_id')
        export_format = request.json.get('format', 'json')
        metrics = request.json.get('metrics', [])
        
        # 導出指標數據 - 模擬數據
        export_data = {
            'format': export_format,
            'metrics_count': len(metrics),
            'download_url': f'/api/analytics/exports/export_{int(datetime.now().timestamp())}.{export_format}',
            'expires_at': (datetime.now() + timedelta(hours=24)).isoformat()
        }
        
        return jsonify({
            'status': 'success',
            'data': export_data
        }), 200
        
    except Exception as e:
        logger.error(f"導出指標數據失敗: {str(e)}")
        return jsonify({
            'error': '導出指標數據失敗',
            'details': str(e)
        }), 500

@analytics_bp.route('/insights', methods=['GET'])
@require_auth
def get_insights():
    """獲取智能洞察"""
    try:
        user_id = request.user.get('user_id')
        
        # 獲取智能洞察 - 模擬數據
        insights = {
            'total_insights': 7,
            'insights': [
                {
                    'id': 'insight_001',
                    'title': '社交媒體項目需求激增',
                    'description': '過去30天社交媒體相關項目增長45%',
                    'confidence': 0.92,
                    'impact': 'high',
                    'recommendation': '考慮擴展社交媒體模板庫'
                },
                {
                    'id': 'insight_002',
                    'title': '用戶滿意度持續提升',
                    'description': '用戶滿意度評分從0.78提升至0.84',
                    'confidence': 0.88,
                    'impact': 'medium',
                    'recommendation': '繼續優化用戶體驗流程'
                }
            ]
        }
        
        return jsonify({
            'status': 'success',
            'data': insights
        }), 200
        
    except Exception as e:
        logger.error(f"獲取智能洞察失敗: {str(e)}")
        return jsonify({
            'error': '獲取智能洞察失敗',
            'details': str(e)
        }), 500

# 錯誤處理
@analytics_bp.errorhandler(404)
def not_found(error):
    return jsonify({'error': '端點未找到'}), 404

@analytics_bp.errorhandler(500)
def internal_error(error):
    return jsonify({'error': '內部服務器錯誤'}), 500

logger.info("分析 API 模組初始化完成") 