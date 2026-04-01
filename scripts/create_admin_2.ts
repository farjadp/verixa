import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@verixa.ca'
  const password = 'password123'
  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'ADMIN',
      hashedPassword
    },
    create: {
      email,
      name: 'Verixa Admin',
      hashedPassword,
      role: 'ADMIN'
    }
  })

  console.log('Successfully created/updated admin user:', user.email)
  console.log('Password set to:', password)
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
