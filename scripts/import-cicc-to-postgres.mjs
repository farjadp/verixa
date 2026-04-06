/**
 * CICC FULL IMPORT SCRIPT
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads every consultant from SQLite (cicc_data.db) and creates a
 * ConsultantProfile row in PostgreSQL for each one that doesn't exist yet.
 *
 * SAFE:
 *  • Only INSERTs — never deletes or overwrites existing claimed profiles.
 *  • Skips any licenseNumber that already has a ConsultantProfile row.
 *  • Commits in chunks of 200 so one failure doesn't kill the whole run.
 *
 * USAGE (run on local machine with production DATABASE_URL):
 *   DATABASE_URL="postgres://..." node scripts/import-cicc-to-postgres.mjs
 *
 * Or using the Neon URL from Vercel dashboard:
 *   DATABASE_URL="<your-neon-url>" DIRECT_URL="<your-neon-direct-url>" node scripts/import-cicc-to-postgres.mjs
 */

import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, '..', 'prisma', 'cicc_data.db');

const prisma = new PrismaClient();

// ─── helpers ──────────────────────────────────────────────────────────────────
function makeSlug(licenseNumber) {
  return licenseNumber.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

function cleanString(val) {
  if (!val || val === 'N/A' || val.trim() === '') return null;
  return val.trim();
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  CICC SQLite → PostgreSQL Full Import');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Open SQLite
  const sqlite = new Database(DB_PATH, { readonly: true, fileMustExist: true });

  // 2. Pull all records
  const rows = sqlite.prepare(`
    SELECT License_Number, Full_Name, Status, Company, Email, Phone, Province, Country
    FROM consultants
    WHERE License_Number IS NOT NULL AND Full_Name IS NOT NULL
  `).all();

  console.log(`📋 Total records in SQLite: ${rows.length.toLocaleString()}\n`);

  // 3. Load existing licenseNumbers from Postgres to skip already-migrated ones
  const existing = await prisma.consultantProfile.findMany({
    select: { licenseNumber: true },
  });
  const existingSet = new Set(existing.map(e => e.licenseNumber));
  console.log(`✅ Already in Postgres:     ${existingSet.size.toLocaleString()}`);

  const toImport = rows.filter(r => !existingSet.has(r.License_Number));
  console.log(`🚀 Will import:              ${toImport.length.toLocaleString()}\n`);

  if (toImport.length === 0) {
    console.log('Nothing to import. All records already exist in Postgres.');
    return;
  }

  // 4. Import in chunks
  const CHUNK_SIZE = 200;
  let created = 0;
  let skipped = 0;
  let errors  = 0;

  for (let i = 0; i < toImport.length; i += CHUNK_SIZE) {
    const chunk = toImport.slice(i, i + CHUNK_SIZE);

    const results = await Promise.allSettled(
      chunk.map(row => {
        const licenseNumber = row.License_Number.trim();
        const slug = makeSlug(licenseNumber);

        return prisma.consultantProfile.create({
          data: {
            licenseNumber,
            slug,
            fullName:  row.Full_Name.trim(),
            status:    cleanString(row.Status) || 'Unknown',
            company:   cleanString(row.Company),
            province:  cleanString(row.Province),
            country:   cleanString(row.Country),
            rawEmail:  cleanString(row.Email),
            rawPhone:  cleanString(row.Phone),
            // Leave userId null = unclaimed
          },
        });
      })
    );

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        created++;
      } else {
        const errMsg = result.reason?.message || '';
        // Unique constraint = already exists (race condition or duplicate), skip silently
        if (errMsg.includes('Unique constraint')) {
          skipped++;
        } else {
          errors++;
          if (errors <= 5) {
            console.error(`\n  ❌ Error on ${chunk[idx].License_Number}: ${errMsg.slice(0, 120)}`);
          }
        }
      }
    });

    const progress = Math.min(i + CHUNK_SIZE, toImport.length);
    process.stdout.write(`\r  Progress: ${progress.toLocaleString()}/${toImport.length.toLocaleString()} — created: ${created.toLocaleString()}, skipped: ${skipped}, errors: ${errors}`);
  }

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ✅ Created:   ${created.toLocaleString()}`);
  console.log(`  ⚠️  Skipped:   ${skipped.toLocaleString()}`);
  console.log(`  ❌ Errors:    ${errors.toLocaleString()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 5. Final count
  const finalCount = await prisma.consultantProfile.count();
  console.log(`\n  📊 Total ConsultantProfiles in Postgres now: ${finalCount.toLocaleString()}`);

  sqlite.close();
}

main()
  .catch(e => { console.error('\n💥 Fatal error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
