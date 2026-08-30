// Extract and test just productCard and filterCat from local app.js
const fs = require('fs');
const appjs = fs.readFileSync(__dirname + '/../app.js', 'utf8');

// Check for high unicode chars
let highChars = 0;
for (let i = 0; i < appjs.length; i++) {
  const cp = appjs.codePointAt(i);
  if (cp > 0x7F && cp <= 0xFFFF && cp !== 0x20AC) {
    // Check if it's a multi-byte sequence that could corrupt
    if (cp >= 0x2000) {
      highChars++;
      if (highChars <= 10) console.log('Special char at', i, ': U+' + cp.toString(16), JSON.stringify(appjs.substring(Math.max(0,i-5), i+5)));
    }
  }
  if (cp > 0xFFFF) {
    highChars++;
    console.log('EMOJI at', i, ': U+' + cp.toString(16), JSON.stringify(appjs.substring(Math.max(0,i-5), i+5)));
    i++; // skip surrogate pair
  }
}
console.log('Total special/emoji chars:', highChars);

// Extract just productCard function
const pcStart = appjs.indexOf('function productCard(p){');
const pcEnd = appjs.indexOf('\nfunction ', pcStart + 10);
const productCardCode = appjs.substring(pcStart, pcEnd);
console.log('\n=== productCard code ===\n', productCardCode);

// Test it
try {
  const testFn = new Function('wishlist', 'p', `
    ${productCardCode}
    return productCard(p);
  `);
  const result = testFn([], {
    id: 1, name: 'Test Saree', brand: 'Brand', category: 'Women',
    price: 599, originalPrice: 1199, stock: 10, rating: 4,
    reviewCount: 12, badge: 'deal',
    images: [{ url: 'https://example.com/img.jpg' }]
  });
  console.log('\nproductCard WORKS! Length:', result.length);
  console.log('Sample output:', result.substring(0, 200));
} catch(e) {
  console.log('\nproductCard FAILS:', e.message);
  console.log(e.stack.split('\n').slice(0,5).join('\n'));
}
