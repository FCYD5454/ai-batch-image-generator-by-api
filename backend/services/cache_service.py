# -*- coding: utf-8 -*-
"""
AI 批量圖片生成器 - 高級緩存服務
提供記憶體緩存、Redis 支援和智能緩存失效機制
"""

import json
import time
import hashlib
import logging
from typing import Any, Optional, Dict, Union
from datetime import datetime, timedelta
from functools import wraps
import threading

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

logger = logging.getLogger(__name__)

class MemoryCache:
    """記憶體緩存實現"""
    
    def __init__(self, max_size: int = 1000, default_ttl: int = 3600):
        self.cache: Dict[str, Dict] = {}
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.access_times: Dict[str, float] = {}
        self.lock = threading.RLock()
    
    def _is_expired(self, item: Dict) -> bool:
        """檢查緩存項目是否過期"""
        if 'expires_at' not in item:
            return False
        return time.time() > item['expires_at']
    
    def _cleanup_expired(self):
        """清理過期的緩存項目"""
        with self.lock:
            expired_keys = [
                key for key, item in self.cache.items() 
                if self._is_expired(item)
            ]
            for key in expired_keys:
                del self.cache[key]
                if key in self.access_times:
                    del self.access_times[key]
    
    def _evict_lru(self):
        """使用 LRU 策略驅逐最舊的項目"""
        if len(self.cache) <= self.max_size:
            return
        
        with self.lock:
            # 找到最舊的項目
            oldest_key = min(self.access_times.keys(), key=lambda k: self.access_times[k])
            del self.cache[oldest_key]
            del self.access_times[oldest_key]
    
    def get(self, key: str) -> Optional[Any]:
        """獲取緩存值"""
        with self.lock:
            if key not in self.cache:
                return None
            
            item = self.cache[key]
            if self._is_expired(item):
                del self.cache[key]
                if key in self.access_times:
                    del self.access_times[key]
                return None
            
            # 更新訪問時間
            self.access_times[key] = time.time()
            return item['value']
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """設置緩存值"""
        with self.lock:
            # 清理過期項目
            self._cleanup_expired()
            
            # LRU 驅逐
            self._evict_lru()
            
            expires_at = None
            if ttl is not None:
                expires_at = time.time() + ttl
            elif self.default_ttl > 0:
                expires_at = time.time() + self.default_ttl
            
            self.cache[key] = {
                'value': value,
                'expires_at': expires_at,
                'created_at': time.time()
            }
            self.access_times[key] = time.time()
    
    def delete(self, key: str) -> bool:
        """刪除緩存項目"""
        with self.lock:
            if key in self.cache:
                del self.cache[key]
                if key in self.access_times:
                    del self.access_times[key]
                return True
            return False
    
    def clear(self) -> None:
        """清空所有緩存"""
        with self.lock:
            self.cache.clear()
            self.access_times.clear()
    
    def stats(self) -> Dict[str, Any]:
        """獲取緩存統計信息"""
        with self.lock:
            total_items = len(self.cache)
            expired_items = sum(1 for item in self.cache.values() if self._is_expired(item))
            
            return {
                'total_items': total_items,
                'active_items': total_items - expired_items,
                'expired_items': expired_items,
                'max_size': self.max_size,
                'memory_usage_estimate': len(str(self.cache)) * 8  # 粗略估算
            }

