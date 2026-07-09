'use strict';
// ── Push to ShopHere.in — Universal Product Scraper ───────────────────────────
// Runs on every page. When the popup asks for product data, this script
// scrapes the current page and returns structured product info.

// ── Site-specific scrapers (override generic for known suppliers) ─────────────
const SITE_SCRAPERS = {

  // CJ Dropshipping
  'cjdropshipping.com': () => {
    const name   = qs('h1.product-name, .product-title h1, [class*="productName"]');
    const price  = qsNum('.sell-price .price, .product-price .price, [class*="sellPrice"]');
    const images = qsaImg('img[class*="product"], .product-img img, .swiper-slide img');
    const desc   = qs('.product-desc, [class*="productDesc"], .description-content');
    const sku    = qs('[class*="sku"] span, .product-sku');
    return { name, price, images, description: desc, sku };
  },

  // DropshipIndia
  'dropshipindia.com': () => {
    const name   = qs('h1.product_title, .product-name h1, h1.entry-title');
    const price  = qsNum('.woocommerce-Price-amount, .price ins .amount, .price .amount');
    const images = qsaImg('.woocommerce-product-gallery img, .product-images img');
    const desc   = qs('.woocommerce-product-details__short-description, .product-description');
    const sku    = qs('.sku');
    return { name, price, images, description: desc, sku };
  },

  // Hubbazaar
  'hubbazaar.com': () => {
    const name   = qs('h1.product-title, .product__title h1, h1.title');
    const price  = qsNum('.price__sale .price-item--sale, .price-item--regular, .product__price');
    const images = qsaImg('.product__media img, .product-single__photo img, .product-image img');
    const desc   = qs('.product__description, .product-description, .rte');
    const sku    = qs('.product__sku, .variant-sku');
    return { name, price, images, description: desc, sku };
  },

  // AliExpress
  'aliexpress.com': () => {
    const name   = qs('h1[class*="title"], .product-title-text, [class*="ProductTitle"]');
    const price  = qsNum('[class*="price--current"], [class*="Price--current"], .product-price-current');
    const images = qsaImg('[class*="gallery"] img, [class*="Gallery"] img, .product-image img');
    const desc   = qs('[class*="description"], .product-description');
    return { name, price, images, description: desc };
  },

  // Flipkart
  'flipkart.com': () => {
    const name   = qs('span.B_NuCI, h1.yhB1nd, [class*="title"]');
    const price  = qsNum('._30jeq3, ._3I9_wc, [class*="finalPrice"]');
    const images = qsaImg('._2r_T1I img, ._2amPTt img, img[class*="product"]');
    const desc   = qs('._1mXcCf, [class*="description"], [class*="Description"]');
    return { name, price, images, description: desc };
  },

  // Amazon India
  'amazon.in': () => {
    const name   = qs('#productTitle, #title');
    const price  = qsNum('.a-price-whole, #priceblock_ourprice, .reinventPricePriceToPayMargin span');
    const images = qsaImg('#landingImage, #imgBlkFront, .a-dynamic-image');
    const desc   = qs('#productDescription p, #feature-bullets ul, #aplus');
    const sku    = qs('#ASIN, [name="ASIN"]');
    return { name, price, images, description: desc, sku };
  },

  // Shopify-based stores (generic)
  'myshopify.com': () => scrapeShopify(),
};

function scrapeShopify() {
  const name   = qs('h1.product__title, h1.product-single__title, h1[class*="title"]');
  const price  = qsNum('.price__sale .price-item, .price-item--regular, [class*="price"]');
  const images = qsaImg('.product__media img, .product-single__photo img');
  const desc   = qs('.product__description, .product-single__description, .rte');
  const sku    = qs('[class*="sku"], .product__sku');
  return { name, price, images, description: desc, sku };
}

