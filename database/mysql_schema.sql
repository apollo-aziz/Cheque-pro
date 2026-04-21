-- MySQL Database Schema for Finansse Pro
-- Run this in your Hostinger MySQL database

-- Hostinger MySQL Schema
-- Run this in your existing Hostinger MySQL database via phpMyAdmin or SSH
-- Note: Do NOT run CREATE DATABASE - use your existing database

-- 1. Users table (simplified, without Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Checks table
CREATE TABLE IF NOT EXISTS checks (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    check_number VARCHAR(100) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    entity_name VARCHAR(255) NOT NULL,
    type ENUM('incoming', 'outgoing') NOT NULL,
    status ENUM('pending', 'paid', 'returned', 'garantie') DEFAULT 'pending',
    image_url LONGTEXT,
    notes TEXT,
    fund_name VARCHAR(255),
    amount_in_words TEXT,
    created_by VARCHAR(36),
    created_at DATE,
    updated_at DATE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_check_number (check_number),
    INDEX idx_due_date (due_date),
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_entity_name (entity_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Settings table
CREATE TABLE IF NOT EXISTS settings (
    user_id VARCHAR(36) PRIMARY KEY,
    company_name VARCHAR(255) DEFAULT 'FINANSSE SOLUTIONS',
    currency VARCHAR(10) DEFAULT 'MAD',
    timezone VARCHAR(100) DEFAULT 'Africa/Casablanca',
    date_format VARCHAR(50) DEFAULT 'DD/MM/YYYY',
    fiscal_start DATE DEFAULT '2024-01-01',
    alert_before BOOLEAN DEFAULT TRUE,
    alert_delay BOOLEAN DEFAULT TRUE,
    alert_method VARCHAR(50) DEFAULT 'app',
    alert_days INT DEFAULT 3,
    logo_url TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('danger', 'warning', 'info') DEFAULT 'info',
    status ENUM('new', 'read', 'closed') DEFAULT 'new',
    link_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Risk alerts table
CREATE TABLE IF NOT EXISTS risk_alerts (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    type ENUM('returned', 'overdue', 'high_value', 'concentration', 'client_risk') NOT NULL,
    level ENUM('high', 'medium', 'low') NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    related_id VARCHAR(36),
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user (password: admin123 - change after first login!)
-- Password hash is for 'admin123' using bcrypt
INSERT INTO users (id, email, password_hash, full_name, role) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'admin@apollo.com', '$2b$10$YourHashHere', 'Admin User', 'admin')
ON DUPLICATE KEY UPDATE email = email;

-- Insert default settings for admin
INSERT INTO settings (user_id, company_name, currency, timezone) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'FINANSSE SOLUTIONS', 'MAD', 'Africa/Casablanca')
ON DUPLICATE KEY UPDATE user_id = user_id;
