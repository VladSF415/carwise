// CarWise Data — Add-ons, Holdbacks, Dealer Tactics
// All data is based on publicly available consumer research

window.CW = window.CW || {};

// ── F&I Add-On Database ───────────────────────────────────────────────────────
window.CW.ADDONS = [
  {
    name: 'GAP Insurance',
    dealerPrice: '$500–$1,000 (one-time)',
    realCost: '$20–$50/yr through your auto insurer',
    verdict: 'skip',
    verdictLabel: 'Skip',
    savings: 'Save $450–$950',
    script: '"I already called my insurance company — they\'ll add GAP coverage for about $3 a month. Same protection, so I\'ll be declining yours. Thank you."',
    tip: 'Call your auto insurance provider and add GAP coverage for $2–5/month. Exact same protection at a fraction of the cost. Only consider the dealer\'s GAP if you\'re financing over 90% of the vehicle value and have no alternative.',
    details: [
      { label: 'Dealer markup', val: '1,000%+ over actual cost' },
      { label: 'When you need it', val: 'If you owe more than the car is worth' },
      { label: 'Better alternative', val: 'Add to existing auto policy' },
    ],
  },
  {
    name: 'Extended Warranty (Service Contract)',
    dealerPrice: '$1,000–$3,000',
    realCost: 'Negotiable — dealers mark up 50–200%',
    verdict: 'negotiate',
    verdictLabel: 'Negotiate',
    savings: 'Negotiate hard or wait',
    script: '"I\'m not going to decide on the extended warranty today. Can you email me the full terms and pricing? I know I can purchase manufacturer-backed coverage any time before my factory warranty expires."',
    tip: 'You do NOT have to decide today. Manufacturer-backed extended warranties can be purchased any time before your factory warranty expires. Never buy from the F&I office on the spot — compare prices online or at other dealers first.',
    details: [
      { label: 'Typical markup', val: '50–200% over dealer cost' },
      { label: 'Coverage tip', val: 'Verify what\'s excluded (wear items are usually not covered)' },
      { label: 'Better alternative', val: 'Buy later online or negotiate the price down 40–60%' },
    ],
  },
  {
    name: 'Paint Protection / Ceramic Coating',
    dealerPrice: '$500–$1,500',
    realCost: '$50–$200 actual cost',
    verdict: 'skip',
    verdictLabel: 'Skip',
    savings: 'Save $300–$1,300',
    script: '"I\'ll be taking the car to a professional detailer for paint protection — they use actual ceramic coating, not a spray sealant. Please remove that from the contract."',
    tip: 'Standard manufacturer warranties already cover paint defects for 3 years. Aftermarket ceramic coating from a detailer costs $200–$600 and is far higher quality than dealer-applied spray sealants.',
    details: [
      { label: 'Dealer markup', val: '250–700% over actual cost' },
      { label: 'What it actually is', val: 'Often just a spray-on polymer sealant, not true ceramic' },
      { label: 'Better alternative', val: 'Professional ceramic coat from a detailer ($300–$600)' },
    ],
  },
  {
    name: 'Fabric / Leather Protection',
    dealerPrice: '$200–$600',
    realCost: '$20–$50 (can DIY with Scotchgard)',
    verdict: 'skip',
    verdictLabel: 'Skip',
    savings: 'Save $150–$550',
    script: '"A can of Scotchgard at the hardware store does the same job for $12. I\'ll handle the interior protection myself — please take that off the deal."',
    tip: 'A $12 can of Scotchgard fabric protector does the same job. Leather conditioner costs $15. Decline this entirely.',
    details: [
      { label: 'Dealer markup', val: '400–1,200% over actual cost' },
      { label: 'DIY cost', val: '$12–$20 at any hardware store' },
    ],
  },
  {
    name: 'Rustproofing / Undercoating',
    dealerPrice: '$200–$1,200',
    realCost: 'Unnecessary on modern cars',
    verdict: 'skip',
    verdictLabel: 'Skip',
    savings: 'Save $200–$1,200',
    script: '"The manufacturer already rust-treats the car at the factory, and the corrosion warranty covers rust-through perforation. I\'ll be declining the rustproofing."',
    tip: 'Modern vehicles come factory-treated for rust. Manufacturer warranties cover rust-through perforation for 5–7 years (unlimited mileage on most brands). This add-on is pure profit for the dealer.',
    details: [
      { label: 'Factory coverage', val: 'Most brands: 5–7 yr rust-through warranty' },
      { label: 'Risk', val: 'Dealer-applied undercoating can actually trap moisture' },
    ],
  },
  {
    name: 'VIN Etching',
    dealerPrice: '$200–$350',
    realCost: '$10–$20 (DIY kit from Amazon)',
    verdict: 'skip',
    verdictLabel: 'Skip',
    savings: 'Save $180–$330',
    script: '"VIN etching kits are $20 on Amazon and take 10 minutes. If it\'s already been done, I want that reflected as a price reduction — I won\'t pay $200+ for this."',
    tip: 'VIN etching kits cost $20 on Amazon and take 10 minutes. Many dealers etch cars before you arrive — if it\'s already done, demand they reduce the price rather than adding it to your tab.',
    details: [
      { label: 'Dealer markup', val: '300–1,000% over cost' },
      { label: 'DIY kit', val: '~$20 on Amazon' },
      { label: 'Theft deterrent value', val: 'Minimal — professional thieves remove glass anyway' },
    ],
  },
  {
    name: 'Nitrogen Tire Fill',
    dealerPrice: '$100–$400',
    realCost: '~$10 (or free at many tire shops)',
    verdict: 'skip',
    verdictLabel: 'Skip',
    savings: 'Save $90–$390',
    script: '"Regular air is already 78% nitrogen, and Costco fills tires with nitrogen for free. The benefit is marginal for everyday driving — I\'ll be passing on this."',
    tip: 'Nitrogen keeps tires slightly more stable in temperature extremes, but the difference vs regular air is negligible for most drivers. Many Costco and tire shops fill with nitrogen for free. Decline this.',
    details: [
      { label: 'Actual benefit', val: 'Marginal — ~1–2 PSI more stable than air' },
      { label: 'Free alternative', val: 'Costco, many tire shops fill with nitrogen free' },
    ],
  },
  {
    name: 'Tire & Wheel Protection',
    dealerPrice: '$300–$700',
    realCost: 'Varies by coverage',
    verdict: 'negotiate',
    verdictLabel: 'Consider',
    savings: 'Negotiate or skip',
    script: '"Before I decide, I need to see the full list of exclusions in writing. I\'ll also check if my auto insurance already covers road hazard damage before committing to anything."',
    tip: 'May be worth it if you live in an area with potholes and road hazards. Verify what\'s excluded — cosmetic scratches often aren\'t covered. Read the fine print before agreeing.',
    details: [
      { label: 'Typical coverage', val: 'Punctures, bent rims, blowouts from road hazards' },
      { label: 'Common exclusions', val: 'Cosmetic damage, gradual wear, off-road damage' },
      { label: 'Check first', val: 'Your auto insurance may already cover this' },
    ],
  },
  {
    name: 'Key Fob / Key Replacement Protection',
    dealerPrice: '$200–$400',
    realCost: '$150–$300 to replace via dealer or locksmith',
    verdict: 'skip',
    verdictLabel: 'Skip',
    savings: 'Save $50–$100 on paper',
    script: '"I\'m going to check with my insurance company whether key replacement is covered under comprehensive first. If it\'s not, I can always buy a plan later — I\'ll pass for now."',
    tip: 'Aftermarket key fob replacement costs less than the protection plan in most cases. Skip unless the OEM key costs $400+ (some luxury brands). Check your auto insurance — keys may be covered under comprehensive.',
    details: [
      { label: 'Real replacement cost', val: '$150–$300 for most vehicles' },
      { label: 'Better option', val: 'Check auto insurance comprehensive coverage' },
    ],
  },
  {
    name: 'Credit Life / Disability Insurance',
    dealerPrice: 'Rolled into loan payment',
    realCost: 'Term life is 50–70% cheaper',
    verdict: 'skip',
    verdictLabel: 'Skip',
    savings: 'Buy term life instead',
    script: '"I have existing life insurance that covers my debts, and rolling insurance into a loan means I\'d pay interest on it. Please remove the credit life and disability from the contract."',
    tip: 'Credit life pays off your auto loan if you die; credit disability covers payments if you\'re injured. Both are massively overpriced when financed into your loan (you pay interest on the insurance). A standard term life policy provides far better coverage at a fraction of the cost.',
    details: [
      { label: 'Hidden cost', val: 'Interest charges on insurance rolled into loan' },
      { label: 'Better alternative', val: 'Term life insurance covers all debts, not just this loan' },
      { label: 'Post-claim risk', val: 'Pre-existing conditions often denied after claim' },
    ],
  },
];

