# Batch Image Generator Startup Script

Write-Host "Starting Batch Image Generator..." -ForegroundColor Cyan

# Check Python installation
Write-Host "Checking Python environment..." -ForegroundColor Yellow
python --version

# Create virtual environment if not exists
if (!(Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

# Check API keys
if (!$env:GEMINI_API_KEY) {
    Write-Host "Note: You can configure all API keys in the web interface" -ForegroundColor Yellow
}

# Create images directory
if (!(Test-Path "generated_images")) {
    New-Item -ItemType Directory -Name "generated_images"
    Write-Host "Created generated_images directory" -ForegroundColor Green
}

# Start application
Write-Host "Starting application..." -ForegroundColor Green
Write-Host "Please visit: http://localhost:5000" -ForegroundColor Cyan
Write-Host "All API configurations can be done in the web interface" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Cyan

python app.py 