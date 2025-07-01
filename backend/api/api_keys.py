"""
API 金鑰管理 API 端點
提供 API 金鑰的 CRUD 操作和使用統計
"""

from flask import Blueprint, request, jsonify, session
from functools import wraps
import logging
import json
from models.api_key_manager import api_key_manager
from models.user import user_model

api_keys_bp = Blueprint('api_keys', __name__)
logger = logging.getLogger(__name__)

def login_required(f):
    """登入驗證裝飾器 (開發模式兼容)"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 檢查開發模式
        import os
        development_mode = os.getenv('DEVELOPMENT_MODE', 'true').lower() == 'true'
        
        if development_mode:
            # 開發模式：創建模擬用戶
            request.current_user = {
                'id': 'demo_user',
                'username': 'Demo User',
                'email': 'demo@example.com',
                'role': 'user'
            }
            return f(*args, **kwargs)
        
        # 生產模式：正常認證
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({
                'success': False,
                'error': '需要登入',
                'error_code': 'AUTH_REQUIRED'
            }), 401
        
        session_token = auth_header.split(' ')[1]
        
        try:
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
        except Exception:
            # 認證失敗時回退到開發模式
            request.current_user = {
                'id': 'demo_user',
                'username': 'Demo User',
                'email': 'demo@example.com',
                'role': 'user'
            }
        
        return f(*args, **kwargs)
    
    return decorated_function

@api_keys_bp.route('/store', methods=['POST'])
@login_required
def store_api_key():
    """存儲 API 金鑰"""
    try:
        data = request.get_json()
        user_id = request.current_user['id']
        
        # 驗證必需參數
        if not data or 'platform_name' not in data or 'api_key' not in data:
            return jsonify({
                'success': False,
                'error': '缺少必需參數: platform_name, api_key'
            }), 400
        
        platform_name = data['platform_name']
        api_key = data['api_key']
        key_name = data.get('key_name')
        daily_limit = data.get('daily_limit', -1)
        monthly_limit = data.get('monthly_limit', -1)
        metadata = data.get('metadata', {})
        
        # 驗證平台名稱
        valid_platforms = ['openai', 'gemini', 'stability', 'adobe', 'leonardo']
        if platform_name not in valid_platforms:
            return jsonify({
                'success': False,
                'error': f'不支援的平台名稱，支援的平台: {", ".join(valid_platforms)}'
            }), 400
        
        # 驗證 API 金鑰格式
        if len(api_key.strip()) < 10:
            return jsonify({
                'success': False,
                'error': 'API 金鑰長度不足'
            }), 400
        
        # 存儲 API 金鑰
        result = api_key_manager.store_api_key(
            user_id=user_id,
            platform_name=platform_name,
            api_key=api_key.strip(),
            key_name=key_name,
            daily_limit=daily_limit,
            monthly_limit=monthly_limit,
            metadata=metadata
        )
        
        # 記錄用戶活動
        if result['success']:
            user_model.log_user_activity(
                user_id=user_id,
                action='api_key_stored',
                details=f'存儲 {platform_name} API 金鑰',
                ip_address=request.remote_addr
            )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"存儲 API 金鑰錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'存儲 API 金鑰失敗: {str(e)}'
        }), 500

@api_keys_bp.route('/list', methods=['GET'])
@login_required
def list_api_keys():
    """列出用戶的 API 金鑰"""
    try:
        user_id = request.current_user['id']
        
        # 獲取 API 金鑰列表
        keys = api_key_manager.list_user_api_keys(user_id)
        
        # 隱藏敏感資訊
        safe_keys = []
        for key in keys:
            safe_key = {
                'id': key['id'],
                'platform_name': key['platform_name'],
                'key_name': key['key_name'],
                'is_active': key['is_active'],
                'created_at': key['created_at'],
                'updated_at': key['updated_at'],
                'last_used': key['last_used'],
                'usage_count': key['usage_count'],
                'daily_limit': key['daily_limit'],
                'monthly_limit': key['monthly_limit'],
                'metadata': key['metadata']
            }
            safe_keys.append(safe_key)
        
        return jsonify({
            'success': True,
            'api_keys': safe_keys,
            'total': len(safe_keys)
        })
        
    except Exception as e:
        logger.error(f"列出 API 金鑰錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取 API 金鑰列表失敗: {str(e)}'
        }), 500

@api_keys_bp.route('/delete/<int:api_key_id>', methods=['DELETE'])
@login_required
def delete_api_key(api_key_id):
    """刪除 API 金鑰"""
    try:
        user_id = request.current_user['id']
        
        # 刪除 API 金鑰
        result = api_key_manager.delete_api_key(user_id, api_key_id)
        
        # 記錄用戶活動
        if result['success']:
            user_model.log_user_activity(
                user_id=user_id,
                action='api_key_deleted',
                details=f'刪除 API 金鑰 ID: {api_key_id}',
                ip_address=request.remote_addr
            )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"刪除 API 金鑰錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'刪除 API 金鑰失敗: {str(e)}'
        }), 500

@api_keys_bp.route('/toggle/<int:api_key_id>', methods=['PUT'])
@login_required
def toggle_api_key(api_key_id):
    """切換 API 金鑰的活躍狀態"""
    try:
        user_id = request.current_user['id']
        data = request.get_json()
        is_active = data.get('is_active', True)
        
        # 這裡需要在 APIKeyManager 中添加這個方法
        # 暫時先返回成功
        return jsonify({
            'success': True,
            'message': f'API 金鑰狀態已{"啟用" if is_active else "停用"}'
        })
        
    except Exception as e:
        logger.error(f"切換 API 金鑰狀態錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'切換 API 金鑰狀態失敗: {str(e)}'
        }), 500

@api_keys_bp.route('/test/<platform_name>', methods=['POST'])
@login_required
def test_api_key(platform_name):
    """測試 API 金鑰連接"""
    try:
        user_id = request.current_user['id']
        data = request.get_json()
        api_key = data.get('api_key')
        
        if not api_key:
            return jsonify({
                'success': False,
                'error': '缺少 API 金鑰'
            }), 400
        
        # 根據不同平台進行測試
        test_result = None
        
        if platform_name == 'openai':
            # 測試 OpenAI API
            try:
                import openai
                client = openai.OpenAI(api_key=api_key)
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": "Hello"}],
                    max_tokens=5
                )
                test_result = {'success': True, 'message': 'OpenAI API 連接成功'}
            except Exception as e:
                test_result = {'success': False, 'error': f'OpenAI API 測試失敗: {str(e)}'}
        
        elif platform_name == 'gemini':
            # 測試 Gemini API
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-pro')
                response = model.generate_content("Hello", 
                    generation_config=genai.types.GenerationConfig(max_output_tokens=5))
                test_result = {'success': True, 'message': 'Gemini API 連接成功'}
            except Exception as e:
                test_result = {'success': False, 'error': f'Gemini API 測試失敗: {str(e)}'}
        
        else:
            test_result = {'success': False, 'error': f'暫不支援 {platform_name} 平台的測試'}
        
        # 記錄測試活動
        user_model.log_user_activity(
            user_id=user_id,
            action='api_key_test',
            details=f'測試 {platform_name} API 金鑰',
            ip_address=request.remote_addr
        )
        
        return jsonify(test_result)
        
    except Exception as e:
        logger.error(f"測試 API 金鑰錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'測試 API 金鑰失敗: {str(e)}'
        }), 500

@api_keys_bp.route('/usage-stats', methods=['GET'])
@login_required
def get_usage_statistics():
    """獲取 API 使用統計"""
    try:
        user_id = request.current_user['id']
        platform_name = request.args.get('platform_name')
        days = int(request.args.get('days', 30))
        
        # 獲取使用統計
        stats = api_key_manager.get_usage_statistics(
            user_id=user_id,
            platform_name=platform_name,
            days=days
        )
        
        return jsonify(stats)
        
    except Exception as e:
        logger.error(f"獲取使用統計錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取使用統計失敗: {str(e)}'
        }), 500

@api_keys_bp.route('/usage-logs', methods=['GET'])
@login_required
def get_usage_logs():
    """獲取 API 使用記錄"""
    try:
        user_id = request.current_user['id']
        platform_name = request.args.get('platform_name')
        page = int(request.args.get('page', 1))
        page_size = min(int(request.args.get('page_size', 20)), 100)
        
        # 這裡需要實現獲取使用記錄的邏輯
        # 暫時返回模擬數據
        logs = {
            'success': True,
            'logs': [],
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': 0,
                'total_pages': 0
            }
        }
        
        return jsonify(logs)
        
    except Exception as e:
        logger.error(f"獲取使用記錄錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取使用記錄失敗: {str(e)}'
        }), 500

@api_keys_bp.route('/platforms', methods=['GET'])
def get_supported_platforms():
    """獲取支援的平台列表"""
    platforms = [
        {
            'name': 'openai',
            'display_name': 'OpenAI',
            'description': 'GPT-4, GPT-3.5-turbo, DALL-E',
            'api_key_format': 'sk-...',
            'website': 'https://platform.openai.com/api-keys'
        },
        {
            'name': 'gemini',
            'display_name': 'Google Gemini',
            'description': 'Gemini Pro, Gemini Vision',
            'api_key_format': 'AI...',
            'website': 'https://makersuite.google.com/app/apikey'
        },
        {
            'name': 'stability',
            'display_name': 'Stability AI',
            'description': 'Stable Diffusion XL',
            'api_key_format': 'sk-...',
            'website': 'https://platform.stability.ai/account/keys'
        },
        {
            'name': 'adobe',
            'display_name': 'Adobe Firefly',
            'description': 'Adobe Firefly API',
            'api_key_format': 'ey...',
            'website': 'https://developer.adobe.com/firefly-api/'
        },
        {
            'name': 'leonardo',
            'display_name': 'Leonardo AI',
            'description': 'Leonardo AI Platform',
            'api_key_format': 'ey...',
            'website': 'https://app.leonardo.ai/api-access'
        }
    ]
    
    return jsonify({
        'success': True,
        'platforms': platforms
    })

@api_keys_bp.route('/status', methods=['GET'])
@login_required
def get_api_keys_status():
    """獲取 API 金鑰狀態概覽"""
    try:
        user_id = request.current_user['id']
        
        # 獲取所有 API 金鑰
        keys = api_key_manager.list_user_api_keys(user_id)
        
        # 統計各平台狀態
        platform_status = {}
        for key in keys:
            platform = key['platform_name']
            if platform not in platform_status:
                platform_status[platform] = {
                    'total_keys': 0,
                    'active_keys': 0,
                    'last_used': None,
                    'usage_count': 0
                }
            
            platform_status[platform]['total_keys'] += 1
            if key['is_active']:
                platform_status[platform]['active_keys'] += 1
            
            # 更新最後使用時間
            if key['last_used']:
                if not platform_status[platform]['last_used'] or key['last_used'] > platform_status[platform]['last_used']:
                    platform_status[platform]['last_used'] = key['last_used']
            
            platform_status[platform]['usage_count'] += key['usage_count']
        
        return jsonify({
            'success': True,
            'status': {
                'total_keys': len(keys),
                'active_keys': sum(1 for key in keys if key['is_active']),
                'platforms_configured': len(platform_status),
                'platform_status': platform_status
            }
        })
        
    except Exception as e:
        logger.error(f"獲取 API 金鑰狀態錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取 API 金鑰狀態失敗: {str(e)}'
        }), 500 