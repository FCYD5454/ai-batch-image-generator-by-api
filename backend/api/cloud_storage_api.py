"""
雲存儲 API 端點 v2.9
提供多雲平台存儲的 REST API 接口
"""

from flask import Blueprint, request, jsonify, send_file
from functools import wraps
import logging
import asyncio
import json
from datetime import datetime
import os
import tempfile

# 導入服務
from services.cloud_storage_service import CloudStorageService, CloudProvider, get_cloud_storage_service
from models.user import user_model
from services.database import DatabaseService

logger = logging.getLogger(__name__)

# 創建藍圖
cloud_storage_bp = Blueprint('cloud_storage', __name__, url_prefix='/api/cloud-storage')

# 初始化服務
cloud_service = get_cloud_storage_service()
db_service = DatabaseService()

def require_auth(f):
    """認證裝飾器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': '需要認證'}), 401
        
        token = auth_header.split(' ')[1]
        user_data = user_model.validate_session(token)
        if not user_data.get('success'):
            return jsonify({'success': False, 'error': '無效的認證令牌'}), 401
        
        request.current_user = user_data
        return f(*args, **kwargs)
    return decorated_function

@cloud_storage_bp.route('/status', methods=['GET'])
@require_auth
def get_cloud_storage_status():
    """獲取雲存儲服務狀態"""
    try:
        # 獲取服務統計
        stats = cloud_service.get_stats()
        
        # 執行健康檢查
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        health_status = loop.run_until_complete(cloud_service.health_check())
        loop.close()
        
        # 記錄用戶活動
        db_service.log_user_activity(
            request.current_user['id'],
            'cloud_storage_status_check',
            {'timestamp': datetime.now().isoformat()}
        )
        
        return jsonify({
            'success': True,
            'stats': stats,
            'health': health_status,
            'user_id': request.current_user['id']
        })
        
    except Exception as e:
        logger.error(f"獲取雲存儲狀態失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cloud_storage_bp.route('/upload', methods=['POST'])
@require_auth
def upload_file():
    """上傳文件到雲存儲"""
    try:
        # 檢查請求數據
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': '沒有文件上傳'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': '沒有選擇文件'}), 400
        
        # 獲取參數
        provider_name = request.form.get('provider', 'aws_s3')
        destination_path = request.form.get('destination_path')
        is_public = request.form.get('is_public', 'false').lower() == 'true'
        tags = json.loads(request.form.get('tags', '[]'))
        metadata = json.loads(request.form.get('metadata', '{}'))
        
        # 驗證提供商
        try:
            provider = CloudProvider(provider_name)
        except ValueError:
            return jsonify({'success': False, 'error': f'不支援的雲存儲提供商: {provider_name}'}), 400
        
        # 保存臨時文件
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            file.save(temp_file.name)
            temp_file_path = temp_file.name
        
        try:
            # 添加用戶信息到元數據
            metadata.update({
                'user_id': request.current_user['id'],
                'username': request.current_user['username'],
                'upload_source': 'web_interface'
            })
            
            # 上傳文件
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(
                cloud_service.upload_file(
                    temp_file_path,
                    destination_path,
                    provider,
                    metadata,
                    tags,
                    is_public
                )
            )
            loop.close()
            
            if result['success']:
                # 記錄用戶活動
                db_service.log_user_activity(
                    request.current_user['id'],
                    'cloud_file_upload',
                    {
                        'file_id': result['file_id'],
                        'provider': provider.value,
                        'filename': file.filename,
                        'timestamp': datetime.now().isoformat()
                    }
                )
                
                logger.info(f"用戶 {request.current_user['username']} 上傳文件: {file.filename}")
                
                return jsonify(result)
            else:
                return jsonify(result), 500
                
        finally:
            # 清理臨時文件
            try:
                os.unlink(temp_file_path)
            except OSError:
                pass
        
    except Exception as e:
        logger.error(f"文件上傳失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cloud_storage_bp.route('/download/<file_id>', methods=['GET'])
@require_auth
def download_file(file_id):
    """下載雲存儲中的文件"""
    try:
        provider_name = request.args.get('provider', 'aws_s3')
        
        # 驗證提供商
        try:
            provider = CloudProvider(provider_name)
        except ValueError:
            return jsonify({'success': False, 'error': f'不支援的雲存儲提供商: {provider_name}'}), 400
        
        # 創建臨時文件路徑
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_file_path = temp_file.name
        
        try:
            # 下載文件
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(
                cloud_service.download_file(file_id, temp_file_path, provider)
            )
            loop.close()
            
            if result['success']:
                # 記錄用戶活動
                db_service.log_user_activity(
                    request.current_user['id'],
                    'cloud_file_download',
                    {
                        'file_id': file_id,
                        'provider': provider.value,
                        'timestamp': datetime.now().isoformat()
                    }
                )
                
                # 獲取文件信息
                cloud_file = result['cloud_file']
                
                # 返回文件
                return send_file(
                    temp_file_path,
                    as_attachment=True,
                    download_name=cloud_file.filename,
                    mimetype=cloud_file.content_type
                )
            else:
                return jsonify(result), 500
                
        except Exception as e:
            # 清理臨時文件
            try:
                os.unlink(temp_file_path)
            except OSError:
                pass
            raise
        
    except Exception as e:
        logger.error(f"文件下載失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cloud_storage_bp.route('/files', methods=['GET'])
@require_auth
def list_files():
    """列出雲存儲中的文件"""
    try:
        provider_name = request.args.get('provider', 'aws_s3')
        prefix = request.args.get('prefix', '')
        limit = int(request.args.get('limit', 100))
        
        # 驗證提供商
        try:
            provider = CloudProvider(provider_name)
        except ValueError:
            return jsonify({'success': False, 'error': f'不支援的雲存儲提供商: {provider_name}'}), 400
        
        # 列出文件
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        files = loop.run_until_complete(
            cloud_service.list_files(provider, prefix, limit)
        )
        loop.close()
        
        # 轉換為JSON可序列化格式
        files_data = []
        for file in files:
            files_data.append({
                'file_id': file.file_id,
                'filename': file.filename,
                'file_path': file.file_path,
                'file_size': file.file_size,
                'file_hash': file.file_hash,
                'content_type': file.content_type,
                'provider': file.provider.value,
                'bucket_name': file.bucket_name,
                'created_at': file.created_at.isoformat() if file.created_at else None,
                'updated_at': file.updated_at.isoformat() if file.updated_at else None,
                'metadata': file.metadata,
                'tags': file.tags,
                'is_public': file.is_public
            })
        
        # 記錄用戶活動
        db_service.log_user_activity(
            request.current_user['id'],
            'cloud_files_list',
            {
                'provider': provider.value,
                'file_count': len(files_data),
                'timestamp': datetime.now().isoformat()
            }
        )
        
        return jsonify({
            'success': True,
            'files': files_data,
            'provider': provider.value,
            'total_count': len(files_data)
        })
        
    except Exception as e:
        logger.error(f"列出文件失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cloud_storage_bp.route('/delete/<file_id>', methods=['DELETE'])
@require_auth
def delete_file(file_id):
    """刪除雲存儲中的文件"""
    try:
        provider_name = request.args.get('provider', 'aws_s3')
        
        # 驗證提供商
        try:
            provider = CloudProvider(provider_name)
        except ValueError:
            return jsonify({'success': False, 'error': f'不支援的雲存儲提供商: {provider_name}'}), 400
        
        # 刪除文件
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(
            cloud_service.delete_file(file_id, provider)
        )
        loop.close()
        
        if result['success']:
            # 記錄用戶活動
            db_service.log_user_activity(
                request.current_user['id'],
                'cloud_file_delete',
                {
                    'file_id': file_id,
                    'provider': provider.value,
                    'timestamp': datetime.now().isoformat()
                }
            )
            
            logger.info(f"用戶 {request.current_user['username']} 刪除文件: {file_id}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"文件刪除失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cloud_storage_bp.route('/sync', methods=['POST'])
@require_auth
def sync_directory():
    """同步本地目錄到雲存儲"""
    try:
        data = request.get_json()
        
        if not data or 'local_directory' not in data:
            return jsonify({'success': False, 'error': '缺少本地目錄路徑'}), 400
        
        local_directory = data['local_directory']
        remote_directory = data.get('remote_directory', '')
        provider_name = data.get('provider', 'aws_s3')
        
        # 驗證提供商
        try:
            provider = CloudProvider(provider_name)
        except ValueError:
            return jsonify({'success': False, 'error': f'不支援的雲存儲提供商: {provider_name}'}), 400
        
        # 檢查本地目錄是否存在
        if not os.path.exists(local_directory):
            return jsonify({'success': False, 'error': f'本地目錄不存在: {local_directory}'}), 400
        
        # 執行同步
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(
            cloud_service.sync_files(local_directory, remote_directory, provider)
        )
        loop.close()
        
        if result['success']:
            # 記錄用戶活動
            db_service.log_user_activity(
                request.current_user['id'],
                'cloud_directory_sync',
                {
                    'local_directory': local_directory,
                    'remote_directory': remote_directory,
                    'provider': provider.value,
                    'sync_results': result['sync_results'],
                    'timestamp': datetime.now().isoformat()
                }
            )
            
            logger.info(f"用戶 {request.current_user['username']} 同步目錄: {local_directory}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"目錄同步失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cloud_storage_bp.route('/file-info/<file_id>', methods=['GET'])
@require_auth
def get_file_info(file_id):
    """獲取文件詳細信息"""
    try:
        provider_name = request.args.get('provider', 'aws_s3')
        
        # 驗證提供商
        try:
            provider = CloudProvider(provider_name)
        except ValueError:
            return jsonify({'success': False, 'error': f'不支援的雲存儲提供商: {provider_name}'}), 400
        
        # 獲取文件信息
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        cloud_file = loop.run_until_complete(
            cloud_service.get_file_info(file_id, provider)
        )
        loop.close()
        
        if cloud_file:
            file_data = {
                'file_id': cloud_file.file_id,
                'filename': cloud_file.filename,
                'file_path': cloud_file.file_path,
                'file_size': cloud_file.file_size,
                'file_hash': cloud_file.file_hash,
                'content_type': cloud_file.content_type,
                'provider': cloud_file.provider.value,
                'bucket_name': cloud_file.bucket_name,
                'created_at': cloud_file.created_at.isoformat() if cloud_file.created_at else None,
                'updated_at': cloud_file.updated_at.isoformat() if cloud_file.updated_at else None,
                'metadata': cloud_file.metadata,
                'tags': cloud_file.tags,
                'is_public': cloud_file.is_public
            }
            
            # 記錄用戶活動
            db_service.log_user_activity(
                request.current_user['id'],
                'cloud_file_info',
                {
                    'file_id': file_id,
                    'provider': provider.value,
                    'timestamp': datetime.now().isoformat()
                }
            )
            
            return jsonify({
                'success': True,
                'file': file_data
            })
        else:
            return jsonify({
                'success': False,
                'error': '文件不存在'
            }), 404
        
    except Exception as e:
        logger.error(f"獲取文件信息失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cloud_storage_bp.route('/providers', methods=['GET'])
@require_auth
def get_providers():
    """獲取可用的雲存儲提供商"""
    try:
        stats = cloud_service.get_stats()
        
        providers_info = []
        for provider_name in stats['config']['available_providers']:
            provider_data = {
                'name': provider_name,
                'display_name': {
                    'aws_s3': 'Amazon S3',
                    'google_cloud': 'Google Cloud Storage',
                    'azure_blob': 'Azure Blob Storage'
                }.get(provider_name, provider_name),
                'status': 'active' if provider_name in stats['config']['available_providers'] else 'inactive',
                'is_default': provider_name == stats['config']['default_provider']
            }
            providers_info.append(provider_data)
        
        return jsonify({
            'success': True,
            'providers': providers_info,
            'default_provider': stats['config']['default_provider']
        })
        
    except Exception as e:
        logger.error(f"獲取提供商信息失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cloud_storage_bp.route('/health', methods=['GET'])
@require_auth
def health_check():
    """雲存儲健康檢查"""
    try:
        # 執行健康檢查
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        health_status = loop.run_until_complete(cloud_service.health_check())
        loop.close()
        
        return jsonify({
            'success': True,
            'health': health_status
        })
        
    except Exception as e:
        logger.error(f"健康檢查失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# 錯誤處理
@cloud_storage_bp.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({
        'success': False,
        'error': '文件太大，請上傳較小的文件'
    }), 413

@cloud_storage_bp.errorhandler(400)
def bad_request(error):
    return jsonify({
        'success': False,
        'error': '請求格式錯誤'
    }), 400

@cloud_storage_bp.errorhandler(500)
def internal_server_error(error):
    return jsonify({
        'success': False,
        'error': '內部服務器錯誤'
    }), 500 