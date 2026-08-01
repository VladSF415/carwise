// CarWise auth + Stripe server — Railway (Node.js + Express + Postgres/Prisma)
// Fully off Firebase: JWT-only auth (bcrypt access/refresh). No firebase-admin.
'use strict';

const express    = require('express');
const Stripe     = require('stripe');
const { Resend } = require('resend');
const { PrismaClient } = require('@prisma/client');

const WELCOME_EMAIL_HTML = require('./welcome-email.js');
const A = require('./auth.js');

const app    = express();
const prisma = new PrismaClient();

console.log('Env — DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'MISSING');
console.log('Env — JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'MISSING');
console.log('Env — STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'SET' : 'MISSING');
console.log('Env — STRIPE_PRICE_ID:', process.env.STRIPE_PRICE_ID ? 'SET' : 'MISSING');
console.log('Env — STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? 'SET' : 'MISSING');

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set');
  return Stripe(process.env.STRIPE_SECRET_KEY);
}

// ── CORS (chrome-extension origins) ─────────────────────────────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (origin.startsWith('chrome-extension://') || origin === '') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

const PORT         = process.env.PORT || 3000;
const PRICE_ID     = process.env.STRIPE_PRICE_ID;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://carwise-production-7434.up.railway.app';
const FREE_LIMIT   = 5;

// Next monthly reset boundary (1st of next month, ISO) — mirrors the old client logic.
function nextReset() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}
// True if `resetAtIso` is in the past (or missing) → usage window has rolled over.
function isRolledOver(resetAtIso) {
  if (!resetAtIso) return true;
  return new Date() >= new Date(resetAtIso);
}

function resend() { return new Resend(process.env.RESEND_API_KEY); }

// Best-effort signup emails (verify + welcome). Never throws into the request path.
async function sendSignupEmails(email, link) {
  if (!process.env.RESEND_API_KEY) { console.warn('RESEND_API_KEY unset — skipping signup emails'); return; }
  const r = resend();
  await r.emails.send({
    from: 'CarWise <noreply@extensionsmarket.com>',
    to: email,
    reply_to: 'contact@extensionsmarket.com',
    subject: 'Verify your CarWise account',
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="margin:0 0 8px">Verify your email</h2>
      <p style="color:#555;margin:0 0 24px">Click the button below to confirm your CarWise account.</p>
      <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">Verify Email</a>
      <p style="color:#999;font-size:12px;margin:24px 0 0">If you didn't create this account, you can ignore this email.</p>
    </div>`,
  });
  r.emails.send({
    from: 'ExtensionsMarket <hello@extensionsmarket.com>',
    to: email,
    reply_to: 'contact@extensionsmarket.com',
    subject: "You're in — here's everything we build for you 🚀",
    html: WELCOME_EMAIL_HTML,
  }).catch(console.error);
}

const authMiddleware = A.makeAuthMiddleware();

app.get('/', (_req, res) => res.send('CarWise server OK'));

// ══ AUTH ════════════════════════════════════════════════════════════════════════
app.post('/auth/signup', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password.' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.passwordHash) {
      return res.status(409).json({ error: 'An account with this email already exists. Sign in instead.' });
    }

    const passwordHash = await A.hashPassword(password);
    const v = A.newVerifyToken();

    const user = existing
      ? await prisma.user.update({ where: { id: existing.id }, data: { passwordHash, verifyToken: v.token, verifyTokenExpires: v.expires } })
      : await prisma.user.create({ data: {
          email, passwordHash, verifyToken: v.token, verifyTokenExpires: v.expires,
          plan: 'free', lookupsUsed: 0, lookupsResetAt: nextReset(),
        } });

    // Emails are best-effort: user creation must not fail if Resend is down/unset.
    const link = `${FRONTEND_URL}/auth/verify?token=${v.token}`;
    sendSignupEmails(email, link).catch(console.error);

    res.json({ success: true, needsConfirmation: true });
  } catch (e) {
    console.error('signup error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/auth/verify', async (req, res) => {
  const { token } = req.query || {};
  try {
    const user = token ? await prisma.user.findUnique({ where: { verifyToken: String(token) } }) : null;
    if (!user || !user.verifyTokenExpires || user.verifyTokenExpires < new Date()) {
      return res.status(400).send('<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h1>Link expired</h1><p>Please sign up again.</p></body></html>');
    }
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true, verifyToken: null, verifyTokenExpires: null } });
    res.send('<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h1 style="color:#2563eb">Email verified!</h1><p>You can now sign in from the CarWise extension.</p></body></html>');
  } catch (e) {
    res.status(500).send('Error verifying email.');
  }
});

// ── Password reset / set-password ───────────────────────────────────────────────
// Public recovery page: linked from the "Forgot password?" link in the extension
// AND from the account-migration email. Enter email -> reset link. Pre-fills ?email=.
app.get('/account', (_req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset your CarWise password</title></head>
  <body style="font-family:sans-serif;max-width:420px;margin:60px auto;padding:0 20px">
    <h1 style="color:#2563eb">Reset your CarWise password</h1>
    <p style="color:#555">Enter your email and we'll send you a link to set a new password. Your plan and settings are unchanged.</p>
    <form id="f">
      <input type="email" id="em" placeholder="you@email.com" required
        style="width:100%;padding:12px;font-size:16px;border:1px solid #ccc;border-radius:8px;margin:8px 0" />
      <button type="submit" style="width:100%;padding:12px;font-size:16px;background:#2563eb;color:#fff;border:0;border-radius:8px;font-weight:600;cursor:pointer">Send reset link</button>
    </form>
    <p id="msg" style="margin-top:16px"></p>
    <script>
      try { const q = new URLSearchParams(location.search).get('email'); if (q) document.getElementById('em').value = q; } catch(e){}
      document.getElementById('f').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('em').value;
        const msg = document.getElementById('msg');
        msg.textContent = 'Sending…';
        await fetch('/auth/request-reset', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) });
        msg.style.color = '#16a34a';
        msg.textContent = 'If that email has an account, a reset link is on its way. Check your inbox.';
        document.getElementById('f').style.display = 'none';
      });
    </script>
  </body></html>`);
});

// Request a reset link. Always returns success (no account enumeration).
app.post('/auth/request-reset', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Missing email.' });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const rt = A.newResetToken();
      await prisma.user.update({ where: { id: user.id }, data: { resetToken: rt.token, resetTokenExpires: rt.expires } });
      const link = `${FRONTEND_URL}/auth/reset?token=${rt.token}`;
      if (process.env.RESEND_API_KEY) {
        resend().emails.send({
          from: 'CarWise <noreply@extensionsmarket.com>',
          to: email,
          reply_to: 'contact@extensionsmarket.com',
          subject: 'Set your CarWise password',
          html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
            <h2 style="margin:0 0 8px">Set your password</h2>
            <p style="color:#555;margin:0 0 24px">Click below to set a new password for CarWise. This link expires in 2 hours.</p>
            <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">Set Password</a>
            <p style="color:#999;font-size:12px;margin:24px 0 0">If you didn't request this, you can ignore this email.</p>
          </div>`,
        }).catch(console.error);
      }
    }
    res.json({ success: true });
  } catch (e) {
    console.error('request-reset error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Landing page for the reset link — minimal form that POSTs to /auth/set-password.
app.get('/auth/reset', async (req, res) => {
  const { token } = req.query || {};
  const t = String(token || '');
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Set CarWise password</title></head>
  <body style="font-family:sans-serif;max-width:420px;margin:60px auto;padding:0 20px">
    <h1 style="color:#2563eb">Set your password</h1>
    <p style="color:#555">Choose a new password to keep using CarWise.</p>
    <form id="f">
      <input type="password" id="pw" placeholder="New password (min 6 chars)" minlength="6" required
        style="width:100%;padding:12px;font-size:16px;border:1px solid #ccc;border-radius:8px;margin:8px 0" />
      <button type="submit" style="width:100%;padding:12px;font-size:16px;background:#2563eb;color:#fff;border:0;border-radius:8px;font-weight:600;cursor:pointer">Set password</button>
    </form>
    <p id="msg" style="margin-top:16px"></p>
    <script>
      document.getElementById('f').addEventListener('submit', async (e) => {
        e.preventDefault();
        const pw = document.getElementById('pw').value;
        const msg = document.getElementById('msg');
        msg.textContent = 'Saving…';
        const r = await fetch('/auth/set-password', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ token:${JSON.stringify(t)}, password: pw }) });
        const d = await r.json().catch(()=>({}));
        if (r.ok) { msg.style.color='#16a34a'; msg.textContent='Done! Open the CarWise extension and sign in.'; document.getElementById('f').style.display='none'; }
        else { msg.style.color='#dc2626'; msg.textContent = d.error || 'Something went wrong.'; }
      });
    </script>
  </body></html>`);
});

app.post('/auth/set-password', async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: 'Missing token or password.' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  try {
    const user = await prisma.user.findUnique({ where: { resetToken: String(token) } });
    if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      return res.status(400).json({ error: 'This link has expired. Request a new one.' });
    }
    const passwordHash = await A.hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, emailVerified: true, resetToken: null, resetTokenExpires: null },
    });
    res.json({ success: true });
  } catch (e) {
    console.error('set-password error:', e);
    res.status(500).json({ error: e.message });
  }
});

