import os
import base64
import io
import logging
from PIL import Image
from datetime import datetime

logger = logging.getLogger(__name__)

GENERATED_IMAGES_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'images')
if not os.path.exists(GENERATED_IMAGES_DIR):
    os.makedirs(GENERATED_IMAGES_DIR)

def save_generated_image(image_data, prompt, index, provider='unknown'):
    """
    一個共享的函式，用於解碼、儲存圖片並回傳相關資訊。
    
    Args:
        image_data (bytes or str): Base64 編碼的字串或原始 bytes。
        prompt (str): 用於生成的提示詞。
        index (int): 批次生成中的圖片索引。
        provider (str): API 供應商的名稱。

    Returns:
        tuple: (filename, filepath, file_size)
    """
    try:
        if isinstance(image_data, str):
            image_bytes = base64.b64decode(image_data)
        else:
            image_bytes = image_data

        image = Image.open(io.BytesIO(image_bytes))
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_prompt = "".join(c for c in prompt[:20] if c.isalnum()).rstrip().replace(' ', '_')
        filename = f"{timestamp}_{provider}_{safe_prompt}_{index+1}.png"
        filepath = os.path.join(GENERATED_IMAGES_DIR, filename)
        
        image.save(filepath, 'PNG')
        
        file_size = os.path.getsize(filepath)
        
        logger.info(f"圖片已保存: {filepath}, 大小: {file_size} bytes")
        return filename, filepath, file_size
        
    except Exception as e:
        logger.error(f"保存圖片失敗: {str(e)}")
        # 在失敗時回傳可識別的錯誤資訊
        error_filename = f"error_{provider}_{index+1}.png"
        return error_filename, "", 0 