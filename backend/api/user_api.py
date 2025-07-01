# -*- coding: utf-8 -*-
"""
用戶 API 模組
處理用戶相關的 API 請求
"""

from flask import Blueprint, request, jsonify, session
from functools import wraps
import logging

logger = logging.getLogger(__name__)

user_api = Blueprint('user_api', __name__)

def auth_required(f):
    """簡單的認證裝飾器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 這裡實現一個簡單的認證邏輯
        # 在真實環境中，您需要實現更完整的認證系統
        
        # 檢查是否有 API Key 或 session
        api_key = request.headers.get('Authorization') or request.headers.get('X-API-Key')
        
        # 暫時允許所有請求通過（開發模式）
        # 在生產環境中，您需要實現真正的認證
        if not api_key and not session.get('user_id'):
            # 返回一個示例用戶而不是拒絕
            session['user_id'] = 'demo_user'
            session['username'] = 'Demo User'
        
        return f(*args, **kwargs)
    return decorated_function

@user_api.route('/api/user/profile', methods=['GET'])
@auth_required
def get_user_profile():
    """獲取用戶資料"""
    try:
        # 返回示例用戶資料
        user_profile = {
            'success': True,
            'user': {
                'id': session.get('user_id', 'demo_user'),
                'username': session.get('username', 'Demo User'),
                'email': 'demo@example.com',
                'avatar_url': None,
                'role': 'user',
                'preferences': {
                    'language': 'zh-TW',
                    'theme': 'light',
                    'notifications': True
                },
                'api_quota': 1000,
                'used_quota': 50,
                'created_at': '2024-01-01T00:00:00Z',
                'last_login': '2024-12-04T11:00:00Z'
            }
        }
        
        return jsonify(user_profile)
        
    except Exception as e:
        logger.error(f"獲取用戶資料失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': '獲取用戶資料失敗'
        }), 500

@user_api.route('/api/user/preferences', methods=['GET', 'POST'])
@auth_required
def user_preferences():
    """用戶偏好設定"""
    try:
        if request.method == 'GET':
            # 獲取用戶偏好
            preferences = {
                'success': True,
                'preferences': {
                    'language': 'zh-TW',
                    'theme': 'light',
                    'notifications': True,
                    'auto_save': True,
                    'show_tips': True,
                    'default_image_size': '1024x1024',
                    'default_api_provider': 'gemini'
                }
            }
            return jsonify(preferences)
        
        elif request.method == 'POST':
            # 更新用戶偏好
            data = request.get_json()
            
            # 在實際應用中，這裡會保存到資料庫
            # 現在只是返回成功響應
            
            return jsonify({
                'success': True,
                'message': '偏好設定已更新',
                'preferences': data.get('preferences', {})
            })
            
    except Exception as e:
        logger.error(f"處理用戶偏好失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': '處理用戶偏好失敗'
        }), 500

@user_api.route('/api/user/login', methods=['POST'])
def login():
    """用戶登入"""
    try:
        data = request.get_json()
        username = data.get('username', '')
        password = data.get('password', '')
        
        # 簡單的演示登入邏輯
        # 在實際應用中，您需要驗證密碼雜湊
        
        if username and password:
            # 創建 session
            session['user_id'] = f"user_{username}"
            session['username'] = username
            session['is_authenticated'] = True
            
            return jsonify({
                'success': True,
                'message': '登入成功',
                'user': {
                    'id': session['user_id'],
                    'username': username,
                    'role': 'user'
                }
            })
        else:
            return jsonify({
                'success': False,
                'error': '用戶名或密碼不能為空'
            }), 400
            
    except Exception as e:
        logger.error(f"用戶登入失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': '登入失敗'
        }), 500

@user_api.route('/api/user/logout', methods=['POST'])
def logout():
    """用戶登出"""
    try:
        # 清除 session
        session.clear()
        
        return jsonify({
            'success': True,
            'message': '登出成功'
        })
        
    except Exception as e:
        logger.error(f"用戶登出失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': '登出失敗'
        }), 500

@user_api.route('/api/user/status', methods=['GET'])
def get_auth_status():
    """檢查認證狀態"""
    try:
        is_authenticated = session.get('is_authenticated', False)
        
        if is_authenticated:
            return jsonify({
                'success': True,
                'authenticated': True,
                'user': {
                    'id': session.get('user_id'),
                    'username': session.get('username'),
                    'role': 'user'
                }
            })
        else:
            return jsonify({
                'success': True,
                'authenticated': False,
                'user': None
            })
            
    except Exception as e:
        logger.error(f"檢查認證狀態失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': '檢查認證狀態失敗'
        }), 500

# 初始化時的日誌
logger.info("用戶 API 模組已初始化") 