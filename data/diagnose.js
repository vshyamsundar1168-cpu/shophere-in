// Run this to get exact diagnosis
const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 10000 }, res => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  // 1. Get live app.js first 5 bytes - check for BOM
  const a = await get('https://shophere.in/app.js');
  const firstBytes = [...a.body.slice(0,5)].map(b => '0x'+b.toString(16).padStart(2,'0')).join(' ');
  console.log('app.js first bytes:', firstBytes);
  console.log('app.js size:', a.body.length);
  
  const appStr = a.body.toString('utf8');
  console.log('app.js first 60 chars:', JSON.stringify(appStr.substring(0,60)));
  
  // Check for broken replacement chars
  const broken = (appStr.match(/\uFFFD/g)||[]).length;
  console.log('Broken chars in live app.js:', broken);
  
  // 2. Check index.html references
  const i = await get('https://shophere.in/');
  const html = i.body.toString('utf8');
  const appJsMatch = html.match(/app\.js[^"']*/);
  console.log('\nindex.html app.js reference:', appJsMatch ? appJsMatch[0] : 'NOT FOUND');
  
  // Check homeSections exists
  console.log('homeSections in html:', html.includes('id="homeSections"'));
  console.log('productsSection in html:', html.includes('id="productsSection"'));
  console.log('filterCat in html:', html.includes('filterCat'));
}
main().catch(e => console.error('ERROR:', e.message));
