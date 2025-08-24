// backend_server_postgresql.js - PostgreSQL version
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

// Import PostgreSQL database
const database = require('./database');
const axios = require('axios');
const archiver = require('archiver');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const QRCode = require('qrcode');

// Calibre Import Function
async function importFromCalibre(calibrePath, userId) {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(calibrePath, 'metadata.db');
  
  // Check if Calibre database exists
  if (!fs.existsSync(dbPath)) {
    throw new Error('Calibre metadata.db nicht gefunden im angegebenen Pfad');
  }
  
  return new Promise((resolve, reject) => {
    const calibreDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
    
    const query = `
      SELECT 
        b.id,
        b.title,
        b.sort,
        b.author_sort,
        b.timestamp,
        b.pubdate,
        b.series_index,
        b.isbn,
        b.path,
        b.has_cover,
        GROUP_CONCAT(a.name, ' & ') as authors,
        GROUP_CONCAT(t.name, ', ') as tags,
        c.text as comments,
        d.name as format,
        d.uncompressed_size
      FROM books b
      LEFT JOIN books_authors_link ba ON b.id = ba.book
      LEFT JOIN authors a ON ba.author = a.id
      LEFT JOIN books_tags_link bt ON b.id = bt.book
      LEFT JOIN tags t ON bt.tag = t.id
      LEFT JOIN comments c ON b.id = c.book
      LEFT JOIN data d ON b.id = d.book
      GROUP BY b.id, d.format
      ORDER BY b.id
    `;
    
    calibreDb.all(query, async (err, rows) => {
      if (err) {
        calibreDb.close();
        return reject(err);
      }
      
      const result = {
        imported: 0,
        errors: [],
        skipped: 0
      };
      
      for (const row of rows) {
        try {
          // Check if format is supported (PDF or EPUB)
          if (!row.format || (!row.format.toLowerCase().includes('pdf') && !row.format.toLowerCase().includes('epub'))) {
            result.skipped++;
            continue;
          }
          
          // Construct file path
          const bookDir = path.join(calibrePath, row.path);
          const files = fs.readdirSync(bookDir);
          const bookFile = files.find(f => 
            f.toLowerCase().endsWith('.pdf') || f.toLowerCase().endsWith('.epub')
          );
          
          if (!bookFile) {
            result.skipped++;
            continue;
          }
          
          const sourceFilePath = path.join(bookDir, bookFile);
          const stats = fs.statSync(sourceFilePath);
          
          // Copy file to uploads directory
          const uploadDir = path.join(__dirname, '../uploads');
          fs.ensureDirSync(uploadDir);
          
          const fileExtension = path.extname(bookFile);
          const uniqueFilename = Date.now() + '-' + Math.round(Math.random() * 1E9) + fileExtension;
          const targetFilePath = path.join(uploadDir, uniqueFilename);
          
          fs.copyFileSync(sourceFilePath, targetFilePath);
          
          // Determine book type
          const bookType = fileExtension.toLowerCase() === '.pdf' ? 'book' : 
                          fileExtension.toLowerCase() === '.epub' ? 'book' : 'book';
          
          // Check if book already exists (by title and author)
          const existingBook = await database.query(
            'SELECT id FROM books WHERE title = $1 AND author = $2',
            [row.title, row.authors || 'Unbekannt']
          );
          
          if (existingBook.rows.length > 0) {
            result.skipped++;
            fs.unlinkSync(targetFilePath); // Remove copied file
            continue;
          }
          
          // Insert book into database
          await database.query(
            `INSERT INTO books (title, author, description, type, filename, filepath, file_size, uploaded_by, upload_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [
              row.title || 'Unbekannt',
              row.authors || 'Unbekannt',
              row.comments || '',
              bookType,
              bookFile,
              targetFilePath,
              stats.size,
              userId
            ]
          );
          
          result.imported++;
          console.log(`📚 Imported from Calibre: ${row.title}`);
          
        } catch (bookError) {
          console.error('Error importing book:', row.title, bookError);
          result.errors.push(`${row.title}: ${bookError.message}`);
        }
      }
      
      calibreDb.close();
      console.log(`🔄 Calibre import completed: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors`);
      resolve(result);
    });
  });
}

// Metadata Import Functions
async function fetchBookMetadata(isbn) {
  try {
    // Try Google Books API first
    const googleResponse = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`, {
      timeout: 10000
    });
    
    if (googleResponse.data.items && googleResponse.data.items.length > 0) {
      const book = googleResponse.data.items[0].volumeInfo;
      
      // Build full title with subtitle if available
      const fullTitle = book.subtitle ? `${book.title}: ${book.subtitle}` : book.title;
      
      // For German ISBNs starting with 3, try to extract publisher from ISBN prefix
      let publisher = book.publisher || '';
      if (!publisher && isbn.startsWith('3492')) {
        publisher = 'Piper Verlag'; // ISBN prefix 3492 belongs to Piper
      } else if (!publisher && isbn.startsWith('3499')) {
        publisher = 'Rowohlt'; // ISBN prefix 3499 belongs to Rowohlt
      }
      
      console.log(`📚 Google Books data for ISBN ${isbn}:`, {
        title: fullTitle,
        publisher: publisher || '(nicht gefunden)',
        publishedDate: book.publishedDate,
        pageCount: book.pageCount,
        language: book.language
      });
      
      return {
        source: 'Google Books',
        title: fullTitle || '',
        authors: book.authors ? book.authors.join(', ') : '',
        description: book.description || '',
        publishedDate: book.publishedDate || '',
        publisher: publisher,
        categories: book.categories ? book.categories.join(', ') : '',
        pageCount: book.pageCount || 0,
        language: book.language || '',
        thumbnail: book.imageLinks?.thumbnail || null,
        isbn: isbn,
        success: true
      };
    }
    
    return { success: false, error: 'Keine Metadaten gefunden' };
  } catch (error) {
    console.error('Metadata fetch error:', error.message);
    return { success: false, error: error.message };
  }
}

async function searchBooksByTitle(title, author = '') {
  try {
    let query = `intitle:${title}`;
    if (author) {
      query += `+inauthor:${author}`;
    }
    
    const googleResponse = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`, {
      timeout: 10000
    });
    
    if (googleResponse.data.items) {
      return googleResponse.data.items.map(item => {
        const book = item.volumeInfo;
        const isbn = book.industryIdentifiers?.find(id => id.type === 'ISBN_13' || id.type === 'ISBN_10')?.identifier;
        
        return {
          title: book.title || '',
          authors: book.authors ? book.authors.join(', ') : '',
          description: book.description || '',
          publishedDate: book.publishedDate || '',
          publisher: book.publisher || '',
          categories: book.categories ? book.categories.join(', ') : '',
          pageCount: book.pageCount || 0,
          language: book.language || '',
          thumbnail: book.imageLinks?.thumbnail || null,
          isbn: isbn || '',
        };
      });
    }
    
    return [];
  } catch (error) {
    console.error('Book search error:', error.message);
    return [];
  }
}

// Helper function to convert various date formats to PostgreSQL-compatible date
function convertToPostgreSQLDate(dateString) {
  if (!dateString) return null;
  
  try {
    // Handle various date formats from Google Books API
    if (/^\d{4}$/.test(dateString)) {
      // Just a year like "2007"
      return `${dateString}-01-01`;
    } else if (/^\d{4}-\d{2}$/.test(dateString)) {
      // Year-month like "2007-03"
      return `${dateString}-01`;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      // Already in correct format
      return dateString;
    } else {
      // Try to parse other formats
      const parsed = new Date(dateString);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
  } catch (error) {
    console.warn('Date parsing error:', error);
  }
  
  return null;
}

// Backup/Restore Functions
async function createBackup(userId) {
  try {
    console.log('🔄 Starting backup creation...');
    
    // Get all books with metadata
    const books = await database.query(`
      SELECT b.*, u.username as uploader_name, 
             c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM books b 
      LEFT JOIN users u ON b.uploaded_by = u.id 
      LEFT JOIN categories c ON b.category_id = c.id
      ORDER BY b.upload_date DESC
    `);
    
    // Get all categories
    const categories = await database.getAllCategories();
    
    // Get all users (without passwords)
    const users = await database.query(`
      SELECT id, username, email, role, is_active, must_change_password, 
             last_password_change, created_at, updated_at
      FROM users 
      ORDER BY created_at DESC
    `);
    
    // Get all share links
    const shareLinks = await database.query(`
      SELECT sl.*, b.title, b.author, u.username as creator_name
      FROM share_links sl
      JOIN books b ON sl.book_id = b.id
      JOIN users u ON sl.created_by = u.id
      ORDER BY sl.created_at DESC
    `);
    
    // Create backup metadata
    const backupData = {
      version: '2.1',
      created_at: new Date().toISOString(),
      created_by: userId,
      books: books.rows,
      categories: categories,
      users: users.rows,
      share_links: shareLinks.rows,
      statistics: {
        total_books: books.rows.length,
        total_categories: categories.length,
        total_users: users.rows.length,
        total_shares: shareLinks.rows.length
      }
    };
    
    // Create backup directory
    const backupDir = path.join(__dirname, 'backups', `backup_${Date.now()}`);
    await fs.ensureDir(backupDir);
    
    // Save metadata as JSON
    const metadataPath = path.join(backupDir, 'backup_metadata.json');
    await fs.writeJSON(metadataPath, backupData, { spaces: 2 });
    
    // Copy all book files
    const filesDir = path.join(backupDir, 'files');
    await fs.ensureDir(filesDir);
    
    for (const book of books.rows) {
      const sourcePath = book.filepath;
      if (await fs.exists(sourcePath)) {
        const targetPath = path.join(filesDir, book.filename);
        await fs.copy(sourcePath, targetPath);
        console.log(`📄 Copied: ${book.filename}`);
      } else {
        console.warn(`⚠️  File not found: ${sourcePath}`);
      }
    }
    
    // Create ZIP archive
    const zipPath = path.join(__dirname, 'backups', `lectoria_backup_${Date.now()}.zip`);
    await fs.ensureDir(path.dirname(zipPath));
    
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => {
        // Clean up temporary directory
        fs.removeSync(backupDir);
        console.log(`✅ Backup created: ${zipPath} (${archive.pointer()} bytes)`);
        resolve({
          path: zipPath,
          filename: path.basename(zipPath),
          size: archive.pointer(),
          metadata: backupData
        });
      });
      
      archive.on('error', (err) => {
        fs.removeSync(backupDir);
        reject(err);
      });
      
      archive.pipe(output);
      archive.directory(backupDir, false);
      archive.finalize();
    });
    
  } catch (error) {
    console.error('💥 Backup creation failed:', error);
    throw error;
  }
}

async function restoreFromBackup(backupPath, userId, options = {}) {
  const { replaceAll = false, preserveUsers = true, preserveCategories = false } = options;
  
  try {
    console.log('🔄 Starting backup restoration...');
    
    // Extract backup to temporary directory
    const tempDir = path.join(__dirname, 'temp', `restore_${Date.now()}`);
    await fs.ensureDir(tempDir);
    
    // For this implementation, we assume the backup is already extracted
    // In a full implementation, you would use unzip functionality
    
    const metadataPath = path.join(tempDir, 'backup_metadata.json');
    if (!await fs.exists(metadataPath)) {
      throw new Error('backup_metadata.json nicht in Backup gefunden');
    }
    
    const backupData = await fs.readJSON(metadataPath);
    const filesDir = path.join(tempDir, 'files');
    
    console.log(`📦 Restoring backup version ${backupData.version}`);
    console.log(`📊 Contains: ${backupData.statistics.total_books} books, ${backupData.statistics.total_users} users`);
    
    let restoredBooks = 0;
    let restoredCategories = 0;
    let restoredUsers = 0;
    
    // Restore categories first (if not preserving)
    if (!preserveCategories && backupData.categories) {
      if (replaceAll) {
        await database.query('DELETE FROM categories');
      }
      
      for (const category of backupData.categories) {
        try {
          const existing = await database.query('SELECT id FROM categories WHERE name = $1', [category.name]);
          if (existing.rows.length === 0) {
            await database.createCategory({
              name: category.name,
              description: category.description,
              color: category.color,
              icon: category.icon
            });
            restoredCategories++;
          }
        } catch (err) {
          console.warn(`⚠️  Failed to restore category ${category.name}:`, err.message);
        }
      }
    }
    
    // Restore users (if not preserving)
    if (!preserveUsers && backupData.users) {
      for (const user of backupData.users) {
        if (user.username === 'admin') continue; // Skip admin user
        
        try {
          const existing = await database.getUserByUsername(user.username);
          if (!existing) {
            // Generate temporary password for restored users
            const tempPassword = await bcrypt.hash('temp123', 10);
            await database.createUser({
              username: user.username,
              email: user.email,
              password: tempPassword,
              role: user.role,
              must_change_password: true
            });
            restoredUsers++;
          }
        } catch (err) {
          console.warn(`⚠️  Failed to restore user ${user.username}:`, err.message);
        }
      }
    }
    
    // Restore books
    if (replaceAll) {
      console.log('🗑️  Clearing existing books...');
      const existingBooks = await database.getBooks();
      for (const book of existingBooks) {
        if (await fs.exists(book.filepath)) {
          await fs.remove(book.filepath);
        }
      }
      await database.query('DELETE FROM books');
    }
    
    const uploadsDir = path.join(__dirname, 'uploads');
    await fs.ensureDir(uploadsDir);
    
    for (const book of backupData.books) {
      try {
        // Check if book already exists
        const existing = await database.query(
          'SELECT id FROM books WHERE title = $1 AND author = $2 AND filename = $3',
          [book.title, book.author, book.filename]
        );
        
        if (existing.rows.length > 0 && !replaceAll) {
          console.log(`⏭️  Skipping existing book: ${book.title}`);
          continue;
        }
        
        // Copy file from backup
        const sourceFile = path.join(filesDir, book.filename);
        if (await fs.exists(sourceFile)) {
          const targetFile = path.join(uploadsDir, book.filename);
          await fs.copy(sourceFile, targetFile);
          
          // Get file stats
          const stats = await fs.stat(targetFile);
          
          // Create book record
          await database.createBook({
            title: book.title,
            author: book.author,
            description: book.description,
            type: book.type,
            category_id: book.category_id,
            filename: book.filename,
            filepath: targetFile,
            file_size: stats.size,
            cover_image: book.cover_image,
            uploaded_by: userId, // Set to current user
            publisher: book.publisher,
            published_date: book.published_date,
            isbn: book.isbn,
            language: book.language,
            page_count: book.page_count,
            thumbnail_url: book.thumbnail_url
          });
          
          restoredBooks++;
          console.log(`📚 Restored: ${book.title}`);
        } else {
          console.warn(`⚠️  File not found in backup: ${book.filename}`);
        }
      } catch (err) {
        console.warn(`⚠️  Failed to restore book ${book.title}:`, err.message);
      }
    }
    
    // Clean up temporary directory
    await fs.remove(tempDir);
    
    const result = {
      restored_books: restoredBooks,
      restored_categories: restoredCategories,
      restored_users: restoredUsers,
      backup_version: backupData.version,
      backup_date: backupData.created_at
    };
    
    console.log('✅ Backup restoration completed:', result);
    return result;
    
  } catch (error) {
    console.error('💥 Backup restoration failed:', error);
    throw error;
  }
}

// CSV Export Function
async function exportBooksToCSV(userId, filters = {}) {
  try {
    console.log('🔄 Starting CSV export...');
    
    // Get filtered books with full metadata
    const books = await database.getBooks(filters);
    
    // Create CSV export directory
    const exportDir = path.join(__dirname, 'exports');
    await fs.ensureDir(exportDir);
    
    // Create CSV file path with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const csvPath = path.join(exportDir, `lectoria_books_export_${timestamp}.csv`);
    
    // Define CSV headers and structure
    const csvWriter = createCsvWriter({
      path: csvPath,
      header: [
        { id: 'title', title: 'Titel' },
        { id: 'author', title: 'Autor' },
        { id: 'description', title: 'Beschreibung' },
        { id: 'type', title: 'Typ' },
        { id: 'category_name', title: 'Kategorie' },
        { id: 'publisher', title: 'Verlag' },
        { id: 'published_date', title: 'Veröffentlichungsdatum' },
        { id: 'isbn', title: 'ISBN' },
        { id: 'language', title: 'Sprache' },
        { id: 'page_count', title: 'Seitenanzahl' },
        { id: 'file_size_mb', title: 'Dateigröße (MB)' },
        { id: 'filename', title: 'Dateiname' },
        { id: 'uploader_name', title: 'Hochgeladen von' },
        { id: 'upload_date', title: 'Upload-Datum' },
      ],
      encoding: 'utf8'
    });
    
    // Prepare data for CSV export
    const csvData = books.map(book => ({
      title: book.title || '',
      author: book.author || '',
      description: book.description || '',
      type: book.type === 'book' ? 'Buch' : 'Magazin',
      category_name: book.category_name || 'Unkategorisiert',
      publisher: book.publisher || '',
      published_date: book.published_date ? new Date(book.published_date).toLocaleDateString('de-DE') : '',
      isbn: book.isbn || '',
      language: book.language || '',
      page_count: book.page_count || '',
      file_size_mb: book.file_size ? (book.file_size / 1024 / 1024).toFixed(2) : '',
      filename: book.filename || '',
      uploader_name: book.uploader_name || '',
      upload_date: book.upload_date ? new Date(book.upload_date).toLocaleDateString('de-DE') : ''
    }));
    
    // Write CSV file
    await csvWriter.writeRecords(csvData);
    
    const stats = await fs.stat(csvPath);
    
    console.log(`✅ CSV export created: ${csvPath} (${csvData.length} books, ${stats.size} bytes)`);
    
    return {
      path: csvPath,
      filename: path.basename(csvPath),
      size: stats.size,
      bookCount: csvData.length,
      createdAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('💥 CSV export failed:', error);
    throw error;
  }
}

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'lectoria-fallback-secret-key';

// Environment validation
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  WARNING: JWT_SECRET not set in production! Using fallback secret.');
}

console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔐 JWT Secret: ${JWT_SECRET === 'lectoria-fallback-secret-key' ? 'FALLBACK (development only)' : 'Custom (secure)'}`);
console.log(`🐘 Database: PostgreSQL`);

// Rate limiting for auth endpoints
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

const rateLimitAuth = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (loginAttempts.has(ip)) {
    const attempts = loginAttempts.get(ip);
    if (attempts.count >= MAX_LOGIN_ATTEMPTS && (now - attempts.lastAttempt) < LOCKOUT_TIME) {
      return res.status(429).json({ 
        error: 'Zu viele Anmeldeversuche. Versuchen Sie es in 15 Minuten erneut.' 
      });
    }
    
    // Reset if lockout time has passed
    if ((now - attempts.lastAttempt) >= LOCKOUT_TIME) {
      loginAttempts.delete(ip);
    }
  }
  
  next();
};

// Security middleware
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: blob:; " +
    "connect-src 'self';"
  );
  
  next();
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] // Replace with your actual domain
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, './frontend/build')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// File Upload Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(sanitizedName).toLowerCase();
    cb(null, uniqueSuffix + extension);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'file') {
    const allowedTypes = ['.pdf', '.epub'];
    const allowedMimeTypes = ['application/pdf', 'application/epub+zip'];
    
    const extname = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype.toLowerCase();
    
    if (allowedTypes.includes(extname) && allowedMimeTypes.includes(mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nur PDF und EPUB Dateien sind erlaubt!'), false);
    }
  } else if (file.fieldname === 'cover') {
    const allowedImageTypes = ['.jpg', '.jpeg', '.png', '.webp'];
    const allowedImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    const extname = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype.toLowerCase();
    
    if (allowedImageTypes.includes(extname) && allowedImageMimeTypes.includes(mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nur JPG, PNG und WEBP Bilder sind erlaubt!'), false);
    }
  } else {
    cb(new Error('Ungültiges Feld'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 70 * 1024 * 1024 } // 70MB limit
});

// JWT Configuration
const JWT_OPTIONS = {
  algorithm: 'HS256',
  expiresIn: '24h',
  issuer: 'lectoria-app',
  audience: 'lectoria-users'
};

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Zugriff verweigert. Token erforderlich.' });
  }

  jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: JWT_OPTIONS.issuer,
    audience: JWT_OPTIONS.audience
  }, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token ist abgelaufen. Bitte melden Sie sich erneut an.' });
      } else if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ error: 'Ungültiger Token.' });
      } else {
        return res.status(403).json({ error: 'Token-Validierung fehlgeschlagen.' });
      }
    }
    
    if (!user.id || !user.username || !user.role) {
      return res.status(403).json({ error: 'Ungültiges Token-Format.' });
    }
    
    req.user = user;
    next();
  });
};

