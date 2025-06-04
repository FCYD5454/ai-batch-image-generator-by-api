"""
團隊協作服務 v2.9
提供完整的團隊管理和協作功能，支援多用戶協同工作
"""

import asyncio
import json
import logging
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from enum import Enum
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
import os

logger = logging.getLogger(__name__)

class TeamRole(Enum):
    """團隊角色定義"""
    OWNER = "owner"           # 團隊所有者
    ADMIN = "admin"           # 管理員
    EDITOR = "editor"         # 編輯者
    VIEWER = "viewer"         # 觀看者
    GUEST = "guest"           # 訪客

class InvitationStatus(Enum):
    """邀請狀態"""
    PENDING = "pending"       # 待處理
    ACCEPTED = "accepted"     # 已接受
    DECLINED = "declined"     # 已拒絕
    EXPIRED = "expired"       # 已過期
    REVOKED = "revoked"       # 已撤銷

class WorkspaceType(Enum):
    """工作空間類型"""
    PROJECT = "project"       # 項目空間
    SHARED = "shared"         # 共享空間
    TEMPLATE = "template"     # 模板空間
    ARCHIVE = "archive"       # 歸檔空間

@dataclass
class TeamMember:
    """團隊成員信息"""
    user_id: int
    username: str
    email: str
    role: TeamRole
    joined_at: datetime
    last_active: Optional[datetime] = None
    permissions: List[str] = None
    is_active: bool = True

@dataclass
class TeamInvitation:
    """團隊邀請信息"""
    invitation_id: str
    team_id: int
    inviter_id: int
    invitee_email: str
    role: TeamRole
    status: InvitationStatus
    created_at: datetime
    expires_at: datetime
    accepted_at: Optional[datetime] = None
    message: str = ""

@dataclass
class SharedWorkspace:
    """共享工作空間"""
    workspace_id: str
    team_id: int
    name: str
    description: str
    workspace_type: WorkspaceType
    created_by: int
    created_at: datetime
    updated_at: datetime
    settings: Dict[str, Any]
    members: List[int]
    is_active: bool = True

