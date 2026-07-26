# 📚 Lectoria - Digital Book & Magazine Manager

> **Created by [@chicohaager](https://github.com/chicohaager/lectoria)**

A modern, full-stack digital library management system built with React and Node.js. Upload, organize, and share your PDF and EPUB files with secure authentication, shareable links, and **comprehensive multilingual support**.

![Lectoria Logo](logo.png)

## 🚀 Features

### 📖 Core Functionality
- **Modern Web Interface** - React 18 with Material-UI components and PWA support
- **File Upload & Management** - Drag-and-drop PDF/EPUB upload (up to 70MB)
- **Smart Search & Filtering** - Find books by title, author, or type
- **Role-Based Access** - Admin and user roles with proper permissions
- **Secure Authentication** - JWT-based with bcrypt password hashing

### 🌍 Multilingual Support (v2.3 - 14 Languages!)
- **Complete Language Support** - Full UI translation system
- **14 Languages Available**:
  - 🇺🇸 English
  - 🇩🇪 German (Deutsch)
  - 🇫🇷 French (Français)
  - 🇪🇸 Spanish (Español)
  - 🇮🇹 Italian (Italiano)
  - 🇵🇹 Portuguese (Português)
  - 🇳🇱 Dutch (Nederlands)
  - 🇷🇺 Russian (Русский)
  - 🇵🇱 Polish (Polski)
  - 🇹🇷 Turkish (Türkçe)
  - 🇨🇳 Chinese (中文)
  - 🇯🇵 Japanese (日本語)
  - 🇰🇷 Korean (한국어)
  - 🇸🇦 Arabic (العربية)
- **Dynamic Language Switching** - Change language on-the-fly from navbar
- **Localized Date Formatting** - Dates display in selected language format
- **Complete UI Translation** - All interface elements, admin panels, and messages

### 🔗 Shareable Links
- **Public Sharing** - Create shareable links for any book (no login required)
- **Flexible Expiration** - Permanent, 24-hour, or 7-day links
- **Access Tracking** - Monitor link usage and download counts
- **Link Management** - View, copy, and deactivate shared links
- **Secure Tokens** - UUID-based tokens for security

### 🎨 Book Cover Images
- **Cover Upload** - Add book cover images during upload
- **Visual Library** - Beautiful cover display in book grid
- **Format Support** - JPG, PNG, WEBP images (up to 5MB)
- **Share Page Display** - Covers shown in public share links

### 📊 Download Analytics
- **Real-time Counters** - Track download statistics
- **Public & Private** - Count both authenticated and public downloads
- **Dashboard Display** - View download stats in book cards
- **Share Analytics** - Monitor shared book performance

### ⚡ Performance Optimizations
- **Database Indexing** - Optimized queries for large collections
- **Server-Side Pagination** - Efficient data loading
- **API Response Caching** - Faster repeated requests
- **Smart Search** - Real-time filtering with backend support

## 🛠 Technology Stack

- **Frontend**: React 18, Material-UI 5, React Router 6
- **Backend**: Node.js, Express.js, SQLite
- **Authentication**: JWT (JSON Web Tokens)
- **File Handling**: Multer with type validation
- **Containerization**: Docker & Docker Compose

## 📦 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Git for cloning the repository

### 1. Clone Repository
```bash
git clone https://github.com/chicohaager/lectoria.git
cd lectoria
```

### 2. Start with Docker

**Professional Docker Image with PUID/PGID Support:**
```bash
# Quick start with proper permissions
docker run -d -p 3000:3000 \
  -e PUID=1000 -e PGID=1000 \
  -v lectoria_data:/app/data \
  -v lectoria_uploads:/app/uploads \
  chicohaager/lectoria:latest

# Or use Docker Compose
docker-compose up -d --build
```

**Environment Variables for File Permissions:**
```bash
PUID=1000  # Your user ID (run 'id' to find yours)
PGID=1000  # Your group ID
```

### 3. Access Application
Open your browser and navigate to: `http://localhost:3000`

**Default Credentials:**
- Username: `admin`
- Password: `admin123`
- Role: Administrator

## 🏗 Development Setup

### Frontend Development
```bash
cd frontend
npm install
npm start          # Development server (port 3000)
npm run build      # Production build
npm test           # Run tests
```

### Backend Development
```bash
npm install
npm start          # Production server
npm run dev        # Development with auto-reload
npm run dev:server # Backend only
npm run dev:client # Frontend only
```

## 📁 Project Structure

```
lectoria/
├── docker-compose.yml          # Container orchestration
├── Dockerfile                  # Multi-stage build
├── package.json               # Backend dependencies
├── backend_server.js          # Express server
├── logo.png                   # Application logo
├── frontend/
│   ├── package.json          # Frontend dependencies
│   ├── public/
│   │   └── logo.png         # Public logo
│   └── src/
│       ├── App.js           # Main application
│       ├── components/      # React components
│       └── services/        # API services
├── uploads/                   # File storage
└── data/                     # Database configuration
```

## 🗄 Database Schema

### Tables
- **users**: User accounts with roles and authentication
- **books**: Book metadata and file information  
- **share_links**: Shareable link management with expiration

### Indexes (Performance Optimized)
- `idx_books_uploaded_by` - User's books lookup
- `idx_books_upload_date` - Chronological sorting
- `idx_share_links_token` - Fast token validation
- `idx_share_links_book_id` - Book shares lookup

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Books Management  
- `GET /api/books` - List books (with pagination & search)
- `POST /api/books/upload` - Upload new book with optional cover image
- `DELETE /api/books/:id` - Delete book
- `GET /api/books/:id/download` - Download book

### Shareable Links
- `POST /api/books/:id/share` - Create shareable link
- `GET /api/books/:id/shares` - List book's active shares
- `DELETE /api/shares/:token` - Deactivate link
- `GET /api/share/:token` - Public book info *(no auth)*
- `GET /api/share/:token/download` - Public download *(no auth)*

### Administration
- `GET /api/users` - List users *(admin only)*

## 🔗 Using Shareable Links

### Creating Links
1. Navigate to Dashboard
2. Click the **Share** icon on any book you own
3. Choose expiration: Permanent, 24 hours, or 7 days
4. Copy the generated URL

### Sharing
- Share URLs work without login: `https://your-domain.com/share/{token}`
- Recipients can view book details and download files
- Track usage with access counts and timestamps

### Managing Links
- View all active shares for your books
- Copy URLs to clipboard with one click
- Deactivate links when no longer needed
- Monitor access statistics

## ⚙️ Configuration

### Environment Variables
```bash
NODE_ENV=production                    # Environment mode
JWT_SECRET=your-secure-secret-key     # JWT signing key
PORT=3000                             # Server port
```

### Docker Compose
```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./uploads:/app/uploads         # File storage
      - ./data:/app/data              # Database
    environment:
      - NODE_ENV=production
      - JWT_SECRET=your-secret-key
```

## 🔧 Security Features

- **JWT Authentication** - Secure token-based sessions
- **Password Hashing** - bcrypt with salt rounds
- **File Type Validation** - Only PDF/EPUB allowed
- **File Size Limits** - 50MB maximum upload
- **Role-Based Permissions** - Admin vs user access control
- **Secure Share Tokens** - UUID-based unguessable links
- **Optional Expiration** - Time-limited access control

## 🚀 Deployment

### Production Deployment
1. **Set JWT_SECRET** - Use a secure, random key in production
2. **Configure Volumes** - Ensure data persistence with Docker volumes
3. **Reverse Proxy** - Use nginx or similar for HTTPS
4. **Backup Strategy** - Regular backups of uploads and database

### Environment Setup
```bash
# Set secure JWT secret
export JWT_SECRET="your-very-secure-random-key"

# Start production containers
docker-compose up -d --build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Material-UI for the beautiful component library
- React community for excellent documentation
- Docker for containerization made simple

---

**💡 Built with passion by [@chicohaager](https://github.com/chicohaager) | [GitHub Repository](https://github.com/chicohaager/lectoria)**

---

## ☕ Support

If this project saves you time, you can buy me a coffee — it keeps the side projects going.

<!-- bmc-button -->
[![Buy Me A Coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=%E2%98%95&slug=holgi18114&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff)](https://buymeacoffee.com/holgi18114)

… or scan the code:

<a href="https://buymeacoffee.com/holgi18114"><img src=".github/bmc-qr.png" alt="Buy Me a Coffee QR code" width="160"></a>