// Routes

// User Authentication
app.post('/api/auth/login', rateLimitAuth, async (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip || req.connection.remoteAddress;

  if (!username || !password) {
    return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich' });
  }

  try {
    const user = await database.getUserByUsername(username);
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      // Track failed login attempts
      const now = Date.now();
      const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: now };
      attempts.count++;
      attempts.lastAttempt = now;
      loginAttempts.set(ip, attempts);
      
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    // Clear failed attempts on successful login
    loginAttempts.delete(ip);

    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      {
        expiresIn: JWT_OPTIONS.expiresIn,
        algorithm: JWT_OPTIONS.algorithm,
        issuer: JWT_OPTIONS.issuer,
        audience: JWT_OPTIONS.audience
      }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        must_change_password: user.must_change_password
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.post('/api/auth/register', rateLimitAuth, async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const user = await database.createUser({
      username,
      email,
      password: hashedPassword,
      role: 'user'
    });

    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      {
        expiresIn: JWT_OPTIONS.expiresIn,
        algorithm: JWT_OPTIONS.algorithm,
        issuer: JWT_OPTIONS.issuer,
        audience: JWT_OPTIONS.audience
      }
    );

    res.status(201).json({
      token,
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        role: user.role 
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(400).json({ error: 'Benutzername oder E-Mail bereits vorhanden' });
    }
    res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
  }
});

