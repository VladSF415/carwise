// CarWise Content Script
// Detects VINs, price, mileage, and vehicle history from car shopping websites

(function () {
  'use strict';

  const VIN_REGEX = /\b([A-HJ-NPR-Z0-9]{17})\b/g;

  const extractors = {
    'www.carfax.com':     extractCarFax,
    'www.cargurus.com':   extractCarGurus,
    'www.autotrader.com': extractAutoTrader,
    'www.cars.com':       extractCarsDotCom,
    'www.carmax.com':     extractCarMax,
    'www.carvana.com':    extractCarvana,
    'www.truecar.com':    extractTrueCar,
    'www.kbb.com':        extractKBB,
    'www.edmunds.com':    extractEdmunds,
    'www.facebook.com':   extractFacebook,
  };

  function isValidVIN(vin) {
    if (!vin || vin.length !== 17) return false;
    if (/[IOQ]/i.test(vin)) return false;
    if (!/[A-Z]/i.test(vin) || !/[0-9]/.test(vin)) return false;
    if (/^(.)\1+$/.test(vin)) return false;
    return true;
  }

  // ── VIN Extractors ────────────────────────────────────────────────────────

  function extractCarFax() {
    const urlMatch = window.location.pathname.match(/\/vehicle\/([A-HJ-NPR-Z0-9]{17})/i);
    if (urlMatch && isValidVIN(urlMatch[1])) return { vin: urlMatch[1].toUpperCase(), source: 'CARFAX' };
    const vinEl = document.querySelector('[data-vin], [data-vehicle-vin]');
    if (vinEl) {
      const vin = vinEl.getAttribute('data-vin') || vinEl.getAttribute('data-vehicle-vin');
      if (isValidVIN(vin)) return { vin: vin.toUpperCase(), source: 'CARFAX' };
    }
    return findVINInText('CARFAX');
  }

  function extractCarGurus() {
    const vinEl = document.querySelector('[data-cg-vin], [data-vin]');
    if (vinEl) {
      const vin = vinEl.getAttribute('data-cg-vin') || vinEl.getAttribute('data-vin');
      if (isValidVIN(vin)) return { vin: vin.toUpperCase(), source: 'CarGurus' };
    }
    return findVINInText('CarGurus');
  }

  function extractAutoTrader() {
    const detailItems = document.querySelectorAll('[data-qaid="vehicleDetailsRow"] span, .specs-item, [class*="vin"]');
    for (const el of detailItems) {
      const matches = el.textContent.match(VIN_REGEX);
      if (matches && isValidVIN(matches[0])) return { vin: matches[0].toUpperCase(), source: 'AutoTrader' };
    }
    return findVINInText('AutoTrader');
  }

  function extractCarsDotCom() {
    for (const dt of document.querySelectorAll('dt')) {
      if (dt.textContent.toLowerCase().includes('vin')) {
        const dd = dt.nextElementSibling;
        if (dd) {
          const vin = dd.textContent.trim().replace(/\s/g, '');
          if (isValidVIN(vin)) return { vin: vin.toUpperCase(), source: 'Cars.com' };
        }
      }
    }
    return findVINInText('Cars.com');
  }

  function extractCarMax() {
    const vinEl = document.querySelector('[data-qa="vin-number"], [data-testid="vin"]');
    if (vinEl) {
      const vin = vinEl.textContent.trim().replace(/\s/g, '');
      if (isValidVIN(vin)) return { vin: vin.toUpperCase(), source: 'CarMax' };
    }
    return findVINInText('CarMax');
  }

  function extractCarvana() {
    const urlMatch = window.location.pathname.match(/([A-HJ-NPR-Z0-9]{17})(?:\/|$)/i);
    if (urlMatch && isValidVIN(urlMatch[1])) return { vin: urlMatch[1].toUpperCase(), source: 'Carvana' };
    for (const el of document.querySelectorAll('[data-qa*="vin"], [class*="vin"]')) {
      if (isValidVIN(el.textContent.trim())) return { vin: el.textContent.trim().toUpperCase(), source: 'Carvana' };
    }
    return findVINInText('Carvana');
  }

  function extractTrueCar() { return findVINInText('TrueCar'); }
  function extractKBB()      { return findVINInText('KBB'); }
  function extractFacebook() { return findVINInText('Facebook Marketplace'); }

  function extractCraigslist() {
    // 1. Posting body — sellers sometimes write "VIN: 1HGBH41JXMN109186"
    const bodyEl = document.getElementById('postingbody');
    if (bodyEl) {
      const matches = bodyEl.textContent.match(VIN_REGEX);
      if (matches) {
        for (const m of matches) {
          if (isValidVIN(m)) return { vin: m.toUpperCase(), source: 'Craigslist' };
        }
      }
    }
    // 2. Attributes section (old CL: <span><b>vin: </b>1HGBH41...</span>)
    for (const el of document.querySelectorAll('.attrgroup span, .attr .valu')) {
      const matches = el.textContent.match(VIN_REGEX);
      if (matches) {
        for (const m of matches) {
          if (isValidVIN(m)) return { vin: m.toUpperCase(), source: 'Craigslist' };
        }
      }
    }
    return findVINInText('Craigslist');
  }

  // Extract Craigslist attribute group into a key→value map.
  // Handles both old format (<span><b>key: </b>val</span>)
  // and new format (<div class="attr"><span class="labl">key</span><span class="valu">val</span></div>).
  function getCraigslistAttrs() {
    const attrs = {};
    // Old format
    for (const span of document.querySelectorAll('.attrgroup span')) {
      const bold = span.querySelector('b');
      if (bold) {
        const key = bold.textContent.replace(/:?\s*$/, '').trim().toLowerCase();
        const val = span.textContent.replace(bold.textContent, '').trim().toLowerCase();
        if (key && val) attrs[key] = val;
      }
    }
    // New format
    for (const attr of document.querySelectorAll('.attr')) {
      const labl = attr.querySelector('.labl, b');
      const valu = attr.querySelector('.valu');
      if (labl && valu) {
        attrs[labl.textContent.replace(/:?\s*$/, '').trim().toLowerCase()] = valu.textContent.trim().toLowerCase();
      }
    }
    return attrs;
  }

  function extractEdmunds() {
    const vinEl = document.querySelector('[data-vin], [data-tracking-vin]');
    if (vinEl) {
      const vin = vinEl.getAttribute('data-vin') || vinEl.getAttribute('data-tracking-vin');
      if (isValidVIN(vin)) return { vin: vin.toUpperCase(), source: 'Edmunds' };
    }
    return findVINInText('Edmunds');
  }

  function findVINInText(source) {
    const selectors = ['h1','h2','h3','p','span','li','td','th','div[class*="vin"]','div[class*="detail"]','div[class*="spec"]','div[class*="info"]'];
    const seen = new Set();
    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        if (el.children.length > 5) continue;
        const matches = el.textContent.match(VIN_REGEX);
        if (matches) {
          for (const m of matches) {
            if (isValidVIN(m) && !seen.has(m)) { seen.add(m); return { vin: m.toUpperCase(), source }; }
          }
        }
      }
    }
    return null;
  }

  // ── Price Extraction ──────────────────────────────────────────────────────

  function extractPrice() {
    // 0. Craigslist: <span class="price">$10,495</span>
    if (window.location.hostname.endsWith('.craigslist.org')) {
      const priceEl = document.querySelector('span.price, .price');
      if (priceEl) {
        const match = priceEl.textContent.match(/\$?([\d,]+)/);
        if (match) {
          const val = parseInt(match[1].replace(/,/g, ''));
          if (val > 500 && val < 500000) return val;
        }
      }
    }

    // 1. JSON-LD structured data (most reliable — used by CARFAX, Edmunds, etc.)
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const data = JSON.parse(script.textContent);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const price = item?.offers?.price ?? item?.price;
          if (price) {
            const val = parseInt(String(price).replace(/[$,]/g, ''));
            if (val > 1000 && val < 500000) return val;
          }
        }
      } catch (_) {}
    }

    // 2. Open Graph / meta price tags
    const metaPrice = document.querySelector('meta[property="og:price:amount"], meta[name="price"], meta[itemprop="price"]');
    if (metaPrice) {
      const val = parseInt((metaPrice.getAttribute('content') || '').replace(/[$,]/g, ''));
      if (val > 1000 && val < 500000) return val;
    }

    // 3. Page title (many listing sites include price: "2012 Toyota Prius Five - $10,495")
    const titleMatch = document.title.match(/\$(\d{1,3}(?:,\d{3})+)/);
    if (titleMatch) {
      const val = parseInt(titleMatch[1].replace(/,/g, ''));
      if (val > 1000 && val < 500000) return val;
    }

    // 4. Site-specific selectors as a fallback
    const siteSelectors = {
      'www.cargurus.com':   '[data-testid="price-section"] [class*="price"], .priceBox .price',
      'www.autotrader.com': '[data-qaid="price-section"] .price-section-price, [data-qaid="finalPrice"]',
      'www.cars.com':       '.listing-price, .price-section .primary-price',
      'www.carmax.com':     '[data-qa="vehicle-price"], .vehicle-price',
      'www.carvana.com':    '[data-qa="purchase-price"]',
      'www.edmunds.com':    '[data-tracking-id="usurp-price"], .price-section',
      'www.kbb.com':        '[class*="listing-price"], .price-section',
    };
    const sel = siteSelectors[window.location.hostname];
    if (sel) {
      const el = document.querySelector(sel);
      if (el) {
        const match = el.textContent.match(/\$(\d{1,3}(?:,\d{3})+)/);
        if (match) {
          const val = parseInt(match[1].replace(/,/g, ''));
          if (val > 1000 && val < 500000) return val;
        }
      }
    }

    // 5. Generic: first plausible price in a price-classed element
    const priceEls = document.querySelectorAll('[class*="price"]:not([class*="carfax"]):not([class*="market"]):not([class*="was"]):not([class*="original"])');
    for (const el of priceEls) {
      const parent = el.closest('[class*="carfax-value"], [class*="market-value"]');
      if (parent) continue;
      const match = el.textContent.match(/\$(\d{1,3}(?:,\d{3})+)/);
      if (match) {
        const val = parseInt(match[1].replace(/,/g, ''));
        if (val > 1000 && val < 500000) return val;
      }
    }

    // 6. Leaf-element text scan — handles React/hashed-class sites.
    //    Look for elements whose entire text is just a price like "$14,590"
    const leafEls = document.querySelectorAll('span, p, div, h1, h2, h3, strong, b');
    for (const el of leafEls) {
      if (el.children.length > 1) continue;
      const text = el.textContent.trim();
      const exact = text.match(/^\$(\d{1,3}(?:,\d{3})+)\s*$/);
      if (exact) {
        const val = parseInt(exact[1].replace(/,/g, ''));
        if (val > 1000 && val < 500000) return val;
      }
    }

    return null;
  }

  // ── Mileage Extraction ────────────────────────────────────────────────────

  function extractMileage() {
    // 0. Craigslist: odometer in attribute group
    if (window.location.hostname.endsWith('.craigslist.org')) {
      const attrs = getCraigslistAttrs();
      if (attrs['odometer']) {
        const val = parseInt(attrs['odometer'].replace(/,/g, ''));
        if (val > 0 && val < 500000) return val;
      }
    }

    // JSON-LD mileage
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const data = JSON.parse(script.textContent);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const mi = item?.mileageFromOdometer?.value ?? item?.mileage;
          if (mi) {
            const val = parseInt(String(mi).replace(/,/g, ''));
            if (val > 0 && val < 500000) return val;
          }
        }
      } catch (_) {}
    }

    // Page title: "2012 Toyota Prius · $10,495 · 110,900 mi"
    const titleMatch = document.title.match(/([\d,]+)\s*mi(?:les?)?\b/i);
    if (titleMatch) {
      const val = parseInt(titleMatch[1].replace(/,/g, ''));
      if (val > 0 && val < 500000) return val;
    }

    // 3. Known data-attribute selectors (work on some sites)
    const attrSelectors = [
      '[class*="mileage"]', '[class*="odometer"]',
      '[data-qa*="mileage"]', '[data-testid*="mileage"]',
      '[data-qaid*="mileage"]', '[itemprop="mileageFromOdometer"]',
    ];
    for (const sel of attrSelectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const match = el.textContent.match(/([\d,]+)\s*mi(?:les?)?\b/i);
      if (match) {
        const val = parseInt(match[1].replace(/,/g, ''));
        if (val > 0 && val < 500000) return val;
      }
    }

    // 4. Text scan — find any leaf-level element whose entire text is a mileage value.
    //    Handles React/hashed-class sites where CSS selectors are useless.
    //    "149,000 mi"  /  "149,000 miles"  /  "149K mi"
    const leafEls = document.querySelectorAll('span, p, div, li, td, dd, h1, h2, h3');
    for (const el of leafEls) {
      if (el.children.length > 2) continue;          // skip containers
      const text = el.textContent.trim();
      // Exact match: the element contains ONLY a mileage value
      const exact = text.match(/^([\d,]+)\s*mi(?:les?)?\s*$/i)
                 || text.match(/^([\d,.]+)[kK]\s*mi(?:les?)?\s*$/i);
      if (exact) {
        let val = parseFloat(exact[1].replace(/,/g, ''));
        if (/[kK]/.test(text)) val *= 1000;
        val = Math.round(val);
        if (val >= 1000 && val <= 350000) return val;
      }
    }

    // 5. h1/h2 inline mileage — "Used 2012 Toyota Prius · 110,900 mi"
    for (const sel of ['h1', 'h2', '[class*="subtitle"]', '[class*="listing-title"]']) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const match = el.textContent.match(/([\d,]+)\s*mi(?:les?)?\b/i);
      if (match) {
        const val = parseInt(match[1].replace(/,/g, ''));
        if (val >= 1000 && val <= 350000) return val;
      }
    }

    // 6. Last resort: full body text scan — catches any remaining site
    const bodyText = document.body.innerText;
    const bodyMatches = bodyText.matchAll(/([\d,]+)\s*mi(?:les?)?\b/gi);
    for (const m of bodyMatches) {
      const val = parseInt(m[1].replace(/,/g, ''));
      if (val >= 5000 && val <= 350000) return val;   // tighter range to avoid false positives
    }

    return null;
  }

  // ── Vehicle History Extraction (CARFAX + generic) ─────────────────────────
  // Text-pattern approach — resilient to CSS class changes

  function extractHistory() {
    const hostname = window.location.hostname;

    // Craigslist: extract what we can from the attribute group
    if (hostname.endsWith('.craigslist.org')) {
      const attrs = getCraigslistAttrs();
      if (Object.keys(attrs).length === 0) return null;
      const history = {};
      let found = 0;

      // Condition → map to title field
      if (attrs['condition']) {
        const c = attrs['condition'];
        if (c === 'like new' || c === 'excellent')   { history.title = 'Excellent Condition'; found++; }
        else if (c === 'good')                        { history.title = 'Good Condition'; found++; }
        else if (c === 'fair')                        { history.title = 'Fair Condition'; found++; }
        else if (c === 'salvage')                     { history.title = 'Salvage Title'; found++; }
      }
      // Title status
      if (attrs['title status']) {
        const t = attrs['title status'];
        if (t === 'clean')        { history.title = 'Clean Title'; found++; }
        else if (t === 'salvage') { history.title = 'Salvage Title'; found++; }
        else if (t === 'rebuilt') { history.title = 'Rebuilt Title'; found++; }
        else if (t === 'lien')    { history.title = 'Lien on Title'; found++; }
        else if (t === 'missing') { history.title = 'Title Missing'; found++; }
        else if (t === 'parts only') { history.title = 'Parts Only'; found++; }
      }

      return found > 0 ? history : null;
    }

    // Only attempt on known history-report pages
    const historyHosts = ['www.carfax.com', 'www.cargurus.com', 'www.autotrader.com',
                          'www.cars.com', 'www.carmax.com', 'www.carvana.com', 'www.edmunds.com'];
    if (!historyHosts.includes(hostname)) return null;

    const text = document.body.innerText;
    const history = {};
    let found = 0;

    // ── Owners ──
    const ownerMatch = text.match(/(\d+)\s*(?:Previous\s+)?Owner[s]?\b/i);
    if (ownerMatch) { history.owners = parseInt(ownerMatch[1]); found++; }

    // ── Accidents / damage reports ──
    if (/No\s+(Reported\s+)?Accident[s]?/i.test(text)) {
      history.accidents = 0; found++;
    } else {
      const accMatch = text.match(/(\d+)\s+(?:Reported\s+)?Accident[s]?/i);
      if (accMatch) { history.accidents = parseInt(accMatch[1]); found++; }
    }

    // ── Damage type ──
    if (/Minor\s+Damage/i.test(text))        { history.damage = 'minor'; found++; }
    else if (/Major\s+Damage/i.test(text))   { history.damage = 'major'; found++; }
    else if (/No\s+(?:Reported\s+)?Damage/i.test(text)) { history.damage = 'none'; found++; }

    // ── Usage / purpose ──
    if (/Personal\s+Use/i.test(text))        { history.usage = 'Personal Use'; found++; }
    else if (/(?:Rental|Rent-a-car)/i.test(text)) { history.usage = 'Rental Vehicle'; found++; }
    else if (/Fleet/i.test(text))            { history.usage = 'Fleet Vehicle'; found++; }
    else if (/Lease\s+Return/i.test(text))   { history.usage = 'Lease Return'; found++; }

    // ── Title status ──
    if (/Clean\s+Title/i.test(text))         { history.title = 'Clean Title'; found++; }
    else if (/Salvage\s+Title/i.test(text))  { history.title = 'Salvage Title'; found++; }
    else if (/Rebuilt\s+Title/i.test(text))  { history.title = 'Rebuilt Title'; found++; }
    else if (/Lemon\s+Law/i.test(text))      { history.title = 'Lemon Law Buyback'; found++; }
    else if (/Flood\s+Damage/i.test(text))   { history.title = 'Flood Damage'; found++; }

    // ── Service records ──
    if (/Service\s+Histor|Service\s+Record|\d+\s+Service\s+Record/i.test(text)) {
      const svcMatch = text.match(/(\d+)\s+Service\s+Record/i);
      history.serviceRecords = svcMatch ? parseInt(svcMatch[1]) : true;
      found++;
    }

    // ── CARFAX price rating ──
    if (/\bGreat\s+(?:Value|Price)\b/i.test(text))  { history.priceRating = 'Great Value'; found++; }
    else if (/\bGood\s+(?:Value|Price)\b/i.test(text)) { history.priceRating = 'Good Value'; found++; }
    else if (/\bFair\s+(?:Price|Value)\b/i.test(text)) { history.priceRating = 'Fair Price'; found++; }
    else if (/\bHigh\s+Price\b/i.test(text))        { history.priceRating = 'High Price'; found++; }
    else if (/\bOverpriced\b/i.test(text))           { history.priceRating = 'Overpriced'; found++; }

    // ── Open recalls on CARFAX page ──
    const openRecallMatch = text.match(/(\d+)\s+Open\s+Recall[s]?/i);
    if (openRecallMatch) { history.openRecalls = parseInt(openRecallMatch[1]); found++; }
    else if (/No\s+Open\s+Recall[s]?/i.test(text)) { history.openRecalls = 0; found++; }

    // ── Frame / Structural Damage ──
    if (/No\s+(?:Reported\s+)?Frame\s+Damage/i.test(text) || /No\s+Structural\s+Damage/i.test(text)) {
      history.frameDamage = false; found++;
    } else if (/Frame\s+Damage(?:\s+Reported)?/i.test(text) || /Structural\s+Damage\s+Reported/i.test(text)) {
      history.frameDamage = true; found++;
    }

    // ── Airbag Deployment ──
    if (/No\s+Airbag\s+Deploy/i.test(text)) {
      history.airbagDeployed = false; found++;
    } else if (/Airbag[s]?\s+Deploy(?:ment|ed|s)/i.test(text)) {
      history.airbagDeployed = true; found++;
    }

    // ── Total Loss ──
    if (/No\s+(?:Reported\s+)?Total\s+Loss/i.test(text)) {
      history.totalLoss = false; found++;
    } else if (/Total\s+Loss(?:\s+Reported)?/i.test(text)) {
      history.totalLoss = true; found++;
    }

    // ── CARFAX Buyback Guarantee ──
    if (/CARFAX\s+Buyback\s+Guarantee/i.test(text)) {
      history.buybackGuarantee = true; found++;
    }

    // ── Days on market (CARFAX / CarGurus / Autotrader) ──
    const domMatch = text.match(/(?:Listed|On\s+Market)\s+(\d+)\s+Days?\s+Ago/i)
                  || text.match(/(\d+)\s+Days?\s+on\s+(?:Market|Autotrader|CarGurus)/i);
    if (domMatch) { history.daysOnMarket = parseInt(domMatch[1]); found++; }

    // ── CarGurus / Cars.com deal rating ──
    if (/Great\s+Deal/i.test(text))        { history.dealRating = 'Great Deal'; found++; }
    else if (/Good\s+Deal/i.test(text))    { history.dealRating = 'Good Deal'; found++; }
    else if (/Fair\s+Deal/i.test(text))    { history.dealRating = 'Fair Deal'; found++; }
    else if (/Below\s+Average\s+Deal/i.test(text)) { history.dealRating = 'Below Average'; found++; }
    else if (/(?:No\s+Price\s+Analysis|Overpriced)/i.test(text) && hostname !== 'www.carfax.com') {
      history.dealRating = 'Overpriced'; found++;
    }

    return found > 0 ? history : null;
  }

  // ── Master data getter ────────────────────────────────────────────────────

  function getData() {
    const hostname = window.location.hostname;
    let result = null;
    if (hostname.endsWith('.craigslist.org')) {
      result = extractCraigslist();
    } else {
      const extractor = extractors[hostname];
      result = extractor ? extractor() : findVINInText('this page');
    }
    return {
      vin:          result ? result.vin    : null,
      source:       result ? result.source : null,
      price:        extractPrice(),
      mileage:      extractMileage(),
      history:      extractHistory(),
      url:          window.location.href,
      isCarListing: isCarListingPage(),
    };
  }

  function isCarListingPage() {
    const url = window.location.href;
    const hostname = window.location.hostname;
    // Craigslist car listing paths: /cto/ (by owner), /ctd/ (by dealer), /cta/ (all)
    if (hostname.endsWith('.craigslist.org') && /\/(cto|ctd|cta)\//.test(url)) return true;
    const title = document.title.toLowerCase();
    const kw = ['for sale', 'used', 'vin', 'mileage', 'mpg', 'sedan', 'suv', 'truck', 'coupe', 'hatchback'];
    return kw.some(k => title.includes(k)) || /\/listing|\/vdp|\/cars\/|vehicle/.test(url);
  }

  function run() {
    chrome.runtime.sendMessage({ action: 'PAGE_DATA', data: getData() });
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === 'GET_PAGE_DATA') {
      sendResponse(getData());
      return true;
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    setTimeout(run, 1500); // extra delay for SPAs + React hydration
  }
})();
