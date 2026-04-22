// CarWise Popup JS
'use strict';

// ── Tab navigation ─────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    // Sync VIN data into whichever tab was just opened
    if (btn.dataset.tab === 'price' || btn.dataset.tab === 'finance') {
      prefillFromVehicle();
    }
    if (btn.dataset.tab === 'addons') {
      renderFniContext();
    }
  });
});

// ── Utility helpers ────────────────────────────────────────────────────────────
const fmt = n => n != null ? '$' + Math.round(n).toLocaleString() : '—';
const pct = n => n != null ? (n * 100).toFixed(1) + '%' : '—';
const show = id => document.getElementById(id).classList.remove('hidden');
const hide = id => document.getElementById(id).classList.add('hidden');
const set  = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
function isHidden(id) { return document.getElementById(id).classList.contains('hidden'); }

// ── Shared vehicle state (set after VIN lookup, read by other tabs) ────────────
const cwState = { vinData: null, price: null, mileage: null, history: null, historySource: null, recalls: [], complaints: [], tsbs: [], fuelEconomy: null, valuation: null };

// Map NHTSA make name → our dropdown value
const MAKE_MAP = {
  HONDA: 'honda', ACURA: 'honda',
  TOYOTA: 'toyota', LEXUS: 'toyota',
  NISSAN: 'nissan', INFINITI: 'nissan',
  HYUNDAI: 'hyundai', KIA: 'hyundai', GENESIS: 'hyundai',
  SUBARU: 'subaru', MAZDA: 'mazda',
  VOLKSWAGEN: 'vw', VW: 'vw', AUDI: 'vw',
  BMW: 'bmw', MINI: 'bmw',
  'MERCEDES-BENZ': 'mercedes', MERCEDES: 'mercedes',
  TESLA: 'tesla',
  FORD: 'domestic', CHEVROLET: 'domestic', GMC: 'domestic',
  RAM: 'domestic', DODGE: 'domestic', CHRYSLER: 'domestic',
  JEEP: 'domestic', BUICK: 'domestic',
  CADILLAC: 'luxury', LINCOLN: 'luxury', VOLVO: 'luxury',
  'LAND ROVER': 'luxury', LANDROVER: 'luxury',
};

// Normalize make+model into a MODEL_MSRP lookup key.
// NHTSA returns e.g. "MERCEDES-BENZ" / "C-CLASS", "FORD" / "F-150", "BMW" / "3 SERIES".
function getModelKey(make, model) {
  const norm = s => (s || '').toLowerCase().replace(/[\s\-\/\.]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return `${norm(make)}_${norm(model)}`;
}

function prefillFromVehicle() {
  const v = cwState.vinData;
  if (!v) return;

  const makeKey = MAKE_MAP[v.make.toUpperCase()] || '';
  const currentYear = new Date().getFullYear();
  const vehicleYear = parseInt(v.year) || currentYear;
  const isUsed = vehicleYear < currentYear;
  const vehicleLabel = `${v.year} ${v.make} ${v.model}${v.trim ? ' ' + v.trim : ''}`;

  // Compute estimated values from VIN data (used as fallback when no listing price was scraped)
  const bodyClass   = getBodyClass(v.bodyType);
  const modelEntry  = window.CW.MODEL_MSRP && window.CW.MODEL_MSRP[getModelKey(v.make, v.model)];
  const deprMakeKey = modelEntry ? modelEntry.makeKey : makeKey;
  const msrp2024    = modelEntry ? modelEntry.msrp : (window.CW.BASE_MSRP[makeKey] || window.CW.BASE_MSRP[''])[bodyClass] || 30000;
  const ageYears    = Math.max(0, currentYear - vehicleYear);
  const estMsrp     = Math.round(msrp2024 / Math.pow(1.025, 2024 - vehicleYear) / 500) * 500;
  const deprFrac    = getMakeDepreciation(deprMakeKey, ageYears);
  const estPrivate  = Math.round(estMsrp * (1 - deprFrac) / 100) * 100; // avg mileage, good condition

  // ── Price tab ──
  const priceMake   = document.getElementById('price-make');
  const priceType   = document.getElementById('price-type');
  const priceAsking = document.getElementById('price-asking');
  const priceMsrp   = document.getElementById('price-msrp');
  if (priceMake)  priceMake.value = makeKey;
  if (priceType)  priceType.value = isUsed ? 'used' : 'new';
  if (priceAsking && cwState.price && !priceAsking.value) priceAsking.value = cwState.price;
  // New cars: fill with estimated original MSRP. Used cars: fill with current market value.
  if (priceMsrp && !priceMsrp.value) {
    priceMsrp.value = isUsed ? estPrivate : estMsrp;
  }
  updatePriceTabMode(isUsed);
  showVehicleContext('price-vehicle-context', vehicleLabel);

  // ── Finance tab ──
  const loanPrice  = document.getElementById('loan-price');
  const cmpPrice   = document.getElementById('cmp-price');
  const priceToUse = cwState.price || estPrivate; // scraped price, or estimated private party
  if (loanPrice && !loanPrice.value) loanPrice.value = priceToUse;
  if (cmpPrice  && !cmpPrice.value)  cmpPrice.value  = priceToUse;
  showVehicleContext('finance-vehicle-context', vehicleLabel);
}

function prefillEstimatedMsrp(vinData) {
  if (!vinData || !vinData.year) return;
  const msrpInput = document.getElementById('val-msrp');
  if (!msrpInput || msrpInput.value) return; // don't overwrite if user already typed

  const makeKey     = getMakeKey(vinData.make);
  const bodyClass   = getBodyClass(vinData.bodyType);
  const vehicleYear = parseInt(vinData.year) || new Date().getFullYear();
  const modelEntry  = window.CW.MODEL_MSRP && window.CW.MODEL_MSRP[getModelKey(vinData.make, vinData.model)];
  const msrp2024    = modelEntry ? modelEntry.msrp : (window.CW.BASE_MSRP[makeKey] || window.CW.BASE_MSRP[''])[bodyClass] || 30000;
  const deflated    = msrp2024 / Math.pow(1.025, 2024 - vehicleYear);
  const estimated   = Math.round(deflated / 500) * 500;

  // Range: base trims are ~85% of mid, top trims are ~120%
  const lo = Math.round(deflated * 0.85 / 500) * 500;
  const hi = Math.round(deflated * 1.25 / 500) * 500;

  msrpInput.value = estimated;

  // Show warning with range to communicate uncertainty
  const warn = document.getElementById('val-msrp-warning');
  if (warn) {
    warn.innerHTML = `Segment average estimate — actual MSRP likely between <strong>$${lo.toLocaleString()}</strong> and <strong>$${hi.toLocaleString()}</strong> depending on trim. Look up the exact figure on <a href="https://www.edmunds.com" target="_blank">Edmunds</a> for accuracy.`;
    warn.classList.remove('hidden');
  }
}

function prefillMileage() {
  if (!cwState.mileage) return;
  const el = document.getElementById('val-mileage');
  if (el && !el.value) el.value = cwState.mileage;
}

function renderListingHistory() {
  const h = cwState.history;
  const card = document.getElementById('listing-history-card');
  const badgesEl = document.getElementById('history-badges');
  if (!h || !card || !badgesEl) return;

  badgesEl.innerHTML = '';
  const src = cwState.historySource || 'listing page';
  document.getElementById('history-source-label').textContent = `from ${src}`;

  function badge(icon, text, style) {
    const el = document.createElement('div');
    el.className = `hbadge hbadge-${style}`;
    el.innerHTML = `<span>${icon}</span><span>${escHtml(text)}</span>`;
    badgesEl.appendChild(el);
  }

  // Price rating
  if (h.priceRating) {
    const style = h.priceRating.includes('Good') || h.priceRating.includes('Great') ? 'green' : h.priceRating.includes('High') ? 'red' : 'yellow';
    badge('💰', h.priceRating, style);
  }

  // Owners
  if (h.owners != null) {
    const style = h.owners === 1 ? 'green' : h.owners <= 2 ? 'gray' : 'yellow';
    badge('👤', h.owners === 1 ? '1 Owner' : `${h.owners} Owners`, style);
  }

  // Accidents
  if (h.accidents != null) {
    if (h.accidents === 0) badge('✅', 'No Accidents', 'green');
    else badge('⚠️', `${h.accidents} Accident${h.accidents > 1 ? 's' : ''}`, 'red');
  }

  // Damage
  if (h.damage) {
    if (h.damage === 'none') badge('✅', 'No Damage Reported', 'green');
    else if (h.damage === 'minor') badge('⚠️', 'Minor Damage', 'yellow');
    else badge('🚨', 'Major Damage', 'red');
  }

  // Title status
  if (h.title) {
    const style = h.title === 'Clean Title' ? 'green' : 'red';
    badge('📋', h.title, style);
  }

  // Usage
  if (h.usage) {
    const style = h.usage === 'Personal Use' ? 'green' : h.usage.includes('Rental') || h.usage.includes('Fleet') ? 'yellow' : 'gray';
    badge('🚗', h.usage, style);
  }

  // Service records
  if (h.serviceRecords != null) {
    const text = typeof h.serviceRecords === 'number' ? `${h.serviceRecords} Service Records` : 'Service History';
    badge('🔧', text, 'blue');
  }

  // Open recalls from listing
  if (h.openRecalls != null) {
    if (h.openRecalls === 0) badge('✅', 'No Open Recalls', 'green');
    else badge('🔴', `${h.openRecalls} Open Recall${h.openRecalls > 1 ? 's' : ''}`, 'red');
  }

  // Frame / structural damage
  if (h.frameDamage === true)  badge('🚨', 'Frame Damage Reported', 'red');
  else if (h.frameDamage === false) badge('✅', 'No Frame Damage', 'green');

  // Airbag deployment
  if (h.airbagDeployed === true)  badge('🚨', 'Airbag Deployed', 'red');
  else if (h.airbagDeployed === false) badge('✅', 'No Airbag Deployment', 'green');

  // Total loss
  if (h.totalLoss === true)  badge('🛑', 'Total Loss on Record', 'red');
  else if (h.totalLoss === false) badge('✅', 'No Total Loss', 'green');

  // Buyback guarantee
  if (h.buybackGuarantee) badge('🛡️', 'CARFAX Buyback Guarantee', 'green');

  // Days on market
  if (h.daysOnMarket != null) {
    if (h.daysOnMarket > 90) badge('📅', `${h.daysOnMarket} Days on Market`, 'green'); // motivated seller
    else if (h.daysOnMarket > 30) badge('📅', `${h.daysOnMarket} Days on Market`, 'yellow');
    else badge('📅', `Listed ${h.daysOnMarket} Days Ago`, 'gray');
  }

  // Deal rating (CarGurus / Cars.com)
  if (h.dealRating) {
    const style = h.dealRating.includes('Great') || h.dealRating.includes('Good') ? 'green'
                : h.dealRating.includes('Fair') ? 'gray'
                : 'red';
    badge('🏷️', h.dealRating, style);
  }

  if (badgesEl.children.length > 0) card.classList.remove('hidden');
}

function showVehicleContext(elId, label) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = `Using VIN data: ${label}`;
  el.classList.remove('hidden');
}

// ════════════════════════════════════════════════════════════════════════════════
// AUTH + ONBOARDING + PAYWALL
// ════════════════════════════════════════════════════════════════════════════════

