// server/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Environment validation
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  WARNING: JWT_SECRET not set in production! Using fallback secret.');
}

console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔐 JWT Secret: ${JWT_SECRET === 'fallback-secret-key' ? 'FALLBACK (development only)' : 'Custom (secure)'}`);

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
app.use(express.json({ limit: '10mb' })); // Prevent large JSON payloads
app.use(express.static(path.join(__dirname, './frontend/build')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Database Setup
const dbPath = path.join(__dirname, '../data/bookmanager.db');
fs.ensureDirSync(path.dirname(dbPath));
const db = new sqlite3.Database(dbPath);

// Initialize Database
db.serialize(() => {
  // Users table with password change tracking
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    must_change_password BOOLEAN DEFAULT 0,
    last_password_change DATETIME,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Books table with category support
  db.run(`CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    description TEXT,
    type TEXT NOT NULL,
    category_id TEXT,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    file_size INTEGER,
    cover_image TEXT,
    download_count INTEGER DEFAULT 0,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    uploaded_by TEXT,
    FOREIGN KEY (uploaded_by) REFERENCES users (id),
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
  )`);

  // Categories table
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#1976d2',
    icon TEXT DEFAULT 'folder',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Shareable links table
  db.run(`CREATE TABLE IF NOT EXISTS share_links (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    share_token TEXT UNIQUE NOT NULL,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    is_active BOOLEAN DEFAULT 1,
    access_count INTEGER DEFAULT 0,
    FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users (id)
  )`);

  // Create indexes for performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_books_uploaded_by ON books (uploaded_by)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_books_upload_date ON books (upload_date DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links (share_token)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_share_links_book_id ON share_links (book_id)`);

  // Add columns if they don't exist (for existing databases)
  db.run(`PRAGMA table_info(books)`, [], function(err) {
    if (!err) {
      db.all(`PRAGMA table_info(books)`, [], (err, columns) => {
        const columnNames = columns.map(col => col.name);
        
        if (!columnNames.includes('cover_image')) {
          db.run(`ALTER TABLE books ADD COLUMN cover_image TEXT`);
          console.log('✅ Added cover_image column to books table');
        }
        
        if (!columnNames.includes('download_count')) {
          db.run(`ALTER TABLE books ADD COLUMN download_count INTEGER DEFAULT 0`);
          console.log('✅ Added download_count column to books table');
        }
      });
    }
  });

  // Create default admin user with password change requirement
  const defaultAdmin = {
    id: uuidv4(),
    username: 'admin',
    email: 'admin@bookmanager.com',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    must_change_password: 1
  };

  db.get("SELECT * FROM users WHERE username = ?", ['admin'], (err, row) => {
    if (err) {
      console.error('Error checking for admin user:', err);
      return;
    }
    
    if (!row) {
      db.run(
        "INSERT INTO users (id, username, email, password, role, must_change_password) VALUES (?, ?, ?, ?, ?, ?)",
        [defaultAdmin.id, defaultAdmin.username, defaultAdmin.email, defaultAdmin.password, defaultAdmin.role, defaultAdmin.must_change_password],
        function(err) {
          if (err) {
            console.error('Error creating default admin user:', err);
          } else {
            console.log('✅ Default admin user created successfully (password change required on first login)');
          }
        }
      );
    }
  });

  // Create default categories
  const defaultCategories = [
    { id: uuidv4(), name: 'Romane', description: 'Belletristik und Unterhaltung', color: '#e91e63', icon: 'auto_stories' },
    { id: uuidv4(), name: 'Sachbücher', description: 'Fach- und Sachbücher', color: '#2196f3', icon: 'school' },
    { id: uuidv4(), name: 'Zeitschriften', description: 'Magazine und Periodika', color: '#4caf50', icon: 'article' },
    { id: uuidv4(), name: 'Wissenschaft', description: 'Wissenschaftliche Publikationen', color: '#9c27b0', icon: 'science' },
    { id: uuidv4(), name: 'Technik', description: 'Technische Literatur', color: '#ff9800', icon: 'engineering' },
    { id: uuidv4(), name: 'Kochbücher', description: 'Rezepte und Kulinarisches', color: '#795548', icon: 'restaurant' }
  ];

  db.get("SELECT COUNT(*) as count FROM categories", [], (err, row) => {
    if (!err && row && row.count === 0) {
      defaultCategories.forEach(category => {
        db.run(
          "INSERT INTO categories (id, name, description, color, icon) VALUES (?, ?, ?, ?, ?)",
          [category.id, category.name, category.description, category.color, category.icon],
          function(err) {
            if (!err) {
              console.log(`✅ Created category: ${category.name}`);
            }
          }
        );
      });
    }
  });
});

