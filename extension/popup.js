'use strict';
// ── Push to ShopHere.in — Popup Logic (CSP-compliant, no inline handlers) ─────

let scrapedData    = null;
let selectedImages = [];
let storeUrl       = '';
let pushToken      = '';

// ── State helper ──────────────────────────────────────────────────────────────
function showState(name) {
  document.querySelectorAll('.state').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('state-' + name);
  if (el) el.classList.add('active');
}

function showStatus(elId, type, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.className = 'status-msg ' + type;
  el.textContent = msg;
  el.style.display = 'block';
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function initPopup() {
  const stored = await chrome.storage.sync.get(['storeUrl', 'pushToken']);
  storeUrl  = (stored.storeUrl  || '').replace(/\/$/, '');
  pushToken = stored.pushToken  || '';

  const ind = document.getElementById('storeIndicator');
  const fu  = document.getElementById('footerUrl');

  if (storeUrl) {
    ind.textContent = '🟢 Connected';
    ind.style.color = '#22c55e';
    fu.textContent  = storeUrl;
    showState('loading');
    await scrapeCurrentPage();
  } else {
    ind.textContent = '⚠️ Setup required';
    ind.style.color = '#f97316';
    fu.textContent  = 'Not connected';
    showState('setup');
  }
}

// ── Scrape ────────────────────────────────────────────────────────────────────
async function scrapeCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) { showState('noproduct'); return; }

    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    } catch(e) { /* already injected */ }

    const resp = await chrome.tabs.sendMessage(tab.id, { action: 'SCRAPE_PRODUCT' });
    if (!resp || !resp.success || !resp.data) { showState('noproduct'); return; }

    const d = resp.data;
    if (!d.name && !d.price) { showState('noproduct'); return; }

    scrapedData = d;
    await populateForm(d);
    showState('product');
  } catch(e) {
    console.error('Scrape error:', e);
    showState('noproduct');
  }
}

// ── Populate form ─────────────────────────────────────────────────────────────
async function populateForm(d) {
  document.getElementById('sourceBadge').textContent = '🌐 ' + (d.sourceSite || 'Unknown site');
  document.getElementById('prod_name').value  = d.name || d.pageTitle || '';
  document.getElementById('prod_brand').value = d.brand || '';
  document.getElementById('prod_desc').value  = d.description || '';
  document.getElementById('prod_sku').value   = d.sku || '';

  const supplierPrice = d.price || 0;
  document.getElementById('prod_supplierPrice').value = supplierPrice;
  updateMarkup();
  if (d.mrp) document.getElementById('prod_mrp').value = d.mrp;

  // Load categories
  try {
    const res  = await fetch(storeUrl + '/api/categories', { signal: AbortSignal.timeout(5000) });
    const cats = await res.json();
    const sel  = document.getElementById('prod_category');
    sel.innerHTML = '<option value="Imported">Imported</option>';
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = c;
      if (d.category && c.toLowerCase().includes((d.category || '').toLowerCase())) opt.selected = true;
      sel.appendChild(opt);
    });
  } catch(e) { /* use default */ }

  selectedImages = d.images || [];
  renderImages(selectedImages);
}

// ── Images ────────────────────────────────────────────────────────────────────
function renderImages(images) {
  const strip = document.getElementById('imgStrip');
  if (!images || !images.length) {
    strip.innerHTML = '<span style="color:#94a3b8;font-size:.75rem;padding:4px">No images detected</span>';
    return;
  }
  strip.innerHTML = '';
  images.forEach((src, i) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    if (i === 0) img.classList.add('selected');
    img.addEventListener('error', () => { img.style.display = 'none'; });
    img.addEventListener('click', () => {
      img.classList.toggle('selected');
      if (img.classList.contains('selected')) {
        if (!selectedImages.includes(src)) selectedImages.push(src);
      } else {
        selectedImages = selectedImages.filter(s => s !== src);
      }
    });
    strip.appendChild(img);
  });
}

// ── Markup ────────────────────────────────────────────────────────────────────
function updateMarkup() {
  const supplierPrice = parseFloat(document.getElementById('prod_supplierPrice').value) || 0;
  const markup        = parseInt(document.getElementById('markup_slider').value) || 0;
  document.getElementById('markup_display').textContent = markup + '%';
  const yourPrice = Math.ceil(supplierPrice * (1 + markup / 100));
  document.getElementById('prod_price').value = yourPrice;
  const mrpEl = document.getElementById('prod_mrp');
  if (!mrpEl.value || parseFloat(mrpEl.value) <= yourPrice) {
    mrpEl.value = Math.ceil(yourPrice * 1.3);
  }
}