let cwUser    = null;
let cwProfile = null;

// ── Onboarding ────────────────────────────────────────────────────────────────
(async () => {
  const r = await chrome.storage.local.get('cw_onboarded');
  if (!r.cw_onboarded) showOnboarding();
})();

function showOnboarding() {
  document.getElementById('onboarding-overlay').classList.remove('hidden');
}

function hideOnboarding() {
  document.getElementById('onboarding-overlay').classList.add('hidden');
  chrome.storage.local.set({ cw_onboarded: true });
}

let obStep = 0;
const OB_TOTAL = 5;

function renderObStep(step) {
  document.querySelectorAll('.onboarding-step').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.step) === step);
  });
  document.querySelectorAll('.ob-dot').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.dot) === step);
  });
  const isLast = step === OB_TOTAL - 1;
  document.getElementById('ob-prev').classList.toggle('hidden', step === 0);
  document.getElementById('ob-next').classList.toggle('hidden', isLast);
  document.getElementById('ob-finish').classList.toggle('hidden', !isLast);
}

document.getElementById('ob-next').addEventListener('click', () => {
  obStep = Math.min(obStep + 1, OB_TOTAL - 1);
  renderObStep(obStep);
});
document.getElementById('ob-prev').addEventListener('click', () => {
  obStep = Math.max(obStep - 1, 0);
  renderObStep(obStep);
});
document.getElementById('ob-finish').addEventListener('click', () => {
  hideOnboarding();
  showAuthModal();
});
document.getElementById('ob-skip').addEventListener('click', hideOnboarding);

// ── Auth modal ────────────────────────────────────────────────────────────────
function showAuthModal() {
  document.getElementById('auth-modal').classList.remove('hidden');
  document.getElementById('auth-error').classList.add('hidden');
  document.getElementById('auth-success').classList.add('hidden');
}
function hideAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}

document.getElementById('auth-close').addEventListener('click', hideAuthModal);

document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const which = tab.dataset.auth;
    document.getElementById('auth-signin').classList.toggle('hidden', which !== 'signin');
    document.getElementById('auth-signup').classList.toggle('hidden', which !== 'signup');
    document.getElementById('auth-error').classList.add('hidden');
  });
});

function setAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}
function setAuthSuccess(msg) {
  const el = document.getElementById('auth-success');
  el.textContent = msg;
  el.classList.remove('hidden');
}

document.getElementById('btn-signin').addEventListener('click', async () => {
  const email = document.getElementById('si-email').value.trim();
  const pass  = document.getElementById('si-pass').value;
  if (!email || !pass) { setAuthError('Enter your email and password.'); return; }
  const btn = document.getElementById('btn-signin');
  btn.textContent = 'Signing in…'; btn.disabled = true;
  try {
    await CW_AUTH.signIn(email, pass);
    hideAuthModal();
    await initAuthState();
  } catch (e) {
    setAuthError(e.message);
  } finally {
    btn.textContent = 'Sign In'; btn.disabled = false;
  }
});

document.getElementById('btn-signup').addEventListener('click', async () => {
  const email = document.getElementById('su-email').value.trim();
  const pass  = document.getElementById('su-pass').value;
  if (!email || pass.length < 8) { setAuthError('Enter a valid email and a password of at least 8 characters.'); return; }
  const btn = document.getElementById('btn-signup');
  btn.textContent = 'Creating account…'; btn.disabled = true;
  try {
    await CW_AUTH.signUp(email, pass);
    hideAuthModal();
    await initAuthState();
  } catch (e) {
    setAuthError(e.message);
  } finally {
    btn.textContent = 'Create Free Account'; btn.disabled = false;
  }
});

document.getElementById('btn-forgot').addEventListener('click', async () => {
  const email = document.getElementById('si-email').value.trim();
  if (!email) { setAuthError('Enter your email first.'); return; }
  try {
    await CW_AUTH.resetPassword(email);
    setAuthSuccess('Check your email for a reset link.');
  } catch (e) {
    setAuthError(e.message);
  }
});

// ── Paywall modal ─────────────────────────────────────────────────────────────
function showPaywall() {
  document.getElementById('paywall-modal').classList.remove('hidden');
}
function hidePaywall() {
  document.getElementById('paywall-modal').classList.add('hidden');
}

document.getElementById('btn-paywall-close').addEventListener('click', hidePaywall);
document.getElementById('btn-upgrade').addEventListener('click', async () => {
  if (!cwUser) { hidePaywall(); showAuthModal(); return; }
  try { await CW_AUTH.startCheckout(cwUser.id, cwUser.email); }
  catch (e) { alert(e.message); }
});

// ── User bar ──────────────────────────────────────────────────────────────────
function updateUserBar() {
  const bar = document.getElementById('user-bar');
  if (!cwUser || !cwProfile) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');

  const badge = document.getElementById('user-plan-badge');
  badge.textContent = cwProfile.plan === 'pro' ? 'PRO' : 'FREE';
  badge.className   = `plan-badge ${cwProfile.plan === 'pro' ? 'plan-pro' : 'plan-free'}`;

  const scansEl = document.getElementById('user-scans-left');
  if (cwProfile.plan === 'pro') {
    scansEl.textContent = 'Unlimited';
  } else {
    const now = new Date();
    const used = now >= new Date(cwProfile.lookups_reset_at) ? 0 : (cwProfile.lookups_used || 0);
    const left = Math.max(0, CW_AUTH.FREE_SCAN_LIMIT - used);
    scansEl.textContent = `${left} scan${left !== 1 ? 's' : ''} left`;
  }

  document.getElementById('user-email-display').textContent = cwUser.email;
  const manageBtn = document.getElementById('btn-manage-sub');
  manageBtn.classList.toggle('hidden', cwProfile.plan !== 'pro');
}

document.getElementById('btn-user-menu').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('user-dropdown').classList.toggle('hidden');
});
document.addEventListener('click', () => {
  document.getElementById('user-dropdown').classList.add('hidden');
});

document.getElementById('btn-signout').addEventListener('click', async () => {
  await CW_AUTH.signOut();
  cwUser = null; cwProfile = null;
  updateUserBar();
});

document.getElementById('btn-manage-sub').addEventListener('click', async () => {
  if (!cwUser) return;
  try { await CW_AUTH.openPortal(cwUser.id); }
  catch (e) { alert(e.message); }
});

// ── Init auth state ───────────────────────────────────────────────────────────
async function initAuthState() {
  try {
    cwUser    = await CW_AUTH.getUser();
    cwProfile = cwUser ? await CW_AUTH.getProfile(cwUser.id) : null;
  } catch (_) {
    cwUser = null; cwProfile = null;
  }
  updateUserBar();
}

initAuthState();

// ════════════════════════════════════════════════════════════════════════════════
// VIN TAB
// ════════════════════════════════════════════════════════════════════════════════
const vinInput   = document.getElementById('vin-input');
const btnLookup  = document.getElementById('btn-vin-lookup');
const detectRow  = document.getElementById('auto-detect-row');
const detectLbl  = document.getElementById('auto-detect-label');
const btnUseDet  = document.getElementById('btn-use-detected');

let detectedVIN = null;

async function scanCurrentPage() {
  const btnRescan = document.getElementById('btn-rescan');
  if (btnRescan) { btnRescan.textContent = '…'; btnRescan.disabled = true; }
  detectRow.classList.add('hidden');
  detectedVIN = null;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    // Inject content script if not already present (handles freshly navigated tabs)
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    } catch (_) { /* already injected — that's fine */ }

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_PAGE_DATA' });
    if (response && response.vin) {
      detectedVIN = response.vin;
      let label = `VIN detected on ${response.source || 'this page'}: ${response.vin}`;
      if (response.mileage) label += ` · ${response.mileage.toLocaleString()} mi`;
      detectLbl.textContent = label;
      detectRow.classList.remove('hidden');
      if (response.price)   cwState.price         = response.price;
      if (response.mileage) cwState.mileage       = response.mileage;
      if (response.history) cwState.history       = response.history;
      if (response.source)  cwState.historySource = response.source;
    } else if (btnRescan) {
      btnRescan.textContent = '✕';
      setTimeout(() => { btnRescan.textContent = '↺'; }, 1500);
    }
  } catch (_) {
    if (btnRescan) {
      btnRescan.textContent = '✕';
      setTimeout(() => { btnRescan.textContent = '↺'; }, 1500);
    }
  } finally {
    if (btnRescan) btnRescan.disabled = false;
  }
}

// Auto-scan on panel open
scanCurrentPage();

document.getElementById('btn-rescan').addEventListener('click', scanCurrentPage);

btnUseDet.addEventListener('click', () => {
  if (detectedVIN) {
    vinInput.value = detectedVIN;
    guardedVINLookup(detectedVIN);
  }
});

btnLookup.addEventListener('click', () => {
  const vin = vinInput.value.trim().toUpperCase();
  if (vin.length !== 17) { showVINError('VIN must be exactly 17 characters.'); return; }
  guardedVINLookup(vin);
});

async function guardedVINLookup(vin) {
  // Refresh auth state before every lookup
  await initAuthState();

  if (!cwUser) {
    showAuthModal();
    return;
  }

  const check = CW_AUTH.canScan(cwProfile);
  if (!check.ok) {
    if (check.reason === 'limit') { showPaywall(); return; }
    showAuthModal();
    return;
  }

  // Proceed with scan — record usage after success
  doVINLookup(vin, async () => {
    await CW_AUTH.recordScan(cwUser.id);
    await initAuthState(); // refresh scan counter in user bar
  });
}

vinInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') btnLookup.click();
});

function showVINError(msg) {
  hide('vin-loading');
  hide('vin-results');
  show('vin-error');
  document.getElementById('vin-error-text').textContent = msg;
}

function doVINLookup(vin, onSuccess) {
  hide('vin-error');
  hide('vin-results');
  show('vin-loading');

  chrome.runtime.sendMessage({ action: 'LOOKUP_VIN', vin }, response => {
    hide('vin-loading');
    if (!response || !response.ok) {
      showVINError(response?.error || 'Failed to look up VIN. Check your connection.');
      return;
    }
    cwState.vinData     = response.vinData;
    cwState.recalls     = response.recalls     || [];
    cwState.complaints  = response.complaints  || [];
    cwState.tsbs        = response.tsbs        || [];
    cwState.fuelEconomy = response.fuelEconomy || null;
    prefillFromVehicle();
    prefillEstimatedMsrp(response.vinData);
    prefillMileage();
    renderListingHistory();
    renderVINResults(response);
    renderTSBs(response.tsbs);
    // Initial buy score (financial TBD until valuation runs)
    const initScore = computeBuyScore(null, null);
    renderBuyAnalysis(initScore);
    // Update F&I tab with vehicle-specific warranty context
    renderFniContext();
    // Auto-run valuation if mileage was scraped from the listing page
    if (cwState.mileage) {
      const mileageEl = document.getElementById('val-mileage');
      if (mileageEl && mileageEl.value) {
        const autoResult = computeValuation(response.vinData, cwState.mileage, 'good', parseFloat(document.getElementById('val-msrp').value) || 0);
        renderValuation(autoResult, cwState.mileage);
      }
    }
    // Record scan usage after successful lookup
    if (typeof onSuccess === 'function') onSuccess();
  });
}

