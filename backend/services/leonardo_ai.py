"""
Leonardo AI 整合服務
提供 Leonardo AI 專業級圖片生成功能
"""

import requests
import json
import time
import logging
import base64
from .image_utils import save_generated_image

logger = logging.getLogger(__name__)

class LeonardoAIService:
    BASE_URL = "https://cloud.leonardo.ai/api/rest/v1"

    def __init__(self, api_key):
        if not api_key:
            raise ValueError("Leonardo AI API key is required.")
        self.api_key = api_key
        self.db_service = None
        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }

    def set_db_service(self, db_service):
        self.db_service = db_service

    def _get_model_id(self, model_name):
        model_ids = {
            'leonardo-creative': 'b24e16ff-06e3-43eb-8d33-4416c2d75876',
            'photoreal': 'ac614f96-1082-45bf-be9d-757f2d31c174',
            #... add other models if needed
        }
        return model_ids.get(model_name, model_ids['leonardo-creative'])

    def generate_images(self, prompt, image_size, image_count, model_name, generation_id=None):
        logger.info(f"使用 Leonardo AI ({model_name}) 生成圖片...")
        width, height = map(int, image_size.split('x'))
        
        request_data = {
            'prompt': prompt,
            'width': width,
            'height': height,
            'num_images': image_count,
            'model_id': self._get_model_id(model_name),
            'public': False
        }

        try:
            # 1. 創建生成任務
            response = requests.post(f"{self.BASE_URL}/generations", headers=self.headers, json=request_data, timeout=30)
            response.raise_for_status()
            
            job_info = response.json()
            job_id = job_info.get('sdGenerationJob', {}).get('generationId')
            if not job_id:
                raise Exception("API 未返回生成任務 ID")
            
            logger.info(f"Leonardo AI 任務已創建: {job_id}")

            # 2. 輪詢任務狀態
            start_time = time.time()
            while time.time() - start_time < 600: # 10分鐘超時
                time.sleep(10)
                status_response = requests.get(f"{self.BASE_URL}/generations/{job_id}", headers=self.headers, timeout=30)
                status_response.raise_for_status()
                
                status_data = status_response.json()
                generation_details = status_data.get('generations_by_pk', {})
                status = generation_details.get('status')
                
                logger.info(f"Leonardo AI 任務狀態: {status}")

                if status == 'COMPLETE':
                    images = []
                    generated_images = generation_details.get('generated_images', [])
                    for i, img_info in enumerate(generated_images):
                        img_url = img_info.get('url')
                        if not img_url: continue

                        # 下載圖片並轉換為 base64
                        img_response = requests.get(img_url, timeout=60)
                        if img_response.status_code == 200:
                            b64_data = base64.b64encode(img_response.content).decode('utf-8')
                            filename, file_path, file_size = save_generated_image(img_response.content, prompt, i, 'leonardo_ai')

                            if self.db_service and generation_id:
                                self.db_service.save_generated_image(
                                    generation_id=generation_id,
                                    filename=filename,
                                    original_prompt=prompt,
                                    api_provider='leonardo_ai',
                                    model_name=model_name,
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
                    return images

                elif status == 'FAILED':
                    raise Exception("Leonardo AI 報告生成失敗")

            raise Exception("Leonardo AI 生成超時")

        except requests.exceptions.RequestException as e:
            logger.error(f"Leonardo AI API 請求失敗: {e}")
            raise Exception(f"Leonardo AI API 請求失敗: {e}")
        except Exception as e:
            logger.error(f"處理 Leonardo AI 任務時發生錯誤: {e}")
            raise Exception(f"處理 Leonardo AI 任務時發生錯誤: {e}")

# 移除舊的全域實例
# leonardo_ai_service = LeonardoAIService() 