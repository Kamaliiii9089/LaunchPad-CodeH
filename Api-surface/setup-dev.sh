#!/bin/bash

# API Attack Surface Mapper - Development Setup Script
# This script helps set up the development environment quickly

set -e

echo "🚀 Setting up API Attack Surface Mapper development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check if MongoDB is running
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB not found. Please install MongoDB or use MongoDB Atlas."
    echo "   Local install: https://docs.mongodb.com/manual/installation/"
    echo "   MongoDB Atlas: https://www.mongodb.com/atlas"
    echo ""
    echo "   Continuing setup (you can configure remote MongoDB later)..."
else
    echo "✅ MongoDB detected"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm run install-all

# Create environment files if they don't exist
echo "⚙️  Setting up environment configuration..."

# Backend .env
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend/.env file..."
    cat > backend/.env << EOL
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/api-mapper

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-$(date +%s)

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
EOL
    echo "✅ Created backend/.env"
else
    echo "✅ backend/.env already exists"
fi

# Frontend .env
if [ ! -f "frontend/.env" ]; then
    echo "📝 Creating frontend/.env file..."
    cat > frontend/.env << EOL
# API Configuration
VITE_API_URL=http://localhost:5000/api

# App Configuration
VITE_APP_NAME=API Attack Surface Mapper
VITE_APP_VERSION=1.0.0
EOL
    echo "✅ Created frontend/.env"
else
    echo "✅ frontend/.env already exists"
fi

# Check for Python and security tools
echo "🔍 Checking security tools..."

if command -v python3 &> /dev/null; then
    echo "✅ Python3 detected"
    
    # Check for Sublist3r
    if python3 -c "import sublist3r" 2>/dev/null; then
        echo "✅ Sublist3r is installed"
    else
        echo "⚠️  Sublist3r not found. Install with: pip install sublist3r"
    fi
else
    echo "⚠️  Python3 not found. Install Python 3.8+ for security tools."
fi

# Check for Amass
if command -v amass &> /dev/null; then
    echo "✅ Amass detected"
else
    echo "⚠️  Amass not found. Install with:"
    echo "   Ubuntu/Debian: sudo apt install amass"
    echo "   macOS: brew install amass"
    echo "   Or visit: https://github.com/owasp-amass/amass"
fi

# Display setup completion and next steps
echo ""
echo "🎉 Setup complete! Here's what to do next:"
echo ""
echo "1. Configure your API keys in backend/.env:"
echo "   - Hugging Face API Key (required for AI features)"
echo "   - Shodan API Key (recommended for exposure checks)"
echo ""
echo "2. Start MongoDB (if running locally):"
echo "   mongod"
echo ""
echo "3. Start the development servers:"
echo "   npm run dev"
echo ""
echo "4. Access the application:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:5000/api"
echo ""
echo "5. Optional: Install security tools for full functionality"
echo "   - OWASP ZAP: https://owasp.org/www-project-zap/"
echo "   - Sublist3r: pip install sublist3r"
echo "   - Amass: brew install amass (macOS) or apt install amass (Ubuntu)"
echo ""
echo "📚 Check README.md for detailed documentation"
echo ""
echo "Happy coding! 🔒✨"
