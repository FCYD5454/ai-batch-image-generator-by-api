"""
AI驅動創意工作流服務 v3.0
提供智能化的創意流程管理，自動化創意決策和風格控制
"""

import asyncio
import json
import logging
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
import cv2
import colorsys
import os
import re
import openai
logger = logging.getLogger(__name__)

# CLIP 和 PyTorch 是可選依賴，如果未安裝則使用替代方案
try:
    from transformers import CLIPProcessor, CLIPModel
    import torch
    CLIP_AVAILABLE = True
except ImportError:
    CLIP_AVAILABLE = False
    logger.warning("CLIP模型未安裝，將使用輕量級替代方案")

class CreativeStyle(Enum):
    """創意風格類型"""
    PHOTOREALISTIC = "photorealistic"
    ARTISTIC = "artistic"
    CARTOON = "cartoon"
    MINIMALIST = "minimalist"
    VINTAGE = "vintage"
    FUTURISTIC = "futuristic"
    ABSTRACT = "abstract"
    CORPORATE = "corporate"

class WorkflowStage(Enum):
    """工作流階段"""
    CONCEPT = "concept"           # 概念設計
    DRAFT = "draft"              # 草稿
    REFINEMENT = "refinement"    # 精煉
    VARIATION = "variation"      # 變體
    FINALIZATION = "finalization" # 完成
    APPROVAL = "approval"        # 審批

class BrandGuideline(Enum):
    """品牌規範類型"""
    COLOR_PALETTE = "color_palette"
    TYPOGRAPHY = "typography"
    STYLE_GUIDE = "style_guide"
    LOGO_USAGE = "logo_usage"
    TONE_VOICE = "tone_voice"

@dataclass
class StyleAnalysis:
    """風格分析結果"""
    dominant_colors: List[str]
    color_harmony: str
    brightness: float
    contrast: float
    saturation: float
    composition_type: str
    mood_score: Dict[str, float]
    style_confidence: float
    technical_quality: float

@dataclass
class CreativeTemplate:
    """創意模板"""
    template_id: str
    name: str
    description: str
    category: str
    style: CreativeStyle
    base_prompt: str
    parameters: Dict[str, Any]
    style_guidelines: Dict[str, Any]
    workflow_stages: List[WorkflowStage]
    target_audience: str
    use_cases: List[str]
    created_by: int
    created_at: datetime
    popularity_score: float = 0.0
    is_public: bool = True

@dataclass
class CreativeProject:
    """創意項目"""
    project_id: str
    name: str
    description: str
    template_id: Optional[str]
    owner_id: int
    team_id: Optional[int]
    current_stage: WorkflowStage
    style_requirements: Dict[str, Any]
    brand_guidelines: Dict[str, Any]
    generated_assets: List[Dict]
    workflow_history: List[Dict]
    created_at: datetime
    updated_at: datetime
    is_active: bool = True

