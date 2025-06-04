"""
性能監控服務
提供 API 響應時間、資源使用情況等監控功能
"""

import time
import psutil
import logging
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass
from functools import wraps

logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetric:
    """性能指標數據結構"""
    timestamp: datetime
    metric_name: str
    value: float
    unit: str
    tags: Dict[str, str] = None

class PerformanceMonitor:
    """性能監控類"""
    
    def __init__(self):
        """初始化性能監控器"""
        self.metrics: List[PerformanceMetric] = []
        self.start_time = time.time()
        
    def track_api_response_time(self, endpoint: str):
        """API 響應時間追蹤裝飾器"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                try:
                    result = func(*args, **kwargs)
                    end_time = time.time()
                    response_time = (end_time - start_time) * 1000  # 轉換為毫秒
                    
                    # 記錄性能指標
                    metric = PerformanceMetric(
                        timestamp=datetime.now(),
                        metric_name="api_response_time",
                        value=response_time,
                        unit="ms",
                        tags={"endpoint": endpoint, "status": "success"}
                    )
                    self.add_metric(metric)
                    
                    logger.info(f"API {endpoint} 響應時間: {response_time:.2f}ms")
                    return result
                    
                except Exception as e:
                    end_time = time.time()
                    response_time = (end_time - start_time) * 1000
                    
                    # 記錄錯誤指標
                    metric = PerformanceMetric(
                        timestamp=datetime.now(),
                        metric_name="api_response_time",
                        value=response_time,
                        unit="ms",
                        tags={"endpoint": endpoint, "status": "error"}
                    )
                    self.add_metric(metric)
                    
                    logger.error(f"API {endpoint} 執行錯誤: {str(e)}, 響應時間: {response_time:.2f}ms")
                    raise
                    
            return wrapper
        return decorator
    
    def log_resource_usage(self) -> Dict[str, float]:
        """記錄系統資源使用情況"""
        try:
            # CPU 使用率
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # 內存使用情況
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_used_mb = memory.used / 1024 / 1024
            
            # 磁盤使用情況
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            
            # 記錄指標
            metrics_data = {
                'cpu_percent': cpu_percent,
                'memory_percent': memory_percent,
                'memory_used_mb': memory_used_mb,
                'disk_percent': disk_percent
            }
            
            for metric_name, value in metrics_data.items():
                metric = PerformanceMetric(
                    timestamp=datetime.now(),
                    metric_name=metric_name,
                    value=value,
                    unit="percent" if "percent" in metric_name else "MB",
                    tags={"component": "system"}
                )
                self.add_metric(metric)
            
            logger.info(f"系統資源使用: CPU={cpu_percent}%, 內存={memory_percent}%, 磁盤={disk_percent:.1f}%")
            return metrics_data
            
        except Exception as e:
            logger.error(f"記錄系統資源使用失敗: {str(e)}")
            return {}
    
    def add_metric(self, metric: PerformanceMetric):
        """添加性能指標"""
        self.metrics.append(metric)
        
        # 保持最近 1000 條記錄
        if len(self.metrics) > 1000:
            self.metrics = self.metrics[-1000:]
    
    def get_metrics_summary(self, metric_name: str = None, 
                          hours: int = 24) -> Dict:
        """獲取性能指標摘要"""
        try:
            current_time = datetime.now()
            cutoff_time = current_time.timestamp() - (hours * 3600)
            
            # 過濾指標
            filtered_metrics = [
                m for m in self.metrics 
                if m.timestamp.timestamp() > cutoff_time and
                (metric_name is None or m.metric_name == metric_name)
            ]
            
            if not filtered_metrics:
                return {"message": "沒有找到相關指標數據"}
            
            # 計算統計信息
            values = [m.value for m in filtered_metrics]
            
            summary = {
                "metric_name": metric_name or "all",
                "time_range_hours": hours,
                "total_count": len(filtered_metrics),
                "average": sum(values) / len(values),
                "min": min(values),
                "max": max(values),
                "latest": values[-1] if values else 0,
                "unit": filtered_metrics[0].unit if filtered_metrics else ""
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"獲取指標摘要失敗: {str(e)}")
            return {"error": str(e)}
    
    def get_system_health(self) -> Dict:
        """獲取系統健康狀態"""
        try:
            # 獲取當前資源使用情況
            resource_usage = self.log_resource_usage()
            
            # 獲取運行時間
            uptime_seconds = time.time() - self.start_time
            uptime_hours = uptime_seconds / 3600
            
            # 獲取最近的響應時間指標
            response_time_summary = self.get_metrics_summary("api_response_time", 1)
            
            # 判斷健康狀態
            health_status = "healthy"
            issues = []
            
            if resource_usage.get('cpu_percent', 0) > 90:
                health_status = "warning"
                issues.append("CPU 使用率過高")
            
            if resource_usage.get('memory_percent', 0) > 90:
                health_status = "warning" 
                issues.append("內存使用率過高")
            
            if response_time_summary.get('average', 0) > 5000:  # 5秒
                health_status = "warning"
                issues.append("API 響應時間過長")
            
            return {
                "status": health_status,
                "uptime_hours": round(uptime_hours, 2),
                "resource_usage": resource_usage,
                "response_time_avg_ms": response_time_summary.get('average', 0),
                "issues": issues,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"獲取系統健康狀態失敗: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

# 創建全局監控實例
performance_monitor = PerformanceMonitor() 