"""
AI 智能助手 API 端點 v2.7
增強的 API 端點支援批量處理、翻譯、進階優化等功能
"""

from flask import Blueprint, request, jsonify, session
from functools import wraps
import logging
import asyncio
import json
from typing import Dict, List

# 導入服務
from services.ai_assistant import AIAssistantService
from services.batch_processor import BatchProcessor
from models.user import user_model
from services.database import DatabaseService

logger = logging.getLogger(__name__)

# 創建藍圖
ai_assistant_bp = Blueprint('ai_assistant', __name__)

# 初始化服務
ai_assistant_service = AIAssistantService()
batch_processor = BatchProcessor(max_workers=5, max_concurrent_jobs=3)
db_service = DatabaseService()

def login_required(f):
    """登入驗證裝飾器"""
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
        
        # 設置當前用戶資訊
        request.current_user = result['user']
        return f(*args, **kwargs)
    return decorated_function

@ai_assistant_bp.route('/configure', methods=['POST'])
@login_required
def configure_ai_assistant():
    """配置 AI 助手"""
    try:
        data = request.get_json()
        api_key = data.get('api_key')
        
        if not api_key:
            return jsonify({
                'success': False,
                'error': '缺少 API 金鑰',
                'error_code': 'MISSING_API_KEY'
            }), 400
        
        # 配置 AI 助手
        success = ai_assistant_service.configure(api_key)
        
        if success:
            # 記錄用戶活動
            user_model.log_activity(
                request.current_user['id'],
                'ai_assistant_configured',
                {'api_key_configured': True}
            )
            
            return jsonify({
                'success': True,
                'message': 'AI 助手配置成功',
                'version': 'v2.7'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'API 金鑰配置失敗',
                'error_code': 'CONFIG_FAILED'
            }), 400
            
    except Exception as e:
        logger.error(f"AI 助手配置錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'配置失敗: {str(e)}',
            'error_code': 'CONFIG_ERROR'
        }), 500

@ai_assistant_bp.route('/enhance-prompt', methods=['POST'])
@login_required
def enhance_prompt():
    """增強提示詞 (v2.7 增強版)"""
    try:
        data = request.get_json()
        user_prompt = data.get('prompt', '').strip()
        style = data.get('style')
        target_language = data.get('target_language', 'en')
        complexity = data.get('complexity', 'moderate')
        
        if not user_prompt:
            return jsonify({
                'success': False,
                'error': '提示詞不能為空',
                'error_code': 'EMPTY_PROMPT'
            }), 400
        
        # 使用 asyncio 運行異步函數
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                ai_assistant_service.enhance_prompt(
                    user_prompt, style, target_language, complexity
                )
            )
        finally:
            loop.close()
        
        if result['success']:
            # 記錄用戶活動
            user_model.log_activity(
                request.current_user['id'],
                'prompt_enhanced',
                {
                    'original_length': len(user_prompt),
                    'style': style,
                    'complexity': complexity,
                    'target_language': target_language
                }
            )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"提示詞增強錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'提示詞增強失敗: {str(e)}',
            'error_code': 'ENHANCE_ERROR'
        }), 500

@ai_assistant_bp.route('/batch-optimize', methods=['POST'])
@login_required
def batch_optimize_prompts():
    """批量優化提示詞 (v2.7 新功能)"""
    try:
        data = request.get_json()
        prompts_list = data.get('prompts', [])
        
        if not prompts_list or len(prompts_list) == 0:
            return jsonify({
                'success': False,
                'error': '提示詞列表不能為空',
                'error_code': 'EMPTY_PROMPTS_LIST'
            }), 400
        
        if len(prompts_list) > 50:
            return jsonify({
                'success': False,
                'error': '批量處理最多支援 50 個提示詞',
                'error_code': 'TOO_MANY_PROMPTS'
            }), 400
        
        # 使用 asyncio 運行異步函數
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                ai_assistant_service.batch_optimize_prompts(prompts_list)
            )
        finally:
            loop.close()
        
        if result['success']:
            # 記錄用戶活動
            user_model.log_activity(
                request.current_user['id'],
                'batch_optimization',
                {
                    'total_prompts': len(prompts_list),
                    'success_rate': result.get('success_rate', 0),
                    'batch_id': result.get('batch_id')
                }
            )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"批量優化錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'批量優化失敗: {str(e)}',
            'error_code': 'BATCH_OPTIMIZE_ERROR'
        }), 500

