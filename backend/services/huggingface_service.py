"""
Hugging Face Service
提供Hugging Face模型的集成服務，支持圖像生成、文本生成和模型管理
"""

import asyncio
import aiohttp
import base64
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Union
import os
from io import BytesIO
from PIL import Image
import time

logger = logging.getLogger(__name__)

class HuggingFaceService:
    """Hugging Face API服務"""
    
    def __init__(self, api_token: str = None):
        self.api_token = api_token or os.getenv('HUGGINGFACE_API_TOKEN')
        self.base_url = "https://api-inference.huggingface.co/models"
        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        
        # 支持的模型配置
        self.models = {
            # 圖像生成模型
            "stable_diffusion": {
                "model_id": "stabilityai/stable-diffusion-xl-base-1.0",
                "type": "text-to-image",
                "description": "Stable Diffusion XL基礎模型，高品質圖像生成",
                "max_width": 1024,
                "max_height": 1024
            },
            "stable_diffusion_2": {
                "model_id": "stabilityai/stable-diffusion-2-1",
                "type": "text-to-image", 
                "description": "Stable Diffusion 2.1，優化的圖像生成",
                "max_width": 768,
                "max_height": 768
            },
            "dreamshaper": {
                "model_id": "Lykon/DreamShaper",
                "type": "text-to-image",
                "description": "DreamShaper模型，藝術風格圖像生成",
                "max_width": 512,
                "max_height": 512
            },
            "realistic_vision": {
                "model_id": "SG161222/Realistic_Vision_V4.0",
                "type": "text-to-image",
                "description": "逼真視覺模型，寫實風格圖像",
                "max_width": 512,
                "max_height": 512
            },
            "anime_diffusion": {
                "model_id": "hakurei/waifu-diffusion",
                "type": "text-to-image",
                "description": "動漫風格圖像生成模型",
                "max_width": 512,
                "max_height": 512
            },
            
            # 文本生成模型
            "flan_t5": {
                "model_id": "google/flan-t5-large",
                "type": "text-generation",
                "description": "Google Flan-T5大型語言模型",
                "max_tokens": 512
            },
            "gpt2": {
                "model_id": "gpt2-large",
                "type": "text-generation", 
                "description": "GPT-2大型文本生成模型",
                "max_tokens": 1024
            },
            "bloom": {
                "model_id": "bigscience/bloom-560m",
                "type": "text-generation",
                "description": "BLOOM多語言文本生成模型",
                "max_tokens": 256
            },
            
            # 圖像分析模型
            "blip": {
                "model_id": "Salesforce/blip-image-captioning-large",
                "type": "image-to-text",
                "description": "BLIP圖像描述生成模型"
            },
            "clip": {
                "model_id": "openai/clip-vit-large-patch14",
                "type": "feature-extraction",
                "description": "CLIP視覺-文本特徵提取模型"
            }
        }
        
        self.usage_stats = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "total_images_generated": 0,
            "total_texts_generated": 0,
            "models_used": {}
        }
    
    async def generate_image(self, 
                           prompt: str,
                           model: str = "stable_diffusion",
                           width: int = 512,
                           height: int = 512,
                           num_inference_steps: int = 20,
                           guidance_scale: float = 7.5,
                           negative_prompt: str = None,
                           seed: int = None) -> Dict:
        """生成圖像"""
        try:
            if model not in self.models or self.models[model]["type"] != "text-to-image":
                raise ValueError(f"不支持的圖像生成模型: {model}")
            
            model_config = self.models[model]
            model_id = model_config["model_id"]
            
            # 調整尺寸限制
            max_width = model_config.get("max_width", 512)
            max_height = model_config.get("max_height", 512)
            width = min(width, max_width)
            height = min(height, max_height)
            
            # 準備請求數據
            payload = {
                "inputs": prompt,
                "parameters": {
                    "width": width,
                    "height": height,
                    "num_inference_steps": num_inference_steps,
                    "guidance_scale": guidance_scale
                }
            }
            
            if negative_prompt:
                payload["parameters"]["negative_prompt"] = negative_prompt
            if seed:
                payload["parameters"]["seed"] = seed
            
            start_time = time.time()
            
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/{model_id}"
                
                # 等待模型加載（如果需要）
                for attempt in range(3):
                    async with session.post(url, headers=self.headers, json=payload) as response:
                        if response.status == 503:
                            # 模型正在加載，等待並重試
                            await asyncio.sleep(10 * (attempt + 1))
                            continue
                        elif response.status == 200:
                            image_bytes = await response.read()
                            break
                        else:
                            error_text = await response.text()
                            raise Exception(f"API請求失敗: {response.status} - {error_text}")
                else:
                    raise Exception("模型加載超時，請稍後重試")
            
            # 保存圖像
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"hf_{model}_{timestamp}.png"
            filepath = os.path.join("generated_images", filename)
            
            os.makedirs("generated_images", exist_ok=True)
            with open(filepath, "wb") as f:
                f.write(image_bytes)
            
            generation_time = time.time() - start_time
            
            # 更新統計
            self.usage_stats["total_requests"] += 1
            self.usage_stats["successful_requests"] += 1
            self.usage_stats["total_images_generated"] += 1
            self.usage_stats["models_used"][model] = self.usage_stats["models_used"].get(model, 0) + 1
            
            return {
                "success": True,
                "filename": filename,
                "filepath": filepath,
                "model": model,
                "model_id": model_id,
                "prompt": prompt,
                "width": width,
                "height": height,
                "generation_time": generation_time,
                "timestamp": timestamp
            }
            
        except Exception as e:
            self.usage_stats["total_requests"] += 1
            self.usage_stats["failed_requests"] += 1
            logger.error(f"圖像生成失敗: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "model": model,
                "prompt": prompt
            }
    
    async def generate_text(self,
                          prompt: str,
                          model: str = "flan_t5",
                          max_length: int = 100,
                          temperature: float = 0.7,
                          top_p: float = 0.9,
                          do_sample: bool = True) -> Dict:
        """生成文本"""
        try:
            if model not in self.models or self.models[model]["type"] != "text-generation":
                raise ValueError(f"不支持的文本生成模型: {model}")
            
            model_config = self.models[model]
            model_id = model_config["model_id"]
            
            # 調整長度限制
            max_tokens = model_config.get("max_tokens", 256)
            max_length = min(max_length, max_tokens)
            
            payload = {
                "inputs": prompt,
                "parameters": {
                    "max_length": max_length,
                    "temperature": temperature,
                    "top_p": top_p,
                    "do_sample": do_sample,
                    "return_full_text": False
                }
            }
            
            start_time = time.time()
            
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/{model_id}"
                
                for attempt in range(3):
                    async with session.post(url, headers=self.headers, json=payload) as response:
                        if response.status == 503:
                            await asyncio.sleep(10 * (attempt + 1))
                            continue
                        elif response.status == 200:
                            result = await response.json()
                            break
                        else:
                            error_text = await response.text()
                            raise Exception(f"API請求失敗: {response.status} - {error_text}")
                else:
                    raise Exception("模型加載超時，請稍後重試")
            
            generation_time = time.time() - start_time
            
            if isinstance(result, list) and len(result) > 0:
                generated_text = result[0].get("generated_text", "")
            else:
                generated_text = str(result)
            
            # 更新統計
            self.usage_stats["total_requests"] += 1
            self.usage_stats["successful_requests"] += 1
            self.usage_stats["total_texts_generated"] += 1
            self.usage_stats["models_used"][model] = self.usage_stats["models_used"].get(model, 0) + 1
            
            return {
                "success": True,
                "generated_text": generated_text,
                "model": model,
                "model_id": model_id,
                "prompt": prompt,
                "generation_time": generation_time,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            self.usage_stats["total_requests"] += 1
            self.usage_stats["failed_requests"] += 1
            logger.error(f"文本生成失敗: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "model": model,
                "prompt": prompt
            }
    
    async def analyze_image(self, image_path: str, model: str = "blip") -> Dict:
        """分析圖像並生成描述"""
        try:
            if model not in self.models or self.models[model]["type"] != "image-to-text":
                raise ValueError(f"不支持的圖像分析模型: {model}")
            
            model_config = self.models[model]
            model_id = model_config["model_id"]
            
            # 讀取並處理圖像
            with open(image_path, "rb") as f:
                image_bytes = f.read()
            
            start_time = time.time()
            
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/{model_id}"
                
                headers = {
                    "Authorization": f"Bearer {self.api_token}",
                    "Content-Type": "application/octet-stream"
                }
                
                for attempt in range(3):
                    async with session.post(url, headers=headers, data=image_bytes) as response:
                        if response.status == 503:
                            await asyncio.sleep(10 * (attempt + 1))
                            continue
                        elif response.status == 200:
                            result = await response.json()
                            break
                        else:
                            error_text = await response.text()
                            raise Exception(f"API請求失敗: {response.status} - {error_text}")
                else:
                    raise Exception("模型加載超時，請稍後重試")
            
            analysis_time = time.time() - start_time
            
            if isinstance(result, list) and len(result) > 0:
                description = result[0].get("generated_text", "")
            else:
                description = str(result)
            
            # 更新統計
            self.usage_stats["total_requests"] += 1
            self.usage_stats["successful_requests"] += 1
            self.usage_stats["models_used"][model] = self.usage_stats["models_used"].get(model, 0) + 1
            
            return {
                "success": True,
                "description": description,
                "model": model,
                "model_id": model_id,
                "image_path": image_path,
                "analysis_time": analysis_time,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            self.usage_stats["total_requests"] += 1
            self.usage_stats["failed_requests"] += 1
            logger.error(f"圖像分析失敗: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "model": model,
                "image_path": image_path
            }
    
    async def batch_generate_images(self, 
                                  prompts: List[str],
                                  model: str = "stable_diffusion",
                                  **kwargs) -> List[Dict]:
        """批量生成圖像"""
        results = []
        
        for i, prompt in enumerate(prompts):
            logger.info(f"批量生成進度: {i+1}/{len(prompts)}")
            result = await self.generate_image(prompt, model, **kwargs)
            results.append(result)
            
            # 避免API限制，添加延遲
            if i < len(prompts) - 1:
                await asyncio.sleep(1)
        
        successful = sum(1 for r in results if r["success"])
        failed = len(results) - successful
        
        return {
            "results": results,
            "summary": {
                "total": len(prompts),
                "successful": successful,
                "failed": failed,
                "success_rate": successful / len(prompts) if prompts else 0
            }
        }
    
    async def batch_generate_texts(self,
                                 prompts: List[str],
                                 model: str = "flan_t5",
                                 **kwargs) -> List[Dict]:
        """批量生成文本"""
        results = []
        
        for i, prompt in enumerate(prompts):
            logger.info(f"批量文本生成進度: {i+1}/{len(prompts)}")
            result = await self.generate_text(prompt, model, **kwargs)
            results.append(result)
            
            # 避免API限制
            if i < len(prompts) - 1:
                await asyncio.sleep(0.5)
        
        successful = sum(1 for r in results if r["success"])
        failed = len(results) - successful
        
        return {
            "results": results,
            "summary": {
                "total": len(prompts),
                "successful": successful,
                "failed": failed,
                "success_rate": successful / len(prompts) if prompts else 0
            }
        }
    
    async def get_model_info(self, model: str) -> Dict:
        """獲取模型詳細信息"""
        try:
            if model not in self.models:
                return {
                    "success": False,
                    "error": f"未找到模型: {model}"
                }
            
            model_config = self.models[model]
            model_id = model_config["model_id"]
            
            async with aiohttp.ClientSession() as session:
                url = f"https://api-inference.huggingface.co/models/{model_id}"
                headers = {"Authorization": f"Bearer {self.api_token}"}
                
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        model_info = await response.json()
                        
                        return {
                            "success": True,
                            "model": model,
                            "model_id": model_id,
                            "type": model_config["type"],
                            "description": model_config["description"],
                            "huggingface_info": model_info,
                            "config": model_config
                        }
                    else:
                        return {
                            "success": False,
                            "error": f"無法獲取模型信息: {response.status}"
                        }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_available_models(self, model_type: str = None) -> Dict:
        """獲取可用模型列表"""
        if model_type:
            filtered_models = {
                k: v for k, v in self.models.items() 
                if v["type"] == model_type
            }
        else:
            filtered_models = self.models
        
        return {
            "models": filtered_models,
            "count": len(filtered_models),
            "types": list(set(v["type"] for v in self.models.values()))
        }
    
    def get_usage_stats(self) -> Dict:
        """獲取使用統計"""
        stats = self.usage_stats.copy()
        
        if stats["total_requests"] > 0:
            stats["success_rate"] = stats["successful_requests"] / stats["total_requests"]
            stats["failure_rate"] = stats["failed_requests"] / stats["total_requests"]
        else:
            stats["success_rate"] = 0
            stats["failure_rate"] = 0
        
        # 計算最常用的模型
        if stats["models_used"]:
            most_used = max(stats["models_used"], key=stats["models_used"].get)
            stats["most_used_model"] = {
                "model": most_used,
                "usage_count": stats["models_used"][most_used]
            }
        
        return stats
    
    def reset_usage_stats(self):
        """重置使用統計"""
        self.usage_stats = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "total_images_generated": 0,
            "total_texts_generated": 0,
            "models_used": {}
        }
    
    async def health_check(self) -> Dict:
        """健康檢查"""
        try:
            # 測試API連接
            async with aiohttp.ClientSession() as session:
                url = "https://api-inference.huggingface.co/models/gpt2"
                headers = {"Authorization": f"Bearer {self.api_token}"}
                
                async with session.get(url, headers=headers) as response:
                    if response.status in [200, 503]:  # 503表示模型正在加載，也是正常的
                        api_status = "healthy"
                    else:
                        api_status = "unhealthy"
            
            return {
                "success": True,
                "api_status": api_status,
                "models_available": len(self.models),
                "usage_stats": self.get_usage_stats(),
                "timestamp": datetime.now().isoformat()
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def optimize_prompt(self, prompt: str, target_style: str = None) -> Dict:
        """優化提示詞以獲得更好的生成效果"""
        try:
            # 基本提示詞優化規則
            optimizations = []
            optimized_prompt = prompt.strip()
            
            # 添加質量提升詞
            quality_terms = [
                "high quality", "detailed", "professional", 
                "sharp focus", "masterpiece"
            ]
            
            # 根據目標風格添加特定詞彙
            style_terms = {
                "realistic": ["photorealistic", "8k resolution", "studio lighting"],
                "artistic": ["oil painting", "canvas texture", "brush strokes"],
                "anime": ["anime style", "manga", "cel shading"],
                "fantasy": ["fantasy art", "magical", "ethereal"],
                "portrait": ["portrait photography", "bokeh background", "studio lighting"]
            }
            
            if target_style and target_style in style_terms:
                style_additions = style_terms[target_style]
                optimized_prompt += f", {', '.join(style_additions)}"
                optimizations.append(f"添加{target_style}風格詞彙")
            
            # 添加通用質量詞彙
            if not any(term in optimized_prompt.lower() for term in quality_terms):
                optimized_prompt += f", {', '.join(quality_terms[:2])}"
                optimizations.append("添加質量提升詞彙")
            
            # 移除不良詞彙
            negative_terms = ["blurry", "low quality", "pixelated", "ugly"]
            original_length = len(optimized_prompt)
            for term in negative_terms:
                optimized_prompt = optimized_prompt.replace(term, "")
            
            if len(optimized_prompt) < original_length:
                optimizations.append("移除負面詞彙")
            
            return {
                "success": True,
                "original_prompt": prompt,
                "optimized_prompt": optimized_prompt.strip(),
                "optimizations": optimizations,
                "target_style": target_style
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "original_prompt": prompt
            }

# 實用工具函數
async def create_huggingface_service(api_token: str = None) -> HuggingFaceService:
    """創建Hugging Face服務實例"""
    service = HuggingFaceService(api_token)
    
    # 執行健康檢查
    health = await service.health_check()
    if not health["success"]:
        logger.warning(f"Hugging Face服務健康檢查失敗: {health.get('error')}")
    
    return service

def get_recommended_models() -> Dict:
    """獲取推薦模型配置"""
    return {
        "image_generation": {
            "beginner": "stable_diffusion_2",
            "advanced": "stable_diffusion", 
            "artistic": "dreamshaper",
            "realistic": "realistic_vision",
            "anime": "anime_diffusion"
        },
        "text_generation": {
            "general": "flan_t5",
            "creative": "gpt2",
            "multilingual": "bloom"
        },
        "image_analysis": {
            "captioning": "blip",
            "feature_extraction": "clip"
        }
    } 