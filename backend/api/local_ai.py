"""
本地 AI API 端點 v2.8
提供本地 AI 模型的 REST API 接口
"""

from flask import Blueprint, request, jsonify, Response, stream_template
from services.local_ai_service import LocalAIService

# 初始化服務
local_ai_service = LocalAIService()
from models.user import user_model
from functools import wraps
import asyncio
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# 創建藍圖
local_ai_bp = Blueprint('local_ai', __name__, url_prefix='/api/local-ai')

def require_auth(f):
    """認證裝飾器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': '需要認證'}), 401
        
        token = auth_header.split(' ')[1]
        user_info = user_model.validate_session(token)
        
        if not user_info.get('success'):
            return jsonify({'error': '無效的認證令牌'}), 401
        
        request.user = user_info
        return f(*args, **kwargs)
    
    return decorated_function

@local_ai_bp.route('/status', methods=['GET'])
@require_auth
def get_status():
    """獲取本地 AI 服務狀態"""
    try:
        # 執行異步操作
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        # 初始化服務（如果尚未初始化）
        if not hasattr(local_ai_service, '_initialized'):
            initialization_result = loop.run_until_complete(local_ai_service.initialize())
            local_ai_service._initialized = True
        
        status = local_ai_service.get_service_status()
        
        return jsonify({
            'success': True,
            'data': status,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"獲取本地 AI 狀態失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取狀態失敗: {str(e)}'
        }), 500
    finally:
        loop.close()

@local_ai_bp.route('/models', methods=['GET'])
@require_auth
def get_models():
    """獲取可用模型列表"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        models = loop.run_until_complete(local_ai_service.get_available_models())
        
        return jsonify({
            'success': True,
            'data': {
                'models': models,
                'count': len(models)
            }
        })
        
    except Exception as e:
        logger.error(f"獲取模型列表失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取模型列表失敗: {str(e)}'
        }), 500
    finally:
        loop.close()

@local_ai_bp.route('/models/download', methods=['POST'])
@require_auth
def download_model():
    """下載模型（流式響應）"""
    try:
        data = request.get_json()
        model_name = data.get('model_name')
        
        if not model_name:
            return jsonify({
                'success': False,
                'error': '缺少模型名稱參數'
            }), 400
        
        def generate_download_progress():
            """生成下載進度的流式響應"""
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                async def download_generator():
                    async for progress in local_ai_service.download_model(model_name):
                        yield f"data: {json.dumps(progress)}\n\n"
                
                # 執行異步生成器
                async_gen = download_generator()
                
                while True:
                    try:
                        chunk = loop.run_until_complete(async_gen.__anext__())
                        yield chunk
                    except StopAsyncIteration:
                        break
                        
            except Exception as e:
                yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"
            finally:
                loop.close()
        
        return Response(
            generate_download_progress(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        )
        
    except Exception as e:
        logger.error(f"下載模型失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'下載模型失敗: {str(e)}'
        }), 500

@local_ai_bp.route('/models/remove', methods=['DELETE'])
@require_auth
def remove_model():
    """移除模型"""
    try:
        data = request.get_json()
        model_name = data.get('model_name')
        
        if not model_name:
            return jsonify({
                'success': False,
                'error': '缺少模型名稱參數'
            }), 400
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        success = loop.run_until_complete(local_ai_service.remove_model(model_name))
        
        if success:
            return jsonify({
                'success': True,
                'message': f'模型 {model_name} 已成功移除'
            })
        else:
            return jsonify({
                'success': False,
                'error': '移除模型失敗'
            }), 500
            
    except Exception as e:
        logger.error(f"移除模型失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'移除模型失敗: {str(e)}'
        }), 500
    finally:
        loop.close()

