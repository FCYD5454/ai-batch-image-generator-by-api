#!/usr/bin/env python3
"""
系統監控腳本
監控應用健康狀態、性能指標和資源使用情況
"""

import requests
import psutil
import sqlite3
import time
import json
import smtplib
from email.mime.text import MimeText
from datetime import datetime, timedelta
from typing import Dict, List
import logging

# 配置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/monitoring.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class SystemMonitor:
    def __init__(self, config_file='config/monitoring.json'):
        self.load_config(config_file)
        self.alerts_sent = {}  # 防止重複發送警報
        
    def load_config(self, config_file):
        """載入監控配置"""
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
        except FileNotFoundError:
            # 預設配置
            self.config = {
                "app_url": "http://localhost:5000",
                "database_path": "data/image_generator.db",
                "thresholds": {
                    "cpu_percent": 80,
                    "memory_percent": 85,
                    "disk_percent": 90,
                    "response_time": 5.0
                },
                "email": {
                    "enabled": False,
                    "smtp_server": "smtp.gmail.com",
                    "smtp_port": 587,
                    "from_email": "your-app@example.com",
                    "to_emails": ["admin@example.com"],
                    "password": "your-app-password"
                },
                "check_interval": 60
            }
    
    def check_app_health(self) -> Dict:
        """檢查應用健康狀態"""
        try:
            start_time = time.time()
            response = requests.get(
                f"{self.config['app_url']}/health",
                timeout=10
            )
            response_time = time.time() - start_time
            
            return {
                "status": "healthy" if response.status_code == 200 else "unhealthy",
                "status_code": response.status_code,
                "response_time": response_time,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "response_time": None,
                "timestamp": datetime.now().isoformat()
            }
    
    def check_system_resources(self) -> Dict:
        """檢查系統資源使用情況"""
        return {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent,
            "load_average": psutil.getloadavg()[0] if hasattr(psutil, 'getloadavg') else None,
            "timestamp": datetime.now().isoformat()
        }
    
    def check_database_health(self) -> Dict:
        """檢查資料庫健康狀態"""
        try:
            conn = sqlite3.connect(self.config['database_path'])
            cursor = conn.cursor()
            
            # 檢查資料庫大小
            cursor.execute("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()")
            db_size = cursor.fetchone()[0]
            
            # 檢查表數量
            cursor.execute("SELECT count(*) FROM sqlite_master WHERE type='table'")
            table_count = cursor.fetchone()[0]
            
            # 檢查最近的生成記錄
            cursor.execute("SELECT COUNT(*) FROM generation_history WHERE created_at > datetime('now', '-1 hour')")
            recent_generations = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                "status": "healthy",
                "database_size_bytes": db_size,
                "table_count": table_count,
                "recent_generations": recent_generations,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def send_alert(self, subject: str, message: str):
        """發送警報郵件"""
        if not self.config['email']['enabled']:
            logger.warning(f"警報（未發送）: {subject}")
            return
        
        # 防止重複發送相同警報（1小時內）
        alert_key = f"{subject}:{datetime.now().hour}"
        if alert_key in self.alerts_sent:
            return
        
        try:
            msg = MimeText(message, 'plain', 'utf-8')
            msg['Subject'] = f"[圖片生成器監控] {subject}"
            msg['From'] = self.config['email']['from_email']
            msg['To'] = ', '.join(self.config['email']['to_emails'])
            
            server = smtplib.SMTP(
                self.config['email']['smtp_server'],
                self.config['email']['smtp_port']
            )
            server.starttls()
            server.login(
                self.config['email']['from_email'],
                self.config['email']['password']
            )
            
            for to_email in self.config['email']['to_emails']:
                server.send_message(msg, to_addr=to_email)
            
            server.quit()
            self.alerts_sent[alert_key] = datetime.now()
            logger.info(f"警報已發送: {subject}")
            
        except Exception as e:
            logger.error(f"發送警報失敗: {e}")
    
    def check_thresholds(self, metrics: Dict):
        """檢查是否超過閾值並發送警報"""
        thresholds = self.config['thresholds']
        
        # 檢查 CPU 使用率
        if metrics['system']['cpu_percent'] > thresholds['cpu_percent']:
            self.send_alert(
                "CPU 使用率過高",
                f"CPU 使用率達到 {metrics['system']['cpu_percent']:.1f}%，超過閾值 {thresholds['cpu_percent']}%"
            )
        
        # 檢查記憶體使用率
        if metrics['system']['memory_percent'] > thresholds['memory_percent']:
            self.send_alert(
                "記憶體使用率過高",
                f"記憶體使用率達到 {metrics['system']['memory_percent']:.1f}%，超過閾值 {thresholds['memory_percent']}%"
            )
        
        # 檢查磁碟使用率
        if metrics['system']['disk_percent'] > thresholds['disk_percent']:
            self.send_alert(
                "磁碟使用率過高",
                f"磁碟使用率達到 {metrics['system']['disk_percent']:.1f}%，超過閾值 {thresholds['disk_percent']}%"
            )
        
        # 檢查應用響應時間
        if (metrics['app']['response_time'] and 
            metrics['app']['response_time'] > thresholds['response_time']):
            self.send_alert(
                "應用響應時間過長",
                f"應用響應時間達到 {metrics['app']['response_time']:.2f}秒，超過閾值 {thresholds['response_time']}秒"
            )
        
        # 檢查應用健康狀態
        if metrics['app']['status'] != 'healthy':
            self.send_alert(
                "應用健康檢查失敗",
                f"應用狀態: {metrics['app']['status']}\n錯誤: {metrics['app'].get('error', 'Unknown')}"
            )
        
        # 檢查資料庫健康狀態
        if metrics['database']['status'] != 'healthy':
            self.send_alert(
                "資料庫健康檢查失敗",
                f"資料庫狀態: {metrics['database']['status']}\n錯誤: {metrics['database'].get('error', 'Unknown')}"
            )
    
    def save_metrics(self, metrics: Dict):
        """將監控數據保存到資料庫"""
        try:
            conn = sqlite3.connect(self.config['database_path'])
            cursor = conn.cursor()
            
            # 創建監控表（如果不存在）
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS monitoring_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    app_status TEXT,
                    app_response_time REAL,
                    cpu_percent REAL,
                    memory_percent REAL,
                    disk_percent REAL,
                    database_size INTEGER,
                    recent_generations INTEGER
                )
            ''')
            
            # 插入監控數據
            cursor.execute('''
                INSERT INTO monitoring_metrics 
                (app_status, app_response_time, cpu_percent, memory_percent, 
                 disk_percent, database_size, recent_generations)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                metrics['app']['status'],
                metrics['app']['response_time'],
                metrics['system']['cpu_percent'],
                metrics['system']['memory_percent'],
                metrics['system']['disk_percent'],
                metrics['database'].get('database_size_bytes', 0),
                metrics['database'].get('recent_generations', 0)
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"保存監控數據失敗: {e}")
    
    def run_monitoring_cycle(self):
        """執行一次完整的監控週期"""
        logger.info("開始監控週期")
        
        # 收集所有監控數據
        metrics = {
            "app": self.check_app_health(),
            "system": self.check_system_resources(),
            "database": self.check_database_health()
        }
        
        # 記錄監控結果
        logger.info(f"應用狀態: {metrics['app']['status']}")
        logger.info(f"系統資源: CPU {metrics['system']['cpu_percent']:.1f}%, "
                   f"記憶體 {metrics['system']['memory_percent']:.1f}%, "
                   f"磁碟 {metrics['system']['disk_percent']:.1f}%")
        
        # 檢查閾值並發送警報
        self.check_thresholds(metrics)
        
        # 保存監控數據
        self.save_metrics(metrics)
        
        logger.info("監控週期完成")
        return metrics
    
    def start_monitoring(self):
        """開始持續監控"""
        logger.info("開始系統監控")
        
        while True:
            try:
                self.run_monitoring_cycle()
                time.sleep(self.config['check_interval'])
            except KeyboardInterrupt:
                logger.info("監控已停止")
                break
            except Exception as e:
                logger.error(f"監控過程中發生錯誤: {e}")
                time.sleep(60)  # 錯誤後等待1分鐘再繼續

def main():
    """主函數"""
    import argparse
    
    parser = argparse.ArgumentParser(description='圖片生成器系統監控')
    parser.add_argument('--once', action='store_true', help='執行一次監控後退出')
    parser.add_argument('--config', default='config/monitoring.json', help='監控配置文件路徑')
    
    args = parser.parse_args()
    
    monitor = SystemMonitor(args.config)
    
    if args.once:
        metrics = monitor.run_monitoring_cycle()
        print(json.dumps(metrics, indent=2, ensure_ascii=False))
    else:
        monitor.start_monitoring()

if __name__ == '__main__':
    main() 