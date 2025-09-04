// database.js - SQLite Database Connection and Management
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Database configuration
const dbPath = process.env.DB_PATH || path.join(__dirname, 'lectoria.db');

// Ensure the directory exists
const dbDir = path.dirname(dbPath);
fs.ensureDirSync(dbDir);

console.log(`📁 Database location: ${dbPath}`);

// Create connection with better error handling
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('💥 Error opening database:', err);
        process.exit(1);
    }
    console.log('✅ Connected to SQLite database');
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Database utility class
class Database {
    constructor() {
        this.db = db;
        this.initPromise = null;
    }

    // Promisify database methods
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('Database error:', err);
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('Database error:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('Database error:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Compatibility wrapper for PostgreSQL-style query
    async query(sql, params = []) {
        // Convert PostgreSQL placeholders ($1, $2, etc.) to SQLite placeholders (?)
        let sqliteQuery = sql;
        if (params && params.length > 0) {
            for (let i = params.length; i >= 1; i--) {
                sqliteQuery = sqliteQuery.replace(new RegExp(`\\$${i}`, 'g'), '?');
            }
        }

        // Convert PostgreSQL specific syntax
        sqliteQuery = sqliteQuery.replace(/ILIKE/gi, 'LIKE');
        sqliteQuery = sqliteQuery.replace(/NOW\(\)/gi, "datetime('now')");
        sqliteQuery = sqliteQuery.replace(/RETURNING \*/gi, '');
        
        try {
            if (sqliteQuery.trim().toUpperCase().startsWith('SELECT') || 
                sqliteQuery.trim().toUpperCase().startsWith('WITH')) {
                const rows = await this.all(sqliteQuery, params);
                return { rows, rowCount: rows.length };
            } else {
                const result = await this.run(sqliteQuery, params);
                return { rows: [], rowCount: result.changes };
            }
        } catch (error) {
            console.error('Query error:', error);
            throw error;
        }
    }

    // Initialize database tables
    async initializeDatabase() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._initializeDatabase();
        return this.initPromise;
    }