// ── Dealer Holdback by Manufacturer ──────────────────────────────────────────
// Source: industry data — approximate, varies by year/model
window.CW.HOLDBACKS = {
  domestic: { pct: 0.03, label: '~3% of MSRP', desc: 'Ford, GM, Chrysler/RAM, Jeep, Dodge, Buick, GMC, Cadillac' },
  toyota:   { pct: 0.02, label: '~2% of MSRP', desc: 'Toyota, Lexus' },
  honda:    { pct: 0.02, label: '~2% of MSRP', desc: 'Honda, Acura' },
  nissan:   { pct: 0.02, label: '~2% of MSRP', desc: 'Nissan, Infiniti' },
  hyundai:  { pct: 0.015,label: '~1.5% of MSRP',desc: 'Hyundai, Kia, Genesis' },
  subaru:   { pct: 0.02, label: '~2% of MSRP', desc: 'Subaru' },
  mazda:    { pct: 0.02, label: '~2% of MSRP', desc: 'Mazda' },
  vw:       { pct: 0.02, label: '~2% of MSRP', desc: 'Volkswagen, Audi' },
  bmw:      { pct: 0.02, label: '~2% of MSRP', desc: 'BMW, Mini' },
  mercedes: { pct: 0.02, label: '~2% of MSRP', desc: 'Mercedes-Benz' },
  luxury:   { pct: 0.02, label: '~2% of MSRP', desc: 'Cadillac, Lincoln, Volvo, Land Rover' },
  '':       { pct: 0.02, label: '~2–3% of MSRP', desc: 'Average estimate' },
};

// Invoice discount from MSRP by make group (approximate)
window.CW.INVOICE_DISCOUNT = {
  domestic: 0.04,  // 4% below MSRP
  toyota:   0.03,
  honda:    0.03,
  nissan:   0.04,
  hyundai:  0.04,
  subaru:   0.025,
  mazda:    0.03,
  vw:       0.04,
  bmw:      0.06,
  mercedes: 0.06,
  luxury:   0.05,
  '':       0.04,
};

// ── APR Benchmarks by Credit Score (2026 data) ──────────────────────────────
window.CW.APR_BENCHMARKS = [
  { tier: 'Excellent (760–850)', newCar: 5.5,  usedCar: 7.0  },
  { tier: 'Good (700–759)',      newCar: 7.5,  usedCar: 9.5  },
  { tier: 'Fair (640–699)',      newCar: 12.0, usedCar: 15.0 },
  { tier: 'Poor (500–639)',      newCar: 17.0, usedCar: 21.0 },
];

