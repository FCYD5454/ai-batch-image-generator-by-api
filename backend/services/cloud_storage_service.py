"""
雲存儲服務 v2.9
提供多雲平台的統一存儲接口，支援 AWS S3、Google Cloud Storage 和跨設備同步
"""

import os
import asyncio
import aiohttp
import json
import hashlib
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from pathlib import Path
import logging
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class CloudProvider(Enum):
    """支援的雲服務提供商"""
    AWS_S3 = "aws_s3"
    GOOGLE_CLOUD = "google_cloud"
    AZURE_BLOB = "azure_blob"
    LOCAL_STORAGE = "local_storage"

@dataclass
class CloudFile:
    """雲文件信息"""
    file_id: str
    filename: str
    file_path: str
    file_size: int
    file_hash: str
    content_type: str
    provider: CloudProvider
    bucket_name: str
    created_at: datetime
    updated_at: datetime
    metadata: Dict[str, Any]
    tags: List[str]
    is_public: bool = False
    expiry_date: Optional[datetime] = None

class CloudStorageService:
    """雲存儲服務管理器"""
    
    def __init__(self):
        self.providers = {}
        self.default_provider = None
        self.sync_enabled = False
        
        # 配置信息
        self.config = {
            'aws_s3': {
                'access_key_id': os.getenv('AWS_ACCESS_KEY_ID'),
                'secret_access_key': os.getenv('AWS_SECRET_ACCESS_KEY'),
                'region': os.getenv('AWS_REGION', 'us-east-1'),
                'bucket_name': os.getenv('AWS_S3_BUCKET', 'imagegeneration-bucket')
            },
            'google_cloud': {
                'credentials_path': os.getenv('GOOGLE_CLOUD_CREDENTIALS'),
                'project_id': os.getenv('GOOGLE_CLOUD_PROJECT_ID'),
                'bucket_name': os.getenv('GOOGLE_CLOUD_BUCKET', 'imagegeneration-bucket')
            },
            'azure_blob': {
                'connection_string': os.getenv('AZURE_STORAGE_CONNECTION_STRING'),
                'container_name': os.getenv('AZURE_CONTAINER_NAME', 'imagegeneration')
            }
        }
        
        # 同步配置
        self.sync_config = {
            'auto_sync': True,
            'sync_interval': 300,  # 5分鐘
            'max_file_size': 100 * 1024 * 1024,  # 100MB
            'excluded_extensions': ['.tmp', '.cache', '.log'],
            'compression_enabled': True,
            'encryption_enabled': True
        }
        
        # 統計信息
        self.stats = {
            'total_files': 0,
            'total_size': 0,
            'upload_count': 0,
            'download_count': 0,
            'sync_count': 0,
            'error_count': 0,
            'last_sync': None,
            'providers_status': {}
        }
        
        # 文件緩存
        self.file_cache = {}
        self.metadata_cache = {}
        
        logger.info("雲存儲服務初始化完成")
    
    async def initialize(self) -> bool:
        """初始化雲存儲服務"""
        try:
            success_count = 0
            
            # 初始化 AWS S3
            if await self._initialize_aws_s3():
                success_count += 1
                logger.info("AWS S3 提供商初始化成功")
            
            # 初始化 Google Cloud Storage
            if await self._initialize_google_cloud():
                success_count += 1
                logger.info("Google Cloud Storage 提供商初始化成功")
            
            # 初始化 Azure Blob Storage
            if await self._initialize_azure_blob():
                success_count += 1
                logger.info("Azure Blob Storage 提供商初始化成功")
            
            # 至少有一個提供商成功初始化
            if success_count > 0:
                # 設置默認提供商
                if CloudProvider.AWS_S3 in self.providers:
                    self.default_provider = CloudProvider.AWS_S3
                elif CloudProvider.GOOGLE_CLOUD in self.providers:
                    self.default_provider = CloudProvider.GOOGLE_CLOUD
                elif CloudProvider.AZURE_BLOB in self.providers:
                    self.default_provider = CloudProvider.AZURE_BLOB
                
                logger.info(f"雲存儲服務初始化完成，默認提供商: {self.default_provider}")
                return True
            else:
                logger.warning("沒有可用的雲存儲提供商")
                return False
                
        except Exception as e:
            logger.error(f"雲存儲服務初始化失敗: {str(e)}")
            return False
    
    async def _initialize_aws_s3(self) -> bool:
        """初始化 AWS S3 提供商"""
        try:
            config = self.config['aws_s3']
            
            if not config['access_key_id'] or not config['secret_access_key']:
                logger.warning("AWS S3 配置不完整，跳過初始化")
                return False
            
            # 測試連接
            import boto3
            from botocore.exceptions import ClientError
            
            session = boto3.Session(
                aws_access_key_id=config['access_key_id'],
                aws_secret_access_key=config['secret_access_key'],
                region_name=config['region']
            )
            
            s3_client = session.client('s3')
            
            # 測試存儲桶訪問
            try:
                s3_client.head_bucket(Bucket=config['bucket_name'])
            except ClientError as e:
                if e.response['Error']['Code'] == '404':
                    # 存儲桶不存在，嘗試創建
                    s3_client.create_bucket(Bucket=config['bucket_name'])
                    logger.info(f"創建 AWS S3 存儲桶: {config['bucket_name']}")
                else:
                    raise
            
            self.providers[CloudProvider.AWS_S3] = {
                'client': s3_client,
                'config': config,
                'status': 'active'
            }
            
            self.stats['providers_status'][CloudProvider.AWS_S3.value] = 'active'
            return True
            
        except Exception as e:
            logger.error(f"AWS S3 初始化失敗: {str(e)}")
            self.stats['providers_status'][CloudProvider.AWS_S3.value] = 'error'
            return False
    
    async def _initialize_google_cloud(self) -> bool:
        """初始化 Google Cloud Storage 提供商"""
        try:
            config = self.config['google_cloud']
            
            if not config['credentials_path'] or not config['project_id']:
                logger.warning("Google Cloud Storage 配置不完整，跳過初始化")
                return False
            
            # 測試連接
            from google.cloud import storage
            from google.oauth2 import service_account
            
            credentials = service_account.Credentials.from_service_account_file(
                config['credentials_path']
            )
            
            client = storage.Client(
                project=config['project_id'],
                credentials=credentials
            )
            
            # 測試存儲桶訪問
            bucket = client.bucket(config['bucket_name'])
            if not bucket.exists():
                # 存儲桶不存在，嘗試創建
                bucket = client.create_bucket(config['bucket_name'])
                logger.info(f"創建 Google Cloud Storage 存儲桶: {config['bucket_name']}")
            
            self.providers[CloudProvider.GOOGLE_CLOUD] = {
                'client': client,
                'bucket': bucket,
                'config': config,
                'status': 'active'
            }
            
            self.stats['providers_status'][CloudProvider.GOOGLE_CLOUD.value] = 'active'
            return True
            
        except Exception as e:
            logger.error(f"Google Cloud Storage 初始化失敗: {str(e)}")
            self.stats['providers_status'][CloudProvider.GOOGLE_CLOUD.value] = 'error'
            return False
    
    async def _initialize_azure_blob(self) -> bool:
        """初始化 Azure Blob Storage 提供商"""
        try:
            config = self.config['azure_blob']
            
            if not config['connection_string']:
                logger.warning("Azure Blob Storage 配置不完整，跳過初始化")
                return False
            
            # 測試連接
            from azure.storage.blob import BlobServiceClient
            
            blob_service_client = BlobServiceClient.from_connection_string(
                config['connection_string']
            )
            
            # 測試容器訪問
            container_client = blob_service_client.get_container_client(
                config['container_name']
            )
            
            if not container_client.exists():
                # 容器不存在，嘗試創建
                container_client.create_container()
                logger.info(f"創建 Azure Blob 容器: {config['container_name']}")
            
            self.providers[CloudProvider.AZURE_BLOB] = {
                'client': blob_service_client,
                'container_client': container_client,
                'config': config,
                'status': 'active'
            }
            
            self.stats['providers_status'][CloudProvider.AZURE_BLOB.value] = 'active'
            return True
            
        except Exception as e:
            logger.error(f"Azure Blob Storage 初始化失敗: {str(e)}")
            self.stats['providers_status'][CloudProvider.AZURE_BLOB.value] = 'error'
            return False
    
    async def upload_file(self, 
                         file_path: str, 
                         destination_path: str = None,
                         provider: CloudProvider = None,
                         metadata: Dict[str, Any] = None,
                         tags: List[str] = None,
                         is_public: bool = False) -> Dict[str, Any]:
        """上傳文件到雲存儲"""
        try:
            if not provider:
                provider = self.default_provider
            
            if provider not in self.providers:
                raise ValueError(f"提供商 {provider} 不可用")
            
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"文件不存在: {file_path}")
            
            # 檢查文件大小
            file_size = os.path.getsize(file_path)
            if file_size > self.sync_config['max_file_size']:
                raise ValueError(f"文件大小超過限制: {file_size} bytes")
            
            # 計算文件哈希
            file_hash = await self._calculate_file_hash(file_path)
            
            # 生成目標路徑
            if not destination_path:
                destination_path = os.path.basename(file_path)
            
            # 準備元數據
            file_metadata = {
                'original_name': os.path.basename(file_path),
                'upload_time': datetime.now().isoformat(),
                'file_size': file_size,
                'file_hash': file_hash,
                'uploader': 'system',
                **(metadata or {})
            }
            
            # 根據提供商上傳文件
            if provider == CloudProvider.AWS_S3:
                result = await self._upload_to_s3(
                    file_path, destination_path, file_metadata, tags, is_public
                )
            elif provider == CloudProvider.GOOGLE_CLOUD:
                result = await self._upload_to_gcs(
                    file_path, destination_path, file_metadata, tags, is_public
                )
            elif provider == CloudProvider.AZURE_BLOB:
                result = await self._upload_to_azure(
                    file_path, destination_path, file_metadata, tags, is_public
                )
            else:
                raise ValueError(f"不支援的提供商: {provider}")
            
            # 更新統計
            self.stats['upload_count'] += 1
            self.stats['total_files'] += 1
            self.stats['total_size'] += file_size
            
            # 創建文件對象
            cloud_file = CloudFile(
                file_id=result['file_id'],
                filename=os.path.basename(file_path),
                file_path=destination_path,
                file_size=file_size,
                file_hash=file_hash,
                content_type=result.get('content_type', 'application/octet-stream'),
                provider=provider,
                bucket_name=result['bucket_name'],
                created_at=datetime.now(),
                updated_at=datetime.now(),
                metadata=file_metadata,
                tags=tags or [],
                is_public=is_public
            )
            
            # 添加到緩存
            self.file_cache[result['file_id']] = cloud_file
            
            logger.info(f"文件上傳成功: {file_path} -> {provider.value}")
            
            return {
                'success': True,
                'file_id': result['file_id'],
                'cloud_file': cloud_file,
                'url': result.get('url'),
                'provider': provider.value
            }
            
        except Exception as e:
            self.stats['error_count'] += 1
            logger.error(f"文件上傳失敗: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def download_file(self, 
                          file_id: str, 
                          local_path: str,
                          provider: CloudProvider = None) -> Dict[str, Any]:
        """從雲存儲下載文件"""
        try:
            if not provider:
                provider = self.default_provider
            
            if provider not in self.providers:
                raise ValueError(f"提供商 {provider} 不可用")
            
            # 檢查緩存中的文件信息
            if file_id in self.file_cache:
                cloud_file = self.file_cache[file_id]
            else:
                # 從雲存儲獲取文件信息
                cloud_file = await self.get_file_info(file_id, provider)
                if not cloud_file:
                    raise FileNotFoundError(f"文件不存在: {file_id}")
            
            # 根據提供商下載文件
            if provider == CloudProvider.AWS_S3:
                result = await self._download_from_s3(cloud_file, local_path)
            elif provider == CloudProvider.GOOGLE_CLOUD:
                result = await self._download_from_gcs(cloud_file, local_path)
            elif provider == CloudProvider.AZURE_BLOB:
                result = await self._download_from_azure(cloud_file, local_path)
            else:
                raise ValueError(f"不支援的提供商: {provider}")
            
            # 驗證文件完整性
            downloaded_hash = await self._calculate_file_hash(local_path)
            if downloaded_hash != cloud_file.file_hash:
                raise ValueError("文件完整性檢查失敗")
            
            # 更新統計
            self.stats['download_count'] += 1
            
            logger.info(f"文件下載成功: {file_id} -> {local_path}")
            
            return {
                'success': True,
                'local_path': local_path,
                'cloud_file': cloud_file,
                'provider': provider.value
            }
            
        except Exception as e:
            self.stats['error_count'] += 1
            logger.error(f"文件下載失敗: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _upload_to_s3(self, file_path: str, destination_path: str, 
                           metadata: Dict, tags: List, is_public: bool) -> Dict:
        """上傳文件到 AWS S3"""
        try:
            provider_info = self.providers[CloudProvider.AWS_S3]
            s3_client = provider_info['client']
            bucket_name = provider_info['config']['bucket_name']
            
            # 準備上傳參數
            extra_args = {
                'Metadata': {k: str(v) for k, v in metadata.items()},
            }
            
            if is_public:
                extra_args['ACL'] = 'public-read'
            
            if tags:
                tag_set = '&'.join([f'{i}={tag}' for i, tag in enumerate(tags)])
                extra_args['Tagging'] = tag_set
            
            # 上傳文件
            s3_client.upload_file(file_path, bucket_name, destination_path, ExtraArgs=extra_args)
            
            # 生成文件ID和URL
            file_id = f"s3://{bucket_name}/{destination_path}"
            
            if is_public:
                url = f"https://{bucket_name}.s3.amazonaws.com/{destination_path}"
            else:
                url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': bucket_name, 'Key': destination_path},
                    ExpiresIn=3600
                )
            
            return {
                'file_id': file_id,
                'bucket_name': bucket_name,
                'url': url,
                'content_type': 'application/octet-stream'
            }
            
        except Exception as e:
            raise Exception(f"S3 上傳失敗: {str(e)}")
    
    async def _upload_to_gcs(self, file_path: str, destination_path: str,
                            metadata: Dict, tags: List, is_public: bool) -> Dict:
        """上傳文件到 Google Cloud Storage"""
        try:
            provider_info = self.providers[CloudProvider.GOOGLE_CLOUD]
            bucket = provider_info['bucket']
            bucket_name = provider_info['config']['bucket_name']
            
            # 創建 blob
            blob = bucket.blob(destination_path)
            
            # 設置元數據
            blob.metadata = {k: str(v) for k, v in metadata.items()}
            
            # 上傳文件
            with open(file_path, 'rb') as file_obj:
                blob.upload_from_file(file_obj)
            
            # 設置公開訪問
            if is_public:
                blob.make_public()
            
            # 生成文件ID和URL
            file_id = f"gcs://{bucket_name}/{destination_path}"
            url = blob.public_url if is_public else blob.generate_signed_url(
                expiration=datetime.now() + timedelta(hours=1)
            )
            
            return {
                'file_id': file_id,
                'bucket_name': bucket_name,
                'url': url,
                'content_type': blob.content_type or 'application/octet-stream'
            }
            
        except Exception as e:
            raise Exception(f"GCS 上傳失敗: {str(e)}")
    
    async def _upload_to_azure(self, file_path: str, destination_path: str,
                              metadata: Dict, tags: List, is_public: bool) -> Dict:
        """上傳文件到 Azure Blob Storage"""
        try:
            provider_info = self.providers[CloudProvider.AZURE_BLOB]
            container_client = provider_info['container_client']
            container_name = provider_info['config']['container_name']
            
            # 上傳文件
            with open(file_path, 'rb') as file_obj:
                blob_client = container_client.upload_blob(
                    name=destination_path,
                    data=file_obj,
                    metadata={k: str(v) for k, v in metadata.items()},
                    overwrite=True
                )
            
            # 生成文件ID和URL
            file_id = f"azure://{container_name}/{destination_path}"
            url = blob_client.url
            
            return {
                'file_id': file_id,
                'bucket_name': container_name,
                'url': url,
                'content_type': 'application/octet-stream'
            }
            
        except Exception as e:
            raise Exception(f"Azure 上傳失敗: {str(e)}")
    
    async def _download_from_s3(self, cloud_file: CloudFile, local_path: str) -> Dict:
        """從 AWS S3 下載文件"""
        try:
            provider_info = self.providers[CloudProvider.AWS_S3]
            s3_client = provider_info['client']
            bucket_name = cloud_file.bucket_name
            
            s3_client.download_file(bucket_name, cloud_file.file_path, local_path)
            
            return {'success': True}
            
        except Exception as e:
            raise Exception(f"S3 下載失敗: {str(e)}")
    
    async def _download_from_gcs(self, cloud_file: CloudFile, local_path: str) -> Dict:
        """從 Google Cloud Storage 下載文件"""
        try:
            provider_info = self.providers[CloudProvider.GOOGLE_CLOUD]
            bucket = provider_info['bucket']
            
            blob = bucket.blob(cloud_file.file_path)
            blob.download_to_filename(local_path)
            
            return {'success': True}
            
        except Exception as e:
            raise Exception(f"GCS 下載失敗: {str(e)}")
    
    async def _download_from_azure(self, cloud_file: CloudFile, local_path: str) -> Dict:
        """從 Azure Blob Storage 下載文件"""
        try:
            provider_info = self.providers[CloudProvider.AZURE_BLOB]
            container_client = provider_info['container_client']
            
            with open(local_path, 'wb') as file_obj:
                download_stream = container_client.download_blob(cloud_file.file_path)
                file_obj.write(download_stream.readall())
            
            return {'success': True}
            
        except Exception as e:
            raise Exception(f"Azure 下載失敗: {str(e)}")
    
    async def _calculate_file_hash(self, file_path: str) -> str:
        """計算文件哈希值"""
        hash_sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()
    
    async def sync_files(self, local_directory: str, remote_directory: str = "",
                        provider: CloudProvider = None) -> Dict[str, Any]:
        """同步本地文件夾到雲存儲"""
        try:
            if not provider:
                provider = self.default_provider
            
            if provider not in self.providers:
                raise ValueError(f"提供商 {provider} 不可用")
            
            if not os.path.exists(local_directory):
                raise FileNotFoundError(f"本地目錄不存在: {local_directory}")
            
            sync_results = {
                'uploaded': [],
                'skipped': [],
                'errors': [],
                'total_files': 0,
                'total_size': 0
            }
            
            # 遍歷本地文件
            for root, dirs, files in os.walk(local_directory):
                for file in files:
                    local_file_path = os.path.join(root, file)
                    relative_path = os.path.relpath(local_file_path, local_directory)
                    
                    # 檢查是否排除此文件
                    if self._should_exclude_file(relative_path):
                        sync_results['skipped'].append(relative_path)
                        continue
                    
                    # 計算遠程路徑
                    remote_path = os.path.join(remote_directory, relative_path).replace('\\', '/')
                    
                    try:
                        # 檢查文件是否已存在
                        file_hash = await self._calculate_file_hash(local_file_path)
                        should_upload = True
                        
                        # 檢查雲端是否有相同文件
                        existing_files = await self.list_files(provider, remote_directory)
                        for existing_file in existing_files:
                            if (existing_file.file_path == remote_path and 
                                existing_file.file_hash == file_hash):
                                should_upload = False
                                sync_results['skipped'].append(relative_path)
                                break
                        
                        if should_upload:
                            # 上傳文件
                            result = await self.upload_file(
                                local_file_path, 
                                remote_path,
                                provider,
                                metadata={'sync_source': local_directory}
                            )
                            
                            if result['success']:
                                sync_results['uploaded'].append(relative_path)
                                sync_results['total_size'] += os.path.getsize(local_file_path)
                            else:
                                sync_results['errors'].append({
                                    'file': relative_path,
                                    'error': result['error']
                                })
                        
                        sync_results['total_files'] += 1
                        
                    except Exception as e:
                        sync_results['errors'].append({
                            'file': relative_path,
                            'error': str(e)
                        })
            
            # 更新統計
            self.stats['sync_count'] += 1
            self.stats['last_sync'] = datetime.now().isoformat()
            
            logger.info(f"同步完成: {len(sync_results['uploaded'])} 上傳, "
                       f"{len(sync_results['skipped'])} 跳過, "
                       f"{len(sync_results['errors'])} 錯誤")
            
            return {
                'success': True,
                'sync_results': sync_results,
                'provider': provider.value
            }
            
        except Exception as e:
            self.stats['error_count'] += 1
            logger.error(f"同步失敗: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _should_exclude_file(self, file_path: str) -> bool:
        """檢查文件是否應該被排除"""
        file_ext = os.path.splitext(file_path)[1].lower()
        return file_ext in self.sync_config['excluded_extensions']
    
    async def list_files(self, provider: CloudProvider = None, 
                        prefix: str = "", limit: int = 1000) -> List[CloudFile]:
        """列出雲存儲中的文件"""
        try:
            if not provider:
                provider = self.default_provider
            
            if provider not in self.providers:
                raise ValueError(f"提供商 {provider} 不可用")
            
            if provider == CloudProvider.AWS_S3:
                return await self._list_s3_files(prefix, limit)
            elif provider == CloudProvider.GOOGLE_CLOUD:
                return await self._list_gcs_files(prefix, limit)
            elif provider == CloudProvider.AZURE_BLOB:
                return await self._list_azure_files(prefix, limit)
            else:
                raise ValueError(f"不支援的提供商: {provider}")
                
        except Exception as e:
            logger.error(f"列出文件失敗: {str(e)}")
            return []
    
    async def _list_s3_files(self, prefix: str, limit: int) -> List[CloudFile]:
        """列出 S3 文件"""
        try:
            provider_info = self.providers[CloudProvider.AWS_S3]
            s3_client = provider_info['client']
            bucket_name = provider_info['config']['bucket_name']
            
            response = s3_client.list_objects_v2(
                Bucket=bucket_name,
                Prefix=prefix,
                MaxKeys=limit
            )
            
            files = []
            for obj in response.get('Contents', []):
                # 獲取文件元數據
                head_response = s3_client.head_object(
                    Bucket=bucket_name,
                    Key=obj['Key']
                )
                
                cloud_file = CloudFile(
                    file_id=f"s3://{bucket_name}/{obj['Key']}",
                    filename=os.path.basename(obj['Key']),
                    file_path=obj['Key'],
                    file_size=obj['Size'],
                    file_hash=head_response.get('Metadata', {}).get('file_hash', ''),
                    content_type=head_response.get('ContentType', 'application/octet-stream'),
                    provider=CloudProvider.AWS_S3,
                    bucket_name=bucket_name,
                    created_at=obj['LastModified'],
                    updated_at=obj['LastModified'],
                    metadata=head_response.get('Metadata', {}),
                    tags=[],
                    is_public=False
                )
                files.append(cloud_file)
            
            return files
            
        except Exception as e:
            logger.error(f"列出 S3 文件失敗: {str(e)}")
            return []
    
    async def _list_gcs_files(self, prefix: str, limit: int) -> List[CloudFile]:
        """列出 GCS 文件"""
        try:
            provider_info = self.providers[CloudProvider.GOOGLE_CLOUD]
            bucket = provider_info['bucket']
            bucket_name = provider_info['config']['bucket_name']
            
            blobs = bucket.list_blobs(prefix=prefix, max_results=limit)
            
            files = []
            for blob in blobs:
                cloud_file = CloudFile(
                    file_id=f"gcs://{bucket_name}/{blob.name}",
                    filename=os.path.basename(blob.name),
                    file_path=blob.name,
                    file_size=blob.size or 0,
                    file_hash=blob.metadata.get('file_hash', '') if blob.metadata else '',
                    content_type=blob.content_type or 'application/octet-stream',
                    provider=CloudProvider.GOOGLE_CLOUD,
                    bucket_name=bucket_name,
                    created_at=blob.time_created,
                    updated_at=blob.updated,
                    metadata=blob.metadata or {},
                    tags=[],
                    is_public=False
                )
                files.append(cloud_file)
            
            return files
            
        except Exception as e:
            logger.error(f"列出 GCS 文件失敗: {str(e)}")
            return []
    
    async def _list_azure_files(self, prefix: str, limit: int) -> List[CloudFile]:
        """列出 Azure 文件"""
        try:
            provider_info = self.providers[CloudProvider.AZURE_BLOB]
            container_client = provider_info['container_client']
            container_name = provider_info['config']['container_name']
            
            blobs = container_client.list_blobs(name_starts_with=prefix)
            
            files = []
            count = 0
            for blob in blobs:
                if count >= limit:
                    break
                
                cloud_file = CloudFile(
                    file_id=f"azure://{container_name}/{blob.name}",
                    filename=os.path.basename(blob.name),
                    file_path=blob.name,
                    file_size=blob.size or 0,
                    file_hash=blob.metadata.get('file_hash', '') if blob.metadata else '',
                    content_type=blob.content_settings.content_type if blob.content_settings else 'application/octet-stream',
                    provider=CloudProvider.AZURE_BLOB,
                    bucket_name=container_name,
                    created_at=blob.creation_time,
                    updated_at=blob.last_modified,
                    metadata=blob.metadata or {},
                    tags=[],
                    is_public=False
                )
                files.append(cloud_file)
                count += 1
            
            return files
            
        except Exception as e:
            logger.error(f"列出 Azure 文件失敗: {str(e)}")
            return []
    
    async def delete_file(self, file_id: str, provider: CloudProvider = None) -> Dict[str, Any]:
        """刪除雲存儲中的文件"""
        try:
            if not provider:
                provider = self.default_provider
            
            if provider not in self.providers:
                raise ValueError(f"提供商 {provider} 不可用")
            
            # 從文件ID中提取路徑
            if file_id.startswith(f"{provider.value}://"):
                parts = file_id.split('/', 3)
                if len(parts) >= 4:
                    bucket_name = parts[2]
                    file_path = parts[3]
                else:
                    raise ValueError(f"無效的文件ID: {file_id}")
            else:
                raise ValueError(f"文件ID格式不正確: {file_id}")
            
            # 根據提供商刪除文件
            if provider == CloudProvider.AWS_S3:
                provider_info = self.providers[CloudProvider.AWS_S3]
                s3_client = provider_info['client']
                s3_client.delete_object(Bucket=bucket_name, Key=file_path)
                
            elif provider == CloudProvider.GOOGLE_CLOUD:
                provider_info = self.providers[CloudProvider.GOOGLE_CLOUD]
                bucket = provider_info['bucket']
                blob = bucket.blob(file_path)
                blob.delete()
                
            elif provider == CloudProvider.AZURE_BLOB:
                provider_info = self.providers[CloudProvider.AZURE_BLOB]
                container_client = provider_info['container_client']
                container_client.delete_blob(file_path)
            
            # 從緩存中移除
            if file_id in self.file_cache:
                del self.file_cache[file_id]
            
            logger.info(f"文件刪除成功: {file_id}")
            
            return {
                'success': True,
                'file_id': file_id,
                'provider': provider.value
            }
            
        except Exception as e:
            self.stats['error_count'] += 1
            logger.error(f"文件刪除失敗: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_file_info(self, file_id: str, provider: CloudProvider = None) -> Optional[CloudFile]:
        """獲取文件詳細信息"""
        try:
            # 先檢查緩存
            if file_id in self.file_cache:
                return self.file_cache[file_id]
            
            if not provider:
                provider = self.default_provider
            
            # 從雲存儲獲取信息
            files = await self.list_files(provider)
            for file in files:
                if file.file_id == file_id:
                    self.file_cache[file_id] = file
                    return file
            
            return None
            
        except Exception as e:
            logger.error(f"獲取文件信息失敗: {str(e)}")
            return None
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取雲存儲統計信息"""
        return {
            'stats': self.stats,
            'config': {
                'sync_enabled': self.sync_enabled,
                'default_provider': self.default_provider.value if self.default_provider else None,
                'available_providers': [p.value for p in self.providers.keys()],
                'sync_config': self.sync_config
            },
            'cache_info': {
                'cached_files': len(self.file_cache),
                'metadata_cache_size': len(self.metadata_cache)
            }
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """健康檢查"""
        try:
            health_status = {
                'overall_status': 'healthy',
                'providers': {},
                'timestamp': datetime.now().isoformat()
            }
            
            for provider, info in self.providers.items():
                try:
                    # 簡單的連接測試
                    if provider == CloudProvider.AWS_S3:
                        info['client'].list_objects_v2(
                            Bucket=info['config']['bucket_name'],
                            MaxKeys=1
                        )
                    elif provider == CloudProvider.GOOGLE_CLOUD:
                        list(info['bucket'].list_blobs(max_results=1))
                    elif provider == CloudProvider.AZURE_BLOB:
                        list(info['container_client'].list_blobs(results_per_page=1))
                    
                    health_status['providers'][provider.value] = 'healthy'
                    
                except Exception as e:
                    health_status['providers'][provider.value] = f'error: {str(e)}'
                    health_status['overall_status'] = 'degraded'
            
            return health_status
            
        except Exception as e:
            return {
                'overall_status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

# 全局服務實例
cloud_storage_service = CloudStorageService()

async def initialize_cloud_storage() -> bool:
    """初始化雲存儲服務"""
    return await cloud_storage_service.initialize()

def get_cloud_storage_service() -> CloudStorageService:
    """獲取雲存儲服務實例"""
    return cloud_storage_service 