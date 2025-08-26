// backend_server.js - PostgreSQL version
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

const app = express();
const PORT = process.env.PORT || 3000;
// Environment validation - Fail hard if critical secrets are missing
if (!process.env.JWT_SECRET) {
  console.error('💥 ERROR: JWT_SECRET environment variable is required!');
  console.error('Generate a secure secret with: openssl rand -base64 64');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔐 JWT Secret: ${JWT_SECRET === 'fallback-secret-key' ? 'FALLBACK (development only)' : 'Custom (secure)'}`);

// Rate limiting for auth endpoints
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

// Enhanced IP detection for better security
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         req.ip ||
         'unknown';
};

const rateLimitAuth = (req, res, next) => {
  const ip = getClientIP(req);
  const now = Date.now();
  
  // Periodic cleanup of old entries to prevent memory leaks
  if (Math.random() < 0.01) { // 1% chance to run cleanup
    for (const [key, value] of loginAttempts.entries()) {
      if ((now - value.lastAttempt) > LOCKOUT_TIME * 2) {
        loginAttempts.delete(key);
      }
    }
  }
  
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
app.use('/uploads', express.static(path.join(__dirname, './uploads')));

// Initialize Database
(async () => {
  await database.initializeDatabase();
  console.log('✅ PostgreSQL Database initialisiert');
})();

// File Upload Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, './uploads');
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

  // Validate token format and length
  if (token.length > 1000) {
    return res.status(403).json({ error: 'Token zu lang.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'], // Prevent algorithm confusion attacks
      issuer: JWT_OPTIONS.issuer,
      audience: JWT_OPTIONS.audience,
      maxAge: '24h' // Additional safety check
    });
    
    // Enhanced validation
    if (!decoded.id || !decoded.username || !decoded.role) {
      return res.status(403).json({ error: 'Ungültiges Token-Format.' });
    }

    // Check if token is too old (additional security layer)
    const tokenAge = Date.now() / 1000 - decoded.iat;
    if (tokenAge > 86400) { // 24 hours
      return res.status(401).json({ error: 'Token ist abgelaufen.' });
    }

    // Validate role
    if (!['admin', 'user'].includes(decoded.role)) {
      return res.status(403).json({ error: 'Ungültige Benutzerrolle.' });
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    // Unified error handling with better security
    let errorMessage = 'Token-Validierung fehlgeschlagen.';
    let statusCode = 403;

    if (err.name === 'TokenExpiredError') {
      errorMessage = 'Token ist abgelaufen. Bitte melden Sie sich erneut an.';
      statusCode = 401;
    } else if (err.name === 'JsonWebTokenError') {
      errorMessage = 'Ungültiger Token.';
    } else if (err.name === 'NotBeforeError') {
      errorMessage = 'Token ist noch nicht gültig.';
    }

    return res.status(statusCode).json({ error: errorMessage });
  }
};

// Routes

// User Authentication
app.post('/api/auth/login', rateLimitAuth, async (req, res) => {
  const { username, password } = req.body;
  const ip = getClientIP(req);

  if (!username || !password) {
    return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich' });
  }

  try {
    const user = await database.getUserByUsername(username);
    
    if (!user) {
      // Track failed login attempts
      const now = Date.now();
      const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: now };
      attempts.count++;
      attempts.lastAttempt = now;
      loginAttempts.set(ip, attempts);
      
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    // Use async bcrypt to prevent blocking the event loop
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
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
        must_change_password: user.must_change_password
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

app.post('/api/auth/register', rateLimitAuth, async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
  }

  // Enhanced password validation
  if (password.length < 8) {
    return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' });
  }

  // Check for basic complexity
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar)) {
    return res.status(400).json({ 
      error: 'Passwort muss mindestens einen Großbuchstaben, einen Kleinbuchstaben, eine Zahl und ein Sonderzeichen enthalten' 
    });
  }

  const userId = uuidv4();

  try {
    // Use async bcrypt to prevent blocking the event loop
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await database.createUser({
      id: userId,
      username,
      email,
      password: hashedPassword,
      role: 'user'
    });

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
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique constraint violation
      return res.status(400).json({ error: 'Benutzername oder E-Mail bereits vorhanden' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
  }
});

// Books API with pagination and caching
app.get('/api/books', authenticateToken, async (req, res) => {
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

  try {
    const result = await database.getBooks({ search, type, limit, offset });
    
    res.json({
      books: result.books,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
        hasNext: page * limit < result.total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching books:', error);
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
  
  // Enhanced cleanup function to prevent race conditions
  const cleanupFiles = () => {
    try {
      if (fs.existsSync(bookFile.path)) {
        fs.removeSync(bookFile.path);
      }
      if (coverFile && fs.existsSync(coverFile.path)) {
        fs.removeSync(coverFile.path);
      }
    } catch (cleanupError) {
      console.error('File cleanup error:', cleanupError);
    }
  };

  const { title, author, description, type, category_id, coverUrl } = req.body;
  
  // Input validation with improved error handling
  try {
    if (!title || title.trim().length === 0) {
      cleanupFiles();
      return res.status(400).json({ error: 'Titel ist erforderlich' });
    }
    
    if (title.length > 255) {
      cleanupFiles();
      return res.status(400).json({ error: 'Titel ist zu lang (max. 255 Zeichen)' });
    }
    
    if (author && author.length > 255) {
      cleanupFiles();
      return res.status(400).json({ error: 'Autor ist zu lang (max. 255 Zeichen)' });
    }
    
    if (description && description.length > 1000) {
      cleanupFiles();
      return res.status(400).json({ error: 'Beschreibung ist zu lang (max. 1000 Zeichen)' });
    }
    
    if (type && !['book', 'magazine'].includes(type)) {
      cleanupFiles();
      return res.status(400).json({ error: 'Ungültiger Typ. Nur "book" oder "magazine" erlaubt' });
    }

    const bookId = uuidv4();
    let coverImagePath = null;

    // Handle cover image - either uploaded file or URL
    if (coverFile) {
      coverImagePath = `/uploads/${coverFile.filename}`;
    } else if (coverUrl) {
      // Download cover from URL
      try {
        const coverResponse = await axios.get(coverUrl, {
          responseType: 'arraybuffer',
          timeout: 10000
        });
        
        // Generate filename for cover
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 1000000000);
        const coverExtension = coverUrl.includes('.png') ? 'png' : 'jpg';
        const coverFilename = `${timestamp}-${randomNum}-cover.${coverExtension}`;
        const coverPath = path.join(__dirname, './uploads', coverFilename);
        
        // Save cover image
        await fs.writeFile(coverPath, Buffer.from(coverResponse.data));
        
        coverImagePath = `/uploads/${coverFilename}`;
      } catch (coverError) {
        console.error('Error downloading cover from URL:', coverError);
        // Continue without cover if download fails
      }
    }

    const bookData = {
      id: bookId,
      title: title.trim(),
      author: author ? author.trim() : 'Unbekannt',
      description: description ? description.trim() : '',
      type: type || 'book',
      category_id: category_id || null,
      filename: bookFile.originalname,
      filepath: bookFile.path,
      file_size: bookFile.size,
      cover_image: coverImagePath,
      uploaded_by: req.user.id
    };

    // Use database transaction to ensure atomicity
    await database.createBook(bookData);
    
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
  } catch (error) {
    // Ensure cleanup happens on any error
    cleanupFiles();
    console.error('Error in book upload:', error);
    res.status(500).json({ error: 'Fehler beim Speichern der Buchinformationen' });
  }
});

app.delete('/api/books/:id', authenticateToken, async (req, res) => {
  const bookId = req.params.id;

  try {
    const book = await database.getBookById(bookId);
    
    if (!book) {
      return res.status(404).json({ error: 'Buch nicht gefunden' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && book.uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'Keine Berechtigung zum Löschen' });
    }

    await database.deleteBook(bookId);

    // Delete file
    fs.remove(book.filepath).catch(console.error);
    
    res.json({ message: 'Buch erfolgreich gelöscht' });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

// Download endpoint
app.get('/api/books/:id/download', authenticateToken, async (req, res) => {
  const bookId = req.params.id;

  try {
    const book = await database.getBookById(bookId);
    
    if (!book) {
      return res.status(404).json({ error: 'Buch nicht gefunden' });
    }

    if (!fs.existsSync(book.filepath)) {
      return res.status(404).json({ error: 'Datei nicht gefunden' });
    }

    // Increment download counter
    await database.incrementDownloadCount(bookId);

    res.download(book.filepath, book.filename);
  } catch (error) {
    console.error('Error downloading book:', error);
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// Shareable Links API
app.post('/api/books/:id/share', authenticateToken, async (req, res) => {
  const bookId = req.params.id;
  const { expiresIn } = req.body; // Optional: hours until expiration

  try {
    // Check if book exists and user has access
    const book = await database.getBookById(bookId);
    
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

    await database.createShareLink({
      id: shareId,
      book_id: bookId,
      share_token: shareToken,
      created_by: req.user.id,
      expires_at: expiresAt
    });

    res.status(201).json({
      shareToken,
      shareUrl: `${req.protocol}://${req.get('host')}/share/${shareToken}`,
      expiresAt,
      message: 'Freigabe-Link erfolgreich erstellt'
    });
  } catch (error) {
    console.error('Error creating share link:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Freigabe-Links' });
  }
});

