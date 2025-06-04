from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import google.generativeai as genai
import openai
import requests
import os
import base64
import io
from PIL import Image
import time
import logging
from datetime import datetime
import json

# 配置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 創建Flask應用
app = Flask(__name__)
CORS(app)  # 允許跨域請求

# 導入和註冊新的API路由
import sys
import os
sys.path.append(os.path.dirname(__file__))

from api.image_management import image_bp
from api.image_processing import image_processing_bp
from api.ai_assistant import ai_assistant_bp
from api.local_ai import local_ai_bp
from api.auth import auth_bp
from api.api_keys import api_keys_bp
from api.replicate_api import replicate_bp
from api.huggingface_api import huggingface_bp
from api.cloud_storage_api import cloud_storage_bp
from api.creative_workflow_api import creative_workflow_bp
from api.analytics_api import analytics_bp
from services.database import DatabaseService
from services.adobe_firefly import adobe_firefly_service
from services.leonardo_ai import leonardo_ai_service

app.register_blueprint(image_bp)
app.register_blueprint(image_processing_bp)
app.register_blueprint(ai_assistant_bp, url_prefix='/api/ai-assistant')
app.register_blueprint(local_ai_bp, url_prefix='/api/local-ai')
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(api_keys_bp, url_prefix='/api/api-keys')
app.register_blueprint(replicate_bp)
app.register_blueprint(huggingface_bp)
app.register_blueprint(cloud_storage_bp)
app.register_blueprint(creative_workflow_bp)
app.register_blueprint(analytics_bp)

# 初始化資料庫服務
db_service = DatabaseService()

# 配置各種 API
# 請設置您的API金鑰
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'YOUR_GEMINI_API_KEY_HERE')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', 'YOUR_OPENAI_API_KEY_HERE')
STABILITY_API_KEY = os.getenv('STABILITY_API_KEY', 'YOUR_STABILITY_API_KEY_HERE')

# 配置 Gemini
if GEMINI_API_KEY and GEMINI_API_KEY != 'YOUR_GEMINI_API_KEY_HERE':
    genai.configure(api_key=GEMINI_API_KEY)
else:
    logger.warning("警告: 未設置GEMINI_API_KEY環境變量")

# 配置 OpenAI
if OPENAI_API_KEY and OPENAI_API_KEY != 'YOUR_OPENAI_API_KEY_HERE':
    openai.api_key = OPENAI_API_KEY
else:
    logger.warning("警告: 未設置OPENAI_API_KEY環境變量")

# 創建生成的圖片存儲目錄
GENERATED_IMAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'images')
if not os.path.exists(GENERATED_IMAGES_DIR):
    os.makedirs(GENERATED_IMAGES_DIR)

# 前端目錄
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), '..', 'frontend')

@app.route('/')
def index():
    """提供主頁"""
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/css/<path:filename>')
def css_files(filename):
    """提供CSS文件"""
    return send_from_directory(os.path.join(FRONTEND_DIR, 'css'), filename)

@app.route('/js/<path:filename>')
def js_files(filename):
    """提供JavaScript文件"""
    return send_from_directory(os.path.join(FRONTEND_DIR, 'js'), filename)

@app.route('/<path:filename>')
def static_files(filename):
    """提供靜態文件"""
    return send_from_directory(FRONTEND_DIR, filename)

