// database.js - PostgreSQL Database Connection and Management
const { Pool } = require('pg');
const fs = require('fs-extra');
const path = require('path');

// Database configuration
const dbConfig = {
    connectionString: process.env.DATABASE_URL || 'postgresql://lectoria_user:lectoria_secure_2024@localhost:5432/lectoria',
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
            console.log('🔍 Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
            return res;
        } catch (error) {
            console.error('💥 Database query error:', error);
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
        const fields = [];
        const values = [];
        let paramCount = 1;

        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined) {
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
        const fields = [];
        const values = [];
        let paramCount = 1;

        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined) {
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
        return result.rows;
    }

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

    // Close database connection
    async close() {
        await this.pool.end();
        console.log('🔌 PostgreSQL connection pool closed');
    }
}

// Create and export database instance
const database = new Database();

module.exports = database;