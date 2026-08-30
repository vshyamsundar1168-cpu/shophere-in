const fs = require('fs');
const path = 'C:/Users/Yadadri Manufacturer/Desktop/Kiro 1/admin.html';
let text = fs.readFileSync(path, 'utf8');

// Find the start of the first analytics stats grid (contains an-live)
const firstLive = text.indexOf('id="an-live"');

// Search backwards for the opening <div style="display:grid
let gridStart = text.lastIndexOf('<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">', firstLive);
console.log('First grid start:', gridStart);

// Find the start of the map section (which comes right after the grid)
const mapSection = text.indexOf('<div style="background:linear-gradient(135deg,#e0f2fe', firstLive);
console.log('Map section at:', mapSection);

// Replace everything from gridStart to mapSection with clean cards
const cleanCards = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
      <div class="stat-card"><div class="stat-icon" style="color:#22c55e;font-size:1.4rem;font-weight:900">&#9679;</div><div><div class="stat-val" id="an-live">&mdash;</div><div class="stat-lbl">Live Now</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="color:#f59e0b;font-size:1.5rem">&#9728;</div><div><div class="stat-val" id="an-today">&mdash;</div><div class="stat-lbl">Today</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="color:#6366f1;font-size:1.3rem">&#9632;</div><div><div class="stat-val" id="an-recent">&mdash;</div><div class="stat-lbl">This Period</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="color:#14b8a6;font-size:1.3rem">&#9679;</div><div><div class="stat-val" id="an-total">&mdash;</div><div class="stat-lbl">All Time</div></div></div>
    </div>
    `;

if (gridStart > 0 && mapSection > gridStart) {
  const removed = text.slice(gridStart, mapSection);
  console.log('Removing', removed.length, 'chars from position', gridStart, 'to', mapSection);
  text = text.slice(0, gridStart) + cleanCards + text.slice(mapSection);
  
  // Verify
  const newCount = (text.match(/id="an-live"/g)||[]).length;
  console.log('an-live count after fix:', newCount);
  
  if (newCount === 1) {
    fs.writeFileSync(path, text, 'utf8');
    console.log('SAVED SUCCESSFULLY');
  } else {
    console.log('Still has duplicates - not saving');
  }
} else {
  console.log('Could not find boundaries - gridStart:', gridStart, 'mapSection:', mapSection);
}
