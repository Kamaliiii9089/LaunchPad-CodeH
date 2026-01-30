#!/bin/bash

# BreachBuddy Setup and Run Script
# Run this to set up the project and start the development server

echo "=================================="
echo "BreachBuddy Setup Script"
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Check .env.local
if [ ! -f .env.local ]; then
    echo ""
    echo "⚠️  .env.local not found!"
    echo "Creating template .env.local file..."
    cat > .env.local << EOF
# MongoDB Connection
# Get this from MongoDB Atlas: https://www.mongodb.com/cloud/atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/breachbuddy?retryWrites=true&w=majority

# Application URLs
NEXTAUTH_URL=http://localhost:3000

# Authentication Secrets (change these in production!)
NEXTAUTH_SECRET=your-secret-key-change-this-in-production
JWT_SECRET=your-jwt-secret-key-change-this-in-production
EOF
    echo "✅ Created .env.local with template values"
    echo "⚠️  Please update .env.local with your MongoDB connection string!"
    echo ""
fi

# Start development server
echo ""
echo "🚀 Starting development server..."
echo "📍 Application will be available at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
