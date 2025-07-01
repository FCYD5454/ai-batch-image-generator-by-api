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

# 配置應用
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'development-secret-key-change-in-production')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['DEVELOPMENT_MODE'] = os.getenv('DEVELOPMENT_MODE', 'true')

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
from api.user_api import user_api
from services.database import DatabaseService
from services.adobe_firefly import AdobeFireflyService
from services.leonardo_ai import LeonardoAIService
from services.openai_service import OpenAIService
from services.gemini_service import GeminiService
from services.stability_service import StabilityService
from services.factory import get_image_generation_service

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
app.register_blueprint(user_api)

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
        
        # 使用工廠函式獲取並執行服務
        service = get_image_generation_service(api_provider, api_key)
        
        if not service:
            return jsonify({'success': False, 'error': f'不支持的API提供商: {api_provider}'}), 400

        # Midjourney 是一個特例，暫時保留
        if api_provider == 'midjourney':
            images = generate_images_with_midjourney(prompt, image_size, image_count, generation_id)
        else:
            service.set_db_service(db_service)
            images = service.generate_images(
                prompt=prompt,
                image_size=image_size,
                image_count=image_count,
                model_name=model_name,
                generation_id=generation_id
            )

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

def generate_images_with_midjourney(prompt, image_size, image_count, generation_id=None):
    """使用Midjourney API生成圖片（需要第三方代理服務）"""
    try:
        # 注意：這需要第三方Midjourney API代理服務
        # 這裡提供一個示例實現
        raise Exception("Midjourney API需要第三方代理服務，請配置相應的端點")
    except Exception as e:
        logger.error(f"Midjourney API調用失敗: {str(e)}")
        raise Exception(f"Midjourney API調用失敗: {str(e)}")

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