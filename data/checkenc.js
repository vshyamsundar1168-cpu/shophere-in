const fs = require('fs');
const c = fs.readFileSync(__dirname + '/../app.js', 'utf8');
let bad = 0;
for (let i = 0; i < c.length; i++) {
  const cp = c.codePointAt(i);
  if (cp > 127) {
    bad++;
    if (bad <= 10) console.log('pos:' + i, 'cp:' + cp.toString(16), JSON.stringify(c.substring(Math.max(0,i-10),i+10)));
    if (cp > 0xFFFF) i++;
  }
}
console.log('Total non-ASCII:', bad, 'File size:', c.length);
