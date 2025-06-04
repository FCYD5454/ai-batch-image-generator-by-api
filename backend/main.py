# -*- coding: utf-8 -*-
'''
批量圖片生成器主程序
'''

import sys
import os
import time
import logging
from datetime import datetime
from flask import request, jsonify

# 由於 main.py 現在位於 backend/ 目錄內，直接導入同目錄下的 app.py
from app import app

# 添加項目根目錄到 Python 路徑 (為了訪問其他資源)
project_root = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, project_root)

# 導入數據庫管理器和日誌設置
from services.database import DatabaseService
logger = logging.getLogger(__name__)

# 初始化數據庫服務
db_manager = DatabaseService()

# 健康檢查端點
@app.route('/health')
def main_health_check():
    """健康檢查端點，用於生產環境監控"""
    try:
        import datetime
        
        # 檢查關鍵目錄是否存在（相對於項目根目錄）
        required_dirs = ['assets/images', 'data', 'generated_images']
        missing_dirs = []
        
        for d in required_dirs:
            dir_path = os.path.join(project_root, d)
            if not os.path.exists(dir_path):
                missing_dirs.append(d)
        
        health_info = {
            'status': 'healthy',
            'timestamp': datetime.datetime.utcnow().isoformat(),
            'version': '3.0',
            'environment': os.environ.get('FLASK_ENV', 'development'),
            'project_root': project_root,
            'directories': {
                'missing': missing_dirs,
                'all_present': len(missing_dirs) == 0
            }
        }
        
        # 如果有關鍵問題，返回不健康狀態
        if missing_dirs:
            health_info['status'] = 'unhealthy'
            return jsonify(health_info), 503
        
        return jsonify(health_info), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'timestamp': datetime.datetime.utcnow().isoformat(),
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # 檢查端口是否可用，如果 5000 被佔用則使用 5001
    import socket
    
    def is_port_available(port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            result = sock.connect_ex(('127.0.0.1', port))
            return result != 0
    
    # 嘗試多個端口
    ports_to_try = [5000, 5001, 5002, 5003, 8000, 8080, 3000]
    chosen_port = None
    
    for port in ports_to_try:
        if is_port_available(port):
            chosen_port = port
            break
    
    if chosen_port is None:
        chosen_port = 5004  # 備用端口
    
    print("🚀 啟動批量圖片生成器...")
    print(f"🌐 服務將運行在 http://localhost:{chosen_port}")
    print("📁 項目採用優化的目錄結構")
    print(f"📂 項目根目錄: {project_root}")
    
    if chosen_port != 5000:
        print(f"💡 注意：端口 5000 被佔用，已自動切換到端口 {chosen_port}")
    
    app.run(host='0.0.0.0', port=chosen_port, debug=True)

@app.route('/api/generate-image', methods=['POST'])
def generate_image():
    try:
        data = request.get_json()
        
        # 提取請求參數
        prompt = data.get('prompt', '')
        negative_prompt = data.get('negative_prompt', '')  # 新增負面提示詞支援
        image_size = data.get('image_size', '1024x1024')
        image_count = int(data.get('image_count', 1))
        api_provider = data.get('api_provider', 'gemini')
        api_key = data.get('api_key', '')
        model = data.get('model', '')

        if not prompt:
            return jsonify({
                'success': False,
                'error': 'Prompt is required'
            }), 400

        # 記錄生成請求到資料庫
        generation_data = {
            'prompt': prompt,
            'negative_prompt': negative_prompt,
            'api_provider': api_provider,
            'image_size': image_size,
            'image_count': image_count,
            'status': 'started',
            'created_at': datetime.now().isoformat()
        }
        
        generation_id = db_manager.add_generation_record(generation_data)

        # 根據不同的 API 提供商進行處理
        if api_provider == 'gemini':
            result = generate_with_gemini(prompt, negative_prompt, image_size, image_count, api_key, model)
        elif api_provider == 'openai':
            result = generate_with_openai(prompt, negative_prompt, image_size, image_count, api_key, model)
        elif api_provider == 'stability':
            result = generate_with_stability(prompt, negative_prompt, image_size, image_count, api_key, model)
        else:
            return jsonify({
                'success': False,
                'error': f'Unsupported API provider: {api_provider}'
            }), 400

        # 更新資料庫記錄
        if result['success']:
            db_manager.update_generation_status(generation_id, 'completed', len(result['images']))
            # 保存圖片到資料庫
            for img_data in result['images']:
                db_manager.add_image_record({
                    'generation_id': generation_id,
                    'prompt': prompt,
                    'negative_prompt': negative_prompt,
                    'api_provider': api_provider,
                    'image_size': image_size,
                    'filename': img_data['filename'],
                    'file_path': img_data.get('file_path', ''),
                    'created_at': datetime.now().isoformat()
                })
        else:
            db_manager.update_generation_status(generation_id, 'failed', 0, result.get('error', ''))

        return jsonify(result)

    except Exception as e:
        logger.error(f"Image generation error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Image generation failed: {str(e)}'
        }), 500

