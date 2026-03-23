import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");
  const defaultPassword = await bcrypt.hash("password123", 10);

  // ============================================
  // 1. SEED CONSULTANT ACCOUNT
  // ============================================
  const consultantUser = await prisma.user.upsert({
    where: { email: "consultant@verixa.ca" },
    update: {},
    create: {
      name: "Test Consultant",
      email: "consultant@verixa.ca",
      hashedPassword: defaultPassword,
      role: "CONSULTANT"
    }
  });

  const consultant = await prisma.consultantProfile.upsert({
    where: { licenseNumber: "R999999" },
    update: { userId: consultantUser.id }, // Make sure they are linked
    create: {
      userId: consultantUser.id,
      fullName: "Test Consultant (Seeded)",
      slug: "test-consultant-r999999",
      licenseNumber: "R999999",
      status: "Active",
      company: "Verixa Testing Corp",
      city: "Toronto",
      province: "Ontario",
      country: "Canada",
      timezone: "America/Toronto",
      bookingEnabled: true
    }
  });

  await prisma.bookingSettings.upsert({
    where: { consultantProfileId: consultant.id },
    update: {},
    create: {
      consultantProfileId: consultant.id,
      bufferMinutes: 15,
      minimumNoticeHours: 24,
      maxBookingsPerDay: 5,
      autoConfirm: false,
    }
  });

  const types = [
    { title: "15-Minute Assessment", description: "Quick phone call.", durationMinutes: 15, priceCents: 5000, communicationType: "PHONE" },
    { title: "30-Minute Video Session", description: "Detailed video call.", durationMinutes: 30, priceCents: 15000, communicationType: "VIDEO" },
  ];

  for (const type of types) {
    const existing = await prisma.consultationType.findFirst({
      where: { consultantProfileId: consultant.id, title: type.title }
    });
    if (!existing) {
      await prisma.consultationType.create({ data: { consultantProfileId: consultant.id, ...type } });
    }
  }

  for (let i = 1; i <= 5; i++) {
    const existing = await prisma.weeklyAvailability.findFirst({
      where: { consultantProfileId: consultant.id, dayOfWeek: i }
    });
    if (!existing) {
      await prisma.weeklyAvailability.create({
        data: { consultantProfileId: consultant.id, dayOfWeek: i, startTime: "09:00", endTime: "17:00", isActive: true }
      });
    }
  }

  // ============================================
  // 2. SEED CLIENT ACCOUNT (USER ROLE)
  // ============================================
  const clientUser = await prisma.user.upsert({
    where: { email: "client@verixa.ca" },
    update: {},
    create: {
      name: "Test Client",
      email: "client@verixa.ca",
      hashedPassword: defaultPassword,
      role: "USER"
    }
  });

  console.log("-----------------------------------------");
  console.log("TEST ACCOUNTS CREATED SUCCESSFULLY:");
  console.log("-----------------------------------------");
  console.log("CONSULTANT:");
  console.log("  Email: consultant@verixa.ca");
  console.log("  Pass:  password123");
  console.log("");
  console.log("CLIENT:");
  console.log("  Email: client@verixa.ca");
  console.log("  Pass:  password123");
  console.log("-----------------------------------------");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