async function issueTokens(user) {
  const access  = A.signAccessToken(user);
  const refresh = A.newRefreshTokenValue();
  await prisma.refreshToken.create({ data: { token: refresh, userId: user.id, expiresAt: A.refreshExpiry() } });
  return { access_token: access, refresh_token: refresh, expires_in: A.ACCESS_TTL_SEC, email: user.email, user_id: user.id };
}

app.post('/auth/signin', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password.' });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await A.verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Please verify your email address first — check your inbox.' });
    }
    res.json({ success: true, ...(await issueTokens(user)) });
  } catch (e) {
    console.error('signin error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/auth/refresh', async (req, res) => {
  const { refresh_token } = req.body || {};
  if (!refresh_token) return res.status(400).json({ error: 'Missing refresh_token' });
  try {
    const rec = await prisma.refreshToken.findUnique({ where: { token: refresh_token }, include: { user: true } });
    if (!rec || rec.revoked || rec.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    // rotate
    await prisma.refreshToken.update({ where: { id: rec.id }, data: { revoked: true } });
    res.json({ success: true, ...(await issueTokens(rec.user)) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/auth/signout', async (req, res) => {
  const { refresh_token } = req.body || {};
  if (refresh_token) {
    await prisma.refreshToken.updateMany({ where: { token: refresh_token }, data: { revoked: true } }).catch(() => {});
  }
  res.json({ success: true });
});

// ══ PROFILE / USAGE (JWT-gated) ═════════════════════════════════════════════════
// Returns the shape the old Firestore /profile returned, so canScan() is unchanged:
//   { plan, lookups_used, lookups_reset_at, stripe_customer_id, email, free_limit }
app.get('/profile', authMiddleware, async (req, res) => {
  try {
    let user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // monthly reset (moved server-side from the client)
    if (isRolledOver(user.lookupsResetAt)) {
      user = await prisma.user.update({ where: { id: user.id }, data: { lookupsUsed: 0, lookupsResetAt: nextReset() } });
    }
    res.json({
      plan:               user.plan || 'free',
      lookups_used:       user.lookupsUsed || 0,
      lookups_reset_at:   user.lookupsResetAt,
      free_limit:         FREE_LIMIT,
      stripe_customer_id: user.stripeCustomerId || null,
      email:              user.email,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/usage/increment', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const rolled = isRolledOver(user.lookupsResetAt);
    const base   = rolled ? 0 : (user.lookupsUsed || 0);
    // enforce cap server-side for free plan
    if ((user.plan || 'free') === 'free' && base >= FREE_LIMIT) {
      return res.status(402).json({ error: 'Free limit reached', lookups_used: base, free_limit: FREE_LIMIT });
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { lookupsUsed: base + 1, lookupsResetAt: rolled ? nextReset() : user.lookupsResetAt },
    });
    res.json({ success: true, lookups_used: updated.lookupsUsed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ══ STRIPE ══════════════════════════════════════════════════════════════════════
app.post('/checkout', authMiddleware, async (req, res) => {
  try {
    const stripe = getStripe();
    const user   = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    const session = await stripe.checkout.sessions.create({
      customer:              customerId,
      payment_method_types:  ['card'],
      mode:                  'subscription',
      line_items:            [{ price: PRICE_ID, quantity: 1 }],
      success_url:           `${FRONTEND_URL}/success`,
      cancel_url:            `${FRONTEND_URL}/cancel`,
      subscription_data:     { metadata: { user_id: user.id } },
      metadata:              { user_id: user.id },
      allow_promotion_codes: true,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/portal', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || !user.stripeCustomerId) return res.status(400).json({ error: 'No billing account found.' });
    const session = await getStripe().billingPortal.sessions.create({ customer: user.stripeCustomerId, return_url: FRONTEND_URL });
    res.json({ url: session.url });
  } catch (err) {
    console.error('portal error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      const userId = s.metadata?.user_id;
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { plan: 'pro', stripeCustomerId: s.customer, stripeSubscriptionId: s.subscription },
        }).catch(async () => {
          // fallback: match by customer id
          await prisma.user.updateMany({ where: { stripeCustomerId: s.customer }, data: { plan: 'pro', stripeSubscriptionId: s.subscription } });
        });
        console.log(`Upgraded user ${userId} to Pro`);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      await prisma.user.updateMany({ where: { stripeCustomerId: event.data.object.customer }, data: { plan: 'free', stripeSubscriptionId: null } });
    }

    if (event.type === 'customer.subscription.updated') {
      const sub  = event.data.object;
      const plan = sub.items?.data?.[0]?.price?.id === PRICE_ID ? 'pro' : 'free';
      await prisma.user.updateMany({ where: { stripeCustomerId: sub.customer }, data: { plan } });
    }

    if (event.type === 'invoice.payment_failed') {
      console.log('Payment failed for:', event.data.object.customer);
    }
  } catch (err) {
    console.error('webhook handler error:', err);
  }
  res.json({ received: true });
});

app.get('/success', (_req, res) => res.send(`
  <html><head><title>CarWise Pro</title></head>
  <body style="font-family:sans-serif;text-align:center;padding:80px;background:#f8fafc">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:48px;box-shadow:0 4px 24px rgba(0,0,0,.08)">
      <div style="font-size:48px;margin-bottom:16px">🎉</div>
      <h1 style="color:#16a34a;margin:0 0 12px">You're on CarWise Pro!</h1>
      <p style="color:#64748b;margin:0">Unlimited VIN scans are now active. Open the CarWise extension to get started.</p>
      <p style="margin-top:32px;color:#94a3b8;font-size:13px">You can close this tab.</p>
    </div>
  </body></html>`));

app.get('/cancel', (_req, res) => res.send(`
  <html><head><title>CarWise</title></head>
  <body style="font-family:sans-serif;text-align:center;padding:80px;background:#f8fafc">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:48px;box-shadow:0 4px 24px rgba(0,0,0,.08)">
      <h1 style="margin:0 0 12px">No charge was made</h1>
      <p style="color:#64748b;margin:0">You can close this tab and continue with your free scans.</p>
    </div>
  </body></html>`));

app.listen(PORT, () => console.log(`CarWise server on port ${PORT}`));
