const fs = require('fs');
const path = 'C:/Users/Yadadri Manufacturer/Desktop/Kiro 1/admin.html';
let text = fs.readFileSync(path, 'utf8');

// Find an-live directly
const idx = text.indexOf('id="an-live"');
console.log('an-live at:', idx);
console.log('Context around it:');
console.log(JSON.stringify(text.slice(idx-250, idx+50)));

// Find the grid div that contains an-live
// Search backwards from an-live for the opening grid div
let searchBack = text.slice(0, idx);
const gridStart = searchBack.lastIndexOf('<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">');
console.log('Grid start at:', gridStart);

if (gridStart > 0) {
  // Find end by counting divs
  let depth = 0;
  let end = gridStart;
  for (let i = gridStart; i < text.length - 5; i++) {
    if (text.slice(i, i+4) === '<div') depth++;
    else if (text.slice(i, i+6) === '</div') {
      depth--;
      if (depth === 0) { end = i + 6; break; }
    }
  }
  const oldBlock = text.slice(gridStart, end);
  console.log('Old block length:', oldBlock.length);
  console.log('Old block:', JSON.stringify(oldBlock));

  const newBlock = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
      <div class="stat-card"><div class="stat-icon" style="color:#22c55e;font-size:1.4rem;font-weight:900">&#9679;</div><div><div class="stat-val" id="an-live">&mdash;</div><div class="stat-lbl">Live Now</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="color:#f59e0b;font-size:1.5rem">&#9728;</div><div><div class="stat-val" id="an-today">&mdash;</div><div class="stat-lbl">Today</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="color:#6366f1;font-size:1.3rem">&#9632;</div><div><div class="stat-val" id="an-recent">&mdash;</div><div class="stat-lbl">This Period</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="color:#14b8a6;font-size:1.3rem">&#9679;</div><div><div class="stat-val" id="an-total">&mdash;</div><div class="stat-lbl">All Time</div></div></div>
    </div>`;

  text = text.slice(0, gridStart) + newBlock + text.slice(end);
  
  // Fix garbled title
  text = text.replace(/\?\?\s*Visitor Analytics/, 'Visitor Analytics');

  fs.writeFileSync(path, text, 'utf8');
  console.log('SAVED');
}
