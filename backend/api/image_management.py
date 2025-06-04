# -*- coding: utf-8 -*-
'''
圖片管理 API 路由
提供圖片畫廊、歷史記錄、統計等功能
'''

from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
import os
import zipfile
import tempfile
import logging
from datetime import datetime
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from services.database import DatabaseService

logger = logging.getLogger(__name__)

# 創建藍圖
image_bp = Blueprint('image_management', __name__, url_prefix='/api/images')

# 初始化資料庫服務
db_service = DatabaseService()

@image_bp.route('/gallery', methods=['GET'])
def get_image_gallery():
    """獲取圖片畫廊"""
    try:
        # 獲取查詢參數
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
        filter_provider = request.args.get('provider')
        filter_favorite = request.args.get('favorite')
        search_prompt = request.args.get('search')
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'DESC')
        
        # 處理布爾值參數
        if filter_favorite == 'true':
            filter_favorite = True
        elif filter_favorite == 'false':
            filter_favorite = False
        else:
            filter_favorite = None
        
        # 限制分頁大小
        page_size = min(max(page_size, 1), 100)
        
        # 獲取圖片列表
        images, total = db_service.get_image_gallery(
            page=page,
            page_size=page_size,
            filter_provider=filter_provider,
            filter_favorite=filter_favorite,
            search_prompt=search_prompt,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        # 計算分頁信息
        total_pages = (total + page_size - 1) // page_size
        
        return jsonify({
            'success': True,
            'data': {
                'images': images,
                'pagination': {
                    'current_page': page,
                    'page_size': page_size,
                    'total_pages': total_pages,
                    'total_items': total,
                    'has_next': page < total_pages,
                    'has_prev': page > 1
                }
            }
        })
        
    except Exception as e:
        logger.error(f"獲取圖片畫廊失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取圖片畫廊失敗: {str(e)}'
        }), 500

@image_bp.route('/<int:image_id>', methods=['GET'])
def get_image_detail(image_id):
    """獲取圖片詳細信息"""
    try:
        image = db_service.get_image_by_id(image_id)
        
        if not image:
            return jsonify({
                'success': False,
                'error': '圖片不存在'
            }), 404
        
        return jsonify({
            'success': True,
            'data': image
        })
        
    except Exception as e:
        logger.error(f"獲取圖片詳情失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取圖片詳情失敗: {str(e)}'
        }), 500

@image_bp.route('/<int:image_id>/rating', methods=['PUT'])
def update_image_rating(image_id):
    """更新圖片評分"""
    try:
        data = request.get_json()
        rating = data.get('rating')
        
        if rating is None or not isinstance(rating, int) or not 0 <= rating <= 5:
            return jsonify({
                'success': False,
                'error': '評分必須是0-5之間的整數'
            }), 400
        
        success = db_service.update_image_rating(image_id, rating)
        
        if not success:
            return jsonify({
                'success': False,
                'error': '圖片不存在或更新失敗'
            }), 404
        
        return jsonify({
            'success': True,
            'message': '評分更新成功'
        })
        
    except Exception as e:
        logger.error(f"更新圖片評分失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'更新圖片評分失敗: {str(e)}'
        }), 500

@image_bp.route('/<int:image_id>/favorite', methods=['PUT'])
def toggle_image_favorite(image_id):
    """切換圖片收藏狀態"""
    try:
        success = db_service.toggle_image_favorite(image_id)
        
        if not success:
            return jsonify({
                'success': False,
                'error': '圖片不存在'
            }), 404
        
        return jsonify({
            'success': True,
            'message': '收藏狀態更新成功'
        })
        
    except Exception as e:
        logger.error(f"切換收藏狀態失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'切換收藏狀態失敗: {str(e)}'
        }), 500

@image_bp.route('/<int:image_id>/tags', methods=['PUT'])
def update_image_tags(image_id):
    """更新圖片標籤"""
    try:
        data = request.get_json()
        tags = data.get('tags', [])
        
        if not isinstance(tags, list):
            return jsonify({
                'success': False,
                'error': '標籤必須是數組格式'
            }), 400
        
        # 清理和驗證標籤
        cleaned_tags = []
        for tag in tags:
            if isinstance(tag, str) and tag.strip():
                cleaned_tags.append(tag.strip()[:50])  # 限制標籤長度
        
        success = db_service.add_image_tags(image_id, cleaned_tags)
        
        if not success:
            return jsonify({
                'success': False,
                'error': '圖片不存在或更新失敗'
            }), 404
        
        return jsonify({
            'success': True,
            'message': '標籤更新成功',
            'tags': cleaned_tags
        })
        
    except Exception as e:
        logger.error(f"更新圖片標籤失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'更新圖片標籤失敗: {str(e)}'
        }), 500

