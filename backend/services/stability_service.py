import requests
import logging
from .image_utils import save_generated_image

logger = logging.getLogger(__name__)

class StabilityService:
    API_URL = "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image"

    def __init__(self, api_key):
        if not api_key:
            raise ValueError("Stability AI API key is required.")
        self.api_key = api_key
        self.db_service = None

    def set_db_service(self, db_service):
        self.db_service = db_service

    def generate_images(self, prompt, image_size, image_count, model_name, generation_id=None):
        """使用Stability AI生成圖片"""
        try:
            logger.info(f"使用 Stability AI 生成圖片...")
            headers = {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            }
            
            width, height = map(int, image_size.split('x'))
            
            body = {
                "text_prompts": [{"text": prompt}],
                "cfg_scale": 7,
                "height": height,
                "width": width,
                "samples": image_count,
                "steps": 30,
            }
            
            response = requests.post(self.API_URL, headers=headers, json=body)
            
            if response.status_code != 200:
                raise Exception(f"API請求失敗: {response.status_code} {response.text}")
            
            data = response.json()
            
            images = []
            for i, artifact in enumerate(data.get('artifacts', [])):
                image_data = artifact['base64']
                filename, file_path, file_size = save_generated_image(image_data, prompt, i, 'stability')
                
                if self.db_service and generation_id:
                    self.db_service.save_generated_image(
                        generation_id=generation_id,
                        filename=filename,
                        original_prompt=prompt,
                        api_provider='stability',
                        model_name=model_name or 'stable-diffusion-xl-1024-v1-0',
                        image_size=image_size,
                        file_path=file_path,
                        file_size=file_size,
                        mime_type='image/png'
                    )

                images.append({
                    'base64': image_data,
                    'mime_type': 'image/png',
                    'filename': filename,
                    'url': f'/generated_images/{filename}'
                })
            
            if not images:
                raise Exception("未能從 Stability AI 生成任何圖片。")

            return images
            
        except Exception as e:
            logger.error(f"Stability AI API調用失敗: {str(e)}")
            raise Exception(f"Stability AI API調用失敗: {str(e)}") 