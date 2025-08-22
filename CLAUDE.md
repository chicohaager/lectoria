# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Lectoria** is a modern digital book and magazine management system (BookManager) built for Docker deployment. It's a full-stack web application that allows users to upload, organize, and download PDF and EPUB files with user authentication and role-based access control.

## Development Commands

### Frontend (React)
```bash
cd frontend && npm start          # Development server (port 3000, proxies to backend)
cd frontend && npm run build     # Production build
cd frontend && npm test          # Run tests
```

### Backend (Node.js/Express)
```bash
npm start                        # Production server
npm run dev                      # Development with auto-reload (both frontend & backend)
npm run dev:server              # Backend only with nodemon
npm run dev:client              # Frontend only
```

### Docker Deployment
```bash
docker-compose up --build       # Build and start containers
docker-compose up -d --build    # Background mode
docker-compose down             # Stop containers
```

## Architecture

### Project Structure
- **Backend**: Express.js server in `backend_server.js` 
- **Frontend**: React app with Material-UI components in separate component files
- **Database**: SQLite3 with two main tables (users, books)
- **Authentication**: JWT-based with bcrypt password hashing
- **File Storage**: Local filesystem in `/uploads` directory
- **Container**: Docker with production-ready multi-stage build

### Key Components
- **Dashboard** (`dashboard_upload_components.js`): Book grid view, search/filter, download functionality, shareable links management
- **BookUpload**: Drag-and-drop file upload with metadata forms
- **UserManagement**: Admin-only user overview table
- **Login**: Tabbed login/registration with JWT token handling
- **SharedBook** (`shared_book_page.js`): Public book sharing page (no authentication required)

### Database Schema
- **users**: id, username, email, password (hashed), role (admin/user), created_at
- **books**: id, title, author, description, type (book/magazine), filename, filepath, file_size, upload_date, uploaded_by
- **share_links**: id, book_id, share_token, created_by, created_at, expires_at, is_active, access_count

### API Endpoints

#### Authentication
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration

#### Books Management
- `GET /api/books` - List books with pagination and search (authenticated)
- `POST /api/books/upload` - Upload new book (authenticated)
- `DELETE /api/books/:id` - Delete book (owner or admin only)
- `GET /api/books/:id/download` - Download book file (authenticated)

#### Shareable Links
- `POST /api/books/:id/share` - Create shareable link (owner or admin only)
- `GET /api/books/:id/shares` - List active shares for book (owner or admin only)
- `DELETE /api/shares/:token` - Deactivate shareable link (owner or admin only)
- `GET /api/share/:token` - Get shared book info (public, no auth required)
- `GET /api/share/:token/download` - Download shared book (public, no auth required)

#### User Management
- `GET /api/users` - List users (admin only)

### Security Features
- JWT token validation middleware
- File type validation (PDF/EPUB only)
- File size limits (50MB)
- Role-based permissions (admin vs user)
- Password hashing with bcrypt
- Secure shareable links with optional expiration
- Access counting and tracking for shared links
- Database performance optimizations with proper indexing

## Default Credentials
- Username: `admin`
- Password: `admin123`
- Role: Administrator

## File Organization Notes

This codebase contains individual component files rather than a traditional folder structure. Each major component is in its own `.js` file, and the complete React app structure is embedded within `react_app_main.js`. The project includes both a functional React implementation and an HTML mockup (`bookmanager_mockup.html`) for UI reference.

The Docker configuration supports both development and production deployment with volume mounts for persistent data storage.