app.get('/api/books/:id/shares', authenticateToken, async (req, res) => {
  const bookId = req.params.id;

  try {
    // Check if user can view shares for this book
    const book = await database.getBookById(bookId);
    
    if (!book) {
      return res.status(404).json({ error: 'Buch nicht gefunden' });
    }

    if (req.user.role !== 'admin' && book.uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    const shares = await database.getShareLinksForBook(bookId);
    
    res.json(shares.map(share => ({
      ...share,
      shareUrl: `${req.protocol}://${req.get('host')}/share/${share.share_token}`
    })));
  } catch (error) {
    console.error('Error fetching share links:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Freigaben' });
  }
});

app.delete('/api/shares/:token', authenticateToken, async (req, res) => {
  const shareToken = req.params.token;

  try {
    const share = await database.getShareLinkWithBook(shareToken);
    
    if (!share) {
      return res.status(404).json({ error: 'Freigabe-Link nicht gefunden' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && share.created_by !== req.user.id && share.uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'Keine Berechtigung zum Löschen' });
    }

    await database.deactivateShareLink(shareToken);
    
    res.json({ message: 'Freigabe-Link erfolgreich deaktiviert' });
  } catch (error) {
    console.error('Error deactivating share link:', error);
    res.status(500).json({ error: 'Fehler beim Deaktivieren der Freigabe' });
  }
});

