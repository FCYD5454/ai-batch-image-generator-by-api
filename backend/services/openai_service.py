import openai
import logging
from .image_utils import save_generated_image

logger = logging.getLogger(__name__)

class OpenAIService:
    def __init__(self, api_key):
        if not api_key:
            raise ValueError("OpenAI API key is required.")
        openai.api_key = api_key
        self.db_service = None # 稍後透過 setter 注入

    def set_db_service(self, db_service):
        self.db_service = db_service

    def generate_images(self, prompt, image_size, image_count, model_name, generation_id=None):
        """使用OpenAI DALL-E生成圖片"""
        try:
            if not model_name:
                model_name = 'dall-e-3'
            
            logger.info(f"使用 OpenAI ({model_name}) 生成圖片...")

            params = {
                'model': model_name,
                'prompt': prompt,
                'n': image_count,
                'size': image_size,
                'response_format': 'b64_json'
            }
            
            response = openai.Image.create(**params)
            
            images = []
            for i, image_data in enumerate(response['data']):
                filename, file_path, file_size = save_generated_image(image_data['b64_json'], prompt, i, 'openai')
                
                if self.db_service and generation_id:
                    self.db_service.save_generated_image(
                        generation_id=generation_id,
                        filename=filename,
                        original_prompt=prompt,
                        api_provider='openai',
                        model_name=model_name,
                        image_size=image_size,
                        file_path=file_path,
                        file_size=file_size,
                        mime_type='image/png'
                    )

                images.append({
                    'base64': image_data['b64_json'],
                    'mime_type': 'image/png',
                    'filename': filename,
                    'url': f'/generated_images/{filename}'
                })
            
            return images
            
        except Exception as e:
            logger.error(f"OpenAI API調用失敗: {str(e)}")
            # 重新拋出異常，讓上層路由能夠捕獲並回傳 500 錯誤
            raise Exception(f"OpenAI API調用失敗: {str(e)}")

# 創建一個單例或可配置的實例
# openai_service = OpenAIService(api_key=os.getenv("OPENAI_API_KEY")) 