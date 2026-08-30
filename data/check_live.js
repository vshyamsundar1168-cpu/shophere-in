const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000 }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  const html = await get('https://shophere.in/');
  console.log('HTML SIZE:', html.length);
  console.log('homeSections:', html.includes('id="homeSections"'));
  console.log('productsSection:', html.includes('id="productsSection"'));
  console.log('display:none on productsSection:', html.includes('productsSection" style="display:none'));
  console.log('filterCat count:', (html.match(/filterCat/g)||[]).length);
  console.log('app.js tag:', html.includes('src="app.js'));
  console.log('onerror handler:', html.includes('window.onerror'));

  // Nav
  const navStart = html.indexOf('id="mainNav"');
  console.log('\nNAV area:\n', html.substring(navStart, navStart+400));

  // Products section start
  const psIdx = html.indexOf('id="productsSection"');
  console.log('\nproductsSection tag:\n', html.substring(psIdx-10, psIdx+100));

  // Script tag at bottom
  const scriptIdx = html.lastIndexOf('<script');
  console.log('\nLast script tag:\n', html.substring(scriptIdx, scriptIdx+200));
}
main().catch(e => console.error('FATAL:', e.message));