// Public shared book access (no authentication required)
app.get('/api/share/:token', async (req, res) => {
  const shareToken = req.params.token;

  try {
    const result = await database.getBookByShareToken(shareToken);

    if (!result) {
      return res.status(404).json({ error: 'Freigabe-Link nicht gefunden oder inaktiv' });
    }

    // Check if link has expired
    if (result.expires_at && new Date(result.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Freigabe-Link ist abgelaufen' });
    }

    // Increment access count
    await database.incrementShareAccessCount(shareToken);

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
  } catch (error) {
    console.error('Error accessing shared book:', error);
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// Public shared book download (no authentication required)
app.get('/api/share/:token/download', async (req, res) => {
  const shareToken = req.params.token;

  try {
    const result = await database.getBookByShareToken(shareToken);

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
    await database.incrementShareAccessCount(shareToken);
    await database.incrementDownloadCount(result.book_id);

    res.download(result.filepath, result.filename);
  } catch (error) {
    console.error('Error downloading shared book:', error);
    res.status(500).json({ error: 'Datenbankfehler' });
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
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Benutzer' });
  }
});

// Update user (Admin only)
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }

  const { id } = req.params;
  const updates = req.body;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Keine Änderungen angegeben' });
  }

  try {
    const success = await database.updateUser(id, updates);
    
    if (!success) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }
    
    res.json({ message: 'Benutzer erfolgreich aktualisiert' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Benutzers' });
  }
});

// Delete user (Admin only)
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }

  const { id } = req.params;

  // Prevent admin from deleting themselves
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Sie können sich nicht selbst löschen' });
  }

  try {
    const success = await database.deleteUser(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }
    
    res.json({ message: 'Benutzer erfolgreich gelöscht' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Benutzers' });
  }
});

