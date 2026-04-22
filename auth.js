// CarWise Auth — Supabase REST API wrapper
// No npm / bundler needed — pure fetch calls
'use strict';

const CW_AUTH = (() => {
  const SUPABASE_URL      = 'https://vkhuywygxohpseysopgw.supabase.co';
  const SERVER_URL        = 'https://carwise-production-7434.up.railway.app';
  // ↓ Replace with anon (public) key: Supabase Dashboard → Settings → API → Project API keys → anon public
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZraHV5d3lneG9ocHNleXNvcGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzczNDIsImV4cCI6MjA5MTg1MzM0Mn0.Oof2awJ6S39m2YUWSWoOPUC-JHYL8hqoNihpR6BLaxQ';
  const FREE_SCAN_LIMIT   = 5;

  // ── Session ─────────────────────────────────────────────────────────────────
  async function getSession() {
    const r = await chrome.storage.local.get('cw_session');
    return r.cw_session || null;
  }
  async function saveSession(s) { await chrome.storage.local.set({ cw_session: s }); }
  async function clearSession() { await chrome.storage.local.remove(['cw_session', 'cw_profile']); }

  // ── Token refresh ────────────────────────────────────────────────────────────
  async function refreshIfNeeded() {
    const s = await getSession();
    if (!s) return null;
    if (Date.now() / 1000 < (s.expires_at || 0) - 60) return s;
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    });
    if (!res.ok) { await clearSession(); return null; }
    const fresh = await res.json();
    await saveSession(fresh);
    return fresh;
  }

  async function authHeaders() {
    const s = await refreshIfNeeded();
    return s
      ? { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' }
      : { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  }

  // ── Auth ─────────────────────────────────────────────────────────────────────
  async function signUp(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || data.error_description || 'Sign up failed');
    if (data.session) await saveSession(data.session);
    return data;
  }

  async function signIn(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || 'Invalid email or password');
    await saveSession(data);
    return data;
  }

  async function signOut() {
    const s = await getSession();
    if (s?.access_token) {
      fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${s.access_token}` },
      }).catch(() => {});
    }
    await clearSession();
  }

  async function getUser() {
    const s = await refreshIfNeeded();
    if (!s) return null;
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: await authHeaders() });
    if (!res.ok) return null;
    return res.json();
  }

  async function resetPassword(email) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error('Reset failed');
  }

  // ── Profile ──────────────────────────────────────────────────────────────────
  async function getProfile(userId) {
    const cached = await chrome.storage.local.get('cw_profile');
    if (cached.cw_profile?.id === userId && cached.cw_profile?._ts > Date.now() - 60_000) {
      return cached.cw_profile;
    }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`, {
      headers: await authHeaders(),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    const profile = rows[0] || null;
    if (profile) {
      profile._ts = Date.now();
      await chrome.storage.local.set({ cw_profile: profile });
    }
    return profile;
  }

  async function invalidateProfileCache() {
    await chrome.storage.local.remove('cw_profile');
  }

  // ── Scan gating ──────────────────────────────────────────────────────────────
  function canScan(profile) {
    if (!profile) return { ok: false, reason: 'auth' };
    if (profile.plan === 'pro') return { ok: true };
    const now = new Date();
    const used = now >= new Date(profile.lookups_reset_at) ? 0 : (profile.lookups_used || 0);
    if (used >= FREE_SCAN_LIMIT) return { ok: false, reason: 'limit', used, limit: FREE_SCAN_LIMIT };
    return { ok: true, remaining: FREE_SCAN_LIMIT - used };
  }

  async function recordScan(userId) {
    await invalidateProfileCache();
    const profile = await getProfile(userId);
    if (!profile) return;
    const now = new Date();
    const isReset = now >= new Date(profile.lookups_reset_at);
    const newUsed = isReset ? 1 : (profile.lookups_used || 0) + 1;
    const newReset = isReset
      ? new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
      : profile.lookups_reset_at;
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: { ...(await authHeaders()), Prefer: 'return=minimal' },
      body: JSON.stringify({ lookups_used: newUsed, lookups_reset_at: newReset }),
    });
    await invalidateProfileCache();
  }

  // ── Stripe checkout ──────────────────────────────────────────────────────────
  async function startCheckout(userId, email) {
    const res = await fetch(`${SERVER_URL}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email }),
    });
    if (!res.ok) throw new Error('Could not start checkout');
    const { url } = await res.json();
    chrome.tabs.create({ url });
  }

  async function openPortal(userId) {
    const res = await fetch(`${SERVER_URL}/portal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error('Could not open portal');
    const { url } = await res.json();
    chrome.tabs.create({ url });
  }

  return {
    signUp, signIn, signOut, getUser, resetPassword,
    getProfile, canScan, recordScan,
    startCheckout, openPortal,
    FREE_SCAN_LIMIT,
  };
})();
