"""
用戶模型 - 企業級用戶系統
支援用戶註冊、認證、團隊管理和權限控制
"""

from datetime import datetime
import hashlib
import uuid
import json
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import logging

logger = logging.getLogger(__name__)

class UserModel:
    """用戶模型類"""
    
    def __init__(self, db_path="data/image_generator.db"):
        """
        初始化用戶模型
        
        Args:
            db_path: 資料庫路徑
        """
        self.db_path = db_path
        self.init_tables()
    
    def init_tables(self):
        """初始化用戶相關資料表"""
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            
            # 用戶表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uuid TEXT UNIQUE NOT NULL,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    first_name TEXT,
                    last_name TEXT,
                    avatar_url TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    is_verified BOOLEAN DEFAULT 0,
                    role TEXT DEFAULT 'user',
                    preferences TEXT DEFAULT '{}',
                    api_quota INTEGER DEFAULT 1000,
                    used_quota INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP,
                    verification_token TEXT,
                    reset_token TEXT,
                    reset_token_expires TIMESTAMP
                )
            ''')
            
            # 團隊表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS teams (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uuid TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    owner_id INTEGER NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    settings TEXT DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (owner_id) REFERENCES users (id)
                )
            ''')
            
            # 團隊成員表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS team_members (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    team_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    role TEXT DEFAULT 'member',
                    permissions TEXT DEFAULT '{}',
                    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT 1,
                    FOREIGN KEY (team_id) REFERENCES teams (id),
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    UNIQUE(team_id, user_id)
                )
            ''')
            
            # 用戶會話表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    session_token TEXT UNIQUE NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    ip_address TEXT,
                    user_agent TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            ''')
            
            # 用戶活動日誌表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_activities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    action TEXT NOT NULL,
                    details TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            ''')
            
            conn.commit()
            logger.info("用戶系統資料表初始化完成")
            
        except Exception as e:
            logger.error(f"初始化用戶資料表失敗: {str(e)}")
            conn.rollback()
        finally:
            conn.close()
    
    def create_user(self, username, email, password, first_name=None, last_name=None):
        """
        創建新用戶
        
        Args:
            username: 用戶名
            email: 電子郵件
            password: 密碼
            first_name: 名字（可選）
            last_name: 姓氏（可選）
            
        Returns:
            dict: 創建結果
        """
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            
            # 檢查用戶名和郵件是否已存在
            cursor.execute('SELECT id FROM users WHERE username = ? OR email = ?', 
                         (username, email))
            if cursor.fetchone():
                return {'success': False, 'error': '用戶名或郵件已存在'}
            
            # 生成密碼雜湊和用戶UUID
            password_hash = generate_password_hash(password)
            user_uuid = str(uuid.uuid4())
            verification_token = str(uuid.uuid4())
            
            # 插入用戶記錄
            cursor.execute('''
                INSERT INTO users (
                    uuid, username, email, password_hash, first_name, last_name,
                    verification_token
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (user_uuid, username, email, password_hash, first_name, 
                  last_name, verification_token))
            
            user_id = cursor.lastrowid
            conn.commit()
            
            return {
                'success': True,
                'user_id': user_id,
                'user_uuid': user_uuid,
                'verification_token': verification_token,
                'message': '用戶創建成功'
            }
            
        except Exception as e:
            logger.error(f"創建用戶失敗: {str(e)}")
            conn.rollback()
            return {'success': False, 'error': f'創建用戶失敗: {str(e)}'}
        finally:
            conn.close()
    
    def authenticate_user(self, username_or_email, password):
        """
        用戶認證
        
        Args:
            username_or_email: 用戶名或郵件
            password: 密碼
            
        Returns:
            dict: 認證結果
        """
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            
            # 查找用戶
            cursor.execute('''
                SELECT id, uuid, username, email, password_hash, is_active, is_verified,
                       role, first_name, last_name, preferences
                FROM users 
                WHERE (username = ? OR email = ?) AND is_active = 1
            ''', (username_or_email, username_or_email))
            
            user = cursor.fetchone()
            if not user:
                return {'success': False, 'error': '用戶不存在或已被停用'}
            
            # 驗證密碼
            if not check_password_hash(user[4], password):
                return {'success': False, 'error': '密碼錯誤'}
            
            # 更新最後登入時間
            cursor.execute(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                (user[0],)
            )
            conn.commit()
            
            # 解析偏好設置
            preferences = {}
            try:
                if user[10]:
                    preferences = json.loads(user[10])
            except:
                preferences = {}
            
            return {
                'success': True,
                'user': {
                    'id': user[0],
                    'uuid': user[1],
                    'username': user[2],
                    'email': user[3],
                    'is_verified': bool(user[5]),
                    'role': user[6],
                    'first_name': user[7],
                    'last_name': user[8],
                    'preferences': preferences
                }
            }
            
        except Exception as e:
            logger.error(f"用戶認證失敗: {str(e)}")
            return {'success': False, 'error': f'認證失敗: {str(e)}'}
        finally:
            conn.close()
    
    def create_session(self, user_id, ip_address=None, user_agent=None, expires_hours=24):
        """
        創建用戶會話
        
        Args:
            user_id: 用戶ID
            ip_address: IP地址
            user_agent: 用戶代理
            expires_hours: 過期小時數
            
        Returns:
            dict: 會話創建結果
        """
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            
            # 生成會話令牌
            session_token = str(uuid.uuid4())
            
            # 計算過期時間
            import datetime
            expires_at = datetime.datetime.now() + datetime.timedelta(hours=expires_hours)
            
            # 插入會話記錄
            cursor.execute('''
                INSERT INTO user_sessions (
                    user_id, session_token, expires_at, ip_address, user_agent
                ) VALUES (?, ?, ?, ?, ?)
            ''', (user_id, session_token, expires_at, ip_address, user_agent))
            
            conn.commit()
            
            return {
                'success': True,
                'session_token': session_token,
                'expires_at': expires_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"創建會話失敗: {str(e)}")
            return {'success': False, 'error': f'創建會話失敗: {str(e)}'}
        finally:
            conn.close()
    
    def validate_session(self, session_token):
        """
        驗證用戶會話
        
        Args:
            session_token: 會話令牌
            
        Returns:
            dict: 驗證結果
        """
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            
            # 查找有效會話
            cursor.execute('''
                SELECT s.user_id, s.expires_at, u.uuid, u.username, u.email, 
                       u.role, u.is_active, u.is_verified
                FROM user_sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.session_token = ? AND s.is_active = 1 
                  AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = 1
            ''', (session_token,))
            
            session = cursor.fetchone()
            if not session:
                return {'success': False, 'error': '會話無效或已過期'}
            
            # 更新會話最後使用時間
            cursor.execute(
                'UPDATE user_sessions SET last_used = CURRENT_TIMESTAMP WHERE session_token = ?',
                (session_token,)
            )
            conn.commit()
            
            return {
                'success': True,
                'user': {
                    'id': session[0],
                    'uuid': session[2],
                    'username': session[3],
                    'email': session[4],
                    'role': session[5],
                    'is_verified': bool(session[7])
                }
            }
            
        except Exception as e:
            logger.error(f"驗證會話失敗: {str(e)}")
            return {'success': False, 'error': f'驗證會話失敗: {str(e)}'}
        finally:
            conn.close()
    
    def get_user_by_id(self, user_id):
        """
        根據ID獲取用戶資訊
        
        Args:
            user_id: 用戶ID
            
        Returns:
            dict: 用戶資訊
        """
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, uuid, username, email, first_name, last_name,
                       role, is_active, is_verified, preferences, api_quota, used_quota,
                       created_at, last_login
                FROM users WHERE id = ?
            ''', (user_id,))
            
            user = cursor.fetchone()
            if not user:
                return {'success': False, 'error': '用戶不存在'}
            
            # 解析偏好設置
            preferences = {}
            try:
                if user[9]:
                    preferences = json.loads(user[9])
            except:
                preferences = {}
            
            return {
                'success': True,
                'user': {
                    'id': user[0],
                    'uuid': user[1],
                    'username': user[2],
                    'email': user[3],
                    'first_name': user[4],
                    'last_name': user[5],
                    'role': user[6],
                    'is_active': bool(user[7]),
                    'is_verified': bool(user[8]),
                    'preferences': preferences,
                    'api_quota': user[10],
                    'used_quota': user[11],
                    'created_at': user[12],
                    'last_login': user[13]
                }
            }
            
        except Exception as e:
            logger.error(f"獲取用戶資訊失敗: {str(e)}")
            return {'success': False, 'error': f'獲取用戶資訊失敗: {str(e)}'}
        finally:
            conn.close()
    
    def update_user_preferences(self, user_id, preferences):
        """
        更新用戶偏好設置
        
        Args:
            user_id: 用戶ID
            preferences: 偏好設置字典
            
        Returns:
            dict: 更新結果
        """
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            
            preferences_json = json.dumps(preferences)
            cursor.execute(
                'UPDATE users SET preferences = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                (preferences_json, user_id)
            )
            
            if cursor.rowcount == 0:
                return {'success': False, 'error': '用戶不存在'}
            
            conn.commit()
            return {'success': True, 'message': '偏好設置更新成功'}
            
        except Exception as e:
            logger.error(f"更新用戶偏好失敗: {str(e)}")
            return {'success': False, 'error': f'更新偏好失敗: {str(e)}'}
        finally:
            conn.close()
    
    def log_user_activity(self, user_id, action, details=None, ip_address=None, user_agent=None):
        """
        記錄用戶活動
        
        Args:
            user_id: 用戶ID
            action: 活動類型
            details: 活動詳情
            ip_address: IP地址
            user_agent: 用戶代理
        """
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            
            details_json = json.dumps(details) if details else None
            
            cursor.execute('''
                INSERT INTO user_activities (
                    user_id, action, details, ip_address, user_agent
                ) VALUES (?, ?, ?, ?, ?)
            ''', (user_id, action, details_json, ip_address, user_agent))
            
            conn.commit()
            
        except Exception as e:
            logger.error(f"記錄用戶活動失敗: {str(e)}")
        finally:
            conn.close()

# 全局用戶模型實例
user_model = UserModel() 