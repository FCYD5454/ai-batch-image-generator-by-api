# 使用 Python 3.11 作為基礎鏡像
FROM python:3.11-slim

# 設置工作目錄
WORKDIR /app

# 設置環境變量
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=main.py
ENV FLASK_ENV=production

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 複製 requirements.txt 並安裝 Python 依賴
COPY config/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製應用程序代碼
COPY . .

# 創建必要的目錄
RUN mkdir -p assets/images

# 暴露端口
EXPOSE 5000

# 設置啟動命令
CMD ["python", "main.py"] 