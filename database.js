// database.js - PostgreSQL Database Connection and Management
const { Pool } = require('pg');
const fs = require('fs-extra');
const path = require('path');

// Database configuration
const dbConfig = {
    connectionString: process.env.DATABASE_URL || (() => {
        if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
            console.error('💥 ERROR: Database environment variables not set!');
            console.error('Required: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD');
            process.exit(1);
        }
        return `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`;
    })(),
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum pool connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

// Create connection pool
const pool = new Pool(dbConfig);

// Connection event handlers
pool.on('connect', (client) => {
    console.log('📊 New PostgreSQL client connected');
});

pool.on('error', (err, client) => {
    console.error('💥 Unexpected error on idle PostgreSQL client:', err);
    process.exit(-1);
});

// Database utility functions
class Database {
    constructor() {
        this.pool = pool;
    }

    // Execute a query
    async query(text, params) {
        const start = Date.now();
        try {
            const res = await this.pool.query(text, params);
            const duration = Date.now() - start;
            
            // Only log query info in development, never log parameters
            if (process.env.NODE_ENV !== 'production') {
                console.log('🔍 Query executed', { 
                    operation: text.split(' ')[0].toUpperCase(),
                    duration: `${duration}ms`, 
                    rows: res.rowCount 
                });
            }
            return res;
        } catch (error) {
            // Log error without exposing sensitive data
            console.error('💥 Database query failed:', {
                operation: text.split(' ')[0].toUpperCase(),
                error: error.code,
                message: error.message.replace(/\$\d+/g, '[PARAM]')
            });
            throw error;
        }
    }

    // Get a client from the pool for transactions
    async getClient() {
        return await this.pool.connect();
    }

