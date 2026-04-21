# Finansse Pro - Hostinger VPS Deployment Guide

## Prerequisites
- Hostinger VPS (Ubuntu 20.04/22.04 recommended)
- Domain name (optional but recommended)
- SSH access to your VPS

## Step 1: Create VPS on Hostinger

1. Log in to your Hostinger hPanel
2. Click on **VPS** in the left sidebar
3. Click **Create New VPS** or **Order VPS**
4. Choose a plan (at least 2GB RAM recommended)
5. Select **Ubuntu 22.04** as the operating system
6. Complete the purchase and wait for VPS provisioning
7. Note down the IP address and root password

## Step 2: Initial Server Setup

Connect to your VPS via SSH:
```bash
ssh root@YOUR_VPS_IP
```

Run the deployment script:
```bash
# Download and run the setup script
curl -o deploy.sh https://raw.githubusercontent.com/yourrepo/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

Or manually:
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx
apt install -y nginx

# Create app directory
mkdir -p /var/www/finansse-pro
```

## Step 3: Upload Application Files

### Option A: Using SCP (from your local machine)
```bash
# Compress your project first
cd c:\Users\aziz\OneDrive\Desktop\GestionCh-ques
zip -r finansse-pro.zip . -x "node_modules/*" ".git/*"

# Upload to VPS
scp finansse-pro.zip root@YOUR_VPS_IP:/var/www/finansse-pro/

# On VPS, extract
ssh root@YOUR_VPS_IP
cd /var/www/finansse-pro
unzip finansse-pro.zip
rm finansse-pro.zip
```

### Option B: Using Git
```bash
# On VPS
cd /var/www/finansse-pro
git clone YOUR_REPO_URL .
```

### Option C: Using FileZilla or WinSCP
- Connect via SFTP to your VPS
- Upload all files to `/var/www/finansse-pro`

## Step 4: Configure Environment Variables

Create the `.env` file on the VPS:
```bash
cd /var/www/finansse-pro
nano .env
```

Add your environment variables:
```
GEMINI_API_KEY=AIzaSyDTJJfuGy_HAufi0TApNP4-YmAsfCIizKY
SUPABASE_URL=https://hbycnloggmuovsxulzuv.supabase.co
SUPABASE_ANON_KEY=sb_publishable_P6sc647KZDinDYnsoZ1MtA_RdGMRSc3
PORT=3000
NODE_ENV=production
```

Save and exit (Ctrl+X, then Y, then Enter)

## Step 5: Install Dependencies and Build

```bash
cd /var/www/finansse-pro
npm install
```

## Step 6: Start Application with PM2

```bash
cd /var/www/finansse-pro
pm2 start ecosystem.config.js

# Save PM2 config to start on boot
pm2 save
pm2 startup
```

## Step 7: Configure Nginx

```bash
# Copy nginx configuration
cp /var/www/finansse-pro/nginx.conf /etc/nginx/sites-available/finansse-pro

# Enable the site
ln -s /etc/nginx/sites-available/finansse-pro /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

## Step 8: Configure Firewall

```bash
# Allow HTTP and HTTPS
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw enable
```

## Step 9: Setup SSL (HTTPS) with Let's Encrypt

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is set up automatically
```

## Step 10: Verify Deployment

1. Open your browser
2. Visit `http://YOUR_VPS_IP` or `https://yourdomain.com`
3. The application should be running!

## Useful Commands

```bash
# View application logs
pm2 logs finansse-pro

# Restart application
pm2 restart finansse-pro

# Stop application
pm2 stop finansse-pro

# Monitor resources
pm2 monit

# Check Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Update application
cd /var/www/finansse-pro
git pull  # or upload new files
npm install
pm2 restart finansse-pro
```

## Troubleshooting

### Application not starting
```bash
# Check PM2 logs
pm2 logs

# Check if port 3000 is in use
netstat -tlnp | grep 3000
```

### Nginx errors
```bash
# Test Nginx config
nginx -t

# Check Nginx error logs
tail -f /var/log/nginx/error.log
```

### Permission issues
```bash
# Fix permissions
chown -R www-data:www-data /var/www/finansse-pro
chmod -R 755 /var/www/finansse-pro
```

## Database Options

### Option 1: Keep Supabase (Easiest)
- No changes needed
- Update SUPABASE_URL and SUPABASE_ANON_KEY in .env if needed

### Option 2: Hostinger MySQL
1. Create MySQL database in Hostinger hPanel
2. Update application code to use MySQL instead of Supabase
3. Migrate data from Supabase to MySQL

## Support

For issues or questions, check:
- PM2 documentation: https://pm2.keymetrics.io/
- Nginx documentation: https://nginx.org/en/docs/
- Hostinger VPS guides: https://support.hostinger.com/