@app.route('/api/generate-image', methods=['POST'])
def generate_image():
    """生成圖片的API端點"""
    start_time = time.time()
    generation_id = None
    
    try:
        # 獲取請求數據
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': '無效的請求數據'}), 400
        
        prompt = data.get('prompt', '').strip()
        image_size = data.get('image_size', '1024x1024')
        image_count = int(data.get('image_count', 1))
        api_provider = data.get('api_provider', 'gemini')
        api_key = data.get('api_key', '').strip()
        model_name = data.get('model', '')
        
        # 驗證輸入
        if not prompt:
            return jsonify({'success': False, 'error': '提示詞不能為空'}), 400
        
        if image_count < 1 or image_count > 5:
            return jsonify({'success': False, 'error': '圖片數量必須在1-5之間'}), 400
        
        # 驗證 API 金鑰
        if not api_key and api_provider != 'midjourney':
            return jsonify({'success': False, 'error': f'請在網頁中輸入 {api_provider.upper()} API 金鑰'}), 400
        
        logger.info(f"開始生成圖片 - 提供商: {api_provider}, 提示詞: {prompt[:50]}..., 尺寸: {image_size}, 數量: {image_count}")
        
        # 保存生成記錄到資料庫
        settings = {
            'api_key_provided': bool(api_key),
            'user_agent': request.headers.get('User-Agent', ''),
            'ip_address': request.remote_addr
        }
        
        generation_id = db_service.save_generation_record(
            prompt=prompt,
            api_provider=api_provider,
            model_name=model_name or 'default',
            image_size=image_size,
            image_count=image_count,
            settings=settings
        )
        
        # 根據API提供商生成圖片
        if api_provider == 'gemini':
            images = generate_images_with_gemini(prompt, image_size, image_count, model_name, api_key, generation_id)
        elif api_provider == 'openai':
            images = generate_images_with_openai(prompt, image_size, image_count, model_name, api_key, generation_id)
        elif api_provider == 'stability':
            images = generate_images_with_stability(prompt, image_size, image_count, api_key, generation_id)
        elif api_provider == 'adobe_firefly':
            images = generate_images_with_adobe_firefly(prompt, image_size, image_count, model_name, api_key, generation_id)
        elif api_provider == 'leonardo_ai':
            images = generate_images_with_leonardo_ai(prompt, image_size, image_count, model_name, api_key, generation_id)
        elif api_provider == 'midjourney':
            images = generate_images_with_midjourney(prompt, image_size, image_count, generation_id)
        else:
            return jsonify({'success': False, 'error': f'不支持的API提供商: {api_provider}'}), 400
        
        # 更新生成結果統計
        total_time = time.time() - start_time
        success_count = len(images)
        failed_count = image_count - success_count
        
        db_service.update_generation_result(
            generation_id=generation_id,
            success_count=success_count,
            failed_count=failed_count,
            total_time=total_time
        )
        
        return jsonify({
            'success': True,
            'images': images,
            'prompt': prompt,
            'generated_at': datetime.now().isoformat(),
            'generation_id': generation_id,
            'statistics': {
                'success_count': success_count,
                'failed_count': failed_count,
                'total_time': round(total_time, 2)
            }
        })
        
    except Exception as e:
        logger.error(f"生成圖片時發生錯誤: {str(e)}")
        
        # 更新失敗記錄
        if generation_id:
            total_time = time.time() - start_time
            db_service.update_generation_result(
                generation_id=generation_id,
                success_count=0,
                failed_count=image_count,
                total_time=total_time
            )
        
        return jsonify({
            'success': False,
            'error': f'生成圖片時發生錯誤: {str(e)}'
        }), 500

def generate_images_with_gemini(prompt, image_size, image_count, model_name, api_key, generation_id=None):
    """使用Gemini模型生成圖片"""
    try:
        # 配置 API 金鑰
        genai.configure(api_key=api_key)
        
        # 設置預設模型名稱
        if not model_name:
            model_name = 'gemini-2.0-flash-preview-image-generation'
            
        # 初始化生成模型
        model = genai.GenerativeModel(model_name)
        
        images = []
        for i in range(image_count):
            logger.info(f"正在生成第 {i+1}/{image_count} 張圖片")
            
            # 生成圖片
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.7,
                )
            )
            
            # 處理響應
            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                
                # 檢查是否有圖片數據
                if hasattr(candidate, 'content') and candidate.content.parts:
                    for part in candidate.content.parts:
                        if hasattr(part, 'inline_data'):
                            # 獲取圖片數據
                            image_data = part.inline_data.data
                            mime_type = part.inline_data.mime_type
                            
                            # 保存圖片文件
                            filename, file_path, file_size = save_generated_image(image_data, prompt, i, 'gemini')
                            
                            # 保存到資料庫
                            if generation_id:
                                db_service.save_generated_image(
                                    generation_id=generation_id,
                                    filename=filename,
                                    original_prompt=prompt,
                                    api_provider='gemini',
                                    model_name=model_name,
                                    image_size=image_size,
                                    file_path=file_path,
                                    file_size=file_size,
                                    mime_type=mime_type
                                )
                            
                            images.append({
                                'base64': image_data,
                                'mime_type': mime_type,
                                'filename': filename,
                                'url': f'/generated_images/{filename}'
                            })
                            break
            
            # 添加小延遲避免API限制
            if i < image_count - 1:
                time.sleep(1)
        
        if not images:
            raise Exception("未能生成任何圖片，請檢查提示詞或稍後重試")
        
        return images
        
    except Exception as e:
        logger.error(f"Gemini API調用失敗: {str(e)}")
        raise Exception(f"Gemini API調用失敗: {str(e)}")

