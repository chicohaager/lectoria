# Lectoria ZimaOS Deployment Guide

## ⚡ Quick Start (Copy & Paste)

For the fastest setup, use these exact values in the ZimaOS GUI:

### Essential Fields Only:
```
Docker-Image: chicohaager/lectoria
Tag: latest
Port Host: 3000
Port Container: 3000

Volume 1:
  Host: /DATA/AppData/lectoria/data
  Container: /app/data

Volume 2:
  Host: /DATA/AppData/lectoria/uploads
  Container: /app/uploads

Volume 3:
  Host: /DATA/AppData/lectoria/logs
  Container: /app/logs

Environment:
  NODE_ENV = production
  PORT = 3000
  PUID = 1000
  PGID = 1000
```

## 🚀 Quick Installation via ZimaOS GUI

### Method 1: ZimaOS Big Sur App Store (Recommended)

1. **Open ZimaOS Big Sur App Store**
2. **Click "Manuelle App Installation"**
3. **Fill in the following fields:**
   
   | Field | Value |
   |-------|-------|
   | **Docker-Image** | `chicohaager/lectoria` |
   | **Tag** | `latest` |
   | **Titel** | `Lectoria` |
   | **Icon URL** | (leave empty or add custom) |
   | **Web UI** | `http://[your-zimaos-ip]:3000` |
   | **Port** | `3000` |
   | **Netzwerk** | `bridge` |

4. **Ports Configuration:**
   - Click "+" bei Ports
   - **Host**: `3000`
   - **Container**: `3000`

5. **Speicher (Volumes) - REQUIRED:**
   Click "+" three times to add these volume mounts:
   
   **Volume 1:**
   - **Host Pfad**: `/DATA/AppData/lectoria/data`
   - **Container Pfad**: `/app/data`
   
   **Volume 2:**
   - **Host Pfad**: `/DATA/AppData/lectoria/uploads`
   - **Container Pfad**: `/app/uploads`
   
   **Volume 3:**
   - **Host Pfad**: `/DATA/AppData/lectoria/logs`
   - **Container Pfad**: `/app/logs`

6. **Umgebungsvariablen (Environment Variables):**
   Click "+" to add these variables:
   
   **Required:**
   - **Variable**: `NODE_ENV` | **Wert**: `production`
   - **Variable**: `PORT` | **Wert**: `3000`
   
   **Optional (but recommended):**
   - **Variable**: `PUID` | **Wert**: `1000`
   - **Variable**: `PGID` | **Wert**: `1000`
   
   **Do NOT set JWT_SECRET** - it will be auto-generated

7. **Click "Installieren"**

### Method 2: Docker Compose Import

1. Download the compose file:
```bash
wget https://raw.githubusercontent.com/chicohaager/lectoria/main/docker-compose.zimaos.yml
```

2. In ZimaOS, go to Docker Compose section
3. Import the file
4. Click Deploy

### Method 3: Docker CLI

```bash
docker run -d \
  --name lectoria \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PUID=1000 \
  -e PGID=1000 \
  -v /DATA/AppData/lectoria/data:/app/data \
  -v /DATA/AppData/lectoria/uploads:/app/uploads \
  -v /DATA/AppData/lectoria/logs:/app/logs \
  --restart unless-stopped \
  chicohaager/lectoria:latest
```

## 📋 Post-Installation

### First Login
1. Open browser: `http://[your-zimaos-ip]:3000`
2. Default credentials:
   - Username: `admin`
   - Password: `admin123`
3. **IMPORTANT**: Change the password immediately!

### Security Features
- JWT Secret is auto-generated on first run
- Stored securely in `/DATA/AppData/lectoria/data/.jwt-secret`
- Never exposed in logs or environment
- Persists across container restarts

## 🔧 Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PUID` | 1000 | User ID for file permissions |
| `PGID` | 1000 | Group ID for file permissions |
| `JWT_SECRET` | auto | Leave empty for auto-generation |
| `MAX_FILE_SIZE` | 70MB | Maximum book file size |
| `MAX_IMAGE_SIZE` | 5MB | Maximum cover image size |
| `FRONTEND_URL` | auto | Frontend URL (usually auto-detected) |

### Storage Paths

All data is stored in `/DATA/AppData/lectoria/`:
- `/data` - Database and JWT secret
- `/uploads` - Book files and covers
- `/logs` - Application logs

## 🔍 Troubleshooting

### Installation Takes Too Long or Fails

**Problem**: The container doesn't start or takes forever to initialize.

**Solution**: 
1. Check if port 3000 is already in use
2. Ensure you're using the simplified compose file (not the one with init containers)
3. Check container logs: `docker logs lectoria`

### Cannot Access Web UI

**Problem**: Browser shows connection refused.

**Solution**:
1. Check if container is running: `docker ps | grep lectoria`
2. Verify port mapping: Should show `0.0.0.0:3000->3000/tcp`
3. Check firewall settings on ZimaOS

### Permission Errors

**Problem**: Cannot upload books or save settings.

**Solution**:
1. Check PUID/PGID match your system user:
   ```bash
   id -u  # Shows your user ID
   id -g  # Shows your group ID
   ```
2. Update environment variables to match
3. Restart container

### JWT Secret Issues

**Problem**: Authentication errors or "invalid token" messages.

**Solution**:
1. Let the system auto-generate the JWT secret
2. Don't manually set JWT_SECRET unless necessary
3. If you must set it manually, use a strong 64+ character string

## 📊 Health Check

The container includes a health check that verifies:
- Web server is responding
- Database is accessible
- JWT secret is properly configured

Check health status:
```bash
docker inspect lectoria | grep -A 5 "Health"
```

## 🔄 Updates

To update to the latest version:
```bash
docker pull chicohaager/lectoria:latest
docker stop lectoria
docker rm lectoria
# Then reinstall using your preferred method
```

## 📚 Additional Resources

- [Main Documentation](README.md)
- [Docker Hub](https://hub.docker.com/r/chicohaager/lectoria)
- [GitHub Repository](https://github.com/chicohaager/lectoria)

## 💡 Tips for ZimaOS Users

1. **Auto-start**: The container is set to `restart: unless-stopped`
2. **Backup**: Your data is in `/DATA/AppData/lectoria/` - back this up regularly
3. **SSL/HTTPS**: Use ZimaOS's built-in reverse proxy for SSL
4. **Performance**: Container uses minimal resources (256-512MB RAM)
5. **Multiple Instances**: Use different ports (3001, 3002, etc.) for multiple libraries