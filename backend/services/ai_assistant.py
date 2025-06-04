"""
AI 智能助手服務 v2.7
整合 ChatGPT API 提供智能提示詞生成、圖片分析、標籤生成等功能
新增：批量處理、多語言支援、進階優化功能
"""

import openai
import json
import time
import logging
import asyncio
from typing import Dict, List, Optional, Union, Tuple
import base64
import io
from PIL import Image
import cv2
import numpy as np
from datetime import datetime
import hashlib
import concurrent.futures
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class OptimizationTask:
    """優化任務資料結構"""
    id: str
    original_prompt: str
    style: Optional[str] = None
    complexity: str = "moderate"
    target_language: str = "en"
    status: str = "pending"  # pending, processing, completed, failed
    result: Optional[Dict] = None
    error: Optional[str] = None
    created_at: datetime = None
    completed_at: Optional[datetime] = None

class AIAssistantService:
    """AI 智能助手服務類 v2.7"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        初始化 AI 助手服務
        
        Args:
            api_key: OpenAI API 金鑰
        """
        self.api_key = api_key
        self.client = None
        self.request_count = 0
        self.last_request_time = 0
        self.rate_limit_delay = 1  # 請求間隔（秒）
        
        # v2.7 新增功能
        self.batch_tasks = {}  # 批量任務追蹤
        self.optimization_history = []  # 優化歷史記錄
        self.language_cache = {}  # 翻譯緩存
        self.style_templates = {}  # 風格模板緩存
        self.max_concurrent_tasks = 3  # 最大並發任務數
        
        if api_key:
            self.configure(api_key)
    
    def configure(self, api_key: str) -> bool:
        """
        配置 OpenAI API 金鑰
        
        Args:
            api_key: OpenAI API 金鑰
            
        Returns:
            bool: 配置是否成功
        """
        try:
            self.api_key = api_key
            openai.api_key = api_key
            self.client = openai.OpenAI(api_key=api_key)
            
            # 測試 API 連接
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=10
            )
            
            logger.info("AI 助手服務 v2.7 配置成功")
            return True
            
        except Exception as e:
            logger.error(f"AI 助手服務配置失敗: {str(e)}")
            return False
    
    def _wait_for_rate_limit(self):
        """處理請求速率限制"""
        current_time = time.time()
        time_since_last_request = current_time - self.last_request_time
        
        if time_since_last_request < self.rate_limit_delay:
            time.sleep(self.rate_limit_delay - time_since_last_request)
        
        self.last_request_time = time.time()
        self.request_count += 1
    
    def _generate_task_id(self, prompt: str) -> str:
        """生成任務唯一標識符"""
        timestamp = str(int(time.time() * 1000))
        content_hash = hashlib.md5(prompt.encode()).hexdigest()[:8]
        return f"task_{timestamp}_{content_hash}"
    
    async def enhance_prompt(self, user_prompt: str, style: str = None, 
                           target_language: str = "en", complexity: str = "moderate") -> Dict:
        """
        使用 ChatGPT 增強用戶提示詞 (v2.7 增強版)
        
        Args:
            user_prompt: 用戶原始提示詞
            style: 目標藝術風格
            target_language: 目標語言
            complexity: 優化複雜度 (light, moderate, aggressive, creative)
            
        Returns:
            Dict: 包含優化結果的字典
        """
        if not self.client:
            return {"success": False, "error": "AI 助手未配置"}
        
        try:
            self._wait_for_rate_limit()
            
            # 檢查緩存
            cache_key = f"{user_prompt}_{style}_{target_language}_{complexity}"
            if cache_key in self.language_cache:
                logger.info("使用緩存的優化結果")
                return self.language_cache[cache_key]
            
            # 構建提示詞模板
            complexity_instructions = {
                "light": "進行基本的語法和結構優化，保持簡潔",
                "moderate": "進行中等程度的專業優化，添加適當的藝術術語和技術細節",
                "aggressive": "進行深度專業優化，使用高級藝術概念、技術術語和創意元素",
                "creative": "進行創意性優化，增加想像力和藝術表現力，推薦新穎的視覺效果"
            }
            
            style_instruction = f"目標風格：{style}" if style else "分析並推薦最適合的風格"
            
            prompt_template = f"""
作為頂級 AI 圖片生成專家，請深度優化以下提示詞：

原始提示詞：{user_prompt}
{style_instruction}
優化程度：{complexity_instructions.get(complexity, '中等程度')}
目標語言：{target_language}

請以 JSON 格式回覆，包含以下欄位：
{{
    "optimized_prompt": "優化後的完整提示詞",
    "improvements": ["具體改進點1", "具體改進點2", "具體改進點3"],
    "negative_prompts": ["負面提示詞1", "負面提示詞2", "負面提示詞3"],
    "technical_params": {{
        "recommended_steps": 30,
        "cfg_scale": 7.5,
        "sampler": "DPM++ 2M Karras",
        "resolution": "1024x1024",
        "quality_tips": "詳細的品質建議和參數說明"
    }},
    "style_analysis": {{
        "detected_style": "識別的藝術風格",
        "recommended_styles": ["推薦風格1", "推薦風格2"],
        "mood": "情緒描述",
        "color_palette": ["主要色彩1", "主要色彩2"]
    }},
    "alternative_versions": [
        "變化版本1",
        "變化版本2",
        "創意版本"
    ],
    "explanation": "詳細的優化說明和建議",
    "confidence_score": 85,
    "estimated_generation_time": "預估生成時間",
    "difficulty_level": "生成難度等級"
}}
"""
            
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system", 
                        "content": "你是世界頂級的 AI 圖片生成專家，擁有深厚的藝術理論知識、技術專業和創意想像力。專門協助用戶創作出令人驚艷的視覺作品。"
                    },
                    {"role": "user", "content": prompt_template}
                ],
                max_tokens=1500,
                temperature=0.8
            )
            
            # 解析回應
            content = response.choices[0].message.content
            
            # 嘗試解析 JSON 回應
            try:
                result = json.loads(content)
            except json.JSONDecodeError:
                # JSON 解析失敗的備用方案
                result = {
                    "optimized_prompt": content[:300] + "...",
                    "improvements": ["AI 專業優化", "結構重組", "藝術細節增強"],
                    "negative_prompts": ["blurry", "low quality", "distorted", "artifacts"],
                    "technical_params": {
                        "recommended_steps": 30,
                        "cfg_scale": 7.5,
                        "sampler": "DPM++ 2M Karras",
                        "resolution": "1024x1024",
                        "quality_tips": "使用推薦的高品質參數設置"
                    },
                    "style_analysis": {
                        "detected_style": "現代數位藝術",
                        "recommended_styles": ["概念藝術", "超現實主義"],
                        "mood": "專業創作",
                        "color_palette": ["暖色調", "對比色"]
                    },
                    "alternative_versions": [
                        "簡化版本",
                        "詳細版本",
                        "藝術風格版本"
                    ],
                    "explanation": "AI 助手提供的專業優化建議",
                    "confidence_score": 75,
                    "estimated_generation_time": "30-60秒",
                    "difficulty_level": "中等"
                }
            
            # 緩存結果
            final_result = {
                "success": True,
                "original_prompt": user_prompt,
                "result": result,
                "processing_time": time.time() - self.last_request_time,
                "optimization_version": "v2.7"
            }
            
            self.language_cache[cache_key] = final_result
            self.optimization_history.append({
                "timestamp": datetime.now(),
                "original": user_prompt,
                "optimized": result.get("optimized_prompt", ""),
                "style": style,
                "complexity": complexity
            })
            
            return final_result
            
        except Exception as e:
            logger.error(f"提示詞增強失敗: {str(e)}")
            return {
                "success": False,
                "error": f"提示詞增強失敗: {str(e)}",
                "original_prompt": user_prompt
            }

    async def batch_optimize_prompts(self, prompts_list: List[Dict]) -> Dict:
        """
        批量優化提示詞 (v2.7 新功能)
        
        Args:
            prompts_list: 提示詞列表，每個元素包含 {prompt, style, complexity, target_language}
            
        Returns:
            Dict: 批量處理結果
        """
        if not self.client:
            return {"success": False, "error": "AI 助手未配置"}
        
        batch_id = self._generate_task_id("batch_" + str(len(prompts_list)))
        
        try:
            # 創建批量任務
            tasks = []
            for i, prompt_config in enumerate(prompts_list):
                task = OptimizationTask(
                    id=f"{batch_id}_task_{i}",
                    original_prompt=prompt_config.get("prompt", ""),
                    style=prompt_config.get("style"),
                    complexity=prompt_config.get("complexity", "moderate"),
                    target_language=prompt_config.get("target_language", "en"),
                    created_at=datetime.now()
                )
                tasks.append(task)
                self.batch_tasks[task.id] = task
            
            # 並行處理任務
            semaphore = asyncio.Semaphore(self.max_concurrent_tasks)
            
            async def process_single_task(task):
                async with semaphore:
                    try:
                        task.status = "processing"
                        result = await self.enhance_prompt(
                            task.original_prompt,
                            task.style,
                            task.target_language,
                            task.complexity
                        )
                        
                        if result["success"]:
                            task.status = "completed"
                            task.result = result
                        else:
                            task.status = "failed"
                            task.error = result.get("error", "未知錯誤")
                        
                        task.completed_at = datetime.now()
                        
                    except Exception as e:
                        task.status = "failed"
                        task.error = str(e)
                        task.completed_at = datetime.now()
                        logger.error(f"批量任務處理失敗 {task.id}: {str(e)}")
            
            # 並行執行所有任務
            await asyncio.gather(*[process_single_task(task) for task in tasks])
            
            # 統計結果
            completed_tasks = [task for task in tasks if task.status == "completed"]
            failed_tasks = [task for task in tasks if task.status == "failed"]
            
            success_rate = len(completed_tasks) / len(tasks) * 100 if tasks else 0
            
            return {
                "success": True,
                "batch_id": batch_id,
                "total_tasks": len(tasks),
                "completed_tasks": len(completed_tasks),
                "failed_tasks": len(failed_tasks),
                "success_rate": round(success_rate, 2),
                "results": [
                    {
                        "task_id": task.id,
                        "original_prompt": task.original_prompt,
                        "status": task.status,
                        "result": task.result,
                        "error": task.error,
                        "processing_time": (task.completed_at - task.created_at).total_seconds() if task.completed_at else None
                    }
                    for task in tasks
                ],
                "summary": {
                    "average_processing_time": sum([
                        (task.completed_at - task.created_at).total_seconds() 
                        for task in completed_tasks
                    ]) / len(completed_tasks) if completed_tasks else 0,
                    "total_processing_time": sum([
                        (task.completed_at - task.created_at).total_seconds() 
                        for task in tasks if task.completed_at
                    ])
                }
            }
            
        except Exception as e:
            logger.error(f"批量優化失敗: {str(e)}")
            return {
                "success": False,
                "error": f"批量優化失敗: {str(e)}",
                "batch_id": batch_id
            }

    async def translate_prompt(self, prompt: str, target_language: str, 
                             preserve_technical_terms: bool = True) -> Dict:
        """
        智能翻譯提示詞 (v2.7 新功能)
        
        Args:
            prompt: 原始提示詞
            target_language: 目標語言
            preserve_technical_terms: 是否保留技術術語
            
        Returns:
            Dict: 翻譯結果
        """
        if not self.client:
            return {"success": False, "error": "AI 助手未配置"}
        
        try:
            self._wait_for_rate_limit()
            
            technical_instruction = "保留所有技術術語和專業詞彙" if preserve_technical_terms else "完全翻譯所有內容"
            
            prompt_template = f"""
作為專業的多語言 AI 圖片生成專家，請將以下提示詞翻譯到{target_language}：

原始提示詞：{prompt}
翻譯要求：{technical_instruction}

請以 JSON 格式回覆：
{{
    "translated_prompt": "翻譯後的提示詞",
    "original_language": "檢測到的原始語言",
    "translation_quality": "翻譯品質評分（1-10）",
    "preserved_terms": ["保留的術語1", "保留的術語2"],
    "cultural_adaptations": ["文化適應性調整1", "文化適應性調整2"],
    "alternative_translations": ["替代翻譯1", "替代翻譯2"],
    "notes": "翻譯說明和建議"
}}
"""
            
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system", 
                        "content": "你是專業的多語言翻譯專家，特別專精於 AI 圖片生成領域的術語翻譯。"
                    },
                    {"role": "user", "content": prompt_template}
                ],
                max_tokens=800,
                temperature=0.3
            )
            
            content = response.choices[0].message.content
            
            try:
                result = json.loads(content)
            except json.JSONDecodeError:
                # 備用解析
                result = {
                    "translated_prompt": content[:200],
                    "original_language": "自動檢測",
                    "translation_quality": 8,
                    "preserved_terms": [],
                    "cultural_adaptations": [],
                    "alternative_translations": [],
                    "notes": "AI 翻譯結果"
                }
            
            return {
                "success": True,
                "original_prompt": prompt,
                "target_language": target_language,
                "result": result,
                "processing_time": time.time() - self.last_request_time
            }
            
        except Exception as e:
            logger.error(f"提示詞翻譯失敗: {str(e)}")
            return {
                "success": False,
                "error": f"提示詞翻譯失敗: {str(e)}",
                "original_prompt": prompt
            }

    async def get_style_recommendations(self, user_input: str, 
                                      mood: str = None, 
                                      genre: str = None) -> Dict:
        """
        獲取風格推薦 (v2.7 增強版)
        
        Args:
            user_input: 用戶輸入描述
            mood: 期望情緒
            genre: 藝術類型
            
        Returns:
            Dict: 風格推薦結果
        """
        if not self.client:
            return {"success": False, "error": "AI 助手未配置"}
        
        try:
            self._wait_for_rate_limit()
            
            mood_instruction = f"情緒導向：{mood}" if mood else "分析並推薦合適的情緒"
            genre_instruction = f"藝術類型：{genre}" if genre else "推薦最適合的藝術類型"
            
            prompt_template = f"""
作為資深藝術指導和風格專家，請基於以下描述推薦最適合的視覺風格：

用戶描述：{user_input}
{mood_instruction}
{genre_instruction}

請以 JSON 格式提供詳細的風格推薦：
{{
    "primary_style": {{
        "name": "主要推薦風格名稱",
        "description": "風格詳細描述",
        "key_characteristics": ["特徵1", "特徵2", "特徵3"],
        "famous_artists": ["代表藝術家1", "代表藝術家2"],
        "technical_approach": "技術實現方法",
        "confidence_score": 90
    }},
    "alternative_styles": [
        {{
            "name": "替代風格1",
            "description": "風格描述",
            "confidence_score": 85
        }},
        {{
            "name": "替代風格2",
            "description": "風格描述",
            "confidence_score": 80
        }}
    ],
    "color_recommendations": {{
        "primary_palette": ["主色調1", "主色調2"],
        "accent_colors": ["強調色1", "強調色2"],
        "mood_colors": ["情緒色彩1", "情緒色彩2"]
    }},
    "composition_tips": [
        "構圖建議1",
        "構圖建議2",
        "構圖建議3"
    ],
    "lighting_suggestions": {{
        "type": "光線類型",
        "direction": "光線方向",
        "intensity": "光線強度",
        "mood_impact": "情緒影響"
    }},
    "technical_keywords": ["技術關鍵詞1", "技術關鍵詞2"],
    "style_evolution": {{
        "beginner_version": "初學者版本",
        "intermediate_version": "中級版本",
        "advanced_version": "高級版本"
    }},
    "inspiration_sources": ["靈感來源1", "靈感來源2"],
    "common_pitfalls": ["常見陷阱1", "常見陷阱2"]
}}
"""
            
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system", 
                        "content": "你是世界知名的藝術指導和視覺風格專家，擁有豐富的藝術史知識和當代視覺趨勢洞察。"
                    },
                    {"role": "user", "content": prompt_template}
                ],
                max_tokens=1200,
                temperature=0.7
            )
            
            content = response.choices[0].message.content
            
            try:
                result = json.loads(content)
            except json.JSONDecodeError:
                # 備用結果
                result = {
                    "primary_style": {
                        "name": "現代數位藝術",
                        "description": "融合傳統藝術技法與數位創新",
                        "key_characteristics": ["高細節", "豐富色彩", "創新構圖"],
                        "famous_artists": ["當代數位藝術家"],
                        "technical_approach": "數位繪畫技法",
                        "confidence_score": 75
                    },
                    "alternative_styles": [
                        {"name": "概念藝術", "description": "注重創意和概念表達", "confidence_score": 70}
                    ],
                    "color_recommendations": {
                        "primary_palette": ["藍色系", "暖色調"],
                        "accent_colors": ["金色", "白色"],
                        "mood_colors": ["柔和色調"]
                    },
                    "composition_tips": ["平衡構圖", "視覺重點明確"],
                    "lighting_suggestions": {
                        "type": "自然光",
                        "direction": "側光",
                        "intensity": "中等",
                        "mood_impact": "溫暖舒適"
                    },
                    "technical_keywords": ["high quality", "detailed"],
                    "style_evolution": {
                        "beginner_version": "簡化版本",
                        "intermediate_version": "標準版本",
                        "advanced_version": "專業版本"
                    },
                    "inspiration_sources": ["自然景觀", "現代設計"],
                    "common_pitfalls": ["過度複雜", "缺乏重點"]
                }
            
            return {
                "success": True,
                "user_input": user_input,
                "result": result,
                "processing_time": time.time() - self.last_request_time,
                "recommendations_version": "v2.7"
            }
            
        except Exception as e:
            logger.error(f"風格推薦失敗: {str(e)}")
            return {
                "success": False,
                "error": f"風格推薦失敗: {str(e)}",
                "user_input": user_input
            }

    async def analyze_image_style(self, image_data: Union[str, bytes], 
                                 prompt: str = None) -> Dict:
        """
        分析圖片風格和品質
        
        Args:
            image_data: 圖片數據（base64 編碼或二進制）
            prompt: 原始提示詞（可選）
            
        Returns:
            Dict: 圖片分析結果
        """
        if not self.client:
            return {"success": False, "error": "AI 助手未配置"}
        
        try:
            self._wait_for_rate_limit()
            
            # 處理圖片數據
            if isinstance(image_data, str):
                # base64 編碼的圖片
                image_base64 = image_data
            else:
                # 二進制圖片數據
                image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            # 使用 GPT-4 Vision 分析圖片
            prompt_template = f"""
請分析這張圖片的藝術風格、品質和特徵。
{"原始提示詞：" + prompt if prompt else ""}

請以 JSON 格式回覆，包含以下欄位：
{{
    "art_style": "檢測到的藝術風格",
    "quality_score": 85,
    "style_elements": ["風格元素1", "風格元素2"],
    "colors": ["主要顏色1", "主要顏色2"],
    "composition": "構圖分析",
    "strengths": ["優點1", "優點2"],
    "improvements": ["改進建議1", "改進建議2"],
    "similar_styles": ["相似風格1", "相似風格2"],
    "technical_quality": {{
        "sharpness": 8,
        "lighting": 9,
        "details": 7
    }}
}}
"""
            
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt_template
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_base64}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=800
            )
            
            content = response.choices[0].message.content
            
            # 解析回應
            try:
                result = json.loads(content)
            except json.JSONDecodeError:
                # 基本分析回退
                result = {
                    "art_style": "Mixed",
                    "quality_score": 75,
                    "style_elements": ["AI Generated"],
                    "colors": ["Multiple"],
                    "composition": "Standard composition",
                    "strengths": ["Clear image"],
                    "improvements": ["可以進一步優化"],
                    "similar_styles": ["Digital Art"],
                    "technical_quality": {
                        "sharpness": 7,
                        "lighting": 7,
                        "details": 7
                    }
                }
            
            return {
                "success": True,
                "result": result,
                "processing_time": time.time() - self.last_request_time
            }
            
        except Exception as e:
            logger.error(f"圖片分析失敗: {str(e)}")
            return {
                "success": False,
                "error": f"圖片分析失敗: {str(e)}"
            }
    
    async def generate_smart_tags(self, image_data: Union[str, bytes] = None, 
                                 prompt: str = None, style: str = None) -> Dict:
        """
        生成智能標籤
        
        Args:
            image_data: 圖片數據（可選）
            prompt: 提示詞
            style: 風格
            
        Returns:
            Dict: 包含智能標籤的結果
        """
        if not self.client:
            return {"success": False, "error": "AI 助手未配置"}
        
        try:
            self._wait_for_rate_limit()
            
            # 構建分析請求
            analysis_text = ""
            if prompt:
                analysis_text += f"提示詞：{prompt}\n"
            if style:
                analysis_text += f"風格：{style}\n"
            
            prompt_template = f"""
基於以下資訊生成相關的智能標籤：
{analysis_text}

請以 JSON 格式回覆，包含以下欄位：
{{
    "content_tags": ["內容標籤1", "內容標籤2"],
    "style_tags": ["風格標籤1", "風格標籤2"],
    "technique_tags": ["技術標籤1", "技術標籤2"],
    "mood_tags": ["情緒標籤1", "情緒標籤2"],
    "color_tags": ["顏色標籤1", "顏色標籤2"],
    "popular_tags": ["熱門標籤1", "熱門標籤2"],
    "seo_tags": ["SEO標籤1", "SEO標籤2"]
}}
"""
            
            messages = [
                {
                    "role": "system",
                    "content": "你是專業的圖片標籤生成專家，能夠為圖片生成準確且有用的標籤。"
                },
                {"role": "user", "content": prompt_template}
            ]
            
            # 如果有圖片，添加圖片分析
            if image_data:
                if isinstance(image_data, str):
                    image_base64 = image_data
                else:
                    image_base64 = base64.b64encode(image_data).decode('utf-8')
                
                messages[1]["content"] = [
                    {"type": "text", "text": prompt_template},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}
                    }
                ]
            
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=600
            )
            
            content = response.choices[0].message.content
            
            # 解析回應
            try:
                result = json.loads(content)
            except json.JSONDecodeError:
                # 基本標籤回退
                result = {
                    "content_tags": ["digital art", "AI generated"],
                    "style_tags": ["modern", "creative"],
                    "technique_tags": ["digital painting"],
                    "mood_tags": ["artistic"],
                    "color_tags": ["colorful"],
                    "popular_tags": ["art", "design"],
                    "seo_tags": ["artwork", "illustration"]
                }
            
            return {
                "success": True,
                "result": result,
                "total_tags": sum(len(tags) for tags in result.values()),
                "processing_time": time.time() - self.last_request_time
            }
            
        except Exception as e:
            logger.error(f"智能標籤生成失敗: {str(e)}")
            return {
                "success": False,
                "error": f"智能標籤生成失敗: {str(e)}"
            }
    
    async def get_style_suggestions(self, user_input: str) -> Dict:
        """
        根據用戶輸入獲取風格建議
        
        Args:
            user_input: 用戶輸入的描述
            
        Returns:
            Dict: 風格建議結果
        """
        if not self.client:
            return {"success": False, "error": "AI 助手未配置"}
        
        try:
            self._wait_for_rate_limit()
            
            prompt_template = f"""
基於用戶的描述："{user_input}"

請推薦適合的藝術風格和技術參數，以 JSON 格式回覆：
{{
    "recommended_styles": [
        {{
            "name": "風格名稱",
            "description": "風格描述",
            "keywords": ["關鍵詞1", "關鍵詞2"],
            "example_prompt": "示例提示詞"
        }}
    ],
    "technical_suggestions": {{
        "recommended_size": "1024x1024",
        "steps": 30,
        "cfg_scale": 7.5
    }},
    "alternative_approaches": ["方法1", "方法2"]
}}
"""
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "你是專業的藝術風格顧問，能夠根據用戶需求推薦最適合的藝術風格。"
                    },
                    {"role": "user", "content": prompt_template}
                ],
                max_tokens=800
            )
            
            content = response.choices[0].message.content
            
            try:
                result = json.loads(content)
            except json.JSONDecodeError:
                result = {
                    "recommended_styles": [
                        {
                            "name": "Digital Art",
                            "description": "現代數位藝術風格",
                            "keywords": ["digital", "modern"],
                            "example_prompt": "digital art style"
                        }
                    ],
                    "technical_suggestions": {
                        "recommended_size": "1024x1024",
                        "steps": 30,
                        "cfg_scale": 7.5
                    },
                    "alternative_approaches": ["嘗試不同的風格關鍵詞"]
                }
            
            return {
                "success": True,
                "result": result,
                "processing_time": time.time() - self.last_request_time
            }
            
        except Exception as e:
            logger.error(f"風格建議生成失敗: {str(e)}")
            return {
                "success": False,
                "error": f"風格建議生成失敗: {str(e)}"
            }
    
    def get_usage_stats(self) -> Dict:
        """獲取使用統計"""
        return {
            "total_requests": self.request_count,
            "last_request_time": self.last_request_time,
            "rate_limit_delay": self.rate_limit_delay,
            "is_configured": self.client is not None
        }
    
    # v2.7 新增實用方法
    
    def get_batch_task_status(self, batch_id: str) -> Dict:
        """
        獲取批量任務狀態 (v2.7 新功能)
        
        Args:
            batch_id: 批量任務ID
            
        Returns:
            Dict: 批量任務狀態資訊
        """
        batch_tasks = [task for task in self.batch_tasks.values() 
                      if task.id.startswith(batch_id)]
        
        if not batch_tasks:
            return {"success": False, "error": "批量任務不存在"}
        
        completed = len([t for t in batch_tasks if t.status == "completed"])
        failed = len([t for t in batch_tasks if t.status == "failed"])
        processing = len([t for t in batch_tasks if t.status == "processing"])
        pending = len([t for t in batch_tasks if t.status == "pending"])
        
        return {
            "success": True,
            "batch_id": batch_id,
            "total_tasks": len(batch_tasks),
            "completed": completed,
            "failed": failed,
            "processing": processing,
            "pending": pending,
            "progress_percentage": round((completed + failed) / len(batch_tasks) * 100, 2),
            "success_rate": round(completed / (completed + failed) * 100, 2) if (completed + failed) > 0 else 0,
            "tasks": [
                {
                    "id": task.id,
                    "status": task.status,
                    "original_prompt": task.original_prompt[:50] + "..." if len(task.original_prompt) > 50 else task.original_prompt,
                    "error": task.error
                }
                for task in batch_tasks
            ]
        }
    
    def get_optimization_history(self, limit: int = 50) -> Dict:
        """
        獲取優化歷史記錄 (v2.7 新功能)
        
        Args:
            limit: 返回記錄數量限制
            
        Returns:
            Dict: 優化歷史記錄
        """
        recent_history = sorted(
            self.optimization_history, 
            key=lambda x: x["timestamp"], 
            reverse=True
        )[:limit]
        
        # 統計分析
        total_optimizations = len(self.optimization_history)
        style_counts = {}
        complexity_counts = {}
        
        for record in self.optimization_history:
            style = record.get("style", "未指定")
            complexity = record.get("complexity", "moderate")
            
            style_counts[style] = style_counts.get(style, 0) + 1
            complexity_counts[complexity] = complexity_counts.get(complexity, 0) + 1
        
        return {
            "success": True,
            "total_optimizations": total_optimizations,
            "recent_history": [
                {
                    "timestamp": record["timestamp"].isoformat(),
                    "original": record["original"][:100] + "..." if len(record["original"]) > 100 else record["original"],
                    "optimized": record["optimized"][:100] + "..." if len(record["optimized"]) > 100 else record["optimized"],
                    "style": record.get("style"),
                    "complexity": record.get("complexity")
                }
                for record in recent_history
            ],
            "statistics": {
                "popular_styles": sorted(style_counts.items(), key=lambda x: x[1], reverse=True)[:5],
                "complexity_distribution": complexity_counts,
                "average_daily_optimizations": total_optimizations / max(1, (datetime.now() - self.optimization_history[0]["timestamp"]).days) if self.optimization_history else 0
            }
        }
    
    def clear_cache(self) -> Dict:
        """
        清除緩存 (v2.7 新功能)
        
        Returns:
            Dict: 清除結果
        """
        language_cache_size = len(self.language_cache)
        style_templates_size = len(self.style_templates)
        
        self.language_cache.clear()
        self.style_templates.clear()
        
        return {
            "success": True,
            "cleared_items": {
                "language_cache": language_cache_size,
                "style_templates": style_templates_size
            },
            "message": f"已清除 {language_cache_size + style_templates_size} 個緩存項目"
        }
    
    def get_performance_analytics(self) -> Dict:
        """
        獲取性能分析 (v2.7 新功能)
        
        Returns:
            Dict: 性能分析數據
        """
        current_time = time.time()
        
        # 分析批量任務性能
        completed_batch_tasks = [
            task for task in self.batch_tasks.values() 
            if task.status == "completed" and task.completed_at
        ]
        
        if completed_batch_tasks:
            processing_times = [
                (task.completed_at - task.created_at).total_seconds() 
                for task in completed_batch_tasks
            ]
            avg_processing_time = sum(processing_times) / len(processing_times)
            max_processing_time = max(processing_times)
            min_processing_time = min(processing_times)
        else:
            avg_processing_time = 0
            max_processing_time = 0
            min_processing_time = 0
        
        # 緩存命中率
        cache_hit_rate = 0
        if self.request_count > 0:
            cache_requests = len([v for v in self.language_cache.values() if v.get("success")])
            cache_hit_rate = cache_requests / self.request_count * 100
        
        return {
            "success": True,
            "performance_metrics": {
                "total_requests": self.request_count,
                "uptime_seconds": current_time - (self.last_request_time - self.request_count * self.rate_limit_delay) if self.request_count > 0 else 0,
                "average_processing_time": round(avg_processing_time, 2),
                "max_processing_time": round(max_processing_time, 2),
                "min_processing_time": round(min_processing_time, 2),
                "cache_hit_rate": round(cache_hit_rate, 2),
                "cache_size": len(self.language_cache),
                "active_batch_tasks": len([t for t in self.batch_tasks.values() if t.status in ["pending", "processing"]]),
                "completed_batch_tasks": len([t for t in self.batch_tasks.values() if t.status == "completed"]),
                "failed_batch_tasks": len([t for t in self.batch_tasks.values() if t.status == "failed"])
            },
            "recommendations": self._get_performance_recommendations()
        }
    
    def _get_performance_recommendations(self) -> List[str]:
        """獲取性能優化建議"""
        recommendations = []
        
        # 檢查緩存大小
        if len(self.language_cache) > 100:
            recommendations.append("建議清除語言緩存以釋放記憶體")
        
        # 檢查失敗率
        failed_tasks = len([t for t in self.batch_tasks.values() if t.status == "failed"])
        total_tasks = len(self.batch_tasks)
        if total_tasks > 0 and failed_tasks / total_tasks > 0.1:
            recommendations.append("批量任務失敗率較高，建議檢查 API 配置")
        
        # 檢查處理時間
        if self.rate_limit_delay > 2:
            recommendations.append("請求間隔較長，可能影響處理效率")
        
        # 檢查並發設置
        if self.max_concurrent_tasks < 3:
            recommendations.append("建議增加並發任務數以提高處理速度")
        
        if not recommendations:
            recommendations.append("系統運行良好，無需優化")
        
        return recommendations
    
    async def optimize_prompt_with_context(self, prompt: str, 
                                         context: Dict = None, 
                                         reference_images: List[str] = None) -> Dict:
        """
        基於上下文優化提示詞 (v2.7 高級功能)
        
        Args:
            prompt: 原始提示詞
            context: 上下文資訊 (用戶偏好、歷史風格等)
            reference_images: 參考圖片 base64 列表
            
        Returns:
            Dict: 優化結果
        """
        if not self.client:
            return {"success": False, "error": "AI 助手未配置"}
        
        try:
            self._wait_for_rate_limit()
            
            # 構建上下文資訊
            context_info = ""
            if context:
                user_preferences = context.get("user_preferences", {})
                style_history = context.get("style_history", [])
                
                if user_preferences:
                    context_info += f"用戶偏好：{user_preferences}\n"
                if style_history:
                    recent_styles = style_history[-5:]  # 最近5個風格
                    context_info += f"最近使用的風格：{', '.join(recent_styles)}\n"
            
            reference_info = ""
            if reference_images:
                reference_info = f"參考圖片數量：{len(reference_images)}\n"
            
            prompt_template = f"""
作為頂級 AI 圖片生成專家，請基於以下上下文資訊優化提示詞：

原始提示詞：{prompt}

上下文資訊：
{context_info}
{reference_info}

請提供個性化的優化建議，以 JSON 格式回覆：
{{
    "contextual_optimized_prompt": "基於上下文優化的提示詞",
    "personalization_factors": ["個性化因素1", "個性化因素2"],
    "style_continuity": "與用戶歷史風格的連續性分析",
    "novelty_suggestions": ["創新建議1", "創新建議2"],
    "context_analysis": {{
        "user_preference_match": 85,
        "style_consistency": 90,
        "improvement_potential": 80
    }},
    "adaptive_parameters": {{
        "recommended_steps": 30,
        "cfg_scale": 7.5,
        "creativity_level": "high"
    }},
    "explanation": "基於上下文的詳細優化說明"
}}
"""
            
            # 如果有參考圖片，使用 vision 模型
            if reference_images:
                messages = [
                    {
                        "role": "system",
                        "content": "你是專業的 AI 圖片生成專家，擅長基於參考圖片和用戶上下文提供個性化優化。"
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt_template}
                        ] + [
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{img}"}
                            }
                            for img in reference_images[:3]  # 最多3張參考圖
                        ]
                    }
                ]
                model = "gpt-4o-mini"
            else:
                messages = [
                    {
                        "role": "system",
                        "content": "你是專業的 AI 圖片生成專家，擅長基於用戶上下文提供個性化優化。"
                    },
                    {"role": "user", "content": prompt_template}
                ]
                model = "gpt-4o-mini"
            
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=1000,
                temperature=0.7
            )
            
            content = response.choices[0].message.content
            
            try:
                result = json.loads(content)
            except json.JSONDecodeError:
                result = {
                    "contextual_optimized_prompt": f"基於上下文優化：{prompt}",
                    "personalization_factors": ["個人風格偏好", "歷史選擇模式"],
                    "style_continuity": "與用戶歷史風格保持一致",
                    "novelty_suggestions": ["嘗試新的色彩搭配", "探索創新構圖"],
                    "context_analysis": {
                        "user_preference_match": 75,
                        "style_consistency": 80,
                        "improvement_potential": 85
                    },
                    "adaptive_parameters": {
                        "recommended_steps": 30,
                        "cfg_scale": 7.5,
                        "creativity_level": "moderate"
                    },
                    "explanation": "AI 基於上下文提供的個性化優化建議"
                }
            
            return {
                "success": True,
                "original_prompt": prompt,
                "context_used": bool(context),
                "reference_images_count": len(reference_images) if reference_images else 0,
                "result": result,
                "processing_time": time.time() - self.last_request_time,
                "optimization_type": "contextual_v2.7"
            }
            
        except Exception as e:
            logger.error(f"上下文優化失敗: {str(e)}")
            return {
                "success": False,
                "error": f"上下文優化失敗: {str(e)}",
                "original_prompt": prompt
            }
    
    def export_optimization_data(self, format_type: str = "json") -> Dict:
        """
        導出優化數據 (v2.7 新功能)
        
        Args:
            format_type: 導出格式 (json, csv)
            
        Returns:
            Dict: 導出結果
        """
        try:
            export_data = {
                "metadata": {
                    "export_timestamp": datetime.now().isoformat(),
                    "ai_assistant_version": "v2.7",
                    "total_optimizations": len(self.optimization_history),
                    "export_format": format_type
                },
                "optimization_history": [
                    {
                        "timestamp": record["timestamp"].isoformat(),
                        "original_prompt": record["original"],
                        "optimized_prompt": record["optimized"],
                        "style": record.get("style"),
                        "complexity": record.get("complexity")
                    }
                    for record in self.optimization_history
                ],
                "performance_metrics": self.get_performance_analytics()["performance_metrics"],
                "usage_statistics": self.get_usage_stats()
            }
            
            if format_type == "csv":
                # 如果需要 CSV 格式，可以在這裡添加 CSV 轉換邏輯
                # 目前返回 JSON 格式的提示
                export_data["note"] = "CSV 格式轉換需要額外的處理邏輯"
            
            return {
                "success": True,
                "export_data": export_data,
                "data_size": len(str(export_data)),
                "format": format_type
            }
            
        except Exception as e:
            logger.error(f"數據導出失敗: {str(e)}")
            return {
                "success": False,
                "error": f"數據導出失敗: {str(e)}"
            }

# 全局 AI 助手實例
ai_assistant_service = AIAssistantService() 