def generate_images_with_openai(prompt, image_size, image_count, model_name, api_key, generation_id=None):
    """使用OpenAI DALL-E生成圖片"""
    try:
        # 設置 API 金鑰
        openai.api_key = api_key
        
        if not model_name:
            model_name = 'dall-e-3'
            
        # 構建請求參數
        params = {
            'model': model_name,
            'prompt': prompt,
            'n': image_count,
            'size': image_size,
            'response_format': 'b64_json'
        }
        
        # 調用OpenAI API
        response = openai.Image.create(**params)
        
        images = []
        for i, image_data in enumerate(response['data']):
            # 保存圖片文件
            filename = save_generated_image(image_data['b64_json'], prompt, i, 'openai')
            
            images.append({
                'base64': image_data['b64_json'],
                'mime_type': 'image/png',
                'filename': filename,
                'url': f'/generated_images/{filename}'
            })
        
        return images
        
    except Exception as e:
        logger.error(f"OpenAI API調用失敗: {str(e)}")
        raise Exception(f"OpenAI API調用失敗: {str(e)}")

def generate_images_with_stability(prompt, image_size, image_count, api_key, generation_id=None):
    """使用Stability AI生成圖片"""
    try:
        url = "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image"
        
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
        
        # 解析圖片尺寸
        width, height = map(int, image_size.split('x'))
        
        body = {
            "text_prompts": [{"text": prompt}],
            "cfg_scale": 7,
            "height": height,
            "width": width,
            "samples": image_count,
            "steps": 30,
        }
        
        response = requests.post(url, headers=headers, json=body)
        
        if response.status_code != 200:
            raise Exception(f"API請求失敗: {response.status_code} {response.text}")
        
        data = response.json()
        
        images = []
        for i, artifact in enumerate(data.get('artifacts', [])):
            # 保存圖片文件
            filename = save_generated_image(artifact['base64'], prompt, i, 'stability')
            
            images.append({
                'base64': artifact['base64'],
                'mime_type': 'image/png',
                'filename': filename,
                'url': f'/generated_images/{filename}'
            })
        
        return images
        
    except Exception as e:
        logger.error(f"Stability AI API調用失敗: {str(e)}")
        raise Exception(f"Stability AI API調用失敗: {str(e)}")

def generate_images_with_adobe_firefly(prompt, image_size, image_count, model_name, api_key, generation_id=None):
    """使用Adobe Firefly生成圖片"""
    try:
        # 配置API服務
        adobe_firefly_service.configure(api_key)
        
        # 驗證連接
        if not adobe_firefly_service.validate_connection():
            raise Exception("Adobe Firefly API 連接驗證失敗")
        
        # 設置生成參數
        kwargs = {
            'size': image_size,
            'count': image_count,
            'model': model_name or 'firefly-v3'
        }
        
        # 生成圖片
        result = adobe_firefly_service.generate_images(prompt, **kwargs)
        
        if not result['success']:
            raise Exception(result.get('error', 'Adobe Firefly 生成失敗'))
        
        images = []
        for i, image_info in enumerate(result['images']):
            # 保存圖片文件
            filename, file_path, file_size = save_generated_image(
                image_info['base64'], prompt, i, 'adobe_firefly'
            )
            
            # 保存到資料庫
            if generation_id:
                db_service.save_generated_image(
                    generation_id=generation_id,
                    filename=filename,
                    original_prompt=prompt,
                    api_provider='adobe_firefly',
                    model_name=model_name or 'firefly-v3',
                    image_size=image_size,
                    file_path=file_path,
                    file_size=file_size,
                    mime_type='image/png'
                )
            
            images.append({
                'base64': image_info['base64'],
                'mime_type': 'image/png',
                'filename': filename,
                'url': f'/generated_images/{filename}'
            })
        
        return images
        
    except Exception as e:
        logger.error(f"Adobe Firefly API調用失敗: {str(e)}")
        raise Exception(f"Adobe Firefly API調用失敗: {str(e)}")

