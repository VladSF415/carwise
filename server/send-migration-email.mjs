// One-off: email existing CarWise users that accounts moved to a new system and
// they need to update the extension + set a new password.
//
// SAFE BY DEFAULT: dry-run unless --send is passed. Excludes Vlad's own/test accounts.
// Run in-container so RESEND_API_KEY is present:
//   railway ssh --service carwise "cd /app/server && node send-migration-email.mjs"          (dry run)
//   railway ssh --service carwise "cd /app/server && node send-migration-email.mjs --send"   (real)
//
// ⚠️ BEFORE SENDING: set CWS_URL below to the real CarWise Chrome Web Store listing,
//    and only send AFTER the new client version is Published on CWS.
'use strict';

import { Resend } from 'resend';
import { PrismaClient } from '@prisma/client';

const SEND = process.argv.includes('--send');
const prisma = new PrismaClient();

// Never email these (Vlad's own + test accounts)
const EXCLUDE = new Set([
  'thegerassi@gmail.com',
  'vladgeras18@gmail.com',
  'vladgeras17@gmail.com',
  'mapleads.test@gmail.com',
]);

// TODO(Vlad): replace with the real CarWise CWS listing id before --send.
const CWS_URL = 'https://chromewebstore.google.com/detail/CARWISE_LISTING_ID';
const ACCOUNT_URL = 'https://carwise-production-7434.up.railway.app/account';

function emailHtml() {
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;color:#222">
    <h2 style="margin:0 0 12px">Action needed: set your CarWise password</h2>
    <p style="margin:0 0 16px">Hi,</p>
    <p style="margin:0 0 16px">I moved CarWise's accounts to a new, more secure system. To keep using the extension, you'll need to do two quick things:</p>
    <ol style="margin:0 0 16px;padding-left:20px;line-height:1.6">
      <li>Update the CarWise extension in Chrome (it should auto-update, or get it <a href="${CWS_URL}" style="color:#2563eb">here</a>).</li>
      <li><a href="${ACCOUNT_URL}" style="color:#2563eb;font-weight:600">Set a new password</a>.</li>
    </ol>
    <p style="margin:0 0 16px">Your plan and settings are unchanged — this is just a one-time sign-in reset.</p>
    <p style="margin:0 0 16px">Sorry for the hassle, and thanks for using CarWise.</p>
    <p style="margin:0">Best,<br/>Vladislav</p>
  </div>`;
}

const run = async () => {
  if (!process.env.RESEND_API_KEY && SEND) { console.error('RESEND_API_KEY missing'); process.exit(1); }
  if (SEND && CWS_URL.includes('CARWISE_LISTING_ID')) {
    console.error('Refusing to send: set the real CWS_URL first.'); process.exit(1);
  }
  const users = await prisma.user.findMany({ orderBy: { email: 'asc' } });
  const recipients = users.map(u => u.email).filter(e => e && !EXCLUDE.has(e) && !e.endsWith('@firebase.local'));

  console.log(`Total users: ${users.length}`);
  console.log(`Excluded (own/test): ${users.length - recipients.length}`);
  console.log(`Will email ${recipients.length}${SEND ? '' : '  (DRY RUN — pass --send to actually send)'}:`);
  recipients.forEach(e => console.log('  - ' + e));

  if (!SEND) { await prisma.$disconnect(); process.exit(0); }

  const resend = new Resend(process.env.RESEND_API_KEY);
  let ok = 0, fail = 0;
  for (const to of recipients) {
    try {
      await resend.emails.send({
        from: 'CarWise <noreply@extensionsmarket.com>',
        to,
        reply_to: 'contact@extensionsmarket.com',
        subject: 'Action needed: set your CarWise password',
        html: emailHtml(),
      });
      console.log('  sent -> ' + to); ok++;
    } catch (e) {
      console.error('  FAIL -> ' + to + ': ' + e.message); fail++;
    }
  }
  console.log(`Done. sent=${ok} failed=${fail}`);
  await prisma.$disconnect();
  process.exit(0);
};
run().catch(e => { console.error(e); process.exit(1); });
