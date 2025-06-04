#!/usr/bin/env python3
"""
監控系統測試腳本
快速驗證新增的性能監控功能
"""

import requests
import json
import time
from datetime import datetime

def test_monitoring_apis():
    """測試監控 API 端點"""
    base_url = "http://localhost:5000/api/monitoring"
    
    print("🔧 測試監控系統 API...")
    print("=" * 50)
    
    # 測試端點列表
    endpoints = [
        "/health-advanced",
        "/metrics", 
        "/resource-usage",
        "/performance-summary"
    ]
    
    for endpoint in endpoints:
        print(f"\n📡 測試端點: {endpoint}")
        try:
            response = requests.get(f"{base_url}{endpoint}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ 成功 - 狀態碼: {response.status_code}")
                if 'timestamp' in data:
                    print(f"⏰ 時間戳: {data['timestamp']}")
                if 'health' in data:
                    print(f"🏥 健康狀態: {data['health']['status']}")
                if 'summary' in data:
                    print(f"📊 性能評分: {data['summary'].get('performance_score', 'N/A')}")
            else:
                print(f"⚠️ 警告 - 狀態碼: {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            print(f"❌ 連接失敗 - 請確保服務器正在運行")
        except Exception as e:
            print(f"❌ 錯誤: {str(e)}")
    
    print("\n" + "=" * 50)
    print("✅ 監控系統測試完成")

def test_basic_health():
    """測試基本健康檢查"""
    print("\n🏥 測試基本健康檢查...")
    
    try:
        response = requests.get("http://localhost:5000/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 基本健康檢查成功")
            print(f"📊 狀態: {data.get('status', 'unknown')}")
            print(f"🕐 運行時間: {data.get('timestamp', 'unknown')}")
        else:
            print(f"⚠️ 健康檢查返回狀態碼: {response.status_code}")
            
    except Exception as e:
        print(f"❌ 基本健康檢查失敗: {str(e)}")

def show_usage_instructions():
    """顯示使用說明"""
    print("\n" + "🚀 如何使用新的監控功能".center(60))
    print("=" * 60)
    print("""
1. 啟動應用程序:
   python run.py
   
2. 測試基本健康檢查:
   curl http://localhost:5000/health
   
3. 測試進階監控:
   curl http://localhost:5000/api/monitoring/health-advanced
   
4. 查看性能指標:
   curl http://localhost:5000/api/monitoring/metrics
   
5. 查看資源使用:
   curl http://localhost:5000/api/monitoring/resource-usage
   
6. 獲取性能總結:
   curl http://localhost:5000/api/monitoring/performance-summary
   
7. 查看指定時間範圍的指標:
   curl "http://localhost:5000/api/monitoring/metrics?hours=1"
   
8. 查看特定指標:
   curl "http://localhost:5000/api/monitoring/metrics?metric=cpu_percent&hours=24"
    """)
    print("=" * 60)

if __name__ == "__main__":
    print("🎯 AI 批量圖片生成器 - 監控系統測試")
    print(f"⏰ 測試時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 顯示使用說明
    show_usage_instructions()
    
    # 詢問是否進行實際測試
    try:
        user_input = input("\n是否要進行 API 測試？(需要先啟動服務器) [y/N]: ")
        if user_input.lower() in ['y', 'yes']:
            test_basic_health()
            test_monitoring_apis()
        else:
            print("👍 跳過 API 測試 - 您可以手動啟動服務器後再運行測試")
    except KeyboardInterrupt:
        print("\n👋 測試已取消")
    except Exception as e:
        print(f"\n❌ 測試過程中發生錯誤: {str(e)}")
    
    print("\n🎉 測試腳本執行完畢！") 