    // Initialize database (run migrations if needed)
    async initialize() {
        try {
            console.log('🚀 Initializing PostgreSQL database...');
            
            // Test connection
            const client = await this.getClient();
            const result = await client.query('SELECT NOW() as current_time, version() as version');
            console.log('✅ PostgreSQL connected:', result.rows[0].current_time);
            console.log('📍 PostgreSQL version:', result.rows[0].version.split(' ')[0]);
            client.release();

            // Check if tables exist
            const tablesResult = await this.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            `);

            if (tablesResult.rows.length === 0) {
                console.log('📋 No tables found, database appears to be empty');
                console.log('💡 Run the init SQL files in init-db/ directory to set up the database');
            } else {
                console.log(`✅ Found ${tablesResult.rows.length} tables:`, 
                    tablesResult.rows.map(row => row.table_name).join(', '));
                
                // Initialize translation system if tables exist
                if (tablesResult.rows.some(row => row.table_name === 'categories')) {
                    await this.createTranslationTables();
                }
            }

            return true;
        } catch (error) {
            console.error('💥 Database initialization error:', error);
            throw error;
        }
    }

    // User management functions
    async createUser(userData) {
        const { username, email, password, role = 'user', must_change_password = false } = userData;
        const query = `
            INSERT INTO users (username, email, password, role, must_change_password) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING id, username, email, role, must_change_password, created_at
        `;
        const result = await this.query(query, [username, email, password, role, must_change_password]);
        return result.rows[0];
    }

    async getUserByUsername(username) {
        const query = 'SELECT * FROM users WHERE username = $1 AND is_active = TRUE';
        const result = await this.query(query, [username]);
        return result.rows[0];
    }

    async getUserById(id) {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await this.query(query, [id]);
        return result.rows[0];
    }

    async getAllUsers() {
        const query = `
            SELECT id, username, email, role, is_active, must_change_password, 
                   last_password_change, created_at, updated_at
            FROM users 
            ORDER BY created_at DESC
        `;
        const result = await this.query(query);
        return result.rows;
    }

    async updateUser(id, updates) {
        // Whitelist of allowed fields to prevent SQL injection
        const allowedFields = ['role', 'is_active', 'must_change_password', 'email', 'username'];
        
        const fields = [];
        const values = [];
        let paramCount = 1;

        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined && allowedFields.includes(key)) {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        });

        if (fields.length === 0) return null;

        values.push(id);
        const query = `
            UPDATE users SET ${fields.join(', ')}, updated_at = NOW() 
            WHERE id = $${paramCount} 
            RETURNING *
        `;
        const result = await this.query(query, values);
        return result.rows[0];
    }

    async deleteUser(id) {
        const query = 'DELETE FROM users WHERE id = $1 RETURNING *';
        const result = await this.query(query, [id]);
        return result.rows[0];
    }

    async updateUserPassword(id, hashedPassword, passwordChangeDate) {
        const query = `
            UPDATE users 
            SET password = $1, must_change_password = FALSE, last_password_change = $2, updated_at = NOW()
            WHERE id = $3 
            RETURNING id, username, email, role, must_change_password, last_password_change
        `;
        const result = await this.query(query, [hashedPassword, passwordChangeDate, id]);
        return result.rows[0];
    }

    // Category management functions
    async getAllCategories() {
        const query = 'SELECT * FROM categories ORDER BY name';
        const result = await this.query(query);
        return result.rows;
    }

    async createCategory(categoryData) {
        const { name, description, color = '#1976d2', icon = 'folder' } = categoryData;
        const query = `
            INSERT INTO categories (name, description, color, icon) 
            VALUES ($1, $2, $3, $4) 
            RETURNING *
        `;
        const result = await this.query(query, [name, description, color, icon]);
        return result.rows[0];
    }

    async updateCategory(id, updates) {
        // Whitelist of allowed fields to prevent SQL injection
        const allowedFields = ['name', 'description', 'color', 'icon'];
        
        const fields = [];
        const values = [];
        let paramCount = 1;

        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined && allowedFields.includes(key)) {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        });

        if (fields.length === 0) return null;

        values.push(id);
        const query = `
            UPDATE categories SET ${fields.join(', ')}, updated_at = NOW() 
            WHERE id = $${paramCount} 
            RETURNING *
        `;
        const result = await this.query(query, values);
        return result.rows[0];
    }

    async deleteCategory(id) {
        const query = 'DELETE FROM categories WHERE id = $1 RETURNING *';
        const result = await this.query(query, [id]);
        return result.rows[0];
    }

    // Book management functions

    async getBooksCount(filters = {}) {
        let query = 'SELECT COUNT(*) as total FROM books b';
        
        const conditions = [];
        const values = [];
        let paramCount = 1;

        if (filters.search) {
            conditions.push(`(b.title ILIKE $${paramCount} OR b.author ILIKE $${paramCount})`);
            values.push(`%${filters.search}%`);
            paramCount++;
        }

        if (filters.type && filters.type !== 'all') {
            conditions.push(`b.type = $${paramCount}`);
            values.push(filters.type);
            paramCount++;
        }

        if (filters.category_id) {
            conditions.push(`b.category_id = $${paramCount}`);
            values.push(filters.category_id);
            paramCount++;
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        const result = await this.query(query, values);
        return parseInt(result.rows[0].total);
    }

    async createBook(bookData) {
        const query = `
            INSERT INTO books (title, author, description, type, category_id, filename, filepath, file_size, cover_image, uploaded_by) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
            RETURNING *
        `;
        const values = [
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
        ];
        const result = await this.query(query, values);
        return result.rows[0];
    }

    async deleteBook(id) {
        const query = 'DELETE FROM books WHERE id = $1 RETURNING *';
        const result = await this.query(query, [id]);
        return result.rows[0];
    }

    // Share links management
    async createShareLink(shareData) {
        const { book_id, share_token, created_by, expires_at } = shareData;
        const query = `
            INSERT INTO share_links (book_id, share_token, created_by, expires_at) 
            VALUES ($1, $2, $3, $4) 
            RETURNING *
        `;
        const result = await this.query(query, [book_id, share_token, created_by, expires_at]);
        return result.rows[0];
    }

    async getShareLink(token) {
        const query = `
            SELECT sl.*, b.title, b.author, b.description, b.type, b.filename, 
                   b.filepath, b.file_size, b.upload_date, u.username as creator_name
            FROM share_links sl
            JOIN books b ON sl.book_id = b.id
            JOIN users u ON sl.created_by = u.id
            WHERE sl.share_token = $1 AND sl.is_active = TRUE
            AND (sl.expires_at IS NULL OR sl.expires_at > NOW())
        `;
        const result = await this.query(query, [token]);
        return result.rows[0];
    }

    async getBookById(id) {
        const query = 'SELECT * FROM books WHERE id = $1';
        const result = await this.query(query, [id]);
        return result.rows[0];
    }

    async incrementDownloadCount(bookId) {
        const query = 'UPDATE books SET download_count = download_count + 1 WHERE id = $1 RETURNING *';
        const result = await this.query(query, [bookId]);
        return result.rows[0];
    }

    async getShareLinksForBook(bookId) {
        const query = `
            SELECT sl.*, u.username as created_by_name
            FROM share_links sl
            LEFT JOIN users u ON sl.created_by = u.id
            WHERE sl.book_id = $1 AND sl.is_active = TRUE
            ORDER BY sl.created_at DESC
        `;
        const result = await this.query(query, [bookId]);
        return result.rows;
    }

    async getShareLinkWithBook(token) {
        const query = `
            SELECT sl.*, b.uploaded_by
            FROM share_links sl
            JOIN books b ON sl.book_id = b.id
            WHERE sl.share_token = $1
        `;
        const result = await this.query(query, [token]);
        return result.rows[0];
    }

    async deactivateShareLink(token) {
        const query = 'UPDATE share_links SET is_active = FALSE WHERE share_token = $1 RETURNING *';
        const result = await this.query(query, [token]);
        return result.rows[0];
    }

    async getBookByShareToken(token) {
        const query = `
            SELECT sl.*, b.*, u.username as uploader_name
            FROM share_links sl
            JOIN books b ON sl.book_id = b.id
            LEFT JOIN users u ON b.uploaded_by = u.id
            WHERE sl.share_token = $1 AND sl.is_active = TRUE
        `;
        const result = await this.query(query, [token]);
        return result.rows[0];
    }

    async incrementShareAccessCount(token) {
        const query = 'UPDATE share_links SET access_count = access_count + 1 WHERE share_token = $1 RETURNING *';
        const result = await this.query(query, [token]);
        return result.rows[0];
    }

    async getAllBooksForExport() {
        const query = `
            SELECT b.*, u.username as uploader_name, c.name as category_name
            FROM books b
            LEFT JOIN users u ON b.uploaded_by = u.id
            LEFT JOIN categories c ON b.category_id = c.id
            ORDER BY b.upload_date DESC
        `;
        const result = await this.query(query);
        return result.rows;
    }

    // Initialize database method to create tables and seed data if needed
    async initializeDatabase() {
        try {
            await this.initialize();
            
            // Check if we have any users - if not, create default admin
            const userCount = await this.query('SELECT COUNT(*) as count FROM users');
            if (userCount.rows[0].count === '0') {
                console.log('🔧 No users found, creating default admin user...');
                
                const bcrypt = require('bcryptjs');
                const { v4: uuidv4 } = require('uuid');
                
                const adminData = {
                    id: uuidv4(),
                    username: 'admin',
                    email: 'admin@lectoria.local',
                    password: bcrypt.hashSync('admin123', 10),
                    role: 'admin',
                    must_change_password: false // Fix: Set to false to prevent infinite loop
                };

                await this.query(`
                    INSERT INTO users (id, username, email, password, role, must_change_password, is_active) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [adminData.id, adminData.username, adminData.email, adminData.password, 
                    adminData.role, adminData.must_change_password, true]);
                
                console.log('✅ Default admin user created (admin/admin123)');
            }

