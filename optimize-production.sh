#!/bin/bash
# Lectoria Production Optimization Script
# Run this before deploying to production

echo "🚀 Starting Lectoria production optimization..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}Error: Please run this script from the Lectoria root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}1. Cleaning up old builds and caches...${NC}"
rm -rf frontend/build/
rm -rf public/static/
rm -rf node_modules/
rm -rf frontend/node_modules/
rm -f *.log
rm -rf logs/

echo -e "${YELLOW}2. Installing production dependencies...${NC}"
npm ci --only=production

echo -e "${YELLOW}3. Building optimized frontend...${NC}"
cd frontend
npm ci
NODE_ENV=production npm run build
cd ..

echo -e "${YELLOW}4. Creating production directories...${NC}"
mkdir -p data uploads logs backups exports

echo -e "${YELLOW}5. Setting proper permissions...${NC}"
chmod 755 data uploads logs backups exports
chmod +x docker-entrypoint.sh

echo -e "${YELLOW}6. Creating production .env template...${NC}"
if [ ! -f ".env.production" ]; then
    cat > .env.production << 'EOF'
# Lectoria Production Configuration
NODE_ENV=production
PORT=3000

# SECURITY - Generate a strong secret!
# Run: openssl rand -base64 64
JWT_SECRET=CHANGE_THIS_TO_A_SECURE_SECRET

# Database
DB_PATH=./data/lectoria.db

# File Limits
MAX_FILE_SIZE=70485760
MAX_IMAGE_SIZE=5242880

# CORS
FRONTEND_URL=http://localhost:3000

# Rate Limiting (optional)
# RATE_LIMIT_WINDOW_MS=900000
# RATE_LIMIT_MAX_REQUESTS=100
EOF
    echo -e "${GREEN}Created .env.production template${NC}"
    echo -e "${YELLOW}⚠️  Remember to set a secure JWT_SECRET in production!${NC}"
fi

echo -e "${YELLOW}7. Running security checks...${NC}"
# Check for exposed secrets
if grep -r "admin123\|password123\|secret-key\|fallback-secret" --include="*.js" --include="*.json" --exclude-dir=node_modules --exclude-dir=build --exclude-dir=public . 2>/dev/null | grep -v "translations\|console.log\|comments"; then
    echo -e "${RED}⚠️  Warning: Potential hardcoded secrets found${NC}"
else
    echo -e "${GREEN}✅ No hardcoded secrets found${NC}"
fi

echo -e "${YELLOW}8. Optimizing Docker build...${NC}"
if command -v docker &> /dev/null; then
    echo "Building optimized Docker image..."
    docker build -t lectoria:production . --no-cache
    echo -e "${GREEN}✅ Docker image built: lectoria:production${NC}"
else
    echo -e "${YELLOW}Docker not found, skipping Docker build${NC}"
fi

echo -e "${YELLOW}9. Creating deployment checklist...${NC}"
cat > DEPLOYMENT_CHECKLIST.md << 'EOF'
# Lectoria Deployment Checklist

## Before Deployment

- [ ] Set secure JWT_SECRET in environment
- [ ] Configure proper FRONTEND_URL for CORS
- [ ] Set up SSL/HTTPS certificate
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Configure log rotation
- [ ] Set proper PUID/PGID for file permissions

## Environment Variables

Required:
- `JWT_SECRET`: Secure random string (min 32 chars)
- `NODE_ENV`: Set to "production"
- `PORT`: Application port (default 3000)

Optional:
- `DB_PATH`: Database location
- `PUID`: User ID for file permissions
- `PGID`: Group ID for file permissions

## Docker Deployment

```bash
# Using docker-compose (recommended)
docker-compose -f docker-compose.zimaos.yml up -d

# Or using docker run
docker run -d \
  --name lectoria \
  -p 3000:3000 \
  -v /path/to/data:/app/data \
  -v /path/to/uploads:/app/uploads \
  -e JWT_SECRET="your-secure-secret" \
  -e PUID=1000 \
  -e PGID=1000 \
  lectoria:production
```

## Post-Deployment

- [ ] Test application access
- [ ] Verify file upload functionality
- [ ] Check database connectivity
- [ ] Monitor logs for errors
- [ ] Set up monitoring/alerts
- [ ] Document admin credentials
EOF

echo -e "${GREEN}✅ Created DEPLOYMENT_CHECKLIST.md${NC}"

echo -e "\n${GREEN}🎉 Production optimization complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review DEPLOYMENT_CHECKLIST.md"
echo "2. Set secure JWT_SECRET in .env.production"
echo "3. Deploy using Docker or run directly with: NODE_ENV=production npm start"