def generate_with_gemini(prompt, negative_prompt, image_size, image_count, api_key, model):
    """使用 Gemini API 生成圖片，支援負面提示詞"""
    try:
        # 構建完整的提示詞
        full_prompt = prompt
        if negative_prompt:
            full_prompt += f" --no {negative_prompt}"
        
        # 這裡實現 Gemini API 調用邏輯
        # 目前返回模擬結果
        images = []
        for i in range(image_count):
            images.append({
                'filename': f'gemini_{int(time.time())}_{i+1}.png',
                'url': f'/api/placeholder-image?text=Gemini+Generated+{i+1}',
                'base64': None
            })
        
        return {
            'success': True,
            'images': images,
            'provider': 'gemini',
            'prompt_used': full_prompt
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'Gemini generation failed: {str(e)}'
        }

def generate_with_openai(prompt, negative_prompt, image_size, image_count, api_key, model):
    """使用 OpenAI DALL-E API 生成圖片"""
    try:
        # OpenAI DALL-E 不直接支援負面提示詞，但可以在提示詞中明確說明避免的內容
        full_prompt = prompt
        if negative_prompt:
            full_prompt += f", avoid: {negative_prompt}"
        
        # 這裡實現 OpenAI API 調用邏輯
        images = []
        for i in range(image_count):
            images.append({
                'filename': f'dalle_{int(time.time())}_{i+1}.png',
                'url': f'/api/placeholder-image?text=DALL-E+Generated+{i+1}',
                'base64': None
            })
        
        return {
            'success': True,
            'images': images,
            'provider': 'openai',
            'prompt_used': full_prompt
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'OpenAI generation failed: {str(e)}'
        }

def generate_with_stability(prompt, negative_prompt, image_size, image_count, api_key, model):
    """使用 Stability AI API 生成圖片，原生支援負面提示詞"""
    try:
        # Stability AI 原生支援負面提示詞
        # 這裡實現 Stability AI API 調用邏輯
        images = []
        for i in range(image_count):
            images.append({
                'filename': f'stability_{int(time.time())}_{i+1}.png',
                'url': f'/api/placeholder-image?text=Stability+Generated+{i+1}',
                'base64': None
            })
        
        return {
            'success': True,
            'images': images,
            'provider': 'stability',
            'prompt_used': prompt,
            'negative_prompt_used': negative_prompt
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'Stability AI generation failed: {str(e)}'
        }

