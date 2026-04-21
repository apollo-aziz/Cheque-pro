#!/bin/bash
# Finansse Pro - Hostinger Setup Script
# Run: bash setup-hostinger.sh

set -e

echo "====================================="
echo "FINANSSE PRO - Hostinger Setup"
echo "====================================="
echo ""

# Detect app directory
APP_DIR=$(pwd)
echo "Working directory: $APP_DIR"

# Step 1: Pull latest code
echo ""
echo "Step 1: Pulling latest code from GitHub..."
git pull origin main
echo "Done!"

# Step 2: Install dependencies
echo ""
echo "Step 2: Installing Node.js dependencies..."
npm install
echo "Done!"

# Step 3: Create .env file
echo ""
echo "Step 3: Creating .env file..."
cat > .env << 'EOF'
DB_HOST=localhost
DB_USER=u134958413
DB_PASSWORD=Aziz@aziz1031970
DB_NAME=u134958413_app_data
JWT_SECRET=finansse-pro-jwt-secret-2024-hostinger
GEMINI_API_KEY=AIzaSyDTJJfuGy_HAufi0TApNP4-YmAsfCIizKY
PORT=3000
NODE_ENV=production
EOF
echo "Done!"

# Step 4: Create database tables
echo ""
echo "Step 4: Creating MySQL tables..."
if command -v mysql &> /dev/null; then
    mysql -u u134958413 -p'Aziz@aziz1031970' u134958413_app_data < database/mysql_schema.sql
    echo "Done!"
else
    echo "MySQL CLI not found. Please import database/mysql_schema.sql via phpMyAdmin."
fi

echo ""
echo "====================================="
echo "SETUP COMPLETE!"
echo "====================================="
echo ""
echo "Next steps:"
echo "1. If MySQL tables were not created automatically,"
echo "   import database/mysql_schema.sql via phpMyAdmin"
echo "2. Go to hPanel -> Node.js and click RESTART"
echo ""
