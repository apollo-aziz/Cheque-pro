/**
 * Data Export Script from Supabase
 * Run this to export all data from Supabase to JSON files
 */

import { supabase } from '../supabase';
import * as fs from 'fs';
import * as path from 'path';

const EXPORT_DIR = './migration_data';

async function exportData() {
  console.log('🚀 Starting data export from Supabase...\n');

  // Create export directory
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }

  // 1. Export checks
  console.log('📦 Exporting checks...');
  const { data: checks, error: checksError } = await supabase
    .from('checks')
    .select('*');
  
  if (checksError) {
    console.error('❌ Error exporting checks:', checksError);
  } else {
    fs.writeFileSync(
      path.join(EXPORT_DIR, 'checks.json'),
      JSON.stringify(checks || [], null, 2)
    );
    console.log(`✅ Exported ${checks?.length || 0} checks`);
  }

  // 2. Export settings
  console.log('📦 Exporting settings...');
  const { data: settings, error: settingsError } = await supabase
    .from('cheque_settings')
    .select('*');
  
  if (settingsError) {
    console.error('❌ Error exporting settings:', settingsError);
  } else {
    fs.writeFileSync(
      path.join(EXPORT_DIR, 'settings.json'),
      JSON.stringify(settings || [], null, 2)
    );
    console.log(`✅ Exported ${settings?.length || 0} settings`);
  }

  // 3. Export users (from auth.users via admin API or custom users table)
  console.log('📦 Exporting users...');
  // Note: Supabase auth users require admin privileges or custom user table
  // This is a placeholder - you may need to adjust based on your setup
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*');
  
  if (usersError) {
    console.error('❌ Error exporting users:', usersError);
    console.log('⚠️  Note: Auth users may need to be exported via Supabase Dashboard');
  } else {
    fs.writeFileSync(
      path.join(EXPORT_DIR, 'users.json'),
      JSON.stringify(users || [], null, 2)
    );
    console.log(`✅ Exported ${users?.length || 0} users`);
  }

  console.log('\n✅ Export complete!');
  console.log(`📁 Data saved to: ${EXPORT_DIR}/`);
  console.log('\nNext steps:');
  console.log('1. Copy the migration_data folder to your Hostinger VPS');
  console.log('2. Run the import script on the VPS');
}

// Run export
exportData().catch(console.error);
