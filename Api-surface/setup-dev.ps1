# API Attack Surface Mapper - Development Setup Script (Windows PowerShell)
# This script helps set up the development environment quickly on Windows

$ErrorActionPreference = "Stop"

Write-Host "🚀 Setting up API Attack Surface Mapper development environment..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    $nodeMajorVersion = [int]($nodeVersion -replace "v", "" -split "\.")[0]
    
    if ($nodeMajorVersion -lt 18) {
        Write-Host "❌ Node.js version 18+ is required. Current version: $nodeVersion" -ForegroundColor Red
        Write-Host "   Visit: https://nodejs.org/" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "✅ Node.js $nodeVersion detected" -ForegroundColor Green
}
catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    Write-Host "   Visit: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if MongoDB is available
try {
    $mongoVersion = mongod --version 2>$null
    Write-Host "✅ MongoDB detected" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  MongoDB not found. Please install MongoDB or use MongoDB Atlas." -ForegroundColor Yellow
    Write-Host "   Local install: https://docs.mongodb.com/manual/installation/" -ForegroundColor Yellow
    Write-Host "   MongoDB Atlas: https://www.mongodb.com/atlas" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Continuing setup (you can configure remote MongoDB later)..." -ForegroundColor Yellow
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
npm run install-all

# Create environment files if they don't exist
Write-Host "⚙️  Setting up environment configuration..." -ForegroundColor Cyan

# Backend .env
if (-not (Test-Path "backend/.env")) {
    Write-Host "📝 Creating backend/.env file..." -ForegroundColor Cyan
    
    $jwtSecret = "your-super-secret-jwt-key-change-this-in-production-$(Get-Date -UFormat %s)"
    
    $backendEnvContent = @"
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/api-mapper

# Authentication
JWT_SECRET=$jwtSecret

# Hugging Face Integration (required for AI features)
HUGGINGFACE_API_KEY=your-huggingface-api-key-here
HUGGINGFACE_MODEL=meta-llama/Llama-2-7b-chat-hf

# Shodan Integration (optional but recommended)
SHODAN_API_KEY=your-shodan-api-key-here

# Server Configuration
PORT=5000
NODE_ENV=development

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-app-password

# Slack Integration (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
"@
    
    $backendEnvContent | Out-File -FilePath "backend/.env" -Encoding UTF8
    Write-Host "✅ Created backend/.env" -ForegroundColor Green
}
else {
    Write-Host "✅ backend/.env already exists" -ForegroundColor Green
}

# Frontend .env
if (-not (Test-Path "frontend/.env")) {
    Write-Host "📝 Creating frontend/.env file..." -ForegroundColor Cyan
    
    $frontendEnvContent = @"
# API Configuration
VITE_API_URL=http://localhost:5000/api

# App Configuration
VITE_APP_NAME=API Attack Surface Mapper
VITE_APP_VERSION=1.0.0
"@
    
    $frontendEnvContent | Out-File -FilePath "frontend/.env" -Encoding UTF8
    Write-Host "✅ Created frontend/.env" -ForegroundColor Green
}
else {
    Write-Host "✅ frontend/.env already exists" -ForegroundColor Green
}

# Check for Python and security tools
Write-Host "🔍 Checking security tools..." -ForegroundColor Cyan

try {
    $pythonVersion = python --version 2>$null
    if (-not $pythonVersion) {
        $pythonVersion = python3 --version 2>$null
    }
    
    if ($pythonVersion) {
        Write-Host "✅ Python detected: $pythonVersion" -ForegroundColor Green
        
        # Check for Sublist3r
        try {
            python -c "import sublist3r" 2>$null
            Write-Host "✅ Sublist3r is installed" -ForegroundColor Green
        }
        catch {
            try {
                python3 -c "import sublist3r" 2>$null
                Write-Host "✅ Sublist3r is installed" -ForegroundColor Green
            }
            catch {
                Write-Host "⚠️  Sublist3r not found. Install with: pip install sublist3r" -ForegroundColor Yellow
            }
        }
    }
    else {
        Write-Host "⚠️  Python not found. Install Python 3.8+ for security tools." -ForegroundColor Yellow
        Write-Host "   Visit: https://python.org/downloads/" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "⚠️  Python not found. Install Python 3.8+ for security tools." -ForegroundColor Yellow
    Write-Host "   Visit: https://python.org/downloads/" -ForegroundColor Yellow
}

# Check for Amass
try {
    $amassVersion = amass --version 2>$null
    Write-Host "✅ Amass detected" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Amass not found. Install from:" -ForegroundColor Yellow
    Write-Host "   https://github.com/owasp-amass/amass/releases" -ForegroundColor Yellow
    Write-Host "   Or use: go install -v github.com/owasp-amass/amass/v4/...@master" -ForegroundColor Yellow
}

# Display setup completion and next steps
Write-Host ""
Write-Host "🎉 Setup complete! Here's what to do next:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Configure your API keys in backend/.env:" -ForegroundColor White
Write-Host "   - Hugging Face API Key (required for AI features)" -ForegroundColor Yellow
Write-Host "   - Shodan API Key (recommended for exposure checks)" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Start MongoDB (if running locally):" -ForegroundColor White
Write-Host "   net start MongoDB" -ForegroundColor Gray
Write-Host "   or" -ForegroundColor Gray
Write-Host "   mongod" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start the development servers:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Access the application:" -ForegroundColor White
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "   Backend API: http://localhost:5000/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Optional: Install security tools for full functionality" -ForegroundColor White
Write-Host "   - OWASP ZAP: https://owasp.org/www-project-zap/" -ForegroundColor Yellow
Write-Host "   - Sublist3r: pip install sublist3r" -ForegroundColor Yellow
Write-Host "   - Amass: Download from GitHub releases" -ForegroundColor Yellow
Write-Host ""
Write-Host "📚 Check README.md for detailed documentation" -ForegroundColor Cyan
Write-Host ""
Write-Host "Happy coding! 🔒✨" -ForegroundColor Green
