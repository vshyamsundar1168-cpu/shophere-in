// Test renderProdTable with real live products
const https = require('https');
function get(url){return new Promise((resolve,reject)=>{
  https.get(url,{timeout:15000},res=>{const c=[];res.on('data',d=>c.push(d));res.on('end',()=>resolve(Buffer.concat(c).toString('utf8')));}).on('error',reject).on('timeout',function(){this.destroy();reject(new Error('timeout'));});
});}

async function main(){
  // Get live admin.html
  const admin = await get('https://shophere.in/admin.html');
  console.log('admin.html size:', admin.length);
  
  // Find renderProdTable
  const rtStart = admin.indexOf('function renderProdTable(list)');
  const rtEnd = admin.indexOf('\nasync function saveProdCf', rtStart);
  const rtCode = admin.substring(rtStart, rtEnd);
  console.log('\nrenderProdTable size:', rtCode.length);
  console.log('First 200 chars:', rtCode.substring(0,200));
  
  // Check for rupee sign
  const rupeeChar = '\u20B9';
  const rupeeEntity = '&#8377;';
  console.log('\nRupee char in renderProdTable:', rtCode.includes(rupeeChar));
  console.log('Rupee entity in renderProdTable:', rtCode.includes(rupeeEntity));
  
  // Get real products
  const prodsRaw = await get('https://shophere.in/api/products?limit=3');
  const prods = JSON.parse(prodsRaw).products || JSON.parse(prodsRaw);
  console.log('\nProducts count:', prods.length);
  
  // Try to execute renderProdTable in isolation
  const vm = require('vm');
  
  // Extract just the renderProdTable function and its dependencies
  const ccForTableCode = admin.substring(admin.indexOf('function ccForTable('), admin.indexOf('function ccForTable(')+300);
  
  const testCode = `
    var allCustomCols = [];
    ${ccForTableCode}
    ${rtCode}
    
    var results = [];
    var errors = [];
    var fakeDoc = {
      querySelector: function(s) {
        return { querySelectorAll: function(){return [];}, querySelector: function(){return null;} };
      },
      getElementById: function(id) {
        return {
          innerHTML: '',
          set innerHTML(v) { results.push({id:id, len:v.length, first100: v.substring(0,100)}); }
        };
      }
    };
    
    // Test with first product
    var testList = ${JSON.stringify(prods.slice(0,2))};
    try {
      renderProdTable.call({}, testList);
      'success';
    } catch(e) {
      errors.push(e.message + ' at ' + e.stack.split('\\n')[1]);
      'failed: ' + e.message;
    }
  `;
  
  const ctx = { document: null, console: console, results: [], errors: [] };
  const fullCtx = vm.createContext(ctx);
  
  try {
    const result = vm.runInContext(testCode, fullCtx, {timeout: 5000});
    console.log('\nResult:', result);
    console.log('innerHTML sets:', ctx.results);
    console.log('Errors:', ctx.errors);
  } catch(e) {
    console.log('\nVM ERROR:', e.message);
    console.log(e.stack.split('\n').slice(0,5).join('\n'));
  }
}
main().catch(e=>console.error('FATAL:',e.message));