@local_ai_bp.route('/generate', methods=['POST'])
@require_auth
def generate_text():
    """生成文本回應"""
    try:
        data = request.get_json()
        
        model_name = data.get('model_name')
        prompt = data.get('prompt')
        system_prompt = data.get('system_prompt')
        temperature = data.get('temperature', 0.7)
        max_tokens = data.get('max_tokens')
        stream = data.get('stream', False)
        
        if not model_name or not prompt:
            return jsonify({
                'success': False,
                'error': '缺少必要參數: model_name 和 prompt'
            }), 400
        
        if stream:
            # 流式響應
            def generate_stream():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                try:
                    async def response_generator():
                        async for chunk in local_ai_service.generate_response(
                            model_name=model_name,
                            prompt=prompt,
                            system_prompt=system_prompt,
                            temperature=temperature,
                            max_tokens=max_tokens,
                            stream=True
                        ):
                            yield f"data: {json.dumps(chunk)}\n\n"
                    
                    async_gen = response_generator()
                    
                    while True:
                        try:
                            chunk = loop.run_until_complete(async_gen.__anext__())
                            yield chunk
                        except StopAsyncIteration:
                            break
                            
                except Exception as e:
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
                finally:
                    loop.close()
            
            return Response(
                generate_stream(),
                mimetype='text/event-stream',
                headers={
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                }
            )
        else:
            # 非流式響應
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            response_data = None
            async def get_response():
                nonlocal response_data
                async for chunk in local_ai_service.generate_response(
                    model_name=model_name,
                    prompt=prompt,
                    system_prompt=system_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=False
                ):
                    response_data = chunk
                    break
            
            loop.run_until_complete(get_response())
            
            if response_data and 'error' not in response_data:
                return jsonify({
                    'success': True,
                    'data': response_data
                })
            else:
                return jsonify({
                    'success': False,
                    'error': response_data.get('error', '生成失敗') if response_data else '生成失敗'
                }), 500
                
    except Exception as e:
        logger.error(f"生成文本失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'生成文本失敗: {str(e)}'
        }), 500
    finally:
        if 'loop' in locals():
            loop.close()

@local_ai_bp.route('/analyze-image', methods=['POST'])
@require_auth
def analyze_image():
    """分析圖片"""
    try:
        # 檢查是否有上傳的文件
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': '沒有上傳圖片文件'
            }), 400
        
        image_file = request.files['image']
        model_name = request.form.get('model_name', 'llava:7b')
        question = request.form.get('question', '請描述這張圖片')
        
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
            
            result = loop.run_until_complete(
                local_ai_service.analyze_image(model_name, temp_path, question)
            )
            
            if result.get('success'):
                return jsonify({
                    'success': True,
                    'data': result
                })
            else:
                return jsonify({
                    'success': False,
                    'error': result.get('error', '圖片分析失敗')
                }), 500
                
        finally:
            # 清理臨時文件
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            loop.close()
            
    except Exception as e:
        logger.error(f"圖片分析失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'圖片分析失敗: {str(e)}'
        }), 500

@local_ai_bp.route('/enhance-prompt', methods=['POST'])
@require_auth
def enhance_prompt():
    """使用本地模型增強提示詞"""
    try:
        data = request.get_json()
        
        original_prompt = data.get('prompt')
        style = data.get('style', 'detailed')
        
        if not original_prompt:
            return jsonify({
                'success': False,
                'error': '缺少提示詞參數'
            }), 400
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        result = loop.run_until_complete(
            local_ai_service.enhance_prompt_locally(original_prompt, style)
        )
        
        if result.get('success'):
            return jsonify({
                'success': True,
                'data': result
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', '提示詞增強失敗')
            }), 500
            
    except Exception as e:
        logger.error(f"提示詞增強失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'提示詞增強失敗: {str(e)}'
        }), 500
    finally:
        loop.close()

