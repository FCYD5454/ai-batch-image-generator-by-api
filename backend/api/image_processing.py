"""
圖片後處理 API
提供圖片放大、格式轉換、旋轉、浮水印、濾鏡等功能
"""

from flask import Blueprint, request, jsonify, current_app
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw, ImageFont
import os
import uuid
from datetime import datetime
import json

# 創建 Blueprint
image_processing_bp = Blueprint('image_processing', __name__)

def get_image_path(filename):
    """獲取圖片完整路徑"""
    return os.path.join(current_app.config.get('UPLOAD_FOLDER', 'assets/images'), filename)

def save_processed_image(image, original_filename, suffix=""):
    """保存處理後的圖片"""
    try:
        # 生成新的檔名
        name, ext = os.path.splitext(original_filename)
        new_filename = f"{name}_{suffix}_{uuid.uuid4().hex[:8]}{ext}"
        
        # 確保目錄存在
        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'assets/images')
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)
        
        # 保存圖片
        image_path = os.path.join(upload_folder, new_filename)
        image.save(image_path, optimize=True)
        
        return new_filename
    except Exception as e:
        current_app.logger.error(f"保存圖片失敗: {str(e)}")
        return None

@image_processing_bp.route('/api/images/<image_id>/upscale', methods=['POST'])
def upscale_image(image_id):
    """圖片放大功能"""
    try:
        data = request.get_json()
        scale_factor = data.get('scale_factor', 2)
        method = data.get('method', 'lanczos')
        
        # 從資料庫獲取圖片信息
        from services.database import DatabaseService
        db = DatabaseService()
        image_data = db.get_image_by_id(image_id)
        
        if not image_data:
            return jsonify({'success': False, 'error': '圖片不存在'})
        
        # 開啟原始圖片
        image_path = get_image_path(image_data['filename'])
        if not os.path.exists(image_path):
            return jsonify({'success': False, 'error': '圖片檔案不存在'})
        
        with Image.open(image_path) as img:
            # 計算新尺寸
            new_width = int(img.width * scale_factor)
            new_height = int(img.height * scale_factor)
            
            # 選擇重採樣方法
            resample_methods = {
                'nearest': Image.NEAREST,
                'bilinear': Image.BILINEAR,
                'bicubic': Image.BICUBIC,
                'lanczos': Image.LANCZOS
            }
            resample = resample_methods.get(method, Image.LANCZOS)
            
            # 執行放大
            upscaled_img = img.resize((new_width, new_height), resample)
            
            # 保存處理後的圖片
            new_filename = save_processed_image(upscaled_img, image_data['filename'], f"upscale_{scale_factor}x")
            
            if new_filename:
                # 將新圖片加入資料庫
                new_image_data = {
                    'filename': new_filename,
                    'prompt': f"[放大 {scale_factor}x] {image_data['prompt']}",
                    'negative_prompt': image_data.get('negative_prompt', ''),
                    'ai_platform': image_data['ai_platform'],
                    'image_size': f"{new_width}x{new_height}",
                    'created_at': datetime.now().isoformat(),
                    'rating': 0,
                    'is_favorite': False,
                    'tags': image_data.get('tags', ''),
                    'generation_params': json.dumps({
                        'original_image_id': image_id,
                        'operation': 'upscale',
                        'scale_factor': scale_factor,
                        'method': method
                    })
                }
                
                db.save_image_to_db(new_image_data)
                
                return jsonify({
                    'success': True,
                    'message': f'圖片成功放大 {scale_factor} 倍',
                    'new_filename': new_filename,
                    'new_size': f"{new_width}x{new_height}"
                })
            else:
                return jsonify({'success': False, 'error': '保存處理後的圖片失敗'})
                
    except Exception as e:
        current_app.logger.error(f"圖片放大失敗: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@image_processing_bp.route('/api/images/<image_id>/convert', methods=['POST'])
def convert_format(image_id):
    """格式轉換功能"""
    try:
        data = request.get_json()
        target_format = data.get('target_format', 'png').lower()
        quality = data.get('quality', 90)
        
        # 檢查支援的格式
        supported_formats = ['png', 'jpg', 'jpeg', 'webp']
        if target_format not in supported_formats:
            return jsonify({'success': False, 'error': '不支援的圖片格式'})
        
        # 從資料庫獲取圖片信息
        from services.database import DatabaseService
        db = DatabaseService()
        image_data = db.get_image_by_id(image_id)
        
        if not image_data:
            return jsonify({'success': False, 'error': '圖片不存在'})
        
        # 開啟原始圖片
        image_path = get_image_path(image_data['filename'])
        if not os.path.exists(image_path):
            return jsonify({'success': False, 'error': '圖片檔案不存在'})
        
        with Image.open(image_path) as img:
            # 處理透明度（PNG 轉 JPG 時）
            if target_format in ['jpg', 'jpeg'] and img.mode in ('RGBA', 'LA'):
                # 創建白色背景
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            
            # 生成新檔名
            name = os.path.splitext(image_data['filename'])[0]
            new_filename = f"{name}_converted_{uuid.uuid4().hex[:8]}.{target_format}"
            
            # 保存路徑
            upload_folder = current_app.config.get('UPLOAD_FOLDER', 'assets/images')
            new_image_path = os.path.join(upload_folder, new_filename)
            
            # 保存轉換後的圖片
            save_kwargs = {'optimize': True}
            if target_format in ['jpg', 'jpeg']:
                save_kwargs['quality'] = quality
            
            img.save(new_image_path, format=target_format.upper(), **save_kwargs)
            
            # 將新圖片加入資料庫
            new_image_data = {
                'filename': new_filename,
                'prompt': f"[格式轉換 → {target_format.upper()}] {image_data['prompt']}",
                'negative_prompt': image_data.get('negative_prompt', ''),
                'ai_platform': image_data['ai_platform'],
                'image_size': image_data['image_size'],
                'created_at': datetime.now().isoformat(),
                'rating': 0,
                'is_favorite': False,
                'tags': image_data.get('tags', ''),
                'generation_params': json.dumps({
                    'original_image_id': image_id,
                    'operation': 'format_conversion',
                    'target_format': target_format,
                    'quality': quality
                })
            }
            
            db.save_image_to_db(new_image_data)
            
            return jsonify({
                'success': True,
                'message': f'圖片成功轉換為 {target_format.upper()} 格式',
                'new_filename': new_filename,
                'quality': quality
            })
            
    except Exception as e:
        current_app.logger.error(f"格式轉換失敗: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@image_processing_bp.route('/api/images/<image_id>/rotate', methods=['POST'])
def rotate_image(image_id):
    """圖片旋轉功能"""
    try:
        data = request.get_json()
        angle = data.get('angle', 90)
        
        # 從資料庫獲取圖片信息
        from services.database import DatabaseService
        db = DatabaseService()
        image_data = db.get_image_by_id(image_id)
        
        if not image_data:
            return jsonify({'success': False, 'error': '圖片不存在'})
        
        # 開啟原始圖片
        image_path = get_image_path(image_data['filename'])
        if not os.path.exists(image_path):
            return jsonify({'success': False, 'error': '圖片檔案不存在'})
        
        with Image.open(image_path) as img:
            # 旋轉圖片
            rotated_img = img.rotate(-angle, expand=True)  # PIL 使用負角度為順時針
            
            # 保存處理後的圖片
            new_filename = save_processed_image(rotated_img, image_data['filename'], f"rotate_{angle}")
            
            if new_filename:
                # 計算新尺寸
                new_size = f"{rotated_img.width}x{rotated_img.height}"
                
                # 將新圖片加入資料庫
                new_image_data = {
                    'filename': new_filename,
                    'prompt': f"[旋轉 {angle}°] {image_data['prompt']}",
                    'negative_prompt': image_data.get('negative_prompt', ''),
                    'ai_platform': image_data['ai_platform'],
                    'image_size': new_size,
                    'created_at': datetime.now().isoformat(),
                    'rating': 0,
                    'is_favorite': False,
                    'tags': image_data.get('tags', ''),
                    'generation_params': json.dumps({
                        'original_image_id': image_id,
                        'operation': 'rotate',
                        'angle': angle
                    })
                }
                
                db.save_image_to_db(new_image_data)
                
                return jsonify({
                    'success': True,
                    'message': f'圖片成功旋轉 {angle}°',
                    'new_filename': new_filename,
                    'new_size': new_size
                })
            else:
                return jsonify({'success': False, 'error': '保存處理後的圖片失敗'})
                
    except Exception as e:
        current_app.logger.error(f"圖片旋轉失敗: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@image_processing_bp.route('/api/images/<image_id>/watermark', methods=['POST'])
def add_watermark(image_id):
    """添加浮水印功能"""
    try:
        data = request.get_json()
        watermark_type = data.get('type', 'text')
        watermark_text = data.get('text', '')
        position = data.get('position', 'bottom-right')
        opacity = data.get('opacity', 0.5)
        
        # 從資料庫獲取圖片信息
        from services.database import DatabaseService
        db = DatabaseService()
        image_data = db.get_image_by_id(image_id)
        
        if not image_data:
            return jsonify({'success': False, 'error': '圖片不存在'})
        
        # 開啟原始圖片
        image_path = get_image_path(image_data['filename'])
        if not os.path.exists(image_path):
            return jsonify({'success': False, 'error': '圖片檔案不存在'})
        
        with Image.open(image_path) as img:
            # 確保圖片為 RGBA 模式
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # 創建浮水印圖層
            watermark_layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
            draw = ImageDraw.Draw(watermark_layer)
            
            if watermark_type == 'text' and watermark_text:
                # 文字浮水印
                try:
                    # 嘗試使用系統字體
                    font_size = max(20, min(img.width, img.height) // 20)
                    font = ImageFont.truetype("arial.ttf", font_size)
                except:
                    # 如果找不到字體，使用預設字體
                    font = ImageFont.load_default()
                
                # 計算文字尺寸
                bbox = draw.textbbox((0, 0), watermark_text, font=font)
                text_width = bbox[2] - bbox[0]
                text_height = bbox[3] - bbox[1]
                
                # 計算位置
                positions = {
                    'top-left': (20, 20),
                    'top-right': (img.width - text_width - 20, 20),
                    'bottom-left': (20, img.height - text_height - 20),
                    'bottom-right': (img.width - text_width - 20, img.height - text_height - 20),
                    'center': ((img.width - text_width) // 2, (img.height - text_height) // 2)
                }
                
                text_position = positions.get(position, positions['bottom-right'])
                
                # 繪製文字（使用透明度）
                text_color = (255, 255, 255, int(255 * opacity))
                draw.text(text_position, watermark_text, font=font, fill=text_color)
            
            # 合併圖層
            watermarked_img = Image.alpha_composite(img, watermark_layer)
            
            # 轉換回原始模式（如果需要）
            if image_data['filename'].lower().endswith(('.jpg', '.jpeg')):
                # JPEG 不支援透明度，轉換為 RGB
                rgb_img = Image.new('RGB', watermarked_img.size, (255, 255, 255))
                rgb_img.paste(watermarked_img, mask=watermarked_img.split()[-1])
                watermarked_img = rgb_img
            
            # 保存處理後的圖片
            new_filename = save_processed_image(watermarked_img, image_data['filename'], "watermark")
            
            if new_filename:
                # 將新圖片加入資料庫
                new_image_data = {
                    'filename': new_filename,
                    'prompt': f"[浮水印: {watermark_text}] {image_data['prompt']}",
                    'negative_prompt': image_data.get('negative_prompt', ''),
                    'ai_platform': image_data['ai_platform'],
                    'image_size': image_data['image_size'],
                    'created_at': datetime.now().isoformat(),
                    'rating': 0,
                    'is_favorite': False,
                    'tags': image_data.get('tags', ''),
                    'generation_params': json.dumps({
                        'original_image_id': image_id,
                        'operation': 'watermark',
                        'watermark_type': watermark_type,
                        'watermark_text': watermark_text,
                        'position': position,
                        'opacity': opacity
                    })
                }
                
                db.save_image_to_db(new_image_data)
                
                return jsonify({
                    'success': True,
                    'message': '浮水印添加成功',
                    'new_filename': new_filename
                })
            else:
                return jsonify({'success': False, 'error': '保存處理後的圖片失敗'})
                
    except Exception as e:
        current_app.logger.error(f"添加浮水印失敗: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@image_processing_bp.route('/api/images/<image_id>/filter', methods=['POST'])
def apply_filter(image_id):
    """應用圖片濾鏡"""
    try:
        data = request.get_json()
        filter_type = data.get('filter_type', 'enhance')
        
        # 從資料庫獲取圖片信息
        from services.database import DatabaseService
        db = DatabaseService()
        image_data = db.get_image_by_id(image_id)
        
        if not image_data:
            return jsonify({'success': False, 'error': '圖片不存在'})
        
        # 開啟原始圖片
        image_path = get_image_path(image_data['filename'])
        if not os.path.exists(image_path):
            return jsonify({'success': False, 'error': '圖片檔案不存在'})
        
        with Image.open(image_path) as img:
            # 應用不同的濾鏡
            filtered_img = img.copy()
            
            if filter_type == 'blur':
                filtered_img = filtered_img.filter(ImageFilter.GaussianBlur(radius=2))
            elif filter_type == 'sharpen':
                filtered_img = filtered_img.filter(ImageFilter.SHARPEN)
            elif filter_type == 'grayscale':
                filtered_img = filtered_img.convert('L').convert('RGB')
            elif filter_type == 'sepia':
                # 懷舊濾鏡
                pixels = list(filtered_img.getdata())
                sepia_pixels = []
                for pixel in pixels:
                    if len(pixel) == 3:
                        r, g, b = pixel
                        tr = int(0.393 * r + 0.769 * g + 0.189 * b)
                        tg = int(0.349 * r + 0.686 * g + 0.168 * b)
                        tb = int(0.272 * r + 0.534 * g + 0.131 * b)
                        sepia_pixels.append((min(255, tr), min(255, tg), min(255, tb)))
                    else:
                        sepia_pixels.append(pixel)
                filtered_img.putdata(sepia_pixels)
            elif filter_type == 'vintage':
                # 復古濾鏡（降低飽和度並調整色調）
                enhancer = ImageEnhance.Color(filtered_img)
                filtered_img = enhancer.enhance(0.6)  # 降低飽和度
                enhancer = ImageEnhance.Contrast(filtered_img)
                filtered_img = enhancer.enhance(1.1)  # 稍微增加對比度
            elif filter_type == 'enhance':
                # 增強濾鏡
                enhancer = ImageEnhance.Sharpness(filtered_img)
                filtered_img = enhancer.enhance(1.2)
                enhancer = ImageEnhance.Contrast(filtered_img)
                filtered_img = enhancer.enhance(1.1)
                enhancer = ImageEnhance.Color(filtered_img)
                filtered_img = enhancer.enhance(1.1)
            
            # 保存處理後的圖片
            new_filename = save_processed_image(filtered_img, image_data['filename'], f"filter_{filter_type}")
            
            if new_filename:
                # 將新圖片加入資料庫
                new_image_data = {
                    'filename': new_filename,
                    'prompt': f"[濾鏡: {filter_type}] {image_data['prompt']}",
                    'negative_prompt': image_data.get('negative_prompt', ''),
                    'ai_platform': image_data['ai_platform'],
                    'image_size': image_data['image_size'],
                    'created_at': datetime.now().isoformat(),
                    'rating': 0,
                    'is_favorite': False,
                    'tags': image_data.get('tags', ''),
                    'generation_params': json.dumps({
                        'original_image_id': image_id,
                        'operation': 'filter',
                        'filter_type': filter_type
                    })
                }
                
                db.save_image_to_db(new_image_data)
                
                filter_names = {
                    'blur': '模糊',
                    'sharpen': '銳化',
                    'grayscale': '黑白',
                    'sepia': '懷舊',
                    'vintage': '復古',
                    'enhance': '增強'
                }
                
                return jsonify({
                    'success': True,
                    'message': f'{filter_names.get(filter_type, filter_type)} 濾鏡應用成功',
                    'new_filename': new_filename
                })
            else:
                return jsonify({'success': False, 'error': '保存處理後的圖片失敗'})
                
    except Exception as e:
        current_app.logger.error(f"應用濾鏡失敗: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@image_processing_bp.route('/api/images/<image_id>/resize', methods=['POST'])
def resize_image(image_id):
    """調整圖片尺寸"""
    try:
        data = request.get_json()
        width = int(data.get('width', 512))
        height = int(data.get('height', 512))
        maintain_aspect_ratio = data.get('maintain_aspect_ratio', True)
        
        # 從資料庫獲取圖片信息
        from services.database import DatabaseService
        db = DatabaseService()
        image_data = db.get_image_by_id(image_id)
        
        if not image_data:
            return jsonify({'success': False, 'error': '圖片不存在'})
        
        # 開啟原始圖片
        image_path = get_image_path(image_data['filename'])
        if not os.path.exists(image_path):
            return jsonify({'success': False, 'error': '圖片檔案不存在'})
        
        with Image.open(image_path) as img:
            if maintain_aspect_ratio:
                # 保持長寬比
                img.thumbnail((width, height), Image.LANCZOS)
                resized_img = img
            else:
                # 強制調整到指定尺寸
                resized_img = img.resize((width, height), Image.LANCZOS)
            
            # 保存處理後的圖片
            new_filename = save_processed_image(resized_img, image_data['filename'], f"resize_{width}x{height}")
            
            if new_filename:
                # 將新圖片加入資料庫
                new_size = f"{resized_img.width}x{resized_img.height}"
                new_image_data = {
                    'filename': new_filename,
                    'prompt': f"[調整尺寸: {new_size}] {image_data['prompt']}",
                    'negative_prompt': image_data.get('negative_prompt', ''),
                    'ai_platform': image_data['ai_platform'],
                    'image_size': new_size,
                    'created_at': datetime.now().isoformat(),
                    'rating': 0,
                    'is_favorite': False,
                    'tags': image_data.get('tags', ''),
                    'generation_params': json.dumps({
                        'original_image_id': image_id,
                        'operation': 'resize',
                        'target_width': width,
                        'target_height': height,
                        'maintain_aspect_ratio': maintain_aspect_ratio,
                        'actual_size': new_size
                    })
                }
                
                db.save_image_to_db(new_image_data)
                
                return jsonify({
                    'success': True,
                    'message': f'圖片尺寸調整成功：{new_size}',
                    'new_filename': new_filename,
                    'new_size': new_size
                })
            else:
                return jsonify({'success': False, 'error': '保存處理後的圖片失敗'})
                
    except Exception as e:
        current_app.logger.error(f"調整圖片尺寸失敗: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}) 