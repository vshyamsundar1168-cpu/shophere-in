const https = require('https');
const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 15000 }, res => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  console.log('Fetching live app.js...');
  const appjs = await get('https://shophere.in/app.js');
  console.log('app.js size:', appjs.length);
  console.log('First 30 chars:', JSON.stringify(appjs.substring(0, 30)));

  console.log('\nFetching live products API...');
  const prodsRaw = await get('https://shophere.in/api/products?limit=3');
  const prodsData = JSON.parse(prodsRaw);
  const products = prodsData.products || prodsData;
  console.log('Products count:', products.length);
  const p0 = products[0];
  console.log('Product[0]:', JSON.stringify({ id: p0.id, name: p0.name.substring(0,30), price: p0.price, stock: p0.stock }));

  // Now run productCard with REAL product data
  console.log('\nTesting productCard with real data...');
  const mockEnv = `
    var localStorage = { getItem: () => null, setItem: () => {} };
    var sessionStorage = { getItem: () => null, setItem: () => {} };
    var navigator = { userAgent: 'Mozilla/5.0' };
    var Intl = global.Intl;
    var console = global.console;
    var document = {
      getElementById: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ style: {}, classList: { add:()=>{}, remove:()=>{} }, appendChild:()=>{} }),
      head: { appendChild: () => {} },
      addEventListener: () => {},
      title: ''
    };
    var window = { location: { protocol: 'https:', href: '' }, scrollTo: ()=>{}, onerror: null };
    var fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    ${appjs}
    // Test productCard with real product
    var p = ${JSON.stringify(p0)};
    try {
      var result = productCard(p);
      console.log('productCard SUCCESS');
      console.log('Result length:', result.length);
      console.log('First 300 chars:', result.substring(0, 300));
    } catch(e) {
      console.log('productCard FAILED:', e.message);
      console.log('Stack:', e.stack.split('\\n').slice(0,4).join('\\n'));
    }
    
    // Test filterCat
    try {
      filterCat('all');
      console.log('filterCat ran OK');
    } catch(e) {
      console.log('filterCat FAILED:', e.message);
    }
  `;

  try {
    eval(mockEnv);
  } catch(e) {
    console.log('EVAL ERROR (top-level crash):', e.message);
    console.log('Stack:', e.stack.split('\n').slice(0,6).join('\n'));
  }
}

main().catch(e => console.error('FATAL:', e.message));
