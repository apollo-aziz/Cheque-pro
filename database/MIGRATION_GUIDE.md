# Database Migration Guide: Supabase to Hostinger MySQL

## Overview
This guide helps you migrate your data from Supabase to a MySQL database on Hostinger VPS.

## Prerequisites
- Hostinger VPS with MySQL installed
- Existing Supabase project with data
- Node.js 18+ installed locally and on VPS

## Step 1: Create MySQL Database on Hostinger

1. Log in to your Hostinger VPS via SSH
2. Access MySQL as root:
```bash
mysql -u root -p
```

3. Create database and user:
```sql
CREATE DATABASE finansse_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'finansse_user'@'localhost' IDENTIFIED BY 'your_secure_password';

GRANT ALL PRIVILEGES ON finansse_pro.* TO 'finansse_user'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

4. Run the schema script:
```bash
cd /var/www/finansse-pro
mysql -u finansse_user -p finansse_pro < database/mysql_schema.sql
```

## Step 2: Export Data from Supabase

On your local machine:

```bash
cd c:\Users\aziz\OneDrive\Desktop\GestionCh-ques
npm install
npx ts-node database/export_from_supabase.ts
```

This will create a `migration_data/` folder with:
- `checks.json` - All your check records
- `settings.json` - User settings
- `users.json` - User accounts (if available)

## Step 3: Transfer Data to VPS

Upload the migration_data folder to your VPS:

```bash
# From your local machine
scp -r migration_data root@YOUR_VPS_IP:/var/www/finansse-pro/
```

Or use WinSCP/FileZilla to upload the folder.

## Step 4: Import Data to MySQL

On your VPS:

```bash
cd /var/www/finansse-pro

# Update environment variables
nano .env
```

Add MySQL credentials:
```
DB_HOST=localhost
DB_USER=finansse_user
DB_PASSWORD=your_secure_password
DB_NAME=finansse_pro
```

Run the import script:
```bash
npx ts-node database/import_to_mysql.ts
```

## Step 5: Update Application Code

Replace Supabase imports with MySQL API in your components:

### Before (Supabase):
```typescript
import { supabase } from '../supabase';

const { data, error } = await supabase
  .from('checks')
  .select('*');
```

### After (MySQL):
```typescript
import { getAllChecks, createCheck, updateCheck, deleteCheck } from '../database/api';

const checks = await getAllChecks();
```

## Step 6: Update Server.js for MySQL

Add MySQL connection test to your server startup:

```javascript
const { testConnection } = require('./database/db');

// At server startup
app.listen(port, '0.0.0.0', async () => {
  console.log(`FINANSSE PRO Server listening on port ${port}`);
  
  // Test MySQL connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('⚠️  Warning: MySQL database not connected');
  }
});
```

## Database Schema Tables

### users
- id, email, password_hash, full_name, role, created_at, updated_at

### checks
- id, check_number, bank_name, amount, issue_date, due_date
- entity_name, type, status, image_url, notes
- fund_name, amount_in_words, created_by, created_at, updated_at

### settings
- user_id, company_name, currency, timezone, date_format
- fiscal_start, alert_before, alert_delay, alert_method, alert_days, logo_url

### notifications
- id, user_id, title, message, type, status, link_id, created_at

### risk_alerts
- id, user_id, type, level, description, amount, related_id, is_resolved

## API Functions Available

### Checks
- `getAllChecks()` - Get all checks
- `getCheckById(id)` - Get single check
- `createCheck(check)` - Create new check
- `updateCheck(id, updates)` - Update check
- `deleteCheck(id)` - Delete check

### Settings
- `getSettings(userId)` - Get user settings
- `updateSettings(userId, settings)` - Update settings

### Statistics
- `getCheckStatistics()` - Get dashboard stats
- `getUpcomingChecks(days)` - Get upcoming checks

## Troubleshooting

### Connection Issues
```bash
# Test MySQL connection
mysql -u finansse_user -p -e "SELECT 1"

# Check if MySQL is running
systemctl status mysql
```

### Import Errors
- Check JSON file format in migration_data/
- Ensure schema was created successfully
- Verify database credentials in .env

### Data Type Issues
- MySQL uses DECIMAL for amounts (more precise)
- Dates are formatted as 'YYYY-MM-DD'
- UUIDs are stored as VARCHAR(36)

## Security Notes

1. **Change default admin password** after first login
2. **Use strong passwords** for database users
3. **Restrict MySQL access** to localhost only
4. **Backup regularly** using mysqldump:
```bash
mysqldump -u finansse_user -p finansse_pro > backup_$(date +%Y%m%d).sql
```

## Rollback Plan

If you need to revert to Supabase:
1. Update .env to use Supabase credentials
2. Change imports back to `../supabase`
3. Restart the application

Your Supabase data remains untouched during migration.