    async _initializeDatabase() {
        try {
            console.log('🚀 Initializing SQLite database...');

            // Create users table
            await this.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT DEFAULT 'user',
                    is_active INTEGER DEFAULT 1,
                    must_change_password INTEGER DEFAULT 0,
                    last_password_change TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                )
            `);

            // Create categories table
            await this.run(`
                CREATE TABLE IF NOT EXISTS categories (
                    id TEXT PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL,
                    description TEXT,
                    color TEXT DEFAULT '#1976d2',
                    icon TEXT DEFAULT 'folder',
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                )
            `);

            // Create books table
            await this.run(`
                CREATE TABLE IF NOT EXISTS books (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    author TEXT DEFAULT 'Unbekannt',
                    description TEXT,
                    type TEXT DEFAULT 'book',
                    category_id TEXT,
                    filename TEXT NOT NULL,
                    filepath TEXT NOT NULL,
                    file_size INTEGER,
                    cover_image TEXT,
                    download_count INTEGER DEFAULT 0,
                    uploaded_by TEXT,
                    upload_date TEXT DEFAULT (datetime('now')),
                    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
                    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
                )
            `);

            // Create share_links table
            await this.run(`
                CREATE TABLE IF NOT EXISTS share_links (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    book_id TEXT NOT NULL,
                    share_token TEXT UNIQUE NOT NULL,
                    created_by TEXT,
                    is_active INTEGER DEFAULT 1,
                    access_count INTEGER DEFAULT 0,
                    expires_at TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
                    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
                )
            `);

            // Create system_settings table
            await this.run(`
                CREATE TABLE IF NOT EXISTS system_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    setting_key TEXT UNIQUE NOT NULL,
                    setting_value TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                )
            `);

            // Create translations table
            await this.run(`
                CREATE TABLE IF NOT EXISTS translations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    translation_key TEXT NOT NULL,
                    language TEXT NOT NULL,
                    value TEXT NOT NULL,
                    context TEXT DEFAULT 'ui',
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now')),
                    UNIQUE(translation_key, language, context)
                )
            `);

            // Create category_translations table
            await this.run(`
                CREATE TABLE IF NOT EXISTS category_translations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category_id TEXT NOT NULL,
                    language TEXT NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now')),
                    UNIQUE(category_id, language),
                    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
                )
            `);

            // Create indexes for better performance
            await this.run('CREATE INDEX IF NOT EXISTS idx_books_title ON books(title)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_books_author ON books(author)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_books_uploaded_by ON books(uploaded_by)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(share_token)');

            console.log('✅ Database tables created/verified');

            // Check if we have any users - if not, create default admin
            const userCount = await this.get('SELECT COUNT(*) as count FROM users');
            if (userCount.count === 0) {
                console.log('🔧 No users found, creating default admin user...');
                
                const adminData = {
                    id: uuidv4(),
                    username: 'admin',
                    email: 'admin@lectoria.local',
                    password: bcrypt.hashSync('admin123', 10),
                    role: 'admin',
                    must_change_password: 0,
                    is_active: 1
                };

                await this.run(`
                    INSERT INTO users (id, username, email, password, role, must_change_password, is_active) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [adminData.id, adminData.username, adminData.email, adminData.password, 
                    adminData.role, adminData.must_change_password, adminData.is_active]);
                
                console.log('✅ Default admin user created (admin/admin123)');
            }

            // Initialize default system settings if none exist
            const settingsCount = await this.get('SELECT COUNT(*) as count FROM system_settings');
            if (settingsCount.count === 0) {
                console.log('🔧 Creating default system settings...');
                
                // Default setting: Allow registration is enabled
                await this.run(`
                    INSERT INTO system_settings (setting_key, setting_value) 
                    VALUES ('allow_registration', 'true')
                `);
                
                console.log('✅ Default system settings created');
            }

            // Initialize default categories if none exist
            const categoryCount = await this.get('SELECT COUNT(*) as count FROM categories');
            if (categoryCount.count === 0) {
                console.log('🔧 Creating default categories...');
                await this.initializeDefaultCategories();
            }

            // Add English translations for existing categories (migration)
            await this.addEnglishTranslationsIfMissing();

            return true;
        } catch (error) {
            console.error('💥 Database initialization failed:', error);
            throw error;
        }
    }

    async initializeDefaultCategories() {
        const defaultCategories = [
            { 
                name: 'Romane', 
                description: 'Belletristik und Unterhaltung', 
                color: '#4CAF50', 
                icon: 'book',
                translations: {
                    en: { name: 'Novels', description: 'Fiction and Entertainment' },
                    de: { name: 'Romane', description: 'Belletristik und Unterhaltung' }
                }
            },
            { 
                name: 'Sachbücher', 
                description: 'Fach- und Sachbücher', 
                color: '#2196F3', 
                icon: 'school',
                translations: {
                    en: { name: 'Non-Fiction', description: 'Professional and Educational Books' },
                    de: { name: 'Sachbücher', description: 'Fach- und Sachbücher' }
                }
            },
            { 
                name: 'Wissenschaft', 
                description: 'Wissenschaftliche Publikationen', 
                color: '#9C27B0', 
                icon: 'science',
                translations: {
                    en: { name: 'Science', description: 'Scientific Publications' },
                    de: { name: 'Wissenschaft', description: 'Wissenschaftliche Publikationen' }
                }
            },
            { 
                name: 'Geschichte', 
                description: 'Historische Werke', 
                color: '#795548', 
                icon: 'history',
                translations: {
                    en: { name: 'History', description: 'Historical Works' },
                    de: { name: 'Geschichte', description: 'Historische Werke' }
                }
            },
            { 
                name: 'Biographien', 
                description: 'Lebensbeschreibungen', 
                color: '#FF9800', 
                icon: 'person',
                translations: {
                    en: { name: 'Biographies', description: 'Life Stories' },
                    de: { name: 'Biographien', description: 'Lebensbeschreibungen' }
                }
            },
            { 
                name: 'Kinderbücher', 
                description: 'Literatur für Kinder', 
                color: '#00BCD4', 
                icon: 'child_care',
                translations: {
                    en: { name: 'Children\'s Books', description: 'Literature for Children' },
                    de: { name: 'Kinderbücher', description: 'Literatur für Kinder' }
                }
            },
            { 
                name: 'Comics', 
                description: 'Graphic Novels und Comics', 
                color: '#FFEB3B', 
                icon: 'bubble_chart',
                translations: {
                    en: { name: 'Comics', description: 'Graphic Novels and Comics' },
                    de: { name: 'Comics', description: 'Graphic Novels und Comics' }
                }
            },
            { 
                name: 'Technik', 
                description: 'Technische Literatur', 
                color: '#607D8B', 
                icon: 'engineering',
                translations: {
                    en: { name: 'Technology', description: 'Technical Literature' },
                    de: { name: 'Technik', description: 'Technische Literatur' }
                }
            },
            { 
                name: 'Kochbücher', 
                description: 'Rezepte und Kulinarisches', 
                color: '#FF5722', 
                icon: 'restaurant',
                translations: {
                    en: { name: 'Cookbooks', description: 'Recipes and Culinary' },
                    de: { name: 'Kochbücher', description: 'Rezepte und Kulinarisches' }
                }
            },
            { 
                name: 'Zeitschriften', 
                description: 'Magazine und Periodika', 
                color: '#E91E63', 
                icon: 'article',
                translations: {
                    en: { name: 'Magazines', description: 'Magazines and Periodicals' },
                    de: { name: 'Zeitschriften', description: 'Magazine und Periodika' }
                }
            },
            { 
                name: 'Natur', 
                description: 'alles zum Thema Natur', 
                color: '#4CAF50', 
                icon: 'nature',
                translations: {
                    en: { name: 'Nature', description: 'Everything about Nature' },
                    de: { name: 'Natur', description: 'alles zum Thema Natur' }
                }
            }
        ];

        for (const category of defaultCategories) {
            const id = uuidv4();
            await this.run(`
                INSERT INTO categories (id, name, description, color, icon) 
                VALUES (?, ?, ?, ?, ?)
            `, [id, category.name, category.description, category.color, category.icon]);

            // Add translations for multiple languages
            for (const [lang, translation] of Object.entries(category.translations)) {
                await this.run(`
                    INSERT INTO category_translations (category_id, language, name, description) 
                    VALUES (?, ?, ?, ?)
                `, [id, lang, translation.name, translation.description]);
            }
        }

        console.log('✅ Default categories created');
    }

    // Migration function to add English translations to existing categories
    async addEnglishTranslationsIfMissing() {
        try {
            // Check if we already have English translations
            const existingEnTranslations = await this.get(
                'SELECT COUNT(*) as count FROM category_translations WHERE language = ?',
                ['en']
            );

            if (existingEnTranslations.count > 0) {
                console.log('✅ English translations already exist');
                return;
            }

            console.log('🔧 Adding English translations for existing categories...');

            // English translation map for default German categories
            const translationMap = {
                'Romane': 'Novels',
                'Sachbücher': 'Non-Fiction', 
                'Wissenschaft': 'Science',
                'Geschichte': 'History',
                'Biographien': 'Biographies',
                'Kinderbücher': 'Children\'s Books',
                'Comics': 'Comics',
                'Technik': 'Technology',
                'Kochbücher': 'Cookbooks',
                'Zeitschriften': 'Magazines',
                'Natur': 'Nature'
            };

            const categories = await this.all('SELECT * FROM categories');

            for (const category of categories) {
                const englishName = translationMap[category.name] || category.name;
                
                await this.run(`
                    INSERT OR IGNORE INTO category_translations (category_id, language, name, description) 
                    VALUES (?, 'en', ?, ?)
                `, [category.id, englishName, category.description]);
            }

            console.log('✅ English translations added for existing categories');
        } catch (error) {
            console.error('Error adding English translations:', error);
        }
    }

    // User management functions
    async createUser(userData) {
        const { id = uuidv4(), username, email, password, role = 'user', must_change_password = 0 } = userData;
        await this.run(`
            INSERT INTO users (id, username, email, password, role, must_change_password) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id, username, email, password, role, must_change_password]);
        
        return await this.getUserById(id);
    }

    async getUserByUsername(username) {
        return await this.get('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
    }

    async getUserById(id) {
        return await this.get('SELECT * FROM users WHERE id = ?', [id]);
    }

    async getAllUsers() {
        return await this.all(`
            SELECT id, username, email, role, is_active, must_change_password, 
                   last_password_change, created_at, updated_at
            FROM users 
            ORDER BY created_at DESC
        `);
    }

    async updateUser(id, updates) {
        const allowedFields = ['role', 'is_active', 'must_change_password', 'email', 'username'];
        const fields = [];
        const values = [];

        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined && allowedFields.includes(key)) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        });

        if (fields.length === 0) return null;

        values.push(id);
        await this.run(`
            UPDATE users SET ${fields.join(', ')}, updated_at = datetime('now') 
            WHERE id = ?
        `, values);
        
        return await this.getUserById(id);
    }

    async deleteUser(id) {
        const user = await this.getUserById(id);
        if (user) {
            await this.run('DELETE FROM users WHERE id = ?', [id]);
        }
        return user;
    }

    async updateUserPassword(id, hashedPassword, passwordChangeDate) {
        await this.run(`
            UPDATE users 
            SET password = ?, must_change_password = 0, last_password_change = ?, updated_at = datetime('now')
            WHERE id = ?
        `, [hashedPassword, passwordChangeDate, id]);
        
        return await this.getUserById(id);
    }

    // Category management functions
    async getAllCategories() {
        return await this.all('SELECT * FROM categories ORDER BY name');
    }

    async createCategory(categoryData) {
        const { id = uuidv4(), name, description, color = '#1976d2', icon = 'folder' } = categoryData;
        await this.run(`
            INSERT INTO categories (id, name, description, color, icon) 
            VALUES (?, ?, ?, ?, ?)
        `, [id, name, description, color, icon]);
        
        return await this.get('SELECT * FROM categories WHERE id = ?', [id]);
    }

    async updateCategory(id, updates) {
        const allowedFields = ['name', 'description', 'color', 'icon'];
        const fields = [];
        const values = [];

        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined && allowedFields.includes(key)) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        });

        if (fields.length === 0) return null;

        values.push(id);
        await this.run(`
            UPDATE categories SET ${fields.join(', ')}, updated_at = datetime('now') 
            WHERE id = ?
        `, values);
        
        return await this.get('SELECT * FROM categories WHERE id = ?', [id]);
    }

    async deleteCategory(id) {
        const category = await this.get('SELECT * FROM categories WHERE id = ?', [id]);
        if (category) {
            await this.run('DELETE FROM categories WHERE id = ?', [id]);
        }
        return category;
    }

    // Book management functions
    async createBook(bookData) {
        const id = uuidv4();
        await this.run(`
            INSERT INTO books (id, title, author, description, type, category_id, filename, filepath, file_size, cover_image, uploaded_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id,
            bookData.title,
            bookData.author,
            bookData.description,
            bookData.type,
            bookData.category_id || null,
            bookData.filename,
            bookData.filepath,
            bookData.file_size,
            bookData.cover_image || null,
            bookData.uploaded_by
        ]);
        
        return await this.getBookById(id);
    }

    async getBookById(id) {
        return await this.get('SELECT * FROM books WHERE id = ?', [id]);
    }

    async deleteBook(id) {
        const book = await this.getBookById(id);
        if (book) {
            await this.run('DELETE FROM books WHERE id = ?', [id]);
        }
        return book;
    }

    async updateBook(id, updates) {
        const allowedFields = ['title', 'author', 'description', 'cover_image'];
        const fields = [];
        const values = [];

        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined && allowedFields.includes(key)) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        });

        if (fields.length === 0) return false;

        values.push(id);
        const result = await this.run(`
            UPDATE books SET ${fields.join(', ')}
            WHERE id = ?
        `, values);
        
        return result.changes > 0;
    }

    async incrementDownloadCount(bookId) {
        await this.run('UPDATE books SET download_count = download_count + 1 WHERE id = ?', [bookId]);
        return await this.getBookById(bookId);
    }

    async getBooks(filters = {}) {
        let query = `
            SELECT b.*, u.username as uploader_name, 
                   c.name as category_name, c.color as category_color, c.icon as category_icon
            FROM books b 
            LEFT JOIN users u ON b.uploaded_by = u.id 
            LEFT JOIN categories c ON b.category_id = c.id
        `;
        
        const conditions = [];
        const values = [];

        if (filters.search) {
            conditions.push(`(b.title LIKE ? OR b.author LIKE ?)`);
            values.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        if (filters.type && filters.type !== 'all') {
            conditions.push(`b.type = ?`);
            values.push(filters.type);
        }

        if (filters.category_id) {
            conditions.push(`b.category_id = ?`);
            values.push(filters.category_id);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY b.upload_date DESC';

        if (filters.limit) {
            query += ' LIMIT ?';
            values.push(filters.limit);
            
            if (filters.offset) {
                query += ' OFFSET ?';
                values.push(filters.offset);
            }
        }

        const books = await this.all(query, values);
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM books b';
        const countConditions = [];
        const countValues = [];

        if (filters.search) {
            countConditions.push(`(b.title LIKE ? OR b.author LIKE ?)`);
            countValues.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        if (filters.type && filters.type !== 'all') {
            countConditions.push(`b.type = ?`);
            countValues.push(filters.type);
        }

        if (filters.category_id) {
            countConditions.push(`b.category_id = ?`);
            countValues.push(filters.category_id);
        }

        if (countConditions.length > 0) {
            countQuery += ' WHERE ' + countConditions.join(' AND ');
        }

        const countResult = await this.get(countQuery, countValues);
        
        return {
            books: books,
            total: countResult.total
        };
    }

    async getAllBooksForExport() {
        return await this.all(`
            SELECT b.*, u.username as uploader_name, c.name as category_name
            FROM books b
            LEFT JOIN users u ON b.uploaded_by = u.id
            LEFT JOIN categories c ON b.category_id = c.id
            ORDER BY b.upload_date DESC
        `);
    }

    // Share links management
    async createShareLink(shareData) {
        const { book_id, share_token, created_by, expires_at } = shareData;
        const result = await this.run(`
            INSERT INTO share_links (book_id, share_token, created_by, expires_at) 
            VALUES (?, ?, ?, ?)
        `, [book_id, share_token, created_by, expires_at]);
        
        return await this.get('SELECT * FROM share_links WHERE id = ?', [result.id]);
    }

    async getShareLinksForBook(bookId) {
        return await this.all(`
            SELECT sl.*, u.username as created_by_name
            FROM share_links sl
            LEFT JOIN users u ON sl.created_by = u.id
            WHERE sl.book_id = ? AND sl.is_active = 1
            ORDER BY sl.created_at DESC
        `, [bookId]);
    }

    async getShareLinkWithBook(token) {
        return await this.get(`
            SELECT sl.*, b.uploaded_by
            FROM share_links sl
            JOIN books b ON sl.book_id = b.id
            WHERE sl.share_token = ?
        `, [token]);
    }

    async deactivateShareLink(token) {
        await this.run('UPDATE share_links SET is_active = 0 WHERE share_token = ?', [token]);
        return await this.get('SELECT * FROM share_links WHERE share_token = ?', [token]);
    }

    async getBookByShareToken(token) {
        return await this.get(`
            SELECT sl.*, b.*, u.username as uploader_name
            FROM share_links sl
            JOIN books b ON sl.book_id = b.id
            LEFT JOIN users u ON b.uploaded_by = u.id
            WHERE sl.share_token = ? AND sl.is_active = 1
        `, [token]);
    }

    async incrementShareAccessCount(token) {
        await this.run('UPDATE share_links SET access_count = access_count + 1 WHERE share_token = ?', [token]);
        return await this.get('SELECT * FROM share_links WHERE share_token = ?', [token]);
    }

    // Translation methods
    async getCategoriesWithTranslations(language = 'en') {
        return await this.all(`
            SELECT 
                c.id, c.name as original_name, c.description as original_description, 
                c.color, c.icon, c.created_at,
                COALESCE(ct.name, c.name) as name,
                COALESCE(ct.description, c.description) as description
            FROM categories c
            LEFT JOIN category_translations ct ON c.id = ct.category_id AND ct.language = ?
            ORDER BY c.id
        `, [language]);
    }

    async getTranslation(key, language = 'en', context = 'ui') {
        const result = await this.get(
            'SELECT value FROM translations WHERE translation_key = ? AND language = ? AND context = ?',
            [key, language, context]
        );
        
        return result?.value || null;
    }

    async setTranslation(key, language, value, context = 'ui') {
        try {
            await this.run(`
                INSERT INTO translations (translation_key, language, value, context, updated_at)
                VALUES (?, ?, ?, ?, datetime('now'))
                ON CONFLICT (translation_key, language, context)
                DO UPDATE SET value = excluded.value, updated_at = datetime('now')
            `, [key, language, value, context]);
            
            return true;
        } catch (error) {
            console.error('Failed to set translation:', error);
            return false;
        }
    }

    // Helper method for compatibility
    async getClient() {
        // SQLite doesn't use connection pooling in the same way
        // Return a mock client object for compatibility
        return {
            query: (sql, params) => this.query(sql, params),
            release: () => {} // No-op for SQLite
        };
    }

    // Close database connection
    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                    reject(err);
                } else {
                    console.log('🔌 SQLite database connection closed');
                    resolve();
                }
            });
        });
    }
}

// Create and export database instance
const database = new Database();

module.exports = database;