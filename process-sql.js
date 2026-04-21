/**
 * Process checks_rows.sql: Convert PostgreSQL to MySQL, split, and fix foreign keys
 * Run: node process-sql.js
 */
const fs = require('fs');

const inputFile = 'checks_rows.sql';
const rowsPerFile = 100;
const defaultUserId = '550e8400-e29b-41d4-a716-446655440000';

console.log('Step 1: Converting PostgreSQL to MySQL format...');
let content = fs.readFileSync(inputFile, 'utf8');

// Convert PostgreSQL syntax to MySQL
content = content.replace(/"public"\."checks"/g, 'checks');
content = content.replace(/"(id|check_number|bank_name|amount|issue_date|due_date|entity_name|type|status|image_url|created_at|notes|fund_name|amount_in_words|created_by)"/g, '$1');

console.log('Step 2: Fixing created_by foreign keys...');
// Replace all UUIDs in created_by position with default admin user
content = content.replace(/'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'(\s*\))/g, `'${defaultUserId}'$1`);

// Save converted file
fs.writeFileSync('checks_rows_mysql.sql', content);
console.log('Converted file saved: checks_rows_mysql.sql');

console.log('\nStep 3: Splitting into smaller chunks...');

// Extract prefix
const valuesMatch = content.match(/^(INSERT INTO checks \([^)]+\) VALUES )/);
if (!valuesMatch) {
  console.error('Could not find INSERT statement');
  process.exit(1);
}

const prefix = valuesMatch[1];
const valuesStart = content.indexOf('VALUES ') + 7;
const valuesStr = content.substring(valuesStart);

// Parse rows
const rows = [];
let current = '';
let inString = false;

for (let i = 0; i < valuesStr.length; i++) {
  const char = valuesStr[i];
  const prevChar = valuesStr[i - 1];

  if (char === "'" && prevChar !== '\\') {
    inString = !inString;
  }

  current += char;

  if (!inString && char === ')' && valuesStr[i + 1] === ',' && valuesStr[i + 2] === ' ') {
    const afterComma = valuesStr.substring(i + 3);
    if (afterComma.startsWith('(')) {
      rows.push(current.trim());
      current = '';
      i += 2;
    }
  }
}

if (current.trim()) {
  current = current.trim().replace(/;\s*$/, '');
  rows.push(current);
}

console.log(`Total rows: ${rows.length}`);

// Write chunks
let partNum = 1;
for (let i = 0; i < rows.length; i += rowsPerFile) {
  const chunk = rows.slice(i, i + rowsPerFile);
  const filename = `checks_part_${String(partNum).padStart(3, '0')}.sql`;
  const sql = prefix + chunk.join(', ') + ';\n';
  fs.writeFileSync(filename, sql);
  const sizeMB = (sql.length / 1024 / 1024).toFixed(2);
  console.log(`  ${filename} - ${chunk.length} rows, ${sizeMB} MB`);
  partNum++;
}

console.log(`\nDone! Created ${partNum - 1} files ready for phpMyAdmin import.`);
console.log('Import order:');
console.log('  1. database/mysql_schema.sql (create tables)');
console.log('  2. checks_part_001.sql');
console.log('  3. checks_part_002.sql');
console.log('  4. checks_part_003.sql (if exists)');
