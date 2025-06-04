"""
Hugging Face API 端點 v2.9
提供 Hugging Face 模型的 REST API 接口
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import logging
import asyncio
import json
from datetime import datetime

# 導入服務
from services.huggingface_service import HuggingFaceService, create_huggingface_service, get_recommended_models
from models.user import user_model
from services.database import DatabaseService

logger = logging.getLogger(__name__)

# 創建藍圖
huggingface_bp = Blueprint('huggingface', __name__, url_prefix='/api/huggingface')

# 初始化服務
huggingface_service = None
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

@huggingface_bp.route('/status', methods=['GET'])
@require_auth
def get_status():
    """獲取 Hugging Face 服務狀態"""
    try:
        global huggingface_service
        
        if not huggingface_service:
            return jsonify({
                'success': True,
                'data': {
                    'configured': False,
                    'message': '服務尚未配置'
                }
            })
        
        # 執行異步操作
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            health_check = loop.run_until_complete(huggingface_service.health_check())
            usage_stats = huggingface_service.get_usage_stats()
            available_models = huggingface_service.get_available_models()
            
            return jsonify({
                'success': True,
                'data': {
                    'configured': True,
                    'health_check': health_check,
                    'usage_stats': usage_stats,
                    'available_models': available_models,
                    'service_version': 'v2.9'
                },
                'timestamp': datetime.now().isoformat()
            })
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"獲取 Hugging Face 狀態失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取狀態失敗: {str(e)}'
        }), 500

@huggingface_bp.route('/configure', methods=['POST'])
@require_auth
def configure_service():
    """配置 Hugging Face API 金鑰"""
    try:
        global huggingface_service
        
        data = request.get_json()
        api_token = data.get('api_token', '').strip()
        
        if not api_token:
            return jsonify({
                'success': False,
                'error': '缺少 API 金鑰'
            }), 400
        
        # 執行異步操作
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            huggingface_service = loop.run_until_complete(create_huggingface_service(api_token))
            
            # 測試連接
            health_check = loop.run_until_complete(huggingface_service.health_check())
            
            if health_check['success']:
                # 記錄用戶活動
                user_model.log_activity(
                    request.user['id'],
                    'huggingface_configured',
                    {'configured': True}
                )
                
                return jsonify({
                    'success': True,
                    'message': 'Hugging Face 服務配置成功',
                    'health_check': health_check,
                    'models_count': len(huggingface_service.models)
                })
            else:
                return jsonify({
                    'success': False,
                    'error': '配置失敗，請檢查 API 金鑰'
                }), 400
                
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"配置 Hugging Face 服務失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'配置失敗: {str(e)}'
        }), 500

@huggingface_bp.route('/models', methods=['GET'])
@require_auth
def get_models():
    """獲取可用模型列表"""
    try:
        global huggingface_service
        
        if not huggingface_service:
            return jsonify({
                'success': False,
                'error': '服務尚未配置'
            }), 400
        
        model_type = request.args.get('type')
        models = huggingface_service.get_available_models(model_type)
        
        return jsonify({
            'success': True,
            'data': models
        })
        
    except Exception as e:
        logger.error(f"獲取模型列表失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取模型列表失敗: {str(e)}'
        }), 500

@huggingface_bp.route('/recommendations', methods=['GET'])
@require_auth
def get_model_recommendations():
    """獲取推薦模型配置"""
    try:
        recommendations = get_recommended_models()
        
        return jsonify({
            'success': True,
            'data': recommendations
        })
        
    except Exception as e:
        logger.error(f"獲取推薦模型失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取推薦模型失敗: {str(e)}'
        }), 500

@huggingface_bp.route('/generate-image', methods=['POST'])
@require_auth
def generate_image():
    """生成圖像"""
    try:
        global huggingface_service
        
        if not huggingface_service:
            return jsonify({
                'success': False,
                'error': '服務尚未配置'
            }), 400
        
        data = request.get_json()
        
        prompt = data.get('prompt', '').strip()
        model = data.get('model', 'stable_diffusion')
        
        if not prompt:
            return jsonify({
                'success': False,
                'error': '提示詞不能為空'
            }), 400
        
        # 提取其他參數
        kwargs = {
            'width': data.get('width', 512),
            'height': data.get('height', 512),
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
                huggingface_service.generate_image(prompt, model, **kwargs)
            )
            
            if result['success']:
                # 保存生成記錄
                generation_id = db_service.save_generation_record(
                    prompt=prompt,
                    api_provider='huggingface',
                    model_name=model,
                    image_size=f"{kwargs.get('width', 512)}x{kwargs.get('height', 512)}",
                    image_count=1,
                    settings={'model': model, **kwargs}
                )
                
                # 記錄用戶活動
                user_model.log_activity(
                    request.user['id'],
                    'huggingface_image_generated',
                    {
                        'model': model,
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

@huggingface_bp.route('/generate-text', methods=['POST'])
@require_auth
def generate_text():
    """生成文本"""
    try:
        global huggingface_service
        
        if not huggingface_service:
            return jsonify({
                'success': False,
                'error': '服務尚未配置'
            }), 400
        
        data = request.get_json()
        
        prompt = data.get('prompt', '').strip()
        model = data.get('model', 'flan_t5')
        
        if not prompt:
            return jsonify({
                'success': False,
                'error': '提示詞不能為空'
            }), 400
        
        # 提取其他參數
        kwargs = {
            'max_length': data.get('max_length', 100),
            'temperature': data.get('temperature', 0.7),
            'top_p': data.get('top_p', 0.9),
            'do_sample': data.get('do_sample', True)
        }
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                huggingface_service.generate_text(prompt, model, **kwargs)
            )
            
            if result['success']:
                # 記錄用戶活動
                user_model.log_activity(
                    request.user['id'],
                    'huggingface_text_generated',
                    {
                        'model': model,
                        'prompt_length': len(prompt),
                        'generated_length': len(result.get('generated_text', ''))
                    }
                )
            
            return jsonify(result)
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"文本生成失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'文本生成失敗: {str(e)}'
        }), 500

@huggingface_bp.route('/analyze-image', methods=['POST'])
@require_auth
def analyze_image():
    """分析圖像"""
    try:
        global huggingface_service
        
        if not huggingface_service:
            return jsonify({
                'success': False,
                'error': '服務尚未配置'
            }), 400
        
        # 檢查是否有上傳的文件
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': '沒有上傳圖片文件'
            }), 400
        
        image_file = request.files['image']
        model = request.form.get('model', 'blip')
        
        if image_file.filename == '':
            return jsonify({
                'success': False,
                'error': '沒有選擇文件'
            }), 400
        
        # 保存臨時文件
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as temp_file:
            image_file.save(temp_file.name)
            temp_path = temp_file.name
        
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                result = loop.run_until_complete(
                    huggingface_service.analyze_image(temp_path, model)
                )
                
                if result['success']:
                    # 記錄用戶活動
                    user_model.log_activity(
                        request.user['id'],
                        'huggingface_image_analyzed',
                        {
                            'model': model,
                            'filename': image_file.filename
                        }
                    )
                
                return jsonify(result)
            finally:
                loop.close()
                
        finally:
            # 清理臨時文件
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            
    except Exception as e:
        logger.error(f"圖像分析失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'圖像分析失敗: {str(e)}'
        }), 500

@huggingface_bp.route('/batch-generate-images', methods=['POST'])
@require_auth
def batch_generate_images():
    """批量生成圖像"""
    try:
        global huggingface_service
        
        if not huggingface_service:
            return jsonify({
                'success': False,
                'error': '服務尚未配置'
            }), 400
        
        data = request.get_json()
        
        prompts = data.get('prompts', [])
        model = data.get('model', 'stable_diffusion')
        
        if not prompts or len(prompts) == 0:
            return jsonify({
                'success': False,
                'error': '提示詞列表不能為空'
            }), 400
        
        if len(prompts) > 5:
            return jsonify({
                'success': False,
                'error': '批量生成最多支援 5 個提示詞'
            }), 400
        
        # 提取其他參數
        kwargs = {
            'width': data.get('width', 512),
            'height': data.get('height', 512),
            'num_inference_steps': data.get('num_inference_steps', 20),
            'guidance_scale': data.get('guidance_scale', 7.5)
        }
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                huggingface_service.batch_generate_images(prompts, model, **kwargs)
            )
            
            # 記錄用戶活動
            user_model.log_activity(
                request.user['id'],
                'huggingface_batch_images_generated',
                {
                    'model': model,
                    'prompt_count': len(prompts),
                    'success_count': result['summary']['successful']
                }
            )
            
            return jsonify(result)
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"批量圖像生成失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'批量圖像生成失敗: {str(e)}'
        }), 500

@huggingface_bp.route('/batch-generate-texts', methods=['POST'])
@require_auth
def batch_generate_texts():
    """批量生成文本"""
    try:
        global huggingface_service
        
        if not huggingface_service:
            return jsonify({
                'success': False,
                'error': '服務尚未配置'
            }), 400
        
        data = request.get_json()
        
        prompts = data.get('prompts', [])
        model = data.get('model', 'flan_t5')
        
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
            'max_length': data.get('max_length', 100),
            'temperature': data.get('temperature', 0.7),
            'top_p': data.get('top_p', 0.9)
        }
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                huggingface_service.batch_generate_texts(prompts, model, **kwargs)
            )
            
            # 記錄用戶活動
            user_model.log_activity(
                request.user['id'],
                'huggingface_batch_texts_generated',
                {
                    'model': model,
                    'prompt_count': len(prompts),
                    'success_count': result['summary']['successful']
                }
            )
            
            return jsonify(result)
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"批量文本生成失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'批量文本生成失敗: {str(e)}'
        }), 500

@huggingface_bp.route('/optimize-prompt', methods=['POST'])
@require_auth
def optimize_prompt():
    """優化提示詞"""
    try:
        global huggingface_service
        
        if not huggingface_service:
            return jsonify({
                'success': False,
                'error': '服務尚未配置'
            }), 400
        
        data = request.get_json()
        
        prompt = data.get('prompt', '').strip()
        target_style = data.get('target_style')
        
        if not prompt:
            return jsonify({
                'success': False,
                'error': '提示詞不能為空'
            }), 400
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                huggingface_service.optimize_prompt(prompt, target_style)
            )
            
            if result['success']:
                # 記錄用戶活動
                user_model.log_activity(
                    request.user['id'],
                    'huggingface_prompt_optimized',
                    {
                        'original_length': len(prompt),
                        'target_style': target_style
                    }
                )
            
            return jsonify(result)
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"提示詞優化失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'提示詞優化失敗: {str(e)}'
        }), 500

@huggingface_bp.route('/model-info/<model_name>', methods=['GET'])
@require_auth
def get_model_info(model_name):
    """獲取模型詳細信息"""
    try:
        global huggingface_service
        
        if not huggingface_service:
            return jsonify({
                'success': False,
                'error': '服務尚未配置'
            }), 400
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                huggingface_service.get_model_info(model_name)
            )
            
            return jsonify(result)
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"獲取模型信息失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取模型信息失敗: {str(e)}'
        }), 500

@huggingface_bp.route('/usage-stats', methods=['GET'])
@require_auth
def get_usage_stats():
    """獲取使用統計"""
    try:
        global huggingface_service
        
        if not huggingface_service:
            return jsonify({
                'success': False,
                'error': '服務尚未配置'
            }), 400
        
        stats = huggingface_service.get_usage_stats()
        
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

@huggingface_bp.route('/reset-stats', methods=['POST'])
@require_auth
def reset_usage_stats():
    """重置使用統計"""
    try:
        global huggingface_service
        
        if not huggingface_service:
            return jsonify({
                'success': False,
                'error': '服務尚未配置'
            }), 400
        
        huggingface_service.reset_usage_stats()
        
        # 記錄用戶活動
        user_model.log_activity(
            request.user['id'],
            'huggingface_stats_reset',
            {}
        )
        
        return jsonify({
            'success': True,
            'message': '使用統計已重置'
        })
        
    except Exception as e:
        logger.error(f"重置統計失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'重置統計失敗: {str(e)}'
        }), 500

# 錯誤處理
@huggingface_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': '找不到請求的端點'
    }), 404

@huggingface_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': '服務器內部錯誤'
    }), 500 