// Password change endpoint
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Aktuelles und neues Passwort sind erforderlich' });
  }

  // Enhanced password validation for password change
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Das neue Passwort muss mindestens 8 Zeichen lang sein' });
  }

  // Check for basic complexity
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumbers = /\d/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

  if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar)) {
    return res.status(400).json({ 
      error: 'Neues Passwort muss mindestens einen Großbuchstaben, einen Kleinbuchstaben, eine Zahl und ein Sonderzeichen enthalten' 
    });
  }

  try {
    const user = await database.getUserById(userId);

    if (!user) {
      return res.status(401).json({ error: 'Benutzer nicht gefunden' });
    }

    // Use async bcrypt to prevent blocking the event loop
    const passwordValid = await bcrypt.compare(currentPassword, user.password);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const now = new Date();

    await database.updateUserPassword(userId, hashedPassword, now);
    
    res.json({ message: 'Passwort erfolgreich geändert' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Fehler beim Ändern des Passworts' });
  }
});

// Category Management
app.get('/api/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await database.getAllCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
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

  const categoryId = uuidv4();

  try {
    await database.createCategory({
      id: categoryId,
      name,
      description: description || '',
      color: color || '#1976d2',
      icon: icon || 'folder'
    });
    
    res.status(201).json({ 
      id: categoryId, 
      name, 
      description, 
      color: color || '#1976d2', 
      icon: icon || 'folder' 
    });
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique constraint violation
      return res.status(400).json({ error: 'Kategorie existiert bereits' });
    }
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen der Kategorie' });
  }
});

app.put('/api/categories/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }

  const { id } = req.params;
  const updates = req.body;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Keine Änderungen angegeben' });
  }

  try {
    const success = await database.updateCategory(id, updates);
    
    if (!success) {
      return res.status(404).json({ error: 'Kategorie nicht gefunden' });
    }
    
    res.json({ message: 'Kategorie erfolgreich aktualisiert' });
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique constraint violation
      return res.status(400).json({ error: 'Kategoriename existiert bereits' });
    }
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Kategorie' });
  }
});

