#!/bin/bash

# BoundaryBox Deployment Script for Vercel
# This script helps prepare and deploy your application to Vercel

echo "🚀 BoundaryBox Deployment Script"
echo "================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ npm version: $(npm -v)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo ""
    echo "⚠️  .env.local file not found!"
    echo "Please create .env.local with your Supabase credentials:"
    echo ""
    echo "NEXT_PUBLIC_SUPABASE_URL=your_supabase_url"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key"
    echo "SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✅ Environment file found"

# Run type check
echo ""
echo "🔍 Running type check..."
npx tsc --noEmit

if [ $? -ne 0 ]; then
    echo "❌ TypeScript errors found. Please fix them before deploying."
    exit 1
fi

echo "✅ Type check passed"

# Run build
echo ""
echo "🏗️  Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi

echo "✅ Build completed successfully"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo ""
    echo "📥 Vercel CLI not found. Installing..."
    npm install -g vercel
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Vercel CLI"
        exit 1
    fi
    
    echo "✅ Vercel CLI installed"
fi

echo ""
echo "🎯 Ready for deployment!"
echo ""
echo "Next steps:"
echo "1. Make sure you have a Vercel account at https://vercel.com"
echo "2. Run 'vercel login' to authenticate"
echo "3. Run 'vercel --prod' to deploy to production"
echo ""
echo "Or deploy via GitHub:"
echo "1. Push your code to GitHub"
echo "2. Connect your repository in Vercel dashboard"
echo "3. Add environment variables in Vercel settings"
echo "4. Deploy automatically"
echo ""
echo "📚 See DEPLOYMENT.md for detailed instructions"
echo ""
echo "🎉 Happy deploying!"