# 新增 API 端點：獲取提示詞建議
@app.route('/api/prompt-suggestions', methods=['GET'])
def get_prompt_suggestions():
    """獲取提示詞建議和模板"""
    try:
        category = request.args.get('category', '')
        
        # 內建提示詞建議
        suggestions = {
            'portrait': [
                'professional portrait photography',
                'natural lighting, soft shadows',
                'shallow depth of field, bokeh background',
                'studio lighting setup',
                'candid expression, authentic emotion'
            ],
            'landscape': [
                'golden hour lighting',
                'dramatic sky with clouds',
                'wide angle perspective',
                'natural colors, vibrant scenery',
                'mountain vista, serene valley'
            ],
            'abstract': [
                'geometric patterns',
                'fluid dynamics, organic shapes',
                'vibrant color palette',
                'minimal composition',
                'contemporary art style'
            ],
            'fantasy': [
                'magical atmosphere',
                'ethereal lighting effects',
                'mystical creatures',
                'enchanted forest setting',
                'otherworldly landscape'
            ],
            'anime': [
                'anime art style',
                'detailed character design',
                'expressive eyes',
                'vibrant hair colors',
                'manga illustration'
            ],
            'realistic': [
                'photorealistic rendering',
                'high detail textures',
                'natural lighting',
                'ultra high resolution',
                'professional photography'
            ]
        }
        
        # 負面提示詞建議
        negative_suggestions = [
            'blurry', 'low quality', 'worst quality', 'out of focus',
            'ugly', 'deformed', 'mutated', 'extra limbs',
            'poorly drawn', 'bad anatomy', 'wrong proportions',
            'watermark', 'signature', 'text', 'username'
        ]
        
        result = {
            'success': True,
            'suggestions': suggestions.get(category, []) if category else suggestions,
            'negative_suggestions': negative_suggestions
        }
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error getting prompt suggestions: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# 新增 API 端點：分析提示詞品質
@app.route('/api/analyze-prompt', methods=['POST'])
def analyze_prompt():
    """分析提示詞品質和複雜度"""
    try:
        data = request.get_json()
        prompt = data.get('prompt', '')
        
        if not prompt:
            return jsonify({
                'success': False,
                'error': 'Prompt is required'
            }), 400
        
        # 分析提示詞
        analysis = {
            'length': len(prompt),
            'word_count': len(prompt.split()),
            'complexity': analyze_prompt_complexity(prompt),
            'quality_score': calculate_prompt_quality(prompt),
            'suggestions': get_prompt_improvement_suggestions(prompt)
        }
        
        return jsonify({
            'success': True,
            'analysis': analysis
        })
        
    except Exception as e:
        logger.error(f"Error analyzing prompt: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def analyze_prompt_complexity(prompt):
    """分析提示詞複雜度"""
    words = prompt.lower().split()
    
    # 技術詞彙
    technical_terms = ['4k', '8k', 'hdr', 'ultra', 'detailed', 'professional', 'cinematic']
    tech_count = sum(1 for word in words if any(term in word for term in technical_terms))
    
    # 藝術風格詞彙
    art_terms = ['painting', 'digital art', 'concept art', 'photorealistic', 'anime', 'abstract']
    art_count = sum(1 for word in words if any(term in word for term in art_terms))
    
    # 修飾詞
    adjectives = ['beautiful', 'amazing', 'stunning', 'dramatic', 'elegant', 'majestic']
    adj_count = sum(1 for word in words if word in adjectives)
    
    complexity_score = (tech_count * 3 + art_count * 2 + adj_count) / len(words) * 100
    
    if complexity_score < 20:
        return 'simple'
    elif complexity_score < 50:
        return 'moderate'
    else:
        return 'complex'

def calculate_prompt_quality(prompt):
    """計算提示詞品質分數 (0-100)"""
    score = 0
    words = prompt.lower().split()
    
    # 長度分數 (10-200 字符較理想)
    length = len(prompt)
    if 10 <= length <= 200:
        score += 25
    elif length > 200:
        score += 15
    elif length > 5:
        score += 10
    
    # 主題詞檢查
    subjects = ['person', 'man', 'woman', 'animal', 'landscape', 'building', 'object']
    if any(subject in prompt.lower() for subject in subjects):
        score += 20
    
    # 風格詞檢查
    styles = ['style', 'art', 'painting', 'photo', 'realistic', 'anime']
    if any(style in prompt.lower() for style in styles):
        score += 15
    
    # 技術參數
    technical = ['4k', 'hd', 'detailed', 'professional', 'high quality']
    if any(tech in prompt.lower() for tech in technical):
        score += 15
    
    # 顏色/光線描述
    visual = ['light', 'dark', 'bright', 'colorful', 'shadow', 'sun']
    if any(vis in prompt.lower() for vis in visual):
        score += 10
    
    # 情感/氛圍
    mood = ['happy', 'sad', 'peaceful', 'dramatic', 'mysterious', 'calm']
    if any(m in prompt.lower() for m in mood):
        score += 10
    
    # 避免重複詞扣分
    unique_words = set(words)
    repetition_ratio = len(unique_words) / len(words) if words else 1
    if repetition_ratio < 0.7:
        score -= 10
    
    return min(max(score, 0), 100)

def get_prompt_improvement_suggestions(prompt):
    """獲取提示詞改進建議"""
    suggestions = []
    words = prompt.lower().split()
    
    if len(prompt) < 10:
        suggestions.append("提示詞太短，建議添加更多描述細節")
    
    if len(prompt) > 300:
        suggestions.append("提示詞過長，建議簡化或分割")
    
    # 檢查是否包含主題
    subjects = ['person', 'man', 'woman', 'animal', 'landscape', 'building']
    if not any(subject in prompt.lower() for subject in subjects):
        suggestions.append("建議明確指定主體對象")
    
    # 檢查是否包含風格
    styles = ['realistic', 'anime', 'painting', 'digital art', 'photo']
    if not any(style in prompt.lower() for style in styles):
        suggestions.append("可以添加藝術風格描述")
    
    # 檢查技術參數
    technical = ['4k', 'detailed', 'professional', 'high quality']
    if not any(tech in prompt.lower() for tech in technical):
        suggestions.append("可以添加品質或技術參數")
    
    return suggestions
