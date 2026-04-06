/**
 * FAST EMAIL/PHONE SYNC — SQLite → Postgres
 * Uses COPY-style bulk approach via raw SQL for maximum speed.
 * Run with: DATABASE_URL="..." DIRECT_URL="..." node scripts/fast-sync-contacts.mjs
 */

import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, '..', 'prisma', 'cicc_data.db');

// Use DIRECT_URL for higher throughput (bypasses pooler)
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } }
});

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Fast Contact Sync: SQLite → Postgres (Raw SQL)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const sqlite = new Database(DB_PATH, { readonly: true, fileMustExist: true });

  const rows = sqlite.prepare(`
    SELECT License_Number, Email, Phone, Province, Country, Company
    FROM consultants
  `).all();

  console.log(`📋 SQLite records: ${rows.length.toLocaleString()}`);

  const clean = (val) => (val && val !== 'N/A' && val.trim() !== '') ? val.trim() : null;

  // Build values list for a massive single UPDATE using CASE expressions
  // We batch by 1000 rows per SQL statement to avoid query size limits
  const BATCH = 1000;
  let totalUpdated = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);

    // Build CASE statement per field
    const emailCases  = batch.map(r => `WHEN "licenseNumber" = '${r.License_Number.replace(/'/g, "''")}' THEN ${clean(r.Email)    ? `'${clean(r.Email)?.replace(/'/g, "''")}'`    : 'NULL'}`).join('\n');
    const phoneCases  = batch.map(r => `WHEN "licenseNumber" = '${r.License_Number.replace(/'/g, "''")}' THEN ${clean(r.Phone)    ? `'${clean(r.Phone)?.replace(/'/g, "''")}'`    : 'NULL'}`).join('\n');
    const provCases   = batch.map(r => `WHEN "licenseNumber" = '${r.License_Number.replace(/'/g, "''")}' THEN ${clean(r.Province)  ? `'${clean(r.Province)?.replace(/'/g, "''")}'`  : 'NULL'}`).join('\n');
    const ctryCases   = batch.map(r => `WHEN "licenseNumber" = '${r.License_Number.replace(/'/g, "''")}' THEN ${clean(r.Country)   ? `'${clean(r.Country)?.replace(/'/g, "''")}'`   : 'NULL'}`).join('\n');
    const compCases   = batch.map(r => `WHEN "licenseNumber" = '${r.License_Number.replace(/'/g, "''")}' THEN ${clean(r.Company)   ? `'${clean(r.Company)?.replace(/'/g, "''")}'`   : 'NULL'}`).join('\n');

    const licNums = batch.map(r => `'${r.License_Number.replace(/'/g, "''")}'`).join(',');

    const sql = `
      UPDATE "ConsultantProfile"
      SET
        "rawEmail" = CASE ${emailCases} ELSE "rawEmail" END,
        "rawPhone" = CASE ${phoneCases} ELSE "rawPhone" END,
        "province" = CASE ${provCases}  ELSE "province" END,
        "country"  = CASE ${ctryCases}  ELSE "country"  END,
        "company"  = CASE ${compCases}  ELSE "company"  END
      WHERE "licenseNumber" IN (${licNums})
    `;

    try {
      const result = await prisma.$executeRawUnsafe(sql);
      totalUpdated += result;
    } catch (e) {
      console.error(`\nError at batch ${i}:`, e.message?.slice(0, 200));
    }

    const progress = Math.min(i + BATCH, rows.length);
    process.stdout.write(`\r  Progress: ${progress.toLocaleString()}/${rows.length.toLocaleString()} — rows updated: ${totalUpdated.toLocaleString()}`);
  }

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ✅ Total rows updated: ${totalUpdated.toLocaleString()}`);

  const withEmail = await prisma.consultantProfile.count({ where: { rawEmail: { not: null } } });
  const withProv  = await prisma.consultantProfile.count({ where: { province: { not: null } } });
  console.log(`  📊 With rawEmail now:   ${withEmail.toLocaleString()}`);
  console.log(`  📊 With province now:   ${withProv.toLocaleString()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  sqlite.close();
}

main()
  .catch(e => { console.error('\n💥 Fatal:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