// File Upload Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename and prevent path traversal
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(sanitizedName).toLowerCase();
    cb(null, uniqueSuffix + extension);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'file') {
    // Book file validation
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
    // Cover image validation
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
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// JWT Configuration
const JWT_OPTIONS = {
  algorithm: 'HS256',
  expiresIn: '24h',
  issuer: 'lectoria-app',
  audience: 'lectoria-users'
};

// Auth Middleware with enhanced security
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Zugriff verweigert. Token erforderlich.' });
  }

  jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256'], // Prevent algorithm confusion attacks
    issuer: JWT_OPTIONS.issuer,
    audience: JWT_OPTIONS.audience
  }, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token ist abgelaufen. Bitte melden Sie sich erneut an.' });
      } else if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ error: 'Ungültiger Token.' });
      } else if (err.name === 'NotBeforeError') {
        return res.status(403).json({ error: 'Token ist noch nicht gültig.' });
      } else {
        return res.status(403).json({ error: 'Token-Validierung fehlgeschlagen.' });
      }
    }
    
    // Additional validation
    if (!user.id || !user.username || !user.role) {
      return res.status(403).json({ error: 'Ungültiges Token-Format.' });
    }
    
    req.user = user;
    next();
  });
};

// Routes

// User Authentication
app.post('/api/auth/login', rateLimitAuth, (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip || req.connection.remoteAddress;

  if (!username || !password) {
    return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich' });
  }

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Datenbankfehler' });
    }
    
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
        iat: Math.floor(Date.now() / 1000) // Issued at timestamp
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
        must_change_password: user.must_change_password === 1
      }
    });
  });
});

app.post('/api/auth/register', rateLimitAuth, (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const userId = uuidv4();

  db.run(
    "INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)",
    [userId, username, email, hashedPassword],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(400).json({ error: 'Benutzername oder E-Mail bereits vorhanden' });
        }
        return res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
      }

      const token = jwt.sign(
        { 
          id: userId, 
          username, 
          role: 'user',
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
        user: { id: userId, username, email, role: 'user' }
      });
    }
  );
});

// Books API with pagination and caching
app.get('/api/books', authenticateToken, (req, res) => {
  // Validate pagination parameters
  let page = parseInt(req.query.page) || 1;
  let limit = parseInt(req.query.limit) || 50;
  
  // Security: Prevent large limit values that could cause DoS
  if (page < 1) page = 1;
  if (limit < 1) limit = 1;
  if (limit > 100) limit = 100; // Maximum 100 items per page
  
  const offset = (page - 1) * limit;
  const search = req.query.search ? req.query.search.trim() : '';
  const type = req.query.type || '';
  
  // Validate search length to prevent long queries
  if (search.length > 255) {
    return res.status(400).json({ error: 'Suchbegriff zu lang (max. 255 Zeichen)' });
  }

  let query = `
    SELECT b.*, u.username as uploader_name, c.name as category_name, c.color as category_color, c.icon as category_icon
    FROM books b 
    LEFT JOIN users u ON b.uploaded_by = u.id 
    LEFT JOIN categories c ON b.category_id = c.id
  `;
  
  let countQuery = 'SELECT COUNT(*) as total FROM books b';
  let params = [];
  let conditions = [];

  if (search) {
    conditions.push('(b.title LIKE ? OR b.author LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (type && type !== 'all') {
    conditions.push('b.type = ?');
    params.push(type);
  }

  if (conditions.length > 0) {
    const whereClause = ' WHERE ' + conditions.join(' AND ');
    query += whereClause;
    countQuery += whereClause;
  }

  query += ' ORDER BY b.upload_date DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  // Get total count
  db.get(countQuery, params.slice(0, -2), (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: 'Fehler beim Zählen der Bücher' });
    }

    // Get books
    db.all(query, params, (err, books) => {
      if (err) {
        return res.status(500).json({ error: 'Fehler beim Laden der Bücher' });
      }
      
      res.json({
        books,
        pagination: {
          page,
          limit,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit),
          hasNext: page * limit < countResult.total,
          hasPrev: page > 1
        }
      });
    });
  });
});

