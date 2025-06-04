# 🚀 AI 批量圖片生成器 - API 文檔

## 📌 **API 概覽**
- **基礎 URL**: `http://localhost:5000`
- **版本**: v3.0
- **格式**: JSON
- **認證**: API Key (部分端點)

## 🏥 **健康檢查端點**

### GET `/health`
檢查系統健康狀態和可用性

**響應示例**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00Z",
  "version": "3.0",
  "environment": "development",
  "project_root": "/path/to/project",
  "directories": {
    "missing": [],
    "all_present": true
  }
}
```

## 🎨 **圖片生成端點**

### POST `/api/generate-image`
生成 AI 圖片的主要端點

**請求體**:
```json
{
  "prompt": "A beautiful sunset over mountains",
  "negative_prompt": "blurry, low quality",
  "image_size": "1024x1024",
  "image_count": 2,
  "api_provider": "gemini",
  "api_key": "your-api-key",
  "model": "imagen-2"
}
```

**響應示例**:
```json
{
  "success": true,
  "images": [
    {
      "filename": "gemini_1705750200_1.png",
      "url": "/generated_images/gemini_1705750200_1.png",
      "base64": null
    }
  ],
  "provider": "gemini",
  "prompt_used": "A beautiful sunset over mountains --no blurry, low quality"
}
```

**支援的提供商**:
- `gemini` - Google Gemini Imagen
- `openai` - OpenAI DALL-E
- `stability` - Stability AI
- `huggingface` - HuggingFace Models
- `replicate` - Replicate Models

## 💡 **提示詞相關端點**

### GET `/api/prompt-suggestions`
獲取提示詞建議

**參數**:
- `category` (optional): 類別篩選 (landscape, portrait, abstract, etc.)
- `style` (optional): 風格篩選 (realistic, anime, oil_painting, etc.)

**響應示例**:
```json
{
  "suggestions": [
    {
      "prompt": "Majestic mountain landscape at golden hour",
      "category": "landscape",
      "style": "realistic",
      "quality_score": 4.8
    }
  ]
}
```

### POST `/api/analyze-prompt`
分析提示詞質量和複雜度

**請求體**:
```json
{
  "prompt": "A cyberpunk city at night with neon lights"
}
```

**響應示例**:
```json
{
  "prompt": "A cyberpunk city at night with neon lights",
  "analysis": {
    "word_count": 8,
    "complexity": "medium",
    "estimated_generation_time": "15-30 seconds",
    "quality_score": 7.5,
    "suggestions": [
      "Consider adding more specific details about lighting",
      "Add style modifiers for better consistency"
    ]
  }
}
```

## 📊 **監控端點**

### GET `/api/monitoring/system-stats`
獲取系統資源使用情況

**響應示例**:
```json
{
  "cpu_usage": 45.2,
  "memory_usage": 68.5,
  "disk_usage": 32.1,
  "timestamp": "2024-01-20T10:30:00Z"
}
```

### GET `/api/monitoring/performance-metrics`
獲取性能指標

**響應示例**:
```json
{
  "avg_response_time": 245,
  "total_requests": 1250,
  "error_rate": 0.02,
  "uptime": "5 days, 14 hours"
}
```

### GET `/api/monitoring/api-health`
檢查所有 API 服務狀態

### POST `/api/monitoring/log-event`
記錄自定義事件

**請求體**:
```json
{
  "event_type": "user_action",
  "message": "User generated batch of 5 images",
  "metadata": {
    "user_id": "user123",
    "image_count": 5,
    "provider": "gemini"
  }
}
```

## 🔄 **批處理端點**

### POST `/api/batch/generate`
批量生成多個圖片

**請求體**:
```json
{
  "prompts": [
    "A serene lake at dawn",
    "Urban street art on brick wall",
    "Abstract geometric patterns"
  ],
  "settings": {
    "image_size": "1024x1024",
    "api_provider": "stability",
    "api_key": "your-api-key"
  }
}
```

### GET `/api/batch/status/{batch_id}`
檢查批處理任務狀態

**響應示例**:
```json
{
  "batch_id": "batch_1705750200",
  "status": "processing",
  "progress": {
    "completed": 3,
    "total": 10,
    "percentage": 30
  },
  "estimated_completion": "2024-01-20T10:45:00Z"
}
```

## 🎨 **創意工具端點**

### POST `/api/creative/style-transfer`
圖片風格遷移

### POST `/api/creative/upscale`
圖片超分辨率增強

### POST `/api/creative/variations`
生成圖片變體

## 👥 **協作端點**

### GET `/api/collaboration/projects`
獲取協作項目列表

### POST `/api/collaboration/share`
分享圖片或項目

### GET `/api/collaboration/comments/{image_id}`
獲取圖片評論

## ☁️ **雲存儲端點**

### POST `/api/storage/upload`
上傳圖片到雲存儲

### GET `/api/storage/download/{file_id}`
從雲存儲下載檔案

### DELETE `/api/storage/delete/{file_id}`
刪除雲存儲檔案

## 📈 **分析端點**

### GET `/api/analytics/usage-stats`
獲取使用統計數據

### GET `/api/analytics/popular-prompts`
獲取熱門提示詞統計

### GET `/api/analytics/generation-trends`
獲取生成趨勢分析

## 🤖 **AI 助手端點**

### POST `/api/assistant/chat`
與 AI 助手對話

**請求體**:
```json
{
  "message": "Help me create a prompt for a fantasy landscape",
  "context": "beginner",
  "preferred_style": "realistic"
}
```

### GET `/api/assistant/suggestions`
獲取 AI 助手建議

## 🔧 **設定端點**

### GET `/api/settings/user-preferences`
獲取用戶偏好設定

### PUT `/api/settings/user-preferences`
更新用戶偏好設定

### GET `/api/settings/api-providers`
獲取可用的 API 提供商配置

## 📁 **檔案管理端點**

### GET `/api/files/gallery`
獲取圖片庫

### DELETE `/api/files/delete/{file_id}`
刪除圖片檔案

### POST `/api/files/organize`
組織和分類檔案

## ❌ **錯誤代碼**

| 代碼 | 描述 | 解決方案 |
|------|------|----------|
| 400 | 請求參數錯誤 | 檢查請求格式和必需參數 |
| 401 | API Key 無效 | 驗證 API Key 是否正確 |
| 403 | 權限不足 | 檢查 API Key 權限 |
| 429 | 請求過於頻繁 | 等待後重試 |
| 500 | 服務器內部錯誤 | 聯繫技術支援 |
| 503 | 服務不可用 | 檢查服務狀態 |

## 🔐 **認證**

部分端點需要 API Key 認證:
```
Headers:
Authorization: Bearer your-api-key
```

## 📝 **使用範例**

### Python 範例
```python
import requests

# 生成圖片
response = requests.post('http://localhost:5000/api/generate-image', 
  json={
    'prompt': 'A beautiful sunset',
    'api_provider': 'gemini',
    'api_key': 'your-key'
  }
)

result = response.json()
print(f"生成成功: {result['success']}")
```

### JavaScript 範例
```javascript
// 生成圖片
fetch('http://localhost:5000/api/generate-image', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'A beautiful sunset',
    api_provider: 'gemini',
    api_key: 'your-key'
  })
})
.then(response => response.json())
.then(data => console.log('生成結果:', data));
```

## 🚀 **性能建議**

1. **批量處理**: 使用 `/api/batch/generate` 處理多個圖片
2. **緩存**: 相同的提示詞會使用緩存結果
3. **異步處理**: 大型批處理任務會異步執行
4. **監控**: 定期檢查 `/api/monitoring/system-stats`

## 📞 **支援**

- **文檔**: 查看 README.md
- **問題追蹤**: GitHub Issues
- **貢獻指南**: CONTRIBUTING.md 