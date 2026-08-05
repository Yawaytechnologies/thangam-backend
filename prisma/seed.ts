import 'dotenv/config';
import { PrismaClient, Role, UserStatus, BranchStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PASSWORD =
  process.env.SEED_PASSWORD || process.env.SEED_SUPER_ADMIN_PASSWORD || 'Admin@123';

const SUPER_ADMIN_EMAIL =
  process.env.SEED_SUPER_ADMIN_EMAIL || 'superadmin@srithangam.com';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@srithangam.com';
const USER_EMAIL = process.env.SEED_USER_EMAIL || 'user@srithangam.com';

/** Creates the user if the email is not taken, otherwise returns the existing one. */
async function upsertUser(
  email: string,
  phone: string | null,
  role: Role,
  passwordHash: string,
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email,
      phone,
      passwordHash,
      role,
      status: UserStatus.ACTIVE,
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // ─── Default branch (admins and members both require one) ───────────────────
  const branch = await prisma.branch.upsert({
    where: { branchCode: 'STH-BR-001' },
    update: {},
    create: {
      branchCode: 'STH-BR-001',
      name: 'Chennai Central Branch',
      branchType: 'HEAD_OFFICE',
      phone: '04412345678',
      address: 'Anna Salai',
      city: 'Chennai',
      district: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600002',
      status: BranchStatus.ACTIVE,
    },
  });

  // ─── Super Admin (web only — no admin/member profile) ───────────────────────
  await upsertUser(SUPER_ADMIN_EMAIL, null, Role.SUPER_ADMIN, passwordHash);

  // ─── Admin (branch-level, needs an Admin profile) ───────────────────────────
  const adminUser = await upsertUser(
    ADMIN_EMAIL,
    '9000000001',
    Role.ADMIN,
    passwordHash,
  );

  const existingAdmin = await prisma.admin.findUnique({
    where: { userId: adminUser.id },
  });
  if (!existingAdmin) {
    await prisma.admin.create({
      data: {
        adminId: 'STH-ADM-0001',
        userId: adminUser.id,
        branchId: branch.id,
        fullName: 'Branch Admin',
        phone: '9000000001',
        email: ADMIN_EMAIL,
        status: UserStatus.ACTIVE,
      },
    });
  }

  // ─── User (AGENT — the base member tier, needs a Member profile) ────────────
  const memberUser = await upsertUser(
    USER_EMAIL,
    '9000000002',
    Role.AGENT,
    passwordHash,
  );

  const existingMember = await prisma.member.findUnique({
    where: { userId: memberUser.id },
  });
  if (!existingMember) {
    await prisma.member.create({
      data: {
        memberId: 'STH-MEM-0001',
        userId: memberUser.id,
        branchId: branch.id,
        fullName: 'Default User',
        phone: '9000000002',
        email: USER_EMAIL,
        role: Role.AGENT,
        city: 'Chennai',
        district: 'Chennai',
        state: 'Tamil Nadu',
        status: UserStatus.ACTIVE,
      },
    });
  }

  // ─── Default system settings ────────────────────────────────────────────────
  await prisma.systemSetting.upsert({
    where: { key: 'top_performers_frozen' },
    update: {},
    create: { key: 'top_performers_frozen', value: 'false' },
  });

  console.log('Seed complete:');
  console.log(`  SUPER_ADMIN  ${SUPER_ADMIN_EMAIL}`);
  console.log(`  ADMIN        ${ADMIN_EMAIL}        (${branch.branchCode})`);
  console.log(`  AGENT        ${USER_EMAIL}         (${branch.branchCode})`);
  console.log(`  Password     ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
