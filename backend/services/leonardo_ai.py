"""
Leonardo AI 整合服務
提供 Leonardo AI 專業級圖片生成功能
"""

import requests
import json
import time
import uuid
from datetime import datetime
import os

class LeonardoAIService:
    def __init__(self):
        self.base_url = "https://cloud.leonardo.ai/api/rest/v1"
        self.api_key = None
        self.supported_models = {
            'leonardo-creative': {
                'name': 'Leonardo Creative',
                'max_size': '1536x1536',
                'description': 'Leonardo AI 創意模型，適合藝術創作'
            },
            'leonardo-select': {
                'name': 'Leonardo Select',
                'max_size': '1536x1536',
                'description': 'Leonardo AI 精選模型，高品質輸出'
            },
            'leonardo-signature': {
                'name': 'Leonardo Signature',
                'max_size': '1536x1536',
                'description': 'Leonardo AI 簽名模型，最新技術'
            },
            'photoreal': {
                'name': 'PhotoReal',
                'max_size': '1536x1536',
                'description': '照片級真實感圖片生成'
            },
            'anime-character': {
                'name': 'Anime Character',
                'max_size': '1536x1536',
                'description': '專業動漫角色生成'
            }
        }
        
    def configure(self, api_key):
        """配置 Leonardo AI API 認證"""
        self.api_key = api_key
        
    def validate_connection(self):
        """驗證 API 連接是否正常"""
        if not self.api_key:
            return False, "未設置 API 金鑰"
            
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            # 測試連接 - 獲取用戶資訊
            response = requests.get(
                f"{self.base_url}/me",
                headers=headers,
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
                - model (str): 模型名稱
                - size (str): 圖片尺寸 (512x512, 768x768, 1024x1024, 1536x1536)
                - count (int): 生成數量 (1-8)
                - negative_prompt (str): 負面提示詞
                - guidance_scale (float): 引導強度 (7-20)
                - seed (int): 隨機種子
                - style (str): 風格設定
                - photoreal (bool): 是否使用照片真實感
        
        Returns:
            dict: 包含生成結果的字典
        """
        
        if not self.api_key:
            return {
                'success': False,
                'error': '未配置 Leonardo AI API 金鑰',
                'images': []
            }
        
        # 參數處理
        model = kwargs.get('model', 'leonardo-creative')
        size = kwargs.get('size', '1024x1024')
        count = min(kwargs.get('count', 1), 8)
        negative_prompt = kwargs.get('negative_prompt', '')
        guidance_scale = kwargs.get('guidance_scale', 7)
        seed = kwargs.get('seed')
        style = kwargs.get('style', 'general')
        photoreal = kwargs.get('photoreal', False)
        
        # 解析尺寸
        try:
            width, height = map(int, size.split('x'))
        except:
            width, height = 1024, 1024
        
        # 構建請求數據
        request_data = {
            'prompt': prompt,
            'width': width,
            'height': height,
            'num_images': count,
            'guidance_scale': guidance_scale,
            'model_id': self._get_model_id(model),
            'public': False,
            'scheduler': 'LEONARDO'
        }
        
        # 添加可選參數
        if negative_prompt:
            request_data['negative_prompt'] = negative_prompt
            
        if seed:
            request_data['seed'] = seed
            
        if photoreal:
            request_data['photoReal'] = True
            request_data['photoRealVersion'] = 'v2'
        
        # 設置請求頭
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        try:
            print(f"🎨 Leonardo AI 開始生成: {prompt[:50]}...")
            
            # 步驟1: 創建生成任務
            response = requests.post(
                f"{self.base_url}/generations",
                headers=headers,
                json=request_data,
                timeout=30
            )
            
            print(f"📡 Leonardo AI 任務創建狀態: {response.status_code}")
            
            if response.status_code != 200:
                error_data = response.json() if response.content else {}
                error_msg = error_data.get('error', f'HTTP {response.status_code}')
                
                return {
                    'success': False,
                    'error': f'Leonardo AI 任務創建失敗: {error_msg}',
                    'images': []
                }
            
            result = response.json()
            generation_id = result.get('sdGenerationJob', {}).get('generationId')
            
            if not generation_id:
                return {
                    'success': False,
                    'error': 'Leonardo AI 未返回生成任務 ID',
                    'images': []
                }
            
            print(f"🎯 Leonardo AI 任務 ID: {generation_id}")
            
            # 步驟2: 輪詢生成狀態
            max_attempts = 60  # 最多等待10分鐘
            attempt = 0
            
            while attempt < max_attempts:
                time.sleep(10)  # 每10秒檢查一次
                attempt += 1
                
                status_response = requests.get(
                    f"{self.base_url}/generations/{generation_id}",
                    headers=headers,
                    timeout=30
                )
                
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    generation = status_data.get('generations_by_pk', {})
                    status = generation.get('status')
                    
                    print(f"📊 Leonardo AI 狀態檢查 {attempt}: {status}")
                    
                    if status == 'COMPLETE':
                        # 生成完成，處理結果
                        images = []
                        generated_images = generation.get('generated_images', [])
                        
                        for idx, image_data in enumerate(generated_images):
                            if 'url' in image_data:
                                # 下載圖片
                                image_url = image_data['url']
                                
                                try:
                                    img_response = requests.get(image_url, timeout=30)
                                    if img_response.status_code == 200:
                                        # 生成唯一檔名
                                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                                        filename = f"leonardo_{timestamp}_{uuid.uuid4().hex[:8]}_{idx+1}.png"
                                        
                                        # 將圖片數據轉換為 base64
                                        import base64
                                        b64_data = base64.b64encode(img_response.content).decode('utf-8')
                                        
                                        images.append({
                                            'filename': filename,
                                            'b64_data': b64_data,
                                            'prompt': prompt,
                                            'model': model,
                                            'size': size,
                                            'provider': 'leonardo_ai',
                                            'metadata': {
                                                'guidance_scale': guidance_scale,
                                                'negative_prompt': negative_prompt,
                                                'seed': image_data.get('seed'),
                                                'style': style,
                                                'photoreal': photoreal,
                                                'leonardo_id': image_data.get('id')
                                            }
                                        })
                                        
                                except Exception as e:
                                    print(f"❌ 下載圖片失敗: {str(e)}")
                                    continue
                        
                        print(f"✅ Leonardo AI 生成完成: {len(images)} 張圖片")
                        
                        return {
                            'success': True,
                            'images': images,
                            'provider': 'leonardo_ai',
                            'model': model,
                            'total_count': len(images),
                            'generation_id': generation_id
                        }
                        
                    elif status == 'FAILED':
                        return {
                            'success': False,
                            'error': 'Leonardo AI 生成失敗',
                            'images': []
                        }
                    
                    # 狀態為 PENDING 或 IN_PROGRESS，繼續等待
                    
                else:
                    print(f"❌ Leonardo AI 狀態檢查失敗: {status_response.status_code}")
            
            # 超時
            return {
                'success': False,
                'error': 'Leonardo AI 生成超時，請稍後再試',
                'images': []
            }
                
        except requests.exceptions.Timeout:
            print("❌ Leonardo AI API 請求超時")
            return {
                'success': False,
                'error': '請求超時，Leonardo AI 伺服器可能忙碌',
                'images': []
            }
            
        except requests.exceptions.ConnectionError:
            print("❌ Leonardo AI API 連接錯誤")
            return {
                'success': False,
                'error': '無法連接到 Leonardo AI 伺服器',
                'images': []
            }
            
        except json.JSONDecodeError:
            print("❌ Leonardo AI API 回應格式錯誤")
            return {
                'success': False,
                'error': 'API 回應格式錯誤',
                'images': []
            }
            
        except Exception as e:
            print(f"❌ Leonardo AI API 未預期錯誤: {str(e)}")
            return {
                'success': False,
                'error': f'未預期錯誤: {str(e)}',
                'images': []
            }
    
    def _get_model_id(self, model_name):
        """獲取模型 ID"""
        model_ids = {
            'leonardo-creative': 'b24e16ff-06e3-43eb-8d33-4416c2d75876',
            'leonardo-select': '6bef9f1b-29cb-40c7-b9df-32b51c1f67d3',
            'leonardo-signature': '291be633-cb24-434f-898f-e662799936ad',
            'photoreal': 'ac614f96-1082-45bf-be9d-757f2d31c174',
            'anime-character': 'aa77f04e-3eec-4034-9c07-d0f619684628'
        }
        return model_ids.get(model_name, model_ids['leonardo-creative'])
    
    def get_model_info(self):
        """獲取模型資訊"""
        return self.supported_models
    
    def get_available_sizes(self):
        """獲取支援的圖片尺寸"""
        return [
            '512x512',
            '512x768',
            '768x512',
            '768x768',
            '768x1024',
            '1024x768',
            '1024x1024',
            '1024x1536',
            '1536x1024',
            '1536x1536'
        ]
    
    def get_available_styles(self):
        """獲取支援的風格"""
        return [
            'general',
            'cinematic',
            'photography',
            'digital-art',
            'vintage',
            'anime',
            'illustration',
            'fantasy',
            'sci-fi',
            'portrait',
            'landscape',
            'abstract',
            'minimalist',
            'hyperrealistic',
            'concept-art'
        ]
    
    def optimize_prompt_for_leonardo(self, prompt):
        """
        為 Leonardo AI 優化提示詞
        
        Args:
            prompt (str): 原始提示詞
            
        Returns:
            str: 優化後的提示詞
        """
        
        # Leonardo AI 的優化建議
        optimizations = []
        
        # 添加藝術風格描述
        if 'style' not in prompt.lower() and 'art' not in prompt.lower():
            optimizations.append("professional artwork")
        
        # 添加細節描述
        if 'detailed' not in prompt.lower():
            optimizations.append("highly detailed")
        
        # 添加品質描述
        if 'quality' not in prompt.lower() and 'best' not in prompt.lower():
            optimizations.append("masterpiece, best quality")
        
        # 添加燈光描述
        if any(word in prompt.lower() for word in ['photo', 'portrait', 'character']):
            if 'lighting' not in prompt.lower():
                optimizations.append("dramatic lighting")
        
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
        
        base_time = 30  # Leonardo AI 基礎時間較長
        
        # 根據尺寸調整
        size_multiplier = {
            '512x512': 1.0,
            '768x768': 1.2,
            '1024x1024': 1.5,
            '1536x1536': 2.0
        }
        
        multiplier = size_multiplier.get(size, 1.5)
        estimated_time = int(base_time * multiplier * count)
        
        return max(estimated_time, 30)  # 最少30秒
    
    def get_user_info(self):
        """獲取用戶資訊"""
        if not self.api_key:
            return None
        
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                f"{self.base_url}/me",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return None
                
        except Exception as e:
            print(f"❌ 獲取 Leonardo AI 用戶資訊失敗: {str(e)}")
            return None

# 實例化服務
leonardo_ai_service = LeonardoAIService() 