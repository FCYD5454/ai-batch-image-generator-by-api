"""
用戶認證 API 端點
支援用戶註冊、登入、登出和會話管理
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import logging
import re
from models.user import user_model

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)

# 電子郵件驗證正則表達式
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

def validate_password(password):
    """
    驗證密碼強度
    
    Args:
        password: 密碼字符串
        
    Returns:
        tuple: (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "密碼長度至少需要8位字符"
    
    if not re.search(r'[A-Za-z]', password):
        return False, "密碼必須包含字母"
    
    if not re.search(r'\d', password):
        return False, "密碼必須包含數字"
    
    return True, None

def login_required(f):
    """
    登入必需裝飾器
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 從請求頭獲取會話令牌
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({
                'success': False,
                'error': '需要登入',
                'error_code': 'AUTH_REQUIRED'
            }), 401
        
        session_token = auth_header.split(' ')[1]
        
        # 驗證會話
        result = user_model.validate_session(session_token)
        if not result['success']:
            return jsonify({
                'success': False,
                'error': '會話無效或已過期',
                'error_code': 'INVALID_SESSION'
            }), 401
        
        # 將用戶資訊添加到請求上下文
        request.current_user = result['user']
        return f(*args, **kwargs)
    
    return decorated_function

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    用戶註冊
    """
    try:
        data = request.get_json()
        
        # 驗證必需欄位
        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'欄位 {field} 為必填項'
                }), 400
        
        username = data['username'].strip()
        email = data['email'].strip().lower()
        password = data['password']
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        
        # 驗證用戶名
        if len(username) < 3 or len(username) > 50:
            return jsonify({
                'success': False,
                'error': '用戶名長度必須在3-50字符之間'
            }), 400
        
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            return jsonify({
                'success': False,
                'error': '用戶名只能包含字母、數字和下劃線'
            }), 400
        
        # 驗證電子郵件
        if not EMAIL_REGEX.match(email):
            return jsonify({
                'success': False,
                'error': '電子郵件格式無效'
            }), 400
        
        # 驗證密碼
        is_valid, error_msg = validate_password(password)
        if not is_valid:
            return jsonify({
                'success': False,
                'error': error_msg
            }), 400
        
        # 創建用戶
        result = user_model.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name or None,
            last_name=last_name or None
        )
        
        if not result['success']:
            return jsonify(result), 400
        
        # 記錄用戶活動
        user_model.log_user_activity(
            user_id=result['user_id'],
            action='user_registered',
            details={'registration_method': 'email'},
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        return jsonify({
            'success': True,
            'message': '用戶註冊成功',
            'user_id': result['user_id'],
            'verification_required': True
        })
        
    except Exception as e:
        logger.error(f"用戶註冊失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'註冊失敗: {str(e)}'
        }), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    用戶登入
    """
    try:
        data = request.get_json()
        
        # 驗證必需欄位
        username_or_email = data.get('username_or_email', '').strip()
        password = data.get('password', '')
        
        if not username_or_email or not password:
            return jsonify({
                'success': False,
                'error': '用戶名/郵件和密碼為必填項'
            }), 400
        
        # 用戶認證
        auth_result = user_model.authenticate_user(username_or_email, password)
        
        if not auth_result['success']:
            # 記錄登入失敗
            return jsonify({
                'success': False,
                'error': auth_result['error'],
                'error_code': 'AUTH_FAILED'
            }), 401
        
        user = auth_result['user']
        
        # 創建會話
        session_result = user_model.create_session(
            user_id=user['id'],
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            expires_hours=24  # 24小時有效期
        )
        
        if not session_result['success']:
            return jsonify({
                'success': False,
                'error': '創建會話失敗'
            }), 500
        
        # 記錄用戶活動
        user_model.log_user_activity(
            user_id=user['id'],
            action='user_login',
            details={'login_method': 'password'},
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        return jsonify({
            'success': True,
            'message': '登入成功',
            'user': {
                'id': user['id'],
                'uuid': user['uuid'],
                'username': user['username'],
                'email': user['email'],
                'first_name': user['first_name'],
                'last_name': user['last_name'],
                'role': user['role'],
                'is_verified': user['is_verified'],
                'preferences': user['preferences']
            },
            'session': {
                'token': session_result['session_token'],
                'expires_at': session_result['expires_at']
            }
        })
        
    except Exception as e:
        logger.error(f"用戶登入失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'登入失敗: {str(e)}'
        }), 500

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """
    用戶登出
    """
    try:
        # 獲取會話令牌
        auth_header = request.headers.get('Authorization')
        session_token = auth_header.split(' ')[1]
        
        # 停用會話
        import sqlite3
        conn = sqlite3.connect(user_model.db_path)
        try:
            cursor = conn.cursor()
            cursor.execute(
                'UPDATE user_sessions SET is_active = 0 WHERE session_token = ?',
                (session_token,)
            )
            conn.commit()
        finally:
            conn.close()
        
        # 記錄用戶活動
        user_model.log_user_activity(
            user_id=request.current_user['id'],
            action='user_logout',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        return jsonify({
            'success': True,
            'message': '登出成功'
        })
        
    except Exception as e:
        logger.error(f"用戶登出失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'登出失敗: {str(e)}'
        }), 500

@auth_bp.route('/profile', methods=['GET'])
@login_required
def get_profile():
    """
    獲取用戶資訊
    """
    try:
        result = user_model.get_user_by_id(request.current_user['id'])
        
        if not result['success']:
            return jsonify(result), 404
        
        user = result['user']
        
        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'uuid': user['uuid'],
                'username': user['username'],
                'email': user['email'],
                'first_name': user['first_name'],
                'last_name': user['last_name'],
                'role': user['role'],
                'is_verified': user['is_verified'],
                'preferences': user['preferences'],
                'api_quota': user['api_quota'],
                'used_quota': user['used_quota'],
                'created_at': user['created_at'],
                'last_login': user['last_login']
            }
        })
        
    except Exception as e:
        logger.error(f"獲取用戶資訊失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取用戶資訊失敗: {str(e)}'
        }), 500

@auth_bp.route('/profile', methods=['PUT'])
@login_required
def update_profile():
    """
    更新用戶資訊
    """
    try:
        data = request.get_json()
        user_id = request.current_user['id']
        
        # 獲取要更新的欄位
        updates = {}
        allowed_fields = ['first_name', 'last_name', 'preferences']
        
        for field in allowed_fields:
            if field in data:
                updates[field] = data[field]
        
        if not updates:
            return jsonify({
                'success': False,
                'error': '沒有提供要更新的欄位'
            }), 400
        
        # 處理偏好設置更新
        if 'preferences' in updates:
            result = user_model.update_user_preferences(user_id, updates['preferences'])
            if not result['success']:
                return jsonify(result), 400
        
        # 更新其他欄位
        if any(field in updates for field in ['first_name', 'last_name']):
            import sqlite3
            conn = sqlite3.connect(user_model.db_path)
            try:
                cursor = conn.cursor()
                
                set_clauses = []
                values = []
                
                if 'first_name' in updates:
                    set_clauses.append('first_name = ?')
                    values.append(updates['first_name'])
                
                if 'last_name' in updates:
                    set_clauses.append('last_name = ?')
                    values.append(updates['last_name'])
                
                set_clauses.append('updated_at = CURRENT_TIMESTAMP')
                values.append(user_id)
                
                sql = f'UPDATE users SET {", ".join(set_clauses)} WHERE id = ?'
                cursor.execute(sql, values)
                conn.commit()
                
            finally:
                conn.close()
        
        # 記錄用戶活動
        user_model.log_user_activity(
            user_id=user_id,
            action='profile_updated',
            details={'updated_fields': list(updates.keys())},
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        return jsonify({
            'success': True,
            'message': '用戶資訊更新成功'
        })
        
    except Exception as e:
        logger.error(f"更新用戶資訊失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'更新用戶資訊失敗: {str(e)}'
        }), 500

@auth_bp.route('/validate', methods=['POST'])
def validate_session():
    """
    驗證會話有效性
    """
    try:
        # 從請求頭獲取會話令牌
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({
                'success': False,
                'error': '無效的授權頭',
                'valid': False
            }), 401
        
        session_token = auth_header.split(' ')[1]
        
        # 驗證會話
        result = user_model.validate_session(session_token)
        
        if result['success']:
            return jsonify({
                'success': True,
                'valid': True,
                'user': result['user']
            })
        else:
            return jsonify({
                'success': False,
                'valid': False,
                'error': result['error']
            }), 401
        
    except Exception as e:
        logger.error(f"驗證會話失敗: {str(e)}")
        return jsonify({
            'success': False,
            'valid': False,
            'error': f'驗證會話失敗: {str(e)}'
        }), 500

@auth_bp.route('/activities', methods=['GET'])
@login_required
def get_user_activities():
    """
    獲取用戶活動記錄
    """
    try:
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        offset = (page - 1) * limit
        
        import sqlite3
        conn = sqlite3.connect(user_model.db_path)
        try:
            cursor = conn.cursor()
            
            # 獲取活動記錄
            cursor.execute('''
                SELECT action, details, ip_address, created_at
                FROM user_activities
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            ''', (request.current_user['id'], limit, offset))
            
            activities = []
            for row in cursor.fetchall():
                activities.append({
                    'action': row[0],
                    'details': row[1],
                    'ip_address': row[2],
                    'created_at': row[3]
                })
            
            # 獲取總數
            cursor.execute(
                'SELECT COUNT(*) FROM user_activities WHERE user_id = ?',
                (request.current_user['id'],)
            )
            total = cursor.fetchone()[0]
            
        finally:
            conn.close()
        
        return jsonify({
            'success': True,
            'activities': activities,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'total_pages': (total + limit - 1) // limit
            }
        })
        
    except Exception as e:
        logger.error(f"獲取用戶活動失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取用戶活動失敗: {str(e)}'
        }), 500

# 錯誤處理器
@auth_bp.errorhandler(400)
def bad_request(error):
    return jsonify({
        'success': False,
        'error': 'Bad Request',
        'message': '請求參數錯誤'
    }), 400

@auth_bp.errorhandler(401)
def unauthorized(error):
    return jsonify({
        'success': False,
        'error': 'Unauthorized',
        'message': '未授權訪問'
    }), 401

@auth_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal Server Error',
        'message': '伺服器內部錯誤'
    }), 500 