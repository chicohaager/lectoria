# 🏠 Lectoria on ZimaOS Setup Guide

Quick setup guide for running Lectoria on ZimaOS home server systems.

## 📋 Prerequisites

- ZimaOS installed and running
- Docker and Docker Compose available
- At least 2GB RAM and 10GB storage space

## 🚀 Quick Setup

### 1. Create Directory Structure

```bash
# Create application directory
sudo mkdir -p /DATA/AppData/lectoria/{data,uploads,logs}
sudo chown -R $USER:$USER /DATA/AppData/lectoria
```

### 2. Download Configuration

```bash
cd /DATA/AppData/lectoria
wget https://raw.githubusercontent.com/chicohaager/lectoria/main/docker-compose.zimaos.yml
wget https://raw.githubusercontent.com/chicohaager/lectoria/main/.env.zimaos
mv .env.zimaos .env
```

### 3. Configure Environment

Edit the `.env` file and **change the JWT_SECRET**:

```bash
nano .env
# Change: JWT_SECRET=your-very-secure-random-secret-key-here
```

### 4. Start Lectoria

```bash
docker-compose -f docker-compose.zimaos.yml up -d
```

### 5. Access Application

- **URL**: http://your-zimaos-ip:3000
- **Default Login**: admin / admin123

## 🔧 Configuration Options

### Environment Variables (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | *change-me* | **MUST CHANGE** - JWT signing secret |
| `NODE_ENV` | production | Application environment |
| `MAX_FILE_SIZE` | 70MB | Max PDF/EPUB file size |
| `MAX_IMAGE_SIZE` | 5MB | Max cover image size |

### Volume Mapping

| Host Path | Container Path | Purpose |
|-----------|----------------|---------|
| `/DATA/AppData/lectoria/data` | `/app/data` | SQLite database |
| `/DATA/AppData/lectoria/uploads` | `/app/uploads` | Book files |
| `/DATA/AppData/lectoria/logs` | `/app/logs` | Application logs |

## 🔒 SSL/HTTPS Setup (Optional)

To enable HTTPS with nginx reverse proxy:

1. Uncomment nginx service in `docker-compose.zimaos.yml`
2. Create nginx configuration:

```bash
mkdir -p /DATA/AppData/lectoria/ssl
# Place your SSL certificates in the ssl directory
# Create nginx.conf configuration file
```

## 🔄 Management Commands

```bash
# View logs
docker-compose -f docker-compose.zimaos.yml logs -f lectoria

# Update to latest version
docker-compose -f docker-compose.zimaos.yml pull
docker-compose -f docker-compose.zimaos.yml up -d

# Backup database
cp /DATA/AppData/lectoria/data/lectoria.db /path/to/backup/

# Stop service
docker-compose -f docker-compose.zimaos.yml down
```

## 🛠️ Troubleshooting

### Container won't start
- Check JWT_SECRET is set in .env file
- Ensure directories have correct permissions
- Check available disk space

### Can't login
- Verify default admin credentials: admin / admin123
- Check browser console for errors
- Ensure JWT_SECRET hasn't changed after first run

### Performance issues
- Increase memory if handling large files
- Check ZimaOS system resources
- Consider using SSD storage for database

## 📊 Monitoring

Health check endpoint: http://your-zimaos-ip:3000/health
- Container includes built-in health checks
- Check status: `docker ps` (should show "healthy")

## 🔗 Support

- [GitHub Issues](https://github.com/chicohaager/lectoria/issues)
- [Docker Hub](https://hub.docker.com/r/chicohaager/lectoria)
- [Documentation](https://github.com/chicohaager/lectoria)

---

**ZimaOS**: Self-hosted digital library, simplified! 📚✨