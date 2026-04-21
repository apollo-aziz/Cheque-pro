/**
 * Data Import Script to MySQL
 * Run this on your Hostinger VPS to import data from JSON files
 */

import * as fs from 'fs';
import * as path from 'path';
import { getPool, query, transaction } from './db';

const IMPORT_DIR = './migration_data';

interface Check {
  id: string;
  check_number: string;
  bank_name: string;
  amount: number;
  issue_date: string;
  due_date: string;
  entity_name: string;
  type: 'incoming' | 'outgoing';
  status: 'pending' | 'paid' | 'returned' | 'garantie';
  image_url?: string;
  notes?: string;
  fund_name?: string;
  amount_in_words?: string;
  created_by?: string;
  created_at: string;
}

interface Setting {
  user_id: string;
  company_name: string;
  currency: string;
  timezone: string;
  date_format: string;
  fiscal_start: string;
  alert_before: boolean;
  alert_delay: boolean;
  alert_method: string;
  alert_days: number;
  logo_url?: string;
  updated_at: string;
}

async function importData() {
  console.log('🚀 Starting data import to MySQL...\n');

  // Test connection
  const pool = getPool();
  console.log('✅ Connected to MySQL\n');

  // 1. Import checks
  const checksFile = path.join(IMPORT_DIR, 'checks.json');
  if (fs.existsSync(checksFile)) {
    console.log('📦 Importing checks...');
    const checks: Check[] = JSON.parse(fs.readFileSync(checksFile, 'utf8'));
    
    for (const check of checks) {
      try {
        await query(
          `INSERT INTO checks (
            id, check_number, bank_name, amount, issue_date, due_date,
            entity_name, type, status, image_url, notes, fund_name,
            amount_in_words, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            check_number = VALUES(check_number),
            bank_name = VALUES(bank_name),
            amount = VALUES(amount),
            status = VALUES(status)`,
          [
            check.id,
            check.check_number,
            check.bank_name,
            check.amount,
            check.issue_date,
            check.due_date,
            check.entity_name,
            check.type,
            check.status,
            check.image_url || null,
            check.notes || null,
            check.fund_name || null,
            check.amount_in_words || null,
            check.created_by || '550e8400-e29b-41d4-a716-446655440000', // Default admin
            check.created_at
          ]
        );
      } catch (error) {
        console.error(`❌ Error importing check ${check.id}:`, error);
      }
    }
    console.log(`✅ Imported ${checks.length} checks\n`);
  }

  // 2. Import settings
  const settingsFile = path.join(IMPORT_DIR, 'settings.json');
  if (fs.existsSync(settingsFile)) {
    console.log('📦 Importing settings...');
    const settings: Setting[] = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    
    for (const setting of settings) {
      try {
        await query(
          `INSERT INTO settings (
            user_id, company_name, currency, timezone, date_format,
            fiscal_start, alert_before, alert_delay, alert_method, alert_days, logo_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            company_name = VALUES(company_name),
            currency = VALUES(currency),
            updated_at = VALUES(updated_at)`,
          [
            setting.user_id || '550e8400-e29b-41d4-a716-446655440000',
            setting.company_name || 'FINANSSE SOLUTIONS',
            setting.currency || 'MAD',
            setting.timezone || 'Africa/Casablanca',
            setting.date_format || 'DD/MM/YYYY',
            setting.fiscal_start || '2024-01-01',
            setting.alert_before ?? true,
            setting.alert_delay ?? true,
            setting.alert_method || 'app',
            setting.alert_days || 3,
            setting.logo_url || null
          ]
        );
      } catch (error) {
        console.error(`❌ Error importing settings for user ${setting.user_id}:`, error);
      }
    }
    console.log(`✅ Imported ${settings.length} settings\n`);
  }

  console.log('✅ Import complete!');
  console.log('You can now start using the application with MySQL.');
  
  // Close pool
  await pool.end();
}

// Run import
importData().catch(console.error);
