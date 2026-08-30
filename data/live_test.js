// Test the live site exactly as a browser would
const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== TESTING LIVE SITE ===\n');

  // 1. Test products API
  const p = await get('https://shophere.in/api/products?limit=5');
  console.log('Products API status:', p.status);
  try {
    const j = JSON.parse(p.body);
    const prods = j.products || j;
    console.log('Products count:', prods.length);
    if (prods.length > 0) {
      const p0 = prods[0];
      console.log('First product:', JSON.stringify({
        id: p0.id, name: p0.name, price: p0.price,
        price_type: typeof p0.price, stock: p0.stock,
        images: p0.images ? p0.images.length : 0
      }));
    }
  } catch(e) { console.log('Products parse error:', e.message); console.log('Body start:', p.body.substring(0,200)); }

  // 2. Test app.js - look for productCard function
  const a = await get('https://shophere.in/app.js');
  console.log('\napp.js status:', a.status, '  size:', a.body.length);
  
  // Find productCard and show it
  const pcIdx = a.body.indexOf('function productCard');
  if (pcIdx >= 0) {
    const snippet = a.body.substring(pcIdx, pcIdx + 400);
    console.log('\nproductCard function (live):\n' + snippet);
  } else {
    console.log('productCard NOT FOUND in live app.js!');
  }

  // Check for any syntax errors by looking for broken chars
  const broken = (a.body.match(/\ufffd/g) || []).length;
  console.log('\nBroken chars (U+FFFD) in live app.js:', broken);

  // Check filterCat
  const fcIdx = a.body.indexOf('function filterCat');
  console.log('filterCat found:', fcIdx >= 0);
  
  // Check loadProducts
  const lpIdx = a.body.indexOf('async function loadProducts');
  console.log('loadProducts found:', lpIdx >= 0);

  // 3. Test categories API
  const c = await get('https://shophere.in/api/categories');
  console.log('\nCategories API status:', c.status);
  try {
    const cats = JSON.parse(c.body);
    console.log('Categories:', cats);
  } catch(e) { console.log('Categories error:', e.message); }
}

main().catch(console.error);
