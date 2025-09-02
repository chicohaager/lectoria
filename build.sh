#!/bin/bash

# Lectoria Docker Build Script
# Version: 2.4.0 with SQLite

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}   📚 Lectoria Docker Build Script     ${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""

# Parse arguments
BUILD_TYPE=${1:-"optimized"}
VERSION=${2:-"2.4"}

echo -e "${YELLOW}Build Configuration:${NC}"
echo "  • Build Type: $BUILD_TYPE"
echo "  • Version: $VERSION"
echo ""

# Select Dockerfile
if [ "$BUILD_TYPE" = "optimized" ]; then
    DOCKERFILE="Dockerfile.optimized"
    echo -e "${GREEN}✓${NC} Using optimized Dockerfile"
elif [ "$BUILD_TYPE" = "standard" ]; then
    DOCKERFILE="Dockerfile"
    echo -e "${GREEN}✓${NC} Using standard Dockerfile"
else
    echo -e "${RED}✗${NC} Invalid build type. Use 'optimized' or 'standard'"
    exit 1
fi

# Build the image
echo ""
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t lectoria:$VERSION -f $DOCKERFILE . || {
    echo -e "${RED}✗ Build failed!${NC}"
    exit 1
}

echo ""
echo -e "${GREEN}✓ Build successful!${NC}"

# Tag as latest
docker tag lectoria:$VERSION lectoria:latest
echo -e "${GREEN}✓ Tagged as lectoria:latest${NC}"

# Show image info
echo ""
echo -e "${YELLOW}Image Information:${NC}"
docker images | grep lectoria | head -2

# Optional: Run the container
echo ""
echo -e "${YELLOW}To run the container:${NC}"
echo "  docker run -d \\"
echo "    --name lectoria \\"
echo "    -p 3000:3000 \\"
echo "    -v lectoria-data:/app/data \\"
echo "    -v lectoria-uploads:/app/uploads \\"
echo "    -e JWT_SECRET='your-secret-key' \\"
echo "    lectoria:$VERSION"

echo ""
echo -e "${YELLOW}Or use docker-compose:${NC}"
echo "  docker-compose up -d"

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}          Build Complete! 🎉           ${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"