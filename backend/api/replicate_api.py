"""
Replicate API 端點 v2.9
提供 Replicate 平台的 REST API 接口
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import logging
import asyncio
import json
from datetime import datetime

# 導入服務
from services.replicate_service import ReplicateService
from models.user import user_model
from services.database import DatabaseService

logger = logging.getLogger(__name__)

# 創建藍圖
replicate_bp = Blueprint('replicate', __name__, url_prefix='/api/replicate')

# 初始化服務
replicate_service = ReplicateService()
db_service = DatabaseService()

def require_auth(f):
    """認證裝飾器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': '需要認證'}), 401
        
        token = auth_header.split(' ')[1]
        result = user_model.validate_session(token)
        
        if not result['success']:
            return jsonify({'success': False, 'error': '無效的認證令牌'}), 401
        
        request.user = result['user']
        return f(*args, **kwargs)
    
    return decorated_function

@replicate_bp.route('/status', methods=['GET'])
@require_auth
def get_status():
    """獲取 Replicate 服務狀態"""
    try:
        # 執行異步操作
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            connection_test = loop.run_until_complete(replicate_service.test_connection())
            usage_stats = replicate_service.get_usage_stats()
            
            return jsonify({
                'success': True,
                'data': {
                    'connection': connection_test,
                    'usage_stats': usage_stats,
                    'service_version': 'v2.9'
                },
                'timestamp': datetime.now().isoformat()
            })
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"獲取 Replicate 狀態失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取狀態失敗: {str(e)}'
        }), 500

@replicate_bp.route('/configure', methods=['POST'])
@require_auth
def configure_service():
    """配置 Replicate API 金鑰"""
    try:
        data = request.get_json()
        api_token = data.get('api_token', '').strip()
        
        if not api_token:
            return jsonify({
                'success': False,
                'error': '缺少 API 金鑰'
            }), 400
        
        replicate_service.set_api_token(api_token)
        
        # 測試連接
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            test_result = loop.run_until_complete(replicate_service.test_connection())
            
            if test_result['success']:
                # 記錄用戶活動
                user_model.log_activity(
                    request.user['id'],
                    'replicate_configured',
                    {'configured': True}
                )
                
                return jsonify({
                    'success': True,
                    'message': 'Replicate 服務配置成功',
                    'connection_test': test_result
                })
            else:
                return jsonify({
                    'success': False,
                    'error': '配置失敗，請檢查 API 金鑰'
                }), 400
                
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"配置 Replicate 服務失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'配置失敗: {str(e)}'
        }), 500

@replicate_bp.route('/models', methods=['GET'])
@require_auth
def get_models():
    """獲取可用模型列表"""
    try:
        category = request.args.get('category')
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            models = loop.run_until_complete(replicate_service.get_models(category))
            
            return jsonify({
                'success': True,
                'data': models
            })
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"獲取模型列表失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取模型列表失敗: {str(e)}'
        }), 500

@replicate_bp.route('/generate-image', methods=['POST'])
@require_auth
def generate_image():
    """生成圖像"""
    try:
        data = request.get_json()
        
        prompt = data.get('prompt', '').strip()
        model_key = data.get('model', 'sdxl')
        
        if not prompt:
            return jsonify({
                'success': False,
                'error': '提示詞不能為空'
            }), 400
        
        # 提取其他參數
        kwargs = {
            'width': data.get('width', 1024),
            'height': data.get('height', 1024),
            'num_inference_steps': data.get('num_inference_steps', 20),
            'guidance_scale': data.get('guidance_scale', 7.5),
            'negative_prompt': data.get('negative_prompt'),
            'seed': data.get('seed')
        }
        
        # 移除空值
        kwargs = {k: v for k, v in kwargs.items() if v is not None}
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            start_time = datetime.now()
            
            result = loop.run_until_complete(
                replicate_service.generate_image(model_key, prompt, **kwargs)
            )
            
            if result['success']:
                # 保存生成記錄
                generation_id = db_service.save_generation_record(
                    prompt=prompt,
                    api_provider='replicate',
                    model_name=model_key,
                    image_size=f"{kwargs.get('width', 1024)}x{kwargs.get('height', 1024)}",
                    image_count=1,
                    settings={'model_key': model_key, **kwargs}
                )
                
                # 記錄用戶活動
                user_model.log_activity(
                    request.user['id'],
                    'replicate_image_generated',
                    {
                        'model': model_key,
                        'prompt_length': len(prompt),
                        'generation_id': generation_id
                    }
                )
                
                result['generation_id'] = generation_id
                result['generation_time'] = (datetime.now() - start_time).total_seconds()
            
            return jsonify(result)
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"圖像生成失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'圖像生成失敗: {str(e)}'
        }), 500