app.delete('/api/categories/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }

  const { id } = req.params;

  try {
    const success = await database.deleteCategory(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Kategorie nicht gefunden' });
    }
    
    res.json({ message: 'Kategorie erfolgreich gelöscht' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Fehler beim Löschen der Kategorie' });
  }
});

// Metadata API for book search with cover download
app.post('/api/metadata/isbn/:isbn', authenticateToken, async (req, res) => {
  const { isbn } = req.params;
  
  try {
    // Try Google Books API first - try both with and without hyphens
    const isbnClean = isbn.replace(/[-\s]/g, ''); // Remove hyphens and spaces
    
    let googleResponse = await axios.get(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`,
      { timeout: 5000 }
    );
    
    // If no results with original ISBN, try without hyphens
    if (!googleResponse.data.items || googleResponse.data.items.length === 0) {
      googleResponse = await axios.get(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbnClean}`,
        { timeout: 5000 }
      );
    }
    
    if (googleResponse.data.items && googleResponse.data.items.length > 0) {
      // Find the best result - prefer books with covers, descriptions, and proper metadata
      let bestBook = null;
      let bestScore = -1;
      
      for (const item of googleResponse.data.items) {
        const book = item.volumeInfo;
        let score = 0;
        
        // Score based on available data quality
        if (book.imageLinks) score += 10; // Cover image is very important
        if (book.description && book.description.length > 50) score += 5; // Good description
        if (book.publisher) score += 2; // Publisher info
        if (book.authors && book.authors.length > 0) score += 3; // Author info
        if (book.pageCount && book.pageCount > 0) score += 1; // Page count
        if (book.categories && book.categories.length > 0) score += 1; // Categories
        if (book.language === 'de' || book.language === 'en') score += 2; // Prefer German/English
        
        // Prefer exact ISBN match in industry identifiers
        if (book.industryIdentifiers) {
          for (const id of book.industryIdentifiers) {
            const cleanId = id.identifier.replace(/[-\s]/g, '');
            if (cleanId === isbnClean || id.identifier === isbn) {
              score += 15; // Big bonus for exact ISBN match
              break;
            }
          }
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestBook = book;
        }
      }
      
      // Use the best book found, or fall back to first if no clear winner
      const book = bestBook || googleResponse.data.items[0].volumeInfo;
      
      // Prepare response data
      const metadata = {
        success: true,
        title: book.title || '',
        authors: book.authors ? book.authors.join(', ') : '',
        description: book.description || '',
        publisher: book.publisher || '',
        publishedDate: book.publishedDate || '',
        language: book.language || '',
        pageCount: book.pageCount || null,
        categories: book.categories || [],
        coverUrl: null
      };
      
      // Get the best available cover image
      if (book.imageLinks) {
        // Prefer larger images
        metadata.coverUrl = book.imageLinks.extraLarge || 
                           book.imageLinks.large || 
                           book.imageLinks.medium || 
                           book.imageLinks.thumbnail || 
                           book.imageLinks.smallThumbnail;
        
        // Remove edge curl parameter and get larger image
        if (metadata.coverUrl) {
          metadata.coverUrl = metadata.coverUrl.replace('&edge=curl', '');
          // Try to get larger version by modifying zoom parameter
          metadata.coverUrl = metadata.coverUrl.replace('zoom=1', 'zoom=3');
        }
      }
      
      return res.json(metadata);
    }
    
    // Try Open Library API as fallback - try both ISBN formats
    let openLibResponse = await axios.get(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`,
      { timeout: 5000 }
    );
    
    let openLibData = openLibResponse.data[`ISBN:${isbn}`];
    
    // If no results with original ISBN, try without hyphens
    if (!openLibData) {
      openLibResponse = await axios.get(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${isbnClean}&jscmd=data&format=json`,
        { timeout: 5000 }
      );
      openLibData = openLibResponse.data[`ISBN:${isbnClean}`];
    }
    
    if (openLibData) {
      const metadata = {
        success: true,
        title: openLibData.title || '',
        authors: openLibData.authors ? openLibData.authors.map(a => a.name).join(', ') : '',
        description: openLibData.description || '',
        publisher: openLibData.publishers ? openLibData.publishers[0].name : '',
        publishedDate: openLibData.publish_date || '',
        language: '',
        pageCount: openLibData.number_of_pages || null,
        categories: openLibData.subjects ? openLibData.subjects.map(s => s.name) : [],
        coverUrl: null
      };
      
      // Get cover from Open Library
      if (openLibData.cover) {
        metadata.coverUrl = openLibData.cover.large || openLibData.cover.medium || openLibData.cover.small;
      }
      
      return res.json(metadata);
    }
    
    res.json({ success: false, message: 'Keine Metadaten gefunden' });
  } catch (error) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Abrufen der Metadaten' });
  }
});

