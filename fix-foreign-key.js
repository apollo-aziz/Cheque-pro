/**
 * Fix foreign key constraint by replacing created_by UUIDs with default admin user
 * Run: node fix-foreign-key.js
 */
const fs = require('fs');
const path = require('path');

const desktopDir = 'C:\\Users\\aziz\\OneDrive\\Desktop';
const files = [
  path.join(desktopDir, 'checks_part_001.sql'),
  path.join(desktopDir, 'checks_part_002.sql'),
  path.join(desktopDir, 'checks_part_003.sql')
];

const defaultUserId = '550e8400-e29b-41d4-a716-446655440000';

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log(`Skipping: ${path.basename(file)} (not found)`);
    continue;
  }

  console.log(`Processing: ${path.basename(file)}...`);
  
  const content = fs.readFileSync(file, 'utf8');
  
  // Replace any UUID in created_by position (last field before closing paren)
  // Pattern: match any UUID that is the last value before ')' in VALUES
  const fixed = content.replace(/'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'(\s*\))/g, `'${defaultUserId}'$1`);
  
  fs.writeFileSync(file, fixed);
  console.log(`  Fixed! All created_by set to: ${defaultUserId}`);
}

console.log('\nDone! You can now import the SQL files into phpMyAdmin.');
