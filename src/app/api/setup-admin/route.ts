import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// WARNING: THIS IS A TEMPORARY ENDPOINT TO FIX THE LIVE ADMIN LOGIN.
// IT SHOULD BE REMOVED AFTER SUCCESSFUL LOGIN.

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const email = "admin@verixa.ca";
    const password = "ChangeMe123!";
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
        update: {},
        create: s
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Admin successfully seeded/reset on live DB.",
      email: email,
      password: password
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
