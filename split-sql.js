/**
 * Split large SQL file into smaller chunks for phpMyAdmin import
 * Run: node split-sql.js
 */
const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2] || 'C:\\Users\\aziz\\OneDrive\\Desktop\\checks_rows_mysql.sql';
const outputDir = path.dirname(inputFile);
const rowsPerFile = 100; // Number of rows per chunk

function splitSQLFile() {
  console.log(`Reading ${inputFile}...`);
  
  const content = fs.readFileSync(inputFile, 'utf8');
  console.log(`File size: ${(content.length / 1024 / 1024).toFixed(2)} MB`);
  
  // Extract the INSERT prefix
  const valuesMatch = content.match(/^(INSERT INTO checks \([^)]+\) VALUES )/);
  if (!valuesMatch) {
    console.error('Could not find INSERT statement');
    return;
  }
  
  const prefix = valuesMatch[1];
  const valuesStart = content.indexOf('VALUES ') + 7;
  const valuesStr = content.substring(valuesStart);
  
  // Parse rows - look for '), (' pattern that separates rows
  // But be careful with ), inside strings
  const rows = [];
  let current = '';
  let inString = false;
  let parenDepth = 0;
  
  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    const nextChar = valuesStr[i + 1];
    const prevChar = valuesStr[i - 1];
    
    if (char === "'" && prevChar !== '\\') {
      inString = !inString;
    }
    
    if (!inString) {
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;
    }
    
    current += char;
    
    // Check for row separator: '), ('
    if (!inString && char === ')' && nextChar === ',' && valuesStr[i + 2] === ' ') {
      const afterComma = valuesStr.substring(i + 3);
      if (afterComma.startsWith('(')) {
        rows.push(current.trim());
        current = '';
        i += 2; // skip ', '
      }
    }
  }
  
  // Add last row (remove trailing semicolon if present)
  if (current.trim()) {
    current = current.trim().replace(/;\s*$/, '');
    rows.push(current);
  }
  
  console.log(`Total rows found: ${rows.length}`);
  
  if (rows.length === 0) {
    console.error('No rows found!');
    return;
  }
  
  // Write chunks
  let partNum = 1;
  for (let i = 0; i < rows.length; i += rowsPerFile) {
    const chunk = rows.slice(i, i + rowsPerFile);
    const outputFile = path.join(outputDir, `checks_part_${String(partNum).padStart(3, '0')}.sql`);
    
    let sql = prefix + chunk.join(', ') + ';\n';
    fs.writeFileSync(outputFile, sql);
    
    const sizeMB = (sql.length / 1024 / 1024).toFixed(2);
    console.log(`Created: checks_part_${String(partNum).padStart(3, '0')}.sql (${chunk.length} rows, ${sizeMB} MB)`);
    
    partNum++;
  }
  
  console.log(`\nDone! Created ${partNum - 1} files.`);
  console.log(`Import order: Start with mysql_schema.sql, then checks_part_001.sql, checks_part_002.sql, etc.`);
}

splitSQLFile();
