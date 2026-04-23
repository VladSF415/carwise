// CarWise server — Railway (Node.js + Express)
'use strict';

const express = require('express');
const Stripe  = require('stripe');
const admin   = require('firebase-admin');

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

app.get('/', (_req, res) => res.send('CarWise server OK'));

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

app.listen(PORT, () => console.log(`CarWise server on port ${PORT}`));
