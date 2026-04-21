#!/bin/bash

# MySQL Setup Script for Hostinger VPS
# Run this on your VPS to install MySQL and set up the database

set -e

echo "🚀 Setting up MySQL on Hostinger VPS..."

# Update system
echo "📦 Updating system packages..."
sudo apt update

# Install MySQL Server and Client
echo "📦 Installing MySQL Server..."
sudo apt install -y mysql-server mysql-client

# Start MySQL service
echo "🔄 Starting MySQL service..."
sudo systemctl start mysql
sudo systemctl enable mysql

# Check MySQL status
echo "✅ Checking MySQL status..."
sudo systemctl status mysql --no-pager

echo ""
echo "✅ MySQL installed successfully!"
echo ""
echo "Next steps:"
echo "1. Secure MySQL installation: sudo mysql_secure_installation"
echo "2. Create database and user (see below)"
echo "3. Import schema: sudo mysql -u root -p u134958413_app_data < database/mysql_schema.sql"
echo ""
echo "--- MySQL Setup Commands ---"
echo "Run: sudo mysql -u root"
echo "Then execute:"
echo "  CREATE DATABASE IF NOT EXISTS u134958413_app_data CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "  CREATE USER 'u134958413_apollo'@'localhost' IDENTIFIED BY 'Aziz@aziz1031970';"
echo "  GRANT ALL PRIVILEGES ON u134958413_app_data.* TO 'u134958413_apollo'@'localhost';"
echo "  FLUSH PRIVILEGES;"
echo "  EXIT;"
