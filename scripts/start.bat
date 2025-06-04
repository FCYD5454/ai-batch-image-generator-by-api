@echo off
echo Starting Batch Image Generator...

echo Checking Python...
python --version
if %errorlevel% neq 0 (
    echo Python not found! Please install Python 3.8 or higher
    pause
    exit /b 1
)

echo Creating virtual environment...
if not exist venv (
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt

echo Creating images directory...
if not exist generated_images (
    mkdir generated_images
)

echo Starting application...
echo Please visit: http://localhost:5000
echo All API configurations can be done in the web interface
echo ----------------------------------------

python app.py

pause 