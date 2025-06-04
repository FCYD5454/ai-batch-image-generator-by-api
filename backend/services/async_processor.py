# -*- coding: utf-8 -*-
"""
AI 批量圖片生成器 - 異步處理服務
提供批量圖片生成的異步處理、隊列管理和進度追蹤
"""

import asyncio
import uuid
import time
import logging
from typing import Dict, List, Any, Optional, Callable, Coroutine
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor
import threading

logger = logging.getLogger(__name__)

class TaskStatus(Enum):
    """任務狀態枚舉"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class TaskPriority(Enum):
    """任務優先級枚舉"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    URGENT = 4

@dataclass
class AsyncTask:
    """異步任務數據類"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    function: Optional[Callable] = None
    args: tuple = field(default_factory=tuple)
    kwargs: dict = field(default_factory=dict)
    priority: TaskPriority = TaskPriority.NORMAL
    status: TaskStatus = TaskStatus.PENDING
    progress: float = 0.0
    result: Any = None
    error: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    estimated_duration: Optional[int] = None  # 秒
    retry_count: int = 0
    max_retries: int = 3
    metadata: dict = field(default_factory=dict)

    @property
    def duration(self) -> Optional[float]:
        """計算任務執行時間"""
        if self.started_at is None:
            return None
        end_time = self.completed_at or datetime.now()
        return (end_time - self.started_at).total_seconds()

    @property
    def is_completed(self) -> bool:
        """檢查任務是否已完成"""
        return self.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]

class AsyncProcessor:
    """異步處理器"""
    
    def __init__(self, max_concurrent_tasks: int = 5, max_thread_workers: int = 10):
        self.max_concurrent_tasks = max_concurrent_tasks
        self.max_thread_workers = max_thread_workers
        
        # 任務管理
        self.tasks: Dict[str, AsyncTask] = {}
        self.task_queue: asyncio.PriorityQueue = asyncio.PriorityQueue()
        self.running_tasks: Dict[str, asyncio.Task] = {}
        
        # 執行器
        self.thread_executor = ThreadPoolExecutor(max_workers=max_thread_workers)
        
        # 狀態管理
        self.is_running = False
        self.processor_task: Optional[asyncio.Task] = None
        
        # 事件回調
        self.task_callbacks: Dict[str, List[Callable]] = {
            'on_start': [],
            'on_progress': [],
            'on_complete': [],
            'on_error': []
        }
        
        # 統計信息
        self.stats = {
            'total_tasks': 0,
            'completed_tasks': 0,
            'failed_tasks': 0,
            'average_duration': 0.0,
            'queue_size': 0,
            'running_count': 0
        }
        
        self.lock = threading.RLock()
    
    def add_callback(self, event: str, callback: Callable):
        """添加事件回調"""
        if event in self.task_callbacks:
            self.task_callbacks[event].append(callback)
    
    async def submit_task(self, task: AsyncTask) -> str:
        """提交任務到隊列"""
        with self.lock:
            self.tasks[task.id] = task
            self.stats['total_tasks'] += 1
            self.stats['queue_size'] += 1
        
        # 優先級隊列：數字越小優先級越高
        priority = -task.priority.value  # 反轉優先級
        await self.task_queue.put((priority, time.time(), task.id))
        
        logger.info(f"任務已提交: {task.name} (ID: {task.id[:8]}...)")
        return task.id
    
    async def create_and_submit_task(
        self, 
        name: str, 
        function: Callable, 
        *args, 
        priority: TaskPriority = TaskPriority.NORMAL,
        estimated_duration: Optional[int] = None,
        metadata: Optional[dict] = None,
        **kwargs
    ) -> str:
        """創建並提交任務"""
        task = AsyncTask(
            name=name,
            function=function,
            args=args,
            kwargs=kwargs,
            priority=priority,
            estimated_duration=estimated_duration,
            metadata=metadata or {}
        )
        return await self.submit_task(task)
    
    async def start_processor(self):
        """啟動異步處理器"""
        if self.is_running:
            logger.warning("處理器已在運行")
            return
        
        self.is_running = True
        self.processor_task = asyncio.create_task(self._process_tasks())
        logger.info("異步處理器已啟動")
    
    async def stop_processor(self):
        """停止異步處理器"""
        if not self.is_running:
            return
        
        self.is_running = False
        
        # 取消所有運行中的任務
        for task_id, running_task in self.running_tasks.items():
            running_task.cancel()
            with self.lock:
                if task_id in self.tasks:
                    self.tasks[task_id].status = TaskStatus.CANCELLED
        
        # 等待處理器任務完成
        if self.processor_task:
            await self.processor_task
        
        # 關閉線程池
        self.thread_executor.shutdown(wait=True)
        
        logger.info("異步處理器已停止")
    
    async def _process_tasks(self):
        """處理任務隊列"""
        while self.is_running:
            try:
                # 控制併發數量
                if len(self.running_tasks) >= self.max_concurrent_tasks:
                    await asyncio.sleep(0.1)
                    continue
                
                # 從隊列獲取任務（帶超時）
                try:
                    priority, submit_time, task_id = await asyncio.wait_for(
                        self.task_queue.get(), timeout=1.0
                    )
                except asyncio.TimeoutError:
                    continue
                
                # 檢查任務是否存在
                if task_id not in self.tasks:
                    continue
                
                task = self.tasks[task_id]
                
                # 檢查任務是否已被取消
                if task.status == TaskStatus.CANCELLED:
                    continue
                
                # 啟動任務執行
                running_task = asyncio.create_task(self._execute_task(task))
                self.running_tasks[task_id] = running_task
                
                with self.lock:
                    self.stats['queue_size'] -= 1
                    self.stats['running_count'] += 1
                
            except Exception as e:
                logger.error(f"處理任務時發生錯誤: {e}")
                await asyncio.sleep(1)
    
    async def _execute_task(self, task: AsyncTask):
        """執行單個任務"""
        try:
            # 更新任務狀態
            task.status = TaskStatus.RUNNING
            task.started_at = datetime.now()
            task.progress = 0.0
            
            # 觸發開始回調
            await self._trigger_callbacks('on_start', task)
            
            logger.info(f"開始執行任務: {task.name} (ID: {task.id[:8]}...)")
            
            # 執行任務函數
            if asyncio.iscoroutinefunction(task.function):
                # 異步函數
                result = await task.function(*task.args, **task.kwargs)
            else:
                # 同步函數，在線程池中執行
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(
                    self.thread_executor, 
                    task.function, 
                    *task.args
                )
            
            # 任務完成
            task.result = result
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.now()
            task.progress = 100.0
            
            # 更新統計信息
            with self.lock:
                self.stats['completed_tasks'] += 1
                self.stats['running_count'] -= 1
                self._update_average_duration(task.duration)
            
            # 觸發完成回調
            await self._trigger_callbacks('on_complete', task)
            
            logger.info(f"任務完成: {task.name} (ID: {task.id[:8]}...) - 耗時: {task.duration:.2f}s")
            
        except asyncio.CancelledError:
            task.status = TaskStatus.CANCELLED
            task.completed_at = datetime.now()
            logger.info(f"任務被取消: {task.name} (ID: {task.id[:8]}...)")
            
        except Exception as e:
            # 任務失敗
            task.error = str(e)
            task.status = TaskStatus.FAILED
            task.completed_at = datetime.now()
            
            # 更新統計信息
            with self.lock:
                self.stats['failed_tasks'] += 1
                self.stats['running_count'] -= 1
            
            # 檢查是否需要重試
            if task.retry_count < task.max_retries:
                task.retry_count += 1
                task.status = TaskStatus.PENDING
                await self.submit_task(task)
                logger.warning(f"任務失敗，重試 {task.retry_count}/{task.max_retries}: {task.name}")
            else:
                # 觸發錯誤回調
                await self._trigger_callbacks('on_error', task)
                logger.error(f"任務最終失敗: {task.name} (ID: {task.id[:8]}...) - 錯誤: {e}")
        
        finally:
            # 清理運行中的任務記錄
            if task.id in self.running_tasks:
                del self.running_tasks[task.id]
    
    async def _trigger_callbacks(self, event: str, task: AsyncTask):
        """觸發事件回調"""
        for callback in self.task_callbacks.get(event, []):
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(task)
                else:
                    callback(task)
            except Exception as e:
                logger.error(f"回調函數執行失敗 ({event}): {e}")
    
    def _update_average_duration(self, duration: Optional[float]):
        """更新平均執行時間"""
        if duration is None:
            return
        
        completed = self.stats['completed_tasks']
        if completed == 1:
            self.stats['average_duration'] = duration
        else:
            current_avg = self.stats['average_duration']
            self.stats['average_duration'] = (current_avg * (completed - 1) + duration) / completed
    
    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """獲取任務狀態"""
        if task_id not in self.tasks:
            return None
        
        task = self.tasks[task_id]
        return {
            'id': task.id,
            'name': task.name,
            'status': task.status.value,
            'progress': task.progress,
            'created_at': task.created_at.isoformat(),
            'started_at': task.started_at.isoformat() if task.started_at else None,
            'completed_at': task.completed_at.isoformat() if task.completed_at else None,
            'duration': task.duration,
            'estimated_duration': task.estimated_duration,
            'retry_count': task.retry_count,
            'error': task.error,
            'metadata': task.metadata
        }
    
    def get_all_tasks(self, status_filter: Optional[TaskStatus] = None) -> List[Dict[str, Any]]:
        """獲取所有任務"""
        tasks = []
        for task in self.tasks.values():
            if status_filter is None or task.status == status_filter:
                tasks.append(self.get_task_status(task.id))
        
        # 按創建時間排序
        tasks.sort(key=lambda x: x['created_at'], reverse=True)
        return tasks
    
    async def cancel_task(self, task_id: str) -> bool:
        """取消任務"""
        if task_id not in self.tasks:
            return False
        
        task = self.tasks[task_id]
        
        if task.is_completed:
            return False
        
        task.status = TaskStatus.CANCELLED
        
        # 如果任務正在運行，取消它
        if task_id in self.running_tasks:
            self.running_tasks[task_id].cancel()
        
        logger.info(f"任務已取消: {task.name} (ID: {task_id[:8]}...)")
        return True
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取處理器統計信息"""
        with self.lock:
            stats = self.stats.copy()
            stats['is_running'] = self.is_running
            stats['total_running'] = len(self.running_tasks)
            stats['success_rate'] = (
                (stats['completed_tasks'] / max(stats['total_tasks'], 1)) * 100
            )
            return stats
    
    async def update_task_progress(self, task_id: str, progress: float, message: str = ""):
        """更新任務進度"""
        if task_id not in self.tasks:
            return
        
        task = self.tasks[task_id]
        task.progress = max(0.0, min(100.0, progress))
        
        if message:
            task.metadata['progress_message'] = message
        
        # 觸發進度回調
        await self._trigger_callbacks('on_progress', task)

