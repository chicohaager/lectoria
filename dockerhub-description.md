# 📚 Lectoria BookManager - Docker Hub Repository

## Overview

**Lectoria** is a modern, full-stack digital book and magazine management system built with Node.js and React. Upload, organize, and share your PDF and EPUB files with secure authentication, beautiful cover images, and advanced sharing capabilities.

**🔗 GitHub Repository:** [chicohaager/lectoria](https://github.com/chicohaager/lectoria)

---

## ✨ Key Features

### 📖 **Book Management**
- PDF and EPUB file upload with drag-and-drop interface
- Book cover image support (JPG, PNG, WEBP)
- Smart search and filtering by title, author, or type
- Real-time download analytics and counters

### 🔐 **Security & Authentication** 
- JWT-based secure authentication
- Role-based access control (Admin/User)
- Rate limiting and security headers
- Input validation and file type checking

### 🚀 **Advanced Sharing**
- Create public shareable links for books
- Flexible expiration options (permanent, 24h, 7 days)
- One-click copy to clipboard functionality
- Access tracking and download statistics

### 🎨 **Modern UI/UX**
- Beautiful dark mode with smooth transitions
- **14 Languages Supported**: EN, DE, FR, ES, IT, PT, NL, RU, PL, TR, ZH, JA, KO, AR
- Material Design components and icons
- Responsive design for all devices
- Localized date formatting for all languages

### 🏠 **NAS & Home Server Ready**
- Optimized for ZimaOS, Synology, QNAP
- Persistent storage with Docker volumes
- Low resource usage, perfect for home labs
- Health checks and auto-restart capabilities

---

## 🚀 Quick Start

### Simple Setup
```bash
docker run -d \
  --name lectoria \
  -p 3000:3000 \
  -v lectoria-data:/app/data \
  -v lectoria-uploads:/app/uploads \
  -e JWT_SECRET="your-secret-key-here" \
  chicohaager/lectoria:latest
```

### Docker Compose (Recommended)
```yaml
version: '3.8'
services:
  lectoria:
    image: chicohaager/lectoria:latest
    container_name: lectoria
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=your-secure-secret-key
    volumes:
      - lectoria-data:/app/data
      - lectoria-uploads:/app/uploads
    restart: unless-stopped

volumes:
  lectoria-data:
  lectoria-uploads:
```

**Access:** http://localhost:3000  
**Default Login:** admin / admin123

---

## 🏗️ Architecture

**Frontend:** React 18 + Material-UI  
**Backend:** Node.js + Express.js  
**Database:** SQLite3 with optimized indexing  
**Storage:** File system with validation  
**Authentication:** JWT with bcrypt  

---

## 📱 Platform Support

- **Architecture:** linux/amd64, linux/arm64
- **Compatible with:** Docker, Podman, Kubernetes
- **NAS Systems:** ZimaOS, Synology, QNAP, Unraid
- **Cloud Platforms:** AWS, GCP, Azure, DigitalOcean

---

## 🔧 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Application environment |
| `PORT` | `3000` | Server port |
| `JWT_SECRET` | *required* | JWT signing secret |

---

## 💾 Volumes & Persistence

| Container Path | Purpose | Size Estimate |
|---------------|---------|---------------|
| `/app/data` | SQLite database | ~10MB |
| `/app/uploads` | PDF/EPUB files | Varies |

**⚠️ Important:** Always use persistent volumes for production to retain data across container updates.

---

## 🏠 NAS-Specific Setup

### ZimaOS
```yaml
volumes:
  - /DATA/AppData/lectoria/data:/app/data
  - /DATA/AppData/lectoria/uploads:/app/uploads
```

### Synology
```yaml
volumes:
  - /volume1/docker/lectoria/data:/app/data  
  - /volume1/docker/lectoria/uploads:/app/uploads
```

### QNAP
```yaml
volumes:
  - /share/Container/lectoria/data:/app/data
  - /share/Container/lectoria/uploads:/app/uploads
```

---

## 📊 Tags & Versions

| Tag | Description | Size |
|-----|-------------|------|
| `latest` | Latest stable release | ~200MB |
| `v2.1` | Version 2.1 with dark mode & multilingual support | ~200MB |
| `v2.0` | Version 2.0 with cover images | ~200MB |
| `v1.0` | Initial release | ~180MB |

---

## 🔒 Security Best Practices

1. **Change default credentials** immediately after first login
2. **Set a strong JWT_SECRET** (use `openssl rand -hex 32`)
3. **Use HTTPS** in production with reverse proxy
4. **Regular backups** of data volume
5. **Update regularly** for security patches

---

## 📚 Documentation & Support

- **📖 Full Documentation:** [GitHub Wiki](https://github.com/chicohaager/lectoria/wiki)
- **🚀 Deployment Guide:** [DEPLOYMENT.md](https://github.com/chicohaager/lectoria/blob/main/DEPLOYMENT.md)
- **🐛 Issues & Support:** [GitHub Issues](https://github.com/chicohaager/lectoria/issues)
- **💬 Discussions:** [GitHub Discussions](https://github.com/chicohaager/lectoria/discussions)

---

## 🤝 Contributing

Contributions welcome! Check our [contributing guidelines](https://github.com/chicohaager/lectoria/blob/main/CONTRIBUTING.md) and feel free to submit issues or pull requests.

---

## 📄 License

**MIT License** - Free for personal and commercial use.

---

**Created by [@chicohaager](https://github.com/chicohaager) | ⭐ Star on [GitHub](https://github.com/chicohaager/lectoria)**