function renderVINResults({ vinData, safety, recalls, complaints }) {
  show('vin-results');

  const currentYear = new Date().getFullYear();
  const vehicleYear = parseInt(vinData.year) || currentYear;
  const ageYears    = currentYear - vehicleYear;
  const isNew       = ageYears <= 1;

  // Title
  const trimStr = vinData.trim ? ` ${vinData.trim}` : '';
  set('vin-title', `${vinData.year} ${vinData.make} ${vinData.model}${trimStr}`);

  // Badges
  const recallCount = recalls ? recalls.length : 0;
  const statusBadge = document.getElementById('vin-badge-status');
  if (recallCount === 0) {
    statusBadge.textContent = 'No Open Recalls';
    statusBadge.className = 'badge badge-green';
  } else if (recallCount <= 2) {
    statusBadge.textContent = `${recallCount} Recall${recallCount > 1 ? 's' : ''}`;
    statusBadge.className = 'badge badge-yellow';
  } else {
    statusBadge.textContent = `${recallCount} Recalls`;
    statusBadge.className = 'badge badge-red';
  }

  // NEW / USED age badge
  const ageBadgeEl = document.getElementById('vin-badge-year');
  if (isNew) {
    ageBadgeEl.textContent = `${vinData.year} · NEW`;
    ageBadgeEl.className = 'badge badge-blue';
  } else {
    ageBadgeEl.textContent = `${vinData.year} · ${ageYears}yr old`;
    ageBadgeEl.className = 'badge badge-gray';
  }
  set('vin-badge-type', vinData.bodyType || vinData.fuelType || '');

  // New vs used: toggle valuation sections
  const newPanel  = document.getElementById('new-car-pricing');
  const usedPanel = document.getElementById('used-car-pricing');
  const valTitle  = document.getElementById('val-section-title');
  if (isNew) {
    newPanel.classList.remove('hidden');
    usedPanel.classList.add('hidden');
    valTitle.textContent = 'New Car Price Analysis';
    // Render new-car inline breakdown
    const makeKey  = getMakeKey(vinData.make);
    const bodyClass = getBodyClass(vinData.bodyType);
    const msrp2024 = (window.CW.BASE_MSRP[makeKey] || window.CW.BASE_MSRP[''])[bodyClass] || 30000;
    const invoiceDisc = window.CW.INVOICE_DISCOUNT[makeKey] || 0.04;
    const invoice  = msrp2024 * (1 - invoiceDisc);
    const holdback = msrp2024 * ((window.CW.HOLDBACKS[makeKey] || window.CW.HOLDBACKS['']).pct);
    const trueCost = invoice - holdback;
    const asking   = cwState.price || 0;
    let html = `
      <div class="val-bk-row"><span class="val-bk-label">Est. MSRP (current trim)</span><span class="val-bk-val">${fmt(msrp2024)}</span></div>
      <div class="val-bk-row"><span class="val-bk-label">Est. Invoice price</span><span class="val-bk-val">${fmt(Math.round(invoice))}</span></div>
      <div class="val-bk-row"><span class="val-bk-label">Est. Dealer holdback</span><span class="val-bk-val">${fmt(Math.round(holdback))}</span></div>
      <div class="val-bk-row val-bk-row-total"><span class="val-bk-label">Est. True dealer cost</span><span class="val-bk-val">${fmt(Math.round(trueCost))}</span></div>`;
    if (asking > 0) {
      const adm = asking - msrp2024;
      const admStr = adm > 500 ? `<span style="color:#dc2626">+${fmt(adm)} ADM above MSRP</span>` : adm < -500 ? `<span style="color:#16a34a">${fmt(Math.abs(adm))} below MSRP</span>` : `<span style="color:#374151">At MSRP</span>`;
      html += `<div class="val-bk-row"><span class="val-bk-label">Asking vs MSRP</span><span class="val-bk-val">${admStr}</span></div>`;
    }
    document.getElementById('new-car-breakdown').innerHTML = html;
  } else {
    newPanel.classList.add('hidden');
    usedPanel.classList.remove('hidden');
    valTitle.textContent = 'Used Car Market Value';
  }

  // Specs
  set('spec-engine',  vinData.engine  || '—');
  set('spec-drive',   vinData.drive   || '—');
  set('spec-trans',   vinData.transmission || '—');
  set('spec-doors',   vinData.doors   || '—');

  // Fuel economy (from EPA API, stored in cwState.fuelEconomy)
  const mpg = cwState.fuelEconomy;
  if (mpg && mpg.combined) {
    let mpgStr;
    if (mpg.isEV) {
      mpgStr = mpg.range ? `~${mpg.range} mi range · ${mpg.combined} MPGe combined` : `${mpg.combined} MPGe`;
    } else {
      const cityStr = mpg.city   ? `${mpg.city} city`   : null;
      const hwyStr  = mpg.highway ? `${mpg.highway} hwy` : null;
      const combStr = mpg.combined ? `${mpg.combined} MPG` : null;
      mpgStr = [cityStr, hwyStr, combStr].filter(Boolean).join(' · ');
      if (mpg.fuelCostYr) mpgStr += ` · ~${fmt(mpg.fuelCostYr)}/yr fuel`;
    }
    set('spec-mpg', mpgStr);
  }

  // Safety ratings
  if (safety && (safety.overall || safety.front || safety.side || safety.rollover)) {
    hide('safety-na');
    renderStars('stars-overall',  safety.overall);
    renderStars('stars-front',    safety.front);
    renderStars('stars-side',     safety.side);
    renderStars('stars-rollover', safety.rollover);
  } else {
    show('safety-na');
    ['stars-overall','stars-front','stars-side','stars-rollover'].forEach(id => {
      document.getElementById(id).innerHTML = '<span class="muted-note">N/A</span>';
    });
  }

  // Track recall count for valuation recall note
  lastRecallCount = cwState.recalls.length;

  // Recalls
  const recallList  = document.getElementById('recall-list');
  const recallNone  = document.getElementById('recall-none');
  const recallNA    = document.getElementById('recall-na');
  recallList.innerHTML = '';
  if (!recalls) {
    show('recall-na');
    hide('recall-none');
  } else if (recalls.length === 0) {
    show('recall-none');
    hide('recall-na');
  } else {
    hide('recall-none'); hide('recall-na');
    set('recall-count-badge', recalls.length);
    for (const r of recalls) {
      const item = document.createElement('div');
      item.className = 'recall-item';
      item.innerHTML = `
        <div class="recall-item-title">${escHtml(r.component || 'Component Unknown')}</div>
        <div class="recall-item-desc">${escHtml(r.summary || '')}</div>
        ${r.remedy ? `<div class="recall-item-desc" style="margin-top:3px"><strong>Fix:</strong> ${escHtml(r.remedy)}</div>` : ''}
        ${r.reportDate ? `<div class="recall-item-date">Reported: ${formatDate(r.reportDate)}</div>` : ''}
      `;
      recallList.appendChild(item);
    }
  }

  // Complaints
  const complList = document.getElementById('complaint-list');
  const complNone = document.getElementById('complaint-none');
  const complNA   = document.getElementById('complaint-na');
  complList.innerHTML = '';
  const totalComplaints = complaints ? complaints.reduce((s, c) => s + c.count, 0) : 0;

  if (!complaints) {
    show('complaint-na'); hide('complaint-none');
  } else if (complaints.length === 0) {
    show('complaint-none'); hide('complaint-na');
  } else {
    hide('complaint-none'); hide('complaint-na');
    set('complaint-count-badge', `${totalComplaints} total`);
    document.getElementById('complaint-count-badge').className = 'count-badge count-badge-gray';
    for (const c of complaints) {
      const item = document.createElement('div');
      item.className = 'complaint-item';
      item.innerHTML = `
        <div class="complaint-item-category">${escHtml(c.category)}</div>
        <div class="complaint-item-count">${c.count} complaint${c.count !== 1 ? 's' : ''}</div>
        ${c.sample ? `<div class="complaint-item-desc">${escHtml(c.sample.slice(0, 120))}${c.sample.length > 120 ? '…' : ''}</div>` : ''}
      `;
      complList.appendChild(item);
    }
  }
}

function renderTSBs(tsbs) {
  const list    = document.getElementById('tsb-list');
  const none    = document.getElementById('tsb-none');
  const na      = document.getElementById('tsb-na');
  const alertEl = document.getElementById('tsb-alert');
  if (!list) return;
  list.innerHTML = '';
  if (alertEl) alertEl.innerHTML = '';

  if (!tsbs) { if (na) show('tsb-na'); return; }
  if (tsbs.length === 0) { if (none) show('tsb-none'); return; }

  const badge = document.getElementById('tsb-count-badge');
  if (badge) { badge.textContent = tsbs.length; badge.className = tsbs.length > 20 ? 'count-badge count-badge-red' : 'count-badge count-badge-gray'; }

  if (alertEl) {
    if (tsbs.length > 30) {
      alertEl.className = 'alert-card alert-red';
      alertEl.innerHTML = `<strong>${tsbs.length} TSBs — High Count.</strong> Many known issues acknowledged by the manufacturer. Research before buying.`;
      alertEl.classList.remove('hidden');
    } else if (tsbs.length > 15) {
      alertEl.className = 'alert-card alert-yellow';
      alertEl.innerHTML = `<strong>${tsbs.length} TSBs found.</strong> Several documented issues exist for this model.`;
      alertEl.classList.remove('hidden');
    }
  }

  const shown = tsbs.slice(0, 12);
  for (const t of shown) {
    const item = document.createElement('div');
    item.className = 'recall-item';
    const dateStr = t.date ? ` · ${formatDate(t.date)}` : '';
    const numStr  = t.mfgNumber ? `<span class="recall-id">Bulletin #${escHtml(t.mfgNumber)}</span>` : '';
    item.innerHTML = `
      <div class="recall-header">
        <span class="recall-component">${escHtml(t.subject || 'Unknown System')}</span>
        <span class="recall-date">${escHtml(dateStr.trim())}</span>
      </div>${numStr}`;
    list.appendChild(item);
  }
  if (tsbs.length > 12) {
    const more = document.createElement('p');
    more.className = 'muted-note';
    more.style.marginTop = '4px';
    more.textContent = `+ ${tsbs.length - 12} more TSBs on file…`;
    list.appendChild(more);
  }
}

