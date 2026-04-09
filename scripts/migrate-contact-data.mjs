/**
 * ONE-TIME MIGRATION SCRIPT
 * Copies rawEmail and rawPhone from SQLite (cicc_data.db) → Neon PostgreSQL (ConsultantProfile)
 * 
 * Matches records by licenseNumber.
 * SAFE: Only UPDATEs existing rows — never inserts or deletes.
 * 
 * Run with:
 *   DATABASE_URL="<neon_url>" node scripts/migrate-contact-data.mjs
 */

import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'prisma', 'cicc_data.db');

const prisma = new PrismaClient();

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  CICC Contact Data Migration → PostgreSQL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Open SQLite (read-only)
  const sqlite = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  
  // 2. Pull all consultants with contact info from SQLite
  const rows = sqlite.prepare(`
    SELECT License_Number, Email, Phone
    FROM consultants
    WHERE (Email IS NOT NULL AND Email != '' AND Email != 'N/A')
       OR (Phone  IS NOT NULL AND Phone  != '' AND Phone  != 'N/A')
  `).all();

  console.log(`📋 SQLite rows with contact data: ${rows.length}`);

  // 3. Process in chunks of 200 to avoid overwhelming the DB
  const CHUNK_SIZE = 200;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);

    const results = await Promise.allSettled(
      chunk.map(row => {
        const email = row.Email && row.Email !== 'N/A' ? row.Email.trim() : null;
        const phone = row.Phone && row.Phone !== 'N/A' ? row.Phone.trim() : null;

        return prisma.consultantProfile.updateMany({
          where: { licenseNumber: row.License_Number },
          data: {
            ...(email && { rawEmail: email }),
            ...(phone && { rawPhone: phone }),
          },
        });
      })
    );

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        if (result.value.count > 0) updated += result.value.count;
        else skipped++;
      } else {
        errors++;
        console.error(`  ❌ Error on ${chunk[idx].License_Number}:`, result.reason?.message);
      }
    });

    const progress = Math.min(i + CHUNK_SIZE, rows.length);
    process.stdout.write(`\r  Progress: ${progress}/${rows.length} (${updated} updated, ${skipped} no-match, ${errors} errors)`);
  }

  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ✅ Updated:      ${updated}`);
  console.log(`  ⚠️  No match:     ${skipped}`);
  console.log(`  ❌ Errors:       ${errors}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 4. Verification — count how many now have email in PG
  const withEmail = await prisma.consultantProfile.count({ where: { rawEmail: { not: null } } });
  const withPhone = await prisma.consultantProfile.count({ where: { rawPhone: { not: null } } });
  console.log(`\n  📊 PostgreSQL after migration:`);
  console.log(`     With rawEmail: ${withEmail}`);
  console.log(`     With rawPhone: ${withPhone}`);

  sqlite.close();
}

main()
  .catch(e => { console.error('\n💥 Fatal:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
