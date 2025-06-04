"""
Replicate Platform Service
提供 Replicate API 整合和模型調用功能
"""

import os
import asyncio
import aiohttp
import json
import time
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
import logging

# 設置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ReplicateService:
    """Replicate 平台服務類"""
    
    def __init__(self, api_token: Optional[str] = None):
        self.api_token = api_token or os.getenv('REPLICATE_API_TOKEN')
        self.base_url = 'https://api.replicate.com/v1'
        self.session = None
        
        # 支援的熱門模型列表
        self.popular_models = {
            # 圖片生成模型
            'sdxl': {
                'name': 'Stable Diffusion XL',
                'version': 'stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc',
                'category': 'text-to-image',
                'description': '高品質文字轉圖片模型',
                'parameters': {
                    'prompt': {'type': 'string', 'required': True},
                    'negative_prompt': {'type': 'string', 'default': ''},
                    'width': {'type': 'integer', 'default': 1024, 'options': [512, 768, 1024, 1152, 1216]},
                    'height': {'type': 'integer', 'default': 1024, 'options': [512, 768, 1024, 1152, 1216]},
                    'num_outputs': {'type': 'integer', 'default': 1, 'min': 1, 'max': 4},
                    'scheduler': {'type': 'string', 'default': 'K_EULER', 'options': ['DDIM', 'K_EULER', 'DPMSolverMultistep', 'K_EULER_ANCESTRAL', 'PNDM', 'KLMS']},
                    'num_inference_steps': {'type': 'integer', 'default': 50, 'min': 1, 'max': 500},
                    'guidance_scale': {'type': 'number', 'default': 7.5, 'min': 1, 'max': 50},
                    'seed': {'type': 'integer', 'default': None}
                }
            },
            'midjourney': {
                'name': 'Midjourney Style',
                'version': 'prompthero/openjourney:9936c2001faa2194a261c01381f90e65261879985476014a0a37a334593a05eb',
                'category': 'text-to-image',
                'description': 'Midjourney 風格的圖片生成',
                'parameters': {
                    'prompt': {'type': 'string', 'required': True},
                    'negative_prompt': {'type': 'string', 'default': ''},
                    'width': {'type': 'integer', 'default': 512},
                    'height': {'type': 'integer', 'default': 512},
                    'num_outputs': {'type': 'integer', 'default': 1, 'min': 1, 'max': 4},
                    'num_inference_steps': {'type': 'integer', 'default': 50},
                    'guidance_scale': {'type': 'number', 'default': 7},
                    'seed': {'type': 'integer', 'default': None}
                }
            },
            'real_vision': {
                'name': 'Realistic Vision',
                'version': 'cjwbw/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
                'category': 'image-upscaling',
                'description': '圖片超解析度增強',
                'parameters': {
                    'image': {'type': 'file', 'required': True},
                    'scale': {'type': 'integer', 'default': 4, 'options': [2, 4]},
                    'face_enhance': {'type': 'boolean', 'default': False}
                }
            },
            'llava': {
                'name': 'LLaVA Vision',
                'version': 'yorickvp/llava-13b:2facb4a474a0462c15041b78b1ad70952ea46b5ec6ad29583c0b29dbd4249591',
                'category': 'image-to-text',
                'description': '圖片理解和描述',
                'parameters': {
                    'image': {'type': 'file', 'required': True},
                    'prompt': {'type': 'string', 'default': 'Describe this image'},
                    'max_tokens': {'type': 'integer', 'default': 1024},
                    'temperature': {'type': 'number', 'default': 0.2}
                }
            },
            'remove_bg': {
                'name': 'Background Removal',
                'version': 'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003',
                'category': 'image-processing',
                'description': '自動去背景',
                'parameters': {
                    'image': {'type': 'file', 'required': True}
                }
            }
        }
        
        self.usage_stats = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'total_cost': 0.0,
            'models_used': {}
        }
        
        logger.info('Replicate 服務已初始化')
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """獲取 HTTP 會話"""
        if self.session is None or self.session.closed:
            headers = {
                'Authorization': f'Token {self.api_token}',
                'Content-Type': 'application/json',
                'User-Agent': 'ImageGenerator/2.8'
            }
            timeout = aiohttp.ClientTimeout(total=300)  # 5分鐘超時
            self.session = aiohttp.ClientSession(headers=headers, timeout=timeout)
        return self.session
    
    async def close_session(self):
        """關閉會話"""
        if self.session and not self.session.closed:
            await self.session.close()
    
    def set_api_token(self, token: str):
        """設置 API 令牌"""
        self.api_token = token
        logger.info('Replicate API 令牌已更新')
    
    async def test_connection(self) -> Dict[str, Any]:
        """測試 API 連接"""
        try:
            session = await self._get_session()
            
            # 測試獲取賬戶資訊
            async with session.get(f'{self.base_url}/account') as response:
                if response.status == 200:
                    account_data = await response.json()
                    return {
                        'success': True,
                        'status': 'connected',
                        'account': account_data.get('username', 'Unknown'),
                        'message': 'Replicate API 連接成功'
                    }
                else:
                    error_text = await response.text()
                    return {
                        'success': False,
                        'status': 'error',
                        'error': f'HTTP {response.status}: {error_text}',
                        'message': 'API 連接失敗'
                    }
                    
        except Exception as e:
            logger.error(f'Replicate 連接測試失敗: {str(e)}')
            return {
                'success': False,
                'status': 'error',
                'error': str(e),
                'message': 'API 連接失敗'
            }
    
    async def get_models(self, category: Optional[str] = None) -> Dict[str, Any]:
        """獲取可用模型列表"""
        try:
            models = self.popular_models.copy()
            
            if category:
                models = {k: v for k, v in models.items() if v['category'] == category}
            
            return {
                'success': True,
                'models': models,
                'count': len(models)
            }
            
        except Exception as e:
            logger.error(f'獲取模型列表失敗: {str(e)}')
            return {
                'success': False,
                'error': str(e),
                'models': {}
            }
    
    async def create_prediction(self, model_key: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """創建預測任務"""
        try:
            if model_key not in self.popular_models:
                return {
                    'success': False,
                    'error': f'不支援的模型: {model_key}'
                }
            
            model_info = self.popular_models[model_key]
            session = await self._get_session()
            
            # 準備預測數據
            prediction_data = {
                'version': model_info['version'],
                'input': inputs
            }
            
            # 創建預測
            async with session.post(f'{self.base_url}/predictions', json=prediction_data) as response:
                if response.status == 201:
                    prediction = await response.json()
                    
                    # 更新統計
                    self.usage_stats['total_requests'] += 1
                    if model_key not in self.usage_stats['models_used']:
                        self.usage_stats['models_used'][model_key] = 0
                    self.usage_stats['models_used'][model_key] += 1
                    
                    return {
                        'success': True,
                        'prediction_id': prediction['id'],
                        'status': prediction['status'],
                        'model': model_info['name'],
                        'created_at': prediction['created_at']
                    }
                else:
                    error_text = await response.text()
                    logger.error(f'創建預測失敗: {error_text}')
                    return {
                        'success': False,
                        'error': f'HTTP {response.status}: {error_text}'
                    }
                    
        except Exception as e:
            logger.error(f'創建預測失敗: {str(e)}')
            self.usage_stats['failed_requests'] += 1
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_prediction(self, prediction_id: str) -> Dict[str, Any]:
        """獲取預測結果"""
        try:
            session = await self._get_session()
            
            async with session.get(f'{self.base_url}/predictions/{prediction_id}') as response:
                if response.status == 200:
                    prediction = await response.json()
                    
                    result = {
                        'success': True,
                        'prediction_id': prediction_id,
                        'status': prediction['status'],
                        'created_at': prediction.get('created_at'),
                        'started_at': prediction.get('started_at'),
                        'completed_at': prediction.get('completed_at')
                    }
                    
                    if prediction['status'] == 'succeeded':
                        result['output'] = prediction.get('output')
                        result['metrics'] = prediction.get('metrics', {})
                        self.usage_stats['successful_requests'] += 1
                    elif prediction['status'] == 'failed':
                        result['error'] = prediction.get('error')
                        self.usage_stats['failed_requests'] += 1
                    
                    return result
                else:
                    error_text = await response.text()
                    return {
                        'success': False,
                        'error': f'HTTP {response.status}: {error_text}'
                    }
                    
        except Exception as e:
            logger.error(f'獲取預測失敗: {str(e)}')
            return {
                'success': False,
                'error': str(e)
            }
    
    async def wait_for_prediction(self, prediction_id: str, max_wait_time: int = 300) -> Dict[str, Any]:
        """等待預測完成"""
        start_time = time.time()
        
        while time.time() - start_time < max_wait_time:
            result = await self.get_prediction(prediction_id)
            
            if not result['success']:
                return result
            
            status = result['status']
            
            if status in ['succeeded', 'failed', 'canceled']:
                return result
            
            # 等待 5 秒後重試
            await asyncio.sleep(5)
        
        return {
            'success': False,
            'error': 'Prediction timeout',
            'prediction_id': prediction_id
        }
    
    async def generate_image(self, model_key: str, prompt: str, **kwargs) -> Dict[str, Any]:
        """生成圖片的便捷方法"""
        try:
            if model_key not in self.popular_models:
                return {
                    'success': False,
                    'error': f'不支援的模型: {model_key}'
                }
            
            model_info = self.popular_models[model_key]
            
            # 準備輸入參數
            inputs = {'prompt': prompt}
            
            # 添加可選參數
            for param_name, param_info in model_info['parameters'].items():
                if param_name in kwargs:
                    inputs[param_name] = kwargs[param_name]
                elif 'default' in param_info and param_info['default'] is not None:
                    inputs[param_name] = param_info['default']
            
            logger.info(f'使用 {model_info["name"]} 生成圖片: {prompt[:50]}...')
            
            # 創建預測
            prediction_result = await self.create_prediction(model_key, inputs)
            
            if not prediction_result['success']:
                return prediction_result
            
            # 等待完成
            final_result = await self.wait_for_prediction(prediction_result['prediction_id'])
            
            if final_result['success'] and final_result['status'] == 'succeeded':
                return {
                    'success': True,
                    'images': final_result['output'] if isinstance(final_result['output'], list) else [final_result['output']],
                    'model': model_info['name'],
                    'prompt': prompt,
                    'prediction_id': prediction_result['prediction_id'],
                    'metrics': final_result.get('metrics', {})
                }
            else:
                return {
                    'success': False,
                    'error': final_result.get('error', '生成失敗'),
                    'prediction_id': prediction_result['prediction_id']
                }
                
        except Exception as e:
            logger.error(f'圖片生成失敗: {str(e)}')
            return {
                'success': False,
                'error': str(e)
            }
    
    async def analyze_image(self, image_url: str, prompt: str = "Describe this image") -> Dict[str, Any]:
        """分析圖片內容"""
        try:
            inputs = {
                'image': image_url,
                'prompt': prompt
            }
            
            logger.info(f'分析圖片: {image_url}')
            
            prediction_result = await self.create_prediction('llava', inputs)
            
            if not prediction_result['success']:
                return prediction_result
            
            final_result = await self.wait_for_prediction(prediction_result['prediction_id'])
            
            if final_result['success'] and final_result['status'] == 'succeeded':
                return {
                    'success': True,
                    'analysis': final_result['output'],
                    'prompt': prompt,
                    'prediction_id': prediction_result['prediction_id']
                }
            else:
                return {
                    'success': False,
                    'error': final_result.get('error', '分析失敗'),
                    'prediction_id': prediction_result['prediction_id']
                }
                
        except Exception as e:
            logger.error(f'圖片分析失敗: {str(e)}')
            return {
                'success': False,
                'error': str(e)
            }
    
    async def remove_background(self, image_url: str) -> Dict[str, Any]:
        """去除圖片背景"""
        try:
            inputs = {'image': image_url}
            
            logger.info(f'去除背景: {image_url}')
            
            prediction_result = await self.create_prediction('remove_bg', inputs)
            
            if not prediction_result['success']:
                return prediction_result
            
            final_result = await self.wait_for_prediction(prediction_result['prediction_id'])
            
            if final_result['success'] and final_result['status'] == 'succeeded':
                return {
                    'success': True,
                    'processed_image': final_result['output'],
                    'prediction_id': prediction_result['prediction_id']
                }
            else:
                return {
                    'success': False,
                    'error': final_result.get('error', '處理失敗'),
                    'prediction_id': prediction_result['prediction_id']
                }
                
        except Exception as e:
            logger.error(f'背景去除失敗: {str(e)}')
            return {
                'success': False,
                'error': str(e)
            }
    
    async def upscale_image(self, image_url: str, scale: int = 4) -> Dict[str, Any]:
        """圖片超解析度"""
        try:
            inputs = {
                'image': image_url,
                'scale': scale
            }
            
            logger.info(f'圖片超解析度: {image_url} (x{scale})')
            
            prediction_result = await self.create_prediction('real_vision', inputs)
            
            if not prediction_result['success']:
                return prediction_result
            
            final_result = await self.wait_for_prediction(prediction_result['prediction_id'])
            
            if final_result['success'] and final_result['status'] == 'succeeded':
                return {
                    'success': True,
                    'upscaled_image': final_result['output'],
                    'scale': scale,
                    'prediction_id': prediction_result['prediction_id']
                }
            else:
                return {
                    'success': False,
                    'error': final_result.get('error', '處理失敗'),
                    'prediction_id': prediction_result['prediction_id']
                }
                
        except Exception as e:
            logger.error(f'圖片超解析度失敗: {str(e)}')
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_usage_stats(self) -> Dict[str, Any]:
        """獲取使用統計"""
        success_rate = 0
        if self.usage_stats['total_requests'] > 0:
            success_rate = (self.usage_stats['successful_requests'] / self.usage_stats['total_requests']) * 100
        
        return {
            'total_requests': self.usage_stats['total_requests'],
            'successful_requests': self.usage_stats['successful_requests'],
            'failed_requests': self.usage_stats['failed_requests'],
            'success_rate': round(success_rate, 2),
            'total_cost': self.usage_stats['total_cost'],
            'models_used': self.usage_stats['models_used'],
            'popular_models': list(self.popular_models.keys())
        }
    
    def get_model_info(self, model_key: str) -> Dict[str, Any]:
        """獲取模型詳細資訊"""
        if model_key not in self.popular_models:
            return {
                'success': False,
                'error': f'不支援的模型: {model_key}'
            }
        
        return {
            'success': True,
            'model': self.popular_models[model_key]
        }
    
    async def batch_generate(self, prompts: List[str], model_key: str = 'sdxl', **kwargs) -> List[Dict[str, Any]]:
        """批量生成圖片"""
        results = []
        
        logger.info(f'開始批量生成 {len(prompts)} 張圖片')
        
        for i, prompt in enumerate(prompts, 1):
            logger.info(f'處理第 {i}/{len(prompts)} 個提示詞')
            
            try:
                result = await self.generate_image(model_key, prompt, **kwargs)
                result['index'] = i
                result['prompt'] = prompt
                results.append(result)
                
                # 避免 API 速率限制
                if i < len(prompts):
                    await asyncio.sleep(2)
                    
            except Exception as e:
                logger.error(f'批量生成第 {i} 個失敗: {str(e)}')
                results.append({
                    'success': False,
                    'error': str(e),
                    'index': i,
                    'prompt': prompt
                })
        
        success_count = sum(1 for r in results if r.get('success', False))
        logger.info(f'批量生成完成: {success_count}/{len(prompts)} 成功')
        
        return results

# 全局實例
replicate_service = ReplicateService()

# 清理函數
async def cleanup_replicate_service():
    """清理服務資源"""
    await replicate_service.close_session()
    logger.info('Replicate 服務資源已清理')

if __name__ == "__main__":
    import asyncio
    
    async def test_service():
        # 測試連接
        connection_result = await replicate_service.test_connection()
        print("連接測試:", connection_result)
        
        # 獲取模型
        models_result = await replicate_service.get_models()
        print("可用模型:", models_result)
        
        # 清理
        await cleanup_replicate_service()
    
    asyncio.run(test_service()) 