function renderStars(containerId, count) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const max = 5;
  for (let i = 1; i <= max; i++) {
    const star = document.createElement('span');
    star.className = 'star ' + (i <= count ? 'filled' : 'empty');
    star.textContent = '★';
    container.appendChild(star);
  }
  if (count > 0) {
    const label = document.createElement('span');
    label.style.cssText = 'font-size:11px;color:#374151;margin-left:4px;font-weight:600;';
    label.textContent = `${count}/5`;
    container.appendChild(label);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// PRICE TAB
// ════════════════════════════════════════════════════════════════════════════════

// Update labels and hints when vehicle type changes
function updatePriceTabMode(isUsed) {
  const labelEl = document.getElementById('price-msrp-label');
  const hintEl  = document.getElementById('price-msrp-hint');
  const descEl  = document.getElementById('price-tab-desc');
  if (isUsed) {
    if (labelEl) labelEl.childNodes[0].textContent = 'Current Market Value ($) ';
    if (hintEl)  hintEl.textContent = 'private party estimate — run VIN tab to calculate';
    if (descEl)  descEl.textContent = 'Compare the asking price to the car\'s current market value to see how much the dealer stands to profit.';
  } else {
    if (labelEl) labelEl.childNodes[0].textContent = 'MSRP ($) ';
    if (hintEl)  hintEl.textContent = 'from window sticker';
    if (descEl)  descEl.textContent = 'Enter the asking price and MSRP to see the true dealer cost and fair offer range.';
  }
}

document.getElementById('price-type').addEventListener('change', e => {
  updatePriceTabMode(e.target.value === 'used');
  // Clear price-msrp so wrong value doesn't carry over
  document.getElementById('price-msrp').value = '';
  hide('price-results');
});

document.getElementById('btn-price-calc').addEventListener('click', () => {
  const asking = parseFloat(document.getElementById('price-asking').value);
  const msrp   = parseFloat(document.getElementById('price-msrp').value);
  const make   = document.getElementById('price-make').value;
  const type   = document.getElementById('price-type').value;

  if (!asking || asking < 1000) { alert('Enter a valid asking price.'); return; }
  if (!msrp   || msrp < 1000)   { alert(type === 'used' ? 'Enter a current market value (run the VIN tab valuator first).' : 'Enter a valid MSRP.'); return; }

  hide('adm-warning');
  hide('good-deal-alert');

  if (type === 'used') {
    // ── USED CAR LOGIC ────────────────────────────────────────────────────
    // msrp field = current private party market value (not original MSRP)
    const marketValue = msrp;

    // Dealer acquisition: they paid roughly trade-in value at auction/trade
    // Trade-in ≈ 80–84% of private party. Use 82%.
    const wholesale    = Math.round(marketValue * 0.82);
    const recon        = 950;  // industry avg reconditioning + detailing + inspection
    const dealerFees   = Math.round(marketValue * 0.04); // floor plan, overhead
    const trueCost     = wholesale + recon + dealerFees;
    const profit       = asking - trueCost;
    const profitPct    = ((profit / trueCost) * 100).toFixed(1);

    // Fair offer: dealer needs ~10–18% gross profit to stay viable on used
    // Buyer's target: 10–14% above dealer cost
    const offerLow  = Math.round(trueCost * 1.10);
    const offerHigh = Math.round(trueCost * 1.16);

    // Update labels for used car context
    set('pb-label-msrp',    'Current Market Value');
    set('pb-label-invoice', 'Est. Dealer Acquisition');
    set('pb-label-holdback','Est. Recon + Overhead');

    set('pb-asking',    fmt(asking));
    set('pb-msrp',      fmt(marketValue) + ' (private party)');
    set('pb-invoice',   fmt(wholesale)   + ' (est. auction/trade-in cost)');
    set('pb-holdback',  fmt(recon + dealerFees) + ' (recon + floor plan)');
    set('pb-true-cost', fmt(trueCost));

    const profitEl = document.getElementById('pb-profit');
    profitEl.textContent = `${fmt(profit)} (${profitPct}%)`;
    // >20% gross = high; <0 = suspicious (hidden fees)
    profitEl.style.color = profit > marketValue * 0.20 ? '#dc2626' : profit < 0 ? '#b45309' : '#111827';

    set('offer-low',  fmt(offerLow));
    set('offer-high', fmt(offerHigh));
    set('offer-label-low',  'Target offer');
    set('offer-label-high', 'Dealer accepts');
    set('offer-note', 'Used car dealers typically need 10–18% gross margin. Below 10% they may not deal; above 20% you\'re overpaying.');

    // Price vs market verdict
    if (asking > marketValue * 1.18) {
      show('adm-warning');
      document.querySelector('#adm-warning strong').textContent = 'Overpriced vs Market';
      set('adm-amount', fmt(asking - marketValue) + ' above current market value');
    } else if (asking < marketValue * 0.92) {
      show('good-deal-alert');
      set('good-deal-title', 'Below Market Value');
      set('below-msrp-amount', fmt(marketValue - asking));
      set('below-msrp-label', 'below current market value — verify condition carefully');
    }

    set('price-info-box', '');
    document.getElementById('price-info-box').innerHTML = '<strong>How used car dealer cost is estimated:</strong> Dealers acquire used cars at trade-in/auction value (≈82% of private party), then add $800–$1,200 for reconditioning and detailing, plus floor plan and overhead costs. A healthy used car deal gives the dealer 10–18% gross margin.';

  } else {
    // ── NEW CAR LOGIC ─────────────────────────────────────────────────────
    const holdbackData = window.CW.HOLDBACKS[make] || window.CW.HOLDBACKS[''];
    const invoiceDisc  = window.CW.INVOICE_DISCOUNT[make] || 0.04;
    const invoice      = msrp * (1 - invoiceDisc);
    const holdback     = msrp * holdbackData.pct;
    const trueCost     = invoice - holdback;
    const profit       = asking - trueCost;
    const profitPct    = ((profit / trueCost) * 100).toFixed(1);
    const offerLow     = invoice;
    const offerHigh    = invoice * 1.03;

    // Reset labels to new car defaults
    set('pb-label-msrp',    'MSRP');
    set('pb-label-invoice', 'Est. Invoice Price');
    set('pb-label-holdback','Est. Dealer Holdback');

    set('pb-asking',    fmt(asking));
    set('pb-msrp',      fmt(msrp));
    set('pb-invoice',   fmt(invoice) + ` (est. ${(invoiceDisc*100).toFixed(0)}% below MSRP)`);
    set('pb-holdback',  fmt(holdback) + ` (${holdbackData.label})`);
    set('pb-true-cost', fmt(trueCost));

    const profitEl = document.getElementById('pb-profit');
    profitEl.textContent = `${fmt(profit)} (${profitPct}%)`;
    profitEl.style.color = profit > msrp * 0.05 ? '#dc2626' : profit < 0 ? '#16a34a' : '#111827';

    set('offer-low',  fmt(offerLow));
    set('offer-high', fmt(offerHigh));
    set('offer-label-low',  'Aggressive');
    set('offer-label-high', 'Fair');
    set('offer-note', 'Based on estimated invoice price. Dealer still profits at invoice due to holdback.');

    if (asking > msrp + 500) {
      show('adm-warning');
      set('adm-amount', fmt(asking - msrp));
    } else if (asking < msrp - 500) {
      show('good-deal-alert');
      set('good-deal-title', 'Below MSRP');
      set('below-msrp-amount', fmt(msrp - asking));
      set('below-msrp-label', 'under MSRP. Verify dealer hasn\'t added hidden fees');
    }

    document.getElementById('price-info-box').innerHTML = '<strong>How invoice price is estimated:</strong> Invoice is typically 3–6% below MSRP for domestic vehicles and 2–5% for imports. Dealer holdback (paid quarterly by the manufacturer) means the dealer profits even when selling at invoice.';
  }

  document.getElementById('link-kbb').href      = 'https://www.kbb.com/whats-my-car-worth/';
  document.getElementById('link-truecar').href   = 'https://www.truecar.com/';
  document.getElementById('link-cargurus').href  = 'https://www.cargurus.com/';
  document.getElementById('link-edmunds').href   = 'https://www.edmunds.com/appraisal/';

  show('price-results');
});

// ════════════════════════════════════════════════════════════════════════════════
// F&I ADD-ONS TAB
// ════════════════════════════════════════════════════════════════════════════════

// Returns { verdict, label, note } for an addon given current vehicle context.
// When no context is available, falls back to the addon's default verdict.
function getContextualVerdict(addon, ctx) {
  if (!ctx || !ctx.makeKey) {
    return { verdict: addon.verdict, label: addon.verdictLabel, note: null };
  }
  const { bbStatus, ptStatus, isNew, ageYears, mileage } = ctx;

  switch (addon.name) {
    case 'Extended Warranty (Service Contract)': {
      if (isNew) {
        return { verdict: 'skip', label: 'Skip', note: 'Factory warranty active — no need to decide now' };
      }
      if (bbStatus === 'expired' && ptStatus === 'expired') {
        return { verdict: 'consider', label: 'Consider', note: 'Both factory warranties expired — evaluate coverage options' };
      }
      if (bbStatus === 'expired' && ptStatus === 'active') {
        return { verdict: 'negotiate', label: 'Negotiate', note: 'B&B expired but powertrain still covered' };
      }
      if (bbStatus === 'expiring' || ptStatus === 'expiring') {
        return { verdict: 'negotiate', label: 'Negotiate', note: 'Warranty expiring soon — compare prices before deciding' };
      }
      return { verdict: 'negotiate', label: 'Negotiate', note: null };
    }
    case 'GAP Insurance': {
      if (isNew) {
        return { verdict: 'negotiate', label: 'Negotiate', note: 'New car depreciates fast — buy from your insurer, not the dealer' };
      }
      return { verdict: 'skip', label: 'Skip', note: 'Used car already depreciated — GAP risk is much lower' };
    }
    case 'Paint Protection / Ceramic Coating': {
      if (isNew) {
        return { verdict: 'negotiate', label: 'Negotiate', note: 'New paint benefits from protection — get it from a detailer instead' };
      }
      return { verdict: 'skip', label: 'Skip', note: null };
    }
    default:
      return { verdict: addon.verdict, label: addon.verdictLabel, note: null };
  }
}

// Renders F&I add-on list with optional vehicle context object.
function renderAddons(ctx) {
  const list = document.getElementById('addons-list');
  if (!list || !window.CW) return;
  list.innerHTML = '';

  window.CW.ADDONS.forEach(addon => {
    const { verdict, label, note } = getContextualVerdict(addon, ctx || {});

    const verdictClass = verdict === 'skip' ? 'verdict-skip'
                       : verdict === 'negotiate' ? 'verdict-negotiate'
                       : 'verdict-consider';

    const detailRows = addon.details.map(d =>
      `<div class="addon-detail-row"><span class="addon-detail-label">${escHtml(d.label)}</span><span class="addon-detail-val">${escHtml(d.val)}</span></div>`
    ).join('');

    const contextNoteHtml = note
      ? `<div class="addon-context-note">&#9432; ${escHtml(note)}</div>`
      : '';

    const scriptHtml = addon.script
      ? `<div class="addon-script"><span class="addon-script-label">Say this:</span><span class="addon-script-text">${escHtml(addon.script)}</span></div>`
      : '';

    const savingsHtml = addon.savings && verdict === 'skip'
      ? `<div style="margin-top:4px;font-size:11px;font-weight:700;color:#16a34a;">${escHtml(addon.savings)}</div>`
      : '';

    const item = document.createElement('div');
    item.className = 'addon-item';
    item.innerHTML = `
      <div>
        <div class="addon-name">${escHtml(addon.name)}</div>
        <div class="addon-dealer-price">Dealer: ${escHtml(addon.dealerPrice)}</div>
      </div>
      <div class="addon-verdict-badge ${verdictClass}">${escHtml(label)}</div>
      <div class="addon-chevron">&#8964;</div>
      <div class="addon-details">
        ${contextNoteHtml}
        <div class="addon-detail-row"><span class="addon-detail-label">Real Cost</span><span class="addon-detail-val">${escHtml(addon.realCost)}</span></div>
        ${detailRows}
        <div class="addon-tip">💡 ${escHtml(addon.tip)}</div>
        ${scriptHtml}
        ${savingsHtml}
      </div>
    `;

    item.addEventListener('click', () => {
      item.classList.toggle('expanded');
    });

    list.appendChild(item);
  });
}

// Computes warranty status, updates the F&I warranty banner, then re-renders addons.
function renderFniContext() {
  const banner = document.getElementById('fni-warranty-status');
  if (!banner) return;

  const v = cwState.vinData;
  if (!v) {
    banner.className = 'fni-warranty-banner fni-wb-none';
    banner.textContent = 'Look up a VIN on the VIN tab to see vehicle-specific warranty status and guidance.';
    renderAddons({});
    updateFniSavings({});
    return;
  }

  const makeKey    = getMakeKey(v.make);
  const wData      = window.CW.FACTORY_WARRANTY[makeKey] || window.CW.FACTORY_WARRANTY[''];
  const currentYear = new Date().getFullYear();
  const vehicleYear = parseInt(v.year) || currentYear;
  const ageYears   = currentYear - vehicleYear;
  // Prefer scraped mileage; fall back to val-mileage input if the user typed it manually
  const mileage    = cwState.mileage
                  || parseInt(document.getElementById('val-mileage')?.value) || 0;
  // owners: only treat as original owner if explicitly confirmed = 1 from history scraping.
  // Unknown owner count → assume subsequent owner (conservative for buyer protection).
  const ownersKnown    = cwState.history != null && cwState.history.owners != null;
  const owners         = ownersKnown ? cwState.history.owners : null;
  const isOriginalOwner = ownersKnown && owners === 1;
  const isNew          = ageYears <= 1;

  // Effective powertrain warranty: use extended original-owner terms only when confirmed.
  const ptYrs = (wData.ptOrig && isOriginalOwner) ? wData.ptOrig[0] : wData.pt[0];
  const ptMi  = (wData.ptOrig && isOriginalOwner) ? wData.ptOrig[1] : wData.pt[1];

  // Check warranty status: 'active', 'expiring' (within 1yr/10k of limit), or 'expired'.
  // When mileage is unknown (0), age alone determines status — we skip mile check.
  function wStatus(years, miles) {
    const ageOk = ageYears < years;
    const miOk  = !mileage || mileage < miles;   // unknown mileage = optimistic pass
    if (ageOk && miOk) return 'active';
    // "Expiring" = within last 12 months of age limit AND within 10k of mile limit
    const nearAge = ageYears >= years - 1 && ageYears < years;
    const nearMi  = mileage && mileage >= miles - 10000 && mileage < miles;
    if ((nearAge || ageOk) && (nearMi || miOk) && (nearAge || nearMi)) return 'expiring';
    return 'expired';
  }

  const bbStatus = wStatus(wData.bb[0], wData.bb[1]);
  const ptStatus = wStatus(ptYrs, ptMi);

  // Format warranty labels
  const bbLbl = `${wData.bb[0]}yr/${(wData.bb[1]/1000).toFixed(0)}k mi`;
  const ptLbl = `${ptYrs}yr/${(ptMi/1000).toFixed(0)}k mi`;
  // Show owner-count note for Hyundai/Kia reduced PT, or if unknown owner count
  const reducedNote = wData.transferable === 'reduced'
    ? (isOriginalOwner ? ' (original owner — full 10yr/100k)' : ' (subsequent owner — reduced to 5yr/60k)')
    : '';

  // Build banner content
  let cls, html;
  const mi = mileage ? ` · ${mileage.toLocaleString()} mi` : '';

  if (isNew) {
    cls  = 'fni-wb-active';
    html = `<strong>Factory Warranty Active (New Vehicle)</strong><br>Full coverage: ${bbLbl} bumper-to-bumper and ${ptLbl} powertrain are both in effect.`;
  } else if (bbStatus === 'active' && ptStatus === 'active') {
    cls  = 'fni-wb-active';
    html = `<strong>Factory Warranty Active</strong><br>${v.year} ${v.make} ${v.model}${mi}: B&B ${bbLbl} and powertrain ${ptLbl}${reducedNote} are both in effect.`;
  } else if (bbStatus === 'expired' && ptStatus === 'active') {
    cls  = 'fni-wb-partial';
    html = `<strong>Partial Coverage — B&B Expired</strong><br>Bumper-to-bumper (${bbLbl}) has expired${mi}. Powertrain ${ptLbl}${reducedNote} still covers engine and transmission.`;
  } else if (bbStatus === 'expired' && ptStatus === 'expired') {
    cls  = 'fni-wb-expired';
    html = `<strong>All Factory Warranties Expired</strong><br>${v.year} ${v.make} ${v.model} (${ageYears} yrs${mi}) is out of factory coverage. All repairs are fully out-of-pocket.`;
  } else if (bbStatus === 'expiring' || ptStatus === 'expiring') {
    cls  = 'fni-wb-partial';
    html = `<strong>Warranty Expiring Soon</strong><br>B&B ${bbLbl}: ${bbStatus}${mi}. Powertrain ${ptLbl}${reducedNote}: ${ptStatus}.`;
  } else {
    cls  = 'fni-wb-partial';
    html = `<strong>Warranty Status</strong><br>B&B ${bbLbl}: ${bbStatus}. Powertrain ${ptLbl}${reducedNote}: ${ptStatus}${mi}.`;
  }

  banner.className = 'fni-warranty-banner ' + cls;
  banner.innerHTML = html;

  const ctx = { makeKey, ageYears, mileage, owners, isOriginalOwner, bbStatus, ptStatus, isNew };
  renderAddons(ctx);
  updateFniSavings(ctx);
}

// Tallies savings from all "Skip" items and shows the savings banner.
function updateFniSavings(ctx) {
  const banner = document.getElementById('fni-savings-banner');
  if (!banner) return;

  let minSave = 0, maxSave = 0;
  window.CW.ADDONS.forEach(addon => {
    const { verdict } = getContextualVerdict(addon, ctx || {});
    if (verdict !== 'skip') return;
    const m = (addon.savings || '').match(/\$(\d[\d,]*)(?:[–\-]\$(\d[\d,]*))?/);
    if (!m) return;
    minSave += parseInt(m[1].replace(/,/g, ''));
    maxSave += parseInt((m[2] || m[1]).replace(/,/g, ''));
  });

  if (minSave > 0) {
    banner.classList.remove('hidden');
    banner.textContent = `Decline all "Skip" items → save $${minSave.toLocaleString()}–$${maxSave.toLocaleString()} in the finance office.`;
  } else {
    banner.classList.add('hidden');
  }
}

// Initial render with no context (before VIN lookup)
renderAddons({});
updateFniSavings({});

// ════════════════════════════════════════════════════════════════════════════════
// FINANCE TAB
// ════════════════════════════════════════════════════════════════════════════════

// Mode switcher
document.querySelectorAll('.calc-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.calc-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const mode = btn.dataset.mode;
    document.getElementById('calc-loan').classList.toggle('hidden',    mode !== 'loan');
    document.getElementById('calc-lease').classList.toggle('hidden',   mode !== 'lease');
    document.getElementById('calc-compare').classList.toggle('hidden', mode !== 'compare');
  });
});

