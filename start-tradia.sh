#!/bin/bash

# Tradia Startup Script
# This script helps you get Tradia running with proper MT5 integration

set -e

echo "🚀 Starting Tradia with MT5 Integration..."
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "tradia-backend" ]; then
    print_error "Please run this script from the Tradia project root directory"
    exit 1
fi

# Check Node.js
print_status "Checking Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi
print_success "Node.js $(node --version) found"

# Check npm or pnpm
if command -v pnpm &> /dev/null; then
    PACKAGE_MANAGER="pnpm"
    print_success "Using pnpm package manager"
elif command -v npm &> /dev/null; then
    PACKAGE_MANAGER="npm"
    print_success "Using npm package manager"
else
    print_error "Neither pnpm nor npm found. Please install a package manager."
    exit 1
fi

# Check Python
print_status "Checking Python..."
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3.8+"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1-2)
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 8 ]); then
    print_error "Python 3.8+ is required. Current version: $PYTHON_VERSION"
    exit 1
fi
print_success "Python $PYTHON_VERSION found"

# Check if MetaTrader5 is installed
print_status "Checking MetaTrader5 Python package..."
if ! python3 -c "import MetaTrader5" &> /dev/null; then
    print_warning "MetaTrader5 Python package not found"
    echo ""
    echo "To install MetaTrader5:"
    echo "1. Download from: https://www.mql5.com/en/docs/integration/python_metatrader5"
    echo "2. Install with: pip install MetaTrader5"
    echo "3. Or run: python3 -m pip install MetaTrader5"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    print_success "MetaTrader5 Python package found"
fi

# Check if MT5 terminal is running
print_status "Checking MT5 terminal..."
if pgrep -f "terminal64.exe" > /dev/null || pgrep -f "terminal.exe" > /dev/null; then
    print_success "MT5 terminal appears to be running"
else
    print_warning "MT5 terminal not detected"
    echo ""
    echo "Please ensure:"
    echo "1. MetaTrader 5 terminal is installed"
    echo "2. MT5 terminal is running"
    echo "3. You're logged into your trading account"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install frontend dependencies
print_status "Installing frontend dependencies..."
if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
    pnpm install
else
    npm install
fi
print_success "Frontend dependencies installed"

# Install backend dependencies
print_status "Installing backend dependencies..."
cd tradia-backend
if [ -f "requirements.txt" ]; then
    pip3 install -r requirements.txt
    print_success "Backend dependencies installed"
else
    print_warning "requirements.txt not found, skipping backend dependencies"
fi
cd ..

# Check environment variables
print_status "Checking environment variables..."
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    print_warning "No .env file found. Creating template..."
    cat > .env << EOF
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/tradia"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# MT5 Backend
NEXT_PUBLIC_MT5_BACKEND_URL="http://127.0.0.1:5000"

# Supabase (if using)
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""
EOF
    print_warning "Please edit .env file with your actual configuration"
else
    print_success ".env file found"
fi

# Start backend server
print_status "Starting MT5 backend server..."
cd tradia-backend
python3 app.py &
BACKEND_PID=$!
cd ..

print_success "MT5 backend started (PID: $BACKEND_PID)"

# Wait a moment for backend to start
sleep 3

# Test backend health
print_status "Testing backend health..."
if curl -s http://127.0.0.1:5000/health > /dev/null; then
    print_success "Backend health check passed"
else
    print_warning "Backend health check failed - it may still be starting"
fi

# Start frontend server
print_status "Starting frontend server..."
if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
    pnpm run dev &
else
    npm run dev &
fi
FRONTEND_PID=$!

print_success "Frontend started (PID: $FRONTEND_PID)"

# Wait for services to start
sleep 5

echo ""
echo "🎉 Tradia is starting up!"
echo ""
echo "📊 Services:"
echo "   • Frontend: http://localhost:3000"
echo "   • Backend:  http://127.0.0.1:5000"
echo ""
echo "🔧 Next steps:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Sign up or log in to your account"
echo "   3. Go to Dashboard → MT5 Integration"
echo "   4. Click 'Requirements' to verify setup"
echo "   5. Add your MT5 account and sync trades"
echo ""
echo "📚 Help:"
echo "   • Setup Guide: MT5_SETUP_GUIDE.md"
echo "   • Troubleshooting: Check the Requirements guide in the app"
echo ""
echo "⚠️  To stop services:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
print_success "Tradia startup complete! Happy trading! 📈"