@local_ai_bp.route('/chat', methods=['POST'])
@require_auth
def chat():
    """聊天對話接口"""
    try:
        data = request.get_json()
        
        model_name = data.get('model_name')
        message = data.get('message')
        conversation_history = data.get('history', [])
        stream = data.get('stream', False)
        
        if not model_name or not message:
            return jsonify({
                'success': False,
                'error': '缺少必要參數: model_name 和 message'
            }), 400
        
        # 構建對話提示詞
        prompt_parts = []
        
        # 添加歷史對話
        for turn in conversation_history[-10:]:  # 只保留最近10輪對話
            if turn.get('role') == 'user':
                prompt_parts.append(f"用戶: {turn.get('content', '')}")
            elif turn.get('role') == 'assistant':
                prompt_parts.append(f"助手: {turn.get('content', '')}")
        
        # 添加當前消息
        prompt_parts.append(f"用戶: {message}")
        prompt_parts.append("助手: ")
        
        full_prompt = "\n".join(prompt_parts)
        
        system_prompt = """你是一個友善、樂於助人的 AI 助手。請用繁體中文回答用戶的問題。
保持回答簡潔明了，並根據上下文提供相關和有用的信息。"""
        
        if stream:
            # 流式響應
            def generate_chat_stream():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                try:
                    async def chat_generator():
                        async for chunk in local_ai_service.generate_response(
                            model_name=model_name,
                            prompt=full_prompt,
                            system_prompt=system_prompt,
                            temperature=0.7,
                            stream=True
                        ):
                            yield f"data: {json.dumps(chunk)}\n\n"
                    
                    async_gen = chat_generator()
                    
                    while True:
                        try:
                            chunk = loop.run_until_complete(async_gen.__anext__())
                            yield chunk
                        except StopAsyncIteration:
                            break
                            
                except Exception as e:
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
                finally:
                    loop.close()
            
            return Response(
                generate_chat_stream(),
                mimetype='text/event-stream',
                headers={
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                }
            )
        else:
            # 非流式響應
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            response_data = None
            async def get_chat_response():
                nonlocal response_data
                async for chunk in local_ai_service.generate_response(
                    model_name=model_name,
                    prompt=full_prompt,
                    system_prompt=system_prompt,
                    temperature=0.7,
                    stream=False
                ):
                    response_data = chunk
                    break
            
            loop.run_until_complete(get_chat_response())
            
            if response_data and 'error' not in response_data:
                return jsonify({
                    'success': True,
                    'data': {
                        'message': response_data.get('response', ''),
                        'model': model_name,
                        'timestamp': datetime.now().isoformat()
                    }
                })
            else:
                return jsonify({
                    'success': False,
                    'error': response_data.get('error', '對話生成失敗') if response_data else '對話生成失敗'
                }), 500
                
    except Exception as e:
        logger.error(f"聊天對話失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'聊天對話失敗: {str(e)}'
        }), 500
    finally:
        if 'loop' in locals():
            loop.close()

@local_ai_bp.route('/system-info', methods=['GET'])
@require_auth
def get_system_info():
    """獲取系統信息"""
    try:
        import platform
        import sys
        
        system_info = {
            'platform': platform.platform(),
            'python_version': sys.version,
            'cpu_count': psutil.cpu_count(),
            'memory': local_ai_service._get_memory_usage(),
            'disk_usage': {
                'total': psutil.disk_usage('/').total / (1024**3),
                'free': psutil.disk_usage('/').free / (1024**3),
                'used_percent': (psutil.disk_usage('/').used / psutil.disk_usage('/').total) * 100
            }
        }
        
        return jsonify({
            'success': True,
            'data': system_info
        })
        
    except Exception as e:
        logger.error(f"獲取系統信息失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取系統信息失敗: {str(e)}'
        }), 500

@local_ai_bp.route('/initialize', methods=['POST'])
@require_auth
def initialize_service():
    """初始化本地 AI 服務"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        success = loop.run_until_complete(local_ai_service.initialize())
        local_ai_service._initialized = True
        
        return jsonify({
            'success': success,
            'message': '本地 AI 服務初始化完成' if success else '本地 AI 服務初始化失敗',
            'status': local_ai_service.get_service_status()
        })
        
    except Exception as e:
        logger.error(f"初始化服務失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'初始化服務失敗: {str(e)}'
        }), 500
    finally:
        loop.close()

@local_ai_bp.route('/cleanup', methods=['POST'])
@require_auth
def cleanup_service():
    """清理服務資源"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        loop.run_until_complete(local_ai_service.cleanup())
        
        return jsonify({
            'success': True,
            'message': '服務資源清理完成'
        })
        
    except Exception as e:
        logger.error(f"清理服務失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'清理服務失敗: {str(e)}'
        }), 500
    finally:
        loop.close()

# 錯誤處理
@local_ai_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': '找不到請求的端點'
    }), 404

@local_ai_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': '服務器內部錯誤'
    }), 500 