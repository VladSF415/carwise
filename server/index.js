// CarWise server — Railway (Node.js + Express)
'use strict';

const express    = require('express');
const Stripe     = require('stripe');
const admin      = require('firebase-admin');
const { Resend } = require('resend');

const app = express();

console.log('Env check — FIREBASE_SERVICE_ACCOUNT:', process.env.FIREBASE_SERVICE_ACCOUNT ? 'SET' : 'MISSING');
console.log('Env check — STRIPE_SECRET_KEY:',        process.env.STRIPE_SECRET_KEY        ? 'SET' : 'MISSING');
console.log('Env check — STRIPE_PRICE_ID:',          process.env.STRIPE_PRICE_ID          ? 'SET' : 'MISSING');
console.log('Env check — STRIPE_WEBHOOK_SECRET:',    process.env.STRIPE_WEBHOOK_SECRET    ? 'SET' : 'MISSING');

function getStripe() { return Stripe(process.env.STRIPE_SECRET_KEY); }

function getDb() {
  if (!admin.apps.length) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  return admin.firestore();
}

const PORT         = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://carwise-production-7434.up.railway.app';

// ── CORS — allow Chrome extensions ────────────────────────────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (origin.startsWith('chrome-extension://') || origin === '') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());


const WELCOME_EMAIL_HTML = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;padding:0;background:#06060f;font-family:\'Inter\',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;"><div style="max-width:600px;margin:0 auto;padding:40px 20px;"><div style="text-align:center;padding:40px 0 32px;"><div style="font-size:28px;font-weight:900;color:#a78bfa;display:inline-block;margin-bottom:16px;">ExtensionsMarket</div><h1 style="color:#f0f0ff;font-size:32px;font-weight:900;letter-spacing:-1px;line-height:1.15;margin:0 0 14px;">You\'re in. Here\'s everything<br/>we build for you.</h1><p style="color:#8888aa;font-size:16px;line-height:1.6;margin:0;">You just unlocked one tool. Here are 8 more — all free to try.</p></div><div style="height:1px;background:#1c1c38;margin:8px 0 36px;"></div><div style="margin-bottom:12px;"><span style="display:inline-block;background:rgba(124,58,237,0.12);border:1px solid rgba(124,58,237,0.25);border-radius:20px;padding:5px 14px;font-size:11px;font-weight:700;color:#a78bfa;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:20px;">Chrome Extensions — Free</span></div><div style="background:#0e0e1f;border:1px solid #1c1c38;border-radius:16px;padding:24px;margin-bottom:12px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="48" valign="top" style="font-size:32px;padding-right:16px;">✈️</td><td><div style="color:#f0f0ff;font-size:16px;font-weight:800;margin-bottom:4px;">AirPrice</div><div style="color:#8888aa;font-size:13px;line-height:1.5;margin-bottom:12px;">Price your Airbnb using real market data — live comps, demand signals, seasonal patterns. Stop guessing your nightly rate.</div><a href="https://extensionsmarket.com/airprice" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:8px 18px;border-radius:8px;">Add to Chrome — Free →</a></td></tr></table></div><div style="background:#0e0e1f;border:1px solid #1c1c38;border-radius:16px;padding:24px;margin-bottom:12px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="48" valign="top" style="font-size:32px;padding-right:16px;">🏠</td><td><div style="color:#f0f0ff;font-size:16px;font-weight:800;margin-bottom:4px;">STRInvest</div><div style="color:#8888aa;font-size:13px;line-height:1.5;margin-bottom:12px;">Analyze any Zillow or Redfin listing as a short-term rental in 60 seconds. Revenue, cap rate, cash-on-cash, STR regulations — all on the listing page.</div><a href="https://extensionsmarket.com/strinvest" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:8px 18px;border-radius:8px;">Add to Chrome — Free →</a></td></tr></table></div><div style="background:#0e0e1f;border:1px solid #1c1c38;border-radius:16px;padding:24px;margin-bottom:12px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="48" valign="top" style="font-size:32px;padding-right:16px;">📍</td><td><div style="color:#f0f0ff;font-size:16px;font-weight:800;margin-bottom:4px;">MapLeads</div><div style="color:#8888aa;font-size:13px;line-height:1.5;margin-bottom:12px;">Turn any Google Maps search into a targeted B2B lead list. Extract business names, phones, websites — export to CSV in minutes.</div><a href="https://extensionsmarket.com/mapleads" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:8px 18px;border-radius:8px;">Add to Chrome — Free →</a></td></tr></table></div><div style="background:#0e0e1f;border:1px solid #1c1c38;border-radius:16px;padding:24px;margin-bottom:12px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="48" valign="top" style="font-size:32px;padding-right:16px;">🚗</td><td><div style="color:#f0f0ff;font-size:16px;font-weight:800;margin-bottom:4px;">CarWise</div><div style="color:#8888aa;font-size:13px;line-height:1.5;margin-bottom:12px;">Full used car check before you buy — VIN decode, open recalls, NHTSA safety ratings, and market value. All on the listing page.</div><a href="https://extensionsmarket.com/carwise" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:8px 18px;border-radius:8px;">Add to Chrome — Free →</a></td></tr></table></div><div style="background:#0e0e1f;border:1px solid #1c1c38;border-radius:16px;padding:24px;margin-bottom:12px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="48" valign="top" style="font-size:32px;padding-right:16px;">🏡</td><td><div style="color:#f0f0ff;font-size:16px;font-weight:800;margin-bottom:4px;">HomePilot</div><div style="color:#8888aa;font-size:13px;line-height:1.5;margin-bottom:12px;">See the true monthly cost of any home — mortgage, taxes, HOA, insurance, maintenance reserve. Plus negotiation signals on every Zillow listing.</div><a href="https://extensionsmarket.com/homepilot" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:8px 18px;border-radius:8px;">Add to Chrome — Free →</a></td></tr></table></div><div style="background:#0e0e1f;border:1px solid #1c1c38;border-radius:16px;padding:24px;margin-bottom:12px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="48" valign="top" style="font-size:32px;padding-right:16px;">💼</td><td><div style="color:#f0f0ff;font-size:16px;font-weight:800;margin-bottom:4px;">JobPilot</div><div style="color:#8888aa;font-size:13px;line-height:1.5;margin-bottom:12px;">AI cover letters tailored to each job description — generated in seconds, tracked automatically. Apply to more jobs without sacrificing quality.</div><a href="https://extensionsmarket.com/jobpilot" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:8px 18px;border-radius:8px;">Add to Chrome — Free →</a></td></tr></table></div><div style="height:1px;background:#1c1c38;margin:28px 0;"></div><div style="margin-bottom:12px;"><span style="display:inline-block;background:rgba(236,72,153,0.1);border:1px solid rgba(236,72,153,0.25);border-radius:20px;padding:5px 14px;font-size:11px;font-weight:700;color:#f472b6;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:20px;">Shopify Apps</span></div><div style="background:#0e0e1f;border:1px solid #1c1c38;border-radius:16px;padding:24px;margin-bottom:12px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="48" valign="top" style="font-size:32px;padding-right:16px;">🔥</td><td><div style="color:#f0f0ff;font-size:16px;font-weight:800;margin-bottom:4px;">EZDrop — Viral Product Drops</div><div style="color:#8888aa;font-size:13px;line-height:1.5;margin-bottom:12px;">Run Robinhood-style limited drops on Shopify. Every signup gets a referral link that moves them up the queue — your customers do the marketing for you.</div><a href="https://ezdrop.app" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:8px 18px;border-radius:8px;">Install free on Shopify →</a></td></tr></table></div><div style="background:#0e0e1f;border:1px solid #1c1c38;border-radius:16px;padding:24px;margin-bottom:32px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="48" valign="top" style="font-size:32px;padding-right:16px;">🌙</td><td><div style="color:#f0f0ff;font-size:16px;font-weight:800;margin-bottom:4px;">Sleepmaxing — Sleep Quiz for Shopify</div><div style="color:#8888aa;font-size:13px;line-height:1.5;margin-bottom:12px;">Add an interactive sleep quiz to any product page. Shoppers get personalized product recommendations and convert at higher rates. No code needed.</div><a href="https://extensionsmarket.com/sleepmaxing" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:8px 18px;border-radius:8px;">Install free on Shopify →</a></td></tr></table></div><div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.25);border-radius:20px;padding:36px 32px;text-align:center;margin-bottom:36px;"><div style="color:#f0f0ff;font-size:22px;font-weight:900;letter-spacing:-0.5px;margin-bottom:10px;">Everything above is free to start.</div><div style="color:#8888aa;font-size:14px;line-height:1.6;margin-bottom:24px;">We build tools that pay for themselves. Try any of them — no credit card required.</div><a href="https://extensionsmarket.com" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 32px;border-radius:10px;">Browse all tools →</a></div><div style="text-align:center;padding-top:8px;"><div style="color:#333;font-size:12px;line-height:1.7;">You\'re receiving this because you signed up for an ExtensionsMarket product.<br/><a href="https://extensionsmarket.com" style="color:#555;text-decoration:none;">extensionsmarket.com</a> · <a href="mailto:contact@extensionsmarket.com" style="color:#555;text-decoration:none;">contact@extensionsmarket.com</a></div></div></div></body></html>';

