# -*- coding: utf-8 -*-
'''
資料庫服務模組
處理圖片管理和生成歷史記錄
'''

import os
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)

class DatabaseService:
    """圖片管理和歷史記錄資料庫服務"""
    
    def __init__(self, db_path: str = None):
        if db_path is None:
            # 預設在項目根目錄創建資料庫
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            db_path = os.path.join(project_root, 'data', 'image_generator.db')
        
        self.db_path = db_path
        self._ensure_db_directory()
        self.init_database()
    
    def _ensure_db_directory(self):
        """確保資料庫目錄存在"""
        db_dir = os.path.dirname(self.db_path)
        if not os.path.exists(db_dir):
            os.makedirs(db_dir)
    
    @contextmanager
    def get_connection(self):
        """獲取資料庫連接（上下文管理器）"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # 返回字典式行
        try:
            yield conn
        finally:
            conn.close()
    
    def init_database(self):
        """初始化資料庫表結構"""
        with self.get_connection() as conn:
            # 創建生成記錄表
            conn.execute('''
                CREATE TABLE IF NOT EXISTS generation_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prompt TEXT NOT NULL,
                    api_provider TEXT NOT NULL,
                    model_name TEXT,
                    image_size TEXT NOT NULL,
                    image_count INTEGER NOT NULL,
                    success_count INTEGER DEFAULT 0,
                    failed_count INTEGER DEFAULT 0,
                    total_time REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    settings JSON
                )
            ''')
            
            # 創建生成圖片表
            conn.execute('''
                CREATE TABLE IF NOT EXISTS generated_images (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    generation_id INTEGER,
                    filename TEXT NOT NULL,
                    original_prompt TEXT NOT NULL,
                    api_provider TEXT NOT NULL,
                    model_name TEXT,
                    image_size TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    file_size INTEGER,
                    mime_type TEXT DEFAULT 'image/png',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    tags JSON,
                    rating INTEGER DEFAULT 0,
                    is_favorite BOOLEAN DEFAULT 0,
                    metadata JSON,
                    FOREIGN KEY (generation_id) REFERENCES generation_history (id)
                )
            ''')
            
            # 創建標籤表
            conn.execute('''
                CREATE TABLE IF NOT EXISTS image_tags (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    image_id INTEGER,
                    tag_name TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (image_id) REFERENCES generated_images (id)
                )
            ''')
            
            # 創建索引
            conn.execute('CREATE INDEX IF NOT EXISTS idx_images_created_at ON generated_images(created_at)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_images_provider ON generated_images(api_provider)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_images_favorite ON generated_images(is_favorite)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_history_created_at ON generation_history(created_at)')
            
            conn.commit()
            logger.info("資料庫初始化完成")
    
    def save_generation_record(self, prompt: str, api_provider: str, model_name: str = None,
                             image_size: str = "1024x1024", image_count: int = 1,
                             settings: Dict = None) -> int:
        """保存生成記錄"""
        with self.get_connection() as conn:
            cursor = conn.execute('''
                INSERT INTO generation_history 
                (prompt, api_provider, model_name, image_size, image_count, settings)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (prompt, api_provider, model_name, image_size, image_count,
                  json.dumps(settings) if settings else None))
            
            generation_id = cursor.lastrowid
            conn.commit()
            logger.info(f"保存生成記錄 ID: {generation_id}")
            return generation_id
    
    def update_generation_result(self, generation_id: int, success_count: int = 0,
                               failed_count: int = 0, total_time: float = None):
        """更新生成結果"""
        with self.get_connection() as conn:
            conn.execute('''
                UPDATE generation_history 
                SET success_count = ?, failed_count = ?, total_time = ?
                WHERE id = ?
            ''', (success_count, failed_count, total_time, generation_id))
            conn.commit()
    
    def save_generated_image(self, generation_id: int, filename: str, original_prompt: str,
                           api_provider: str, image_size: str, file_path: str,
                           model_name: str = None, file_size: int = None,
                           mime_type: str = 'image/png', metadata: Dict = None) -> int:
        """保存生成的圖片信息"""
        with self.get_connection() as conn:
            cursor = conn.execute('''
                INSERT INTO generated_images 
                (generation_id, filename, original_prompt, api_provider, model_name,
                 image_size, file_path, file_size, mime_type, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (generation_id, filename, original_prompt, api_provider, model_name,
                  image_size, file_path, file_size, mime_type,
                  json.dumps(metadata) if metadata else None))
            
            image_id = cursor.lastrowid
            conn.commit()
            logger.info(f"保存圖片記錄 ID: {image_id}, 文件: {filename}")
            return image_id
    
    def get_image_gallery(self, page: int = 1, page_size: int = 20, 
                         filter_provider: str = None, filter_favorite: bool = None,
                         search_prompt: str = None, sort_by: str = 'created_at',
                         sort_order: str = 'DESC') -> Tuple[List[Dict], int]:
        """獲取圖片畫廊（分頁）"""
        offset = (page - 1) * page_size
        
        # 構建查詢條件
        where_conditions = []
        params = []
        
        if filter_provider:
            where_conditions.append("api_provider = ?")
            params.append(filter_provider)
        
        if filter_favorite is not None:
            where_conditions.append("is_favorite = ?")
            params.append(1 if filter_favorite else 0)
        
        if search_prompt:
            where_conditions.append("original_prompt LIKE ?")
            params.append(f"%{search_prompt}%")
        
        where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
        
        # 驗證排序欄位
        valid_sort_fields = ['created_at', 'rating', 'filename', 'api_provider']
        if sort_by not in valid_sort_fields:
            sort_by = 'created_at'
        
        if sort_order.upper() not in ['ASC', 'DESC']:
            sort_order = 'DESC'
        
        with self.get_connection() as conn:
            # 獲取圖片列表
            query = f'''
                SELECT *, 
                       datetime(created_at, 'localtime') as local_created_at
                FROM generated_images 
                WHERE {where_clause}
                ORDER BY {sort_by} {sort_order}
                LIMIT ? OFFSET ?
            '''
            params.extend([page_size, offset])
            
            cursor = conn.execute(query, params)
            images = [dict(row) for row in cursor.fetchall()]
            
            # 獲取總數
            count_query = f'SELECT COUNT(*) FROM generated_images WHERE {where_clause}'
            count_params = params[:-2]  # 移除 LIMIT 和 OFFSET 參數
            cursor = conn.execute(count_query, count_params)
            total = cursor.fetchone()[0]
            
            # 解析 JSON 欄位
            for image in images:
                if image['tags']:
                    image['tags'] = json.loads(image['tags'])
                if image['metadata']:
                    image['metadata'] = json.loads(image['metadata'])
            
            return images, total
    
    def get_image_by_id(self, image_id: int) -> Optional[Dict]:
        """根據ID獲取圖片信息"""
        with self.get_connection() as conn:
            cursor = conn.execute('''
                SELECT *, datetime(created_at, 'localtime') as local_created_at
                FROM generated_images WHERE id = ?
            ''', (image_id,))
            
            row = cursor.fetchone()
            if row:
                image = dict(row)
                if image['tags']:
                    image['tags'] = json.loads(image['tags'])
                if image['metadata']:
                    image['metadata'] = json.loads(image['metadata'])
                return image
            return None
    
    def update_image_rating(self, image_id: int, rating: int) -> bool:
        """更新圖片評分"""
        if not 0 <= rating <= 5:
            return False
        
        with self.get_connection() as conn:
            cursor = conn.execute('''
                UPDATE generated_images SET rating = ? WHERE id = ?
            ''', (rating, image_id))
            conn.commit()
            return cursor.rowcount > 0
    
    def toggle_image_favorite(self, image_id: int) -> bool:
        """切換圖片收藏狀態"""
        with self.get_connection() as conn:
            # 獲取當前狀態
            cursor = conn.execute('SELECT is_favorite FROM generated_images WHERE id = ?', (image_id,))
            row = cursor.fetchone()
            if not row:
                return False
            
            new_status = 1 if not row[0] else 0
            
            # 更新狀態
            conn.execute('UPDATE generated_images SET is_favorite = ? WHERE id = ?', 
                        (new_status, image_id))
            conn.commit()
            return True
    
    def add_image_tags(self, image_id: int, tags: List[str]) -> bool:
        """為圖片添加標籤"""
        with self.get_connection() as conn:
            # 先刪除現有標籤
            conn.execute('DELETE FROM image_tags WHERE image_id = ?', (image_id,))
            
            # 添加新標籤
            for tag in tags:
                conn.execute('''
                    INSERT INTO image_tags (image_id, tag_name) VALUES (?, ?)
                ''', (image_id, tag.strip()))
            
            # 更新圖片表的標籤 JSON
            conn.execute('UPDATE generated_images SET tags = ? WHERE id = ?',
                        (json.dumps(tags), image_id))
            conn.commit()
            return True
    
    def get_generation_history(self, page: int = 1, page_size: int = 20) -> Tuple[List[Dict], int]:
        """獲取生成歷史記錄"""
        offset = (page - 1) * page_size
        
        with self.get_connection() as conn:
            # 獲取歷史記錄
            cursor = conn.execute('''
                SELECT h.*, 
                       datetime(h.created_at, 'localtime') as local_created_at,
                       COUNT(i.id) as actual_images
                FROM generation_history h
                LEFT JOIN generated_images i ON h.id = i.generation_id
                GROUP BY h.id
                ORDER BY h.created_at DESC
                LIMIT ? OFFSET ?
            ''', (page_size, offset))
            
            history = [dict(row) for row in cursor.fetchall()]
            
            # 獲取總數
            cursor = conn.execute('SELECT COUNT(*) FROM generation_history')
            total = cursor.fetchone()[0]
            
            # 解析 JSON 欄位
            for record in history:
                if record['settings']:
                    record['settings'] = json.loads(record['settings'])
            
            return history, total
    
    def get_statistics(self) -> Dict:
        """獲取統計信息"""
        with self.get_connection() as conn:
            # 基本統計
            cursor = conn.execute('''
                SELECT 
                    COUNT(*) as total_images,
                    COUNT(CASE WHEN is_favorite = 1 THEN 1 END) as favorite_images,
                    AVG(rating) as avg_rating,
                    COUNT(DISTINCT api_provider) as total_providers
                FROM generated_images
            ''')
            basic_stats = dict(cursor.fetchone())
            
            # 按提供商統計
            cursor = conn.execute('''
                SELECT api_provider, COUNT(*) as count
                FROM generated_images
                GROUP BY api_provider
                ORDER BY count DESC
            ''')
            provider_stats = [dict(row) for row in cursor.fetchall()]
            
            # 按日期統計（最近7天）
            cursor = conn.execute('''
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM generated_images
                WHERE created_at >= date('now', '-7 days')
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            ''')
            daily_stats = [dict(row) for row in cursor.fetchall()]
            
            # 成功率統計
            cursor = conn.execute('''
                SELECT 
                    SUM(success_count) as total_success,
                    SUM(failed_count) as total_failed,
                    COUNT(*) as total_generations
                FROM generation_history
            ''')
            success_stats = dict(cursor.fetchone())
            
            return {
                'basic': basic_stats,
                'by_provider': provider_stats,
                'daily': daily_stats,
                'success_rate': success_stats
            }
    
    def delete_image(self, image_id: int) -> bool:
        """刪除圖片記錄"""
        with self.get_connection() as conn:
            # 刪除標籤
            conn.execute('DELETE FROM image_tags WHERE image_id = ?', (image_id,))
            
            # 刪除圖片記錄
            cursor = conn.execute('DELETE FROM generated_images WHERE id = ?', (image_id,))
            conn.commit()
            
            return cursor.rowcount > 0
    
    def export_history_to_json(self, filepath: str = None) -> str:
        """匯出歷史記錄為JSON"""
        if filepath is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filepath = f"generation_history_{timestamp}.json"
        
        with self.get_connection() as conn:
            # 獲取所有歷史記錄和圖片
            cursor = conn.execute('''
                SELECT h.*, 
                       json_group_array(
                           json_object(
                               'id', i.id,
                               'filename', i.filename,
                               'file_path', i.file_path,
                               'rating', i.rating,
                               'is_favorite', i.is_favorite,
                               'tags', i.tags
                           )
                       ) as images
                FROM generation_history h
                LEFT JOIN generated_images i ON h.id = i.generation_id
                GROUP BY h.id
                ORDER BY h.created_at DESC
            ''')
            
            history = []
            for row in cursor.fetchall():
                record = dict(row)
                if record['settings']:
                    record['settings'] = json.loads(record['settings'])
                if record['images']:
                    record['images'] = json.loads(record['images'])
                history.append(record)
            
            # 匯出到文件
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(history, f, ensure_ascii=False, indent=2, default=str)
            
            logger.info(f"歷史記錄已匯出到: {filepath}")
            return filepath 