# 圖片生成專用的異步處理器
class ImageGenerationProcessor(AsyncProcessor):
    """圖片生成專用異步處理器"""
    
    def __init__(self, max_concurrent_tasks: int = 3):
        super().__init__(max_concurrent_tasks=max_concurrent_tasks)
        
        # 圖片生成特定的統計
        self.generation_stats = {
            'total_images_generated': 0,
            'average_generation_time': 0.0,
            'provider_usage': {},
            'popular_prompts': {}
        }
    
    async def submit_batch_generation(
        self, 
        prompts: List[str], 
        settings: Dict[str, Any],
        priority: TaskPriority = TaskPriority.NORMAL
    ) -> str:
        """提交批量圖片生成任務"""
        batch_id = str(uuid.uuid4())
        
        # 為每個提示詞創建子任務
        subtask_ids = []
        for i, prompt in enumerate(prompts):
            task_name = f"批量生成 {batch_id[:8]}... [{i+1}/{len(prompts)}]"
            
            task_id = await self.create_and_submit_task(
                name=task_name,
                function=self._generate_single_image,
                prompt=prompt,
                settings=settings,
                batch_id=batch_id,
                index=i,
                priority=priority,
                estimated_duration=30,  # 估計30秒
                metadata={
                    'type': 'image_generation',
                    'batch_id': batch_id,
                    'prompt': prompt,
                    'is_batch_item': True
                }
            )
            subtask_ids.append(task_id)
        
        # 創建批量監控任務
        await self.create_and_submit_task(
            name=f"批量監控 {batch_id[:8]}...",
            function=self._monitor_batch,
            batch_id=batch_id,
            subtask_ids=subtask_ids,
            priority=TaskPriority.LOW,
            metadata={
                'type': 'batch_monitor',
                'batch_id': batch_id,
                'subtask_count': len(subtask_ids)
            }
        )
        
        logger.info(f"已提交批量生成任務: {len(prompts)} 個提示詞 (批次ID: {batch_id[:8]}...)")
        return batch_id
    
    async def _generate_single_image(self, prompt: str, settings: Dict[str, Any], 
                                   batch_id: str, index: int) -> Dict[str, Any]:
        """生成單張圖片（模擬）"""
        # 這裡應該調用實際的圖片生成函數
        # 現在使用模擬實現
        
        await asyncio.sleep(2)  # 模擬生成時間
        
        # 更新統計
        provider = settings.get('api_provider', 'unknown')
        self.generation_stats['total_images_generated'] += 1
        self.generation_stats['provider_usage'][provider] = (
            self.generation_stats['provider_usage'].get(provider, 0) + 1
        )
        
        return {
            'success': True,
            'image_url': f'/generated/{batch_id}_{index}.png',
            'prompt': prompt,
            'provider': provider,
            'generation_time': 2.0
        }
    
    async def _monitor_batch(self, batch_id: str, subtask_ids: List[str]) -> Dict[str, Any]:
        """監控批量任務進度"""
        total_tasks = len(subtask_ids)
        
        while True:
            completed = 0
            failed = 0
            
            for task_id in subtask_ids:
                task = self.tasks.get(task_id)
                if task:
                    if task.status == TaskStatus.COMPLETED:
                        completed += 1
                    elif task.status == TaskStatus.FAILED:
                        failed += 1
            
            progress = (completed + failed) / total_tasks * 100
            
            # 更新批量任務進度
            await self.update_task_progress(
                batch_id, 
                progress, 
                f"已完成 {completed}/{total_tasks}，失敗 {failed}"
            )
            
            # 檢查是否全部完成
            if completed + failed >= total_tasks:
                break
            
            await asyncio.sleep(1)
        
        return {
            'batch_id': batch_id,
            'total_tasks': total_tasks,
            'completed': completed,
            'failed': failed,
            'success_rate': completed / total_tasks * 100
        }

# 全局異步處理器實例
image_processor = ImageGenerationProcessor()

# 便捷函數
async def start_async_processing():
    """啟動異步處理"""
    await image_processor.start_processor()

async def stop_async_processing():
    """停止異步處理"""
    await image_processor.stop_processor()

async def submit_image_generation(prompt: str, settings: Dict[str, Any]) -> str:
    """提交單個圖片生成任務"""
    return await image_processor.create_and_submit_task(
        name=f"生成圖片: {prompt[:50]}...",
        function=image_processor._generate_single_image,
        prompt=prompt,
        settings=settings,
        batch_id=str(uuid.uuid4()),
        index=0,
        metadata={'type': 'single_generation', 'prompt': prompt}
    ) 