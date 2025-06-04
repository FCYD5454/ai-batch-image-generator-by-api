"""
API 金鑰管理系統
安全存儲和管理用戶的 AI 平台 API 金鑰
"""

import os
import sqlite3
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from cryptography.fernet import Fernet
import hashlib
import secrets

logger = logging.getLogger(__name__)

class APIKeyManager:
    """API 金鑰管理器"""
    
    def __init__(self, db_path="data/image_generator.db"):
        """
        初始化 API 金鑰管理器
        
        Args:
            db_path: 資料庫路徑
        """
        self.db_path = db_path
        self.encryption_key = self._get_or_create_encryption_key()
        self.cipher = Fernet(self.encryption_key)
        self.init_tables()
    
    def _get_or_create_encryption_key(self) -> bytes:
        """獲取或創建加密金鑰"""
        key_file = "data/encryption.key"
        
        # 確保目錄存在
        os.makedirs(os.path.dirname(key_file), exist_ok=True)
        
        if os.path.exists(key_file):
            with open(key_file, 'rb') as f:
                return f.read()
        else:
            # 生成新的加密金鑰
            key = Fernet.generate_key()
            with open(key_file, 'wb') as f:
                f.write(key)
            return key
    
    def init_tables(self):
        """初始化 API 金鑰相關資料表"""
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            
            # API 金鑰表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS api_keys (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    platform_name TEXT NOT NULL,
                    key_name TEXT,
                    encrypted_key TEXT NOT NULL,
                    key_hash TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_used TIMESTAMP,
                    usage_count INTEGER DEFAULT 0,
                    daily_limit INTEGER DEFAULT -1,
                    monthly_limit INTEGER DEFAULT -1,
                    metadata TEXT DEFAULT '{}',
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    UNIQUE(user_id, platform_name, key_name)
                )
            ''')
            
            # API 使用記錄表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS api_usage_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    api_key_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    platform_name TEXT NOT NULL,
                    operation TEXT NOT NULL,
                    tokens_used INTEGER DEFAULT 0,
                    cost_estimate REAL DEFAULT 0.0,
                    success BOOLEAN DEFAULT 1,
                    error_message TEXT,
                    request_data TEXT,
                    response_data TEXT,
                    ip_address TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (api_key_id) REFERENCES api_keys (id),
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            ''')
            
            # API 使用統計表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS api_usage_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    platform_name TEXT NOT NULL,
                    date DATE NOT NULL,
                    total_requests INTEGER DEFAULT 0,
                    successful_requests INTEGER DEFAULT 0,
                    failed_requests INTEGER DEFAULT 0,
                    total_tokens INTEGER DEFAULT 0,
                    total_cost REAL DEFAULT 0.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    UNIQUE(user_id, platform_name, date)
                )
            ''')
            
            conn.commit()
            logger.info("API 金鑰管理系統資料表初始化完成")
            
        except Exception as e:
            logger.error(f"初始化 API 金鑰資料表失敗: {str(e)}")
            conn.rollback()
        finally:
            conn.close()
    
    def store_api_key(self, user_id: int, platform_name: str, api_key: str, 
                     key_name: str = None, daily_limit: int = -1, 
                     monthly_limit: int = -1, metadata: Dict = None) -> Dict:
        """
        存儲 API 金鑰
        
        Args:
            user_id: 用戶ID
            platform_name: 平台名稱 (gemini, openai, stability, etc.)
            api_key: API 金鑰
            key_name: 金鑰名稱（可選）
            daily_limit: 每日使用限制
            monthly_limit: 每月使用限制
            metadata: 附加元數據
            
        Returns:
            dict: 存儲結果
        """
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            
            # 加密 API 金鑰
            encrypted_key = self.cipher.encrypt(api_key.encode()).decode()
            
            # 生成金鑰雜湊（用於驗證）
            key_hash = hashlib.sha256(api_key.encode()).hexdigest()
            
            # 如果沒有提供名稱，使用預設名稱
            if not key_name:
                key_name = f"{platform_name}_default"
            
            # 檢查是否已存在相同的金鑰
            cursor.execute('''
                SELECT id FROM api_keys 
                WHERE user_id = ? AND platform_name = ? AND key_name = ?
            ''', (user_id, platform_name, key_name))
            
            existing = cursor.fetchone()
            
            if existing:
                # 更新現有金鑰
                cursor.execute('''
                    UPDATE api_keys 
                    SET encrypted_key = ?, key_hash = ?, updated_at = CURRENT_TIMESTAMP,
                        daily_limit = ?, monthly_limit = ?, metadata = ?
                    WHERE id = ?
                ''', (encrypted_key, key_hash, daily_limit, monthly_limit, 
                      json.dumps(metadata or {}), existing[0]))
                
                api_key_id = existing[0]
                action = "updated"
            else:
                # 插入新金鑰
                cursor.execute('''
                    INSERT INTO api_keys 
                    (user_id, platform_name, key_name, encrypted_key, key_hash,
                     daily_limit, monthly_limit, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (user_id, platform_name, key_name, encrypted_key, key_hash,
                      daily_limit, monthly_limit, json.dumps(metadata or {})))
                
                api_key_id = cursor.lastrowid
                action = "created"
            
            conn.commit()
            
            return {
                'success': True,
                'api_key_id': api_key_id,
                'action': action,
                'message': f'API 金鑰已{action}'
            }
            
        except Exception as e:
            logger.error(f"存儲 API 金鑰失敗: {str(e)}")
            conn.rollback()
            return {'success': False, 'error': f'存儲 API 金鑰失敗: {str(e)}'}
        finally:
            conn.close()
    
    def get_api_key(self, user_id: int, platform_name: str, 
                   key_name: str = None) -> Optional[str]:
        """
        獲取解密的 API 金鑰
        
        Args:
            user_id: 用戶ID
            platform_name: 平台名稱
            key_name: 金鑰名稱（可選，預設為第一個活躍金鑰）
            
        Returns:
            str: 解密的 API 金鑰，如果不存在則返回 None
        """
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            
            if key_name:
                # 獲取指定名稱的金鑰
                cursor.execute('''
                    SELECT encrypted_key FROM api_keys
                    WHERE user_id = ? AND platform_name = ? AND key_name = ?
                      AND is_active = 1
                ''', (user_id, platform_name, key_name))
            else:
                # 獲取該平台的第一個活躍金鑰
                cursor.execute('''
                    SELECT encrypted_key FROM api_keys
                    WHERE user_id = ? AND platform_name = ? AND is_active = 1
                    ORDER BY created_at DESC LIMIT 1
                ''', (user_id, platform_name))
            
            result = cursor.fetchone()
            if result:
                encrypted_key = result[0]
                # 解密金鑰
                api_key = self.cipher.decrypt(encrypted_key.encode()).decode()
                return api_key
            
            return None
            
        except Exception as e:
            logger.error(f"獲取 API 金鑰失敗: {str(e)}")
            return None
        finally:
            conn.close()
    
    def list_user_api_keys(self, user_id: int) -> List[Dict]:
        """
        列出用戶的所有 API 金鑰
        
        Args:
            user_id: 用戶ID
            
        Returns:
            List[Dict]: API 金鑰列表（不包含實際金鑰內容）
        """
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, platform_name, key_name, is_active, created_at, 
                       updated_at, last_used, usage_count, daily_limit, 
                       monthly_limit, metadata
                FROM api_keys
                WHERE user_id = ?
                ORDER BY platform_name, created_at DESC
            ''', (user_id,))
            
            keys = []
            for row in cursor.fetchall():
                key_info = {
                    'id': row[0],
                    'platform_name': row[1],
                    'key_name': row[2],
                    'is_active': bool(row[3]),
                    'created_at': row[4],
                    'updated_at': row[5],
                    'last_used': row[6],
                    'usage_count': row[7],
                    'daily_limit': row[8],
                    'monthly_limit': row[9],
                    'metadata': json.loads(row[10]) if row[10] else {}
                }
                keys.append(key_info)
            
            return keys
            
        except Exception as e:
            logger.error(f"列出 API 金鑰失敗: {str(e)}")
            return []
        finally:
            conn.close()
    
    def delete_api_key(self, user_id: int, api_key_id: int) -> Dict:
        """
        刪除 API 金鑰
        
        Args:
            user_id: 用戶ID
            api_key_id: API 金鑰ID
            
        Returns:
            dict: 刪除結果
        """
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            
            # 檢查金鑰是否屬於該用戶
            cursor.execute('''
                SELECT id FROM api_keys
                WHERE id = ? AND user_id = ?
            ''', (api_key_id, user_id))
            
            if not cursor.fetchone():
                return {'success': False, 'error': 'API 金鑰不存在或無權限'}
            
            # 刪除金鑰
            cursor.execute('DELETE FROM api_keys WHERE id = ?', (api_key_id,))
            
            # 刪除相關使用記錄
            cursor.execute('DELETE FROM api_usage_logs WHERE api_key_id = ?', (api_key_id,))
            
            conn.commit()
            
            return {'success': True, 'message': 'API 金鑰已刪除'}
            
        except Exception as e:
            logger.error(f"刪除 API 金鑰失敗: {str(e)}")
            conn.rollback()
            return {'success': False, 'error': f'刪除 API 金鑰失敗: {str(e)}'}
        finally:
            conn.close()
    
    def log_api_usage(self, user_id: int, platform_name: str, operation: str,
                     tokens_used: int = 0, cost_estimate: float = 0.0,
                     success: bool = True, error_message: str = None,
                     request_data: Dict = None, response_data: Dict = None,
                     ip_address: str = None) -> None:
        """
        記錄 API 使用情況
        
        Args:
            user_id: 用戶ID
            platform_name: 平台名稱
            operation: 操作類型
            tokens_used: 使用的令牌數
            cost_estimate: 預估成本
            success: 是否成功
            error_message: 錯誤訊息
            request_data: 請求數據
            response_data: 回應數據
            ip_address: IP地址
        """
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            
            # 獲取 API 金鑰ID
            cursor.execute('''
                SELECT id FROM api_keys
                WHERE user_id = ? AND platform_name = ? AND is_active = 1
                ORDER BY last_used DESC LIMIT 1
            ''', (user_id, platform_name))
            
            result = cursor.fetchone()
            api_key_id = result[0] if result else None
            
            # 插入使用記錄
            cursor.execute('''
                INSERT INTO api_usage_logs
                (api_key_id, user_id, platform_name, operation, tokens_used,
                 cost_estimate, success, error_message, request_data, 
                 response_data, ip_address)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (api_key_id, user_id, platform_name, operation, tokens_used,
                  cost_estimate, success, error_message,
                  json.dumps(request_data) if request_data else None,
                  json.dumps(response_data) if response_data else None,
                  ip_address))
            
            # 更新 API 金鑰使用統計
            if api_key_id:
                cursor.execute('''
                    UPDATE api_keys 
                    SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (api_key_id,))
            
            # 更新每日統計
            today = datetime.now().date()
            cursor.execute('''
                INSERT OR REPLACE INTO api_usage_stats
                (user_id, platform_name, date, total_requests, successful_requests,
                 failed_requests, total_tokens, total_cost)
                VALUES (?, ?, ?, 
                    COALESCE((SELECT total_requests FROM api_usage_stats 
                             WHERE user_id = ? AND platform_name = ? AND date = ?), 0) + 1,
                    COALESCE((SELECT successful_requests FROM api_usage_stats 
                             WHERE user_id = ? AND platform_name = ? AND date = ?), 0) + ?,
                    COALESCE((SELECT failed_requests FROM api_usage_stats 
                             WHERE user_id = ? AND platform_name = ? AND date = ?), 0) + ?,
                    COALESCE((SELECT total_tokens FROM api_usage_stats 
                             WHERE user_id = ? AND platform_name = ? AND date = ?), 0) + ?,
                    COALESCE((SELECT total_cost FROM api_usage_stats 
                             WHERE user_id = ? AND platform_name = ? AND date = ?), 0) + ?)
            ''', (user_id, platform_name, today,
                  user_id, platform_name, today,
                  user_id, platform_name, today, 1 if success else 0,
                  user_id, platform_name, today, 0 if success else 1,
                  user_id, platform_name, today, tokens_used,
                  user_id, platform_name, today, cost_estimate))
            
            conn.commit()
            
        except Exception as e:
            logger.error(f"記錄 API 使用失敗: {str(e)}")
            conn.rollback()
        finally:
            conn.close()
    
    def get_usage_statistics(self, user_id: int, platform_name: str = None,
                           days: int = 30) -> Dict:
        """
        獲取 API 使用統計
        
        Args:
            user_id: 用戶ID
            platform_name: 平台名稱（可選）
            days: 統計天數
            
        Returns:
            dict: 使用統計
        """
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            
            # 計算日期範圍
            start_date = (datetime.now() - timedelta(days=days)).date()
            
            # 基本統計查詢
            if platform_name:
                where_clause = "WHERE user_id = ? AND platform_name = ? AND date >= ?"
                params = [user_id, platform_name, start_date]
            else:
                where_clause = "WHERE user_id = ? AND date >= ?"
                params = [user_id, start_date]
            
            # 獲取總體統計
            cursor.execute(f'''
                SELECT 
                    SUM(total_requests) as total_requests,
                    SUM(successful_requests) as successful_requests,
                    SUM(failed_requests) as failed_requests,
                    SUM(total_tokens) as total_tokens,
                    SUM(total_cost) as total_cost
                FROM api_usage_stats
                {where_clause}
            ''', params)
            
            overall_stats = cursor.fetchone()
            
            # 獲取每日統計
            cursor.execute(f'''
                SELECT date, platform_name, total_requests, successful_requests,
                       failed_requests, total_tokens, total_cost
                FROM api_usage_stats
                {where_clause}
                ORDER BY date DESC
            ''', params)
            
            daily_stats = [dict(zip([col[0] for col in cursor.description], row)) 
                          for row in cursor.fetchall()]
            
            # 獲取平台統計
            if not platform_name:
                cursor.execute('''
                    SELECT platform_name,
                           SUM(total_requests) as total_requests,
                           SUM(successful_requests) as successful_requests,
                           SUM(failed_requests) as failed_requests,
                           SUM(total_tokens) as total_tokens,
                           SUM(total_cost) as total_cost
                    FROM api_usage_stats
                    WHERE user_id = ? AND date >= ?
                    GROUP BY platform_name
                    ORDER BY total_requests DESC
                ''', [user_id, start_date])
                
                platform_stats = [dict(zip([col[0] for col in cursor.description], row)) 
                                 for row in cursor.fetchall()]
            else:
                platform_stats = []
            
            return {
                'success': True,
                'overall': {
                    'total_requests': overall_stats[0] or 0,
                    'successful_requests': overall_stats[1] or 0,
                    'failed_requests': overall_stats[2] or 0,
                    'total_tokens': overall_stats[3] or 0,
                    'total_cost': round(overall_stats[4] or 0, 4),
                    'success_rate': round((overall_stats[1] or 0) / max(overall_stats[0] or 1, 1) * 100, 2)
                },
                'daily_stats': daily_stats,
                'platform_stats': platform_stats,
                'period': {
                    'start_date': str(start_date),
                    'end_date': str(datetime.now().date()),
                    'days': days
                }
            }
            
        except Exception as e:
            logger.error(f"獲取使用統計失敗: {str(e)}")
            return {'success': False, 'error': f'獲取使用統計失敗: {str(e)}'}
        finally:
            conn.close()

# 全局 API 金鑰管理器實例
api_key_manager = APIKeyManager() 