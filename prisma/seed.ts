import 'dotenv/config';
import { PrismaClient, Role, UserStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL || 'admin@srithangam.com';
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD || 'Admin@123';

  const existing = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN },
  });

  if (existing) {
    console.log('Super Admin already exists. Skipping seed.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  // Seed default system settings
  await prisma.systemSetting.upsert({
    where: { key: 'top_performers_frozen' },
    update: {},
    create: { key: 'top_performers_frozen', value: 'false' },
  });

  console.log(`Super Admin seeded: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
