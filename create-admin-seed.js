const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  await prisma.user.upsert({
    where: { email: 'admin@verixa.ca' },
    update: {
      role: 'ADMIN',
      hashedPassword
    },
    create: {
      email: 'admin@verixa.ca',
      name: 'Verixa Superadmin',
      hashedPassword,
      role: 'ADMIN'
    }
  });

  console.log('Admin account created successfully: admin@verixa.ca / password123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