@replicate_bp.route('/analyze-image', methods=['POST'])
@require_auth
def analyze_image():
    """分析圖像"""
    try:
        data = request.get_json()
        
        image_url = data.get('image_url', '').strip()
        prompt = data.get('prompt', 'Describe this image')
        
        if not image_url:
            return jsonify({
                'success': False,
                'error': '缺少圖像 URL'
            }), 400
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                replicate_service.analyze_image(image_url, prompt)
            )
            
            if result['success']:
                # 記錄用戶活動
                user_model.log_activity(
                    request.user['id'],
                    'replicate_image_analyzed',
                    {
                        'image_url': image_url[:100],  # 只記錄前100字符
                        'prompt': prompt
                    }
                )
            
            return jsonify(result)
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"圖像分析失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'圖像分析失敗: {str(e)}'
        }), 500

@replicate_bp.route('/remove-background', methods=['POST'])
@require_auth
def remove_background():
    """移除圖像背景"""
    try:
        data = request.get_json()
        
        image_url = data.get('image_url', '').strip()
        
        if not image_url:
            return jsonify({
                'success': False,
                'error': '缺少圖像 URL'
            }), 400
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                replicate_service.remove_background(image_url)
            )
            
            if result['success']:
                # 記錄用戶活動
                user_model.log_activity(
                    request.user['id'],
                    'replicate_background_removed',
                    {'image_url': image_url[:100]}
                )
            
            return jsonify(result)
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"背景移除失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'背景移除失敗: {str(e)}'
        }), 500

@replicate_bp.route('/upscale-image', methods=['POST'])
@require_auth
def upscale_image():
    """放大圖像"""
    try:
        data = request.get_json()
        
        image_url = data.get('image_url', '').strip()
        scale = data.get('scale', 4)
        
        if not image_url:
            return jsonify({
                'success': False,
                'error': '缺少圖像 URL'
            }), 400
        
        if scale not in [2, 4, 8]:
            return jsonify({
                'success': False,
                'error': '放大倍數必須是 2, 4 或 8'
            }), 400
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                replicate_service.upscale_image(image_url, scale)
            )
            
            if result['success']:
                # 記錄用戶活動
                user_model.log_activity(
                    request.user['id'],
                    'replicate_image_upscaled',
                    {
                        'image_url': image_url[:100],
                        'scale': scale
                    }
                )
            
            return jsonify(result)
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"圖像放大失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'圖像放大失敗: {str(e)}'
        }), 500

@replicate_bp.route('/batch-generate', methods=['POST'])
@require_auth
def batch_generate():
    """批量生成圖像"""
    try:
        data = request.get_json()
        
        prompts = data.get('prompts', [])
        model_key = data.get('model', 'sdxl')
        
        if not prompts or len(prompts) == 0:
            return jsonify({
                'success': False,
                'error': '提示詞列表不能為空'
            }), 400
        
        if len(prompts) > 10:
            return jsonify({
                'success': False,
                'error': '批量生成最多支援 10 個提示詞'
            }), 400
        
        # 提取其他參數
        kwargs = {
            'width': data.get('width', 1024),
            'height': data.get('height', 1024),
            'num_inference_steps': data.get('num_inference_steps', 20),
            'guidance_scale': data.get('guidance_scale', 7.5)
        }
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            results = loop.run_until_complete(
                replicate_service.batch_generate(prompts, model_key, **kwargs)
            )
            
            # 記錄用戶活動
            user_model.log_activity(
                request.user['id'],
                'replicate_batch_generated',
                {
                    'model': model_key,
                    'prompt_count': len(prompts),
                    'success_count': sum(1 for r in results if r.get('success'))
                }
            )
            
            return jsonify({
                'success': True,
                'results': results,
                'summary': {
                    'total': len(prompts),
                    'successful': sum(1 for r in results if r.get('success')),
                    'failed': sum(1 for r in results if not r.get('success'))
                }
            })
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"批量生成失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'批量生成失敗: {str(e)}'
        }), 500

@replicate_bp.route('/prediction/<prediction_id>', methods=['GET'])
@require_auth
def get_prediction(prediction_id):
    """獲取預測結果"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                replicate_service.get_prediction(prediction_id)
            )
            
            return jsonify(result)
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"獲取預測結果失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取預測結果失敗: {str(e)}'
        }), 500

@replicate_bp.route('/usage-stats', methods=['GET'])
@require_auth
def get_usage_stats():
    """獲取使用統計"""
    try:
        stats = replicate_service.get_usage_stats()
        
        return jsonify({
            'success': True,
            'data': stats
        })
        
    except Exception as e:
        logger.error(f"獲取使用統計失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取使用統計失敗: {str(e)}'
        }), 500

# 錯誤處理
@replicate_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': '找不到請求的端點'
    }), 404

@replicate_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': '服務器內部錯誤'
    }), 500 