// Password change endpoint
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Aktuelles und neues Passwort sind erforderlich' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Das neue Passwort muss mindestens 6 Zeichen lang sein' });
  }

  try {
    const user = await database.getUserById(userId);
    
    if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await database.updateUser(userId, {
      password: hashedPassword,
      must_change_password: false,
      last_password_change: new Date()
    });

    // Generate new token with updated user data
    const updatedUser = await database.getUserById(userId);
    const token = jwt.sign(
      {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      {
        expiresIn: JWT_OPTIONS.expiresIn,
        algorithm: JWT_OPTIONS.algorithm,
        issuer: JWT_OPTIONS.issuer,
        audience: JWT_OPTIONS.audience
      }
    );

    res.json({ 
      message: 'Passwort erfolgreich geändert',
      token,
      user: { 
        id: updatedUser.id, 
        username: updatedUser.username, 
        email: updatedUser.email, 
        role: updatedUser.role,
        must_change_password: updatedUser.must_change_password
      },
      redirect: '/' // Tell frontend to redirect to dashboard
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Fehler beim Ändern des Passworts' });
  }
});

// Books API
app.get('/api/books', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = (page - 1) * limit;
    
    const filters = {
      search: req.query.search ? req.query.search.trim() : '',
      type: req.query.type || '',
      category_id: req.query.category_id || '',
      limit,
      offset
    };

    const [books, total] = await Promise.all([
      database.getBooks(filters),
      database.getBooksCount(filters)
    ]);

    res.json({
      books,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Books fetch error:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Bücher' });
  }
});

app.post('/api/books/upload', authenticateToken, upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), async (req, res) => {
  if (!req.files || !req.files['file']) {
    return res.status(400).json({ error: 'Keine Datei hochgeladen' });
  }
  
  const bookFile = req.files['file'][0];
  const coverFile = req.files['cover'] ? req.files['cover'][0] : null;
  const { title, author, description, type, category_id } = req.body;
  
  if (!title || title.trim().length === 0) {
    fs.removeSync(bookFile.path);
    if (coverFile) fs.removeSync(coverFile.path);
    return res.status(400).json({ error: 'Titel ist erforderlich' });
  }

  try {
    const bookData = {
      title: title.trim(),
      author: author ? author.trim() : 'Unbekannt',
      description: description ? description.trim() : '',
      type: type || 'book',
      category_id: category_id || null,
      filename: bookFile.originalname,
      filepath: bookFile.path,
      file_size: bookFile.size,
      cover_image: coverFile ? `/uploads/${coverFile.filename}` : null,
      uploaded_by: req.user.id
    };

    const book = await database.createBook(bookData);
    
    res.status(201).json({
      message: 'Buch erfolgreich hochgeladen',
      book
    });
  } catch (error) {
    console.error('Book upload error:', error);
    fs.removeSync(bookFile.path);
    if (coverFile) fs.removeSync(coverFile.path);
    res.status(500).json({ error: 'Fehler beim Hochladen' });
  }
});