app.get('/', (_req, res) => res.send('CarWise server OK'));

// ── Get / create user profile ─────────────────────────────────────────────────
app.get('/profile', async (req, res) => {
  const idToken = (req.headers.authorization || '').replace('Bearer ', '');
  if (!idToken) return res.status(401).json({ error: 'Missing token' });
  try {
    const db      = getDb();
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid     = decoded.uid;
    const ref     = db.collection('users').doc(uid);
    let   doc     = await ref.get();
    if (!doc.exists) {
      const now   = new Date();
      const reset = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
      await ref.set({ plan: 'free', lookups_used: 0, lookups_reset_at: reset });
      doc = await ref.get();
    }
    res.json(doc.data());
  } catch (e) {
    console.error('profile error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Create Stripe checkout session ────────────────────────────────────────────
app.post('/checkout', async (req, res) => {
  const { userId, email } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const db     = getDb();
    const stripe = getStripe();

    const doc      = await db.collection('users').doc(userId).get();
    let customerId = doc.exists ? doc.data().stripe_customer_id : null;

    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { firebase_uid: userId } });
      customerId = customer.id;
      await db.collection('users').doc(userId).set({ stripe_customer_id: customerId }, { merge: true });
    }

    const session = await stripe.checkout.sessions.create({
      customer:              customerId,
      mode:                  'subscription',
      payment_method_types:  ['card'],
      line_items:            [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url:           `${FRONTEND_URL}/success`,
      cancel_url:            `${FRONTEND_URL}/cancel`,
      subscription_data:     { metadata: { firebase_uid: userId } },
      allow_promotion_codes: true,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('checkout error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Stripe customer portal ────────────────────────────────────────────────────
app.post('/portal', async (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const db  = getDb();
    const doc = await db.collection('users').doc(userId).get();

    if (!doc.exists || !doc.data().stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found.' });
    }

    const stripe  = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer:   doc.data().stripe_customer_id,
      return_url: FRONTEND_URL,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('portal error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Stripe webhook ────────────────────────────────────────────────────────────
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
    const db = getDb();

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId  = session.metadata?.firebase_uid;
      if (userId) {
        await db.collection('users').doc(userId).set({
          plan:                   'pro',
          stripe_customer_id:     session.customer,
          stripe_subscription_id: session.subscription,
        }, { merge: true });
        console.log(`Upgraded user ${userId} to pro`);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const snapshot = await db.collection('users').where('stripe_customer_id', '==', event.data.object.customer).get();
      for (const doc of snapshot.docs) {
        await doc.ref.set({ plan: 'free', stripe_subscription_id: null }, { merge: true });
        console.log(`Downgraded user ${doc.id} to free`);
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const sub      = event.data.object;
      const priceId  = sub.items?.data?.[0]?.price?.id;
      const plan     = priceId === process.env.STRIPE_PRICE_ID ? 'pro' : 'free';
      const snapshot = await db.collection('users').where('stripe_customer_id', '==', sub.customer).get();
      for (const doc of snapshot.docs) {
        await doc.ref.set({ plan }, { merge: true });
        console.log(`Updated user ${doc.id} to ${plan}`);
      }
    }

    if (event.type === 'invoice.payment_failed') {
      console.log('Payment failed for customer:', event.data.object.customer);
    }
  } catch (err) {
    console.error('webhook handler error:', err.message);
  }

  res.json({ received: true });
});

// ── Success / cancel pages ────────────────────────────────────────────────────
app.get('/success', (_req, res) => {
  res.send(`
    <html><head><title>CarWise Pro</title></head>
    <body style="font-family:sans-serif;text-align:center;padding:80px;background:#f8fafc">
      <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:48px;box-shadow:0 4px 24px rgba(0,0,0,.08)">
        <div style="font-size:48px;margin-bottom:16px">🎉</div>
        <h1 style="color:#16a34a;margin:0 0 12px">You're on CarWise Pro!</h1>
        <p style="color:#64748b;margin:0">Unlimited VIN scans are now active. Open the CarWise extension to get started.</p>
        <p style="margin-top:32px;color:#94a3b8;font-size:13px">You can close this tab.</p>
      </div>
    </body></html>
  `);
});

app.get('/cancel', (_req, res) => {
  res.send(`
    <html><head><title>CarWise</title></head>
    <body style="font-family:sans-serif;text-align:center;padding:80px;background:#f8fafc">
      <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:48px;box-shadow:0 4px 24px rgba(0,0,0,.08)">
        <h1 style="margin:0 0 12px">No charge was made</h1>
        <p style="color:#64748b;margin:0">You can close this tab and continue with your free scans.</p>
      </div>
    </body></html>
  `);
});

app.post('/send-verification', async (req, res) => {
  const { idToken, email } = req.body || {};
  if (!idToken || !email) return res.status(400).json({ error: 'Missing idToken or email.' });
  try {
    if (!admin.apps.length) getDb();
    const decoded = await admin.auth().verifyIdToken(idToken);
    if (decoded.email !== email) return res.status(401).json({ error: 'Unauthorized.' });
    const link = await admin.auth().generateEmailVerificationLink(email);
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'CarWise <noreply@extensionsmarket.com>',
      to: email,
      subject: 'Verify your CarWise account',
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="margin:0 0 8px">Verify your email</h2>
        <p style="color:#555;margin:0 0 24px">Click the button below to confirm your CarWise account.</p>
        <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">Verify Email</a>
        <p style="color:#999;font-size:12px;margin:24px 0 0">If you didn't create this account, you can ignore this email.</p>
      </div>`,
    });
    // Fire-and-forget welcome email
    resend.emails.send({
      from: 'ExtensionsMarket <hello@extensionsmarket.com>',
      to: email,
      subject: "You\'re in — here\'s everything we build for you 🚀",
      html: WELCOME_EMAIL_HTML,
    }).catch(console.error);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`CarWise server on port ${PORT}`));
