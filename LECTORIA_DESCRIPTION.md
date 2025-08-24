# 📚 Lectoria - Modern Digital Library Management System

**Lectoria** is a powerful, self-hosted digital library management system built for organizing and sharing your personal collection of eBooks, PDFs, and magazines. Perfect for home users, small organizations, or anyone who wants to create their own digital library.

## 🌟 Key Features

### 📖 **Digital Library Management**
- Support for **PDF** and **EPUB** formats up to 70MB per file
- **Book & Magazine** categorization with custom categories
- **Automatic metadata extraction** and manual editing capabilities
- **Cover image extraction** and display
- **Advanced search** by title, author, or description
- **Multiple view modes**: Grid and List layouts

### 🌍 **Multilingual Support**
- **Database-driven translation system** - fully scalable
- **Currently supports**: English & German 
- **Easy language switching** with persistent user preference
- **Admin can add new languages** without code changes
- **Automatic category translation** for seamless experience

### 👥 **User Management**
- **Multi-user system** with role-based access (Admin/User)
- **Secure authentication** with JWT tokens and bcrypt hashing
- **User registration** and profile management
- **Admin controls**: User activation, role assignment, password policies

### 🔗 **Sharing & Collaboration**
- **Shareable links** for individual books with expiration dates
- **Public book sharing** without requiring user accounts
- **Download tracking** and access statistics
- **QR code generation** for easy mobile access

### ⚡ **Modern Web Experience**
- **Progressive Web App (PWA)** - install as native app
- **Dark/Light/Auto theme modes** with system preference detection
- **Responsive design** - works on desktop, tablet, and mobile
- **Offline functionality** with intelligent caching
- **Real-time updates** and notifications

### 🛠️ **Administration Tools**
- **Comprehensive admin dashboard** with user and content management
- **Calibre library import** - migrate from existing Calibre libraries
- **Backup & Restore system** with full data export/import
- **CSV export** for data analysis
- **Category management** with custom colors and icons
- **System monitoring** and health checks

### 🐳 **Easy Deployment**
- **Docker containerization** for simple deployment
- **PostgreSQL database** for reliability and performance
- **Environment-based configuration** with secure defaults
- **Production-ready** with security best practices
- **Automatic database migrations** and setup

## 🚀 Quick Start

### Using Docker (Recommended)
```bash
# Basic setup with SQLite
docker run -d -p 3000:3000 \
  -v lectoria_data:/app/data \
  -v lectoria_uploads:/app/uploads \
  chicohaager/lectoria:latest

# Full setup with PostgreSQL
docker-compose up -d
```

### Default Credentials
- **Username**: `admin`
- **Password**: `admin123`

## 🎯 Perfect For

- **Personal digital libraries** - Organize your eBook collection
- **Small teams & organizations** - Share resources and documents
- **Educational institutions** - Manage course materials and resources
- **Home servers & NAS** - Self-hosted solution with full control
- **Book clubs & communities** - Collaborative reading and sharing

## 💡 Technical Highlights

- **Backend**: Node.js, Express.js, PostgreSQL
- **Frontend**: React, Material-UI, Progressive Web App
- **Security**: JWT authentication, bcrypt hashing, rate limiting
- **File Handling**: Multer with size limits and type validation
- **Internationalization**: Database-driven translation system
- **Deployment**: Docker, Docker Compose, multi-stage builds

---

**Created by [@chicohaager](https://github.com/chicohaager/lectoria)**  
**License**: Open Source  
**Docker Hub**: [chicohaager/lectoria](https://hub.docker.com/r/chicohaager/lectoria)

Transform your digital reading experience with Lectoria - where organization meets accessibility! 📚✨