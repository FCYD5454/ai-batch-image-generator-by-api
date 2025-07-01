"""
Adobe Firefly API 整合服務
提供 Adobe Firefly 圖片生成功能
"""

import requests
import json
import logging
import os
import base64
import io
from PIL import Image
from datetime import datetime
import uuid
from .image_utils import save_generated_image

logger = logging.getLogger(__name__)

# TODO: 將 save_generated_image 移至一個共享的 `utils.py` 或 `image_service.py`
GENERATED_IMAGES_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'images')
if not os.path.exists(GENERATED_IMAGES_DIR):
    os.makedirs(GENERATED_IMAGES_DIR)

def save_generated_image(image_data, prompt, index, provider='unknown'):
    """保存生成的圖片到本地"""
    try:
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_prompt = "".join(c for c in prompt[:20] if c.isalnum()).rstrip()
        filename = f"{timestamp}_{provider}_{safe_prompt}_{index+1}.png"
        filepath = os.path.join(GENERATED_IMAGES_DIR, filename)
        image.save(filepath, 'PNG')
        file_size = os.path.getsize(filepath)
        logger.info(f"圖片已保存: {filepath}, 大小: {file_size} bytes")
        return filename, filepath, file_size
    except Exception as e:
        logger.error(f"保存圖片失敗: {str(e)}")
        return f"error_{provider}_{index+1}.png", "", 0

class AdobeFireflyService:
    BASE_URL = "https://firefly-api.adobe.io/v2/images/generate"

    def __init__(self, api_key, client_id="ai-image-generator"):
        if not api_key:
            raise ValueError("Adobe Firefly API key is required.")
        self.api_key = api_key
        self.client_id = client_id
        self.db_service = None
        self.supported_models = {
            'firefly-v2': {
                'name': 'Firefly v2',
                'max_size': '2048x2048',
                'description': 'Adobe Firefly 第二代模型，專業級商業圖片生成'
            },
            'firefly-v3': {
                'name': 'Firefly v3 (Beta)',
                'max_size': '2048x2048', 
                'description': 'Adobe Firefly 第三代測試版，最新技術'
            }
        }
        
    def set_db_service(self, db_service):
        self.db_service = db_service

    def generate_images(self, prompt, image_size, image_count, model_name, generation_id=None):
        """
        生成圖片並遵循標準化輸出格式
        """
        logger.info(f"使用 Adobe Firefly ({model_name or 'firefly-v2'}) 生成圖片...")
        
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'X-API-Key': self.client_id,
            'Content-Type': 'application/json'
        }
        
        request_data = {
            'prompt': prompt,
            'size': image_size,
            'n': image_count,
            'model': model_name or 'firefly-v2',
            'response_format': 'b64_json'
        }
        
        try:
            response = requests.post(self.BASE_URL, headers=headers, json=request_data, timeout=120)
            response.raise_for_status() # 如果狀態碼不是 2xx，則引發 HTTPError
            
            result = response.json()
            images = []
            
            if 'data' not in result:
                raise Exception("API 回應中缺少 'data' 欄位")

            for i, image_info in enumerate(result['data']):
                if 'b64_json' in image_info:
                    b64_data = image_info['b64_json']
                    filename, file_path, file_size = save_generated_image(b64_data, prompt, i, 'adobe_firefly')
                    
                    if self.db_service and generation_id:
                        self.db_service.save_generated_image(
                            generation_id=generation_id,
                            filename=filename,
                            original_prompt=prompt,
                            api_provider='adobe_firefly',
                            model_name=model_name or 'firefly-v2',
                            image_size=image_size,
                            file_path=file_path,
                            file_size=file_size,
                            mime_type='image/png'
                        )
                    
                    images.append({
                        'base64': b64_data,
                        'mime_type': 'image/png',
                        'filename': filename,
                        'url': f'/generated_images/{filename}'
                    })

            if not images:
                raise Exception("未能從 Adobe Firefly 生成任何圖片。")
            
            return images

        except requests.exceptions.RequestException as e:
            logger.error(f"Adobe Firefly API 請求失敗: {e}")
            raise Exception(f"Adobe Firefly API 請求失敗: {e}")
        except Exception as e:
            logger.error(f"處理 Adobe Firefly 回應時發生錯誤: {e}")
            raise Exception(f"處理 Adobe Firefly 回應時發生錯誤: {e}")

    def get_model_info(self):
        """獲取模型資訊"""
        return self.supported_models
    
    def get_available_sizes(self):
        """獲取支援的圖片尺寸"""
        return [
            '512x512',
            '768x768',
            '1024x1024',
            '1024x768',
            '768x1024',
            '1536x1536',
            '2048x2048'
        ]
    
    def get_available_styles(self):
        """獲取支援的風格"""
        return [
            'auto',
            'photography',
            'illustration',
            'digital-art',
            'concept-art',
            'painting',
            'sketch',
            'watercolor',
            'oil-painting',
            'pencil-drawing',
            'comic-book',
            'anime',
            'realistic',
            'abstract',
            'minimalist',
            'vintage',
            'retro',
            'modern',
            'futuristic'
        ]
    
    def optimize_prompt_for_firefly(self, prompt):
        """
        為 Adobe Firefly 優化提示詞
        
        Args:
            prompt (str): 原始提示詞
            
        Returns:
            str: 優化後的提示詞
        """
        
        # Adobe Firefly 的優化建議
        optimizations = []
        
        # 添加商業友好的描述
        if 'commercial' not in prompt.lower() and 'stock' not in prompt.lower():
            optimizations.append("商業級品質")
        
        # 添加專業攝影術語
        if 'photo' in prompt.lower() or 'photograph' in prompt.lower():
            if 'lighting' not in prompt.lower():
                optimizations.append("專業燈光")
            if 'composition' not in prompt.lower():
                optimizations.append("完美構圖")
        
        # 添加高解析度描述
        if 'high resolution' not in prompt.lower() and 'detailed' not in prompt.lower():
            optimizations.append("高解析度, 細節豐富")
        
        # 組合優化提示詞
        if optimizations:
            optimized_prompt = f"{prompt}, {', '.join(optimizations)}"
        else:
            optimized_prompt = prompt
            
        return optimized_prompt
    
    def estimate_generation_time(self, count=1, size='1024x1024'):
        """
        估算生成時間
        
        Args:
            count (int): 圖片數量
            size (str): 圖片尺寸
            
        Returns:
            int: 預估時間（秒）
        """
        
        base_time = 15  # 基礎時間
        
        # 根據尺寸調整
        size_multiplier = {
            '512x512': 1.0,
            '768x768': 1.3,
            '1024x1024': 1.5,
            '1536x1536': 2.0,
            '2048x2048': 2.5
        }
        
        multiplier = size_multiplier.get(size, 1.5)
        estimated_time = int(base_time * multiplier * count)
        
        return max(estimated_time, 10)  # 最少10秒

# 移除舊的全域實例
# adobe_firefly_service = AdobeFireflyService() 