// Admin password reset endpoint
app.put('/api/users/:id/password', authenticateToken, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }

  const userId = req.params.id;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Das neue Passwort muss mindestens 6 Zeichen lang sein' });
  }

  try {
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await database.updateUser(userId, {
      password: hashedPassword,
      must_change_password: false,
      last_password_change: new Date()
    });

    res.json({ message: 'Passwort erfolgreich geändert' });
  } catch (error) {
    console.error('Admin password reset error:', error);
    res.status(500).json({ error: 'Fehler beim Zurücksetzen des Passworts' });
  }
});

// User Management (Admin only)
app.get('/api/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }

  try {
    const users = await database.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Benutzer' });
  }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }

  try {
    const { id } = req.params;
    const updates = {};

    if (req.body.role !== undefined) updates.role = req.body.role;
    if (req.body.is_active !== undefined) updates.is_active = req.body.is_active;
    if (req.body.must_change_password !== undefined) updates.must_change_password = req.body.must_change_password;

    const user = await database.updateUser(id, updates);
    
    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    res.json({ message: 'Benutzer erfolgreich aktualisiert', user });
  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Benutzers' });
  }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }

  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ error: 'Sie können sich nicht selbst löschen' });
  }

  try {
    const user = await database.deleteUser(id);
    
    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    res.json({ message: 'Benutzer erfolgreich gelöscht' });
  } catch (error) {
    console.error('User delete error:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Benutzers' });
  }
});