def generate_images_with_leonardo_ai(prompt, image_size, image_count, model_name, api_key, generation_id=None):
    """使用Leonardo AI生成圖片"""
    try:
        # 配置API服務
        leonardo_ai_service.configure(api_key)
        
        # 驗證連接
        if not leonardo_ai_service.validate_connection():
            raise Exception("Leonardo AI API 連接驗證失敗")
        
        # 設置生成參數
        kwargs = {
            'size': image_size,
            'count': image_count,
            'model': model_name or 'leonardo-creative'
        }
        
        # 生成圖片
        result = leonardo_ai_service.generate_images(prompt, **kwargs)
        
        if not result['success']:
            raise Exception(result.get('error', 'Leonardo AI 生成失敗'))
        
        images = []
        for i, image_info in enumerate(result['images']):
            # 保存圖片文件
            filename, file_path, file_size = save_generated_image(
                image_info['base64'], prompt, i, 'leonardo_ai'
            )
            
            # 保存到資料庫
            if generation_id:
                db_service.save_generated_image(
                    generation_id=generation_id,
                    filename=filename,
                    original_prompt=prompt,
                    api_provider='leonardo_ai',
                    model_name=model_name or 'leonardo-creative',
                    image_size=image_size,
                    file_path=file_path,
                    file_size=file_size,
                    mime_type='image/png'
                )
            
            images.append({
                'base64': image_info['base64'],
                'mime_type': 'image/png',
                'filename': filename,
                'url': f'/generated_images/{filename}'
            })
        
        return images
        
    except Exception as e:
        logger.error(f"Leonardo AI API調用失敗: {str(e)}")
        raise Exception(f"Leonardo AI API調用失敗: {str(e)}")

def generate_images_with_midjourney(prompt, image_size, image_count, generation_id=None):
    """使用Midjourney API生成圖片（需要第三方代理服務）"""
    try:
        # 注意：這需要第三方Midjourney API代理服務
        # 這裡提供一個示例實現
        raise Exception("Midjourney API需要第三方代理服務，請配置相應的端點")
    except Exception as e:
        logger.error(f"Midjourney API調用失敗: {str(e)}")
        raise Exception(f"Midjourney API調用失敗: {str(e)}")

def save_generated_image(image_data, prompt, index, provider='unknown'):
    """保存生成的圖片到本地"""
    try:
        # 解碼base64圖片數據
        image_bytes = base64.b64decode(image_data)
        
        # 創建PIL圖片對象
        image = Image.open(io.BytesIO(image_bytes))
        
        # 生成文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_prompt = "".join(c for c in prompt[:20] if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_prompt = safe_prompt.replace(' ', '_')
        filename = f"{timestamp}_{provider}_{safe_prompt}_{index+1}.png"
        
        # 保存圖片
        filepath = os.path.join(GENERATED_IMAGES_DIR, filename)
        image.save(filepath, 'PNG')
        
        # 獲取文件大小
        file_size = os.path.getsize(filepath)
        
        logger.info(f"圖片已保存: {filepath}, 大小: {file_size} bytes")
        return filename, filepath, file_size
        
    except Exception as e:
        logger.error(f"保存圖片失敗: {str(e)}")
        error_filename = f"error_{provider}_{index+1}.png"
        return error_filename, "", 0

@app.route('/generated_images/<filename>')
def serve_generated_image(filename):
    """提供生成的圖片文件"""
    return send_from_directory(GENERATED_IMAGES_DIR, filename)

@app.route('/assets/images/<filename>')
def serve_asset_image(filename):
    """提供資源圖片文件"""
    return send_from_directory(GENERATED_IMAGES_DIR, filename)

@app.route('/api/health')
def health_check():
    """健康檢查端點"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'api_key_configured': GEMINI_API_KEY != 'YOUR_GEMINI_API_KEY_HERE'
    })

if __name__ == '__main__':
    print("🚀 啟動批量圖片生成服務...")
    print("📝 請確保已設置 GEMINI_API_KEY 環境變量")
    print("🌐 服務將運行在 http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True) 