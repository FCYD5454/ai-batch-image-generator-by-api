"""
批量處理引擎 v2.7
提供並行處理、智能隊列管理、進度追蹤等功能
"""

import asyncio
import time
import logging
import json
import uuid
from typing import Dict, List, Optional, Callable, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import queue
import heapq

logger = logging.getLogger(__name__)

class TaskStatus(Enum):
    """任務狀態枚舉"""
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"

class TaskPriority(Enum):
    """任務優先級枚舉"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    URGENT = 4

@dataclass
class BatchTask:
    """批量任務資料結構"""
    id: str
    task_type: str  # image_generation, prompt_optimization, etc.
    data: Dict[str, Any]
    priority: TaskPriority = TaskPriority.NORMAL
    status: TaskStatus = TaskStatus.PENDING
    created_at: datetime = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[Dict] = None
    error: Optional[str] = None
    progress: float = 0.0
    retry_count: int = 0
    max_retries: int = 3
    timeout_seconds: int = 300
    dependencies: List[str] = None  # 依賴的任務ID列表
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.dependencies is None:
            self.dependencies = []

@dataclass 
class BatchJob:
    """批量作業資料結構"""
    id: str
    name: str
    tasks: List[BatchTask]
    status: TaskStatus = TaskStatus.PENDING
    created_at: datetime = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    progress: float = 0.0
    concurrent_limit: int = 3
    auto_retry_failed: bool = True
    pause_on_error: bool = False
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()

class BatchProcessor:
    """批量處理引擎類"""
    
    def __init__(self, max_workers: int = 5, max_concurrent_jobs: int = 2):
        """
        初始化批量處理引擎
        
        Args:
            max_workers: 最大工作線程數
            max_concurrent_jobs: 最大並發作業數
        """
        self.max_workers = max_workers
        self.max_concurrent_jobs = max_concurrent_jobs
        
        # 任務和作業管理
        self.jobs: Dict[str, BatchJob] = {}
        self.tasks: Dict[str, BatchTask] = {}
        self.task_queue = queue.PriorityQueue()
        self.active_tasks: Dict[str, asyncio.Task] = {}
        self.paused_jobs: set = set()
        
        # 線程池
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        
        # 狀態管理
        self.is_running = False
        self.is_paused = False
        self.processor_thread = None
        self.stats = {
            "total_jobs": 0,
            "completed_jobs": 0,
            "failed_jobs": 0,
            "total_tasks": 0,
            "completed_tasks": 0,
            "failed_tasks": 0,
            "average_task_time": 0.0,
            "uptime_seconds": 0
        }
        
        # 處理器回調函數
        self.task_processors: Dict[str, Callable] = {}
        self.progress_callbacks: List[Callable] = []
        self.completion_callbacks: List[Callable] = []
        
        logger.info(f"批量處理引擎初始化完成 - 最大工作者數: {max_workers}, 最大並發作業: {max_concurrent_jobs}")
    
    def register_task_processor(self, task_type: str, processor_func: Callable):
        """
        註冊任務處理器
        
        Args:
            task_type: 任務類型
            processor_func: 處理函數 async def func(task_data) -> result
        """
        self.task_processors[task_type] = processor_func
        logger.info(f"已註冊任務處理器: {task_type}")
    
    def add_progress_callback(self, callback: Callable):
        """添加進度回調函數"""
        self.progress_callbacks.append(callback)
    
    def add_completion_callback(self, callback: Callable):
        """添加完成回調函數"""
        self.completion_callbacks.append(callback)
    
    def create_job(self, name: str, tasks_data: List[Dict], 
                   concurrent_limit: int = 3, 
                   auto_retry_failed: bool = True,
                   pause_on_error: bool = False) -> str:
        """
        創建批量作業
        
        Args:
            name: 作業名稱
            tasks_data: 任務數據列表
            concurrent_limit: 並發限制
            auto_retry_failed: 是否自動重試失敗任務
            pause_on_error: 遇到錯誤時是否暫停
            
        Returns:
            str: 作業ID
        """
        job_id = f"job_{uuid.uuid4().hex[:8]}"
        
        # 創建任務
        tasks = []
        for i, task_data in enumerate(tasks_data):
            task_id = f"{job_id}_task_{i}"
            task = BatchTask(
                id=task_id,
                task_type=task_data.get("type", "unknown"),
                data=task_data.get("data", {}),
                priority=TaskPriority(task_data.get("priority", 2)),
                max_retries=task_data.get("max_retries", 3),
                timeout_seconds=task_data.get("timeout", 300),
                dependencies=task_data.get("dependencies", [])
            )
            tasks.append(task)
            self.tasks[task_id] = task
        
        # 創建作業
        job = BatchJob(
            id=job_id,
            name=name,
            tasks=tasks,
            concurrent_limit=concurrent_limit,
            auto_retry_failed=auto_retry_failed,
            pause_on_error=pause_on_error
        )
        
        self.jobs[job_id] = job
        self.stats["total_jobs"] += 1
        self.stats["total_tasks"] += len(tasks)
        
        logger.info(f"創建批量作業: {job_id} - {name}, 任務數: {len(tasks)}")
        return job_id
    
    def start_job(self, job_id: str) -> Dict:
        """
        啟動批量作業
        
        Args:
            job_id: 作業ID
            
        Returns:
            Dict: 啟動結果
        """
        if job_id not in self.jobs:
            return {"success": False, "error": f"作業不存在: {job_id}"}
        
        job = self.jobs[job_id]
        if job.status != TaskStatus.PENDING:
            return {"success": False, "error": f"作業狀態不允許啟動: {job.status.value}"}
        
        # 將任務添加到隊列
        for task in job.tasks:
            if self._can_start_task(task):
                priority_value = -task.priority.value  # 負值使高優先級排在前面
                self.task_queue.put((priority_value, time.time(), task.id))
                task.status = TaskStatus.QUEUED
        
        job.status = TaskStatus.PROCESSING
        job.started_at = datetime.now()
        
        # 如果處理器未運行，啟動它
        if not self.is_running:
            self.start_processor()
        
        logger.info(f"啟動批量作業: {job_id}")
        return {"success": True, "job_id": job_id, "queued_tasks": len(job.tasks)}
    
    def pause_job(self, job_id: str) -> Dict:
        """暫停批量作業"""
        if job_id not in self.jobs:
            return {"success": False, "error": f"作業不存在: {job_id}"}
        
        job = self.jobs[job_id]
        if job.status != TaskStatus.PROCESSING:
            return {"success": False, "error": f"作業不在處理中: {job.status.value}"}
        
        self.paused_jobs.add(job_id)
        job.status = TaskStatus.PAUSED
        
        # 暫停正在處理的任務
        for task in job.tasks:
            if task.status == TaskStatus.PROCESSING:
                task.status = TaskStatus.PAUSED
        
        logger.info(f"暫停批量作業: {job_id}")
        return {"success": True, "job_id": job_id}
    
    def resume_job(self, job_id: str) -> Dict:
        """恢復批量作業"""
        if job_id not in self.jobs:
            return {"success": False, "error": f"作業不存在: {job_id}"}
        
        job = self.jobs[job_id]
        if job.status != TaskStatus.PAUSED:
            return {"success": False, "error": f"作業未暫停: {job.status.value}"}
        
        self.paused_jobs.discard(job_id)
        job.status = TaskStatus.PROCESSING
        
        # 恢復暫停的任務
        for task in job.tasks:
            if task.status == TaskStatus.PAUSED:
                task.status = TaskStatus.QUEUED
                priority_value = -task.priority.value
                self.task_queue.put((priority_value, time.time(), task.id))
        
        logger.info(f"恢復批量作業: {job_id}")
        return {"success": True, "job_id": job_id}
    
    def cancel_job(self, job_id: str) -> Dict:
        """取消批量作業"""
        if job_id not in self.jobs:
            return {"success": False, "error": f"作業不存在: {job_id}"}
        
        job = self.jobs[job_id]
        job.status = TaskStatus.CANCELLED
        job.completed_at = datetime.now()
        
        # 取消所有相關任務
        for task in job.tasks:
            if task.status in [TaskStatus.PENDING, TaskStatus.QUEUED, TaskStatus.PAUSED]:
                task.status = TaskStatus.CANCELLED
        
        self.paused_jobs.discard(job_id)
        logger.info(f"取消批量作業: {job_id}")
        return {"success": True, "job_id": job_id}
    
    def _can_start_task(self, task: BatchTask) -> bool:
        """檢查任務是否可以開始"""
        if task.status != TaskStatus.PENDING:
            return False
        
        # 檢查依賴任務是否完成
        for dep_id in task.dependencies:
            if dep_id in self.tasks:
                dep_task = self.tasks[dep_id]
                if dep_task.status != TaskStatus.COMPLETED:
                    return False
        
        return True
    
    def start_processor(self):
        """啟動批量處理器"""
        if self.is_running:
            return
        
        self.is_running = True
        self.processor_thread = threading.Thread(target=self._process_loop, daemon=True)
        self.processor_thread.start()
        logger.info("批量處理器已啟動")
    
    def stop_processor(self):
        """停止批量處理器"""
        self.is_running = False
        if self.processor_thread:
            self.processor_thread.join(timeout=5)
        logger.info("批量處理器已停止")
    
    def _process_loop(self):
        """處理器主循環"""
        start_time = time.time()
        
        while self.is_running:
            try:
                # 從隊列獲取任務
                try:
                    priority, queued_time, task_id = self.task_queue.get(timeout=1)
                except queue.Empty:
                    time.sleep(0.1)
                    continue
                
                # 檢查是否超過並發限制
                if len(self.active_tasks) >= self.max_workers:
                    # 重新排隊
                    self.task_queue.put((priority, queued_time, task_id))
                    time.sleep(0.1)
                    continue
                
                # 獲取任務
                if task_id not in self.tasks:
                    continue
                
                task = self.tasks[task_id]
                
                # 檢查任務是否可以處理
                if not self._can_process_task(task):
                    continue
                
                # 啟動任務處理
                asyncio_task = asyncio.create_task(self._process_task(task))
                self.active_tasks[task_id] = asyncio_task
                
                # 清理完成的任務
                self._cleanup_completed_tasks()
                
            except Exception as e:
                logger.error(f"處理器循環錯誤: {str(e)}")
                time.sleep(1)
        
        # 更新運行時間統計
        self.stats["uptime_seconds"] += time.time() - start_time
    
    def _can_process_task(self, task: BatchTask) -> bool:
        """檢查任務是否可以處理"""
        # 檢查任務狀態
        if task.status != TaskStatus.QUEUED:
            return False
        
        # 檢查任務類型是否有處理器
        if task.task_type not in self.task_processors:
            logger.error(f"未找到任務處理器: {task.task_type}")
            task.status = TaskStatus.FAILED
            task.error = f"未找到任務處理器: {task.task_type}"
            return False
        
        # 檢查作業是否暫停
        job_id = task.id.split("_task_")[0]
        if job_id in self.paused_jobs:
            return False
        
        return True
    
    async def _process_task(self, task: BatchTask):
        """處理單個任務"""
        try:
            task.status = TaskStatus.PROCESSING
            task.started_at = datetime.now()
            
            # 調用進度回調
            await self._call_progress_callbacks(task)
            
            # 獲取處理器函數
            processor = self.task_processors[task.task_type]
            
            # 設置超時
            try:
                result = await asyncio.wait_for(
                    processor(task.data),
                    timeout=task.timeout_seconds
                )
                
                task.status = TaskStatus.COMPLETED
                task.result = result
                task.progress = 100.0
                task.completed_at = datetime.now()
                
                self.stats["completed_tasks"] += 1
                
                # 更新作業進度
                self._update_job_progress(task)
                
                logger.info(f"任務完成: {task.id}")
                
            except asyncio.TimeoutError:
                task.status = TaskStatus.FAILED
                task.error = f"任務超時 ({task.timeout_seconds}秒)"
                logger.error(f"任務超時: {task.id}")
            
        except Exception as e:
            task.status = TaskStatus.FAILED
            task.error = str(e)
            task.completed_at = datetime.now()
            
            self.stats["failed_tasks"] += 1
            logger.error(f"任務處理失敗 {task.id}: {str(e)}")
            
            # 檢查是否需要重試
            if task.retry_count < task.max_retries:
                task.retry_count += 1
                task.status = TaskStatus.QUEUED
                priority_value = -task.priority.value
                self.task_queue.put((priority_value, time.time(), task.id))
                logger.info(f"任務重試 {task.id}: {task.retry_count}/{task.max_retries}")
        
        finally:
            # 從活動任務中移除
            if task.id in self.active_tasks:
                del self.active_tasks[task.id]
            
            # 調用進度回調
            await self._call_progress_callbacks(task)
    
    def _cleanup_completed_tasks(self):
        """清理已完成的任務"""
        completed_tasks = []
        for task_id, asyncio_task in self.active_tasks.items():
            if asyncio_task.done():
                completed_tasks.append(task_id)
        
        for task_id in completed_tasks:
            del self.active_tasks[task_id]
    
    def _update_job_progress(self, task: BatchTask):
        """更新作業進度"""
        job_id = task.id.split("_task_")[0]
        if job_id not in self.jobs:
            return
        
        job = self.jobs[job_id]
        completed_tasks = sum(1 for t in job.tasks if t.status == TaskStatus.COMPLETED)
        job.progress = (completed_tasks / len(job.tasks)) * 100
        
        # 檢查作業是否完成
        all_completed = all(t.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED] for t in job.tasks)
        if all_completed:
            job.status = TaskStatus.COMPLETED
            job.completed_at = datetime.now()
            self.stats["completed_jobs"] += 1
            
            # 調用完成回調
            asyncio.create_task(self._call_completion_callbacks(job))
    
    async def _call_progress_callbacks(self, task: BatchTask):
        """調用進度回調函數"""
        for callback in self.progress_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(task)
                else:
                    callback(task)
            except Exception as e:
                logger.error(f"進度回調錯誤: {str(e)}")
    
    async def _call_completion_callbacks(self, job: BatchJob):
        """調用完成回調函數"""
        for callback in self.completion_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(job)
                else:
                    callback(job)
            except Exception as e:
                logger.error(f"完成回調錯誤: {str(e)}")
    
    def get_job_status(self, job_id: str) -> Dict:
        """獲取作業狀態"""
        if job_id not in self.jobs:
            return {"success": False, "error": f"作業不存在: {job_id}"}
        
        job = self.jobs[job_id]
        
        # 統計任務狀態
        task_stats = {}
        for status in TaskStatus:
            task_stats[status.value] = sum(1 for t in job.tasks if t.status == status)
        
        # 計算處理時間
        processing_time = None
        if job.started_at:
            end_time = job.completed_at or datetime.now()
            processing_time = (end_time - job.started_at).total_seconds()
        
        return {
            "success": True,
            "job_id": job_id,
            "name": job.name,
            "status": job.status.value,
            "progress": round(job.progress, 2),
            "created_at": job.created_at.isoformat(),
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "processing_time_seconds": round(processing_time, 2) if processing_time else None,
            "total_tasks": len(job.tasks),
            "task_statistics": task_stats,
            "concurrent_limit": job.concurrent_limit,
            "auto_retry_failed": job.auto_retry_failed,
            "pause_on_error": job.pause_on_error
        }
    
    def get_task_status(self, task_id: str) -> Dict:
        """獲取任務狀態"""
        if task_id not in self.tasks:
            return {"success": False, "error": f"任務不存在: {task_id}"}
        
        task = self.tasks[task_id]
        
        # 計算處理時間
        processing_time = None
        if task.started_at:
            end_time = task.completed_at or datetime.now()
            processing_time = (end_time - task.started_at).total_seconds()
        
        return {
            "success": True,
            "task_id": task_id,
            "task_type": task.task_type,
            "status": task.status.value,
            "progress": round(task.progress, 2),
            "priority": task.priority.value,
            "created_at": task.created_at.isoformat(),
            "started_at": task.started_at.isoformat() if task.started_at else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            "processing_time_seconds": round(processing_time, 2) if processing_time else None,
            "retry_count": task.retry_count,
            "max_retries": task.max_retries,
            "error": task.error,
            "dependencies": task.dependencies,
            "has_result": task.result is not None
        }
    
    def get_system_stats(self) -> Dict:
        """獲取系統統計"""
        # 計算平均任務處理時間
        completed_tasks = [t for t in self.tasks.values() if t.status == TaskStatus.COMPLETED and t.started_at and t.completed_at]
        if completed_tasks:
            total_time = sum((t.completed_at - t.started_at).total_seconds() for t in completed_tasks)
            self.stats["average_task_time"] = total_time / len(completed_tasks)
        
        return {
            "success": True,
            "system_status": {
                "is_running": self.is_running,
                "is_paused": self.is_paused,
                "max_workers": self.max_workers,
                "max_concurrent_jobs": self.max_concurrent_jobs,
                "active_tasks": len(self.active_tasks),
                "queued_tasks": self.task_queue.qsize(),
                "registered_processors": list(self.task_processors.keys())
            },
            "statistics": self.stats,
            "performance_metrics": {
                "tasks_per_minute": (self.stats["completed_tasks"] / max(1, self.stats["uptime_seconds"] / 60)) if self.stats["uptime_seconds"] > 0 else 0,
                "success_rate": (self.stats["completed_tasks"] / max(1, self.stats["total_tasks"])) * 100,
                "average_task_time_seconds": round(self.stats["average_task_time"], 2)
            }
        }
    
    def cleanup_old_jobs(self, days_old: int = 7) -> Dict:
        """清理舊作業"""
        cutoff_date = datetime.now() - timedelta(days=days_old)
        old_jobs = []
        
        for job_id, job in list(self.jobs.items()):
            if job.created_at < cutoff_date and job.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]:
                old_jobs.append(job_id)
                
                # 清理相關任務
                for task in job.tasks:
                    if task.id in self.tasks:
                        del self.tasks[task.id]
                
                # 清理作業
                del self.jobs[job_id]
        
        logger.info(f"清理 {len(old_jobs)} 個舊作業")
        return {
            "success": True,
            "cleaned_jobs": len(old_jobs),
            "job_ids": old_jobs
        }
    
    def get_jobs_list(self, status_filter: str = None, limit: int = 50) -> Dict:
        """
        獲取作業列表
        
        Args:
            status_filter: 狀態過濾器 (pending, running, completed, failed)
            limit: 返回數量限制
            
        Returns:
            Dict: 作業列表
        """
        try:
            jobs_list = []
            
            for job in self.jobs.values():
                # 狀態過濾
                if status_filter:
                    if status_filter == "running" and job.status not in [TaskStatus.PROCESSING, TaskStatus.QUEUED]:
                        continue
                    elif status_filter == "completed" and job.status != TaskStatus.COMPLETED:
                        continue
                    elif status_filter == "failed" and job.status != TaskStatus.FAILED:
                        continue
                    elif status_filter == "pending" and job.status != TaskStatus.PENDING:
                        continue
                
                # 統計任務狀態
                task_stats = {
                    "total": len(job.tasks),
                    "completed": 0,
                    "failed": 0,
                    "processing": 0,
                    "pending": 0
                }
                
                for task in job.tasks:
                    if task.status == TaskStatus.COMPLETED:
                        task_stats["completed"] += 1
                    elif task.status == TaskStatus.FAILED:
                        task_stats["failed"] += 1
                    elif task.status == TaskStatus.PROCESSING:
                        task_stats["processing"] += 1
                    else:
                        task_stats["pending"] += 1
                
                jobs_list.append({
                    "id": job.id,
                    "name": job.name,
                    "status": job.status.value,
                    "progress": job.progress,
                    "task_stats": task_stats,
                    "created_at": job.created_at.isoformat() if job.created_at else None,
                    "started_at": job.started_at.isoformat() if job.started_at else None,
                    "completed_at": job.completed_at.isoformat() if job.completed_at else None,
                    "concurrent_limit": job.concurrent_limit,
                    "auto_retry_failed": job.auto_retry_failed,
                    "pause_on_error": job.pause_on_error
                })
            
            # 按創建時間排序，最新的在前
            jobs_list.sort(key=lambda x: x["created_at"] or "", reverse=True)
            
            # 限制返回數量
            if limit and limit > 0:
                jobs_list = jobs_list[:limit]
            
            return {
                "success": True,
                "jobs": jobs_list,
                "total_count": len(self.jobs),
                "filtered_count": len(jobs_list)
            }
            
        except Exception as e:
            logger.error(f"獲取作業列表失敗: {str(e)}")
            return {
                "success": False,
                "error": f"獲取作業列表失敗: {str(e)}",
                "jobs": []
            } 