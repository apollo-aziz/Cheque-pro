#!/bin/bash

# Finansse Pro Deployment Script for Hostinger VPS
# Run this script on your VPS after setup

set -e

echo "🚀 Starting Finansse Pro Deployment..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# Create app directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/finansse-pro
sudo chown -R $USER:$USER /var/www/finansse-pro

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p /var/www/finansse-pro/logs

echo "✅ Server setup complete!"
echo ""
echo "Next steps:"
echo "1. Upload your application files to /var/www/finansse-pro"
echo "2. Copy .env file with your environment variables"
echo "3. Run: cd /var/www/finansse-pro && npm install"
echo "4. Run: pm2 start ecosystem.config.js"
echo "5. Copy nginx config: sudo cp nginx.conf /etc/nginx/sites-available/finansse-pro"
echo "6. Enable site: sudo ln -s /etc/nginx/sites-available/finansse-pro /etc/nginx/sites-enabled/"
echo "7. Test nginx: sudo nginx -t"
echo "8. Restart nginx: sudo systemctl restart nginx"
