"""
AI 批量圖片生成器 - 測試框架
提供全面的單元測試和集成測試支援
"""

__version__ = "1.0.0"
__author__ = "AI Batch Image Generator Team"

# 測試配置
TEST_CONFIG = {
    'database_url': 'sqlite:///:memory:',
    'testing': True,
    'debug': False,
    'secret_key': 'test-secret-key',
    'api_endpoints': {
        'base_url': 'http://localhost:5000',
        'api_prefix': '/api'
    }
} 