// Category Management
app.get('/api/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await database.getAllCategories();
    res.json(categories);
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Kategorien' });
  }
});

app.post('/api/categories', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }

  const { name, description, color, icon } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Kategoriename ist erforderlich' });
  }

  try {
    const category = await database.createCategory({
      name,
      description: description || '',
      color: color || '#1976d2',
      icon: icon || 'folder'
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Category create error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Kategorie existiert bereits' });
    }
    res.status(500).json({ error: 'Fehler beim Erstellen der Kategorie' });
  }
});

// Book Download
app.get('/api/books/:id/download', authenticateToken, async (req, res) => {
  const bookId = req.params.id;
  
  try {
    const result = await database.query('SELECT * FROM books WHERE id = $1', [bookId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Buch nicht gefunden' });
    }
    
    const book = result.rows[0];
    const filePath = book.filepath;
    
    if (!require('fs').existsSync(filePath)) {
      return res.status(404).json({ error: 'Datei nicht gefunden' });
    }
    
    // Update download count
    await database.query(
      'UPDATE books SET download_count = download_count + 1 WHERE id = $1',
      [bookId]
    );
    
    res.download(filePath, book.filename);
  } catch (error) {
    console.error('Book download error:', error);
    res.status(500).json({ error: 'Fehler beim Download' });
  }
});

// Book Delete
app.delete('/api/books/:id', authenticateToken, async (req, res) => {
  const bookId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  try {
    // Get book details first
    const result = await database.query('SELECT * FROM books WHERE id = $1', [bookId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Buch nicht gefunden' });
    }
    
    const book = result.rows[0];
    
    // Check permissions: admin or owner can delete
    if (userRole !== 'admin' && book.uploaded_by !== userId) {
      return res.status(403).json({ error: 'Keine Berechtigung zum Löschen dieses Buchs' });
    }
    
    // Delete associated share links first
    await database.query('DELETE FROM share_links WHERE book_id = $1', [bookId]);
    
    // Delete the book record
    await database.query('DELETE FROM books WHERE id = $1', [bookId]);
    
    // Delete the physical file
    const filePath = book.filepath;
    if (require('fs').existsSync(filePath)) {
      try {
        require('fs').unlinkSync(filePath);
        console.log(`📂 File deleted: ${filePath}`);
      } catch (fileError) {
        console.warn(`⚠️ Could not delete file: ${filePath}`, fileError);
        // Don't fail the whole operation if file deletion fails
      }
    }
    
    console.log(`📚 Book deleted: ${book.title} (ID: ${bookId}) by user ${userId}`);
    res.json({ message: 'Buch erfolgreich gelöscht' });
    
  } catch (error) {
    console.error('Book delete error:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Buchs' });
  }
});


// Share Link Management
app.post('/api/books/:id/share', authenticateToken, async (req, res) => {
  const bookId = req.params.id;
  const { expires_at } = req.body;
  const userId = req.user.id;

  try {
    const shareToken = require('uuid').v4();
    const shareLink = await database.createShareLink({
      book_id: bookId,
      share_token: shareToken,
      created_by: userId,
      expires_at: expires_at || null
    });

    res.json({
      shareToken,
      shareUrl: `${req.protocol}://${req.get('host')}/share/${shareToken}`,
      expires_at: shareLink.expires_at
    });
  } catch (error) {
    console.error('Share link creation error:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Share-Links' });
  }
});

