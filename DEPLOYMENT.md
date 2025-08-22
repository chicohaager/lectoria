# 🚀 Lectoria BookManager - Deployment Guide

## Quick Start (Docker)

### Prerequisites
- Docker and Docker Compose installed
- At least 1GB RAM and 10GB disk space

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables (IMPORTANT!)
nano .env
```

**⚠️ CRITICAL: Change the JWT_SECRET in production!**

### 2. Deploy with Docker Compose
```bash
# Development deployment
docker-compose up -d --build

# Production deployment (port 80)
docker-compose -f docker-compose.prod.yml up -d --build
```

### 3. Access the Application
- **Development:** http://localhost:3000
- **Production:** http://your-server-ip
- **Default Login:** admin / admin123

---

## Production Deployment

### Server Requirements
- **CPU:** 1+ cores
- **RAM:** 1GB minimum, 2GB recommended  
- **Storage:** 10GB+ (depending on book collection)
- **OS:** Ubuntu 20.04+, CentOS 8+, or similar

### Deployment Steps

#### 1. Server Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create app directory
sudo mkdir -p /var/lectoria
sudo chown $USER:$USER /var/lectoria
```

#### 2. Deploy Application
```bash
# Clone repository
cd /var/lectoria
git clone https://github.com/chicohaager/lectoria.git
cd lectoria

# Setup environment
cp .env.example .env
nano .env  # Configure production settings

# Generate secure JWT secret
openssl rand -hex 32  # Copy output to JWT_SECRET in .env

# Deploy
docker-compose -f docker-compose.prod.yml up -d --build
```

#### 3. Setup Systemd Service (Optional)
```bash
# Create systemd service
sudo tee /etc/systemd/system/lectoria.service > /dev/null <<EOF
[Unit]
Description=Lectoria BookManager
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/var/lectoria/lectoria
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl enable lectoria
sudo systemctl start lectoria
```

---

## SSL/HTTPS Setup (Nginx)

### 1. Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx
```

### 2. Nginx Configuration
```bash
# Create nginx config
sudo tee /var/lectoria/lectoria/nginx.conf > /dev/null <<EOF
events {
    worker_connections 1024;
}

http {
    upstream lectoria {
        server lectoria:3000;
    }

    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://\$server_name\$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        client_max_body_size 50M;

        location / {
            proxy_pass http://lectoria;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
EOF
```

### 3. Get SSL Certificate
```bash
# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates
sudo mkdir -p /var/lectoria/lectoria/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /var/lectoria/lectoria/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /var/lectoria/lectoria/ssl/key.pem
```

---

## Database & Storage

### Backup Strategy
```bash
# Create backup script
cat > /var/lectoria/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/lectoria/backups"
mkdir -p $BACKUP_DIR

# Backup database
cp /var/lectoria/data/bookmanager.db $BACKUP_DIR/bookmanager_$DATE.db

# Backup uploads (optional)
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/lectoria/uploads/

# Keep only last 7 days
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x /var/lectoria/backup.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /var/lectoria/backup.sh" | sudo crontab -
```

### Storage Volumes
- **Database:** `/var/lectoria/data` (persistent)
- **Uploads:** `/var/lectoria/uploads` (persistent) 
- **Backups:** `/var/lectoria/backups` (persistent)

---

## Monitoring & Maintenance

### Health Checks
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f

# Check health
curl http://localhost/api/books
```

### Performance Monitoring
```bash
# Container stats
docker stats lectoria-prod

# Disk usage
du -sh /var/lectoria/
```

### Updates
```bash
cd /var/lectoria/lectoria
git pull
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## Security Checklist

- [x] Change default admin password
- [x] Set secure JWT_SECRET  
- [x] Enable firewall (ports 22, 80, 443 only)
- [x] Setup SSL certificates
- [x] Regular security updates
- [x] Backup strategy in place
- [x] Monitor logs for suspicious activity

---

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

**Database locked:**
```bash
docker-compose restart
```

**Upload fails:**
- Check disk space: `df -h`
- Check permissions: `ls -la uploads/`

**Performance issues:**
- Increase container memory limit
- Check disk I/O: `iotop`
- Monitor logs for errors

### Support
- GitHub Issues: https://github.com/chicohaager/lectoria/issues
- Documentation: https://github.com/chicohaager/lectoria/wiki