@ai_assistant_bp.route('/translate-prompt', methods=['POST'])
@login_required
def translate_prompt():
    """翻譯提示詞 (v2.7 新功能)"""
    try:
        data = request.get_json()
        prompt = data.get('prompt', '').strip()
        target_language = data.get('target_language', 'en')
        preserve_technical_terms = data.get('preserve_technical_terms', True)
        
        if not prompt:
            return jsonify({
                'success': False,
                'error': '提示詞不能為空',
                'error_code': 'EMPTY_PROMPT'
            }), 400
        
        # 使用 asyncio 運行異步函數
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                ai_assistant_service.translate_prompt(
                    prompt, target_language, preserve_technical_terms
                )
            )
        finally:
            loop.close()
        
        if result['success']:
            # 記錄用戶活動
            user_model.log_activity(
                request.current_user['id'],
                'prompt_translated',
                {
                    'source_length': len(prompt),
                    'target_language': target_language,
                    'preserve_technical_terms': preserve_technical_terms
                }
            )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"提示詞翻譯錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'提示詞翻譯失敗: {str(e)}',
            'error_code': 'TRANSLATE_ERROR'
        }), 500

@ai_assistant_bp.route('/style-recommendations', methods=['POST'])
@login_required
def get_style_recommendations():
    """獲取風格推薦 (v2.7 增強版)"""
    try:
        data = request.get_json()
        user_input = data.get('input', '').strip()
        mood = data.get('mood')
        genre = data.get('genre')
        
        if not user_input:
            return jsonify({
                'success': False,
                'error': '輸入描述不能為空',
                'error_code': 'EMPTY_INPUT'
            }), 400
        
        # 使用 asyncio 運行異步函數
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                ai_assistant_service.get_style_recommendations(
                    user_input, mood, genre
                )
            )
        finally:
            loop.close()
        
        if result['success']:
            # 記錄用戶活動
            user_model.log_activity(
                request.current_user['id'],
                'style_recommendations',
                {
                    'input_length': len(user_input),
                    'mood': mood,
                    'genre': genre
                }
            )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"風格推薦錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'風格推薦失敗: {str(e)}',
            'error_code': 'STYLE_RECOMMENDATIONS_ERROR'
        }), 500

@ai_assistant_bp.route('/contextual-optimize', methods=['POST'])
@login_required
def contextual_optimize():
    """基於上下文優化提示詞 (v2.7 高級功能)"""
    try:
        data = request.get_json()
        prompt = data.get('prompt', '').strip()
        context = data.get('context', {})
        reference_images = data.get('reference_images', [])
        
        if not prompt:
            return jsonify({
                'success': False,
                'error': '提示詞不能為空',
                'error_code': 'EMPTY_PROMPT'
            }), 400
        
        # 限制參考圖片數量
        if len(reference_images) > 3:
            reference_images = reference_images[:3]
        
        # 使用 asyncio 運行異步函數
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                ai_assistant_service.optimize_prompt_with_context(
                    prompt, context, reference_images
                )
            )
        finally:
            loop.close()
        
        if result['success']:
            # 記錄用戶活動
            user_model.log_activity(
                request.current_user['id'],
                'contextual_optimization',
                {
                    'prompt_length': len(prompt),
                    'has_context': bool(context),
                    'reference_images_count': len(reference_images)
                }
            )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"上下文優化錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'上下文優化失敗: {str(e)}',
            'error_code': 'CONTEXTUAL_OPTIMIZE_ERROR'
        }), 500

@ai_assistant_bp.route('/optimization-history', methods=['GET'])
@login_required
def get_optimization_history():
    """獲取優化歷史記錄 (v2.7 新功能)"""
    try:
        limit = request.args.get('limit', 50, type=int)
        limit = min(limit, 100)  # 最大限制 100 條
        
        result = ai_assistant_service.get_optimization_history(limit)
        
        # 記錄用戶活動
        user_model.log_activity(
            request.current_user['id'],
            'view_optimization_history',
            {'limit': limit}
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"獲取優化歷史錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取優化歷史失敗: {str(e)}',
            'error_code': 'HISTORY_ERROR'
        }), 500

