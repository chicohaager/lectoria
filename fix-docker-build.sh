#!/bin/bash

echo "🔧 Fixing Docker build and PostgreSQL issues for Lectoria"

# 1. Clean Docker build cache
echo "🧹 Cleaning Docker build cache..."
docker builder prune -f

# 2. Build with optimized settings
echo "🏗️ Building Docker image with optimizations..."
docker build \
  --progress=plain \
  --memory=2g \
  --memory-swap=4g \
  --build-arg NODE_OPTIONS="--max-old-space-size=1024" \
  -f Dockerfile.optimized \
  -t lectoria:optimized \
  .

if [ $? -eq 0 ]; then
    echo "✅ Docker build successful!"
else
    echo "❌ Docker build failed. Trying alternative approach..."
    
    # Alternative: Build without frontend first
    echo "🔄 Building backend only..."
    docker build \
      --target builder \
      --progress=plain \
      -f Dockerfile.optimized \
      -t lectoria:backend-only \
      .
fi

echo "📊 Checking PostgreSQL connection..."
docker exec lectoria_postgres psql -U lectoria_user -d lectoria -c "SELECT 1;" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL is accessible"
else
    echo "❌ PostgreSQL connection failed"
fi

echo "🚀 Done!"