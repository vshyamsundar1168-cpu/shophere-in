const fs = require('fs');
const path = 'C:/Users/Yadadri Manufacturer/Desktop/Kiro 1/admin.html';
let text = fs.readFileSync(path, 'utf8');

// Find and replace the garbled stat cards grid in analytics tab (second occurrence)
const marker = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">';
const first = text.indexOf(marker);
const second = text.indexOf(marker, first + 1);
console.log('First grid:', first, 'Second grid:', second);

if (second > 0) {
  // Find end of this grid by counting div depth
  let depth = 0;
  let end = second;
  for (let i = second; i < text.length - 5; i++) {
    if (text.slice(i, i+4) === '<div') depth++;
    else if (text.slice(i, i+6) === '</div') {
      depth--;
      if (depth === 0) { end = i + 6; break; }
    }
  }
  const oldBlock = text.slice(second, end);
  console.log('Old block:', JSON.stringify(oldBlock.slice(0, 200)));

  const newBlock = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
      <div class="stat-card"><div class="stat-icon" style="color:#22c55e;font-size:1.4rem;font-weight:900">&#9679;</div><div><div class="stat-val" id="an-live">&mdash;</div><div class="stat-lbl">Live Now</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="color:#f59e0b;font-size:1.5rem">&#9728;</div><div><div class="stat-val" id="an-today">&mdash;</div><div class="stat-lbl">Today</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="color:#6366f1;font-size:1.3rem">&#9632;</div><div><div class="stat-val" id="an-recent">&mdash;</div><div class="stat-lbl">This Period</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="color:#14b8a6;font-size:1.3rem">&#9679;</div><div><div class="stat-val" id="an-total">&mdash;</div><div class="stat-lbl">All Time</div></div></div>
    </div>`;

  text = text.slice(0, second) + newBlock + text.slice(end);

  // Also fix the title and description line
  text = text.replace(/\?\? Visitor Analytics/, 'Visitor Analytics');
  text = text.replace(/Live visitor map [^\<]*see who visited/, 'Live visitor map - see who visited');
  
  fs.writeFileSync(path, text, 'utf8');
  console.log('SAVED OK');
} else {
  console.log('NOT FOUND');
}
