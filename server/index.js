// CarWise server — Railway (Node.js + Express)
// Handles Stripe checkout, customer portal, and webhook
'use strict';

const express = require('express');
const Stripe   = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const app = express();

console.log('Env check — SUPABASE_URL:',              process.env.SUPABASE_URL              ? 'SET' : 'MISSING');
console.log('Env check — SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');
console.log('Env check — STRIPE_SECRET_KEY:',         process.env.STRIPE_SECRET_KEY         ? 'SET' : 'MISSING');
console.log('Env check — STRIPE_PRICE_ID:',           process.env.STRIPE_PRICE_ID           ? 'SET' : 'MISSING');
console.log('Env check — STRIPE_WEBHOOK_SECRET:',     process.env.STRIPE_WEBHOOK_SECRET     ? 'SET' : 'MISSING');

function getStripe()   { return Stripe(process.env.STRIPE_SECRET_KEY); }
function getSupabase() { return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); }

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

// Stripe webhook needs raw body; all other routes use JSON
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.send('CarWise server OK'));

// ── Create Stripe checkout session ────────────────────────────────────────────
app.post('/checkout', async (req, res) => {
  const { userId, email } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const supabase = getSupabase();
    const stripe   = getStripe();

    const { data: profile } = await supabase
      .from('profiles').select('stripe_customer_id').eq('id', userId).single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { supabase_uid: userId } });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${FRONTEND_URL}/success`,
      cancel_url:  `${FRONTEND_URL}/cancel`,
      subscription_data: { metadata: { supabase_uid: userId } },
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
    const supabase = getSupabase();
    const stripe   = getStripe();

    const { data: profile } = await supabase
      .from('profiles').select('stripe_customer_id').eq('id', userId).single();

    if (!profile?.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found.' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   profile.stripe_customer_id,
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
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const supabase = getSupabase();

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId  = session.metadata?.supabase_uid;
      if (userId) {
        await supabase.from('profiles').update({
          plan: 'pro',
          stripe_customer_id:       session.customer,
          stripe_subscription_id:   session.subscription,
        }).eq('id', userId);
        console.log(`Upgraded user ${userId} to pro`);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const { data: profiles } = await supabase
        .from('profiles').select('id').eq('stripe_customer_id', sub.customer);
      for (const p of (profiles || [])) {
        await supabase.from('profiles').update({
          plan: 'free',
          stripe_subscription_id: null,
        }).eq('id', p.id);
        console.log(`Downgraded user ${p.id} to free`);
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const sub     = event.data.object;
      const priceId = sub.items?.data?.[0]?.price?.id;
      const plan    = priceId === process.env.STRIPE_PRICE_ID ? 'pro' : 'free';
      if (sub.customer) {
        const { data: profiles } = await supabase
          .from('profiles').select('id').eq('stripe_customer_id', sub.customer);
        for (const p of (profiles || [])) {
          await supabase.from('profiles').update({ plan }).eq('id', p.id);
          console.log(`Updated user ${p.id} to ${plan} via subscription.updated`);
        }
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
app.get('/success', (req, res) => {
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

app.get('/cancel', (req, res) => {
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
