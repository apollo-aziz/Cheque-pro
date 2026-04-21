/**
 * Export Supabase data to SQL file for phpMyAdmin import
 * Run: node export-to-sql.mjs
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://isvhmsatlnwykmwukurh.supabase.co';
const supabaseAnonKey = 'sb_publishable_4lFHcw3ymRZBCN_tlmCE7Q_pW_qhaS1';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function escapeSQL(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function exportToSQL() {
  console.log('Exporting data from Supabase to SQL...\n');

  let sql = `-- Supabase to MySQL Export\n-- Generated: ${new Date().toISOString()}\n\n`;
  sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

  // Export checks
  console.log('Exporting checks...');
  const { data: checks, error: checksError } = await supabase.from('checks').select('*');
  if (checksError) {
    console.error('Error exporting checks:', checksError);
  } else if (checks && checks.length > 0) {
    sql += `-- Checks: ${checks.length} records\n`;
    for (const c of checks) {
      sql += `INSERT INTO checks (id, check_number, bank_name, amount, issue_date, due_date, entity_name, type, status, notes, image_url, fund_name, amount_in_words, created_by, created_at) VALUES (`;
      sql += `${escapeSQL(c.id)}, ${escapeSQL(c.check_number)}, ${escapeSQL(c.bank_name)}, ${escapeSQL(c.amount)}, `;
      sql += `${escapeSQL(c.issue_date)}, ${escapeSQL(c.due_date)}, ${escapeSQL(c.entity_name)}, ${escapeSQL(c.type)}, `;
      sql += `${escapeSQL(c.status)}, ${escapeSQL(c.notes)}, ${escapeSQL(c.image_url)}, ${escapeSQL(c.fund_name)}, `;
      sql += `${escapeSQL(c.amount_in_words)}, ${escapeSQL(c.created_by || '550e8400-e29b-41d4-a716-446655440000')}, ${escapeSQL(c.created_at)}`;
      sql += `) ON DUPLICATE KEY UPDATE check_number=VALUES(check_number);\n`;
    }
    sql += '\n';
    console.log(`  ${checks.length} checks exported`);
  } else {
    console.log('  No checks found');
  }

  // Export settings
  console.log('Exporting settings...');
  const { data: settings, error: settingsError } = await supabase.from('cheque_settings').select('*');
  if (settingsError) {
    console.error('Error exporting settings:', settingsError);
  } else if (settings && settings.length > 0) {
    sql += `-- Settings: ${settings.length} records\n`;
    for (const s of settings) {
      sql += `INSERT INTO settings (user_id, company_name, currency, timezone, date_format, fiscal_start, alert_before, alert_delay, alert_method, alert_days, logo_url) VALUES (`;
      sql += `${escapeSQL(s.user_id || '550e8400-e29b-41d4-a716-446655440000')}, ${escapeSQL(s.company_name)}, ${escapeSQL(s.currency)}, `;
      sql += `${escapeSQL(s.timezone)}, ${escapeSQL(s.date_format)}, ${escapeSQL(s.fiscal_start)}, `;
      sql += `${escapeSQL(s.alert_before)}, ${escapeSQL(s.alert_delay)}, ${escapeSQL(s.alert_method)}, `;
      sql += `${escapeSQL(s.alert_days)}, ${escapeSQL(s.logo_url)}`;
      sql += `) ON DUPLICATE KEY UPDATE company_name=VALUES(company_name);\n`;
    }
    sql += '\n';
    console.log(`  ${settings.length} settings exported`);
  } else {
    console.log('  No settings found');
  }

  sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;

  fs.writeFileSync('supabase-export.sql', sql);
  console.log('\nExport complete!');
  console.log('File created: supabase-export.sql');
  console.log('\nNext: Import this file via phpMyAdmin on Hostinger');
}

exportToSQL().catch(console.error);