@ai_assistant_bp.route('/performance-analytics', methods=['GET'])
@login_required
def get_performance_analytics():
    """獲取性能分析 (v2.7 新功能)"""
    try:
        result = ai_assistant_service.get_performance_analytics()
        
        # 記錄用戶活動
        user_model.log_activity(
            request.current_user['id'],
            'view_performance_analytics',
            {}
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"獲取性能分析錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取性能分析失敗: {str(e)}',
            'error_code': 'ANALYTICS_ERROR'
        }), 500

@ai_assistant_bp.route('/clear-cache', methods=['POST'])
@login_required
def clear_cache():
    """清除緩存 (v2.7 新功能)"""
    try:
        result = ai_assistant_service.clear_cache()
        
        # 記錄用戶活動
        user_model.log_activity(
            request.current_user['id'],
            'cache_cleared',
            {'cleared_items': result.get('cleared_items', {})}
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"清除緩存錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'清除緩存失敗: {str(e)}',
            'error_code': 'CLEAR_CACHE_ERROR'
        }), 500

@ai_assistant_bp.route('/export-data', methods=['GET'])
@login_required  
def export_optimization_data():
    """導出優化數據 (v2.7 新功能)"""
    try:
        format_type = request.args.get('format', 'json')
        
        if format_type not in ['json', 'csv']:
            return jsonify({
                'success': False,
                'error': '不支援的導出格式',
                'error_code': 'INVALID_FORMAT'
            }), 400
        
        result = ai_assistant_service.export_optimization_data(format_type)
        
        if result['success']:
            # 記錄用戶活動
            user_model.log_activity(
                request.current_user['id'],
                'data_exported',
                {
                    'format': format_type,
                    'data_size': result.get('data_size', 0)
                }
            )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"數據導出錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'數據導出失敗: {str(e)}',
            'error_code': 'EXPORT_ERROR'
        }), 500

# 批量處理相關端點

@ai_assistant_bp.route('/batch/create-job', methods=['POST'])
@login_required
def create_batch_job():
    """創建批量作業 (v2.7 新功能)"""
    try:
        data = request.get_json()
        name = data.get('name', f"批量作業_{request.current_user['username']}")
        tasks_data = data.get('tasks', [])
        concurrent_limit = data.get('concurrent_limit', 3)
        auto_retry_failed = data.get('auto_retry_failed', True)
        pause_on_error = data.get('pause_on_error', False)
        
        if not tasks_data:
            return jsonify({
                'success': False,
                'error': '任務列表不能為空',
                'error_code': 'EMPTY_TASKS'
            }), 400
        
        if len(tasks_data) > 100:
            return jsonify({
                'success': False,
                'error': '批量作業最多支援 100 個任務',
                'error_code': 'TOO_MANY_TASKS'
            }), 400
        
        # 註冊任務處理器（如果尚未註冊）
        if 'prompt_optimization' not in batch_processor.task_processors:
            async def prompt_optimization_processor(task_data):
                return await ai_assistant_service.enhance_prompt(
                    task_data.get('prompt', ''),
                    task_data.get('style'),
                    task_data.get('target_language', 'en'),
                    task_data.get('complexity', 'moderate')
                )
            
            batch_processor.register_task_processor('prompt_optimization', prompt_optimization_processor)
        
        # 創建批量作業
        job_id = batch_processor.create_job(
            name, tasks_data, concurrent_limit, auto_retry_failed, pause_on_error
        )
        
        # 記錄用戶活動
        user_model.log_activity(
            request.current_user['id'],
            'batch_job_created',
            {
                'job_id': job_id,
                'task_count': len(tasks_data),
                'concurrent_limit': concurrent_limit
            }
        )
        
        return jsonify({
            'success': True,
            'job_id': job_id,
            'message': f'批量作業已創建，包含 {len(tasks_data)} 個任務'
        })
        
    except Exception as e:
        logger.error(f"創建批量作業錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'創建批量作業失敗: {str(e)}',
            'error_code': 'CREATE_JOB_ERROR'
        }), 500

