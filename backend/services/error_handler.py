# -*- coding: utf-8 -*-
"""
AI 批量圖片生成器 - 增強錯誤處理服務
提供統一的錯誤處理、用戶友好的錯誤訊息和詳細日誌記錄
"""

import logging
import traceback
from datetime import datetime
from typing import Dict, Any, Optional
from enum import Enum

class ErrorCategory(Enum):
    """錯誤分類"""
    VALIDATION = "validation"
    API_ERROR = "api_error"
    NETWORK = "network"
    AUTH = "authentication"
    RATE_LIMIT = "rate_limit"
    SYSTEM = "system"
    AI_SERVICE = "ai_service"
    FILE_OPERATION = "file_operation"

class ErrorSeverity(Enum):
    """錯誤嚴重程度"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ErrorHandler:
    """增強錯誤處理器"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.error_messages = self._init_error_messages()
        self.error_solutions = self._init_error_solutions()
    
    def _init_error_messages(self) -> Dict[str, str]:
        """初始化錯誤訊息映射"""
        return {
            # 驗證錯誤
            'missing_prompt': '請提供圖片生成提示詞。提示詞是生成 AI 圖片的核心描述。',
            'invalid_image_size': '圖片尺寸格式不正確。請使用格式：寬度x高度 (例如: 1024x1024)',
            'invalid_image_count': '圖片數量必須在 1-10 之間。',
            'invalid_api_provider': '不支援的 AI 服務提供商。請選擇: gemini, openai, stability, huggingface, replicate',
            
            # API 錯誤
            'api_key_missing': 'API 金鑰缺失。請在設定中配置您的 AI 服務 API 金鑰。',
            'api_key_invalid': 'API 金鑰無效。請檢查您的 API 金鑰是否正確。',
            'api_quota_exceeded': 'API 配額已用完。請檢查您的帳戶使用情況或升級方案。',
            'api_service_unavailable': 'AI 服務暫時不可用。請稍後再試。',
            
            # 網路錯誤
            'connection_timeout': '連接超時。請檢查您的網路連接。',
            'network_error': '網路連接失敗。請檢查您的網路設定。',
            
            # 系統錯誤
            'insufficient_storage': '存儲空間不足。請清理一些舊檔案後重試。',
            'file_write_error': '無法保存檔案。請檢查檔案權限和存儲空間。',
            'file_read_error': '無法讀取檔案。請檢查檔案是否存在和權限設定。',
            
            # AI 服務特定錯誤
            'content_policy_violation': '您的提示詞可能違反了內容政策。請調整提示詞內容。',
            'generation_failed': '圖片生成失敗。請檢查提示詞並重試。',
            'model_overload': '模型服務負載過高。請稍後重試。',
        }
    
    def _init_error_solutions(self) -> Dict[str, list]:
        """初始化錯誤解決方案"""
        return {
            'missing_prompt': [
                '在提示詞欄位中輸入詳細的圖片描述',
                '範例："一個美麗的日落風景，山脈背景，溫暖的橙色天空"',
                '查看提示詞建議獲取靈感'
            ],
            'api_key_invalid': [
                '檢查 API 金鑰是否完整複製',
                '確認 API 金鑰對應正確的服務提供商',
                '訪問服務提供商官網重新生成 API 金鑰',
                '檢查 API 金鑰是否已過期'
            ],
            'api_quota_exceeded': [
                '查看 API 服務商的使用量儀表板',
                '等待配額重置（通常每月重置）',
                '考慮升級到更高級的方案',
                '嘗試使用其他 AI 服務提供商'
            ],
            'connection_timeout': [
                '檢查網路連接是否穩定',
                '嘗試重新整理頁面',
                '切換到更穩定的網路環境',
                '稍後再試'
            ],
            'generation_failed': [
                '簡化提示詞內容',
                '移除可能敏感的關鍵詞',
                '嘗試不同的圖片尺寸',
                '更換 AI 服務提供商'
            ]
        }
    
    def handle_error(
        self, 
        error: Exception, 
        category: ErrorCategory, 
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        統一錯誤處理
        
        Args:
            error: 異常對象
            category: 錯誤分類
            severity: 嚴重程度
            context: 錯誤上下文信息
        
        Returns:
            格式化的錯誤響應
        """
        error_key = self._get_error_key(error)
        user_message = self.error_messages.get(error_key, str(error))
        solutions = self.error_solutions.get(error_key, [])
        
        error_response = {
            'success': False,
            'error': {
                'code': error_key,
                'message': user_message,
                'category': category.value,
                'severity': severity.value,
                'solutions': solutions,
                'timestamp': datetime.now().isoformat(),
                'context': context or {}
            }
        }
        
        # 記錄錯誤日誌
        self._log_error(error, error_response, context)
        
        return error_response
    
    def _get_error_key(self, error: Exception) -> str:
        """從異常對象推斷錯誤鍵"""
        error_str = str(error).lower()
        
        # 根據錯誤訊息映射到錯誤鍵
        if 'prompt' in error_str and ('missing' in error_str or 'required' in error_str):
            return 'missing_prompt'
        elif 'api key' in error_str and 'invalid' in error_str:
            return 'api_key_invalid'
        elif 'api key' in error_str and ('missing' in error_str or 'required' in error_str):
            return 'api_key_missing'
        elif 'quota' in error_str or 'limit' in error_str:
            return 'api_quota_exceeded'
        elif 'timeout' in error_str:
            return 'connection_timeout'
        elif 'network' in error_str or 'connection' in error_str:
            return 'network_error'
        elif 'storage' in error_str or 'space' in error_str:
            return 'insufficient_storage'
        elif 'policy' in error_str or 'violation' in error_str:
            return 'content_policy_violation'
        elif 'generation' in error_str and 'failed' in error_str:
            return 'generation_failed'
        else:
            return 'general_error'
    
    def _log_error(
        self, 
        error: Exception, 
        error_response: Dict[str, Any], 
        context: Optional[Dict[str, Any]]
    ):
        """記錄錯誤日誌"""
        log_data = {
            'error_type': type(error).__name__,
            'error_message': str(error),
            'error_response': error_response,
            'context': context,
            'traceback': traceback.format_exc()
        }
        
        severity = error_response['error']['severity']
        
        if severity == ErrorSeverity.CRITICAL.value:
            self.logger.critical(f"Critical error: {log_data}")
        elif severity == ErrorSeverity.HIGH.value:
            self.logger.error(f"High severity error: {log_data}")
        elif severity == ErrorSeverity.MEDIUM.value:
            self.logger.warning(f"Medium severity error: {log_data}")
        else:
            self.logger.info(f"Low severity error: {log_data}")

class ValidationError(Exception):
    """驗證錯誤"""
    pass

class APIError(Exception):
    """API 相關錯誤"""
    pass

class NetworkError(Exception):
    """網路相關錯誤"""
    pass

class AIServiceError(Exception):
    """AI 服務錯誤"""
    pass

# 全局錯誤處理器實例
error_handler = ErrorHandler()

def handle_api_error(func):
    """API 錯誤處理裝飾器"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ValidationError as e:
            return error_handler.handle_error(
                e, ErrorCategory.VALIDATION, ErrorSeverity.LOW
            )
        except APIError as e:
            return error_handler.handle_error(
                e, ErrorCategory.API_ERROR, ErrorSeverity.MEDIUM
            )
        except NetworkError as e:
            return error_handler.handle_error(
                e, ErrorCategory.NETWORK, ErrorSeverity.MEDIUM
            )
        except AIServiceError as e:
            return error_handler.handle_error(
                e, ErrorCategory.AI_SERVICE, ErrorSeverity.HIGH
            )
        except Exception as e:
            return error_handler.handle_error(
                e, ErrorCategory.SYSTEM, ErrorSeverity.HIGH
            )
    
    return wrapper

# 常用錯誤檢查函數
def validate_prompt(prompt: str) -> None:
    """驗證提示詞"""
    if not prompt or not prompt.strip():
        raise ValidationError("missing_prompt")
    
    if len(prompt.strip()) < 3:
        raise ValidationError("prompt_too_short")

def validate_image_size(size: str) -> None:
    """驗證圖片尺寸"""
    if not size or 'x' not in size:
        raise ValidationError("invalid_image_size")
    
    try:
        width, height = map(int, size.split('x'))
        if width < 256 or height < 256 or width > 2048 or height > 2048:
            raise ValidationError("invalid_image_size")
    except ValueError:
        raise ValidationError("invalid_image_size")

def validate_image_count(count: int) -> None:
    """驗證圖片數量"""
    if not isinstance(count, int) or count < 1 or count > 10:
        raise ValidationError("invalid_image_count")

def validate_api_provider(provider: str) -> None:
    """驗證 API 提供商"""
    valid_providers = ['gemini', 'openai', 'stability', 'huggingface', 'replicate']
    if provider not in valid_providers:
        raise ValidationError("invalid_api_provider")

def validate_api_key(api_key: str) -> None:
    """驗證 API 金鑰"""
    if not api_key or not api_key.strip():
        raise ValidationError("api_key_missing")
    
    if len(api_key.strip()) < 10:
        raise ValidationError("api_key_invalid") 