app.post('/api/books/upload', authenticateToken, upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), (req, res) => {
  if (!req.files || !req.files['file']) {
    return res.status(400).json({ error: 'Keine Datei hochgeladen' });
  }
  
  const bookFile = req.files['file'][0];
  const coverFile = req.files['cover'] ? req.files['cover'][0] : null;

  const { title, author, description, type, category_id } = req.body;
  
  // Input validation
  if (!title || title.trim().length === 0) {
    fs.removeSync(bookFile.path); // Clean up uploaded file
    if (coverFile) fs.removeSync(coverFile.path);
    return res.status(400).json({ error: 'Titel ist erforderlich' });
  }
  
  if (title.length > 255) {
    fs.removeSync(bookFile.path);
    if (coverFile) fs.removeSync(coverFile.path);
    return res.status(400).json({ error: 'Titel ist zu lang (max. 255 Zeichen)' });
  }
  
  if (author && author.length > 255) {
    fs.removeSync(bookFile.path);
    if (coverFile) fs.removeSync(coverFile.path);
    return res.status(400).json({ error: 'Autor ist zu lang (max. 255 Zeichen)' });
  }
  
  if (description && description.length > 1000) {
    fs.removeSync(bookFile.path);
    if (coverFile) fs.removeSync(coverFile.path);
    return res.status(400).json({ error: 'Beschreibung ist zu lang (max. 1000 Zeichen)' });
  }
  
  if (type && !['book', 'magazine'].includes(type)) {
    fs.removeSync(bookFile.path);
    if (coverFile) fs.removeSync(coverFile.path);
    return res.status(400).json({ error: 'Ungültiger Typ. Nur "book" oder "magazine" erlaubt' });
  }

  const bookId = uuidv4();

  const bookData = {
    id: bookId,
    title: title.trim(), // We already validated it exists
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

  db.run(`
    INSERT INTO books (id, title, author, description, type, category_id, filename, filepath, file_size, cover_image, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [bookData.id, bookData.title, bookData.author, bookData.description, bookData.type, bookData.category_id,
      bookData.filename, bookData.filepath, bookData.file_size, bookData.cover_image, bookData.uploaded_by], 
  function(err) {
    if (err) {
      fs.removeSync(bookFile.path); // Clean up files on error
      if (coverFile) fs.removeSync(coverFile.path);
      return res.status(500).json({ error: 'Fehler beim Speichern der Buchinformationen' });
    }

    res.status(201).json({ 
      message: 'Buch erfolgreich hochgeladen',
      book: {
        id: bookData.id,
        title: bookData.title,
        author: bookData.author,
        description: bookData.description,
        type: bookData.type,
        filename: bookData.filename,
        file_size: bookData.file_size
        // Don't expose filepath for security
      }
    });
  });
});

app.delete('/api/books/:id', authenticateToken, (req, res) => {
  const bookId = req.params.id;

  db.get("SELECT * FROM books WHERE id = ?", [bookId], (err, book) => {
    if (err) {
      return res.status(500).json({ error: 'Datenbankfehler' });
    }
    
    if (!book) {
      return res.status(404).json({ error: 'Buch nicht gefunden' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && book.uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'Keine Berechtigung zum Löschen' });
    }

    db.run("DELETE FROM books WHERE id = ?", [bookId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Fehler beim Löschen' });
      }

      // Delete file
      fs.remove(book.filepath).catch(console.error);
      
      res.json({ message: 'Buch erfolgreich gelöscht' });
    });
  });
});

// Download endpoint
app.get('/api/books/:id/download', authenticateToken, (req, res) => {
  const bookId = req.params.id;

  db.get("SELECT * FROM books WHERE id = ?", [bookId], (err, book) => {
    if (err) {
      return res.status(500).json({ error: 'Datenbankfehler' });
    }
    
    if (!book) {
      return res.status(404).json({ error: 'Buch nicht gefunden' });
    }

    if (!fs.existsSync(book.filepath)) {
      return res.status(404).json({ error: 'Datei nicht gefunden' });
    }

    // Increment download counter
    db.run("UPDATE books SET download_count = download_count + 1 WHERE id = ?", [bookId], (err) => {
      if (err) console.error('Error updating download count:', err);
    });

    res.download(book.filepath, book.filename);
  });
});

// Shareable Links API
app.post('/api/books/:id/share', authenticateToken, (req, res) => {
  const bookId = req.params.id;
  const { expiresIn } = req.body; // Optional: hours until expiration

  // Check if book exists and user has access
  db.get("SELECT * FROM books WHERE id = ?", [bookId], (err, book) => {
    if (err) {
      return res.status(500).json({ error: 'Datenbankfehler' });
    }
    
    if (!book) {
      return res.status(404).json({ error: 'Buch nicht gefunden' });
    }

    // Check permissions (admin or owner)
    if (req.user.role !== 'admin' && book.uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'Keine Berechtigung zum Teilen' });
    }

    const shareId = uuidv4();
    const shareToken = uuidv4().replace(/-/g, ''); // Clean token for URLs
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 60 * 60 * 1000) : null;

    db.run(`
      INSERT INTO share_links (id, book_id, share_token, created_by, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `, [shareId, bookId, shareToken, req.user.id, expiresAt], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Fehler beim Erstellen des Freigabe-Links' });
      }

      res.status(201).json({
        shareToken,
        shareUrl: `${req.protocol}://${req.get('host')}/share/${shareToken}`,
        expiresAt,
        message: 'Freigabe-Link erfolgreich erstellt'
      });
    });
  });
});

