const fs = require('fs');
const path = 'C:/Users/Yadadri Manufacturer/Desktop/Kiro 1/admin.html';
let text = fs.readFileSync(path, 'utf8');

// Replace all garbled emoji headings in analytics section with clean text
const fixes = [
  [/\?\?\s*Countries/g,          'Countries'],
  [/\?\?\?\s*Cities/g,           'Cities'],
  [/\?\?\s*Cities/g,             'Cities'],
  [/\?\?\s*Devices/g,            'Devices &amp; Browsers'],
  [/\?\?\s*Daily\s*Visits/g,     'Daily Visits'],
  [/\?\?\s*Recent\s*Visitors/g,  'Recent Visitors'],
  [/\?\?\s*Visitor\s*Analytics/g,'Visitor Analytics'],
  [/\?\?\s*Visitor\s*Locations\s*Map/g, 'Visitor Locations Map'],
  [/\?\?\s*/g,                    ''],   // catch-all for remaining ??
];

let count = 0;
for (const [pat, rep] of fixes) {
  const before = text;
  text = text.replace(pat, rep);
  if (text !== before) { console.log('Fixed:', pat.toString(), '->', rep); count++; }
}

// Also remove duplicate an-countries/an-cities/an-devices ids (from earlier duplication)
// Find all occurrences and keep only first
['an-countries','an-cities','an-devices','an-browsers','an-daily','an-visitors'].forEach(id => {
  const marker = `id="${id}"`;
  const first = text.indexOf(marker);
  const second = text.indexOf(marker, first + 1);
  if (second > 0) {
    console.log(`WARNING: duplicate id="${id}" found at ${first} and ${second}`);
  }
});

fs.writeFileSync(path, text, 'utf8');
console.log(`Saved. Total fixes: ${count}`);