@image_bp.route('/<int:image_id>', methods=['DELETE'])
def delete_image(image_id):
    """刪除圖片"""
    try:
        # 獲取圖片信息
        image = db_service.get_image_by_id(image_id)
        if not image:
            return jsonify({
                'success': False,
                'error': '圖片不存在'
            }), 404
        
        # 刪除實際文件
        try:
            if os.path.exists(image['file_path']):
                os.remove(image['file_path'])
        except Exception as e:
            logger.warning(f"刪除圖片文件失敗: {str(e)}")
        
        # 刪除資料庫記錄
        success = db_service.delete_image(image_id)
        
        if not success:
            return jsonify({
                'success': False,
                'error': '刪除資料庫記錄失敗'
            }), 500
        
        return jsonify({
            'success': True,
            'message': '圖片刪除成功'
        })
        
    except Exception as e:
        logger.error(f"刪除圖片失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'刪除圖片失敗: {str(e)}'
        }), 500

@image_bp.route('/download/batch', methods=['POST'])
def download_images_batch():
    """批量下載圖片為ZIP檔案"""
    try:
        data = request.get_json()
        image_ids = data.get('image_ids', [])
        
        if not image_ids or not isinstance(image_ids, list):
            return jsonify({
                'success': False,
                'error': '請提供要下載的圖片ID列表'
            }), 400
        
        # 限制批量下載數量
        if len(image_ids) > 100:
            return jsonify({
                'success': False,
                'error': '單次最多只能下載100張圖片'
            }), 400
        
        # 創建臨時ZIP檔案
        temp_dir = tempfile.mkdtemp()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        zip_filename = f"generated_images_{timestamp}.zip"
        zip_path = os.path.join(temp_dir, zip_filename)
        
        valid_images = 0
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for image_id in image_ids:
                image = db_service.get_image_by_id(image_id)
                if image and os.path.exists(image['file_path']):
                    # 使用安全的文件名
                    safe_filename = secure_filename(image['filename'])
                    zipf.write(image['file_path'], safe_filename)
                    valid_images += 1
        
        if valid_images == 0:
            return jsonify({
                'success': False,
                'error': '沒有找到有效的圖片文件'
            }), 404
        
        return send_file(
            zip_path,
            as_attachment=True,
            download_name=zip_filename,
            mimetype='application/zip'
        )
        
    except Exception as e:
        logger.error(f"批量下載失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'批量下載失敗: {str(e)}'
        }), 500

@image_bp.route('/history', methods=['GET'])
def get_generation_history():
    """獲取生成歷史記錄"""
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
        
        # 限制分頁大小
        page_size = min(max(page_size, 1), 100)
        
        history, total = db_service.get_generation_history(page, page_size)
        
        # 計算分頁信息
        total_pages = (total + page_size - 1) // page_size
        
        return jsonify({
            'success': True,
            'data': {
                'history': history,
                'pagination': {
                    'current_page': page,
                    'page_size': page_size,
                    'total_pages': total_pages,
                    'total_items': total,
                    'has_next': page < total_pages,
                    'has_prev': page > 1
                }
            }
        })
        
    except Exception as e:
        logger.error(f"獲取生成歷史失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取生成歷史失敗: {str(e)}'
        }), 500

@image_bp.route('/statistics', methods=['GET'])
def get_statistics():
    """獲取統計信息"""
    try:
        stats = db_service.get_statistics()
        
        return jsonify({
            'success': True,
            'data': stats
        })
        
    except Exception as e:
        logger.error(f"獲取統計信息失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'獲取統計信息失敗: {str(e)}'
        }), 500

@image_bp.route('/export/history', methods=['GET'])
def export_history():
    """匯出歷史記錄"""
    try:
        filepath = db_service.export_history_to_json()
        
        return send_file(
            filepath,
            as_attachment=True,
            download_name=os.path.basename(filepath),
            mimetype='application/json'
        )
        
    except Exception as e:
        logger.error(f"匯出歷史記錄失敗: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'匯出歷史記錄失敗: {str(e)}'
        }), 500 