@ai_assistant_bp.route('/batch/start-job/<job_id>', methods=['POST'])
@login_required
def start_batch_job(job_id):
    """啟動批量作業"""
    try:
        result = batch_processor.start_job(job_id)
        
        if result['success']:
            # 記錄用戶活動
            user_model.log_activity(
                request.current_user['id'],
                'batch_job_started',
                {'job_id': job_id}
            )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"啟動批量作業錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'啟動批量作業失敗: {str(e)}',
            'error_code': 'START_JOB_ERROR'
        }), 500

@ai_assistant_bp.route('/batch/job-status/<job_id>', methods=['GET'])
@login_required
def get_batch_job_status(job_id):
    """獲取批量作業狀態"""
    try:
        result = batch_processor.get_job_status(job_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"獲取作業狀態錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取作業狀態失敗: {str(e)}',
            'error_code': 'JOB_STATUS_ERROR'
        }), 500

@ai_assistant_bp.route('/batch/pause-job/<job_id>', methods=['POST'])
@login_required
def pause_batch_job(job_id):
    """暫停批量作業"""
    try:
        result = batch_processor.pause_job(job_id)
        
        if result['success']:
            # 記錄用戶活動
            user_model.log_activity(
                request.current_user['id'],
                'batch_job_paused',
                {'job_id': job_id}
            )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"暫停批量作業錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'暫停批量作業失敗: {str(e)}',
            'error_code': 'PAUSE_JOB_ERROR'
        }), 500

@ai_assistant_bp.route('/batch/resume-job/<job_id>', methods=['POST'])
@login_required
def resume_batch_job(job_id):
    """恢復批量作業"""
    try:
        result = batch_processor.resume_job(job_id)
        
        if result['success']:
            # 記錄用戶活動
            user_model.log_activity(
                request.current_user['id'],
                'batch_job_resumed',
                {'job_id': job_id}
            )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"恢復批量作業錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'恢復批量作業失敗: {str(e)}',
            'error_code': 'RESUME_JOB_ERROR'
        }), 500

@ai_assistant_bp.route('/batch/cancel-job/<job_id>', methods=['POST'])
@login_required
def cancel_batch_job(job_id):
    """取消批量作業"""
    try:
        result = batch_processor.cancel_job(job_id)
        
        if result['success']:
            # 記錄用戶活動
            user_model.log_activity(
                request.current_user['id'],
                'batch_job_cancelled',
                {'job_id': job_id}
            )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"取消批量作業錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'取消批量作業失敗: {str(e)}',
            'error_code': 'CANCEL_JOB_ERROR'
        }), 500

@ai_assistant_bp.route('/batch/system-stats', methods=['GET'])
@login_required
def get_batch_system_stats():
    """獲取批量處理系統統計"""
    try:
        result = batch_processor.get_system_stats()
        
        # 記錄用戶活動
        user_model.log_activity(
            request.current_user['id'],
            'view_batch_stats',
            {}
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"獲取系統統計錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取系統統計失敗: {str(e)}',
            'error_code': 'SYSTEM_STATS_ERROR'
        }), 500

@ai_assistant_bp.route('/status', methods=['GET'])
@login_required
def get_ai_assistant_status():
    """獲取 AI 助手狀態"""
    try:
        usage_stats = ai_assistant_service.get_usage_stats()
        batch_stats = batch_processor.get_system_stats()
        
        return jsonify({
            'success': True,
            'ai_assistant': {
                'version': 'v2.7',
                'configured': usage_stats['is_configured'],
                'usage_stats': usage_stats
            },
            'batch_processor': {
                'status': batch_stats['system_status'],
                'statistics': batch_stats['statistics'],
                'performance': batch_stats['performance_metrics']
            }
        })
        
    except Exception as e:
        logger.error(f"獲取狀態錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取狀態失敗: {str(e)}',
            'error_code': 'STATUS_ERROR'
        }), 500 