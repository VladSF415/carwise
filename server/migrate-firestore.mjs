// One-off: migrate CarWise users from Firestore -> Postgres.
// Carries over plan / stripe ids / usage / email / firebaseUid.
// Passwords are NOT migrated (impossible); migrated users set one via password reset.
//
// Usage (in-container on Railway, or locally against the internal DB):
//   FIREBASE_SERVICE_ACCOUNT='<json>' DATABASE_URL='<pg>' node migrate-firestore.mjs [--dry-run]
'use strict';

import admin from 'firebase-admin';
import { PrismaClient } from '@prisma/client';

const DRY = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

if (!process.env.FIREBASE_SERVICE_ACCOUNT) { console.error('FIREBASE_SERVICE_ACCOUNT missing'); process.exit(1); }
if (!process.env.DATABASE_URL)             { console.error('DATABASE_URL missing'); process.exit(1); }

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const fs = admin.firestore();

function nextReset() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
}

// Pull email + emailVerified from Firebase Auth (Firestore docs may lack email).
async function authEmail(uid) {
  try { const u = await admin.auth().getUser(uid); return { email: u.email || null, verified: !!u.emailVerified }; }
  catch { return { email: null, verified: false }; }
}

const run = async () => {
  const snap = await fs.collection('users').get();
  console.log(`Firestore users: ${snap.size}${DRY ? '  (DRY RUN)' : ''}`);
  let migrated = 0, skipped = 0;

  for (const doc of snap.docs) {
    const uid = doc.id;
    const d   = doc.data() || {};
    const { email: authMail, verified } = await authEmail(uid);
    const email = d.email || authMail;
    if (!email) { console.warn(`  skip ${uid}: no email`); skipped++; continue; }

    const data = {
      email,
      firebaseUid:          uid,
      emailVerified:        verified || true, // they existed in Firebase Auth already
      plan:                 d.plan || 'free',
      stripeCustomerId:     d.stripe_customer_id || null,
      stripeSubscriptionId: d.stripe_subscription_id || null,
      lookupsUsed:          Number.isInteger(d.lookups_used) ? d.lookups_used : 0,
      lookupsResetAt:       (typeof d.lookups_reset_at === 'string' && d.lookups_reset_at) ? d.lookups_reset_at : nextReset(),
    };

    if (DRY) { console.log(`  would upsert ${email} (plan=${data.plan}, used=${data.lookupsUsed})`); migrated++; continue; }

    try {
      await prisma.user.upsert({
        where:  { email },
        update: { firebaseUid: data.firebaseUid, plan: data.plan, stripeCustomerId: data.stripeCustomerId, stripeSubscriptionId: data.stripeSubscriptionId, lookupsUsed: data.lookupsUsed, lookupsResetAt: data.lookupsResetAt },
        create: data,
      });
      migrated++;
    } catch (e) {
      console.error(`  FAIL ${email}: ${e.message}`); skipped++;
    }
  }
  console.log(`Done. migrated=${migrated} skipped=${skipped}`);
  await prisma.$disconnect();
  process.exit(0);
};
run().catch((e) => { console.error(e); process.exit(1); });
