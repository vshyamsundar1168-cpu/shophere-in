// Download EXACT live admin.html and test renderProdTable with real products
const https = require('https');
function get(url){return new Promise((res,rej)=>{https.get(url,{timeout:20000},r=>{const c=[];r.on('data',d=>c.push(d));r.on('end',()=>res(Buffer.concat(c).toString('utf8')));}).on('error',rej);});}

async function main(){
  const [adminHtml, prodsRaw] = await Promise.all([
    get('https://shophere.in/admin.html'),
    get('https://shophere.in/api/products?limit=3')
  ]);

  const prods = JSON.parse(prodsRaw).products || JSON.parse(prodsRaw);
  console.log('Products:', prods.length, '| First:', prods[0].name.substring(0,30));
  console.log('admin.html size:', adminHtml.length);

  // Check for ANY non-ASCII in admin.html
  let nonAscii = 0;
  for(let i=0;i<adminHtml.length;i++){
    if(adminHtml.charCodeAt(i) > 127) nonAscii++;
  }
  console.log('Non-ASCII chars in live admin.html:', nonAscii);

  // Extract renderProdTable
  const fnStart = adminHtml.indexOf('function renderProdTable(list)');
  const fnEnd = adminHtml.indexOf('\n// Save a single', fnStart);
  const fn = adminHtml.substring(fnStart, fnEnd);
  console.log('\nrenderProdTable size:', fn.length);

  // Check for non-ASCII in just this function
  let fnNonAscii = [];
  for(let i=0;i<fn.length;i++){
    if(fn.charCodeAt(i) > 127) fnNonAscii.push({pos:i,code:fn.charCodeAt(i),ctx:fn.substring(Math.max(0,i-15),i+15)});
  }
  console.log('Non-ASCII in renderProdTable:', fnNonAscii.length);
  fnNonAscii.forEach(x=>console.log('  code:'+x.code, JSON.stringify(x.ctx)));

  // Now actually try to run it
  const vm = require('vm');
  const ctx = vm.createContext({
    allCustomCols: [],
    console: console,
    document: {
      querySelector: ()=>null,
      getElementById: (id)=>{
        return {
          get innerHTML(){ return ''; },
          set innerHTML(v){ console.log('\nSET prodBody innerHTML len='+v.length+', first200='+v.substring(0,200)); }
        };
      }
    },
    // ccForTable stub
    ccForTable: ()=>[],
  });

  try {
    // Load just renderProdTable
    vm.runInContext(fn, ctx);
    // Call it with real data
    ctx.testProds = prods;
    vm.runInContext('renderProdTable(testProds)', ctx, {timeout:3000});
    console.log('\nrenderProdTable ran OK');
  } catch(e) {
    console.log('\nERROR in renderProdTable:', e.message);
    console.log(e.stack.split('\n').slice(0,8).join('\n'));
  }
}
main().catch(e=>console.error('FATAL:',e.message));