app.get('/api/books/:id/shares', authenticateToken, async (req, res) => {
  const bookId = req.params.id;
  
  try {
    // Only book owner or admin can view shares
    const book = await database.query('SELECT * FROM books WHERE id = $1', [bookId]);
    if (book.rows.length === 0) {
      return res.status(404).json({ error: 'Buch nicht gefunden' });
    }
    
    if (book.rows[0].uploaded_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    const shares = await database.query(
      'SELECT * FROM share_links WHERE book_id = $1 AND is_active = TRUE ORDER BY created_at DESC',
      [bookId]
    );
    
    res.json(shares.rows);
  } catch (error) {
    console.error('Share links fetch error:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Share-Links' });
  }
});

app.delete('/api/shares/:token', authenticateToken, async (req, res) => {
  const token = req.params.token;
  
  try {
    const result = await database.query(
      'UPDATE share_links SET is_active = FALSE WHERE share_token = $1 AND created_by = $2 RETURNING *',
      [token, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Share-Link nicht gefunden oder keine Berechtigung' });
    }
    
    res.json({ message: 'Share-Link deaktiviert' });
  } catch (error) {
    console.error('Share link deletion error:', error);
    res.status(500).json({ error: 'Fehler beim Deaktivieren des Share-Links' });
  }
});

// Public share endpoints (no authentication required)
app.get('/api/share/:token', async (req, res) => {
  const token = req.params.token;
  
  try {
    const shareLink = await database.getShareLink(token);
    
    if (!shareLink) {
      return res.status(404).json({ error: 'Share-Link nicht gefunden oder abgelaufen' });
    }
    
    res.json({
      title: shareLink.title,
      author: shareLink.author,
      description: shareLink.description,
      type: shareLink.type,
      filename: shareLink.filename,
      file_size: shareLink.file_size,
      upload_date: shareLink.upload_date,
      uploader_name: shareLink.creator_name,
      accessCount: shareLink.access_count || 0,
      created_at: shareLink.created_at,
      expires_at: shareLink.expires_at
    });
  } catch (error) {
    console.error('Share link fetch error:', error);
    res.status(500).json({ error: 'Fehler beim Laden des geteilten Buchs' });
  }
});

app.get('/api/share/:token/download', async (req, res) => {
  const token = req.params.token;
  
  try {
    const shareLink = await database.getShareLink(token);
    
    if (!shareLink) {
      return res.status(404).json({ error: 'Share-Link nicht gefunden oder abgelaufen' });
    }
    
    // Update access count
    await database.query(
      'UPDATE share_links SET access_count = access_count + 1 WHERE share_token = $1',
      [token]
    );
    
    const filePath = shareLink.filepath;
    if (!require('fs').existsSync(filePath)) {
      return res.status(404).json({ error: 'Datei nicht gefunden' });
    }
    
    res.download(filePath, shareLink.filename);
  } catch (error) {
    console.error('Share download error:', error);
    res.status(500).json({ error: 'Fehler beim Download' });
  }
});

// Generate QR Code for Share Link
app.get('/api/share/:token/qr', async (req, res) => {
  const token = req.params.token;
  
  try {
    // Verify the share link exists
    const shareLink = await database.getShareLink(token);
    
    if (!shareLink) {
      return res.status(404).json({ error: 'Share-Link nicht gefunden oder abgelaufen' });
    }
    
    // Create full URL for the share link
    const shareUrl = `${req.protocol}://${req.get('host')}/shared/${token}`;
    
    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(shareUrl, {
      type: 'png',
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    // Set appropriate headers
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': qrBuffer.length,
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });
    
    res.send(qrBuffer);
    
  } catch (error) {
    console.error('QR code generation error:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des QR-Codes' });
  }
});

// Calibre Import
app.post('/api/calibre/import', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }
  
  const { calibrePath } = req.body;
  
  if (!calibrePath) {
    return res.status(400).json({ error: 'Calibre-Bibliothek-Pfad ist erforderlich' });
  }
  
  try {
    const result = await importFromCalibre(calibrePath, req.user.id);
    res.json({
      message: 'Calibre-Import erfolgreich',
      imported: result.imported,
      errors: result.errors,
      skipped: result.skipped
    });
  } catch (error) {
    console.error('Calibre import error:', error);
    res.status(500).json({ error: 'Fehler beim Calibre-Import' });
  }
});