// ── Dealer Tactics Database ───────────────────────────────────────────────────
window.CW.TACTICS = [
  {
    name: 'Four-Square Method',
    color: 'tactic-red',
    desc: 'A worksheet divided into 4 boxes: vehicle price, trade-in, down payment, and monthly payment. Dealers shuffle numbers between boxes to obscure the true total cost. Signing the sheet is treated as an "agreement to buy." Counter-tactic: negotiate ONLY on the total out-the-door price. Never discuss monthly payments until total price is agreed.',
  },
  {
    name: 'Monthly Payment Focus',
    color: 'tactic-red',
    desc: '"What do you want to pay per month?" shifts focus from total cost. Dealers extend loan terms to hit your payment while raising the price. An extra $50/month = $3,000 over a 60-month loan. Always negotiate the total price first — the monthly payment is just math afterward.',
  },
  {
    name: 'Yo-Yo Financing (Spot Delivery)',
    color: 'tactic-red',
    desc: 'Dealer lets you take the car home before financing is finalized. Days later: "financing fell through — sign new contract with worse terms or return the car." Legal in most states. Defense: get written financing approval BEFORE taking delivery. Never drive off until you have a signed, finalized contract.',
  },
  {
    name: 'Trade-in Lowball',
    color: 'tactic-yellow',
    desc: 'Dealers offer $2,000–$5,000 below fair value, often using vague "condition issues." Strategy: get CarMax and Carvana written offers first (takes 30 min). Use those as your floor. Always negotiate the new car price before revealing you have a trade-in.',
  },
  {
    name: 'Market Adjustment / ADM',
    color: 'tactic-yellow',
    desc: 'Extra charge above MSRP on high-demand vehicles — can be $2,000 to $25,000+. It is legal but entirely negotiable. Walk away; other dealers likely sell the same car without ADM. Check CarGurus or Edmunds for inventory at MSRP.',
  },
  {
    name: 'Payment Packing',
    color: 'tactic-yellow',
    desc: 'Finance office quotes $50/month more than necessary, then silently adds warranties, paint protection, and GAP insurance to "fill the gap." Review every line item of the contract BEFORE signing. Never agree verbally — get every item in writing first.',
  },
  {
    name: 'Dealer-Installed Options',
    color: 'tactic-yellow',
    desc: 'A second "addendum sticker" next to the window sticker lists dealer add-ons already on the car (floor mats, tinted windows, paint sealant, wheel locks). These are marked up 100–170%. Some can\'t be physically removed but the cost can be negotiated off the price.',
  },
  {
    name: 'Bait & Switch Pricing',
    color: 'tactic-red',
    desc: 'Online price requires a trade-in, rebates you don\'t qualify for, or is for a different trim. Ask for the "out-the-door" price in writing via email before visiting. This filters out bait-and-switch dealers quickly.',
  },
];

// ── Valuation Engine Data ─────────────────────────────────────────────────────

// Per-make-group depreciation curves — cumulative % lost from MSRP by age (index = years).
// Calibrated against CarEdge / iSeeCars / KBB 2024 retention studies.
// Honda Civic: 69.6% retained at 5yr → ~30% lost. BMW X5: ~69% lost at 5yr.
window.CW.DEPR_CURVES = {
  //                0    1     2     3     4     5     6     7     8     9    10    11    12    13    14
  honda:    [0, .13, .21, .27, .30, .34, .37, .40, .42, .44, .47, .49, .51, .53, .55],
  toyota:   [0, .13, .21, .27, .30, .34, .37, .40, .42, .44, .47, .49, .51, .53, .55],
  subaru:   [0, .15, .24, .31, .36, .41, .44, .47, .50, .52, .55, .57, .59, .61, .63],
  mazda:    [0, .15, .24, .31, .36, .41, .44, .47, .50, .52, .55, .57, .59, .61, .63],
  hyundai:  [0, .17, .28, .36, .43, .49, .53, .57, .60, .63, .65, .67, .69, .70, .71],
  nissan:   [0, .18, .29, .38, .45, .51, .55, .59, .62, .65, .67, .69, .71, .72, .73],
  domestic: [0, .20, .31, .40, .47, .53, .58, .62, .65, .67, .69, .71, .73, .74, .75],
  vw:       [0, .20, .31, .40, .47, .53, .58, .62, .65, .67, .69, .71, .73, .74, .75],
  bmw:      [0, .22, .35, .45, .53, .59, .64, .67, .70, .72, .74, .76, .77, .78, .79],
  mercedes: [0, .22, .35, .45, .53, .59, .64, .67, .70, .72, .74, .76, .77, .78, .79],
  luxury:   [0, .21, .33, .42, .49, .55, .60, .64, .67, .69, .71, .73, .75, .76, .77],
  // Tesla: steep yr1-2 due to Elon price cuts hammering used values, then stabilizes
  tesla:    [0, .23, .38, .47, .53, .58, .62, .65, .68, .70, .72, .74, .75, .76, .77],
  '':       [0, .18, .29, .38, .45, .51, .56, .60, .63, .66, .68, .70, .72, .73, .74],
};

// % value reduction per 10,000 miles above the 12k/yr average.
// Percentage-based so it scales with the vehicle's remaining value. Capped at ±20%.
window.CW.MILE_PCT_PER_10K = {
  honda: 1.8, toyota: 1.8, subaru: 2.0, mazda: 2.0,
  hyundai: 2.2, nissan: 2.2,
  domestic: 2.5, vw: 2.5,
  bmw: 3.0, mercedes: 3.0, luxury: 2.8,
  tesla: 3.5,  // battery range anxiety amplifies mileage penalty
  '': 2.2,
};

// Condition multipliers applied to the depreciation+mileage-adjusted base value.
window.CW.CONDITION_MULT = {
  excellent: 1.08,   // well below avg miles, no issues, like new
  good:      1.00,   // normal wear, all systems working
  fair:      0.88,   // visible wear, minor issues
  poor:      0.72,   // needs work, significant cosmetic or mechanical issues
};