// ── Generic scraper (works on most product pages) ─────────────────────────────
function scrapeGeneric() {
  // Name — try common patterns in priority order
  const name = qs([
    'h1[class*="product"], h1[class*="title"], h1[class*="name"]',
    'h1[itemprop="name"]',
    '[data-testid*="product-name"], [data-testid*="title"]',
    '.product-name h1, .product-title h1, .product_title',
    'h1',
  ].join(', '));

  // Price — find numbers near ₹ or Rs
  const price = scrapePrice();

  // Images — collect all large product images
  const images = scrapeImages();

  // Description
  const desc = qs([
    '[itemprop="description"]',
    '[class*="description"], [class*="Description"]',
    '[class*="product-detail"], [class*="product-info"]',
    '#description, #product-description',
    '.content p',
  ].join(', '));

  // SKU
  const sku = qs('[itemprop="sku"], [class*="sku"], [class*="SKU"], [id*="sku"]');

  // Brand
  const brand = qs([
    '[itemprop="brand"], [class*="brand"], [class*="Brand"]',
    '[class*="vendor"], [class*="manufacturer"]',
  ].join(', '));

  // Category
  const category = qs([
    '[itemprop="category"]',
    '.breadcrumb li:nth-last-child(2), .breadcrumbs li:nth-last-child(2)',
    '[class*="category"], [class*="Category"]',
  ].join(', '));

  // Original/MRP price
  const mrp = scrapeMRP();

  return { name, price, images, description: desc, sku, brand, category, mrp };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function qs(selector) {
  try {
    const el = document.querySelector(selector);
    return el ? el.innerText.trim().replace(/\s+/g, ' ') : '';
  } catch(e) { return ''; }
}

function qsNum(selector) {
  try {
    const el = document.querySelector(selector);
    if (!el) return 0;
    const txt = el.innerText || el.textContent || '';
    const num = parseFloat(txt.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  } catch(e) { return 0; }
}

function qsaImg(selector) {
  try {
    const imgs = Array.from(document.querySelectorAll(selector));
    return [...new Set(
      imgs.map(img => img.src || img.dataset.src || img.dataset.lazySrc || '')
          .filter(src => src && src.startsWith('http') && !src.includes('icon') && !src.includes('logo'))
          .map(src => src.split('?')[0]) // remove query strings
    )].slice(0, 10);
  } catch(e) { return []; }
}

function scrapePrice() {
  // Look for price in structured data first
  try {
    const ldJson = document.querySelector('script[type="application/ld+json"]');
    if (ldJson) {
      const data = JSON.parse(ldJson.textContent);
      const offers = data.offers || (data['@graph'] && data['@graph'].find(x => x.offers));
      if (offers) {
        const price = offers.price || (Array.isArray(offers) && offers[0] && offers[0].price);
        if (price) return parseFloat(price);
      }
    }
  } catch(e) {}

  // Fall back to DOM scanning — look for currency symbols near numbers
  const priceSelectors = [
    '[class*="price"][class*="sale"]', '[class*="sale"][class*="price"]',
    '[class*="price--current"]', '[class*="current-price"]',
    '[class*="selling-price"]', '[class*="sell-price"]',
    '[itemprop="price"]', '[class*="offer-price"]',
    '[class*="price"]:not([class*="original"]):not([class*="mrp"]):not([class*="compare"]):not([class*="old"])',
  ];

  for (const sel of priceSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        const txt = el.innerText || el.textContent || el.getAttribute('content') || '';
        const num = parseFloat(txt.replace(/[^0-9.]/g, ''));
        if (num > 0) return num;
      }
    } catch(e) {}
  }

  // Last resort — scan all text nodes for ₹ followed by a number
  try {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const prices = [];
    let node;
    while ((node = walker.nextNode())) {
      const txt = node.textContent.trim();
      if (/[₹Rs\.]/.test(txt)) {
        const m = txt.match(/[₹Rs\.]\s*([0-9,]+(\.[0-9]{1,2})?)/);
        if (m) {
          const n = parseFloat(m[1].replace(/,/g, ''));
          if (n > 10 && n < 10000000) prices.push(n);
        }
      }
    }
    return prices.length ? Math.min(...prices) : 0;
  } catch(e) { return 0; }
}

function scrapeMRP() {
  const mrpSelectors = [
    '[class*="original-price"]', '[class*="compare-price"]',
    '[class*="mrp"]', '[class*="MRP"]',
    '[class*="regular-price"]', '[class*="old-price"]',
    'del [class*="amount"], s [class*="amount"]',
    '[class*="price--compare"]',
  ];
  for (const sel of mrpSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        const txt = el.innerText || el.textContent || '';
        const num = parseFloat(txt.replace(/[^0-9.]/g, ''));
        if (num > 0) return num;
      }
    } catch(e) {}
  }
  return 0;
}

function scrapeImages() {
  // Open Graph image first
  const og = document.querySelector('meta[property="og:image"]');
  const ogImg = og ? og.content : '';

  // Product images from common patterns
  const imgs = qsaImg([
    'img[class*="product"][src*="http"]',
    'img[class*="main"][src*="http"]',
    '.product-images img', '.product-gallery img',
    '[class*="gallery"] img', '[class*="swiper"] img',
    '[class*="carousel"] img', '[class*="slider"] img',
    'img[itemprop="image"]',
  ].join(', '));

  const all = ogImg ? [ogImg, ...imgs] : imgs;

  // Filter: must be reasonably large (not icons/thumbnails in URL patterns)
  return [...new Set(
    all.filter(src =>
      src &&
      src.startsWith('http') &&
      !/\/(icon|logo|banner|badge|sprite|flag)/i.test(src)
    )
  )].slice(0, 10);
}

// ── Message listener ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'SCRAPE_PRODUCT') {
    try {
      const host = window.location.hostname.replace('www.', '');
      const siteKey = Object.keys(SITE_SCRAPERS).find(k => host.includes(k));

      let data;
      if (siteKey) {
        // Use site-specific scraper and fill gaps with generic
        const specific = SITE_SCRAPERS[siteKey]();
        const generic  = scrapeGeneric();
        data = {
          name:        specific.name        || generic.name,
          price:       specific.price       || generic.price,
          mrp:         specific.mrp         || generic.mrp,
          images:      specific.images && specific.images.length ? specific.images : generic.images,
          description: specific.description || generic.description,
          sku:         specific.sku         || generic.sku,
          brand:       specific.brand       || generic.brand,
          category:    specific.category    || generic.category,
        };
      } else {
        data = scrapeGeneric();
      }

      data.sourceUrl  = window.location.href;
      data.sourceSite = host;
      data.pageTitle  = document.title;

      // Clean up
      if (data.description && data.description.length > 2000) {
        data.description = data.description.substring(0, 2000) + '…';
      }

      sendResponse({ success: true, data });
    } catch(e) {
      sendResponse({ success: false, error: e.message });
    }
  }
  return true; // keep channel open for async
});
