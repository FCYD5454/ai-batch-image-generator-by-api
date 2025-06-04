#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI 批量圖片生成器 - 主啟動腳本
優化後的項目結構啟動器
"""

import os
import sys
import subprocess

def main():
    """主啟動函數"""
    print("🚀 啟動 AI 批量圖片生成器...")
    print("📁 使用優化的項目結構")
    
    # 獲取項目根目錄
    project_root = os.path.dirname(os.path.abspath(__file__))
    backend_path = os.path.join(project_root, 'backend')
    
    # 檢查 backend 目錄是否存在
    if not os.path.exists(backend_path):
        print("❌ 錯誤：backend 目錄不存在")
        return 1
    
    # 檢查 main.py 是否存在
    main_py_path = os.path.join(backend_path, 'main.py')
    if not os.path.exists(main_py_path):
        print("❌ 錯誤：backend/main.py 不存在")
        return 1
    
    print(f"📂 項目根目錄: {project_root}")
    print(f"🔧 後端目錄: {backend_path}")
    print("🌐 服務將自動選擇可用端口 (5000, 5001, 5002...)")
    
    try:
        # 切換到 backend 目錄並運行 main.py
        os.chdir(backend_path)
        subprocess.run([sys.executable, 'main.py'], check=True)
    except KeyboardInterrupt:
        print("\n👋 應用程序已停止")
        return 0
    except subprocess.CalledProcessError as e:
        print(f"❌ 啟動失敗: {e}")
        return 1
    except Exception as e:
        print(f"❌ 未知錯誤: {e}")
        return 1

if __name__ == '__main__':
    sys.exit(main()) 