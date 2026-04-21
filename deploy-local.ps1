# Finansse Pro - Local Deployment Helper
# Run this script in PowerShell to export data and prepare files

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "FINANSSE PRO - Deployment Preparation Script" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Git push
Write-Host "Step 1: Pushing code to GitHub..." -ForegroundColor Yellow
Write-Host "----------------------------------------"
try {
    git add -A
    git commit -m "Migrate from Supabase to Hostinger MySQL - $(Get-Date -Format 'yyyy-MM-dd')"
    git push origin main
    Write-Host "Code pushed successfully!" -ForegroundColor Green
} catch {
    Write-Host "Git push failed. Please check your git configuration." -ForegroundColor Red
    Write-Host $_
}
Write-Host ""

# Step 2: Export data from Supabase
Write-Host "Step 2: Exporting data from Supabase..." -ForegroundColor Yellow
Write-Host "----------------------------------------"
node export-to-sql.mjs
if ($LASTEXITCODE -eq 0) {
    Write-Host "Data exported successfully!" -ForegroundColor Green
    Write-Host "File created: supabase-export.sql" -ForegroundColor Green
} else {
    Write-Host "Export failed. Make sure node_modules are installed." -ForegroundColor Red
}
Write-Host ""

# Step 3: Prepare .env for Hostinger
Write-Host "Step 3: Preparing Hostinger .env file..." -ForegroundColor Yellow
Write-Host "----------------------------------------"
$envContent = @"
# Hostinger MySQL
DB_HOST=localhost
DB_USER=u134958413
DB_PASSWORD=Aziz@aziz1031970
DB_NAME=u134958413_app_data

# JWT Secret
JWT_SECRET=finansse-pro-jwt-secret-2024-hostinger

# Gemini API
GEMINI_API_KEY=AIzaSyDTJJfuGy_HAufi0TApNP4-YmAsfCIizKY

# App Config
PORT=3000
NODE_ENV=production
"@
$envContent | Out-File -FilePath ".env.hostinger" -Encoding UTF8
Write-Host "Hostinger .env created: .env.hostinger" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "PREPARATION COMPLETE!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files ready for Hostinger:" -ForegroundColor White
Write-Host "  1. Code pushed to GitHub" -ForegroundColor Gray
Write-Host "  2. supabase-export.sql - Import this in phpMyAdmin" -ForegroundColor Gray
Write-Host "  3. .env.hostinger - Upload this as .env on Hostinger" -ForegroundColor Gray
Write-Host ""
Write-Host "NEXT STEPS (on Hostinger):" -ForegroundColor Yellow
Write-Host "  1. Pull latest code from GitHub" -ForegroundColor White
Write-Host "  2. Run: npm install" -ForegroundColor White
Write-Host "  3. Upload .env.hostinger as .env" -ForegroundColor White
Write-Host "  4. In phpMyAdmin, import database/mysql_schema.sql" -ForegroundColor White
Write-Host "  5. In phpMyAdmin, import supabase-export.sql" -ForegroundColor White
Write-Host "  6. Restart Node.js app in hPanel" -ForegroundColor White
Write-Host ""
