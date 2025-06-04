"""
本地 AI 服務 v2.8
支援 Ollama 和其他本地 AI 模型的整合
"""

import asyncio
import aiohttp
import json
import logging
from typing import Dict, List, Optional, AsyncGenerator
from datetime import datetime
import subprocess
import os
import psutil

logger = logging.getLogger(__name__)

class LocalAIService:
    """本地 AI 模型服務"""
    
    def __init__(self):
        self.ollama_base_url = "http://localhost:11434"
        self.available_models = []
        self.model_configs = {
            'llama2': {
                'name': 'llama2:7b',
                'description': 'Meta Llama 2 7B 參數模型',
                'memory_required': '4GB',
                'use_cases': ['通用對話', '文本生成', '代碼輔助']
            },
            'codellama': {
                'name': 'codellama:7b',
                'description': 'Code Llama 7B 代碼專用模型',
                'memory_required': '4GB',
                'use_cases': ['代碼生成', '代碼解釋', '編程助手']
            },
            'llava': {
                'name': 'llava:7b',
                'description': 'LLaVA 多模態視覺語言模型',
                'memory_required': '6GB',
                'use_cases': ['圖像描述', '視覺問答', '圖像分析']
            },
            'mistral': {
                'name': 'mistral:7b',
                'description': 'Mistral 7B 高效能模型',
                'memory_required': '4GB',
                'use_cases': ['快速推理', '多語言支援', '對話生成']
            },
            'neural-chat': {
                'name': 'neural-chat:7b',
                'description': 'Intel Neural Chat 對話模型',
                'memory_required': '4GB',
                'use_cases': ['對話系統', '客服助手', '問答系統']
            }
        }
        
        self.session_stats = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'total_tokens': 0,
            'average_response_time': 0.0
        }
        
        self.is_ollama_running = False
        self.system_requirements_met = False
        
    async def initialize(self) -> bool:
        """初始化本地 AI 服務"""
        try:
            # 檢查系統需求
            if not self._check_system_requirements():
                logger.warning("系統需求不符合，某些功能可能受限")
                
            # 檢查 Ollama 是否運行
            await self._check_ollama_status()
            
            if self.is_ollama_running:
                # 獲取可用模型列表
                await self._refresh_available_models()
                logger.info(f"本地 AI 服務初始化成功，發現 {len(self.available_models)} 個模型")
                return True
            else:
                logger.warning("Ollama 未運行，嘗試啟動...")
                await self._start_ollama()
                return False
                
        except Exception as e:
            logger.error(f"本地 AI 服務初始化失敗: {str(e)}")
            return False
    
    def _check_system_requirements(self) -> bool:
        """檢查系統需求"""
        try:
            # 檢查記憶體
            memory = psutil.virtual_memory()
            available_gb = memory.available / (1024**3)
            
            if available_gb < 4:
                logger.warning(f"可用記憶體不足: {available_gb:.1f}GB (建議至少 4GB)")
                return False
                
            # 檢查 CPU
            cpu_count = psutil.cpu_count()
            if cpu_count < 4:
                logger.warning(f"CPU 核心數較少: {cpu_count} (建議至少 4 核心)")
                
            self.system_requirements_met = True
            return True
            
        except Exception as e:
            logger.error(f"系統需求檢查失敗: {str(e)}")
            return False
    
    async def _check_ollama_status(self) -> bool:
        """檢查 Ollama 服務狀態"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.ollama_base_url}/api/tags", 
                                     timeout=aiohttp.ClientTimeout(total=5)) as response:
                    self.is_ollama_running = response.status == 200
                    return self.is_ollama_running
                    
        except Exception as e:
            logger.debug(f"Ollama 連接檢查: {str(e)}")
            self.is_ollama_running = False
            return False
    
    async def _start_ollama(self) -> bool:
        """嘗試啟動 Ollama 服務"""
        try:
            # 檢查 Ollama 是否已安裝
            result = subprocess.run(['ollama', '--version'], 
                                  capture_output=True, text=True, timeout=10)
            
            if result.returncode != 0:
                logger.error("Ollama 未安裝，請先安裝 Ollama")
                return False
                
            # 嘗試啟動 Ollama 服務
            logger.info("正在啟動 Ollama 服務...")
            subprocess.Popen(['ollama', 'serve'], 
                           stdout=subprocess.DEVNULL, 
                           stderr=subprocess.DEVNULL)
            
            # 等待服務啟動
            await asyncio.sleep(5)
            
            # 重新檢查狀態
            return await self._check_ollama_status()
            
        except subprocess.TimeoutExpired:
            logger.error("Ollama 啟動逾時")
            return False
        except FileNotFoundError:
            logger.error("找不到 Ollama 執行檔，請確認已正確安裝")
            return False
        except Exception as e:
            logger.error(f"啟動 Ollama 失敗: {str(e)}")
            return False
    
    async def _refresh_available_models(self) -> List[Dict]:
        """刷新可用模型列表"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.ollama_base_url}/api/tags") as response:
                    if response.status == 200:
                        data = await response.json()
                        self.available_models = data.get('models', [])
                        
                        # 添加模型詳細信息
                        for model in self.available_models:
                            model_name = model['name'].split(':')[0]
                            if model_name in self.model_configs:
                                model.update(self.model_configs[model_name])
                                
                        return self.available_models
                    else:
                        logger.error(f"獲取模型列表失敗: {response.status}")
                        return []
                        
        except Exception as e:
            logger.error(f"刷新模型列表失敗: {str(e)}")
            return []
    
    async def get_available_models(self) -> List[Dict]:
        """獲取可用模型列表"""
        if not self.is_ollama_running:
            await self._check_ollama_status()
            
        if self.is_ollama_running:
            return await self._refresh_available_models()
        else:
            return []
    
    async def download_model(self, model_name: str) -> AsyncGenerator[Dict, None]:
        """下載模型（流式返回進度）"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.ollama_base_url}/api/pull",
                    json={"name": model_name}
                ) as response:
                    
                    if response.status != 200:
                        yield {"status": "error", "message": f"下載失敗: {response.status}"}
                        return
                    
                    async for line in response.content:
                        if line:
                            try:
                                data = json.loads(line)
                                yield {
                                    "status": data.get("status", "downloading"),
                                    "completed": data.get("completed", 0),
                                    "total": data.get("total", 0),
                                    "message": data.get("status", "正在下載...")
                                }
                            except json.JSONDecodeError:
                                continue
                                
        except Exception as e:
            yield {"status": "error", "message": f"下載模型失敗: {str(e)}"}
    
    async def remove_model(self, model_name: str) -> bool:
        """移除模型"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.delete(
                    f"{self.ollama_base_url}/api/delete",
                    json={"name": model_name}
                ) as response:
                    
                    success = response.status == 200
                    if success:
                        await self._refresh_available_models()
                        logger.info(f"模型 {model_name} 已成功移除")
                    else:
                        logger.error(f"移除模型失敗: {response.status}")
                        
                    return success
                    
        except Exception as e:
            logger.error(f"移除模型失敗: {str(e)}")
            return False
    
    async def generate_response(self, 
                              model_name: str, 
                              prompt: str, 
                              system_prompt: Optional[str] = None,
                              temperature: float = 0.7,
                              max_tokens: Optional[int] = None,
                              stream: bool = False) -> AsyncGenerator[Dict, None]:
        """生成 AI 回應（支援流式輸出）"""
        
        start_time = datetime.now()
        self.session_stats['total_requests'] += 1
        
        try:
            # 構建請求數據
            request_data = {
                "model": model_name,
                "prompt": prompt,
                "stream": stream,
                "options": {
                    "temperature": temperature
                }
            }
            
            if system_prompt:
                request_data["system"] = system_prompt
                
            if max_tokens:
                request_data["options"]["num_predict"] = max_tokens
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.ollama_base_url}/api/generate",
                    json=request_data
                ) as response:
                    
                    if response.status != 200:
                        self.session_stats['failed_requests'] += 1
                        yield {"error": f"請求失敗: {response.status}"}
                        return
                    
                    total_response = ""
                    
                    if stream:
                        # 流式輸出
                        async for line in response.content:
                            if line:
                                try:
                                    data = json.loads(line)
                                    
                                    if "response" in data:
                                        response_text = data["response"]
                                        total_response += response_text
                                        
                                        yield {
                                            "response": response_text,
                                            "done": data.get("done", False),
                                            "total_duration": data.get("total_duration", 0),
                                            "load_duration": data.get("load_duration", 0),
                                            "prompt_eval_count": data.get("prompt_eval_count", 0),
                                            "eval_count": data.get("eval_count", 0)
                                        }
                                        
                                        if data.get("done", False):
                                            break
                                            
                                except json.JSONDecodeError:
                                    continue
                    else:
                        # 非流式輸出
                        data = await response.json()
                        total_response = data.get("response", "")
                        
                        yield {
                            "response": total_response,
                            "done": True,
                            "total_duration": data.get("total_duration", 0),
                            "load_duration": data.get("load_duration", 0),
                            "prompt_eval_count": data.get("prompt_eval_count", 0),
                            "eval_count": data.get("eval_count", 0)
                        }
                    
                    # 更新統計信息
                    end_time = datetime.now()
                    response_time = (end_time - start_time).total_seconds()
                    
                    self.session_stats['successful_requests'] += 1
                    self.session_stats['total_tokens'] += len(total_response.split())
                    
                    # 更新平均回應時間
                    total_successful = self.session_stats['successful_requests']
                    current_avg = self.session_stats['average_response_time']
                    self.session_stats['average_response_time'] = (
                        (current_avg * (total_successful - 1) + response_time) / total_successful
                    )
                    
        except Exception as e:
            self.session_stats['failed_requests'] += 1
            logger.error(f"生成回應失敗: {str(e)}")
            yield {"error": f"生成回應失敗: {str(e)}"}
    
    async def analyze_image(self, model_name: str, image_path: str, question: str = "請描述這張圖片") -> Dict:
        """使用多模態模型分析圖片"""
        try:
            # 檢查是否為視覺模型
            if 'llava' not in model_name.lower():
                return {"error": "所選模型不支援圖片分析功能"}
                
            # 讀取圖片文件
            if not os.path.exists(image_path):
                return {"error": "圖片文件不存在"}
                
            import base64
            with open(image_path, "rb") as image_file:
                image_data = base64.b64encode(image_file.read()).decode()
            
            request_data = {
                "model": model_name,
                "prompt": question,
                "images": [image_data]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.ollama_base_url}/api/generate",
                    json=request_data
                ) as response:
                    
                    if response.status == 200:
                        data = await response.json()
                        return {
                            "analysis": data.get("response", ""),
                            "model": model_name,
                            "question": question,
                            "success": True
                        }
                    else:
                        return {"error": f"圖片分析失敗: {response.status}"}
                        
        except Exception as e:
            logger.error(f"圖片分析失敗: {str(e)}")
            return {"error": f"圖片分析失敗: {str(e)}"}
    
    async def enhance_prompt_locally(self, original_prompt: str, style: str = "detailed") -> Dict:
        """使用本地模型增強提示詞"""
        try:
            available_models = await self.get_available_models()
            
            # 選擇最佳模型進行提示詞增強
            best_model = None
            for model in available_models:
                if 'mistral' in model['name'] or 'llama2' in model['name']:
                    best_model = model['name']
                    break
                    
            if not best_model:
                return {"error": "沒有找到適合的模型進行提示詞增強"}
            
            # 構建增強提示詞的系統提示
            system_prompt = f"""你是一個專業的 AI 圖片生成提示詞優化專家。
請將用戶的原始提示詞優化為更詳細、更專業的版本，以便生成更高質量的圖片。

優化風格: {style}
- detailed: 添加詳細的視覺描述、光照、構圖等元素
- artistic: 強調藝術風格、色彩搭配、情感表達
- photographic: 注重攝影技巧、景深、鏡頭效果
- cinematic: 電影級視覺效果、戲劇性構圖

請直接返回優化後的提示詞，不要包含解釋文字。"""

            enhancement_prompt = f"原始提示詞: {original_prompt}\n\n請優化這個提示詞："
            
            # 生成增強版本
            enhanced_response = ""
            async for chunk in self.generate_response(
                model_name=best_model,
                prompt=enhancement_prompt,
                system_prompt=system_prompt,
                temperature=0.7,
                max_tokens=200
            ):
                if "response" in chunk:
                    enhanced_response += chunk["response"]
                    
                if chunk.get("done", False):
                    break
            
            return {
                "original_prompt": original_prompt,
                "enhanced_prompt": enhanced_response.strip(),
                "style": style,
                "model_used": best_model,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"本地提示詞增強失敗: {str(e)}")
            return {"error": f"本地提示詞增強失敗: {str(e)}"}
    
    def get_service_status(self) -> Dict:
        """獲取服務狀態"""
        return {
            "ollama_running": self.is_ollama_running,
            "system_requirements_met": self.system_requirements_met,
            "available_models_count": len(self.available_models),
            "session_stats": self.session_stats.copy(),
            "memory_usage": self._get_memory_usage(),
            "supported_features": {
                "text_generation": True,
                "code_generation": any('code' in model.get('name', '') for model in self.available_models),
                "image_analysis": any('llava' in model.get('name', '') for model in self.available_models),
                "multi_language": True
            }
        }
    
    def _get_memory_usage(self) -> Dict:
        """獲取記憶體使用情況"""
        try:
            memory = psutil.virtual_memory()
            return {
                "total_gb": round(memory.total / (1024**3), 2),
                "available_gb": round(memory.available / (1024**3), 2),
                "used_percent": memory.percent,
                "free_gb": round(memory.free / (1024**3), 2)
            }
        except Exception:
            return {"error": "無法獲取記憶體信息"}
    
    async def cleanup(self):
        """清理資源"""
        # 清理統計信息
        self.session_stats = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'total_tokens': 0,
            'average_response_time': 0.0
        }
        
        logger.info("本地 AI 服務已清理完成")

# 全域實例
local_ai_service = LocalAIService() 