import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe    = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const supabase  = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
// Set in Supabase Dashboard → Edge Functions → Secrets
// Create a product + price at $19.99/month in Stripe Dashboard, paste the price_xxx ID here:
const PRICE_ID  = Deno.env.get('STRIPE_PRICE_ID')!;
const SUCCESS_URL = 'https://carwise.app/success'; // replace with your hosted success page
const CANCEL_URL  = 'https://carwise.app/upgrade';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const { userId, email } = await req.json();
    if (!userId) throw new Error('userId required');

    // Get or create Stripe customer
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
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
      subscription_data: { metadata: { supabase_uid: userId } },
      allow_promotion_codes: true,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