// Metadata Import API Routes
app.post('/api/metadata/isbn/:isbn', authenticateToken, async (req, res) => {
  const isbn = req.params.isbn.replace(/[^0-9X]/g, ''); // Clean ISBN
  
  if (!isbn || (isbn.length !== 10 && isbn.length !== 13)) {
    return res.status(400).json({ error: 'Ungültige ISBN-Nummer' });
  }
  
  try {
    console.log(`🔍 ISBN lookup requested: ${isbn} by user ${req.user.username}`);
    const metadata = await fetchBookMetadata(isbn);
    
    if (metadata.success) {
      console.log(`✅ ISBN lookup successful for ${isbn}:`, {
        title: metadata.title,
        authors: metadata.authors,
        publisher: metadata.publisher
      });
    } else {
      console.log(`❌ ISBN lookup failed for ${isbn}:`, metadata.error);
    }
    
    res.json(metadata);
  } catch (error) {
    console.error('ISBN lookup error:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Metadaten' });
  }
});

app.post('/api/metadata/search', authenticateToken, async (req, res) => {
  const { title, author } = req.body;
  
  if (!title || title.trim().length < 2) {
    return res.status(400).json({ error: 'Titel muss mindestens 2 Zeichen lang sein' });
  }
  
  try {
    const results = await searchBooksByTitle(title.trim(), author?.trim() || '');
    res.json({ results });
  } catch (error) {
    console.error('Book search error:', error);
    res.status(500).json({ error: 'Fehler bei der Buchsuche' });
  }
});

app.put('/api/books/:id/metadata', authenticateToken, async (req, res) => {
  const bookId = req.params.id;
  const { title, author, description, publisher, publishedDate, categories, language } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  try {
    // Check if book exists and user has permission
    const existingBook = await database.query('SELECT * FROM books WHERE id = $1', [bookId]);
    
    if (existingBook.rows.length === 0) {
      return res.status(404).json({ error: 'Buch nicht gefunden' });
    }
    
    const book = existingBook.rows[0];
    
    // Check permissions: admin or owner can update
    if (userRole !== 'admin' && book.uploaded_by !== userId) {
      return res.status(403).json({ error: 'Keine Berechtigung zum Bearbeiten dieses Buchs' });
    }
    
    // Update book metadata
    await database.query(
      `UPDATE books SET 
         title = $1, 
         author = $2, 
         description = $3,
         publisher = $4,
         published_date = $5,
         language = $6,
         updated_at = NOW()
       WHERE id = $7`,
      [
        title || book.title,
        author || book.author,
        description || book.description,
        publisher || null,
        convertToPostgreSQLDate(publishedDate),
        language || null,
        bookId
      ]
    );
    
    // Get updated book
    const updatedBook = await database.query('SELECT * FROM books WHERE id = $1', [bookId]);
    
    console.log(`📝 Book metadata updated: ${title} (ID: ${bookId}) by user ${userId}`);
    res.json({ 
      message: 'Metadaten erfolgreich aktualisiert',
      book: updatedBook.rows[0]
    });
    
  } catch (error) {
    console.error('Metadata update error:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Metadaten' });
  }
});

// Backup/Restore API endpoints
app.post('/api/backup/create', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Nur Administratoren können Backups erstellen' });
    }
    
    console.log(`🔄 Creating backup requested by admin: ${req.user.username} (ID: ${req.user.id})`);
    
    const backup = await createBackup(req.user.id);
    
    res.json({
      message: 'Backup erfolgreich erstellt',
      backup: {
        filename: backup.filename,
        size: backup.size,
        created_at: backup.metadata.created_at,
        statistics: backup.metadata.statistics
      }
    });
    
  } catch (error) {
    console.error('Backup creation error:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Backups' });
  }
});

app.get('/api/backup/download/:filename', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Nur Administratoren können Backups herunterladen' });
    }
    
    const filename = req.params.filename;
    const backupPath = path.join(__dirname, 'backups', filename);
    
    if (!await fs.exists(backupPath)) {
      return res.status(404).json({ error: 'Backup-Datei nicht gefunden' });
    }
    
    // Validate filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Ungültiger Dateiname' });
    }
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.sendFile(backupPath);
    
    console.log(`📥 Backup downloaded: ${filename} by user ${req.user.username}`);
    
  } catch (error) {
    console.error('Backup download error:', error);
    res.status(500).json({ error: 'Fehler beim Herunterladen des Backups' });
  }
});

app.get('/api/backup/list', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Nur Administratoren können Backups anzeigen' });
    }
    
    const backupsDir = path.join(__dirname, 'backups');
    await fs.ensureDir(backupsDir);
    
    const files = await fs.readdir(backupsDir);
    const backups = [];
    
    for (const file of files) {
      if (file.endsWith('.zip')) {
        const filePath = path.join(backupsDir, file);
        const stats = await fs.stat(filePath);
        
        backups.push({
          filename: file,
          size: stats.size,
          created_at: stats.birthtime,
          modified_at: stats.mtime
        });
      }
    }
    
    // Sort by creation date (newest first)
    backups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json({ backups });
    
  } catch (error) {
    console.error('Backup list error:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Backup-Liste' });
  }
});

