# 🏠 ZimaOS Setup for Lectoria BookManager

## 🌍 Available in 14 Languages!
Lectoria now supports 14 languages: German, English, French, Spanish, Italian, Portuguese, Dutch, Russian, Polish, Turkish, Chinese, Japanese, Korean, and Arabic.

## 📋 Prerequisites
- ZimaOS system with Docker support
- SSH access to your ZimaOS system
- At least 2GB free storage

## 🚀 Installation

### 1. Create Directories
```bash
# SSH to your ZimaOS system, then:
sudo mkdir -p /DATA/AppData/lectoria/{data,uploads,logs,ssl}
sudo chown -R $(whoami):$(whoami) /DATA/AppData/lectoria
```

### 2. Clone Repository
```bash
cd /DATA/AppData/lectoria
git clone https://github.com/chicohaager/lectoria.git app
cd app
```

### 3. Configure Environment
```bash
# Generate JWT Secret
openssl rand -hex 32

# Create environment file
cp .env.example .env
nano .env
```

Edit the `.env` file:
```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=your-generated-secret-key-here
```

### 4. Start ZimaOS Docker Compose
```bash
# With ZimaOS-specific configuration
docker-compose -f docker-compose.zimaos.yml up -d --build
```

## 🌐 Access

### Local Network
- **URL:** `http://YOUR-ZIMA-IP:3000`
- **Default Login:** admin / admin123

### Via ZimaOS Dashboard
If available, you can also manage the app through the ZimaOS web interface.

## 📁 Folder Structure on ZimaOS
```
/DATA/AppData/lectoria/
├── app/                    # Git Repository
│   ├── docker-compose.zimaos.yml
│   ├── Dockerfile
│   └── backend_server.js
├── data/                   # Database (persistent)
│   └── bookmanager.db
├── uploads/                # Uploaded books (persistent)
│   ├── .gitkeep
│   └── [PDF/EPUB files]
└── logs/                   # Application logs
```

## 🔧 ZimaOS-specific Features

### Persistent Storage
- ✅ All data persists through container restarts
- ✅ Database: `/DATA/AppData/lectoria/data`
- ✅ Uploads: `/DATA/AppData/lectoria/uploads`
- ✅ Logs: `/DATA/AppData/lectoria/logs`

### Performance
- ✅ Optimized for NAS environment
- ✅ Low CPU/RAM usage
- ✅ Efficient file I/O

## 🛠 Maintenance

### Check Container Status
```bash
cd /DATA/AppData/lectoria/app
docker-compose -f docker-compose.zimaos.yml ps
```

### View Logs
```bash
docker-compose -f docker-compose.zimaos.yml logs -f lectoria
```

### Install Updates
```bash
cd /DATA/AppData/lectoria/app
git pull
docker-compose -f docker-compose.zimaos.yml up -d --build
```

### Create Backup
```bash
# Backup database
cp /DATA/AppData/lectoria/data/bookmanager.db /DATA/AppData/lectoria/backup_$(date +%Y%m%d).db

# Backup uploads
tar -czf /DATA/AppData/lectoria/uploads_backup_$(date +%Y%m%d).tar.gz /DATA/AppData/lectoria/uploads/
```

## 🔒 Security for ZimaOS

### Firewall (optional)
```bash
# Open port 3000 (if firewall is active)
sudo ufw allow 3000/tcp
```

### SSL Certificate (optional)
For HTTPS, you can place an SSL certificate in `/DATA/AppData/lectoria/ssl/` and enable nginx.

## ⚠️ Troubleshooting

### Port Already in Use
```bash
# Use different port
docker-compose -f docker-compose.zimaos.yml down
# Edit docker-compose.zimaos.yml: ports: "3001:3000"
docker-compose -f docker-compose.zimaos.yml up -d
```

### Check Disk Space
```bash
df -h /DATA
```

### Restart Container
```bash
docker-compose -f docker-compose.zimaos.yml restart
```

## 📊 Monitoring

### ZimaOS Dashboard Integration
The app runs as a standard container and should be visible in the ZimaOS dashboard.

### Health Check
```bash
curl http://localhost:3000
```

---

**🏠 Perfect for your ZimaOS home setup!**