app.get('/api/books/:id/shares', authenticateToken, (req, res) => {
  const bookId = req.params.id;

  // Check if user can view shares for this book
  db.get("SELECT * FROM books WHERE id = ?", [bookId], (err, book) => {
    if (err) {
      return res.status(500).json({ error: 'Datenbankfehler' });
    }
    
    if (!book) {
      return res.status(404).json({ error: 'Buch nicht gefunden' });
    }

    if (req.user.role !== 'admin' && book.uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    db.all(`
      SELECT sl.*, u.username as created_by_name 
      FROM share_links sl 
      LEFT JOIN users u ON sl.created_by = u.id 
      WHERE sl.book_id = ? AND sl.is_active = 1
      ORDER BY sl.created_at DESC
    `, [bookId], (err, shares) => {
      if (err) {
        return res.status(500).json({ error: 'Fehler beim Laden der Freigaben' });
      }
      
      res.json(shares.map(share => ({
        ...share,
        shareUrl: `${req.protocol}://${req.get('host')}/share/${share.share_token}`
      })));
    });
  });
});

app.delete('/api/shares/:token', authenticateToken, (req, res) => {
  const shareToken = req.params.token;

  db.get(`
    SELECT sl.*, b.uploaded_by 
    FROM share_links sl 
    JOIN books b ON sl.book_id = b.id 
    WHERE sl.share_token = ?
  `, [shareToken], (err, share) => {
    if (err) {
      return res.status(500).json({ error: 'Datenbankfehler' });
    }
    
    if (!share) {
      return res.status(404).json({ error: 'Freigabe-Link nicht gefunden' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && share.created_by !== req.user.id && share.uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'Keine Berechtigung zum Löschen' });
    }

    db.run("UPDATE share_links SET is_active = 0 WHERE share_token = ?", [shareToken], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Fehler beim Deaktivieren der Freigabe' });
      }
      
      res.json({ message: 'Freigabe-Link erfolgreich deaktiviert' });
    });
  });
});

