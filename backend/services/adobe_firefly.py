"""
Adobe Firefly API 整合服務
提供 Adobe Firefly 圖片生成功能
"""

import requests
import json
import time
import uuid
from datetime import datetime
import os

class AdobeFireflyService:
    def __init__(self):
        self.base_url = "https://firefly-api.adobe.io/v2/images/generate"
        self.api_key = None
        self.client_id = None
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
        
    def configure(self, api_key, client_id=None):
        """配置 Adobe Firefly API 認證"""
        self.api_key = api_key
        self.client_id = client_id or "ai-image-generator"
        
    def validate_connection(self):
        """驗證 API 連接是否正常"""
        if not self.api_key:
            return False, "未設置 API 金鑰"
            
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'X-API-Key': self.client_id,
                'Content-Type': 'application/json'
            }
            
            # 測試連接
            test_data = {
                'prompt': 'test connection',
                'size': '512x512',
                'n': 1
            }
            
            response = requests.post(
                self.base_url,
                headers=headers,
                json=test_data,
                timeout=10
            )
            
            if response.status_code == 200:
                return True, "連接成功"
            elif response.status_code == 401:
                return False, "API 金鑰無效"
            elif response.status_code == 403:
                return False, "API 權限不足"
            else:
                return False, f"連接失敗: {response.status_code}"
                
        except requests.exceptions.Timeout:
            return False, "連接超時"
        except requests.exceptions.ConnectionError:
            return False, "網路連接錯誤"
        except Exception as e:
            return False, f"連接錯誤: {str(e)}"
    
    def generate_images(self, prompt, **kwargs):
        """
        生成圖片
        
        Args:
            prompt (str): 提示詞
            **kwargs: 其他參數
                - model (str): 模型名稱 (firefly-v2, firefly-v3)
                - size (str): 圖片尺寸 (512x512, 1024x1024, 2048x2048)
                - count (int): 生成數量 (1-4)
                - style (str): 風格設定
                - negative_prompt (str): 負面提示詞
                - seed (int): 隨機種子
                - quality (str): 品質設定 (standard, high)
        
        Returns:
            dict: 包含生成結果的字典
        """
        
        if not self.api_key:
            return {
                'success': False,
                'error': '未配置 Adobe Firefly API 金鑰',
                'images': []
            }
        
        # 參數處理
        model = kwargs.get('model', 'firefly-v2')
        size = kwargs.get('size', '1024x1024')
        count = min(kwargs.get('count', 1), 4)
        style = kwargs.get('style', 'auto')
        negative_prompt = kwargs.get('negative_prompt', '')
        seed = kwargs.get('seed')
        quality = kwargs.get('quality', 'standard')
        
        # 構建請求數據
        request_data = {
            'prompt': prompt,
            'size': size,
            'n': count,
            'model': model,
            'response_format': 'b64_json',
            'quality': quality
        }
        
        # 添加可選參數
        if negative_prompt:
            request_data['negative_prompt'] = negative_prompt
            
        if seed:
            request_data['seed'] = seed
            
        if style != 'auto':
            request_data['style'] = style
        
        # 設置請求頭
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'X-API-Key': self.client_id,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        try:
            print(f"🎨 Adobe Firefly 開始生成: {prompt[:50]}...")
            
            # 發送請求
            response = requests.post(
                self.base_url,
                headers=headers,
                json=request_data,
                timeout=120  # Adobe API 可能較慢
            )
            
            print(f"📡 API 回應狀態: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                
                images = []
                if 'data' in result:
                    for idx, image_data in enumerate(result['data']):
                        if 'b64_json' in image_data:
                            # 生成唯一檔名
                            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                            filename = f"firefly_{timestamp}_{uuid.uuid4().hex[:8]}_{idx+1}.png"
                            
                            images.append({
                                'filename': filename,
                                'b64_data': image_data['b64_json'],
                                'prompt': prompt,
                                'model': model,
                                'size': size,
                                'provider': 'adobe_firefly',
                                'metadata': {
                                    'style': style,
                                    'quality': quality,
                                    'negative_prompt': negative_prompt,
                                    'seed': seed,
                                    'revised_prompt': image_data.get('revised_prompt', prompt)
                                }
                            })
                
                print(f"✅ Adobe Firefly 生成成功: {len(images)} 張圖片")
                
                return {
                    'success': True,
                    'images': images,
                    'provider': 'adobe_firefly',
                    'model': model,
                    'total_count': len(images)
                }
                
            elif response.status_code == 400:
                error_data = response.json()
                error_msg = error_data.get('error', {}).get('message', '請求參數錯誤')
                print(f"❌ Adobe Firefly 參數錯誤: {error_msg}")
                
                return {
                    'success': False,
                    'error': f'參數錯誤: {error_msg}',
                    'images': []
                }
                
            elif response.status_code == 401:
                print("❌ Adobe Firefly API 金鑰無效")
                return {
                    'success': False,
                    'error': 'API 金鑰無效或已過期',
                    'images': []
                }
                
            elif response.status_code == 403:
                print("❌ Adobe Firefly API 權限不足")
                return {
                    'success': False,
                    'error': 'API 權限不足或配額已用完',
                    'images': []
                }
                
            elif response.status_code == 429:
                print("❌ Adobe Firefly API 請求過於頻繁")
                return {
                    'success': False,
                    'error': '請求過於頻繁，請稍後再試',
                    'images': []
                }
                
            else:
                error_text = response.text
                print(f"❌ Adobe Firefly API 未知錯誤: {response.status_code} - {error_text}")
                
                return {
                    'success': False,
                    'error': f'API 錯誤 ({response.status_code}): {error_text}',
                    'images': []
                }
                
        except requests.exceptions.Timeout:
            print("❌ Adobe Firefly API 請求超時")
            return {
                'success': False,
                'error': '請求超時，Adobe Firefly 伺服器可能忙碌',
                'images': []
            }
            
        except requests.exceptions.ConnectionError:
            print("❌ Adobe Firefly API 連接錯誤")
            return {
                'success': False,
                'error': '無法連接到 Adobe Firefly 伺服器',
                'images': []
            }
            
        except json.JSONDecodeError:
            print("❌ Adobe Firefly API 回應格式錯誤")
            return {
                'success': False,
                'error': 'API 回應格式錯誤',
                'images': []
            }
            
        except Exception as e:
            print(f"❌ Adobe Firefly API 未預期錯誤: {str(e)}")
            return {
                'success': False,
                'error': f'未預期錯誤: {str(e)}',
                'images': []
            }
    
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

# 實例化服務
adobe_firefly_service = AdobeFireflyService() 