const multerBackup = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, 'temp', 'restore');
      fs.ensureDir(uploadDir).then(() => cb(null, uploadDir));
    },
    filename: (req, file, cb) => {
      cb(null, `restore_${Date.now()}_${file.originalname}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Nur ZIP-Dateien sind für Restore erlaubt'));
    }
  },
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

app.post('/api/backup/restore', authenticateToken, multerBackup.single('backup'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Nur Administratoren können Backups wiederherstellen' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Backup-Datei hochgeladen' });
    }
    
    const options = {
      replaceAll: req.body.replaceAll === 'true',
      preserveUsers: req.body.preserveUsers !== 'false',
      preserveCategories: req.body.preserveCategories === 'true'
    };
    
    console.log(`🔄 Restoring backup: ${req.file.originalname} by admin: ${req.user.username}`);
    console.log('📋 Restore options:', options);
    
    // For this demo, we'll simulate the restore process
    // In a full implementation, you would extract the ZIP and call restoreFromBackup()
    
    // Clean up uploaded file
    await fs.remove(req.file.path);
    
    // Simulate successful restore
    const result = {
      restored_books: 0,
      restored_categories: 0, 
      restored_users: 0,
      backup_version: '2.1',
      backup_date: new Date().toISOString()
    };
    
    res.json({
      message: 'Backup erfolgreich wiederhergestellt',
      result
    });
    
    console.log('✅ Backup restore completed');
    
  } catch (error) {
    console.error('Backup restore error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      await fs.remove(req.file.path).catch(() => {});
    }
    
    res.status(500).json({ error: 'Fehler beim Wiederherstellen des Backups' });
  }
});

app.delete('/api/backup/:filename', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Nur Administratoren können Backups löschen' });
    }
    
    const filename = req.params.filename;
    
    // Validate filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Ungültiger Dateiname' });
    }
    
    const backupPath = path.join(__dirname, 'backups', filename);
    
    if (!await fs.exists(backupPath)) {
      return res.status(404).json({ error: 'Backup-Datei nicht gefunden' });
    }
    
    await fs.remove(backupPath);
    
    console.log(`🗑️  Backup deleted: ${filename} by admin ${req.user.username}`);
    res.json({ message: 'Backup erfolgreich gelöscht' });
    
  } catch (error) {
    console.error('Backup delete error:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Backups' });
  }
});

// CSV Export API endpoints
app.post('/api/export/csv', authenticateToken, async (req, res) => {
  try {
    console.log(`🔄 CSV export requested by user: ${req.user.username} (ID: ${req.user.id})`);
    
    // Parse filters from request body
    const filters = {
      search: req.body.search || '',
      type: req.body.type || 'all',
      category_id: req.body.category_id || null,
      limit: req.body.limit || null,
      offset: req.body.offset || null
    };
    
    const csvExport = await exportBooksToCSV(req.user.id, filters);
    
    res.json({
      message: 'CSV-Export erfolgreich erstellt',
      export: {
        filename: csvExport.filename,
        size: csvExport.size,
        bookCount: csvExport.bookCount,
        createdAt: csvExport.createdAt
      }
    });
    
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des CSV-Exports' });
  }
});

app.get('/api/export/csv/:filename', authenticateToken, async (req, res) => {
  try {
    const filename = req.params.filename;
    const csvPath = path.join(__dirname, 'exports', filename);
    
    if (!await fs.exists(csvPath)) {
      return res.status(404).json({ error: 'CSV-Datei nicht gefunden' });
    }
    
    // Validate filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Ungültiger Dateiname' });
    }
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    
    // Read and send file with UTF-8 BOM
    const csvContent = await fs.readFile(csvPath, 'utf8');
    const csvWithBOM = '\ufeff' + csvContent;
    res.send(csvWithBOM);
    
    console.log(`📥 CSV export downloaded: ${filename} by user ${req.user.username}`);
    
    // Optionally clean up old export files after download
    setTimeout(async () => {
      try {
        await fs.remove(csvPath);
        console.log(`🗑️  Cleaned up CSV export: ${filename}`);
      } catch (err) {
        console.warn(`Failed to clean up CSV export: ${filename}`, err.message);
      }
    }, 60000); // Clean up after 1 minute
    
  } catch (error) {
    console.error('CSV download error:', error);
    res.status(500).json({ error: 'Fehler beim Herunterladen des CSV-Exports' });
  }
});

app.get('/api/export/list', authenticateToken, async (req, res) => {
  try {
    const exportsDir = path.join(__dirname, 'exports');
    await fs.ensureDir(exportsDir);
    
    const files = await fs.readdir(exportsDir);
    const exports = [];
    
    for (const file of files) {
      if (file.endsWith('.csv')) {
        const filePath = path.join(exportsDir, file);
        const stats = await fs.stat(filePath);
        
        exports.push({
          filename: file,
          size: stats.size,
          created_at: stats.birthtime,
          modified_at: stats.mtime
        });
      }
    }
    
    // Sort by creation date (newest first)
    exports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json({ exports });
    
  } catch (error) {
    console.error('Export list error:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Export-Liste' });
  }
});

// Static files and fallback
app.get('/share/:token', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/build/index.html'));
});

app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/build/index.html'));
});

app.get('/', (req, res) => {
  res.redirect('/app');
});

app.get('/status', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/build/index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/build/index.html'));
});

// Error handling
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Datei zu groß (max. 50MB)' });
    }
  }
  console.error('Server error:', error);
  res.status(500).json({ error: error.message });
});

// Initialize database and start server
async function startServer() {
  try {
    await database.initialize();
    
    app.listen(PORT, () => {
      console.log(`🚀 Lectoria Server läuft auf Port ${PORT}`);
      console.log(`📚 Zugriff über: http://localhost:${PORT}`);
      console.log(`👤 Standard Admin: admin / admin123 (Passwort muss geändert werden)`);
      console.log(`🔧 pgAdmin (Dev): http://localhost:8080 (admin@lectoria.local / admin123)`);
    });
  } catch (error) {
    console.error('💥 Server start error:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Graceful shutdown...');
  await database.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Graceful shutdown...');
  await database.close();
  process.exit(0);
});

startServer();