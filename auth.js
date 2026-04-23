// CarWise Auth — Firebase Authentication + Firestore REST API
'use strict';

const CW_AUTH = (() => {
  const FIREBASE_API_KEY    = 'AIzaSyDB4c4rLcCPzT0tQaed7hwZZmDtjdQZZiI';
  const FIREBASE_PROJECT_ID = 'carwise-5372a';
  const SERVER_URL          = 'https://carwise-production-7434.up.railway.app';
  const FREE_SCAN_LIMIT     = 5;

  const _FB_AUTH  = `https://identitytoolkit.googleapis.com/v1/accounts`;
  const _FB_TOKEN = `https://securetoken.googleapis.com/v1/token`;
  const _FS_BASE  = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

  const _KEYS = ['cw_fb_id_token', 'cw_fb_refresh_token', 'cw_fb_uid', 'cw_fb_email', 'cw_fb_expires_at'];

  // ── Firestore helpers ────────────────────────────────────────────────────────

  function _encode(obj) {
    const fields = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string')       fields[k] = { stringValue: v };
      else if (typeof v === 'number')  fields[k] = { integerValue: String(v) };
      else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
      else if (v === null)             fields[k] = { nullValue: null };
    }
    return fields;
  }

  function _decode(fields = {}) {
    const obj = {};
    for (const [k, v] of Object.entries(fields)) {
      if ('stringValue'  in v) obj[k] = v.stringValue;
      else if ('integerValue' in v) obj[k] = Number(v.integerValue);
      else if ('booleanValue' in v) obj[k] = v.booleanValue;
      else if ('nullValue'    in v) obj[k] = null;
    }
    return obj;
  }

  async function _fsGet(uid, idToken) {
    const res = await fetch(`${_FS_BASE}/users/${uid}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (res.status === 404) return null;
    const doc = await res.json();
    return doc?.fields ? _decode(doc.fields) : null;
  }

  async function _fsUpdate(uid, idToken, obj) {
    const fields = _encode(obj);
    const mask   = Object.keys(fields).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
    await fetch(`${_FS_BASE}/users/${uid}?${mask}`, {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ fields }),
    });
  }

  async function _fsCreate(uid, idToken, obj) {
    await fetch(`${_FS_BASE}/users/${uid}`, {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ fields: _encode(obj), currentDocument: { exists: false } }),
    }).catch(() => {});
  }

  // ── Session storage ──────────────────────────────────────────────────────────

  async function _load() {
    return chrome.storage.local.get(_KEYS);
  }

  async function _save(data) {
    await chrome.storage.local.set({
      cw_fb_id_token:      data.idToken      || null,
      cw_fb_refresh_token: data.refreshToken || null,
      cw_fb_uid:           data.localId      || null,
      cw_fb_email:         data.email        || null,
      cw_fb_expires_at:    data.expiresIn ? Date.now() + Number(data.expiresIn) * 1000 : null,
    });
  }

  async function clearSession() {
    await chrome.storage.local.remove([..._KEYS, 'cw_profile']);
  }

  // ── Token refresh ────────────────────────────────────────────────────────────

  async function _refreshIfNeeded() {
    const s = await _load();
    if (!s.cw_fb_id_token) return null;
    if (s.cw_fb_expires_at && Date.now() < s.cw_fb_expires_at - 60_000) return s;

    const res = await fetch(`${_FB_TOKEN}?key=${FIREBASE_API_KEY}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `grant_type=refresh_token&refresh_token=${encodeURIComponent(s.cw_fb_refresh_token)}`,
    });
    const data = await res.json();
    if (!data.id_token) { await clearSession(); return null; }
    await chrome.storage.local.set({
      cw_fb_id_token:   data.id_token,
      cw_fb_refresh_token: data.refresh_token,
      cw_fb_expires_at: Date.now() + Number(data.expires_in) * 1000,
    });
    return chrome.storage.local.get(_KEYS);
  }

  // ── Auth ─────────────────────────────────────────────────────────────────────

  async function signUp(email, password) {
    const res = await fetch(`${_FB_AUTH}:signUp?key=${FIREBASE_API_KEY}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(_friendlyError(data));
    await fetch(`${_FB_AUTH}:sendOobCode?key=${FIREBASE_API_KEY}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken: data.idToken }),
    });
    throw Object.assign(new Error('Account created! Check your inbox to confirm your email, then sign in.'), { needsConfirmation: true });
  }

  async function signIn(email, password) {
    const res = await fetch(`${_FB_AUTH}:signInWithPassword?key=${FIREBASE_API_KEY}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(_friendlyError(data));
    if (!data.emailVerified) throw new Error('Please confirm your email address first — check your inbox.');
    await _save(data);
    await _ensureProfile(data.localId, data.idToken);
    return data;
  }

  async function signOut() {
    await clearSession();
  }

  async function getUser() {
    const s = await _refreshIfNeeded();
    if (!s?.cw_fb_id_token) return null;
    return { id: s.cw_fb_uid, email: s.cw_fb_email };
  }

  async function resetPassword(email) {
    const res = await fetch(`${_FB_AUTH}:sendOobCode?key=${FIREBASE_API_KEY}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
    });
    if (!res.ok) throw new Error('Reset failed');
  }

  // ── Profile ──────────────────────────────────────────────────────────────────

  async function getProfile(userId) {
    const cached = await chrome.storage.local.get('cw_profile');
    if (cached.cw_profile?.id === userId && cached.cw_profile?._ts > Date.now() - 60_000) {
      return cached.cw_profile;
    }
    const s = await _load();
    if (!s.cw_fb_id_token) return null;
    const profile = await _fsGet(userId, s.cw_fb_id_token);
    if (profile) {
      profile.id  = userId;
      profile._ts = Date.now();
      await chrome.storage.local.set({ cw_profile: profile });
    }
    return profile;
  }

  async function invalidateProfileCache() {
    await chrome.storage.local.remove('cw_profile');
  }

  async function _ensureProfile(uid, idToken) {
    const now   = new Date();
    const reset = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    await _fsCreate(uid, idToken, {
      plan:             'free',
      lookups_used:     0,
      lookups_reset_at: reset,
    });
  }

  // ── Scan gating ──────────────────────────────────────────────────────────────

  function canScan(profile) {
    if (!profile) return { ok: false, reason: 'auth' };
    if (profile.plan === 'pro') return { ok: true };
    const now  = new Date();
    const used = now >= new Date(profile.lookups_reset_at) ? 0 : (profile.lookups_used || 0);
    if (used >= FREE_SCAN_LIMIT) return { ok: false, reason: 'limit', used, limit: FREE_SCAN_LIMIT };
    return { ok: true, remaining: FREE_SCAN_LIMIT - used };
  }

  async function recordScan(userId) {
    await invalidateProfileCache();
    const profile = await getProfile(userId);
    if (!profile) return;
    const now     = new Date();
    const isReset = now >= new Date(profile.lookups_reset_at);
    const newUsed = isReset ? 1 : (profile.lookups_used || 0) + 1;
    const newReset = isReset
      ? new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
      : profile.lookups_reset_at;
    const s = await _load();
    await _fsUpdate(userId, s.cw_fb_id_token, { lookups_used: newUsed, lookups_reset_at: newReset });
    await invalidateProfileCache();
  }

  // ── Stripe checkout ──────────────────────────────────────────────────────────

  async function startCheckout(userId, email) {
    const res = await fetch(`${SERVER_URL}/checkout`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId, email }),
    });
    if (!res.ok) throw new Error('Could not start checkout');
    const { url } = await res.json();
    chrome.tabs.create({ url });
  }

  async function openPortal(userId) {
    const res = await fetch(`${SERVER_URL}/portal`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error('Could not open portal');
    const { url } = await res.json();
    chrome.tabs.create({ url });
  }

  // ── Error messages ───────────────────────────────────────────────────────────

  function _friendlyError(data) {
    const raw = String(data?.error?.message || data?.error || '').toLowerCase();
    if (raw.includes('email_exists'))       return 'An account with this email already exists. Sign in instead.';
    if (raw.includes('invalid_password') || raw.includes('invalid login credentials') || raw.includes('email not found'))
                                            return 'Incorrect email or password.';
    if (raw.includes('weak_password'))      return 'Password must be at least 6 characters.';
    if (raw.includes('invalid_email'))      return 'Please enter a valid email address.';
    if (raw.includes('too_many_attempts'))  return 'Too many attempts — wait a moment and try again.';
    return data?.error?.message || data?.error || 'Something went wrong. Please try again.';
  }

  return {
    signUp, signIn, signOut, getUser, resetPassword,
    getProfile, canScan, recordScan,
    startCheckout, openPortal,
    FREE_SCAN_LIMIT,
  };
})();
