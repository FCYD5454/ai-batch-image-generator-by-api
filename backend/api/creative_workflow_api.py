"""
創意工作流 API 端點 v3.0
提供 AI驅動創意工作流的 REST API 接口
"""

from flask import Blueprint, request, jsonify, send_file
from functools import wraps
import logging
import asyncio
import json
from datetime import datetime
import os
import tempfile
from typing import List, Dict, Any

# 導入服務
from services.creative_workflow_service import (
    CreativeWorkflowService, CreativeStyle, WorkflowStage, 
    get_creative_workflow_service
)
from models.user import user_model
from services.database import DatabaseService

logger = logging.getLogger(__name__)

# 創建藍圖
creative_workflow_bp = Blueprint('creative_workflow', __name__, url_prefix='/api/creative-workflow')

# 初始化服務
creative_service = get_creative_workflow_service()
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

@creative_workflow_bp.route('/status', methods=['GET'])
@require_auth
def get_creative_workflow_status():
    """獲取創意工作流服務狀態"""
    try:
        # 獲取服務統計
        stats = creative_service.get_stats()
        
        # 記錄用戶活動
        db_service.log_user_activity(
            request.current_user['id'],
            'creative_workflow_status_check',
            {'timestamp': datetime.now().isoformat()}
        )
        
        return jsonify({
            'success': True,
            'stats': stats,
            'user_id': request.current_user['id'],
            'service_version': '3.0'
        })
        
    except Exception as e:
        logger.error(f"獲取創意工作流狀態失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@creative_workflow_bp.route('/projects', methods=['POST'])
@require_auth
def create_project():
    """創建新的創意項目"""
    try:
        data = request.get_json()
        
        if not data or 'name' not in data:
            return jsonify({'success': False, 'error': '缺少項目名稱'}), 400
        
        name = data['name']
        description = data.get('description', '')
        template_id = data.get('template_id')
        team_id = data.get('team_id')
        style_requirements = data.get('style_requirements', {})
        brand_guidelines = data.get('brand_guidelines', {})
        
        # 創建項目
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(
            creative_service.create_project(
                name=name,
                description=description,
                owner_id=request.current_user['id'],
                template_id=template_id,
                team_id=team_id,
                style_requirements=style_requirements,
                brand_guidelines=brand_guidelines
            )
        )
        loop.close()
        
        if result['success']:
            # 記錄用戶活動
            db_service.log_user_activity(
                request.current_user['id'],
                'creative_project_created',
                {
                    'project_id': result['project_id'],
                    'template_id': template_id,
                    'timestamp': datetime.now().isoformat()
                }
            )
            
            logger.info(f"用戶 {request.current_user['username']} 創建創意項目: {name}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"創建創意項目失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@creative_workflow_bp.route('/projects/<project_id>', methods=['GET'])
@require_auth
def get_project(project_id):
    """獲取創意項目詳情"""
    try:
        # 從數據庫獲取項目信息
        project_data = db_service.get_creative_project(project_id)
        if not project_data:
            return jsonify({'success': False, 'error': '項目不存在'}), 404
        
        # 檢查權限（項目所有者或團隊成員）
        if (project_data['owner_id'] != request.current_user['id'] and 
            not db_service.is_team_member(project_data.get('team_id'), request.current_user['id'])):
            return jsonify({'success': False, 'error': '沒有訪問權限'}), 403
        
        # 獲取模板信息（如果有）
        template = None
        if project_data.get('template_id'):
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            template = loop.run_until_complete(
                creative_service.get_template(project_data['template_id'])
            )
            loop.close()
        
        # 記錄用戶活動
        db_service.log_user_activity(
            request.current_user['id'],
            'creative_project_viewed',
            {
                'project_id': project_id,
                'timestamp': datetime.now().isoformat()
            }
        )
        
        return jsonify({
            'success': True,
            'project': project_data,
            'template': template.__dict__ if template else None
        })
        
    except Exception as e:
        logger.error(f"獲取創意項目失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@creative_workflow_bp.route('/projects/<project_id>/analyze-style', methods=['POST'])
@require_auth
def analyze_project_style(project_id):
    """分析項目圖像風格一致性"""
    try:
        data = request.get_json()
        
        if not data or 'image_paths' not in data:
            return jsonify({'success': False, 'error': '缺少圖像路徑列表'}), 400
        
        image_paths = data['image_paths']
        reference_style = data.get('reference_style')
        
        if not image_paths:
            return jsonify({'success': False, 'error': '圖像路徑列表不能為空'}), 400
        
        # 檢查項目權限
        project_data = db_service.get_creative_project(project_id)
        if not project_data:
            return jsonify({'success': False, 'error': '項目不存在'}), 404
        
        if (project_data['owner_id'] != request.current_user['id'] and 
            not db_service.is_team_member(project_data.get('team_id'), request.current_user['id'])):
            return jsonify({'success': False, 'error': '沒有訪問權限'}), 403
        
        # 執行風格分析
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        analysis_result = loop.run_until_complete(
            creative_service.analyze_style_consistency(image_paths, reference_style)
        )
        loop.close()
        
        if analysis_result['success']:
            # 保存分析結果到項目
            db_service.save_style_analysis(project_id, analysis_result)
            
            # 記錄用戶活動
            db_service.log_user_activity(
                request.current_user['id'],
                'creative_style_analysis',
                {
                    'project_id': project_id,
                    'image_count': len(image_paths),
                    'consistency_score': analysis_result['consistency_score'],
                    'timestamp': datetime.now().isoformat()
                }
            )
            
            logger.info(f"用戶 {request.current_user['username']} 完成風格分析: 項目 {project_id}")
        
        return jsonify(analysis_result)
        
    except Exception as e:
        logger.error(f"風格分析失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@creative_workflow_bp.route('/projects/<project_id>/suggestions', methods=['POST'])
@require_auth
def generate_creative_suggestions(project_id):
    """為項目生成創意建議"""
    try:
        data = request.get_json() or {}
        
        # 檢查項目權限
        project_data = db_service.get_creative_project(project_id)
        if not project_data:
            return jsonify({'success': False, 'error': '項目不存在'}), 404
        
        if (project_data['owner_id'] != request.current_user['id'] and 
            not db_service.is_team_member(project_data.get('team_id'), request.current_user['id'])):
            return jsonify({'success': False, 'error': '沒有訪問權限'}), 403
        
        # 獲取項目風格和需求
        style_str = data.get('style', 'photorealistic')
        try:
            style = CreativeStyle(style_str)
        except ValueError:
            style = CreativeStyle.PHOTOREALISTIC
        
        requirements = data.get('requirements', {})
        requirements.update(project_data.get('style_requirements', {}))
        
        # 生成建議
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        suggestions = loop.run_until_complete(
            creative_service.generate_creative_suggestions(project_id, style, requirements)
        )
        loop.close()
        
        # 保存建議到項目
        db_service.save_creative_suggestions(project_id, suggestions)
        
        # 記錄用戶活動
        db_service.log_user_activity(
            request.current_user['id'],
            'creative_suggestions_generated',
            {
                'project_id': project_id,
                'style': style.value,
                'suggestion_count': len(suggestions),
                'timestamp': datetime.now().isoformat()
            }
        )
        
        logger.info(f"用戶 {request.current_user['username']} 生成創意建議: 項目 {project_id}")
        
        return jsonify({
            'success': True,
            'suggestions': suggestions,
            'project_id': project_id,
            'style': style.value
        })
        
    except Exception as e:
        logger.error(f"生成創意建議失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@creative_workflow_bp.route('/templates', methods=['GET'])
@require_auth
def list_templates():
    """獲取創意模板列表"""
    try:
        category = request.args.get('category')
        style = request.args.get('style')
        
        # 獲取預定義模板
        templates = creative_service.predefined_templates
        
        # 過濾模板
        filtered_templates = []
        for template in templates:
            if category and template.category != category:
                continue
            if style and template.style.value != style:
                continue
            
            # 轉換為字典格式
            template_dict = {
                'template_id': template.template_id,
                'name': template.name,
                'description': template.description,
                'category': template.category,
                'style': template.style.value,
                'popularity_score': template.popularity_score,
                'use_cases': template.use_cases,
                'target_audience': template.target_audience
            }
            filtered_templates.append(template_dict)
        
        # 按熱度排序
        filtered_templates.sort(key=lambda x: x['popularity_score'], reverse=True)
        
        # 記錄用戶活動
        db_service.log_user_activity(
            request.current_user['id'],
            'creative_templates_viewed',
            {
                'filter_category': category,
                'filter_style': style,
                'template_count': len(filtered_templates),
                'timestamp': datetime.now().isoformat()
            }
        )
        
        return jsonify({
            'success': True,
            'templates': filtered_templates,
            'total_count': len(filtered_templates),
            'available_categories': list(set(t.category for t in templates)),
            'available_styles': [s.value for s in CreativeStyle]
        })
        
    except Exception as e:
        logger.error(f"獲取模板列表失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@creative_workflow_bp.route('/templates/<template_id>', methods=['GET'])
@require_auth
def get_template(template_id):
    """獲取特定模板詳情"""
    try:
        # 獲取模板
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        template = loop.run_until_complete(
            creative_service.get_template(template_id)
        )
        loop.close()
        
        if not template:
            return jsonify({'success': False, 'error': '模板不存在'}), 404
        
        # 轉換為字典格式
        template_dict = {
            'template_id': template.template_id,
            'name': template.name,
            'description': template.description,
            'category': template.category,
            'style': template.style.value,
            'base_prompt': template.base_prompt,
            'parameters': template.parameters,
            'style_guidelines': template.style_guidelines,
            'workflow_stages': [stage.value for stage in template.workflow_stages],
            'target_audience': template.target_audience,
            'use_cases': template.use_cases,
            'popularity_score': template.popularity_score,
            'created_at': template.created_at.isoformat()
        }
        
        # 記錄用戶活動
        db_service.log_user_activity(
            request.current_user['id'],
            'creative_template_viewed',
            {
                'template_id': template_id,
                'timestamp': datetime.now().isoformat()
            }
        )
        
        return jsonify({
            'success': True,
            'template': template_dict
        })
        
    except Exception as e:
        logger.error(f"獲取模板詳情失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@creative_workflow_bp.route('/projects/<project_id>/workflow/advance', methods=['POST'])
@require_auth
def advance_workflow(project_id):
    """推進項目工作流階段"""
    try:
        data = request.get_json()
        
        if not data or 'next_stage' not in data:
            return jsonify({'success': False, 'error': '缺少下一階段信息'}), 400
        
        next_stage_str = data['next_stage']
        comment = data.get('comment', '')
        
        try:
            next_stage = WorkflowStage(next_stage_str)
        except ValueError:
            return jsonify({'success': False, 'error': f'無效的工作流階段: {next_stage_str}'}), 400
        
        # 檢查項目權限
        project_data = db_service.get_creative_project(project_id)
        if not project_data:
            return jsonify({'success': False, 'error': '項目不存在'}), 404
        
        if (project_data['owner_id'] != request.current_user['id'] and 
            not db_service.is_team_member(project_data.get('team_id'), request.current_user['id'])):
            return jsonify({'success': False, 'error': '沒有訪問權限'}), 403
        
        # 更新工作流階段
        workflow_entry = {
            'stage': next_stage.value,
            'timestamp': datetime.now().isoformat(),
            'action': 'stage_advanced',
            'user_id': request.current_user['id'],
            'comment': comment
        }
        
        success = db_service.advance_project_workflow(project_id, next_stage.value, workflow_entry)
        
        if success:
            # 記錄用戶活動
            db_service.log_user_activity(
                request.current_user['id'],
                'creative_workflow_advanced',
                {
                    'project_id': project_id,
                    'new_stage': next_stage.value,
                    'comment': comment,
                    'timestamp': datetime.now().isoformat()
                }
            )
            
            logger.info(f"用戶 {request.current_user['username']} 推進工作流: 項目 {project_id} 到 {next_stage.value}")
        
        return jsonify({
            'success': success,
            'project_id': project_id,
            'new_stage': next_stage.value,
            'workflow_entry': workflow_entry
        })
        
    except Exception as e:
        logger.error(f"推進工作流失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@creative_workflow_bp.route('/projects', methods=['GET'])
@require_auth
def list_user_projects():
    """獲取用戶的創意項目列表"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        status_filter = request.args.get('status')
        category_filter = request.args.get('category')
        
        # 獲取用戶項目
        projects = db_service.get_user_creative_projects(
            request.current_user['id'], 
            page=page, 
            limit=limit,
            status_filter=status_filter,
            category_filter=category_filter
        )
        
        # 獲取總數
        total_count = db_service.count_user_creative_projects(
            request.current_user['id'],
            status_filter=status_filter,
            category_filter=category_filter
        )
        
        # 記錄用戶活動
        db_service.log_user_activity(
            request.current_user['id'],
            'creative_projects_listed',
            {
                'page': page,
                'limit': limit,
                'project_count': len(projects),
                'timestamp': datetime.now().isoformat()
            }
        )
        
        return jsonify({
            'success': True,
            'projects': projects,
            'total_count': total_count,
            'page': page,
            'limit': limit,
            'has_more': (page * limit) < total_count
        })
        
    except Exception as e:
        logger.error(f"獲取用戶項目列表失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@creative_workflow_bp.route('/styles', methods=['GET'])
@require_auth
def get_available_styles():
    """獲取可用的創意風格"""
    try:
        styles = []
        for style in CreativeStyle:
            style_info = {
                'value': style.value,
                'name': style.value.replace('_', ' ').title(),
                'description': creative_service.style_rules.get(style, {}).get('keywords', [])[:3]
            }
            styles.append(style_info)
        
        workflow_stages = []
        for stage in WorkflowStage:
            stage_info = {
                'value': stage.value,
                'name': stage.value.replace('_', ' ').title()
            }
            workflow_stages.append(stage_info)
        
        return jsonify({
            'success': True,
            'styles': styles,
            'workflow_stages': workflow_stages,
            'features': {
                'style_analysis': True,
                'ai_suggestions': True,
                'workflow_management': True,
                'template_system': True
            }
        })
        
    except Exception as e:
        logger.error(f"獲取風格信息失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@creative_workflow_bp.route('/health', methods=['GET'])
@require_auth
def health_check():
    """創意工作流健康檢查"""
    try:
        stats = creative_service.get_stats()
        
        health_status = {
            'service_status': 'healthy',
            'ai_models': {
                'openai_available': bool(creative_service.openai_client),
                'clip_available': bool(creative_service.clip_model)
            },
            'features_available': {
                'style_analysis': True,
                'creative_suggestions': bool(creative_service.openai_client),
                'template_system': True,
                'workflow_management': True
            },
            'statistics': stats['stats']
        }
        
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
@creative_workflow_bp.errorhandler(400)
def bad_request(error):
    return jsonify({
        'success': False,
        'error': '請求格式錯誤'
    }), 400

@creative_workflow_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': '資源不存在'
    }), 404

@creative_workflow_bp.errorhandler(500)
def internal_server_error(error):
    return jsonify({
        'success': False,
        'error': '內部服務器錯誤'
    }), 500 