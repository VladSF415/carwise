// CarWise Auth — JWT auth against the Railway server (Postgres/Prisma). No Firebase.
// Public surface is unchanged so popup.js needs no edits:
//   signUp, signIn, signOut, getUser, resetPassword,
//   getProfile, canScan, recordScan, startCheckout, openPortal, FREE_SCAN_LIMIT
'use strict';

const CW_AUTH = (() => {
  const SERVER_URL      = 'https://carwise-production-7434.up.railway.app';
  const FREE_SCAN_LIMIT = 5;

  // Storage keys kept identical to the old Firebase build (values are now JWTs):
  //   cw_fb_id_token      → access token (JWT)
  //   cw_fb_refresh_token → refresh token (opaque)
  //   cw_fb_uid           → user id
  //   cw_fb_email         → email
  //   cw_fb_expires_at    → epoch ms when the access token expires
  const _KEYS = ['cw_fb_id_token', 'cw_fb_refresh_token', 'cw_fb_uid', 'cw_fb_email', 'cw_fb_expires_at'];

  // ── HTTP helper ────────────────────────────────────────────────────────────────
  async function _api(path, { method = 'POST', body, token } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${SERVER_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try { data = await res.json(); } catch (_) { /* empty body */ }
    return { ok: res.ok, status: res.status, data };
  }

  // ── Session storage ──────────────────────────────────────────────────────────
  async function _load() {
    return chrome.storage.local.get(_KEYS);
  }

  async function _saveSession(d) {
    await chrome.storage.local.set({
      cw_fb_id_token:      d.access_token  || null,
      cw_fb_refresh_token: d.refresh_token || null,
      cw_fb_uid:           d.user_id       || null,
      cw_fb_email:         d.email         || null,
      cw_fb_expires_at:    d.expires_in ? Date.now() + Number(d.expires_in) * 1000 : null,
    });
  }

  async function clearSession() {
    await chrome.storage.local.remove([..._KEYS, 'cw_profile']);
  }

  // ── Token refresh ────────────────────────────────────────────────────────────
  // Returns a valid access token, refreshing if near expiry, or null if signed out.
  async function _validToken() {
    const s = await _load();
    if (!s.cw_fb_id_token) return null;
    if (s.cw_fb_expires_at && Date.now() < s.cw_fb_expires_at - 60_000) return s.cw_fb_id_token;
    if (!s.cw_fb_refresh_token) { await clearSession(); return null; }

    const { ok, data } = await _api('/auth/refresh', { body: { refresh_token: s.cw_fb_refresh_token } });
    if (!ok || !data.access_token) { await clearSession(); return null; }
    await _saveSession(data);
    return data.access_token;
  }

  // ── Auth ─────────────────────────────────────────────────────────────────────
  async function signUp(email, password) {
    const { ok, data } = await _api('/auth/signup', { body: { email, password } });
    if (!ok) throw new Error(_friendly(data));
    // Same UX as before: account created, must confirm email before signing in.
    throw Object.assign(
      new Error('Account created! Check your inbox to confirm your email, then sign in.'),
      { needsConfirmation: true }
    );
  }

  async function signIn(email, password) {
    const { ok, status, data } = await _api('/auth/signin', { body: { email, password } });
    if (!ok) {
      if (status === 403) throw new Error('Please confirm your email address first — check your inbox.');
      throw new Error(_friendly(data));
    }
    await _saveSession(data);
    return { id: data.user_id, email: data.email };
  }

  async function signOut() {
    const s = await _load();
    if (s.cw_fb_refresh_token) {
      await _api('/auth/signout', { body: { refresh_token: s.cw_fb_refresh_token } }).catch(() => {});
    }
    await clearSession();
  }

  async function getUser() {
    const token = await _validToken();
    if (!token) return null;
    const s = await _load();
    return { id: s.cw_fb_uid, email: s.cw_fb_email };
  }

  async function resetPassword(email) {
    // Never enumerates — server always returns success.
    await _api('/auth/request-reset', { body: { email } });
  }

  // ── Profile ──────────────────────────────────────────────────────────────────
  async function getProfile(userId) {
    const cached = await chrome.storage.local.get('cw_profile');
    if (cached.cw_profile?.id === userId && cached.cw_profile?._ts > Date.now() - 60_000) {
      return cached.cw_profile;
    }
    const token = await _validToken();
    if (!token) return null;
    const { ok, data } = await _api('/profile', { method: 'GET', token });
    if (!ok) return null;
    const profile = data;
    profile.id  = userId;
    profile._ts = Date.now();
    await chrome.storage.local.set({ cw_profile: profile });
    return profile;
  }

  async function invalidateProfileCache() {
    await chrome.storage.local.remove('cw_profile');
  }

  // ── Scan gating ──────────────────────────────────────────────────────────────
  function canScan(profile) {
    if (!profile) return { ok: false, reason: 'auth' };
    if (profile.plan === 'pro') return { ok: true };
    const now  = new Date();
    const used = (profile.lookups_reset_at && now < new Date(profile.lookups_reset_at))
      ? (profile.lookups_used || 0) : 0;
    if (used >= FREE_SCAN_LIMIT) return { ok: false, reason: 'limit', used, limit: FREE_SCAN_LIMIT };
    return { ok: true, remaining: FREE_SCAN_LIMIT - used };
  }

  async function recordScan(_userId) {
    const token = await _validToken();
    if (!token) return;
    // Server is authoritative for the cap and the monthly reset.
    await _api('/usage/increment', { token });
    await invalidateProfileCache();
  }

  // ── Stripe checkout ──────────────────────────────────────────────────────────
  async function startCheckout(_userId, _email) {
    const token = await _validToken();
    if (!token) throw new Error('Please sign in first.');
    const { ok, data } = await _api('/checkout', { token });
    if (!ok || !data.url) throw new Error('Could not start checkout');
    chrome.tabs.create({ url: data.url });
  }

  async function openPortal(_userId) {
    const token = await _validToken();
    if (!token) throw new Error('Please sign in first.');
    const { ok, data } = await _api('/portal', { token });
    if (!ok || !data.url) throw new Error('Could not open portal');
    chrome.tabs.create({ url: data.url });
  }

  // ── Error messages ───────────────────────────────────────────────────────────
  function _friendly(data) {
    const raw = String(data?.error || '').toLowerCase();
    if (raw.includes('already exists'))                    return 'An account with this email already exists. Sign in instead.';
    if (raw.includes('incorrect email or password'))       return 'Incorrect email or password.';
    if (raw.includes('at least 6'))                        return 'Password must be at least 6 characters.';
    if (raw.includes('verify your email') || raw.includes('confirm your email'))
                                                           return 'Please confirm your email address first — check your inbox.';
    return data?.error || 'Something went wrong. Please try again.';
  }

  return {
    signUp, signIn, signOut, getUser, resetPassword,
    getProfile, canScan, recordScan,
    startCheckout, openPortal,
    FREE_SCAN_LIMIT,
  };
})();
