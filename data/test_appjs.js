// Simulate what the browser does with app.js
// Run productCard with a test product and see if it throws
const fs = require('fs');
const path = require('path');

const appjs = fs.readFileSync(path.join(__dirname,'..','app.js'), 'utf8');

// Check for broken chars
const broken = (appjs.match(/\ufffd/g)||[]).length;
console.log('Broken chars in app.js:', broken);

// Show productCard function
const pcIdx = appjs.indexOf('function productCard');
const pcCode = appjs.substring(pcIdx, pcIdx+600);
console.log('\n=== productCard ===\n', pcCode);

// Show filterCat
const fcIdx = appjs.indexOf('function filterCat(');
const fcCode = appjs.substring(fcIdx, fcIdx+200);
console.log('\n=== filterCat ===\n', fcCode);

// Show showProducts
const spIdx = appjs.indexOf('function showProducts(');
const spCode = appjs.substring(spIdx, spIdx+150);
console.log('\n=== showProducts ===\n', spCode);

// Show loadProducts
const lpIdx = appjs.indexOf('async function loadProducts(');
const lpCode = appjs.substring(lpIdx, lpIdx+200);
console.log('\n=== loadProducts ===\n', lpCode);

// Show first 20 lines
console.log('\n=== FIRST 30 LINES ===');
appjs.split('\n').slice(0,30).forEach((l,i) => console.log(i+1, l));

// Try to execute productCard in a mock browser env
console.log('\n=== TESTING productCard EXECUTION ===');
try {
  // Mock browser globals
  const mockEnv = `
    var document = { getElementById: ()=>null, querySelectorAll: ()=>[], createElement: ()=>({}) };
    var window = { location: { protocol: 'https:' } };
    var localStorage = { getItem: ()=>null, setItem: ()=>{} };
    var sessionStorage = { getItem: ()=>null, setItem: ()=>{} };
    var navigator = { userAgent: 'test' };
    var Intl = global.Intl;
    var console = global.console;
    ${appjs}
    // Now test productCard
    var testProduct = { id:1, name:'Test Product', brand:'Brand', category:'Fashion',
      price:500, originalPrice:1000, stock:10, rating:4, reviewCount:5,
      badge:'deal', images:[{url:'https://example.com/img.jpg'}] };
    var result = productCard(testProduct);
    console.log('productCard SUCCESS, length:', result.length);
    console.log('First 200 chars:', result.substring(0,200));
  `;
  eval(mockEnv);
} catch(e) {
  console.log('productCard ERROR:', e.message);
  console.log('Stack:', e.stack.split('\n').slice(0,5).join('\n'));
}
