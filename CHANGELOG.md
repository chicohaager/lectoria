# Changelog

All notable changes to Lectoria BookManager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-08-22

### 🎨 Added - Book Cover Images
- **Cover Image Upload**: Support for uploading book cover images during book upload
- **Image Format Support**: JPG, PNG, WEBP formats with 5MB size limit
- **Cover Display**: Beautiful cover display in dashboard book grid
- **Share Page Covers**: Cover images shown in public share pages
- **Image Preview**: Real-time preview during upload process
- **Validation**: Comprehensive image type and size validation

### 📋 Added - Copy Share Link Feature  
- **One-Click Copy**: Copy share links to clipboard with single button click
- **Visual Feedback**: Checkmark animation and status change on successful copy
- **Browser Compatibility**: Clipboard API with fallback for older browsers
- **UX Enhancement**: Smooth copy experience with visual confirmation

### 📊 Added - Download Counter System
- **Real-Time Tracking**: Track download counts for all books
- **Dual Counter**: Count both authenticated and public share downloads
- **Dashboard Display**: Show download statistics in book cards
- **Share Analytics**: Display download stats on public share pages
- **Database Schema**: New `download_count` column with automatic incrementing

### 🔧 Enhanced - Backend Improvements
- **Multi-File Upload**: Support for simultaneous book and cover file upload
- **Database Migration**: Automatic column addition for existing databases
- **API Enhancement**: Updated share API to include cover and download data
- **File Validation**: Enhanced security with multi-field file validation
- **Error Handling**: Improved error messages and validation feedback

### 🎨 Enhanced - Frontend Improvements
- **Upload Component**: Redesigned upload form with cover image support
- **Dashboard Grid**: Enhanced book cards with cover images and download counters
- **Share Interface**: Improved share dialog with copy functionality
- **Visual Design**: Better layout and styling for new features
- **Responsive Design**: Mobile-friendly cover image display

### 🔐 Enhanced - Security & Performance
- **File Type Security**: Enhanced MIME type validation for images
- **Input Validation**: Comprehensive validation for all file types
- **Performance**: Optimized database queries for cover and counter data
- **Memory Management**: Proper cleanup of uploaded files on errors

## [1.0.0] - 2024-08-20

### Added - Initial Release
- **Core Features**: Complete book management system
- **Authentication**: JWT-based user authentication with roles
- **File Upload**: PDF and EPUB file upload with validation
- **Shareable Links**: Public sharing system with expiration options
- **Search & Filter**: Full-text search and filtering capabilities
- **Docker Support**: Complete containerization setup
- **Security**: Comprehensive security features and rate limiting
- **API**: RESTful API with proper authentication
- **Database**: SQLite database with optimized schema
- **Frontend**: React-based user interface with Material-UI

### Security
- JWT authentication with algorithm whitelisting
- Rate limiting for authentication endpoints
- File type and size validation
- Input sanitization and validation
- Security headers implementation

### Performance
- Database indexing for optimal queries
- Pagination support for large collections
- Efficient file handling and storage
- Optimized API responses

---

## Migration Guide

### From v1.x to v2.0

#### Database Changes
The database will automatically migrate when you start the new version:
- New `cover_image` column added to books table
- New `download_count` column added to books table

#### API Changes
- `POST /api/books/upload` now accepts optional `cover` file field
- `GET /api/share/:token` now returns `cover_image` and `download_count`
- All existing endpoints remain backward compatible

#### Frontend Changes
- Upload form now includes cover image upload section
- Book cards display cover images when available
- Download counters shown in dashboard and share pages

No breaking changes - existing functionality remains unchanged.

---

## Upcoming Features

### v2.1.0 (Planned)
- [ ] Bulk upload functionality
- [ ] Book categories and tags system
- [ ] Advanced search filters
- [ ] User profile management
- [ ] Reading progress tracking

### v2.2.0 (Planned)
- [ ] Mobile app (React Native)
- [ ] Backup and restore functionality
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Theme customization

---

**For detailed installation and usage instructions, see [README.md](README.md) and [DEPLOYMENT.md](DEPLOYMENT.md)**