// Public shared book access (no authentication required)
app.get('/api/share/:token', (req, res) => {
  const shareToken = req.params.token;

  db.get(`
    SELECT sl.*, b.*, u.username as uploader_name
    FROM share_links sl
    JOIN books b ON sl.book_id = b.id
    LEFT JOIN users u ON b.uploaded_by = u.id
    WHERE sl.share_token = ? AND sl.is_active = 1
  `, [shareToken], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Datenbankfehler' });
    }

    if (!result) {
      return res.status(404).json({ error: 'Freigabe-Link nicht gefunden oder inaktiv' });
    }

    // Check if link has expired
    if (result.expires_at && new Date(result.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Freigabe-Link ist abgelaufen' });
    }

    // Increment access count
    db.run("UPDATE share_links SET access_count = access_count + 1 WHERE share_token = ?", [shareToken]);

    // Return book info (no sensitive data)
    res.json({
      id: result.book_id,
      title: result.title,
      author: result.author,
      description: result.description,
      type: result.type,
      filename: result.filename,
      file_size: result.file_size,
      cover_image: result.cover_image,
      download_count: result.download_count || 0,
      upload_date: result.upload_date,
      uploader_name: result.uploader_name,
      shareToken: shareToken,
      accessCount: result.access_count + 1
    });
  });
});

// Public shared book download (no authentication required)
app.get('/api/share/:token/download', (req, res) => {
  const shareToken = req.params.token;

  db.get(`
    SELECT sl.*, b.*
    FROM share_links sl
    JOIN books b ON sl.book_id = b.id
    WHERE sl.share_token = ? AND sl.is_active = 1
  `, [shareToken], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Datenbankfehler' });
    }

    if (!result) {
      return res.status(404).json({ error: 'Freigabe-Link nicht gefunden oder inaktiv' });
    }

    // Check if link has expired
    if (result.expires_at && new Date(result.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Freigabe-Link ist abgelaufen' });
    }

    if (!fs.existsSync(result.filepath)) {
      return res.status(404).json({ error: 'Datei nicht gefunden' });
    }

    // Increment both access count and download count
    db.run("UPDATE share_links SET access_count = access_count + 1 WHERE share_token = ?", [shareToken]);
    db.run("UPDATE books SET download_count = download_count + 1 WHERE id = ?", [result.book_id]);

    res.download(result.filepath, result.filename);
  });
});

// User Management (Admin only)
app.get('/api/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }

  db.all("SELECT id, username, email, role, is_active, must_change_password, last_password_change, created_at FROM users", (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Fehler beim Laden der Benutzer' });
    }
    res.json(users);
  });
});

// Update user (Admin only)
app.put('/api/users/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }

  const { id } = req.params;
  const { role, is_active, must_change_password } = req.body;

  const updates = [];
  const values = [];

  if (role !== undefined) {
    updates.push('role = ?');
    values.push(role);
  }

  if (is_active !== undefined) {
    updates.push('is_active = ?');
    values.push(is_active ? 1 : 0);
  }

  if (must_change_password !== undefined) {
    updates.push('must_change_password = ?');
    values.push(must_change_password ? 1 : 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Keine Änderungen angegeben' });
  }

  values.push(id);

  db.run(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Fehler beim Aktualisieren des Benutzers' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden' });
      }
      res.json({ message: 'Benutzer erfolgreich aktualisiert' });
    }
  );
});