// Average mid-trim MSRP by make group + body class — 2024/2025 actual prices.
// Source: manufacturer window stickers, Edmunds/KBB transaction data, April 2025.
// These are MID-TRIM averages. Top trims (GT-Line, Sport, XSE) can be $5–12k higher.
// Always override with the actual window sticker MSRP for accuracy.
window.CW.BASE_MSRP = {
  // Domestic — F-150 XLT/Silverado LT pull truck averages up
  domestic: { car:34000, suv:46000, truck:55000, van:40000, sports:38000 },
  // Toyota — Camry XLE $35k, RAV4 XLE $33k, Tacoma SR5 $40k
  toyota:   { car:30000, suv:36000, truck:43000, van:40000, sports:36000 },
  // Honda — Accord EX $33k, Civic EX $26k → mid ~$29k; CR-V EX $33k
  honda:    { car:29000, suv:35000, truck:42000, van:39000, sports:34000 },
  // Nissan — Altima SV $28k, Sentra SV $22k → mid ~$25k
  nissan:   { car:25500, suv:35000, truck:44000, van:37000, sports:32000 },
  // Hyundai/Kia — Sonata SEL $29.5k, K5 EX $28.5k, Elantra Limited $27k
  hyundai:  { car:28000, suv:34000, truck:40000, van:36000, sports:32000 },
  // Subaru — Outback Premium $32k, Forester Premium $31k
  subaru:   { car:27000, suv:33000, truck:39000, van:36000, sports:32000 },
  // Mazda — Mazda3 Premium $28k, CX-5 Carbon $36k
  mazda:    { car:28000, suv:35000, truck:39000, van:35000, sports:33000 },
  // VW — Jetta SEL $29k, Tiguan SEL $36k
  vw:       { car:31000, suv:38000, truck:43000, van:37000, sports:38000 },
  // BMW — 3-series 330i $47k, X3 xDrive30i $48k
  bmw:      { car:52000, suv:60000, truck:68000, van:56000, sports:68000 },
  // Mercedes — C300 $48k, GLC300 $54k
  mercedes: { car:52000, suv:62000, truck:70000, van:58000, sports:70000 },
  // Luxury — Volvo, Land Rover, Cadillac, Lincoln
  luxury:   { car:50000, suv:62000, truck:65000, van:54000, sports:60000 },
  '':       { car:31000, suv:40000, truck:49000, van:38000, sports:38000 },
};

