const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000 }, res => {
      let d = Buffer.alloc(0);
      res.on('data', c => d = Buffer.concat([d, c]));
      res.on('end', () => resolve(d.toString('utf8')));
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  const [appjs, prodsRaw] = await Promise.all([
    get('https://shophere.in/app.js'),
    get('https://shophere.in/api/products?limit=5')
  ]);

  console.log('app.js size:', appjs.length);
  const prods = JSON.parse(prodsRaw);
  const list = prods.products || prods;
  console.log('Products count:', list.length);

  // Check for any remaining emoji (codepoint > 0xFFFF) in app.js
  let highChars = [];
  for (let i = 0; i < appjs.length; i++) {
    const cp = appjs.codePointAt(i);
    if (cp > 0xFFFF) {
      highChars.push({ pos: i, cp: cp.toString(16), char: appjs.substring(i-10, i+10) });
    }
  }
  console.log('\nHigh codepoint chars remaining:', highChars.length);
  if (highChars.length > 0) {
    highChars.slice(0,5).forEach(h => console.log('  pos', h.pos, 'U+'+h.cp, JSON.stringify(h.char)));
  }

  // Simulate productCard
  const vm = require('vm');
  const ctx = {
    localStorage: { getItem: () => null, setItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {} },
    navigator: { userAgent: 'Mozilla' },
    Intl: global.Intl,
    console: console,
    document: {
      getElementById: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ style: {}, appendChild: () => {} }),
      head: { appendChild: () => {} },
      addEventListener: () => {},
      title: ''
    },
    window: { location: { protocol: 'https:', href: '' }, scrollTo: () => {}, onerror: null },
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
  };
  vm.createContext(ctx);

  try {
    vm.runInContext(appjs, ctx, { timeout: 5000 });
    console.log('\napp.js loaded in VM - OK');
  } catch(e) {
    console.log('\napp.js LOAD ERROR:', e.message);
    console.log('Stack:', e.stack.split('\n').slice(0,4).join('\n'));
    return;
  }

  // Now test productCard with real product
  for (const p of list.slice(0, 3)) {
    try {
      ctx.testProd = p;
      const result = vm.runInContext('productCard(testProd)', ctx, { timeout: 2000 });
      console.log('\nproductCard OK for:', p.name.substring(0,30));
      console.log('  Result length:', result.length);
    } catch(e) {
      console.log('\nproductCard FAILED for:', p.name ? p.name.substring(0,30) : p.id);
      console.log('  ERROR:', e.message);
    }
  }

  // Test filterCat
  try {
    vm.runInContext('filterCat("all")', ctx, { timeout: 2000 });
    console.log('\nfilterCat("all") OK');
  } catch(e) {
    console.log('\nfilterCat FAILED:', e.message);
  }
}
main().catch(e => console.error('FATAL:', e.message));