// ── Loan Calculator ──
document.getElementById('btn-loan-calc').addEventListener('click', () => {
  const price   = parseFloat(document.getElementById('loan-price').value) || 0;
  const down    = parseFloat(document.getElementById('loan-down').value)  || 0;
  const tradein = parseFloat(document.getElementById('loan-tradein').value) || 0;
  const apr     = parseFloat(document.getElementById('loan-apr').value);
  const term    = parseInt(document.getElementById('loan-term').value);

  if (!price || price < 1000) { alert('Enter a valid vehicle price.'); return; }
  if (!apr || apr < 0)        { alert('Enter a valid APR.'); return; }

  const principal = Math.max(0, price - down - tradein);
  const monthly   = calcMonthlyPayment(principal, apr, term);
  const totalPaid = monthly * term;
  const interest  = totalPaid - principal;

  set('loan-monthly',        fmt(monthly));
  set('loan-total-interest', fmt(interest));
  set('loan-total-cost',     fmt(totalPaid + down + tradein));

  // APR benchmark
  renderAPRBenchmark(apr);

  // Dealer reserve warning if rate seems high
  const bestRate = window.CW.APR_BENCHMARKS[0].newCar;
  const reserveNote = document.getElementById('dealer-reserve-note');
  if (apr > bestRate + 3) {
    reserveNote.classList.remove('hidden');
  } else {
    reserveNote.classList.add('hidden');
  }

  show('loan-results');
});

