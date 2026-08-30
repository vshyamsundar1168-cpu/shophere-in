const https = require('https');
const fs = require('fs');
const outFile = 'C:/Users/Yadadri Manufacturer/Desktop/Kiro 1/data/live_check2.txt';
const results = [];

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'User-Agent': 'Mozilla/5.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  // Fetch index.html
  results.push('=== FETCHING https://shophere.in/index.html ===');
  try {
    const r = await fetch('https://shophere.in/index.html');
    const html = r.body;
    fs.writeFileSync('C:/Users/Yadadri Manufacturer/Desktop/Kiro 1/data/live_index.txt', html, 'utf8');
    results.push('Status: ' + r.status);
    results.push('File size: ' + html.length + ' chars');
    results.push('');
    results.push('--- First 500 chars ---');
    results.push(html.substring(0, 500));
    results.push('');
    const psCount = (html.match(/productsSection/g) || []).length;
    const spCount = (html.match(/showProducts/g) || []).length;
    const fcCount = (html.match(/filterCat/g) || []).length;
    results.push('--- Occurrence Counts ---');
    results.push('productsSection: ' + psCount);
    results.push('showProducts: ' + spCount);
    results.push('filterCat: ' + fcCount);
    results.push('');
    results.push('--- Nav Section (300 chars after mainNav) ---');
    const navIdx = html.indexOf('mainNav');
    if (navIdx >= 0) {
      results.push(html.substring(navIdx, navIdx + 300));
    } else {
      results.push('(mainNav not found in page)');
      const navIdx2 = html.indexOf('<nav');
      if (navIdx2 >= 0) {
        results.push('Found <nav> tag:');
        results.push(html.substring(navIdx2, navIdx2 + 300));
      } else {
        results.push('(no <nav> tag found either)');
      }
    }
  } catch(e) {
    results.push('ERROR: ' + e.message);
  }

  results.push('');
  results.push('============================================');
  results.push('');

  // Fetch app.js
  results.push('=== FETCHING https://shophere.in/app.js ===');
  try {
    const r2 = await fetch('https://shophere.in/app.js');
    const appjs = r2.body;
    results.push('Status: ' + r2.status);
    results.push('File size: ' + appjs.length + ' chars');
    results.push('');
    results.push('--- Function Checks ---');
    results.push("Contains 'function showProducts': " + /function showProducts/.test(appjs));
    results.push("Contains 'function filterCat': " + /function filterCat/.test(appjs));
    results.push("Contains 'function renderProducts': " + /function renderProducts/.test(appjs));
    results.push('');
    results.push('--- Extra Counts ---');
    results.push('productsSection occurrences: ' + (appjs.match(/productsSection/g) || []).length);
    results.push('showProducts occurrences: ' + (appjs.match(/showProducts/g) || []).length);
    results.push('filterCat occurrences: ' + (appjs.match(/filterCat/g) || []).length);
    results.push('');
    results.push('--- First 300 chars of app.js ---');
    results.push(appjs.substring(0, 300));
  } catch(e) {
    results.push('ERROR: ' + e.message);
  }

  const out = results.join('\n');
  fs.writeFileSync(outFile, out, 'utf8');
  console.log(out);
}

main().catch(e => { console.error(e); process.exit(1); });
