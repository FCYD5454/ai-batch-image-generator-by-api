import google.generativeai as genai
import logging
import time
from .image_utils import save_generated_image

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self, api_key):
        if not api_key:
            raise ValueError("Gemini API key is required.")
        genai.configure(api_key=api_key)
        self.db_service = None

    def set_db_service(self, db_service):
        self.db_service = db_service

    def generate_images(self, prompt, image_size, image_count, model_name, generation_id=None):
        """使用Gemini模型生成圖片"""
        try:
            if not model_name:
                model_name = 'gemini-pro-vision' # 注意：Gemini的圖片生成模型名稱可能不同，此處為示例
            
            logger.info(f"使用 Gemini ({model_name}) 生成圖片...")
            model = genai.GenerativeModel(model_name)
            
            images = []
            for i in range(image_count):
                logger.info(f"正在生成第 {i+1}/{image_count} 張圖片")
                
                response = model.generate_content(
                    prompt,
                    generation_config=genai.GenerationConfig(temperature=0.7)
                )
                
                if hasattr(response, 'candidates') and response.candidates:
                    candidate = response.candidates[0]
                    if hasattr(candidate, 'content') and candidate.content.parts:
                        for part in candidate.content.parts:
                            if hasattr(part, 'inline_data'):
                                image_data = part.inline_data.data
                                mime_type = part.inline_data.mime_type
                                
                                filename, file_path, file_size = save_generated_image(image_data, prompt, i, 'gemini')
                                
                                if self.db_service and generation_id:
                                    self.db_service.save_generated_image(
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
                                break # 找到第一個圖片部分後就跳出
                
                if i < image_count - 1:
                    time.sleep(1) # 避免API速率限制
            
            if not images:
                raise Exception("未能從 Gemini 生成任何圖片，請檢查提示詞或API金鑰。")
            
            return images
            
        except Exception as e:
            logger.error(f"Gemini API調用失敗: {str(e)}")
            raise Exception(f"Gemini API調用失敗: {str(e)}") 