function calcMonthlyPayment(principal, aprPct, months) {
  if (aprPct === 0) return principal / months;
  const r = (aprPct / 100) / 12;
  return principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function renderAPRBenchmark(userAPR) {
  const container = document.getElementById('apr-benchmark-rows');
  container.innerHTML = '';
  const maxRate = 22;

  window.CW.APR_BENCHMARKS.forEach(bm => {
    const row = document.createElement('div');
    row.className = 'apr-bm-row';
    const isYours = Math.abs(userAPR - bm.newCar) < 1.5;
    const barPct  = Math.min(100, (bm.newCar / maxRate) * 100);
    const barClass = bm.newCar <= 7 ? 'bar-good' : bm.newCar <= 12 ? 'bar-warn' : 'bar-bad';
    row.innerHTML = `
      <span class="apr-bm-tier">${bm.tier}</span>
      <span class="apr-bm-rate">${bm.newCar}%</span>
      <div class="apr-bm-bar-bg">
        <div class="apr-bm-bar-fill ${barClass}" style="width:${barPct}%"></div>
      </div>
      ${isYours ? '<span class="apr-bm-yours">← yours</span>' : ''}
    `;
    container.appendChild(row);
  });

  // Show user's rate vs best
  const diff = userAPR - window.CW.APR_BENCHMARKS[0].newCar;
  if (diff > 0.5) {
    const extraRow = document.createElement('div');
    extraRow.className = 'apr-bm-row';
    extraRow.style.marginTop = '6px';
    extraRow.innerHTML = `<span style="font-size:11px;color:#dc2626;font-weight:600;">Your rate (${userAPR}%) is ${diff.toFixed(1)}% above best-credit rate. Consider getting pre-approved at a credit union.</span>`;
    container.appendChild(extraRow);
  }
}

// ── Lease Calculator ──
document.getElementById('btn-lease-calc').addEventListener('click', () => {
  const msrp     = parseFloat(document.getElementById('lease-msrp').value)     || 0;
  const cap      = parseFloat(document.getElementById('lease-cap').value)      || 0;
  const residual = parseFloat(document.getElementById('lease-residual').value) || 0;
  const mf       = parseFloat(document.getElementById('lease-mf').value)       || 0;
  const down     = parseFloat(document.getElementById('lease-down').value)     || 0;
  const term     = parseInt(document.getElementById('lease-term').value)       || 36;

  if (!cap || cap < 1000)      { alert('Enter a valid cap cost.'); return; }
  if (!residual || residual < 1) { alert('Enter a valid residual value.'); return; }
  if (!mf || mf <= 0)           { alert('Enter a valid money factor (e.g. 0.00150).'); return; }

  const adjCap    = cap - down;           // adjusted cap cost
  const deprec    = (adjCap - residual) / term;  // depreciation per month
  const finance   = (adjCap + residual) * mf;    // finance charge per month
  const monthly   = deprec + finance;
  const totalPaid = monthly * term + down;
  const aprEquiv  = mf * 2400;

  set('lease-monthly', fmt(monthly));
  set('lease-total',   fmt(totalPaid));
  set('lease-mf-apr',  aprEquiv.toFixed(2) + '%');

  show('lease-results');
});

// ── Buy vs Lease Comparison ──
document.getElementById('btn-compare-calc').addEventListener('click', () => {
  const price         = parseFloat(document.getElementById('cmp-price').value)         || 0;
  const down          = parseFloat(document.getElementById('cmp-down').value)          || 0;
  const apr           = parseFloat(document.getElementById('cmp-apr').value)           || 0;
  const term          = parseInt(document.getElementById('cmp-term').value)            || 60;
  const residualPct   = parseFloat(document.getElementById('cmp-residual-pct').value)  || 0;
  const leaseMonthly  = parseFloat(document.getElementById('cmp-lease-monthly').value) || 0;
  const leaseDown     = parseFloat(document.getElementById('cmp-lease-down').value)    || 0;

  if (!price || price < 1000) { alert('Enter a valid vehicle price.'); return; }
  if (!apr)                   { alert('Enter a valid loan APR.'); return; }
  if (!leaseMonthly)          { alert('Enter a lease monthly payment.'); return; }

  // Buy scenario
  const principal    = price - down;
  const monthly      = calcMonthlyPayment(principal, apr, term);
  const buyTotal     = monthly * term + down;
  const buyEquity    = price * (residualPct / 100);
  const buyNetCost   = buyTotal - buyEquity;

  // Lease scenario (same term)
  const leaseTotal   = leaseMonthly * term + leaseDown;
  const leaseNetCost = leaseTotal; // no equity at end

  set('cmp-buy-total',   fmt(buyTotal));
  set('cmp-buy-equity',  fmt(buyEquity));
  set('cmp-buy-net',     fmt(buyNetCost));
  set('cmp-lease-total', fmt(leaseTotal));
  set('cmp-lease-net',   fmt(leaseNetCost));

  const buyCard   = document.getElementById('cmp-buy-card');
  const leaseCard = document.getElementById('cmp-lease-card');
  buyCard.classList.toggle('winner',   buyNetCost   < leaseNetCost);
  leaseCard.classList.toggle('winner', leaseNetCost < buyNetCost);

  const diff    = Math.abs(buyNetCost - leaseNetCost);
  const verdict = document.getElementById('compare-verdict');
  if (buyNetCost < leaseNetCost) {
    verdict.textContent = `Buying is ${fmt(diff)} cheaper in net cost over ${term} months after accounting for vehicle equity.`;
  } else if (leaseNetCost < buyNetCost) {
    verdict.textContent = `Leasing costs ${fmt(diff)} less out-of-pocket over ${term} months, but you own nothing at the end.`;
  } else {
    verdict.textContent = 'Buy vs lease is roughly a wash for this vehicle. Consider lifestyle fit — do you want to own or upgrade every 3 years?';
  }

  show('compare-results');
});

// ════════════════════════════════════════════════════════════════════════════════
// SHIELD / CHECKLIST TAB
// ════════════════════════════════════════════════════════════════════════════════

// Load saved checklist state
chrome.storage.local.get('checklistState', result => {
  const state = result.checklistState || {};
  document.querySelectorAll('.shield-check').forEach(cb => {
    const idx = cb.dataset.idx;
    if (state[idx]) {
      cb.checked = true;
      cb.closest('.check-item').classList.add('checked');
    }
  });
  updateShieldScore();
});

// Persist checklist changes
document.querySelectorAll('.shield-check').forEach(cb => {
  cb.addEventListener('change', async () => {
    const item = cb.closest('.check-item');
    item.classList.toggle('checked', cb.checked);
    // Save state
    const result = await chrome.storage.local.get('checklistState');
    const state = result.checklistState || {};
    state[cb.dataset.idx] = cb.checked;
    chrome.storage.local.set({ checklistState: state });
    updateShieldScore();
  });
});

document.getElementById('btn-reset-checklist').addEventListener('click', () => {
  document.querySelectorAll('.shield-check').forEach(cb => {
    cb.checked = false;
    cb.closest('.check-item').classList.remove('checked');
  });
  chrome.storage.local.set({ checklistState: {} });
  updateShieldScore();
});

function updateShieldScore() {
  const total   = document.querySelectorAll('.shield-check').length;
  const checked = document.querySelectorAll('.shield-check:checked').length;
  const circle  = document.getElementById('shield-score-circle');
  set('shield-score-num', checked);

  circle.classList.remove('score-low', 'score-mid', 'score-high', 'score-perfect');
  if (checked === total)            circle.classList.add('score-perfect');
  else if (checked >= total * 0.75) circle.classList.add('score-high');
  else if (checked >= total * 0.4)  circle.classList.add('score-mid');
  else                              circle.classList.add('score-low');

  const msgs = ['Tap each item below', 'Just getting started', 'Getting protected',
                'Getting protected', 'Halfway there', 'Almost bulletproof',
                'Almost bulletproof', 'Almost bulletproof', 'Fully shielded ✓'];
  set('shield-score-msg', msgs[Math.min(checked, msgs.length - 1)]);
}

// Render dealer tactics from data.js with collapsible cards
(function renderTactics() {
  const list = document.getElementById('tactics-list');
  if (!list || !window.CW) return;
  window.CW.TACTICS.forEach(t => {
    const card = document.createElement('div');
    card.className = `tactic-card ${t.color}`;
    const badgeClass = t.color === 'tactic-red'    ? 'tbadge-red'
                     : t.color === 'tactic-yellow'  ? 'tbadge-yellow'
                     : 'tbadge-blue';
    const badgeLabel = t.color === 'tactic-red' ? 'HIGH RISK' : 'CAUTION';
    card.innerHTML = `
      <div class="tactic-header">
        <span class="tactic-badge ${badgeClass}">${badgeLabel}</span>
        <span class="tactic-name">${escHtml(t.name)}</span>
        <span class="tactic-chevron">&#8964;</span>
      </div>
      <div class="tactic-desc">${escHtml(t.desc)}</div>`;
    card.addEventListener('click', () => card.classList.toggle('expanded'));
    list.appendChild(card);
  });

  // Also wire up the hardcoded private-party tactic cards in the HTML
  document.querySelectorAll('.tactics-section .tactic-card').forEach(card => {
    if (!card.closest('#tactics-list')) {
      card.addEventListener('click', () => card.classList.toggle('expanded'));
    }
  });
})();

// ════════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════════
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(str) {
  if (!str) return '';
  const raw = String(str).trim();

  // ISO / full timestamp: "2016-07-14T00:00:00" or "2016-07-14"
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // Compact 8-digit YYYYMMDD: "20160714"
  const compact = raw.replace(/\D/g, '');
  if (compact.length === 8) {
    const y = compact.slice(0, 4), m = compact.slice(4, 6), d = compact.slice(6, 8);
    // Sanity check: year must be plausible (1980–2099), month 01-12
    if (parseInt(y) >= 1980 && parseInt(m) >= 1 && parseInt(m) <= 12) {
      return `${y}-${m}-${d}`;
    }
  }

  // Legacy NHTSA MM/DD/YY or MM-DD-YY (e.g. "0206-20-16" → digits "02062016" but year < 1980)
  // Try reading as MMDDYYYY or MMDDYY
  if (compact.length === 8) {
    const mm = compact.slice(0, 2), dd = compact.slice(2, 4), yy = compact.slice(4);
    const year = parseInt(yy) < 100 ? 2000 + parseInt(yy) : parseInt(yy);
    if (parseInt(mm) >= 1 && parseInt(mm) <= 12 && parseInt(dd) >= 1 && parseInt(dd) <= 31) {
      return `${year}-${mm}-${dd}`;
    }
  }
  if (compact.length === 6) {
    const mm = compact.slice(0, 2), dd = compact.slice(2, 4), yy = compact.slice(4);
    const year = 2000 + parseInt(yy);
    if (parseInt(mm) >= 1 && parseInt(mm) <= 12) {
      return `${year}-${mm}-${dd}`;
    }
  }

  return raw; // fall back to raw string
}

// ════════════════════════════════════════════════════════════════════════════════
// BUY ANALYSIS ENGINE
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Compute a buy score from available data.
 * @param {object|null} valResult  — output of computeValuation(), or null if not yet run
 * @param {number}      askingPrice — scraped or entered asking price (0 = unknown)
 * @returns {{ relScore, mechScore, finScore, overall, verdict, verdictStyle, flags, finKnown }}
 */
function computeBuyScore(valResult, askingPrice) {
  const v          = cwState.vinData;
  const recalls    = cwState.recalls    || [];
  const complaints = cwState.complaints || [];
  const tsbs       = cwState.tsbs       || [];
  const history    = cwState.history;

  const currentYear = new Date().getFullYear();
  const vehicleYear = v ? (parseInt(v.year) || currentYear) : currentYear;
  const ageYears    = Math.max(0, currentYear - vehicleYear);
  const isNew       = ageYears <= 1;
  const makeKey     = v ? getMakeKey(v.make) : '';
  const mileage     = cwState.mileage || (ageYears * 12000);

  const flags = []; // { type:'good'|'warn'|'bad', category:'financial'|'reliability'|'mechanical', text }

  // ── RELIABILITY: Recalls ──────────────────────────────────────────────────
  const recallCount = recalls.length;
  if (recallCount === 0) {
    flags.push({ type: 'good', category: 'reliability', text: 'No open recalls on record' });
  } else if (recallCount <= 2) {
    flags.push({ type: 'warn', category: 'reliability', text: `${recallCount} open recall${recallCount > 1 ? 's' : ''} — dealer must fix for free before you drive it` });
  } else {
    flags.push({ type: 'bad', category: 'reliability', text: `${recallCount} open recalls — serious safety risk, all must be resolved` });
  }

  // ── RELIABILITY: Consumer complaints ─────────────────────────────────────
  const totalComplaints = complaints.reduce((s, c) => s + c.count, 0);
  const topComponent    = complaints[0]?.category || '';
  if (totalComplaints >= 300) {
    flags.push({ type: 'bad', category: 'reliability', text: `${totalComplaints} consumer complaints — known problem vehicle (worst area: ${topComponent})` });
  } else if (totalComplaints >= 100) {
    flags.push({ type: 'warn', category: 'reliability', text: `${totalComplaints} consumer complaints on record (most reported: ${topComponent})` });
  } else if (totalComplaints > 0) {
    flags.push({ type: 'good', category: 'reliability', text: `Low complaint volume (${totalComplaints} total) — good sign` });
  }

  // ── RELIABILITY: Technical Service Bulletins ──────────────────────────────
  if (tsbs.length > 30) {
    flags.push({ type: 'bad', category: 'reliability', text: `${tsbs.length} technical service bulletins — manufacturer acknowledged many known defects` });
  } else if (tsbs.length > 15) {
    flags.push({ type: 'warn', category: 'reliability', text: `${tsbs.length} technical service bulletins — some documented issues exist for this model` });
  } else if (tsbs.length > 0) {
    flags.push({ type: 'good', category: 'reliability', text: `${tsbs.length} TSBs — normal for any model, no major quality concerns` });
  }

  // ── RELIABILITY: Listing history (CARFAX etc.) ────────────────────────────
  if (history) {
    // Title
    if (history.title && history.title !== 'Clean Title') {
      flags.push({ type: 'bad', category: 'reliability', text: `${history.title} — major red flag, severely limits financing and resale` });
    } else if (history.title === 'Clean Title') {
      flags.push({ type: 'good', category: 'reliability', text: 'Clean title confirmed on listing' });
    }
    // Accidents
    if (history.accidents != null) {
      if (history.accidents === 0) flags.push({ type: 'good', category: 'reliability', text: 'No reported accidents' });
      else flags.push({ type: 'bad', category: 'reliability', text: `${history.accidents} reported accident${history.accidents > 1 ? 's' : ''} — get repair records and independent inspection` });
    }
    // Damage
    if (history.damage === 'major') flags.push({ type: 'bad', category: 'reliability', text: 'Major structural damage reported — avoid unless inspected by a structural expert' });
    else if (history.damage === 'minor') flags.push({ type: 'warn', category: 'reliability', text: 'Minor damage on record — inspect for hidden rust or frame issues' });
    // Owners
    if (history.owners != null) {
      if (history.owners === 1) flags.push({ type: 'good', category: 'reliability', text: '1 previous owner — lower risk of abuse or deferred maintenance' });
      else if (history.owners > 3) flags.push({ type: 'warn', category: 'reliability', text: `${history.owners} previous owners — ask why it changed hands so often` });
    }
    // Usage
    if (history.usage === 'Rental Vehicle' || history.usage === 'Fleet Vehicle') {
      flags.push({ type: 'warn', category: 'reliability', text: `${history.usage} — higher mileage accumulation and harder use` });
    }
    // Service records
    if (history.serviceRecords) {
      const srText = typeof history.serviceRecords === 'number' ? `${history.serviceRecords} service records on file — maintenance history verifiable` : 'Service history documented';
      flags.push({ type: 'good', category: 'reliability', text: srText });
    }
    // CARFAX / CarGurus price / deal rating
    if (history.priceRating) {
      const rt = history.priceRating;
      const type = (rt.includes('Good') || rt.includes('Great')) ? 'good' : rt === 'Overpriced' ? 'bad' : 'warn';
      flags.push({ type, category: 'financial', text: `CARFAX price rating: ${rt}` });
    }
    if (history.dealRating) {
      const dr = history.dealRating;
      const type = (dr.includes('Great') || dr.includes('Good')) ? 'good' : dr.includes('Fair') ? 'warn' : 'bad';
      flags.push({ type, category: 'financial', text: `Marketplace deal rating: ${dr}` });
    }
    // Frame / structural damage — highest severity mechanical flag
    if (history.frameDamage === true) {
      flags.push({ type: 'bad', category: 'mechanical', text: 'Frame or structural damage reported — avoid unless professionally inspected by a body shop' });
    } else if (history.frameDamage === false) {
      flags.push({ type: 'good', category: 'mechanical', text: 'No frame or structural damage on record' });
    }
    // Airbag deployment
    if (history.airbagDeployed === true) {
      flags.push({ type: 'bad', category: 'mechanical', text: 'Airbag deployment recorded — verify all airbags and sensors were properly replaced' });
    } else if (history.airbagDeployed === false) {
      flags.push({ type: 'good', category: 'mechanical', text: 'No airbag deployment on record' });
    }
    // Total loss
    if (history.totalLoss === true) {
      flags.push({ type: 'bad', category: 'reliability', text: 'Total loss on record — insurance wrote the car off. Financing and resale will be severely impacted.' });
    }
    // CARFAX Buyback Guarantee
    if (history.buybackGuarantee) {
      flags.push({ type: 'good', category: 'reliability', text: 'CARFAX Buyback Guarantee — protects against undisclosed history' });
    }
    // Days on market — long = motivated seller
    if (history.daysOnMarket > 90) {
      flags.push({ type: 'good', category: 'financial', text: `${history.daysOnMarket} days on market — seller likely motivated, negotiate aggressively` });
    } else if (history.daysOnMarket > 45) {
      flags.push({ type: 'warn', category: 'financial', text: `${history.daysOnMarket} days on market — ask why it hasn't sold` });
    }
  }

  // ── MECHANICAL: Age and mileage ───────────────────────────────────────────
  if (!isNew) {
    const avgMiles    = ageYears * 12000;
    const mileRatio   = mileage / Math.max(avgMiles, 1);

    // Mileage relative to age
    if (mileRatio < 0.70 && ageYears >= 3) {
      flags.push({ type: 'good', category: 'mechanical', text: `Below-average mileage for age (${mileage.toLocaleString()} mi vs ~${avgMiles.toLocaleString()} expected)` });
    } else if (mileRatio > 1.40) {
      flags.push({ type: 'warn', category: 'mechanical', text: `Above-average mileage for age (${mileage.toLocaleString()} mi vs ~${avgMiles.toLocaleString()} expected)` });
    }

    // Age-based wear tier
    if (ageYears >= 15 || mileage >= 200000) {
      flags.push({ type: 'bad', category: 'mechanical', text: `${ageYears}yr / ${mileage.toLocaleString()}mi — high risk. Budget $2,000–$5,000 for near-term repairs. Pre-purchase inspection required.` });
    } else if (ageYears >= 10 || mileage >= 130000) {
      flags.push({ type: 'warn', category: 'mechanical', text: `${ageYears}yr / ${mileage.toLocaleString()}mi — schedule a pre-purchase inspection ($100–$200) before buying` });
    } else if (ageYears >= 6 || mileage >= 70000) {
      flags.push({ type: 'warn', category: 'mechanical', text: 'Budget for upcoming maintenance: brakes, tires, timing belt/chain if applicable' });
    } else {
      flags.push({ type: 'good', category: 'mechanical', text: 'Low age and mileage — minimal near-term mechanical risk' });
    }

    // Hybrid battery
    const engineOrFuel = ((v?.fuelType || '') + ' ' + (v?.engine || '')).toLowerCase();
    if (/hybrid|phev|hev/.test(engineOrFuel) && ageYears >= 8) {
      flags.push({ type: 'warn', category: 'mechanical', text: `Hybrid battery at ${ageYears} years — ask for battery health report. Replacement: $3,000–$8,000` });
    }
    // EV
    if (/electric|bev/.test(engineOrFuel) && ageYears >= 5) {
      flags.push({ type: 'warn', category: 'mechanical', text: `EV battery degradation likely after ${ageYears} years — request range test and state-of-health report` });
    }
    // European luxury at high mileage
    if (['bmw', 'mercedes', 'vw'].includes(makeKey) && mileage > 100000) {
      flags.push({ type: 'bad', category: 'mechanical', text: `${v?.make || 'European'} at ${mileage.toLocaleString()}mi — high repair costs expected. Parts/labor run 2–4× domestic brands.` });
    }
  } else {
    flags.push({ type: 'good', category: 'mechanical', text: 'New vehicle — factory warranty covers mechanical issues' });
  }

  // ── MECHANICAL: Fuel economy ──────────────────────────────────────────────
  const mpgData = cwState.fuelEconomy;
  if (mpgData && mpgData.combined && !isNew) {
    if (mpgData.isEV) {
      flags.push({ type: 'good', category: 'mechanical', text: `Electric vehicle — ~${mpgData.range} mi range, no gas costs` });
    } else if (mpgData.combined >= 35) {
      flags.push({ type: 'good', category: 'mechanical', text: `Excellent fuel economy: ${mpgData.combined} MPG combined (~${fmt(mpgData.fuelCostYr)}/yr fuel)` });
    } else if (mpgData.combined >= 28) {
      flags.push({ type: 'good', category: 'mechanical', text: `Good fuel economy: ${mpgData.combined} MPG combined (~${fmt(mpgData.fuelCostYr)}/yr fuel)` });
    } else if (mpgData.combined <= 18) {
      flags.push({ type: 'warn', category: 'mechanical', text: `Low fuel economy: ${mpgData.combined} MPG combined (~${fmt(mpgData.fuelCostYr)}/yr fuel at EPA avg mileage)` });
    }
  }

  // ── FINANCIAL ────────────────────────────────────────────────────────────
  let finKnown = false;
  if (valResult && askingPrice > 0) {
    finKnown = true;
    const pct = (askingPrice - valResult.basePrivate) / valResult.basePrivate;
    if (askingPrice < valResult.tradeIn.lo) {
      flags.push({ type: 'good', category: 'financial', text: `Exceptional price — asking (${fmt(askingPrice)}) is below even trade-in value. Verify condition.` });
    } else if (askingPrice <= valResult.private_.hi) {
      flags.push({ type: 'good', category: 'financial', text: `Fair price — asking (${fmt(askingPrice)}) is within private party market range` });
    } else if (askingPrice <= valResult.retail.hi * 1.05) {
      flags.push({ type: 'warn', category: 'financial', text: `Slightly high — asking (${fmt(askingPrice)}) is above private party, within dealer retail range. Negotiate.` });
    } else {
      flags.push({ type: 'bad', category: 'financial', text: `Overpriced — asking (${fmt(askingPrice)}) is ${pct > 0 ? '+' : ''}${Math.round(pct * 100)}% above estimated market value` });
    }
  } else if (askingPrice > 0 && !valResult) {
    flags.push({ type: 'warn', category: 'financial', text: `Asking price detected (${fmt(askingPrice)}) — estimate value below to compare against market` });
  }

  // ── COMPUTE CATEGORY SCORES ───────────────────────────────────────────────
  function catScore(cat) {
    const catFlags = flags.filter(f => f.category === cat);
    if (catFlags.length === 0) return 65; // unknown
    const bads  = catFlags.filter(f => f.type === 'bad').length;
    const warns = catFlags.filter(f => f.type === 'warn').length;
    const goods = catFlags.filter(f => f.type === 'good').length;
    let s = 90 + goods * 5 - warns * 14 - bads * 30;
    return Math.max(5, Math.min(100, s));
  }

  const relScore  = catScore('reliability');
  const mechScore = catScore('mechanical');
  const finScore  = finKnown ? catScore('financial') : 65;

  const weights   = finKnown ? [0.30, 0.40, 0.30] : [0.0, 0.55, 0.45];
  const overall   = Math.round(finScore * weights[0] + relScore * weights[1] + mechScore * weights[2]);

  let verdict, verdictStyle;
  if (overall >= 72)      { verdict = 'Good Buy';              verdictStyle = 'green'; }
  else if (overall >= 52) { verdict = 'Proceed with Caution';  verdictStyle = 'yellow'; }
  else if (overall >= 32) { verdict = 'High Risk';             verdictStyle = 'orange'; }
  else                    { verdict = 'Walk Away';             verdictStyle = 'red'; }

  return { relScore, mechScore, finScore, overall, verdict, verdictStyle, flags, finKnown, isNew };
}

function renderBuyAnalysis(score) {
  const card = document.getElementById('buy-analysis-card');
  if (!card || !score) return;

  // Verdict banner
  const banner = document.getElementById('buy-verdict-banner');
  banner.className = `buy-verdict-banner buy-verdict-${score.verdictStyle}`;
  const emoji = score.verdictStyle === 'green' ? '✅' : score.verdictStyle === 'yellow' ? '⚠️' : score.verdictStyle === 'orange' ? '🚨' : '🛑';
  banner.textContent = `${emoji}  ${score.verdict}`;

  // Pillar bars
  const pillars = [
    { id: 'financial',   score: score.finScore,  label: score.finKnown ? scoreLabel(score.finScore)  : 'Estimate value' },
    { id: 'reliability', score: score.relScore,  label: scoreLabel(score.relScore) },
    { id: 'mechanical',  score: score.mechScore, label: scoreLabel(score.mechScore) },
  ];
  for (const { id, score: s, label } of pillars) {
    const bar = document.getElementById(`buy-bar-${id}`);
    const lbl = document.getElementById(`buy-lbl-${id}`);
    if (bar) {
      bar.style.width = `${s}%`;
      bar.className = `buy-bar-fill buy-bar-${s >= 70 ? 'green' : s >= 50 ? 'yellow' : s >= 30 ? 'orange' : 'red'}`;
    }
    if (lbl) { lbl.textContent = label; lbl.style.color = s >= 70 ? '#16a34a' : s >= 50 ? '#d97706' : '#dc2626'; }
  }

  // Flag list
  const flagsEl = document.getElementById('buy-flags');
  flagsEl.innerHTML = '';
  // Sort: bad → warn → good
  const sorted = [...score.flags].sort((a, b) => {
    const order = { bad: 0, warn: 1, good: 2 };
    return order[a.type] - order[b.type];
  });
  for (const flag of sorted) {
    const row = document.createElement('div');
    row.className = `buy-flag buy-flag-${flag.type}`;
    const icon = flag.type === 'good' ? '✓' : flag.type === 'warn' ? '⚠' : '✗';
    row.innerHTML = `<span class="buy-flag-icon">${icon}</span><span>${escHtml(flag.text)}</span>`;
    flagsEl.appendChild(row);
  }

  // Financial note
  const note = document.getElementById('buy-financial-note');
  if (note) note.classList.toggle('hidden', score.finKnown || !cwState.vinData);

  card.classList.remove('hidden');
}

function scoreLabel(s) {
  return s >= 80 ? 'Strong' : s >= 65 ? 'OK' : s >= 45 ? 'Caution' : s >= 25 ? 'Risk' : 'Poor';
}

// ════════════════════════════════════════════════════════════════════════════════
// VALUATION ENGINE
// ════════════════════════════════════════════════════════════════════════════════

// Stores the last recall count so valuation can flag it
let lastRecallCount = 0;

// Hide MSRP warning when user manually types a value
document.getElementById('val-msrp').addEventListener('input', () => {
  const warn = document.getElementById('val-msrp-warning');
  if (warn) warn.classList.add('hidden');
});

document.getElementById('btn-val-calc').addEventListener('click', () => {
  const v = cwState.vinData;
  if (!v || !v.year) {
    alert('Look up a VIN first — we need the vehicle year, make, and body type to estimate value.');
    return;
  }

  const mileage   = parseInt(document.getElementById('val-mileage').value);
  const condition = document.getElementById('val-condition').value;
  const userMsrp  = parseFloat(document.getElementById('val-msrp').value) || 0;

  if (!mileage || mileage < 0) { alert('Enter a valid mileage.'); return; }

  const result = computeValuation(v, mileage, condition, userMsrp);
  cwState.valuation = result;
  renderValuation(result, mileage);
  // Update price-msrp with fresh private party value so Price tab uses it
  const priceMsrpEl = document.getElementById('price-msrp');
  if (priceMsrpEl) priceMsrpEl.value = Math.round(result.basePrivate / 100) * 100;
  // Refresh buy score with financial data now available
  const updatedScore = computeBuyScore(result, cwState.price || parseFloat(document.getElementById('price-asking').value) || 0);
  renderBuyAnalysis(updatedScore);
});

function getBodyClass(bodyTypeStr) {
  if (!bodyTypeStr) return 'car';
  const s = bodyTypeStr.toLowerCase();
  const map = window.CW.BODY_CLASS_MAP;
  for (const [key, val] of Object.entries(map)) {
    if (s.includes(key)) return val;
  }
  return 'car';
}

function getMakeDepreciation(makeKey, ageYears) {
  const curve = window.CW.DEPR_CURVES[makeKey] || window.CW.DEPR_CURVES[''];
  const capped = Math.min(ageYears, curve.length - 1);
  const lo = Math.floor(capped), hi = Math.min(lo + 1, curve.length - 1);
  return curve[lo] + (curve[hi] - curve[lo]) * (capped - lo);
}

function getMakeKey(makeStr) {
  // Reuse the same MAKE_MAP from prefillFromVehicle
  return MAKE_MAP[(makeStr || '').toUpperCase()] || '';
}

function computeValuation(vinData, mileage, condition, userMsrp) {
  const currentYear = new Date().getFullYear();
  const vehicleYear = parseInt(vinData.year) || currentYear;
  // Age: use model year; a 2020 vehicle is ~4 years old in 2024
  const ageYears = Math.max(0, currentYear - vehicleYear);

  const makeKey    = getMakeKey(vinData.make);
  const bodyClass  = getBodyClass(vinData.bodyType);
  // Model-level lookup: more accurate MSRP + correct depreciation curve for this exact model
  const modelEntry = window.CW.MODEL_MSRP && window.CW.MODEL_MSRP[getModelKey(vinData.make, vinData.model)];
  const deprMakeKey = modelEntry ? modelEntry.makeKey : makeKey;

  // 1. Determine original MSRP at the vehicle's model year
  let baseMsrp = userMsrp;
  const estimatedMsrp = !userMsrp;
  if (!baseMsrp) {
    // MODEL_MSRP has model-specific 2024 prices; fall back to segment average from BASE_MSRP
    const msrp2024 = modelEntry ? modelEntry.msrp : (window.CW.BASE_MSRP[makeKey] || window.CW.BASE_MSRP[''])[bodyClass] || 30000;
    baseMsrp = Math.round(msrp2024 / Math.pow(1.025, 2024 - vehicleYear) / 500) * 500;
  }

  // 2. Age depreciation — model-specific curve where available, else make group
  const deprFrac   = getMakeDepreciation(deprMakeKey, ageYears);
  const deprAmount = baseMsrp * deprFrac;
  const afterAge   = baseMsrp - deprAmount;

  // 3. Mileage adjustment — percentage-based, scales with vehicle value, capped at ±20%
  const avgMiles   = ageYears * 12000;
  const mileDiff   = mileage - avgMiles;                           // positive = above avg
  const pctPer10k  = window.CW.MILE_PCT_PER_10K[deprMakeKey] || window.CW.MILE_PCT_PER_10K[makeKey] || 2.2;
  const rawPct     = -(mileDiff / 10000) * (pctPer10k / 100);     // negative = penalty
  const clampedPct = Math.max(-0.20, Math.min(0.20, rawPct));
  const mileAdj    = afterAge * clampedPct;

  // 4. Condition multiplier
  const condMult   = window.CW.CONDITION_MULT[condition] || 1.0;

  // 5. Base private party value
  const basePrivate = Math.max(500, (afterAge + mileAdj) * condMult);

  // 6. Derive ranges (±8% around center estimates for each tier)
  const spread = 0.08;
  const tradeIn  = { lo: basePrivate * 0.82 * (1 - spread), hi: basePrivate * 0.82 * (1 + spread) };
  const private_ = { lo: basePrivate * (1 - spread),        hi: basePrivate * (1 + spread)        };
  const retail   = { lo: basePrivate * 1.16 * (1 - spread), hi: basePrivate * 1.16 * (1 + spread) };

  return {
    baseMsrp, estimatedMsrp,
    ageYears, deprAmount, afterAge,
    avgMiles, mileAdj, clampedPct,
    condMult, basePrivate,
    tradeIn, private_, retail,
    makeKey, bodyClass,
  };
}

function renderValuation(r, mileage) {
  const rnd = v => Math.round(v / 100) * 100; // round to nearest $100

  set('val-tradein-lo',  fmt(rnd(r.tradeIn.lo)));
  set('val-tradein-hi',  '– ' + fmt(rnd(r.tradeIn.hi)));
  set('val-private-lo',  fmt(rnd(r.private_.lo)));
  set('val-private-hi',  '– ' + fmt(rnd(r.private_.hi)));
  set('val-retail-lo',   fmt(rnd(r.retail.lo)));
  set('val-retail-hi',   '– ' + fmt(rnd(r.retail.hi)));

  // Breakdown
  set('val-bk-msrp',    fmt(r.baseMsrp) + (r.estimatedMsrp ? ' (segment avg for ' + (cwState.vinData?.year || '') + ')' : ' (you provided)'));
  set('val-bk-age-dep', `–${fmt(r.deprAmount)} (${r.ageYears === 0 ? 0 : (r.deprAmount / r.baseMsrp * 100).toFixed(0)}% over ${r.ageYears} yr${r.ageYears !== 1 ? 's' : ''})`);
  const mileAdjPct = (Math.abs(r.clampedPct) * 100).toFixed(1);
  const mileAdjStr = r.mileAdj >= 0
    ? `+${mileAdjPct}% (${mileage.toLocaleString()} mi is below ${r.avgMiles.toLocaleString()} avg)`
    : `–${mileAdjPct}% (${mileage.toLocaleString()} mi vs ${r.avgMiles.toLocaleString()} avg)`;
  set('val-bk-mile-adj', mileAdjStr);
  const condLabel = { excellent: '+8% (Excellent)', good: '0% (Good)', fair: '–12% (Fair)', poor: '–28% (Poor)' };
  set('val-bk-cond-adj', condLabel[document.getElementById('val-condition').value] || '—');
  set('val-bk-total',    fmt(Math.round(r.basePrivate / 100) * 100));

  // Versus asking price verdict
  const asking = cwState.price || parseFloat(document.getElementById('price-asking').value) || 0;
  const verdictEl = document.getElementById('val-verdict');
  if (asking > 0) {
    const midPrivate = r.basePrivate;
    const midRetail  = r.basePrivate * 1.16;
    verdictEl.classList.remove('hidden', 'alert-green', 'alert-yellow', 'alert-red');
    if (asking < r.tradeIn.lo) {
      verdictEl.className = 'val-verdict alert-card alert-green';
      verdictEl.innerHTML = `<strong>Exceptional Deal</strong> Asking price (${fmt(asking)}) is below even the trade-in range. Verify condition and title — something may be wrong, or this is a steal.`;
    } else if (asking <= r.private_.hi) {
      verdictEl.className = 'val-verdict alert-card alert-green';
      verdictEl.innerHTML = `<strong>Good Deal</strong> Asking price (${fmt(asking)}) is within the fair private party range (${fmt(rnd(r.private_.lo))}–${fmt(rnd(r.private_.hi))}). Reasonable price.`;
    } else if (asking <= midRetail * 1.05) {
      verdictEl.className = 'val-verdict alert-card alert-yellow';
      verdictEl.innerHTML = `<strong>Slightly Overpriced</strong> Asking price (${fmt(asking)}) is above private party but within dealer retail range. Negotiate toward ${fmt(rnd(r.private_.hi))}.`;
    } else {
      verdictEl.className = 'val-verdict alert-card alert-red';
      verdictEl.innerHTML = `<strong>Overpriced</strong> Asking price (${fmt(asking)}) is ${fmt(asking - rnd(r.retail.hi))} above the high end of dealer retail. Walk away or negotiate hard.`;
    }
  } else {
    verdictEl.classList.add('hidden');
  }

  // Recall impact note
  if (lastRecallCount > 0) {
    show('val-recall-note');
  } else {
    hide('val-recall-note');
  }

  show('val-results');
}
