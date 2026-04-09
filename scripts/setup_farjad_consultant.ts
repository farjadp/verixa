import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'farjadp@live.com'
  const password = 'password123'
  const hashedPassword = await bcrypt.hash(password, 10)

  console.log(`Setting up ${email} as a CONSULTANT...`)

  // 1. Ensure user is created and role is CONSULTANT
  const consultantUser = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'CONSULTANT',
      hashedPassword
    },
    create: {
      name: 'Farjad Consultant',
      email,
      hashedPassword,
      role: 'CONSULTANT'
    }
  })

  // 2. Ensure ConsultantProfile exists
  const licenseNumber = 'R123456' // unique fake license for testing
  const consultant = await prisma.consultantProfile.upsert({
    where: { licenseNumber },
    update: { userId: consultantUser.id }, // Make sure they are linked
    create: {
      userId: consultantUser.id,
      fullName: 'Farjad P (Consultant)',
      slug: 'farjadp-consultant',
      licenseNumber,
      status: 'Active',
      company: 'Verixa Testing Corp',
      city: 'Toronto',
      province: 'Ontario',
      country: 'Canada',
      timezone: 'America/Toronto',
      bookingEnabled: true
    }
  })

  // 3. Ensure BookingSettings exists
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
  })

  // 4. Consultation Types
  const types = [
    { title: "15-Minute Assessment", description: "Quick phone call.", durationMinutes: 15, priceCents: 5000, communicationType: "PHONE" },
    { title: "30-Minute Video Session", description: "Detailed video call.", durationMinutes: 30, priceCents: 15000, communicationType: "VIDEO" },
  ]

  for (const type of types) {
    const existing = await prisma.consultationType.findFirst({
      where: { consultantProfileId: consultant.id, title: type.title }
    })
    if (!existing) {
      await prisma.consultationType.create({ data: { consultantProfileId: consultant.id, ...type } })
    }
  }

  // 5. Weekly Availability
  for (let i = 1; i <= 5; i++) {
    const existing = await prisma.weeklyAvailability.findFirst({
      where: { consultantProfileId: consultant.id, dayOfWeek: i }
    })
    if (!existing) {
      await prisma.weeklyAvailability.create({
        data: { consultantProfileId: consultant.id, dayOfWeek: i, startTime: "09:00", endTime: "17:00", isActive: true }
      })
    }
  }

  console.log('Successfully configured farjadp@live.com as a CONSULTANT.')
  console.log('Password set to:', password)
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