// Delete user (Admin only)
app.delete('/api/users/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }

  const { id } = req.params;

  // Prevent admin from deleting themselves
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Sie können sich nicht selbst löschen' });
  }

  db.run("DELETE FROM users WHERE id = ?", [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Fehler beim Löschen des Benutzers' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }
    res.json({ message: 'Benutzer erfolgreich gelöscht' });
  });
});

// Password change endpoint
app.post('/api/auth/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Aktuelles und neues Passwort sind erforderlich' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Das neue Passwort muss mindestens 6 Zeichen lang sein' });
  }

  db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Datenbankfehler' });
    }

    if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    const now = new Date().toISOString();

    db.run(
      "UPDATE users SET password = ?, must_change_password = 0, last_password_change = ? WHERE id = ?",
      [hashedPassword, now, userId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Fehler beim Ändern des Passworts' });
        }
        res.json({ message: 'Passwort erfolgreich geändert' });
      }
    );
  });
});

// Category Management
app.get('/api/categories', authenticateToken, (req, res) => {
  db.all("SELECT * FROM categories ORDER BY name", (err, categories) => {
    if (err) {
      return res.status(500).json({ error: 'Fehler beim Laden der Kategorien' });
    }
    res.json(categories);
  });
});

app.post('/api/categories', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }

  const { name, description, color, icon } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Kategoriename ist erforderlich' });
  }

  const categoryId = uuidv4();

  db.run(
    "INSERT INTO categories (id, name, description, color, icon) VALUES (?, ?, ?, ?, ?)",
    [categoryId, name, description || '', color || '#1976d2', icon || 'folder'],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(400).json({ error: 'Kategorie existiert bereits' });
        }
        return res.status(500).json({ error: 'Fehler beim Erstellen der Kategorie' });
      }
      res.status(201).json({ 
        id: categoryId, 
        name, 
        description, 
        color: color || '#1976d2', 
        icon: icon || 'folder' 
      });
    }
  );
});

app.put('/api/categories/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }

  const { id } = req.params;
  const { name, description, color, icon } = req.body;

  const updates = [];
  const values = [];

  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }

  if (description !== undefined) {
    updates.push('description = ?');
    values.push(description);
  }

  if (color !== undefined) {
    updates.push('color = ?');
    values.push(color);
  }

  if (icon !== undefined) {
    updates.push('icon = ?');
    values.push(icon);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Keine Änderungen angegeben' });
  }

  values.push(id);

  db.run(
    `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(400).json({ error: 'Kategoriename existiert bereits' });
        }
        return res.status(500).json({ error: 'Fehler beim Aktualisieren der Kategorie' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Kategorie nicht gefunden' });
      }
      res.json({ message: 'Kategorie erfolgreich aktualisiert' });
    }
  );
});

app.delete('/api/categories/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }

  const { id } = req.params;

  db.run("DELETE FROM categories WHERE id = ?", [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Fehler beim Löschen der Kategorie' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Kategorie nicht gefunden' });
    }
    res.json({ message: 'Kategorie erfolgreich gelöscht' });
  });
});

// Serve React App with Share Route
app.get('/share/:token', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/build/share.html'));
});

// Serve main application
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/build/app.html'));
});

// Redirect root to app
app.get('/', (req, res) => {
  res.redirect('/app');
});

// Status page for API info
app.get('/status', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/build/index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/build/app.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Datei zu groß (max. 50MB)' });
    }
  }
  res.status(500).json({ error: error.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Book Manager Server läuft auf Port ${PORT}`);
  console.log(`📚 Zugriff über: http://localhost:${PORT}`);
  console.log(`👤 Standard Admin: admin / admin123`);
});