class TeamCollaborationService:
    """團隊協作服務管理器"""
    
    def __init__(self, db_service=None):
        self.db_service = db_service
        
        # 權限配置
        self.role_permissions = {
            TeamRole.OWNER: [
                'team.manage', 'team.delete', 'members.invite', 'members.remove',
                'members.role_change', 'workspace.create', 'workspace.delete',
                'workspace.edit', 'workspace.share', 'projects.create',
                'projects.edit', 'projects.delete', 'projects.share',
                'settings.manage', 'billing.manage'
            ],
            TeamRole.ADMIN: [
                'members.invite', 'members.remove', 'workspace.create',
                'workspace.edit', 'workspace.share', 'projects.create',
                'projects.edit', 'projects.delete', 'projects.share',
                'settings.view'
            ],
            TeamRole.EDITOR: [
                'workspace.edit', 'workspace.view', 'projects.create',
                'projects.edit', 'projects.view', 'projects.share'
            ],
            TeamRole.VIEWER: [
                'workspace.view', 'projects.view'
            ],
            TeamRole.GUEST: [
                'workspace.view', 'projects.view'
            ]
        }
        
        # 郵件配置
        self.email_config = {
            'smtp_server': os.getenv('SMTP_SERVER', 'smtp.gmail.com'),
            'smtp_port': int(os.getenv('SMTP_PORT', 587)),
            'smtp_username': os.getenv('SMTP_USERNAME'),
            'smtp_password': os.getenv('SMTP_PASSWORD'),
            'from_email': os.getenv('FROM_EMAIL', 'noreply@imagegeneration.com')
        }
        
        # 統計信息
        self.stats = {
            'total_teams': 0,
            'total_members': 0,
            'total_invitations': 0,
            'total_workspaces': 0,
            'active_collaborations': 0,
            'last_activity': None
        }
        
        logger.info("團隊協作服務初始化完成")
    
    async def create_team(self, 
                         owner_id: int, 
                         team_name: str,
                         description: str = "",
                         settings: Dict[str, Any] = None) -> Dict[str, Any]:
        """創建新團隊"""
        try:
            if not team_name.strip():
                raise ValueError("團隊名稱不能為空")
            
            # 檢查團隊名稱是否重複
            existing_team = self.db_service.get_team_by_name(team_name)
            if existing_team:
                raise ValueError("團隊名稱已存在")
            
            # 默認設定
            default_settings = {
                'max_members': 50,
                'allow_public_join': False,
                'require_approval': True,
                'auto_backup': True,
                'collaboration_features': {
                    'real_time_editing': True,
                    'comments': True,
                    'version_control': True,
                    'notifications': True
                }
            }
            
            if settings:
                default_settings.update(settings)
            
            # 創建團隊
            team_data = {
                'name': team_name,
                'description': description,
                'owner_id': owner_id,
                'settings': json.dumps(default_settings),
                'created_at': datetime.now().isoformat(),
                'is_active': True
            }
            
            team_id = self.db_service.create_team(team_data)
            
            # 添加所有者為團隊成員
            await self.add_team_member(
                team_id=team_id,
                user_id=owner_id,
                role=TeamRole.OWNER,
                added_by=owner_id
            )
            
            # 創建默認工作空間
            default_workspace = await self.create_workspace(
                team_id=team_id,
                creator_id=owner_id,
                name="主要工作空間",
                description="團隊的主要協作空間",
                workspace_type=WorkspaceType.PROJECT
            )
            
            # 更新統計
            self.stats['total_teams'] += 1
            self.stats['last_activity'] = datetime.now().isoformat()
            
            logger.info(f"團隊創建成功: {team_name} (ID: {team_id})")
            
            return {
                'success': True,
                'team_id': team_id,
                'team_name': team_name,
                'default_workspace': default_workspace,
                'owner_id': owner_id
            }
            
        except Exception as e:
            logger.error(f"創建團隊失敗: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def invite_member(self,
                          team_id: int,
                          inviter_id: int,
                          invitee_email: str,
                          role: TeamRole = TeamRole.EDITOR,
                          message: str = "") -> Dict[str, Any]:
        """邀請成員加入團隊"""
        try:
            # 檢查邀請者權限
            if not await self.check_permission(team_id, inviter_id, 'members.invite'):
                raise ValueError("沒有邀請成員的權限")
            
            # 檢查團隊是否存在
            team = self.db_service.get_team_by_id(team_id)
            if not team:
                raise ValueError("團隊不存在")
            
            # 檢查是否已經是團隊成員
            existing_member = self.db_service.get_team_member(team_id, invitee_email=invitee_email)
            if existing_member:
                raise ValueError("用戶已經是團隊成員")
            
            # 檢查是否有待處理的邀請
            existing_invitation = self.db_service.get_pending_invitation(team_id, invitee_email)
            if existing_invitation:
                raise ValueError("已有待處理的邀請")
            
            # 生成邀請ID和令牌
            invitation_id = secrets.token_urlsafe(32)
            
            # 創建邀請記錄
            invitation_data = {
                'invitation_id': invitation_id,
                'team_id': team_id,
                'inviter_id': inviter_id,
                'invitee_email': invitee_email,
                'role': role.value,
                'status': InvitationStatus.PENDING.value,
                'message': message,
                'created_at': datetime.now().isoformat(),
                'expires_at': (datetime.now() + timedelta(days=7)).isoformat()
            }
            
            self.db_service.create_team_invitation(invitation_data)
            
            # 發送邀請郵件
            email_sent = await self.send_invitation_email(
                team_name=team['name'],
                inviter_name=self.db_service.get_user_by_id(inviter_id)['username'],
                invitee_email=invitee_email,
                invitation_id=invitation_id,
                role=role,
                message=message
            )
            
            # 更新統計
            self.stats['total_invitations'] += 1
            self.stats['last_activity'] = datetime.now().isoformat()
            
            logger.info(f"邀請發送成功: {invitee_email} 加入團隊 {team['name']}")
            
            return {
                'success': True,
                'invitation_id': invitation_id,
                'invitee_email': invitee_email,
                'role': role.value,
                'email_sent': email_sent
            }
            
        except Exception as e:
            logger.error(f"邀請成員失敗: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def accept_invitation(self, 
                              invitation_id: str, 
                              user_id: int) -> Dict[str, Any]:
        """接受團隊邀請"""
        try:
            # 獲取邀請信息
            invitation = self.db_service.get_invitation_by_id(invitation_id)
            if not invitation:
                raise ValueError("邀請不存在")
            
            if invitation['status'] != InvitationStatus.PENDING.value:
                raise ValueError("邀請已被處理或已過期")
            
            # 檢查邀請是否過期
            expires_at = datetime.fromisoformat(invitation['expires_at'])
            if datetime.now() > expires_at:
                # 更新狀態為過期
                self.db_service.update_invitation_status(invitation_id, InvitationStatus.EXPIRED.value)
                raise ValueError("邀請已過期")
            
            # 驗證用戶郵箱
            user = self.db_service.get_user_by_id(user_id)
            if not user or user['email'] != invitation['invitee_email']:
                raise ValueError("用戶郵箱與邀請不匹配")
            
            # 添加為團隊成員
            member_result = await self.add_team_member(
                team_id=invitation['team_id'],
                user_id=user_id,
                role=TeamRole(invitation['role']),
                added_by=invitation['inviter_id']
            )
            
            if member_result['success']:
                # 更新邀請狀態
                self.db_service.update_invitation_status(
                    invitation_id, 
                    InvitationStatus.ACCEPTED.value,
                    accepted_at=datetime.now().isoformat()
                )
                
                # 獲取團隊信息
                team = self.db_service.get_team_by_id(invitation['team_id'])
                
                logger.info(f"用戶 {user['username']} 接受團隊邀請: {team['name']}")
                
                return {
                    'success': True,
                    'team_id': invitation['team_id'],
                    'team_name': team['name'],
                    'role': invitation['role'],
                    'user_id': user_id
                }
            else:
                raise ValueError(member_result['error'])
            
        except Exception as e:
            logger.error(f"接受邀請失敗: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def add_team_member(self,
                            team_id: int,
                            user_id: int,
                            role: TeamRole,
                            added_by: int) -> Dict[str, Any]:
        """添加團隊成員"""
        try:
            # 檢查用戶是否存在
            user = self.db_service.get_user_by_id(user_id)
            if not user:
                raise ValueError("用戶不存在")
            
            # 檢查是否已經是成員
            existing_member = self.db_service.get_team_member(team_id, user_id=user_id)
            if existing_member:
                raise ValueError("用戶已經是團隊成員")
            
            # 獲取角色權限
            permissions = self.role_permissions.get(role, [])
            
            # 創建成員記錄
            member_data = {
                'team_id': team_id,
                'user_id': user_id,
                'role': role.value,
                'permissions': json.dumps(permissions),
                'joined_at': datetime.now().isoformat(),
                'added_by': added_by,
                'is_active': True
            }
            
            self.db_service.add_team_member(member_data)
            
            # 更新統計
            self.stats['total_members'] += 1
            self.stats['last_activity'] = datetime.now().isoformat()
            
            logger.info(f"團隊成員添加成功: {user['username']} 加入團隊 {team_id}")
            
            return {
                'success': True,
                'user_id': user_id,
                'username': user['username'],
                'role': role.value,
                'permissions': permissions
            }
            
        except Exception as e:
            logger.error(f"添加團隊成員失敗: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def create_workspace(self,
                             team_id: int,
                             creator_id: int,
                             name: str,
                             description: str = "",
                             workspace_type: WorkspaceType = WorkspaceType.PROJECT,
                             settings: Dict[str, Any] = None) -> Dict[str, Any]:
        """創建共享工作空間"""
        try:
            # 檢查權限
            if not await self.check_permission(team_id, creator_id, 'workspace.create'):
                raise ValueError("沒有創建工作空間的權限")
            
            if not name.strip():
                raise ValueError("工作空間名稱不能為空")
            
            # 生成工作空間ID
            workspace_id = secrets.token_urlsafe(16)
            
            # 默認設定
            default_settings = {
                'allow_comments': True,
                'enable_real_time': True,
                'version_control': True,
                'auto_save': True,
                'backup_frequency': 'daily',
                'access_control': 'team_members',
                'notification_settings': {
                    'new_comments': True,
                    'file_changes': True,
                    'member_joins': True
                }
            }
            
            if settings:
                default_settings.update(settings)
            
            # 創建工作空間
            workspace_data = {
                'workspace_id': workspace_id,
                'team_id': team_id,
                'name': name,
                'description': description,
                'type': workspace_type.value,
                'created_by': creator_id,
                'settings': json.dumps(default_settings),
                'created_at': datetime.now().isoformat(),
                'is_active': True
            }
            
            self.db_service.create_workspace(workspace_data)
            
            # 添加創建者為工作空間成員
            self.db_service.add_workspace_member(workspace_id, creator_id, 'owner')
            
            # 更新統計
            self.stats['total_workspaces'] += 1
            self.stats['last_activity'] = datetime.now().isoformat()
            
            logger.info(f"工作空間創建成功: {name} (ID: {workspace_id})")
            
            return {
                'success': True,
                'workspace_id': workspace_id,
                'name': name,
                'type': workspace_type.value,
                'creator_id': creator_id,
                'settings': default_settings
            }
            
        except Exception as e:
            logger.error(f"創建工作空間失敗: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def check_permission(self, 
                             team_id: int, 
                             user_id: int, 
                             permission: str) -> bool:
        """檢查用戶權限"""
        try:
            # 獲取用戶在團隊中的角色
            member = self.db_service.get_team_member(team_id, user_id=user_id)
            if not member or not member['is_active']:
                return False
            
            # 獲取角色權限
            role = TeamRole(member['role'])
            role_permissions = self.role_permissions.get(role, [])
            
            # 檢查權限
            return permission in role_permissions
            
        except Exception as e:
            logger.error(f"權限檢查失敗: {str(e)}")
            return False
    
    async def send_invitation_email(self,
                                  team_name: str,
                                  inviter_name: str,
                                  invitee_email: str,
                                  invitation_id: str,
                                  role: TeamRole,
                                  message: str = "") -> bool:
        """發送邀請郵件"""
        try:
            if not self.email_config['smtp_username'] or not self.email_config['smtp_password']:
                logger.warning("郵件配置不完整，跳過發送郵件")
                return False
            
            # 構建邀請鏈接
            invitation_url = f"http://localhost:5000/team/join?invitation={invitation_id}"
            
            # 構建郵件內容
            subject = f"邀請您加入團隊 '{team_name}'"
            
            html_content = f"""
            <html>
            <body>
                <h2>團隊邀請</h2>
                <p>您好！</p>
                <p>{inviter_name} 邀請您以 <strong>{role.value}</strong> 的身份加入團隊 <strong>'{team_name}'</strong>。</p>
                
                {f'<p><strong>邀請留言:</strong> {message}</p>' if message else ''}
                
                <p>請點擊下面的鏈接接受邀請：</p>
                <p><a href="{invitation_url}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">接受邀請</a></p>
                
                <p>或複製以下鏈接到瀏覽器：</p>
                <p>{invitation_url}</p>
                
                <p><em>此邀請將在7天後過期。</em></p>
                
                <hr>
                <p><small>這是一封自動生成的郵件，請勿回復。</small></p>
            </body>
            </html>
            """
            
            # 創建郵件
            msg = MimeMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.email_config['from_email']
            msg['To'] = invitee_email
            
            html_part = MimeText(html_content, 'html')
            msg.attach(html_part)
            
            # 發送郵件
            with smtplib.SMTP(self.email_config['smtp_server'], self.email_config['smtp_port']) as server:
                server.starttls()
                server.login(self.email_config['smtp_username'], self.email_config['smtp_password'])
                server.send_message(msg)
            
            logger.info(f"邀請郵件發送成功: {invitee_email}")
            return True
            
        except Exception as e:
            logger.error(f"發送邀請郵件失敗: {str(e)}")
            return False
    
    def get_team_members(self, team_id: int) -> List[TeamMember]:
        """獲取團隊成員列表"""
        try:
            members_data = self.db_service.get_team_members(team_id)
            
            members = []
            for member_data in members_data:
                user = self.db_service.get_user_by_id(member_data['user_id'])
                if user:
                    member = TeamMember(
                        user_id=member_data['user_id'],
                        username=user['username'],
                        email=user['email'],
                        role=TeamRole(member_data['role']),
                        joined_at=datetime.fromisoformat(member_data['joined_at']),
                        last_active=datetime.fromisoformat(member_data['last_active']) if member_data.get('last_active') else None,
                        permissions=json.loads(member_data.get('permissions', '[]')),
                        is_active=member_data['is_active']
                    )
                    members.append(member)
            
            return members
            
        except Exception as e:
            logger.error(f"獲取團隊成員失敗: {str(e)}")
            return []
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取團隊協作統計信息"""
        try:
            # 從數據庫獲取最新統計
            self.stats.update({
                'total_teams': self.db_service.count_teams(),
                'total_members': self.db_service.count_team_members(),
                'total_invitations': self.db_service.count_team_invitations(),
                'total_workspaces': self.db_service.count_workspaces(),
                'active_collaborations': self.db_service.count_active_collaborations()
            })
            
            return {
                'stats': self.stats,
                'role_permissions': {role.value: perms for role, perms in self.role_permissions.items()},
                'team_features': {
                    'max_members_per_team': 50,
                    'supported_roles': [role.value for role in TeamRole],
                    'workspace_types': [wt.value for wt in WorkspaceType],
                    'collaboration_features': [
                        'real_time_editing', 'comments', 'version_control',
                        'notifications', 'file_sharing', 'project_templates'
                    ]
                }
            }
            
        except Exception as e:
            logger.error(f"獲取統計信息失敗: {str(e)}")
            return {'stats': self.stats, 'error': str(e)}

# 全局服務實例
team_collaboration_service = TeamCollaborationService()

def get_team_collaboration_service() -> TeamCollaborationService:
    """獲取團隊協作服務實例"""
    return team_collaboration_service 