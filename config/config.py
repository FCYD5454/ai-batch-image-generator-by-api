# -*- coding: utf-8 -*-
'''
應用配置
'''

import os
from typing import Dict, Any

class Config:
    '''基礎配置'''
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    
    # API 配置
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
    STABILITY_API_KEY = os.environ.get('STABILITY_API_KEY')
    
    # 文件路徑
    GENERATED_IMAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'images')
    FRONTEND_DIR = os.path.join(os.path.dirname(__file__), '..', 'frontend')
    
    # 生成設置
    MAX_IMAGES_PER_REQUEST = 5
    SUPPORTED_IMAGE_SIZES = ['512x512', '1024x1024', '1024x768', '768x1024']
    
    @classmethod
    def get_config(cls) -> Dict[str, Any]:
        return {
            'secret_key': cls.SECRET_KEY,
            'generated_images_dir': cls.GENERATED_IMAGES_DIR,
            'frontend_dir': cls.FRONTEND_DIR,
            'max_images_per_request': cls.MAX_IMAGES_PER_REQUEST,
            'supported_image_sizes': cls.SUPPORTED_IMAGE_SIZES
        }

class DevelopmentConfig(Config):
    '''開發環境配置'''
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    '''生產環境配置'''
    DEBUG = False
    TESTING = False

# 配置映射
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
