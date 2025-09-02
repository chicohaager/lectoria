# Changelog

All notable changes to Lectoria BookManager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.1] - 2025-08-26

### 🚀 Added - Progressive Web App (PWA) Support
- **PWA Installation**: Install Lectoria as native app on mobile and desktop
- **Offline Capabilities**: Service worker for offline functionality
- **Browser Support**: Manual installation instructions for Chrome, Safari, Firefox
- **Cache Management**: Smart caching strategies for better performance

### 🔄 Changed - Database Migration
- **SQLite Database**: Simplified deployment with embedded SQLite database
- **Docker Setup**: Streamlined Docker configuration without external database
- **Documentation**: Updated all docs to reflect SQLite usage
- **Build Process**: Improved Dockerfile for proper frontend asset compilation

### 🐛 Fixed
- **PWA Installation**: Fixed install prompts across different browsers
- **ESLint Warnings**: Resolved unused variable warnings in React components
- **Docker Build**: Corrected build order for frontend assets

### ❌ Removed
- **PostgreSQL References**: Removed all PostgreSQL dependencies and configuration
- **Legacy Files**: Cleaned up old database references

## [2.3.0] - 2025-08-25

### 🌍 Added - Complete Multilingual Support (14 Languages!)
- **12 New Languages Added**: Expanded from 2 to 14 fully supported languages
- **Complete UI Translations**: Every interface element, admin panel, and message translated
- **Languages Supported**:
  - 🇺🇸 English (en)
  - 🇩🇪 German/Deutsch (de)
  - 🇫🇷 French/Français (fr)
  - 🇪🇸 Spanish/Español (es)
  - 🇮🇹 Italian/Italiano (it)
  - 🇵🇹 Portuguese/Português (pt)
  - 🇳🇱 Dutch/Nederlands (nl)
  - 🇷🇺 Russian/Русский (ru)
  - 🇵🇱 Polish/Polski (pl)
  - 🇹🇷 Turkish/Türkçe (tr)
  - 🇨🇳 Chinese/中文 (zh)
  - 🇯🇵 Japanese/日本語 (ja)
  - 🇰🇷 Korean/한국어 (ko)
  - 🇸🇦 Arabic/العربية (ar)

### 🎯 Enhanced - Localization Features
- **Dynamic Date Formatting**: Dates now display in selected language format
- **Language Selector**: Easy language switching from navbar with flag icons
- **Persistent Language**: User language preference saved in localStorage
- **Complete Admin Translation**: All admin interface text properly translated
- **PWA Installation Guide**: Localized installation instructions for each language

### 🔧 Fixed - Translation Issues
- **Date Localization Bug**: Fixed hardcoded German dates in admin interface
- **Missing Translation Keys**: Added all missing admin panel translations
- **Italian Translation**: Corrected mixed German-Italian text in admin tables
- **Duplicate Keys**: Removed duplicate translation keys in Russian section

### 📦 Enhanced - Docker Support
- **Frontend Build**: Dockerfile now properly builds frontend with translations
- **Multi-stage Build**: Optimized Docker build process for production
- **ZimaOS Compatibility**: Maintained compatibility with ZimaOS deployment

## [2.2.0] - 2025-08-24

### 🌍 Added - Database-Driven Multilingual System
- **Scalable Translation Architecture**: Database tables for translations & category translations
- **Automatic Content Migration**: Existing 12 German categories migrated to DE/EN
- **Dynamic Language Switching**: Categories adapt automatically to user language preference
- **Admin Translation Management**: REST APIs for adding/editing translations
- **Complete Interface Translation**: All German admin text replaced with translation keys

### 🔧 Added - Translation APIs
- `GET /api/categories/translated?lang=en` - Categories with translations
- `GET /api/translations/:key` - Individual translation retrieval  
- `POST /api/translations` - Create/update translations (admin only)
- `GET /api/translations` - List all translations for language (admin only)

### 📊 Enhanced - Database Architecture  
- **New Tables**: `translations`, `category_translations` with UUID foreign keys
- **Migration System**: Automatic translation migration with fallback support
- **Query Optimization**: Efficient JOIN queries for translated content
- **Data Integrity**: Proper foreign key constraints and cascading deletes

### 🎯 Enhanced - User Experience
- **Real-time Language Switch**: UI updates immediately when language changes
- **Fallback System**: Graceful degradation when translations are missing
- **Category Localization**: Names and descriptions adapt to user language
- **Future-Ready**: Easy addition of new languages without code changes

### 🔒 Technical Improvements
- **SQLite Optimization**: Optimized queries for embedded database
- **API Security**: Translation management restricted to admin users
- **Error Handling**: Comprehensive error handling for translation failures
- **Memory Efficiency**: Optimized translation loading and caching

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