app.post('/api/metadata/search', authenticateToken, async (req, res) => {
  const { title, author } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Titel ist erforderlich' });
  }
  
  try {
    // Build search query
    let query = title;
    if (author) {
      query += `+inauthor:${author}`;
    }
    
    // Search using Google Books API
    const googleResponse = await axios.get(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`,
      { timeout: 5000 }
    );
    
    const results = [];
    
    if (googleResponse.data.items) {
      for (const item of googleResponse.data.items) {
        const book = item.volumeInfo;
        
        // Get the best available cover image
        let coverUrl = null;
        if (book.imageLinks) {
          coverUrl = book.imageLinks.extraLarge || 
                    book.imageLinks.large || 
                    book.imageLinks.medium || 
                    book.imageLinks.thumbnail || 
                    book.imageLinks.smallThumbnail;
          
          if (coverUrl) {
            coverUrl = coverUrl.replace('&edge=curl', '');
            coverUrl = coverUrl.replace('zoom=1', 'zoom=3');
          }
        }
        
        results.push({
          title: book.title || '',
          authors: book.authors ? book.authors.join(', ') : '',
          description: book.description || '',
          publisher: book.publisher || '',
          publishedDate: book.publishedDate || '',
          language: book.language || '',
          pageCount: book.pageCount || null,
          categories: book.categories || [],
          isbn: book.industryIdentifiers ? 
                book.industryIdentifiers.find(id => id.type === 'ISBN_13' || id.type === 'ISBN_10')?.identifier : '',
          coverUrl: coverUrl
        });
      }
    }
    
    res.json({ results });
  } catch (error) {
    console.error('Error searching metadata:', error);
    res.status(500).json({ error: 'Fehler bei der Metadatensuche' });
  }
});

// Update book metadata with optional cover download
app.put('/api/books/:id/metadata', authenticateToken, async (req, res) => {
  const bookId = req.params.id;
  const { title, author, description, publisher, publishedDate, language, coverUrl } = req.body;
  
  try {
    // First check if book exists and user has permission
    const book = await database.getBookById(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Buch nicht gefunden' });
    }
    
    // Check permission (admin or owner)
    if (req.user.role !== 'admin' && book.uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'Keine Berechtigung für diese Aktion' });
    }
    
    // Prepare update data
    const updateData = {
      title: title || book.title,
      author: author || book.author,
      description: description || book.description
    };
    
    // If a cover URL is provided, download and save it
    if (coverUrl) {
      try {
        const coverResponse = await axios.get(coverUrl, {
          responseType: 'arraybuffer',
          timeout: 10000
        });
        
        // Generate filename for cover
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 1000000000);
        const coverExtension = coverUrl.includes('.png') ? 'png' : 'jpg';
        const coverFilename = `${timestamp}-${randomNum}-cover.${coverExtension}`;
        const coverPath = path.join(__dirname, './uploads', coverFilename);
        
        // Save cover image
        await fs.writeFile(coverPath, Buffer.from(coverResponse.data));
        
        // Update book with new cover
        updateData.cover_image = coverFilename;
        updateData.cover_path = coverPath;
      } catch (coverError) {
        console.error('Error downloading cover:', coverError);
        // Continue without cover if download fails
      }
    }
    
    // Update book in database
    const success = await database.updateBook(bookId, updateData);
    
    if (success) {
      res.json({ message: 'Metadaten erfolgreich aktualisiert' });
    } else {
      res.status(500).json({ error: 'Fehler beim Aktualisieren der Metadaten' });
    }
  } catch (error) {
    console.error('Error updating metadata:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Metadaten' });
  }
});

// Translation API - Get categories with translations
app.get('/api/categories/translated', authenticateToken, async (req, res) => {
  try {
    const language = req.query.lang || 'en';
    const categories = await database.getCategoriesWithTranslations(language);
    res.json(categories);
  } catch (error) {
    console.error('Error getting translated categories:', error);
    res.status(500).json({ error: 'Error loading translated categories' });
  }
});

// Translation API - Get translation
app.get('/api/translations/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    const { lang = 'en', context = 'ui' } = req.query;
    
    const translation = await database.getTranslation(key, lang, context);
    
    if (!translation) {
      return res.status(404).json({ error: 'Translation not found' });
    }
    
    res.json({ key, language: lang, value: translation, context });
  } catch (error) {
    console.error('Error getting translation:', error);
    res.status(500).json({ error: 'Error loading translation' });
  }
});

// Translation API - Set/update translation (Admin only)
app.post('/api/translations', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const { key, language, value, context = 'ui' } = req.body;
    
    if (!key || !language || !value) {
      return res.status(400).json({ error: 'Key, language and value are required' });
    }
    
    const success = await database.setTranslation(key, language, value, context);
    
    if (success) {
      res.json({ message: 'Translation saved successfully', key, language, value, context });
    } else {
      res.status(500).json({ error: 'Failed to save translation' });
    }
  } catch (error) {
    console.error('Error setting translation:', error);
    res.status(500).json({ error: 'Error saving translation' });
  }
});

// Translation API - Get all translations for language (Admin only)
app.get('/api/translations', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const { lang = 'en', context } = req.query;
    
    let query = 'SELECT * FROM translations WHERE language = $1';
    let params = [lang];
    
    if (context) {
      query += ' AND context = $2';
      params.push(context);
    }
    
    query += ' ORDER BY translation_key';
    
    const result = await database.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting translations:', error);
    res.status(500).json({ error: 'Error loading translations' });
  }
});

// Export books (Admin only)
app.get('/api/export/books', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }

  try {
    const books = await database.getAllBooksForExport();
    
    res.json(books);
  } catch (error) {
    console.error('Error exporting books:', error);
    res.status(500).json({ error: 'Fehler beim Exportieren der Bücher' });
  }
});

// Download books archive (Admin only)
app.get('/api/download/archive', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }

  try {
    const books = await database.getAllBooksForExport();
    
    // Create a write stream for the zip file
    const zipPath = path.join(__dirname, './uploads', `books-archive-${Date.now()}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    output.on('close', function() {
      res.download(zipPath, 'books-archive.zip', (err) => {
        if (err) {
          console.error('Error sending archive:', err);
        }
        // Clean up the zip file after download
        fs.remove(zipPath).catch(console.error);
      });
    });

    archive.on('error', function(err) {
      throw err;
    });

    archive.pipe(output);

    // Add books to archive
    for (const book of books) {
      if (fs.existsSync(book.filepath)) {
        archive.file(book.filepath, { name: `books/${book.filename}` });
      }
    }

    // Add metadata as JSON
    archive.append(JSON.stringify(books, null, 2), { name: 'metadata.json' });

    archive.finalize();
  } catch (error) {
    console.error('Error creating archive:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Archivs' });
  }
});

