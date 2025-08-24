-- Seed data for Lectoria
-- Initial admin user and categories

-- Insert default categories
INSERT INTO categories (id, name, description, color, icon) VALUES
    (uuid_generate_v4(), 'Romane', 'Belletristik und Unterhaltung', '#e91e63', 'auto_stories'),
    (uuid_generate_v4(), 'Sachbücher', 'Fach- und Sachbücher', '#2196f3', 'school'),
    (uuid_generate_v4(), 'Zeitschriften', 'Magazine und Periodika', '#4caf50', 'article'),
    (uuid_generate_v4(), 'Wissenschaft', 'Wissenschaftliche Publikationen', '#9c27b0', 'science'),
    (uuid_generate_v4(), 'Technik', 'Technische Literatur', '#ff9800', 'engineering'),
    (uuid_generate_v4(), 'Kochbücher', 'Rezepte und Kulinarisches', '#795548', 'restaurant'),
    (uuid_generate_v4(), 'Geschichte', 'Historische Werke', '#607d8b', 'history_edu'),
    (uuid_generate_v4(), 'Biographien', 'Lebensbeschreibungen', '#3f51b5', 'person'),
    (uuid_generate_v4(), 'Kinderbücher', 'Literatur für Kinder', '#ff5722', 'child_care'),
    (uuid_generate_v4(), 'Comics', 'Graphic Novels und Comics', '#9e9e9e', 'auto_awesome')
ON CONFLICT (name) DO NOTHING;

-- Insert default admin user (password: admin123)
-- Password hash for 'admin123' with bcrypt rounds=10
INSERT INTO users (id, username, email, password, role, must_change_password, is_active, created_at) VALUES
    (uuid_generate_v4(), 
     'admin', 
     'admin@lectoria.local', 
     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- admin123
     'admin', 
     TRUE, 
     TRUE, 
     NOW())
ON CONFLICT (username) DO NOTHING;

-- Create a sample regular user (password: user123)  
INSERT INTO users (id, username, email, password, role, must_change_password, is_active, created_at) VALUES
    (uuid_generate_v4(), 
     'testuser', 
     'user@lectoria.local', 
     '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjdRXYhRvEhzLrOQKQ1.rP2fz8zGLK', -- user123
     'user', 
     FALSE, 
     TRUE, 
     NOW())
ON CONFLICT (username) DO NOTHING;

-- Add some statistics views
CREATE OR REPLACE VIEW book_statistics AS
SELECT 
    c.name as category_name,
    c.color as category_color,
    COUNT(b.id) as book_count,
    AVG(b.file_size) as avg_file_size,
    SUM(b.download_count) as total_downloads
FROM categories c
LEFT JOIN books b ON c.id = b.category_id
GROUP BY c.id, c.name, c.color
ORDER BY book_count DESC;

CREATE OR REPLACE VIEW user_statistics AS  
SELECT 
    u.username,
    u.role,
    COUNT(b.id) as books_uploaded,
    SUM(b.download_count) as total_downloads_of_user_books,
    u.created_at as user_since
FROM users u
LEFT JOIN books b ON u.id = b.uploaded_by
WHERE u.is_active = TRUE
GROUP BY u.id, u.username, u.role, u.created_at
ORDER BY books_uploaded DESC;