// ── Model-Level MSRP Overrides ────────────────────────────────────────────────
// Key: normalized make_model (lowercase, spaces/hyphens/dots → underscores).
// msrp: mid-trim 2024/2025 transaction price from window stickers / Edmunds data.
// makeKey: which DEPR_CURVES row to use (matches MAKE_MAP values).
// Fall-through to BASE_MSRP segment averages when model is not listed.
// NHTSA note: some models include displacement suffix (Lexus RX 350, IS 300) —
//   those variants are listed alongside the bare name for broader coverage.
window.CW.MODEL_MSRP = {
  // ── Honda ────────────────────────────────────────────────────────────────────
  'honda_civic':              { msrp: 26000, makeKey: 'honda'    },
  'honda_accord':             { msrp: 32000, makeKey: 'honda'    },
  'honda_cr_v':               { msrp: 34000, makeKey: 'honda'    },
  'honda_pilot':              { msrp: 42000, makeKey: 'honda'    },
  'honda_hr_v':               { msrp: 25000, makeKey: 'honda'    },
  'honda_odyssey':            { msrp: 39000, makeKey: 'honda'    },
  'honda_passport':           { msrp: 40000, makeKey: 'honda'    },
  'honda_ridgeline':          { msrp: 42000, makeKey: 'honda'    },
  'honda_fit':                { msrp: 18000, makeKey: 'honda'    },
  // ── Acura ────────────────────────────────────────────────────────────────────
  'acura_tlx':                { msrp: 38000, makeKey: 'honda'    },
  'acura_rdx':                { msrp: 42000, makeKey: 'honda'    },
  'acura_mdx':                { msrp: 50000, makeKey: 'honda'    },
  'acura_ilx':                { msrp: 28000, makeKey: 'honda'    },
  'acura_integra':            { msrp: 32000, makeKey: 'honda'    },
  // ── Toyota ───────────────────────────────────────────────────────────────────
  'toyota_camry':             { msrp: 30000, makeKey: 'toyota'   },
  'toyota_corolla':           { msrp: 25000, makeKey: 'toyota'   },
  'toyota_corolla_cross':     { msrp: 26000, makeKey: 'toyota'   },
  'toyota_rav4':              { msrp: 33000, makeKey: 'toyota'   },
  'toyota_rav4_hybrid':       { msrp: 36000, makeKey: 'toyota'   },
  'toyota_highlander':        { msrp: 44000, makeKey: 'toyota'   },
  'toyota_tacoma':            { msrp: 40000, makeKey: 'toyota'   },
  'toyota_tundra':            { msrp: 50000, makeKey: 'toyota'   },
  'toyota_sienna':            { msrp: 42000, makeKey: 'toyota'   },
  'toyota_4runner':           { msrp: 46000, makeKey: 'toyota'   },
  'toyota_prius':             { msrp: 30000, makeKey: 'toyota'   },
  'toyota_prius_prime':       { msrp: 33000, makeKey: 'toyota'   },
  'toyota_venza':             { msrp: 35000, makeKey: 'toyota'   },
  'toyota_sequoia':           { msrp: 61000, makeKey: 'toyota'   },
  'toyota_avalon':            { msrp: 38000, makeKey: 'toyota'   },
  'toyota_c_hr':              { msrp: 24000, makeKey: 'toyota'   },
  'toyota_gr86':              { msrp: 30000, makeKey: 'toyota'   },
  // ── Lexus ────────────────────────────────────────────────────────────────────
  'lexus_rx':                 { msrp: 50000, makeKey: 'toyota'   },
  'lexus_rx_350':             { msrp: 50000, makeKey: 'toyota'   },
  'lexus_rx_350l':            { msrp: 54000, makeKey: 'toyota'   },
  'lexus_rx_450h':            { msrp: 54000, makeKey: 'toyota'   },
  'lexus_rx_500h':            { msrp: 58000, makeKey: 'toyota'   },
  'lexus_es':                 { msrp: 43000, makeKey: 'toyota'   },
  'lexus_es_350':             { msrp: 43000, makeKey: 'toyota'   },
  'lexus_es_300h':            { msrp: 46000, makeKey: 'toyota'   },
  'lexus_nx':                 { msrp: 42000, makeKey: 'toyota'   },
  'lexus_nx_250':             { msrp: 42000, makeKey: 'toyota'   },
  'lexus_nx_350':             { msrp: 44000, makeKey: 'toyota'   },
  'lexus_nx_350h':            { msrp: 47000, makeKey: 'toyota'   },
  'lexus_is':                 { msrp: 40000, makeKey: 'toyota'   },
  'lexus_is_300':             { msrp: 40000, makeKey: 'toyota'   },
  'lexus_is_350':             { msrp: 44000, makeKey: 'toyota'   },
  'lexus_gx':                 { msrp: 62000, makeKey: 'toyota'   },
  'lexus_gx_460':             { msrp: 62000, makeKey: 'toyota'   },
  'lexus_lx':                 { msrp: 92000, makeKey: 'toyota'   },
  'lexus_ux':                 { msrp: 36000, makeKey: 'toyota'   },
  // ── Nissan ───────────────────────────────────────────────────────────────────
  'nissan_altima':            { msrp: 27000, makeKey: 'nissan'   },
  'nissan_sentra':            { msrp: 22000, makeKey: 'nissan'   },
  'nissan_rogue':             { msrp: 32000, makeKey: 'nissan'   },
  'nissan_rogue_sport':       { msrp: 27000, makeKey: 'nissan'   },
  'nissan_murano':            { msrp: 38000, makeKey: 'nissan'   },
  'nissan_pathfinder':        { msrp: 38000, makeKey: 'nissan'   },
  'nissan_frontier':          { msrp: 34000, makeKey: 'nissan'   },
  'nissan_titan':             { msrp: 44000, makeKey: 'nissan'   },
  'nissan_maxima':            { msrp: 38000, makeKey: 'nissan'   },
  'nissan_armada':            { msrp: 52000, makeKey: 'nissan'   },
  'nissan_kicks':             { msrp: 22000, makeKey: 'nissan'   },
  'nissan_versa':             { msrp: 17000, makeKey: 'nissan'   },
  // ── Infiniti ─────────────────────────────────────────────────────────────────
  'infiniti_q50':             { msrp: 41000, makeKey: 'nissan'   },
  'infiniti_q60':             { msrp: 48000, makeKey: 'nissan'   },
  'infiniti_qx50':            { msrp: 42000, makeKey: 'nissan'   },
  'infiniti_qx60':            { msrp: 52000, makeKey: 'nissan'   },
  'infiniti_qx80':            { msrp: 72000, makeKey: 'nissan'   },
  // ── Hyundai ──────────────────────────────────────────────────────────────────
  'hyundai_elantra':          { msrp: 24000, makeKey: 'hyundai'  },
  'hyundai_sonata':           { msrp: 28000, makeKey: 'hyundai'  },
  'hyundai_tucson':           { msrp: 30000, makeKey: 'hyundai'  },
  'hyundai_santa_fe':         { msrp: 36000, makeKey: 'hyundai'  },
  'hyundai_palisade':         { msrp: 40000, makeKey: 'hyundai'  },
  'hyundai_kona':             { msrp: 27000, makeKey: 'hyundai'  },
  'hyundai_ioniq_5':          { msrp: 44000, makeKey: 'hyundai'  },
  'hyundai_ioniq_6':          { msrp: 41000, makeKey: 'hyundai'  },
  'hyundai_venue':            { msrp: 21000, makeKey: 'hyundai'  },
  'hyundai_accent':           { msrp: 17000, makeKey: 'hyundai'  },
  'hyundai_santa_cruz':       { msrp: 30000, makeKey: 'hyundai'  },
  // ── Kia ──────────────────────────────────────────────────────────────────────
  'kia_k5':                   { msrp: 27000, makeKey: 'hyundai'  },
  'kia_optima':               { msrp: 26000, makeKey: 'hyundai'  },  // pre-2021 K5
  'kia_forte':                { msrp: 22000, makeKey: 'hyundai'  },
  'kia_sportage':             { msrp: 30000, makeKey: 'hyundai'  },
  'kia_sorento':              { msrp: 35000, makeKey: 'hyundai'  },
  'kia_telluride':            { msrp: 42000, makeKey: 'hyundai'  },
  'kia_carnival':             { msrp: 37000, makeKey: 'hyundai'  },
  'kia_sedona':               { msrp: 32000, makeKey: 'hyundai'  },  // pre-2022
  'kia_soul':                 { msrp: 22000, makeKey: 'hyundai'  },
  'kia_ev6':                  { msrp: 43000, makeKey: 'hyundai'  },
  'kia_niro':                 { msrp: 28000, makeKey: 'hyundai'  },
  'kia_stinger':              { msrp: 38000, makeKey: 'hyundai'  },
  // ── Genesis ──────────────────────────────────────────────────────────────────
  'genesis_g70':              { msrp: 40000, makeKey: 'hyundai'  },
  'genesis_g80':              { msrp: 55000, makeKey: 'hyundai'  },
  'genesis_gv70':             { msrp: 45000, makeKey: 'hyundai'  },
  'genesis_gv80':             { msrp: 58000, makeKey: 'hyundai'  },
  // ── Subaru ───────────────────────────────────────────────────────────────────
  'subaru_outback':           { msrp: 32000, makeKey: 'subaru'   },
  'subaru_forester':          { msrp: 30000, makeKey: 'subaru'   },
  'subaru_crosstrek':         { msrp: 26000, makeKey: 'subaru'   },
  'subaru_impreza':           { msrp: 24000, makeKey: 'subaru'   },
  'subaru_ascent':            { msrp: 38000, makeKey: 'subaru'   },
  'subaru_legacy':            { msrp: 25000, makeKey: 'subaru'   },
  'subaru_wrx':               { msrp: 32000, makeKey: 'subaru'   },
  'subaru_brz':               { msrp: 30000, makeKey: 'subaru'   },
  'subaru_solterra':          { msrp: 44000, makeKey: 'subaru'   },
  // ── Mazda ────────────────────────────────────────────────────────────────────
  'mazda_mazda3':             { msrp: 26000, makeKey: 'mazda'    },
  'mazda_mazda6':             { msrp: 31000, makeKey: 'mazda'    },
  'mazda_cx_5':               { msrp: 34000, makeKey: 'mazda'    },
  'mazda_cx_50':              { msrp: 33000, makeKey: 'mazda'    },
  'mazda_cx_30':              { msrp: 27000, makeKey: 'mazda'    },
  'mazda_cx_9':               { msrp: 40000, makeKey: 'mazda'    },
  'mazda_cx_90':              { msrp: 42000, makeKey: 'mazda'    },
  'mazda_mx_5_miata':         { msrp: 29000, makeKey: 'mazda'    },
  // ── Volkswagen ───────────────────────────────────────────────────────────────
  'volkswagen_jetta':         { msrp: 27000, makeKey: 'vw'       },
  'volkswagen_passat':        { msrp: 28000, makeKey: 'vw'       },
  'volkswagen_tiguan':        { msrp: 34000, makeKey: 'vw'       },
  'volkswagen_atlas':         { msrp: 42000, makeKey: 'vw'       },
  'volkswagen_atlas_cross_sport': { msrp: 40000, makeKey: 'vw'  },
  'volkswagen_gti':           { msrp: 31000, makeKey: 'vw'       },
  'volkswagen_golf':          { msrp: 27000, makeKey: 'vw'       },
  'volkswagen_taos':          { msrp: 27000, makeKey: 'vw'       },
  'volkswagen_id_4':          { msrp: 39000, makeKey: 'vw'       },
  // ── Audi ─────────────────────────────────────────────────────────────────────
  'audi_a3':                  { msrp: 37000, makeKey: 'vw'       },
  'audi_a4':                  { msrp: 44000, makeKey: 'vw'       },
  'audi_a6':                  { msrp: 58000, makeKey: 'vw'       },
  'audi_a5':                  { msrp: 47000, makeKey: 'vw'       },
  'audi_q3':                  { msrp: 37000, makeKey: 'vw'       },
  'audi_q5':                  { msrp: 48000, makeKey: 'vw'       },
  'audi_q7':                  { msrp: 60000, makeKey: 'vw'       },
  'audi_q8':                  { msrp: 72000, makeKey: 'vw'       },
  'audi_e_tron':              { msrp: 66000, makeKey: 'vw'       },
  // ── BMW ──────────────────────────────────────────────────────────────────────
  'bmw_3_series':             { msrp: 48000, makeKey: 'bmw'      },
  'bmw_4_series':             { msrp: 52000, makeKey: 'bmw'      },
  'bmw_5_series':             { msrp: 58000, makeKey: 'bmw'      },
  'bmw_7_series':             { msrp: 95000, makeKey: 'bmw'      },
  'bmw_x1':                   { msrp: 38000, makeKey: 'bmw'      },
  'bmw_x3':                   { msrp: 48000, makeKey: 'bmw'      },
  'bmw_x4':                   { msrp: 54000, makeKey: 'bmw'      },
  'bmw_x5':                   { msrp: 64000, makeKey: 'bmw'      },
  'bmw_x6':                   { msrp: 68000, makeKey: 'bmw'      },
  'bmw_x7':                   { msrp: 82000, makeKey: 'bmw'      },
  'bmw_2_series':             { msrp: 38000, makeKey: 'bmw'      },
  // ── Mercedes-Benz ────────────────────────────────────────────────────────────
  'mercedes_benz_a_class':    { msrp: 36000, makeKey: 'mercedes' },
  'mercedes_benz_c_class':    { msrp: 48000, makeKey: 'mercedes' },
  'mercedes_benz_e_class':    { msrp: 62000, makeKey: 'mercedes' },
  'mercedes_benz_s_class':    { msrp: 114000, makeKey: 'mercedes'},
  'mercedes_benz_cla':        { msrp: 40000, makeKey: 'mercedes' },
  'mercedes_benz_gla':        { msrp: 40000, makeKey: 'mercedes' },
  'mercedes_benz_glb':        { msrp: 42000, makeKey: 'mercedes' },
  'mercedes_benz_glc':        { msrp: 52000, makeKey: 'mercedes' },
  'mercedes_benz_gle':        { msrp: 66000, makeKey: 'mercedes' },
  'mercedes_benz_gls':        { msrp: 90000, makeKey: 'mercedes' },
  'mercedes_benz_eqa':        { msrp: 44000, makeKey: 'mercedes' },
  // ── Tesla ────────────────────────────────────────────────────────────────────
  'tesla_model_3':            { msrp: 42000, makeKey: 'tesla'    },
  'tesla_model_y':            { msrp: 47000, makeKey: 'tesla'    },
  'tesla_model_s':            { msrp: 75000, makeKey: 'tesla'    },
  'tesla_model_x':            { msrp: 80000, makeKey: 'tesla'    },
  // ── Ford ─────────────────────────────────────────────────────────────────────
  'ford_f_150':               { msrp: 46000, makeKey: 'domestic' },
  'ford_f_250':               { msrp: 52000, makeKey: 'domestic' },
  'ford_f_350':               { msrp: 58000, makeKey: 'domestic' },
  'ford_explorer':            { msrp: 40000, makeKey: 'domestic' },
  'ford_escape':              { msrp: 30000, makeKey: 'domestic' },
  'ford_edge':                { msrp: 36000, makeKey: 'domestic' },
  'ford_expedition':          { msrp: 58000, makeKey: 'domestic' },
  'ford_expedition_max':      { msrp: 62000, makeKey: 'domestic' },
  'ford_bronco':              { msrp: 38000, makeKey: 'domestic' },
  'ford_bronco_sport':        { msrp: 31000, makeKey: 'domestic' },
  'ford_maverick':            { msrp: 28000, makeKey: 'domestic' },
  'ford_ranger':              { msrp: 34000, makeKey: 'domestic' },
  'ford_mustang':             { msrp: 33000, makeKey: 'domestic' },
  'ford_mustang_mach_e':      { msrp: 43000, makeKey: 'domestic' },
  'ford_fusion':              { msrp: 26000, makeKey: 'domestic' },
  'ford_ecosport':            { msrp: 22000, makeKey: 'domestic' },
  // ── Chevrolet ────────────────────────────────────────────────────────────────
  'chevrolet_silverado_1500': { msrp: 44000, makeKey: 'domestic' },
  'chevrolet_silverado':      { msrp: 40000, makeKey: 'domestic' },  // older NHTSA name
  'chevrolet_silverado_2500hd': { msrp: 52000, makeKey: 'domestic' },
  'chevrolet_colorado':       { msrp: 34000, makeKey: 'domestic' },
  'chevrolet_equinox':        { msrp: 30000, makeKey: 'domestic' },
  'chevrolet_traverse':       { msrp: 42000, makeKey: 'domestic' },
  'chevrolet_blazer':         { msrp: 38000, makeKey: 'domestic' },
  'chevrolet_tahoe':          { msrp: 59000, makeKey: 'domestic' },
  'chevrolet_suburban':       { msrp: 63000, makeKey: 'domestic' },
  'chevrolet_malibu':         { msrp: 25000, makeKey: 'domestic' },
  'chevrolet_camaro':         { msrp: 30000, makeKey: 'domestic' },
  'chevrolet_trailblazer':    { msrp: 25000, makeKey: 'domestic' },
  'chevrolet_trax':           { msrp: 21000, makeKey: 'domestic' },
  'chevrolet_impala':         { msrp: 30000, makeKey: 'domestic' },
  'chevrolet_cruze':          { msrp: 22000, makeKey: 'domestic' },
  'chevrolet_spark':          { msrp: 15000, makeKey: 'domestic' },
  'chevrolet_bolt_ev':        { msrp: 27000, makeKey: 'domestic' },
  'chevrolet_bolt_euv':       { msrp: 29000, makeKey: 'domestic' },
  // ── GMC ──────────────────────────────────────────────────────────────────────
  'gmc_sierra_1500':          { msrp: 44000, makeKey: 'domestic' },
  'gmc_sierra':               { msrp: 40000, makeKey: 'domestic' },  // older NHTSA name
  'gmc_sierra_2500hd':        { msrp: 52000, makeKey: 'domestic' },
  'gmc_canyon':               { msrp: 34000, makeKey: 'domestic' },
  'gmc_terrain':              { msrp: 31000, makeKey: 'domestic' },
  'gmc_acadia':               { msrp: 42000, makeKey: 'domestic' },
  'gmc_yukon':                { msrp: 59000, makeKey: 'domestic' },
  'gmc_yukon_xl':             { msrp: 64000, makeKey: 'domestic' },
  // ── RAM ──────────────────────────────────────────────────────────────────────
  'ram_1500':                 { msrp: 42000, makeKey: 'domestic' },
  'ram_2500':                 { msrp: 55000, makeKey: 'domestic' },
  'ram_3500':                 { msrp: 60000, makeKey: 'domestic' },
  'ram_promaster':            { msrp: 40000, makeKey: 'domestic' },
  'ram_promaster_city':       { msrp: 32000, makeKey: 'domestic' },
  // ── Dodge ────────────────────────────────────────────────────────────────────
  'dodge_charger':            { msrp: 33000, makeKey: 'domestic' },
  'dodge_challenger':         { msrp: 33000, makeKey: 'domestic' },
  'dodge_durango':            { msrp: 43000, makeKey: 'domestic' },
  'dodge_grand_caravan':      { msrp: 27000, makeKey: 'domestic' },
  // ── Chrysler ─────────────────────────────────────────────────────────────────
  'chrysler_pacifica':        { msrp: 38000, makeKey: 'domestic' },
  'chrysler_voyager':         { msrp: 30000, makeKey: 'domestic' },
  'chrysler_200':             { msrp: 23000, makeKey: 'domestic' },
  'chrysler_300':             { msrp: 35000, makeKey: 'domestic' },
  // ── Jeep ─────────────────────────────────────────────────────────────────────
  'jeep_grand_cherokee':      { msrp: 43000, makeKey: 'domestic' },
  'jeep_grand_cherokee_l':    { msrp: 47000, makeKey: 'domestic' },
  'jeep_cherokee':            { msrp: 28000, makeKey: 'domestic' },
  'jeep_wrangler':            { msrp: 33000, makeKey: 'domestic' },
  'jeep_wrangler_unlimited':  { msrp: 36000, makeKey: 'domestic' },
  'jeep_compass':             { msrp: 28000, makeKey: 'domestic' },
  'jeep_gladiator':           { msrp: 41000, makeKey: 'domestic' },
  'jeep_renegade':            { msrp: 25000, makeKey: 'domestic' },
  // ── Buick ────────────────────────────────────────────────────────────────────
  'buick_enclave':            { msrp: 45000, makeKey: 'luxury'   },
  'buick_encore':             { msrp: 25000, makeKey: 'luxury'   },
  'buick_encore_gx':          { msrp: 30000, makeKey: 'luxury'   },
  'buick_envision':           { msrp: 36000, makeKey: 'luxury'   },
  'buick_envista':            { msrp: 24000, makeKey: 'luxury'   },
  // ── Cadillac ─────────────────────────────────────────────────────────────────
  'cadillac_xt4':             { msrp: 38000, makeKey: 'luxury'   },
  'cadillac_xt5':             { msrp: 50000, makeKey: 'luxury'   },
  'cadillac_xt6':             { msrp: 54000, makeKey: 'luxury'   },
  'cadillac_ct4':             { msrp: 34000, makeKey: 'luxury'   },
  'cadillac_ct5':             { msrp: 42000, makeKey: 'luxury'   },
  'cadillac_escalade':        { msrp: 80000, makeKey: 'luxury'   },
  'cadillac_escalade_esv':    { msrp: 84000, makeKey: 'luxury'   },
  // ── Lincoln ──────────────────────────────────────────────────────────────────
  'lincoln_navigator':        { msrp: 80000, makeKey: 'luxury'   },
  'lincoln_navigator_l':      { msrp: 85000, makeKey: 'luxury'   },
  'lincoln_aviator':          { msrp: 54000, makeKey: 'luxury'   },
  'lincoln_corsair':          { msrp: 40000, makeKey: 'luxury'   },
  'lincoln_nautilus':         { msrp: 48000, makeKey: 'luxury'   },
  'lincoln_mkz':              { msrp: 37000, makeKey: 'luxury'   },
  // ── Volvo ────────────────────────────────────────────────────────────────────
  'volvo_xc90':               { msrp: 60000, makeKey: 'luxury'   },
  'volvo_xc60':               { msrp: 46000, makeKey: 'luxury'   },
  'volvo_xc40':               { msrp: 38000, makeKey: 'luxury'   },
  'volvo_s60':                { msrp: 42000, makeKey: 'luxury'   },
  'volvo_s90':                { msrp: 56000, makeKey: 'luxury'   },
  'volvo_v60':                { msrp: 44000, makeKey: 'luxury'   },
  // ── Land Rover ───────────────────────────────────────────────────────────────
  'land_rover_range_rover':   { msrp: 100000, makeKey: 'luxury'  },
  'land_rover_range_rover_sport': { msrp: 78000, makeKey: 'luxury' },
  'land_rover_range_rover_evoque': { msrp: 47000, makeKey: 'luxury' },
  'land_rover_discovery':     { msrp: 60000, makeKey: 'luxury'   },
  'land_rover_discovery_sport': { msrp: 42000, makeKey: 'luxury' },
  'land_rover_defender':      { msrp: 52000, makeKey: 'luxury'   },
};