// Export to CSV (Admin only)
app.get('/api/export/csv', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }

  try {
    const books = await database.getAllBooksForExport();
    
    const csvPath = path.join(__dirname, './uploads', `books-export-${Date.now()}.csv`);
    
    const csvWriter = createCsvWriter({
      path: csvPath,
      header: [
        { id: 'title', title: 'Titel' },
        { id: 'author', title: 'Autor' },
        { id: 'description', title: 'Beschreibung' },
        { id: 'type', title: 'Typ' },
        { id: 'category_name', title: 'Kategorie' },
        { id: 'filename', title: 'Dateiname' },
        { id: 'file_size', title: 'Dateigröße' },
        { id: 'download_count', title: 'Downloads' },
        { id: 'upload_date', title: 'Upload-Datum' },
        { id: 'uploader_name', title: 'Hochgeladen von' }
      ]
    });

    await csvWriter.writeRecords(books);
    
    res.download(csvPath, 'books-export.csv', (err) => {
      if (err) {
        console.error('Error sending CSV:', err);
      }
      // Clean up the CSV file after download
      fs.remove(csvPath).catch(console.error);
    });
  } catch (error) {
    console.error('Error creating CSV:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen der CSV-Datei' });
  }
});

// Backup Management (Admin only)
app.get('/api/backup/list', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }

  try {
    const backupDir = path.join(__dirname, './backups');
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.zip'))
      .map(file => {
        const stats = fs.statSync(path.join(backupDir, file));
        return {
          filename: file,
          size: stats.size,
          created_at: stats.birthtime
        };
      })
      .sort((a, b) => b.created_at - a.created_at);

    res.json({ backups: files });
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Backups' });
  }
});