            return true;
        } catch (error) {
            console.error('💥 Database initialization failed:', error);
            throw error;
        }
    }

    // Translation system methods
    async createTranslationTables() {
        try {
            // Create translations table for static UI text
            await this.query(`
                CREATE TABLE IF NOT EXISTS translations (
                    id SERIAL PRIMARY KEY,
                    translation_key VARCHAR(255) NOT NULL,
                    language VARCHAR(5) NOT NULL,
                    value TEXT NOT NULL,
                    context VARCHAR(100) DEFAULT 'ui',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(translation_key, language, context)
                )
            `);

            // Create category_translations table for dynamic category content
            await this.query(`
                CREATE TABLE IF NOT EXISTS category_translations (
                    id SERIAL PRIMARY KEY,
                    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
                    language VARCHAR(5) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(category_id, language)
                )
            `);

            console.log('✅ Translation tables created/verified');
            
            // Check if we need to migrate existing category data
            await this.migrateExistingCategoryTranslations();
            
        } catch (error) {
            console.error('💥 Failed to create translation tables:', error);
            throw error;
        }
    }

    async migrateExistingCategoryTranslations() {
        try {
            // Check if we already have translations
            const existingTranslations = await this.query(
                'SELECT COUNT(*) as count FROM category_translations'
            );
            
            if (existingTranslations.rows[0].count > 0) {
                console.log('📚 Category translations already exist, skipping migration');
                return;
            }

            console.log('🔄 Migrating existing categories to translation system...');

            // Get all existing categories
            const categories = await this.query('SELECT * FROM categories ORDER BY id');
            
            if (categories.rows.length === 0) {
                console.log('📝 No categories to migrate');
                return;
            }

            // Translation mappings for existing German categories
            const categoryTranslations = {
                'Biographien': { en: 'Biographies', de: 'Biographien' },
                'Comics': { en: 'Comics', de: 'Comics' },
                'Geschichte': { en: 'History', de: 'Geschichte' },
                'Kinderbücher': { en: 'Children\'s Books', de: 'Kinderbücher' },
                'Kochbücher': { en: 'Cookbooks', de: 'Kochbücher' },
                'Natur': { en: 'Nature', de: 'Natur' },
                'Romane': { en: 'Novels', de: 'Romane' },
                'Sachbücher': { en: 'Non-Fiction', de: 'Sachbücher' },
                'Technik': { en: 'Technology', de: 'Technik' },
                'Wissenschaft': { en: 'Science', de: 'Wissenschaft' },
                'Zeitschriften': { en: 'Magazines', de: 'Zeitschriften' }
            };

            const descriptionTranslations = {
                'Lebensbeschreibungen': { en: 'Life descriptions', de: 'Lebensbeschreibungen' },
                'Graphic Novels und Comics': { en: 'Graphic novels and comics', de: 'Graphic Novels und Comics' },
                'Historische Werke': { en: 'Historical works', de: 'Historische Werke' },
                'Keine Beschreibung': { en: 'No description', de: 'Keine Beschreibung' },
                'Literatur für Kinder': { en: 'Literature for children', de: 'Literatur für Kinder' },
                'Rezepte und Kulinarisches': { en: 'Recipes and culinary', de: 'Rezepte und Kulinarisches' },
                'alles zum Thema Natur': { en: 'Everything about nature', de: 'alles zum Thema Natur' },
                'Belletristik und Unterhaltung': { en: 'Fiction and entertainment', de: 'Belletristik und Unterhaltung' },
                'Fach- und Sachbücher': { en: 'Professional and reference books', de: 'Fach- und Sachbücher' },
                'Technische Literatur': { en: 'Technical literature', de: 'Technische Literatur' },
                'Wissenschaftliche Publikationen': { en: 'Scientific publications', de: 'Wissenschaftliche Publikationen' },
                'Magazine und Periodika': { en: 'Magazines and periodicals', de: 'Magazine und Periodika' }
            };

            // Insert translations for each category
            for (const category of categories.rows) {
                const nameTranslations = categoryTranslations[category.name];
                const descTranslations = descriptionTranslations[category.description];
                
                // Insert German (original)
                await this.query(`
                    INSERT INTO category_translations (category_id, language, name, description)
                    VALUES ($1, 'de', $2, $3)
                    ON CONFLICT (category_id, language) DO NOTHING
                `, [category.id, category.name, category.description]);
                
                // Insert English translation
                if (nameTranslations && nameTranslations.en) {
                    await this.query(`
                        INSERT INTO category_translations (category_id, language, name, description)
                        VALUES ($1, 'en', $2, $3)
                        ON CONFLICT (category_id, language) DO NOTHING
                    `, [
                        category.id, 
                        nameTranslations.en, 
                        descTranslations ? descTranslations.en : 'No description'
                    ]);
                }
            }

            console.log(`✅ Migrated ${categories.rows.length} categories to translation system`);

        } catch (error) {
            console.error('💥 Failed to migrate category translations:', error);
            throw error;
        }
    }

    // Get translated category data
    async getCategoriesWithTranslations(language = 'en') {
        try {
            const query = `
                SELECT 
                    c.id, c.name as original_name, c.description as original_description, 
                    c.color, c.icon, c.created_at,
                    COALESCE(ct.name, c.name) as name,
                    COALESCE(ct.description, c.description) as description
                FROM categories c
                LEFT JOIN category_translations ct ON c.id = ct.category_id AND ct.language = $1
                ORDER BY c.id
            `;
            
            const result = await this.query(query, [language]);
            return result.rows;
        } catch (error) {
            console.error('💥 Failed to get categories with translations:', error);
            throw error;
        }
    }

    // Get translation by key
    async getTranslation(key, language = 'en', context = 'ui') {
        try {
            const result = await this.query(
                'SELECT value FROM translations WHERE translation_key = $1 AND language = $2 AND context = $3',
                [key, language, context]
            );
            
            return result.rows[0]?.value || null;
        } catch (error) {
            console.error('💥 Failed to get translation:', error);
            return null;
        }
    }

    // Set/update translation
    async setTranslation(key, language, value, context = 'ui') {
        try {
            await this.query(`
                INSERT INTO translations (translation_key, language, value, context, updated_at)
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (translation_key, language, context)
                DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
            `, [key, language, value, context]);
            
            return true;
        } catch (error) {
            console.error('💥 Failed to set translation:', error);
            return false;
        }
    }

    // Combined method for books with count
    async getBooks(filters = {}) {
        // Get total count first
        const total = await this.getBooksCount(filters);
        
        // Get books
        let query = `
            SELECT b.*, u.username as uploader_name, 
                   c.name as category_name, c.color as category_color, c.icon as category_icon
            FROM books b 
            LEFT JOIN users u ON b.uploaded_by = u.id 
            LEFT JOIN categories c ON b.category_id = c.id
        `;
        
        const conditions = [];
        const values = [];
        let paramCount = 1;

        if (filters.search) {
            conditions.push(`(b.title ILIKE $${paramCount} OR b.author ILIKE $${paramCount})`);
            values.push(`%${filters.search}%`);
            paramCount++;
        }

        if (filters.type && filters.type !== 'all') {
            conditions.push(`b.type = $${paramCount}`);
            values.push(filters.type);
            paramCount++;
        }

        if (filters.category_id) {
            conditions.push(`b.category_id = $${paramCount}`);
            values.push(filters.category_id);
            paramCount++;
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY b.upload_date DESC';

        if (filters.limit) {
            query += ` LIMIT $${paramCount}`;
            values.push(filters.limit);
            paramCount++;
        }

        if (filters.offset) {
            query += ` OFFSET $${paramCount}`;
            values.push(filters.offset);
        }

        const result = await this.query(query, values);
        
        return {
            books: result.rows,
            total: total
        };
    }

    // Close database connection
    async close() {
        await this.pool.end();
        console.log('🔌 PostgreSQL connection pool closed');
    }
}

// Create and export database instance
const database = new Database();

module.exports = database;