class CreativeWorkflowService:
    """AI驅動創意工作流服務"""
    
    def __init__(self, db_service=None):
        self.db_service = db_service
        
        # 初始化AI模型
        openai_api_key = os.getenv('OPENAI_API_KEY')
        if openai_api_key:
            self.openai_client = openai.OpenAI(api_key=openai_api_key)
        else:
            self.openai_client = None
            logger.warning("未設置OPENAI_API_KEY，AI建議功能將不可用")
        
        # 初始化CLIP模型用於圖像分析（如果可用）
        if CLIP_AVAILABLE:
            try:
                self.clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
                self.clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
                logger.info("CLIP模型加載成功")
            except Exception as e:
                logger.warning(f"CLIP模型加載失敗: {str(e)}")
                self.clip_model = None
                self.clip_processor = None
        else:
            self.clip_model = None
            self.clip_processor = None
            logger.info("使用輕量級替代圖像分析方案")
        
        # 預定義創意模板
        self.predefined_templates = self._initialize_templates()
        
        # 風格規則配置
        self.style_rules = {
            CreativeStyle.PHOTOREALISTIC: {
                'keywords': ['photorealistic', 'realistic', '8k', 'detailed', 'professional photography'],
                'avoid': ['cartoon', 'anime', 'painting', 'sketch'],
                'parameters': {'cfg_scale': 7, 'steps': 50}
            },
            CreativeStyle.ARTISTIC: {
                'keywords': ['artistic', 'painting', 'oil painting', 'watercolor', 'artistic style'],
                'avoid': ['photorealistic', 'photo'],
                'parameters': {'cfg_scale': 12, 'steps': 30}
            },
            CreativeStyle.MINIMALIST: {
                'keywords': ['minimalist', 'clean', 'simple', 'minimal', 'white background'],
                'avoid': ['complex', 'detailed', 'busy'],
                'parameters': {'cfg_scale': 10, 'steps': 25}
            }
        }
        
        # 創意建議引擎配置
        self.creativity_prompts = {
            'color_schemes': [
                "complementary colors", "monochromatic palette", "triadic harmony",
                "warm tones", "cool tones", "earth tones", "pastel colors"
            ],
            'compositions': [
                "rule of thirds", "golden ratio", "symmetrical", "asymmetrical",
                "leading lines", "framing", "patterns", "negative space"
            ],
            'moods': [
                "calm and peaceful", "energetic and dynamic", "mysterious and dark",
                "bright and cheerful", "elegant and sophisticated", "playful and fun"
            ]
        }
        
        # 統計信息
        self.stats = {
            'total_projects': 0,
            'total_templates': 0,
            'successful_workflows': 0,
            'style_consistency_score': 0.0,
            'creativity_score': 0.0,
            'last_analysis': None
        }
        
        logger.info("AI創意工作流服務初始化完成")
    
    def _initialize_templates(self) -> List[CreativeTemplate]:
        """初始化預定義創意模板"""
        templates = [
            CreativeTemplate(
                template_id="social_media_post",
                name="社交媒體貼文",
                description="適合Instagram、Facebook等社交平台的視覺內容",
                category="social_media",
                style=CreativeStyle.PHOTOREALISTIC,
                base_prompt="Create a stunning social media post image, bright and engaging, high quality, trending style",
                parameters={
                    'aspect_ratio': '1:1',
                    'resolution': '1024x1024',
                    'style_strength': 0.8
                },
                style_guidelines={
                    'colors': ['#FF6B6B', '#4ECDC4', '#45B7D1'],
                    'mood': 'energetic',
                    'target_engagement': 'high'
                },
                workflow_stages=[WorkflowStage.CONCEPT, WorkflowStage.DRAFT, WorkflowStage.REFINEMENT],
                target_audience="社交媒體用戶",
                use_cases=["品牌推廣", "產品展示", "內容營銷"],
                created_by=1,
                created_at=datetime.now(),
                popularity_score=9.2
            ),
            CreativeTemplate(
                template_id="corporate_presentation",
                name="企業簡報",
                description="專業商務簡報的視覺設計模板",
                category="business",
                style=CreativeStyle.CORPORATE,
                base_prompt="Professional corporate presentation slide design, clean, modern, business style",
                parameters={
                    'aspect_ratio': '16:9',
                    'resolution': '1920x1080',
                    'style_strength': 0.9
                },
                style_guidelines={
                    'colors': ['#2C3E50', '#3498DB', '#ECF0F1'],
                    'mood': 'professional',
                    'brand_compliance': 'high'
                },
                workflow_stages=[WorkflowStage.CONCEPT, WorkflowStage.DRAFT, WorkflowStage.APPROVAL],
                target_audience="商務專業人士",
                use_cases=["企業簡報", "投資說明", "產品發表"],
                created_by=1,
                created_at=datetime.now(),
                popularity_score=8.5
            ),
            CreativeTemplate(
                template_id="artistic_portrait",
                name="藝術肖像",
                description="藝術風格的人物肖像創作模板",
                category="art",
                style=CreativeStyle.ARTISTIC,
                base_prompt="Artistic portrait painting, expressive, detailed, masterpiece quality",
                parameters={
                    'aspect_ratio': '4:5',
                    'resolution': '1024x1280',
                    'style_strength': 0.85
                },
                style_guidelines={
                    'colors': ['warm_palette'],
                    'mood': 'expressive',
                    'technique': 'oil_painting'
                },
                workflow_stages=[WorkflowStage.CONCEPT, WorkflowStage.DRAFT, WorkflowStage.REFINEMENT, WorkflowStage.FINALIZATION],
                target_audience="藝術愛好者",
                use_cases=["藝術創作", "個人肖像", "藝術收藏"],
                created_by=1,
                created_at=datetime.now(),
                popularity_score=8.8
            )
        ]
        
        return templates
    
    async def create_project(self,
                           name: str,
                           description: str,
                           owner_id: int,
                           template_id: Optional[str] = None,
                           team_id: Optional[int] = None,
                           style_requirements: Dict[str, Any] = None,
                           brand_guidelines: Dict[str, Any] = None) -> Dict[str, Any]:
        """創建新的創意項目"""
        try:
            if not name.strip():
                raise ValueError("項目名稱不能為空")
            
            # 生成項目ID
            project_id = f"proj_{hashlib.md5(f'{name}{owner_id}{datetime.now()}'.encode()).hexdigest()[:12]}"
            
            # 獲取模板信息
            template = None
            if template_id:
                template = await self.get_template(template_id)
                if not template:
                    raise ValueError("指定的模板不存在")
            
            # 創建項目
            project = CreativeProject(
                project_id=project_id,
                name=name,
                description=description,
                template_id=template_id,
                owner_id=owner_id,
                team_id=team_id,
                current_stage=WorkflowStage.CONCEPT,
                style_requirements=style_requirements or {},
                brand_guidelines=brand_guidelines or {},
                generated_assets=[],
                workflow_history=[{
                    'stage': WorkflowStage.CONCEPT.value,
                    'timestamp': datetime.now().isoformat(),
                    'action': 'project_created',
                    'user_id': owner_id
                }],
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
            # 保存到數據庫
            self.db_service.create_creative_project(asdict(project))
            
            # 如果使用模板，生成初始建議
            initial_suggestions = []
            if template:
                initial_suggestions = await self.generate_creative_suggestions(
                    project_id, template.style, style_requirements or {}
                )
            
            # 更新統計
            self.stats['total_projects'] += 1
            
            logger.info(f"創意項目創建成功: {name} (ID: {project_id})")
            
            return {
                'success': True,
                'project_id': project_id,
                'project': asdict(project),
                'template': asdict(template) if template else None,
                'initial_suggestions': initial_suggestions
            }
            
        except Exception as e:
            logger.error(f"創建創意項目失敗: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def analyze_style_consistency(self, 
                                      images: List[str],
                                      reference_style: Optional[Dict] = None) -> Dict[str, Any]:
        """分析圖像風格一致性"""
        try:
            if not images:
                raise ValueError("沒有提供圖像進行分析")
            
            style_analyses = []
            
            for image_path in images:
                if not os.path.exists(image_path):
                    logger.warning(f"圖像文件不存在: {image_path}")
                    continue
                
                # 分析單個圖像風格
                analysis = await self._analyze_single_image_style(image_path)
                if analysis:
                    style_analyses.append(analysis)
            
            if not style_analyses:
                raise ValueError("沒有有效的圖像可供分析")
            
            # 計算風格一致性得分
            consistency_score = self._calculate_consistency_score(style_analyses)
            
            # 生成風格報告
            style_report = self._generate_style_report(style_analyses, reference_style)
            
            # 提供改進建議
            improvement_suggestions = self._generate_improvement_suggestions(
                style_analyses, consistency_score, reference_style
            )
            
            result = {
                'success': True,
                'consistency_score': consistency_score,
                'total_images': len(style_analyses),
                'style_report': style_report,
                'individual_analyses': [asdict(analysis) for analysis in style_analyses],
                'improvement_suggestions': improvement_suggestions,
                'analysis_timestamp': datetime.now().isoformat()
            }
            
            # 更新統計
            self.stats['style_consistency_score'] = consistency_score
            self.stats['last_analysis'] = datetime.now().isoformat()
            
            logger.info(f"風格一致性分析完成: {len(images)}張圖像，一致性得分: {consistency_score:.2f}")
            
            return result
            
        except Exception as e:
            logger.error(f"風格一致性分析失敗: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _analyze_single_image_style(self, image_path: str) -> Optional[StyleAnalysis]:
        """分析單個圖像的風格特徵"""
        try:
            # 加載圖像
            image = Image.open(image_path).convert('RGB')
            cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # 1. 顏色分析
            dominant_colors = self._extract_dominant_colors(image)
            color_harmony = self._analyze_color_harmony(dominant_colors)
            
            # 2. 技術質量分析
            brightness = self._calculate_brightness(cv_image)
            contrast = self._calculate_contrast(cv_image)
            saturation = self._calculate_saturation(image)
            
            # 3. 構圖分析
            composition_type = self._analyze_composition(cv_image)
            
            # 4. 情感/氛圍分析
            mood_score = await self._analyze_mood(image_path)
            
            # 5. 使用CLIP進行風格分析（如果可用）
            style_confidence = 0.8  # 默認值
            if self.clip_model and self.clip_processor:
                style_confidence = await self._clip_style_analysis(image)
            
            # 6. 技術質量評分
            technical_quality = self._calculate_technical_quality(
                brightness, contrast, saturation
            )
            
            return StyleAnalysis(
                dominant_colors=dominant_colors,
                color_harmony=color_harmony,
                brightness=brightness,
                contrast=contrast,
                saturation=saturation,
                composition_type=composition_type,
                mood_score=mood_score,
                style_confidence=style_confidence,
                technical_quality=technical_quality
            )
            
        except Exception as e:
            logger.error(f"圖像風格分析失敗: {str(e)}")
            return None
    
    def _extract_dominant_colors(self, image: Image.Image, num_colors: int = 5) -> List[str]:
        """提取圖像主要顏色"""
        try:
            # 縮小圖像以提高處理速度
            image = image.resize((150, 150))
            
            # 獲取像素數據
            pixels = list(image.getdata())
            
            # 使用k-means聚類找到主要顏色
            from sklearn.cluster import KMeans
            
            pixels_array = np.array(pixels)
            kmeans = KMeans(n_clusters=num_colors, random_state=42, n_init=10)
            kmeans.fit(pixels_array)
            
            # 轉換為十六進制顏色
            colors = []
            for center in kmeans.cluster_centers_:
                hex_color = '#{:02x}{:02x}{:02x}'.format(
                    int(center[0]), int(center[1]), int(center[2])
                )
                colors.append(hex_color)
            
            return colors
            
        except Exception as e:
            logger.error(f"提取主要顏色失敗: {str(e)}")
            return ['#000000']  # 返回黑色作為默認值
    
    def _analyze_color_harmony(self, colors: List[str]) -> str:
        """分析顏色和諧性"""
        try:
            if len(colors) < 2:
                return "單色"
            
            # 轉換為HSV進行分析
            hsv_colors = []
            for color in colors:
                rgb = tuple(int(color[i:i+2], 16) for i in (1, 3, 5))
                hsv = colorsys.rgb_to_hsv(rgb[0]/255, rgb[1]/255, rgb[2]/255)
                hsv_colors.append(hsv)
            
            # 分析色相差異
            hues = [hsv[0] for hsv in hsv_colors]
            hue_diff = max(hues) - min(hues)
            
            if hue_diff < 0.1:
                return "單色調"
            elif hue_diff < 0.3:
                return "類似色"
            elif 0.4 < hue_diff < 0.6:
                return "互補色"
            else:
                return "三角色"
                
        except Exception as e:
            logger.error(f"顏色和諧性分析失敗: {str(e)}")
            return "未知"
    
    def _calculate_brightness(self, image: np.ndarray) -> float:
        """計算圖像亮度"""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            return float(np.mean(gray) / 255.0)
        except Exception:
            return 0.5
    
    def _calculate_contrast(self, image: np.ndarray) -> float:
        """計算圖像對比度"""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            return float(np.std(gray) / 255.0)
        except Exception:
            return 0.5
    
    def _calculate_saturation(self, image: Image.Image) -> float:
        """計算圖像飽和度"""
        try:
            # 轉換為HSV
            hsv_image = image.convert('HSV')
            hsv_array = np.array(hsv_image)
            
            # 提取飽和度通道
            saturation_channel = hsv_array[:, :, 1]
            return float(np.mean(saturation_channel) / 255.0)
        except Exception:
            return 0.5
    
    def _analyze_composition(self, image: np.ndarray) -> str:
        """分析構圖類型"""
        try:
            height, width = image.shape[:2]
            
            # 簡單的構圖分析
            if abs(width - height) < min(width, height) * 0.1:
                return "方形構圖"
            elif width > height * 1.5:
                return "橫向構圖"
            elif height > width * 1.5:
                return "縱向構圖"
            else:
                return "標準構圖"
                
        except Exception:
            return "標準構圖"
    
    async def _analyze_mood(self, image_path: str) -> Dict[str, float]:
        """使用AI分析圖像情感"""
        try:
            if not self.openai_client:
                return {'neutral': 1.0}
            
            # 使用GPT-4 Vision分析情感
            with open(image_path, 'rb') as image_file:
                import base64
                base64_image = base64.b64encode(image_file.read()).decode('utf-8')
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4-vision-preview",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Analyze the mood and emotional tone of this image. Return a JSON with mood scores (0-1) for: calm, energetic, mysterious, cheerful, elegant, playful."
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=300
            )
            
            # 解析回應
            mood_text = response.choices[0].message.content
            try:
                mood_scores = json.loads(mood_text)
                return mood_scores
            except:
                return {'neutral': 1.0}
                
        except Exception as e:
            logger.error(f"情感分析失敗: {str(e)}")
            return {'neutral': 1.0}
    
    async def _clip_style_analysis(self, image: Image.Image) -> float:
        """使用CLIP模型進行風格分析（如果可用），否則使用輕量級替代方案"""
        if self.clip_model and self.clip_processor:
            try:
                # 準備輸入
                inputs = self.clip_processor(images=image, return_tensors="pt")
                
                # 定義風格描述
                style_descriptions = [
                    "photorealistic image",
                    "artistic painting",
                    "cartoon illustration",
                    "minimalist design",
                    "vintage style",
                    "modern style"
                ]
                
                text_inputs = self.clip_processor(text=style_descriptions, return_tensors="pt", padding=True)
                
                # 計算相似度
                with torch.no_grad():
                    image_features = self.clip_model.get_image_features(**inputs)
                    text_features = self.clip_model.get_text_features(**text_inputs)
                    
                    # 正規化特徵向量
                    image_features = image_features / image_features.norm(dim=-1, keepdim=True)
                    text_features = text_features / text_features.norm(dim=-1, keepdim=True)
                    
                    # 計算相似度
                    similarity = (image_features @ text_features.T).squeeze(0)
                    
                    # 返回最高相似度作為風格信心分數
                    return float(torch.max(similarity).item())
                    
            except Exception as e:
                logger.error(f"CLIP風格分析失敗: {str(e)}")
                return 0.8
        else:
            # 使用基於圖像統計的輕量級風格分析
            try:
                # 轉換為numpy數組
                img_array = np.array(image)
                
                # 計算基本統計特徵
                brightness = np.mean(img_array) / 255.0
                contrast = np.std(img_array) / 255.0
                
                # 簡單的風格信心評估
                # 基於亮度和對比度的經驗公式
                if brightness > 0.7 and contrast > 0.3:
                    confidence = 0.85  # 可能是明亮、高對比度的攝影風格
                elif brightness < 0.3 and contrast > 0.4:
                    confidence = 0.78  # 可能是戲劇性或藝術風格
                elif contrast < 0.2:
                    confidence = 0.75  # 可能是極簡風格
                else:
                    confidence = 0.8   # 標準信心分數
                
                return confidence
                
            except Exception as e:
                logger.error(f"輕量級風格分析失敗: {str(e)}")
                return 0.8
    
    def _calculate_technical_quality(self, brightness: float, contrast: float, saturation: float) -> float:
        """計算技術質量分數"""
        try:
            # 理想範圍
            brightness_score = 1 - abs(brightness - 0.5) * 2  # 理想亮度接近0.5
            contrast_score = min(contrast * 2, 1.0)  # 對比度越高越好（到某個點）
            saturation_score = min(saturation * 1.5, 1.0)  # 適度飽和度
            
            # 加權平均
            quality_score = (brightness_score * 0.3 + contrast_score * 0.4 + saturation_score * 0.3)
            return max(0.0, min(1.0, quality_score))
            
        except Exception:
            return 0.7
    
    def _calculate_consistency_score(self, analyses: List[StyleAnalysis]) -> float:
        """計算風格一致性得分"""
        try:
            if len(analyses) < 2:
                return 1.0
            
            # 計算各項指標的方差
            brightness_values = [a.brightness for a in analyses]
            contrast_values = [a.contrast for a in analyses]
            saturation_values = [a.saturation for a in analyses]
            
            brightness_var = np.var(brightness_values)
            contrast_var = np.var(contrast_values)
            saturation_var = np.var(saturation_values)
            
            # 計算一致性得分（方差越小，一致性越高）
            brightness_consistency = 1 / (1 + brightness_var * 10)
            contrast_consistency = 1 / (1 + contrast_var * 10)
            saturation_consistency = 1 / (1 + saturation_var * 10)
            
            # 加權平均
            overall_consistency = (
                brightness_consistency * 0.3 +
                contrast_consistency * 0.4 +
                saturation_consistency * 0.3
            )
            
            return round(overall_consistency, 3)
            
        except Exception as e:
            logger.error(f"一致性得分計算失敗: {str(e)}")
            return 0.5
    
    def _generate_style_report(self, 
                             analyses: List[StyleAnalysis], 
                             reference_style: Optional[Dict] = None) -> Dict[str, Any]:
        """生成風格分析報告"""
        try:
            # 計算平均值
            avg_brightness = np.mean([a.brightness for a in analyses])
            avg_contrast = np.mean([a.contrast for a in analyses])
            avg_saturation = np.mean([a.saturation for a in analyses])
            avg_quality = np.mean([a.technical_quality for a in analyses])
            
            # 收集所有顏色
            all_colors = []
            for analysis in analyses:
                all_colors.extend(analysis.dominant_colors)
            
            # 統計構圖類型
            composition_counts = {}
            for analysis in analyses:
                comp_type = analysis.composition_type
                composition_counts[comp_type] = composition_counts.get(comp_type, 0) + 1
            
            return {
                'summary': {
                    'total_images': len(analyses),
                    'average_brightness': round(avg_brightness, 3),
                    'average_contrast': round(avg_contrast, 3),
                    'average_saturation': round(avg_saturation, 3),
                    'average_quality': round(avg_quality, 3)
                },
                'color_analysis': {
                    'unique_colors': len(set(all_colors)),
                    'most_common_colors': list(set(all_colors))[:10]
                },
                'composition_analysis': composition_counts,
                'quality_distribution': {
                    'excellent': len([a for a in analyses if a.technical_quality > 0.8]),
                    'good': len([a for a in analyses if 0.6 < a.technical_quality <= 0.8]),
                    'average': len([a for a in analyses if 0.4 < a.technical_quality <= 0.6]),
                    'poor': len([a for a in analyses if a.technical_quality <= 0.4])
                }
            }
            
        except Exception as e:
            logger.error(f"生成風格報告失敗: {str(e)}")
            return {'error': str(e)}
    
    def _generate_improvement_suggestions(self, 
                                        analyses: List[StyleAnalysis],
                                        consistency_score: float,
                                        reference_style: Optional[Dict] = None) -> List[str]:
        """生成改進建議"""
        suggestions = []
        
        try:
            # 一致性建議
            if consistency_score < 0.7:
                suggestions.append("建議統一圖像的亮度和對比度設置，以提高視覺一致性")
                suggestions.append("考慮使用統一的色彩濾鏡或後期處理風格")
            
            # 技術質量建議
            low_quality_count = len([a for a in analyses if a.technical_quality < 0.6])
            if low_quality_count > len(analyses) * 0.3:
                suggestions.append("有部分圖像技術質量較低，建議檢查對比度和清晰度")
                suggestions.append("考慮提高圖像解析度或調整生成參數")
            
            # 顏色建議
            saturations = [a.saturation for a in analyses]
            if np.std(saturations) > 0.3:
                suggestions.append("圖像間飽和度差異較大，建議統一色彩處理")
            
            # 構圖建議
            compositions = [a.composition_type for a in analyses]
            if len(set(compositions)) == len(compositions):
                suggestions.append("構圖風格過於多樣，建議選擇1-2種主要構圖類型")
            
            # 如果沒有具體建議，提供通用建議
            if not suggestions:
                suggestions.append("當前圖像風格已經相當一致，可以考慮進一步微調細節")
                suggestions.append("嘗試實驗性的變體以豐富創意表現")
            
        except Exception as e:
            logger.error(f"生成改進建議失敗: {str(e)}")
            suggestions.append("無法生成具體建議，建議手動檢查圖像質量")
        
        return suggestions
    
    async def generate_creative_suggestions(self,
                                          project_id: str,
                                          style: CreativeStyle,
                                          requirements: Dict[str, Any]) -> List[Dict[str, Any]]:
        """生成AI驅動的創意建議"""
        try:
            suggestions = []
            
            # 1. 風格相關建議
            style_rules = self.style_rules.get(style, {})
            if style_rules:
                suggestions.append({
                    'type': 'style_enhancement',
                    'title': f'優化{style.value}風格',
                    'description': f"建議添加關鍵詞: {', '.join(style_rules['keywords'][:3])}",
                    'keywords': style_rules['keywords'],
                    'avoid_keywords': style_rules['avoid'],
                    'parameters': style_rules['parameters']
                })
            
            # 2. 顏色方案建議
            color_schemes = self.creativity_prompts['color_schemes']
            selected_schemes = np.random.choice(color_schemes, 3, replace=False)
            
            for scheme in selected_schemes:
                suggestions.append({
                    'type': 'color_scheme',
                    'title': f'色彩方案: {scheme}',
                    'description': f'嘗試使用{scheme}來增強視覺效果',
                    'prompt_addition': f', {scheme}',
                    'confidence': 0.8
                })
            
            # 3. 構圖建議
            compositions = self.creativity_prompts['compositions']
            selected_comps = np.random.choice(compositions, 2, replace=False)
            
            for comp in selected_comps:
                suggestions.append({
                    'type': 'composition',
                    'title': f'構圖技巧: {comp}',
                    'description': f'運用{comp}構圖原則提升視覺吸引力',
                    'prompt_addition': f', {comp} composition',
                    'confidence': 0.85
                })
            
            # 4. 情感/氛圍建議
            moods = self.creativity_prompts['moods']
            selected_moods = np.random.choice(moods, 2, replace=False)
            
            for mood in selected_moods:
                suggestions.append({
                    'type': 'mood',
                    'title': f'氛圍設定: {mood}',
                    'description': f'創造{mood}的整體氛圍',
                    'prompt_addition': f', {mood} atmosphere',
                    'confidence': 0.75
                })
            
            # 5. 使用AI生成高級建議
            if self.openai_client:
                ai_suggestions = await self._generate_ai_creative_suggestions(
                    style, requirements
                )
                suggestions.extend(ai_suggestions)
            
            # 按信心分數排序
            suggestions.sort(key=lambda x: x.get('confidence', 0.5), reverse=True)
            
            logger.info(f"為項目 {project_id} 生成了 {len(suggestions)} 個創意建議")
            
            return suggestions[:10]  # 返回前10個建議
            
        except Exception as e:
            logger.error(f"生成創意建議失敗: {str(e)}")
            return []
    
    async def _generate_ai_creative_suggestions(self,
                                              style: CreativeStyle,
                                              requirements: Dict[str, Any]) -> List[Dict[str, Any]]:
        """使用GPT生成高級創意建議"""
        try:
            prompt = f"""
            作為一個專業的創意總監，請為以下項目生成3個創新的創意建議：
            
            風格類型: {style.value}
            項目需求: {json.dumps(requirements, ensure_ascii=False)}
            
            請為每個建議提供：
            1. 創意標題
            2. 詳細描述
            3. 具體的提示詞建議
            4. 預期效果
            
            請以JSON格式回應，包含suggestions數組。
            """
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=800,
                temperature=0.8
            )
            
            # 解析AI回應
            ai_response = response.choices[0].message.content
            try:
                ai_data = json.loads(ai_response)
                ai_suggestions = []
                
                for suggestion in ai_data.get('suggestions', []):
                    ai_suggestions.append({
                        'type': 'ai_creative',
                        'title': suggestion.get('title', '創意建議'),
                        'description': suggestion.get('description', ''),
                        'prompt_addition': suggestion.get('prompt_addition', ''),
                        'expected_effect': suggestion.get('expected_effect', ''),
                        'confidence': 0.9,
                        'source': 'ai_generated'
                    })
                
                return ai_suggestions
                
            except json.JSONDecodeError:
                logger.warning("AI回應JSON解析失敗")
                return []
                
        except Exception as e:
            logger.error(f"AI創意建議生成失敗: {str(e)}")
            return []
    
    async def get_template(self, template_id: str) -> Optional[CreativeTemplate]:
        """獲取創意模板"""
        try:
            # 先查找預定義模板
            for template in self.predefined_templates:
                if template.template_id == template_id:
                    return template
            
            # 然後查找數據庫中的自定義模板
            template_data = self.db_service.get_creative_template(template_id)
            if template_data:
                return CreativeTemplate(**template_data)
            
            return None
            
        except Exception as e:
            logger.error(f"獲取創意模板失敗: {str(e)}")
            return None
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取創意工作流統計信息"""
        try:
            # 更新統計信息
            if self.db_service:
                self.stats.update({
                    'total_projects': self.db_service.count_creative_projects(),
                    'total_templates': len(self.predefined_templates) + self.db_service.count_custom_templates(),
                    'successful_workflows': self.db_service.count_completed_workflows()
                })
            
            return {
                'stats': self.stats,
                'available_styles': [style.value for style in CreativeStyle],
                'workflow_stages': [stage.value for stage in WorkflowStage],
                'predefined_templates': len(self.predefined_templates),
                'features': {
                    'style_analysis': True,
                    'ai_suggestions': bool(self.openai_client),
                    'clip_analysis': bool(self.clip_model),
                    'brand_compliance': True,
                    'workflow_automation': True
                }
            }
            
        except Exception as e:
            logger.error(f"獲取統計信息失敗: {str(e)}")
            return {'stats': self.stats, 'error': str(e)}

# 全局服務實例
creative_workflow_service = CreativeWorkflowService()

def get_creative_workflow_service() -> CreativeWorkflowService:
    """獲取AI創意工作流服務實例"""
    return creative_workflow_service 