app.post('/api/backup/create', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }

  try {
    const backupDir = path.join(__dirname, './backups');
    fs.ensureDirSync(backupDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.zip`);

    // Get all books from database
    const books = await database.getAllBooksForExport();
    
    // Create archive
    const output = fs.createWriteStream(backupFile);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);

    // Add database export as JSON
    archive.append(JSON.stringify({
      version: '2.0',
      created_at: new Date().toISOString(),
      books: books,
      total_books: books.length
    }, null, 2), { name: 'database.json' });

    // Add book files
    for (const book of books) {
      if (fs.existsSync(book.filepath)) {
        archive.file(book.filepath, { name: `books/${book.filename}` });
      }
    }

    await archive.finalize();

    res.json({ 
      message: 'Backup erfolgreich erstellt',
      filename: `backup-${timestamp}.zip`,
      books_count: books.length 
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Backups' });
  }
});

app.delete('/api/backup/:filename', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }

  const { filename } = req.params;
  
  // Security: Prevent directory traversal
  if (filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ error: 'Ungültiger Dateiname' });
  }

  try {
    const backupPath = path.join(__dirname, './backups', filename);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup nicht gefunden' });
    }

    fs.removeSync(backupPath);
    res.json({ message: 'Backup erfolgreich gelöscht' });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Backups' });
  }
});

// Proxy for cover images to bypass CORS
app.get('/api/cover-proxy', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }
  
  // Validate URL is from trusted sources
  const allowedHosts = [
    'books.google.com',
    'covers.openlibrary.org'
  ];
  
  try {
    const urlObj = new URL(url);
    if (!allowedHosts.includes(urlObj.hostname)) {
      return res.status(403).json({ error: 'URL not allowed' });
    }
    
    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 10000,
      headers: {
        'User-Agent': 'Lectoria-BookManager/1.0'
      }
    });
    
    // Set appropriate headers
    res.set({
      'Content-Type': response.headers['content-type'] || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'Access-Control-Allow-Origin': '*'
    });
    
    response.data.pipe(res);
    
  } catch (error) {
    console.error('Cover proxy error:', error.message);
    res.status(404).send('Cover image not found');
  }
});

// Generate QR Code for book
app.get('/api/books/:id/qr', authenticateToken, async (req, res) => {
  const bookId = req.params.id;

  try {
    const book = await database.getBookById(bookId);
    
    if (!book) {
      return res.status(404).json({ error: 'Buch nicht gefunden' });
    }

    const downloadUrl = `${req.protocol}://${req.get('host')}/api/books/${bookId}/download`;
    
    const qrCode = await QRCode.toDataURL(downloadUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({ qrCode, downloadUrl });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Fehler beim Generieren des QR-Codes' });
  }
});

// Serve React App with Share Route
app.get('/share/:token', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/build/index.html'));
});

// Serve main application
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/build/index.html'));
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
  res.sendFile(path.join(__dirname, './frontend/build/index.html'));
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
  console.log(`🗄️  Datenbank: PostgreSQL`);
});