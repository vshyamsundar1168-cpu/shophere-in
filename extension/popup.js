'use strict';
// ── Push to ShopHere.in — Popup Logic ─────────────────────────────────────────

let scrapedData    = null;
let selectedImages = [];
let storeUrl       = '';
let pushToken      = '';

// ── Init ──────────────────────────────────────────────────────────────────────
async function initPopup() {
  const stored = await chrome.storage.sync.get(['storeUrl', 'pushToken']);
  storeUrl  = (stored.storeUrl  || '').replace(/\/$/, '');
  pushToken = stored.pushToken  || '';

  // Update header indicator
  const ind = document.getElementById('storeIndicator');
  const fu  = document.getElementById('footerUrl');
  if (storeUrl) {
    ind.textContent = '🟢 Connected';
    ind.style.color = '#22c55e';
    fu.textContent  = storeUrl;
  } else {
    ind.textContent = '⚠️ Setup required';
    ind.style.color = '#f97316';
    fu.textContent  = 'Not connected';
    showState('setup');
    return;
  }

  showState('loading');
  await scrapeCurrentPage();
}

// ── Scrape active tab ─────────────────────────────────────────────────────────
async function scrapeCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) { showState('noproduct'); return; }

    // Inject content script if not already present
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files:  ['content.js'],
      });
    } catch(e) {
      // Already injected — that's fine
    }

    const resp = await chrome.tabs.sendMessage(tab.id, { action: 'SCRAPE_PRODUCT' });
    if (!resp || !resp.success || !resp.data) { showState('noproduct'); return; }

    const d = resp.data;
    if (!d.name && !d.price) { showState('noproduct'); return; }

    scrapedData = d;
    populateForm(d);
    showState('product');
  } catch(e) {
    console.error('Scrape error:', e);
    showState('noproduct');
  }
}

// ── Populate form ─────────────────────────────────────────────────────────────
async function populateForm(d) {
  // Source badge
  document.getElementById('sourceBadge').textContent = '🌐 ' + (d.sourceSite || 'Unknown site');

  // Name
  document.getElementById('prod_name').value = d.name || d.pageTitle || '';

  // Prices
  const supplierPrice = d.price || 0;
  document.getElementById('prod_supplierPrice').value = supplierPrice;
  updateMarkup(); // auto-calculate your price

  if (d.mrp) document.getElementById('prod_mrp').value = d.mrp;

  // Other fields
  document.getElementById('prod_brand').value = d.brand || '';
  document.getElementById('prod_desc').value  = d.description || '';
  document.getElementById('prod_sku').value   = d.sku || '';

  // Load categories from store
  try {
    const res  = await fetch(storeUrl + '/api/categories');
    const cats = await res.json();
    const sel  = document.getElementById('prod_category');
    sel.innerHTML = '<option value="Imported">Imported</option>';
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = c;
      if (d.category && c.toLowerCase().includes(d.category.toLowerCase())) opt.selected = true;
      sel.appendChild(opt);
    });
  } catch(e) { /* use default */ }

  // Images
  selectedImages = d.images || [];
  renderImages(d.images || []);
}

// ── Image strip ───────────────────────────────────────────────────────────────
function renderImages(images) {
  const strip = document.getElementById('imgStrip');
  if (!images.length) {
    strip.innerHTML = '<span style="color:#94a3b8;font-size:.75rem;padding:4px">No images detected</span>';
    return;
  }
  strip.innerHTML = images.map((src, i) =>
    `<img src="${src}" alt="" class="${i === 0 ? 'selected' : ''}"
      onclick="toggleImage(this,'${src}')"
      onerror="this.style.display='none'">`
  ).join('');
}

function toggleImage(el, src) {
  el.classList.toggle('selected');
  if (el.classList.contains('selected')) {
    if (!selectedImages.includes(src)) selectedImages.push(src);
  } else {
    selectedImages = selectedImages.filter(s => s !== src);
  }
}

// ── Markup calculator ─────────────────────────────────────────────────────────
function updateMarkup() {
  const supplierPrice = parseFloat(document.getElementById('prod_supplierPrice').value) || 0;
  const markup        = parseInt(document.getElementById('markup_slider').value) || 0;
  document.getElementById('markup_display').textContent = markup + '%';
  const yourPrice = Math.ceil(supplierPrice * (1 + markup / 100));
  document.getElementById('prod_price').value = yourPrice;
  // Auto-set MRP if not set
  const mrpEl = document.getElementById('prod_mrp');
  if (!mrpEl.value || parseFloat(mrpEl.value) <= yourPrice) {
    mrpEl.value = Math.ceil(yourPrice * 1.3);
  }
}

// ── Push product ──────────────────────────────────────────────────────────────
async function pushProduct() {
  const name  = document.getElementById('prod_name').value.trim();
  const price = parseFloat(document.getElementById('prod_price').value) || 0;

  if (!name)   { showStatus('pushStatus', 'error', '❌ Product name is required'); return; }
  if (!price)  { showStatus('pushStatus', 'error', '❌ Your price must be greater than 0'); return; }
  if (!storeUrl) { showStatus('pushStatus', 'error', '❌ Store not configured. Click ⚙️ to set up.'); return; }

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

    showStatus('pushStatus', 'success', `✅ "${name}" pushed to your store! Product ID: #${data.id}`);
    btn.textContent = '✅ Pushed!';
    btn.style.background = '#16a34a';

    // Save last markup for next time
    chrome.storage.sync.set({ lastMarkup: document.getElementById('markup_slider').value });

  } catch(e) {
    showStatus('pushStatus', 'error', '❌ Push failed: ' + e.message);
    btn.disabled    = false;
    btn.textContent = '🚀 Push to ShopHere.in';
  }
}

// ── Setup save ────────────────────────────────────────────────────────────────
async function saveSetup() {
  let url = document.getElementById('setup_url').value.trim().replace(/\/$/, '');
  const token = document.getElementById('setup_token').value.trim();

  if (!url) { showStatus('setup_status', 'error', 'Enter your store URL'); return; }

  // Auto-fix common mistakes
  if (!url.startsWith('http')) url = 'https://' + url;
  url = url.replace('/admin.html', '').replace('/admin', '');
  document.getElementById('setup_url').value = url;

  showStatus('setup_status', 'info', 'Testing connection…');

  // Always try both URLs — direct Render first (faster, no redirect)
  const urlsToTry = [url];
  if (url.includes('shophere.in') && !url.includes('onrender')) {
    urlsToTry.push('https://shophere-in.onrender.com');
  }
  if (url.includes('onrender') && !urlsToTry.includes('https://shophere.in')) {
    urlsToTry.push('https://shophere.in');
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
    showStatus('setup_status', 'error', '❌ Cannot reach store. Your Render free server may be sleeping — wait 60 seconds and try again. URL tried: ' + urlsToTry.join(', '));
    return;
  }

  await chrome.storage.sync.set({ storeUrl: connectedUrl, pushToken: token });
  storeUrl  = connectedUrl;
  pushToken = token;
  document.getElementById('setup_url').value = connectedUrl;
  showStatus('setup_status', 'success', '✅ Connected to ' + connectedUrl);
  setTimeout(() => initPopup(), 1000);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Pre-fill setup fields from storage
  const stored = await chrome.storage.sync.get(['storeUrl', 'pushToken', 'lastMarkup']);
  if (stored.storeUrl)  document.getElementById('setup_url').value   = stored.storeUrl;
  if (stored.pushToken) document.getElementById('setup_token').value = stored.pushToken;
  if (stored.lastMarkup) document.getElementById('markup_slider').value = stored.lastMarkup;

  await initPopup();
});
