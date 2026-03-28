/**
 * build-db.js
 * 
 * Automatically handles Prisma deployments on Vercel and similar environments.
 * It prevents the 'P1002 - Timeout acquiring advisory lock' error by dynamically 
 * detecting pooled Neon connection strings and stripping the pooler proxy 
 * automatically to provide an unpooled direct URL for Prisma Migrations.
 */

const { execSync } = require('child_process');

function run() {
  let dbUrl = process.env.DATABASE_URL;
  let directUrl = process.env.DIRECT_URL;

  if (dbUrl && !directUrl) {
    // If it is a Neon pooled connection, it typically contains '-pooler'
    if (dbUrl.includes('-pooler')) {
      directUrl = dbUrl.replace('-pooler', '');
      console.log('🔄 Detected Neon pooled connection. Auto-generating direct URL...');
    } else if (dbUrl.includes('pgbouncer=true')) {
      directUrl = dbUrl.replace('pgbouncer=true', '');
      console.log('🔄 Detected pgbouncer parameter. Removing for direct connection...');
    } else {
      directUrl = dbUrl;
    }
  }

  // Ensure DIRECT_URL is set so schema.prisma doesn't throw P1012 Validation Error
  process.env.DIRECT_URL = directUrl || dbUrl || '';

  try {
    console.log('📦 Running [prisma generate] ...');
    execSync('npx prisma generate', { stdio: 'inherit', env: process.env });
    
    console.log('🚀 Running [prisma migrate deploy] ...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
    
    console.log('✅ Database build step completed successfully.');
  } catch (error) {
    console.error("❌ Database build step failed.");
    process.exit(1);
  }
}

run();
