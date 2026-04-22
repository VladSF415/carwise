// CarWise Background Service Worker
// Handles NHTSA API calls with caching to avoid repeated requests

// ── Side panel opens on toolbar click ────────────────────────────────────────
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const NHTSA_VPIC   = 'https://vpic.nhtsa.dot.gov/api/vehicles';
const NHTSA_API    = 'https://api.nhtsa.gov';
const EPA_API      = 'https://www.fueleconomy.gov/ws/rest';

// ── Cache helpers ──────────────────────────────────────────────────────────────
async function getCached(key) {
  const result = await chrome.storage.local.get(key);
  const entry = result[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    chrome.storage.local.remove(key);
    return null;
  }
  return entry.data;
}

async function setCache(key, data) {
  await chrome.storage.local.set({ [key]: { data, ts: Date.now() } });
}

// ── NHTSA: Decode VIN ─────────────────────────────────────────────────────────
async function decodeVIN(vin) {
  const cacheKey = `vin_${vin}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  const url = `${NHTSA_VPIC}/DecodeVin/${vin}?format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`VIN decode failed: ${res.status}`);
  const json = await res.json();

  // Parse results array into a clean object
  const raw = {};
  for (const item of (json.Results || [])) {
    if (item.Value && item.Value !== 'Not Applicable' && item.Value !== '0') {
      raw[item.Variable] = item.Value;
    }
  }

  const data = {
    vin,
    year:         raw['Model Year'] || '',
    make:         raw['Make'] || '',
    model:        raw['Model'] || '',
    trim:         raw['Trim'] || '',
    bodyType:     raw['Body Class'] || '',
    engine:       buildEngineStr(raw),
    drive:        raw['Drive Type'] || '',
    transmission: raw['Transmission Style'] || '',
    doors:        raw['Doors'] || '',
    plant:        raw['Plant Country'] || '',
    fuelType:     raw['Fuel Type - Primary'] || '',
    errorCode:    raw['Error Code'] || '',
  };

  await setCache(cacheKey, data);
  return data;
}

function buildEngineStr(raw) {
  const displ   = raw['Displacement (L)'] ? `${parseFloat(raw['Displacement (L)']).toFixed(1)}L` : '';
  const cyl     = raw['Engine Number of Cylinders'] ? `${raw['Engine Number of Cylinders']}-cyl` : '';
  const hp      = raw['Engine Brake (hp) From'] ? `${raw['Engine Brake (hp) From']}hp` : '';
  const fuel    = raw['Fuel Type - Primary'] || '';
  return [displ, cyl, hp, fuel].filter(Boolean).join(' ') || 'Unknown';
}