// ── Push ──────────────────────────────────────────────────────────────────────
async function pushProduct() {
  const name  = document.getElementById('prod_name').value.trim();
  const price = parseFloat(document.getElementById('prod_price').value) || 0;

  if (!name)     { showStatus('pushStatus', 'error', 'Product name is required'); return; }
  if (!price)    { showStatus('pushStatus', 'error', 'Your price must be greater than 0'); return; }
  if (!storeUrl) { showStatus('pushStatus', 'error', 'Store not configured — click ⚙️ to set up'); return; }

  const btn = document.getElementById('pushBtn');
  btn.disabled    = true;
  btn.textContent = '⏳ Pushing…';

  const payload = {
    name,
    brand:         document.getElementById('prod_brand').value.trim(),
    category:      document.getElementById('prod_category').value,
    price,
    originalPrice: parseFloat(document.getElementById('prod_mrp').value) || Math.ceil(price * 1.3),
    stock:         parseInt(document.getElementById('prod_stock').value) || 10,
    description:   document.getElementById('prod_desc').value.trim(),
    badge:         document.getElementById('prod_badge').value,
    sku:           document.getElementById('prod_sku').value.trim(),
    imageUrls:     selectedImages,
    sourceUrl:     scrapedData ? scrapedData.sourceUrl  : '',
    sourceSite:    scrapedData ? scrapedData.sourceSite : '',
    supplierPrice: parseFloat(document.getElementById('prod_supplierPrice').value) || 0,
    pushToken,
  };

  try {
    const res  = await fetch(storeUrl + '/api/push-product', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server returned ' + res.status);

    showStatus('pushStatus', 'success', '✅ "' + name + '" pushed! Product ID: #' + data.id);
    btn.textContent      = '✅ Pushed!';
    btn.style.background = '#16a34a';
    chrome.storage.sync.set({ lastMarkup: document.getElementById('markup_slider').value });
  } catch(e) {
    showStatus('pushStatus', 'error', 'Push failed: ' + e.message);
    btn.disabled    = false;
    btn.textContent = '🚀 Push to ShopHere.in';
  }
}

// ── Setup ─────────────────────────────────────────────────────────────────────
async function saveSetup() {
  let url   = document.getElementById('setup_url').value.trim().replace(/\/$/, '');
  const token = document.getElementById('setup_token').value.trim();

  if (!url) { showStatus('setup_status', 'error', 'Enter your store URL'); return; }
  if (!url.startsWith('http')) url = 'https://' + url;
  url = url.replace('/admin.html', '').replace('/admin', '');
  document.getElementById('setup_url').value = url;

  showStatus('setup_status', 'info', 'Testing connection…');

  // Try both shophere.in and onrender URL
  const urlsToTry = [url];
  if (url.includes('shophere.in') && !url.includes('onrender')) {
    urlsToTry.push('https://shophere-in.onrender.com');
  }

  let connectedUrl = null;
  for (const tryUrl of urlsToTry) {
    try {
      showStatus('setup_status', 'info', 'Trying ' + tryUrl + '…');
      const res = await fetch(tryUrl + '/api/stats', { signal: AbortSignal.timeout(15000) });
      if (res.ok) { connectedUrl = tryUrl; break; }
    } catch(e) { /* try next */ }
  }

  if (!connectedUrl) {
    showStatus('setup_status', 'error',
      'Cannot reach store. Your Render free server may be sleeping — open your store in a browser tab first, wait 30 seconds, then try again.');
    return;
  }

  await chrome.storage.sync.set({ storeUrl: connectedUrl, pushToken: token });
  storeUrl  = connectedUrl;
  pushToken = token;
  document.getElementById('setup_url').value = connectedUrl;
  showStatus('setup_status', 'success', '✅ Connected to ' + connectedUrl);
  setTimeout(() => initPopup(), 1000);
}

// ── Wire up all event listeners (no inline onclick) ───────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const stored = await chrome.storage.sync.get(['storeUrl', 'pushToken', 'lastMarkup']);
  if (stored.storeUrl)   document.getElementById('setup_url').value    = stored.storeUrl;
  if (stored.pushToken)  document.getElementById('setup_token').value  = stored.pushToken;
  if (stored.lastMarkup) document.getElementById('markup_slider').value = stored.lastMarkup;

  // Button bindings
  document.getElementById('btnGoSetup')       .addEventListener('click', () => showState('setup'));
  document.getElementById('btnFooterSettings').addEventListener('click', () => showState('setup'));
  document.getElementById('btnSaveSetup')     .addEventListener('click', saveSetup);
  document.getElementById('btnSetupBack')     .addEventListener('click', initPopup);
  document.getElementById('btnRetry')         .addEventListener('click', initPopup);
  document.getElementById('btnRescan')        .addEventListener('click', initPopup);
  document.getElementById('pushBtn')          .addEventListener('click', pushProduct);
  document.getElementById('markup_slider')    .addEventListener('input', updateMarkup);
  document.getElementById('prod_supplierPrice').addEventListener('input', updateMarkup);

  await initPopup();
});
