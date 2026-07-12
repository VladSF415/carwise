// GA4 Measurement Protocol helper — works inside MV3 (no external scripts needed)
'use strict';

const _GA_MID = 'G-DJVY4F56DH';
const _GA_SEC = 'tjvRkmAyQFaHk89dlRxejg';

async function _gaClientId() {
  return new Promise(resolve => {
    chrome.storage.local.get('_ga_cid', s => {
      if (s._ga_cid) { resolve(s._ga_cid); return; }
      const cid = `${Math.random().toString(36).slice(2)}.${Date.now()}`;
      chrome.storage.local.set({ _ga_cid: cid });
      resolve(cid);
    });
  });
}

async function track(eventName, params = {}) {
  try {
    const client_id = await _gaClientId();
    fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${_GA_MID}&api_secret=${_GA_SEC}`,
      {
        method: 'POST',
        body: JSON.stringify({ client_id, events: [{ name: eventName, params }] }),
      }
    );
  } catch {}
}
