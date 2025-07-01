from .openai_service import OpenAIService
from .gemini_service import GeminiService
from .stability_service import StabilityService
from .adobe_firefly import AdobeFireflyService
from .leonardo_ai import LeonardoAIService

# 服務註冊表
SERVICE_REGISTRY = {
    'openai': OpenAIService,
    'gemini': GeminiService,
    'stability': StabilityService,
    'adobe_firefly': AdobeFireflyService,
    'leonardo_ai': LeonardoAIService,
}

def get_image_generation_service(provider, api_key):
    """
    服務工廠函式，根據提供商名稱返回對應的服務實例。

    Args:
        provider (str): API 供應商的名稱 (e.g., 'openai').
        api_key (str): 對應的 API 金鑰。

    Returns:
        一個服務類的實例，如果提供商不支持則返回 None。
    """
    provider = provider.lower()
    service_class = SERVICE_REGISTRY.get(provider)
    
    if service_class:
        # 假設所有服務類的建構函式都只接收 api_key
        return service_class(api_key=api_key)
    
    # 如果未來有服務需要不同的參數，可以在這裡添加邏輯
    # 例如:
    # if provider == 'some_other_service':
    #     return SomeOtherService(api_key=api_key, another_param='value')
        
    return None 