class RedisCache:
    """Redis 緩存實現"""
    
    def __init__(self, host: str = 'localhost', port: int = 6379, db: int = 0, 
                 password: Optional[str] = None, default_ttl: int = 3600):
        self.default_ttl = default_ttl
        self.redis_client = None
        
        if REDIS_AVAILABLE:
            try:
                self.redis_client = redis.Redis(
                    host=host, port=port, db=db, password=password,
                    decode_responses=True, socket_timeout=5
                )
                # 測試連接
                self.redis_client.ping()
                logger.info("Redis 緩存已連接")
            except Exception as e:
                logger.warning(f"Redis 連接失敗: {e}")
                self.redis_client = None
        else:
            logger.warning("Redis 模組未安裝，跳過 Redis 緩存")
    
    @property
    def is_available(self) -> bool:
        """檢查 Redis 是否可用"""
        return self.redis_client is not None
    
    def get(self, key: str) -> Optional[Any]:
        """獲取緩存值"""
        if not self.is_available:
            return None
        
        try:
            value = self.redis_client.get(key)
            if value is None:
                return None
            return json.loads(value)
        except Exception as e:
            logger.error(f"Redis get 錯誤: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """設置緩存值"""
        if not self.is_available:
            return False
        
        try:
            serialized_value = json.dumps(value, ensure_ascii=False)
            ttl = ttl or self.default_ttl
            return self.redis_client.setex(key, ttl, serialized_value)
        except Exception as e:
            logger.error(f"Redis set 錯誤: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """刪除緩存項目"""
        if not self.is_available:
            return False
        
        try:
            return bool(self.redis_client.delete(key))
        except Exception as e:
            logger.error(f"Redis delete 錯誤: {e}")
            return False
    
    def clear(self) -> bool:
        """清空所有緩存"""
        if not self.is_available:
            return False
        
        try:
            return self.redis_client.flushdb()
        except Exception as e:
            logger.error(f"Redis clear 錯誤: {e}")
            return False

class CacheService:
    """統一緩存服務"""
    
    def __init__(self, use_redis: bool = True, memory_cache_size: int = 1000,
                 default_ttl: int = 3600):
        self.memory_cache = MemoryCache(memory_cache_size, default_ttl)
        self.redis_cache = RedisCache(default_ttl=default_ttl) if use_redis else None
        self.stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'deletes': 0
        }
    
    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """生成緩存鍵"""
        # 創建一個包含所有參數的字符串
        key_data = f"{prefix}:{args}:{sorted(kwargs.items())}"
        # 使用 MD5 創建固定長度的鍵
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """獲取緩存值（先查 Redis，再查記憶體）"""
        # 首先嘗試 Redis
        if self.redis_cache and self.redis_cache.is_available:
            value = self.redis_cache.get(key)
            if value is not None:
                self.stats['hits'] += 1
                # 同時存入記憶體緩存以加速後續訪問
                self.memory_cache.set(key, value)
                return value
        
        # 然後嘗試記憶體緩存
        value = self.memory_cache.get(key)
        if value is not None:
            self.stats['hits'] += 1
            return value
        
        self.stats['misses'] += 1
        return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """設置緩存值（同時存入 Redis 和記憶體）"""
        self.stats['sets'] += 1
        
        # 存入記憶體緩存
        self.memory_cache.set(key, value, ttl)
        
        # 存入 Redis 緩存
        if self.redis_cache and self.redis_cache.is_available:
            self.redis_cache.set(key, value, ttl)
    
    def delete(self, key: str) -> bool:
        """刪除緩存項目"""
        self.stats['deletes'] += 1
        
        deleted = False
        
        # 從記憶體緩存刪除
        if self.memory_cache.delete(key):
            deleted = True
        
        # 從 Redis 緩存刪除
        if self.redis_cache and self.redis_cache.is_available:
            if self.redis_cache.delete(key):
                deleted = True
        
        return deleted
    
    def clear(self) -> None:
        """清空所有緩存"""
        self.memory_cache.clear()
        if self.redis_cache and self.redis_cache.is_available:
            self.redis_cache.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取緩存統計信息"""
        stats = self.stats.copy()
        stats['memory_cache'] = self.memory_cache.stats()
        stats['redis_available'] = self.redis_cache.is_available if self.redis_cache else False
        
        total_requests = stats['hits'] + stats['misses']
        stats['hit_rate'] = (stats['hits'] / total_requests * 100) if total_requests > 0 else 0
        
        return stats

# 全局緩存服務實例
cache_service = CacheService()

def cached(ttl: int = 3600, key_prefix: str = "default"):
    """緩存裝飾器"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 生成緩存鍵
            cache_key = cache_service._generate_key(
                f"{key_prefix}:{func.__name__}", *args, **kwargs
            )
            
            # 嘗試從緩存獲取
            cached_result = cache_service.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # 執行函數並緩存結果
            result = func(*args, **kwargs)
            cache_service.set(cache_key, result, ttl)
            
            return result
        
        return wrapper
    return decorator

# 特定於 AI 圖片生成的緩存函數
class ImageGenerationCache:
    """圖片生成專用緩存"""
    
    @staticmethod
    def get_prompt_cache_key(prompt: str, negative_prompt: str, image_size: str, 
                           api_provider: str, model: str = "") -> str:
        """生成提示詞緩存鍵"""
        return cache_service._generate_key(
            "image_gen", prompt, negative_prompt, image_size, api_provider, model
        )
    
    @staticmethod
    def cache_generation_result(prompt: str, negative_prompt: str, image_size: str,
                              api_provider: str, result: Dict, model: str = "",
                              ttl: int = 86400) -> None:  # 24小時
        """緩存圖片生成結果"""
        cache_key = ImageGenerationCache.get_prompt_cache_key(
            prompt, negative_prompt, image_size, api_provider, model
        )
        
        # 添加緩存時間戳
        cached_result = {
            **result,
            'cached_at': datetime.now().isoformat(),
            'cache_ttl': ttl
        }
        
        cache_service.set(cache_key, cached_result, ttl)
        logger.info(f"已緩存圖片生成結果: {cache_key[:16]}...")
    
    @staticmethod
    def get_cached_generation(prompt: str, negative_prompt: str, image_size: str,
                            api_provider: str, model: str = "") -> Optional[Dict]:
        """獲取緩存的圖片生成結果"""
        cache_key = ImageGenerationCache.get_prompt_cache_key(
            prompt, negative_prompt, image_size, api_provider, model
        )
        
        result = cache_service.get(cache_key)
        if result:
            logger.info(f"使用緩存的圖片生成結果: {cache_key[:16]}...")
        
        return result

# API 響應緩存
@cached(ttl=1800, key_prefix="api_response")  # 30分鐘
def cache_api_response(endpoint: str, params: Dict) -> Any:
    """緩存 API 響應（這是一個示例，實際使用時需要適配具體的 API 調用）"""
    pass

# 提示詞分析緩存
@cached(ttl=7200, key_prefix="prompt_analysis")  # 2小時
def cache_prompt_analysis(prompt: str) -> Any:
    """緩存提示詞分析結果"""
    pass 