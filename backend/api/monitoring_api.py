"""
監控 API 端點
提供系統性能監控和健康檢查的 REST API
"""

from flask import Blueprint, jsonify, request
import logging
from datetime import datetime

# 導入監控服務
from services.monitoring import performance_monitor

logger = logging.getLogger(__name__)

# 創建藍圖
monitoring_bp = Blueprint('monitoring', __name__)

@monitoring_bp.route('/health-advanced', methods=['GET'])
def advanced_health_check():
    """進階健康檢查端點"""
    try:
        health_data = performance_monitor.get_system_health()
        
        # 根據健康狀態返回適當的HTTP狀態碼
        if health_data['status'] == 'healthy':
            status_code = 200
        elif health_data['status'] == 'warning':
            status_code = 200  # 警告仍然返回200，但會在響應中標記
        else:
            status_code = 503  # 服務不可用
        
        return jsonify({
            'success': True,
            'health': health_data,
            'timestamp': datetime.now().isoformat(),
            'version': '3.0-enhanced'
        }), status_code
        
    except Exception as e:
        logger.error(f"進階健康檢查失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'status': 'error',
            'timestamp': datetime.now().isoformat()
        }), 500

@monitoring_bp.route('/metrics', methods=['GET'])
def get_metrics():
    """獲取性能指標"""
    try:
        metric_name = request.args.get('metric', None)
        hours = int(request.args.get('hours', 24))
        
        if metric_name:
            summary = performance_monitor.get_metrics_summary(metric_name, hours)
        else:
            # 獲取所有主要指標的摘要
            api_summary = performance_monitor.get_metrics_summary('api_response_time', hours)
            cpu_summary = performance_monitor.get_metrics_summary('cpu_percent', hours)
            memory_summary = performance_monitor.get_metrics_summary('memory_percent', hours)
            
            summary = {
                'api_response_time': api_summary,
                'cpu_usage': cpu_summary,
                'memory_usage': memory_summary
            }
        
        return jsonify({
            'success': True,
            'metrics': summary,
            'query_params': {
                'metric_name': metric_name,
                'hours': hours
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"獲取性能指標失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@monitoring_bp.route('/resource-usage', methods=['GET'])
def get_current_resource_usage():
    """獲取當前資源使用情況"""
    try:
        resource_data = performance_monitor.log_resource_usage()
        
        return jsonify({
            'success': True,
            'resource_usage': resource_data,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"獲取資源使用情況失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@monitoring_bp.route('/performance-summary', methods=['GET'])
def get_performance_summary():
    """獲取性能總結報告"""
    try:
        # 獲取系統健康狀態
        health = performance_monitor.get_system_health()
        
        # 獲取關鍵指標
        api_metrics = performance_monitor.get_metrics_summary('api_response_time', 24)
        system_metrics = {
            'cpu': performance_monitor.get_metrics_summary('cpu_percent', 24),
            'memory': performance_monitor.get_metrics_summary('memory_percent', 24)
        }
        
        # 生成性能評分
        performance_score = calculate_performance_score(health, api_metrics, system_metrics)
        
        return jsonify({
            'success': True,
            'summary': {
                'health_status': health['status'],
                'performance_score': performance_score,
                'uptime_hours': health['uptime_hours'],
                'api_performance': api_metrics,
                'system_performance': system_metrics,
                'recommendations': generate_recommendations(health, api_metrics, system_metrics)
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"獲取性能總結失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

def calculate_performance_score(health, api_metrics, system_metrics):
    """計算性能評分 (0-100)"""
    try:
        score = 100
        
        # API 響應時間評分 (30%)
        avg_response_time = api_metrics.get('average', 0)
        if avg_response_time > 5000:  # 5秒
            score -= 30
        elif avg_response_time > 2000:  # 2秒
            score -= 20
        elif avg_response_time > 1000:  # 1秒
            score -= 10
        
        # CPU 使用率評分 (25%)
        cpu_usage = system_metrics['cpu'].get('average', 0)
        if cpu_usage > 90:
            score -= 25
        elif cpu_usage > 70:
            score -= 15
        elif cpu_usage > 50:
            score -= 5
        
        # 內存使用率評分 (25%)
        memory_usage = system_metrics['memory'].get('average', 0)
        if memory_usage > 90:
            score -= 25
        elif memory_usage > 70:
            score -= 15
        elif memory_usage > 50:
            score -= 5
        
        # 系統穩定性評分 (20%)
        if health['status'] == 'error':
            score -= 20
        elif health['status'] == 'warning':
            score -= 10
        
        return max(0, score)  # 確保分數不為負
        
    except Exception:
        return 50  # 默認分數

def generate_recommendations(health, api_metrics, system_metrics):
    """生成性能優化建議"""
    recommendations = []
    
    try:
        # API 性能建議
        avg_response_time = api_metrics.get('average', 0)
        if avg_response_time > 2000:
            recommendations.append("考慮優化 API 響應時間，建議添加緩存或優化數據庫查詢")
        
        # CPU 使用建議
        cpu_usage = system_metrics['cpu'].get('average', 0)
        if cpu_usage > 80:
            recommendations.append("CPU 使用率較高，建議檢查是否有資源密集型操作")
        
        # 內存使用建議
        memory_usage = system_metrics['memory'].get('average', 0)
        if memory_usage > 80:
            recommendations.append("內存使用率較高，建議檢查是否有內存洩漏或優化內存使用")
        
        # 系統健康建議
        if health['status'] == 'warning':
            recommendations.extend(health.get('issues', []))
        
        if not recommendations:
            recommendations.append("系統運行良好，繼續保持當前配置")
        
        return recommendations
        
    except Exception:
        return ["無法生成建議，請檢查監控數據"] 