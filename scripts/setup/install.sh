#!/bin/bash
set -e

echo "====================================="
echo "Microservices Platform Setup"
echo "====================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node --version) detected"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

echo "✅ Docker detected"
echo ""

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

echo "✅ docker-compose detected"
echo ""

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install
echo ""

# Install shared library dependencies
echo "📦 Installing shared library dependencies..."
cd shared/logger && npm install && cd ../..
cd shared/errors && npm install && cd ../..
cd shared/middleware && npm install && cd ../..
cd shared/utils && npm install && cd ../..
echo ""

# Copy .env.example to .env if .env doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual configuration values"
    echo ""
fi

echo "====================================="
echo "✅ Setup Complete!"
echo "====================================="
echo ""
echo "Next steps:"
echo "1. Update .env file with your configuration"
echo "2. Run 'npm run dev' to start development environment"
echo "3. Or start building services in services/platform/"
echo ""