// ── NHTSA: Safety Ratings ─────────────────────────────────────────────────────
async function getSafetyRatings(year, make, model) {
  if (!year || !make || !model) return null;
  const cacheKey = `safety_${year}_${make}_${model}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  try {
    // First get the list of vehicle variants
    const listUrl = `${NHTSA_API}/SafetyRatings/modelyear/${year}/make/${encodeURIComponent(make)}/model/${encodeURIComponent(model)}`;
    const listRes = await fetch(listUrl);
    if (!listRes.ok) { await setCache(cacheKey, null); return null; }
    const listJson = await listRes.json();
    const variants = listJson.Results || [];
    if (variants.length === 0) { await setCache(cacheKey, null); return null; }

    // Get ratings for the first variant
    const vehicleId = variants[0].VehicleId;
    const ratingUrl = `${NHTSA_API}/SafetyRatings/VehicleId/${vehicleId}`;
    const ratingRes = await fetch(ratingUrl);
    if (!ratingRes.ok) { await setCache(cacheKey, null); return null; }
    const ratingJson = await ratingRes.json();
    const r = ratingJson.Results && ratingJson.Results[0];
    if (!r) { await setCache(cacheKey, null); return null; }

    const data = {
      overall:  parseInt(r.OverallRating) || 0,
      front:    parseInt(r.FrontCrashDriversideRating || r.OverallFrontCrashRating) || 0,
      side:     parseInt(r.SideCrashDriversideRating  || r.OverallSideCrashRating)  || 0,
      rollover: parseInt(r.RolloverRating) || 0,
      variant:  variants[0].VehicleDescription || '',
    };
    await setCache(cacheKey, data);
    return data;
  } catch {
    await setCache(cacheKey, null);
    return null;
  }
}

// ── NHTSA: Recalls ────────────────────────────────────────────────────────────
async function getRecalls(make, model, year) {
  if (!make || !model || !year) return [];
  const cacheKey = `recalls_${year}_${make}_${model}`;
  const cached = await getCached(cacheKey);
  if (cached !== null) return cached;

  try {
    const url = `${NHTSA_API}/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`;
    const res = await fetch(url);
    if (!res.ok) { await setCache(cacheKey, []); return []; }
    const json = await res.json();
    const results = (json.results || json.Results || []).map(r => ({
      id:          r.NHTSACampaignNumber || r.recallNumber || '',
      component:   r.Component || r.component || '',
      summary:     r.Summary || r.summary || r.Consequence || '',
      remedy:      r.Remedy || r.remedy || '',
      reportDate:  r.ReportReceivedDate || r.reportReceivedDate || '',
      mfgCampaign: r.ManufacturerCampaignNumber || '',
    }));
    await setCache(cacheKey, results);
    return results;
  } catch {
    await setCache(cacheKey, []);
    return [];
  }
}

// ── NHTSA: Complaints ─────────────────────────────────────────────────────────
async function getComplaints(make, model, year) {
  if (!make || !model || !year) return [];
  const cacheKey = `complaints_${year}_${make}_${model}`;
  const cached = await getCached(cacheKey);
  if (cached !== null) return cached;

  try {
    const url = `${NHTSA_API}/complaints/complaintsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`;
    const res = await fetch(url);
    if (!res.ok) { await setCache(cacheKey, []); return []; }
    const json = await res.json();
    const rawComplaints = json.results || json.Results || [];

    // Aggregate by component/category
    const byCat = {};
    for (const c of rawComplaints) {
      const cat = c.components || c.Component || 'Unknown';
      if (!byCat[cat]) byCat[cat] = { count: 0, sample: c.summary || c.Summary || '' };
      byCat[cat].count++;
    }
    const results = Object.entries(byCat)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 6)
      .map(([cat, info]) => ({ category: cat, count: info.count, sample: info.sample }));

    await setCache(cacheKey, results);
    return results;
  } catch {
    await setCache(cacheKey, []);
    return [];
  }
}

// ── NHTSA: Technical Service Bulletins ───────────────────────────────────────
async function getTSBs(make, model, year) {
  if (!make || !model || !year) return [];
  const cacheKey = `tsbs_${year}_${make}_${model}`;
  const cached = await getCached(cacheKey);
  if (cached !== null) return cached;

  try {
    const url = `${NHTSA_API}/tsbs/tsbsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`;
    const res = await fetch(url);
    if (!res.ok) { await setCache(cacheKey, []); return []; }
    const json = await res.json();
    const raw = json.results || json.Results || [];
    const results = raw.map(t => ({
      id:        t.nhtsa_id        || t.id              || '',
      subject:   t.subject         || t.Subject         || 'Unknown System',
      date:      t.date            || t.dateOfIssue     || '',
      mfgNumber: t.manufacturer_communication_number    || t.mfgNumber || '',
    }));
    await setCache(cacheKey, results);
    return results;
  } catch {
    await setCache(cacheKey, []);
    return [];
  }
}

// ── EPA: Fuel Economy ─────────────────────────────────────────────────────────
// Title-case a make string for EPA API (HONDA → Honda, LAND ROVER → Land Rover)
function epaMake(make) {
  return (make || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

async function getFuelEconomy(year, make, model) {
  if (!year || !make || !model) return null;
  const cacheKey = `mpg_${year}_${make}_${model}`;
  const cached = await getCached(cacheKey);
  if (cached !== null) return cached;

  try {
    // Step 1: Find vehicle ID(s) for this year/make/model
    const optUrl = `${EPA_API}/vehicle/menu/options?year=${year}&make=${encodeURIComponent(epaMake(make))}&model=${encodeURIComponent(model)}`;
    const optRes = await fetch(optUrl, { headers: { Accept: 'application/json' } });
    if (!optRes.ok) { await setCache(cacheKey, null); return null; }
    const optJson = await optRes.json();

    const items = optJson.menuItem
      ? (Array.isArray(optJson.menuItem) ? optJson.menuItem : [optJson.menuItem])
      : [];
    if (items.length === 0) { await setCache(cacheKey, null); return null; }

    // Step 2: Fetch MPG data for the first variant
    const vehicleId = items[0].value;
    const vehRes = await fetch(`${EPA_API}/vehicle/${vehicleId}`, { headers: { Accept: 'application/json' } });
    if (!vehRes.ok) { await setCache(cacheKey, null); return null; }
    const v = await vehRes.json();

    const isEV   = (v.fuelType1 || '').toLowerCase().includes('electric');
    const isPhev = (v.fuelType1 || '').toLowerCase().includes('plug-in');
    const data = {
      city:       v.city08    || v.city08b    || 0,
      highway:    v.hwy08     || v.hwy08b     || 0,
      combined:   v.comb08    || v.comb08b    || 0,
      fuelCostYr: v.fuelCost08 || v.fuelCost08b || 0,
      range:      v.range     || 0,
      rangeCity:  v.rangeCity || 0,
      fuelType:   v.fuelType1 || '',
      isEV,
      isPhev,
      variants:   items.length,
    };
    await setCache(cacheKey, data);
    return data;
  } catch {
    await setCache(cacheKey, null);
    return null;
  }
}

// ── Message handler ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'LOOKUP_VIN') {
    (async () => {
      try {
        const vinData = await decodeVIN(msg.vin);

        // Validate decode succeeded
        if (!vinData.make || !vinData.year) {
          sendResponse({ ok: false, error: 'Could not decode this VIN. Verify it is a valid 17-character VIN.' });
          return;
        }

        // Parallel fetch — all free public APIs
        const [safety, recalls, complaints, tsbs, fuelEconomy] = await Promise.all([
          getSafetyRatings(vinData.year, vinData.make, vinData.model),
          getRecalls(vinData.make, vinData.model, vinData.year),
          getComplaints(vinData.make, vinData.model, vinData.year),
          getTSBs(vinData.make, vinData.model, vinData.year),
          getFuelEconomy(vinData.year, vinData.make, vinData.model),
        ]);

        sendResponse({ ok: true, vinData, safety, recalls, complaints, tsbs, fuelEconomy });
      } catch (err) {
        sendResponse({ ok: false, error: err.message || 'Network error. Check your connection.' });
      }
    })();
    return true; // async response
  }
});