// ── Factory Warranty Database ─────────────────────────────────────────────────
// bb:     [years, miles] bumper-to-bumper (comprehensive)
// pt:     [years, miles] powertrain (engine, trans, drivetrain) — for subsequent owners
// ptOrig: [years, miles] powertrain for original owner (some brands differ)
// rust:   [years, miles|'unlimited'] corrosion perforation
// transferable: true = full transfer, 'reduced' = shorter PT for 2nd+ owner
window.CW.FACTORY_WARRANTY = {
  honda:    { bb: [3, 36000],  pt: [5, 60000],  ptOrig: null,          rust: [5, 'unlimited'], transferable: true      },
  toyota:   { bb: [3, 36000],  pt: [5, 60000],  ptOrig: null,          rust: [5, 'unlimited'], transferable: true      },
  // Hyundai/Kia: 10yr/100k PT for original owner, 5yr/60k for subsequent
  hyundai:  { bb: [5, 60000],  pt: [5, 60000],  ptOrig: [10, 100000],  rust: [7, 'unlimited'], transferable: 'reduced' },
  subaru:   { bb: [3, 36000],  pt: [5, 60000],  ptOrig: null,          rust: [5, 'unlimited'], transferable: true      },
  mazda:    { bb: [3, 36000],  pt: [5, 60000],  ptOrig: null,          rust: [5, 'unlimited'], transferable: true      },
  nissan:   { bb: [3, 36000],  pt: [5, 60000],  ptOrig: null,          rust: [5, 'unlimited'], transferable: true      },
  domestic: { bb: [3, 36000],  pt: [5, 60000],  ptOrig: null,          rust: [3, 'unlimited'], transferable: true      },
  vw:       { bb: [4, 50000],  pt: [5, 60000],  ptOrig: null,          rust: [7, 'unlimited'], transferable: true      },
  bmw:      { bb: [4, 50000],  pt: [4, 50000],  ptOrig: null,          rust: [12,'unlimited'], transferable: true      },
  mercedes: { bb: [4, 50000],  pt: [4, 50000],  ptOrig: null,          rust: [4, 50000],       transferable: true      },
  luxury:   { bb: [4, 50000],  pt: [5, 60000],  ptOrig: null,          rust: [5, 'unlimited'], transferable: true      },
  '':       { bb: [3, 36000],  pt: [5, 60000],  ptOrig: null,          rust: [5, 'unlimited'], transferable: true      },
};

// Map NHTSA body type strings → our body class keys
window.CW.BODY_CLASS_MAP = {
  'sedan':           'car',
  'saloon':          'car',
  'hatchback':       'car',
  'liftback':        'car',
  'notchback':       'car',
  'wagon':           'car',
  'estate':          'car',
  'coupe':           'sports',
  'convertible':     'sports',
  'cabriolet':       'sports',
  'roadster':        'sports',
  'sport utility':   'suv',
  'suv':             'suv',
  'multi-purpose':   'suv',
  'mpv':             'suv',
  'crossover':       'suv',
  'pickup':          'truck',
  'truck':           'truck',
  'minivan':         'van',
  'van':             'van',
  'cargo van':       'van',
};
