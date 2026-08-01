// One-off admin helper: mark a user Pro by email (Postgres/Prisma).
//   DATABASE_URL='<pg>' node set-pro.js [email]
'use strict';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const EMAIL = process.argv[2] || 'thegerassi@gmail.com';

async function main() {
  const user = await prisma.user.update({ where: { email: EMAIL }, data: { plan: 'pro' } });
  console.log('✓ plan=pro set for', EMAIL, '(id', user.id + ')');
  await prisma.$disconnect();
  process.exit(0);
}
main().catch(e => { console.error('✗', e.message); process.exit(1); });
