/**
 * seed-admin.ts
 * Run with: npx tsx scripts/seed-admin.ts
 * Creates the admin user if it doesn't already exist.
 */


import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@verixa.ca";
  const defaultAutogen = Math.random().toString(36).substring(2, 12) + "Vx!9";
  
  let password = process.env.ADMIN_PASSWORD;
  let isGenerated = false;

  if (!password) {
    password = defaultAutogen;
    isGenerated = true;
  }

  const name = "Verixa Admin";

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", hashedPassword },
    create: {
      email,
      name,
      role: "ADMIN",
      hashedPassword,
    },
  });

  // Initialize Default Platform Settings
  const defaultSettings = [
    { key: "platformFeePercent", value: "21" },
    { key: "maintenanceMode", value: "false" },
    { key: "stripeMode", value: "TEST" },
    { key: "blogWidgetTopCount", value: "5" },
    { key: "blogWidgetRandomCount", value: "5" },
  ];

  for (const s of defaultSettings) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: {}, // Don't overwrite existing settings if they exist
      create: s
    });
  }

  console.log("✅ Admin user and default settings initialized successfully.");
  console.log(`   Admin Email: ${email}`);
  if (isGenerated) {
    console.warn(`\n⚠️  WARNING: No ADMIN_PASSWORD found in environment.`);
    console.warn(`   A secure password was generated: ${password}`);
    console.warn(`   Please save this immediately or update your .env file.\n`);
  } else {
    console.log(`   Admin Password: [HIDDEN — Loaded from environment]`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
