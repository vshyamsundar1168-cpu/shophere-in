import re

path = r'C:\Users\Yadadri Manufacturer\Desktop\Kiro 1\admin.html'

with open(path, 'rb') as f:
    data = f.read()

text = data.decode('utf-8', errors='replace')

idx = text.find('id="an-live"')
print('an-live at:', idx)
ctx = text[idx-200:idx+300]
print('CONTEXT:', repr(ctx))

# New clean stat cards
new_cards = '''    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
      <div class="stat-card"><div class="stat-icon" style="color:#22c55e;font-size:1.3rem;font-weight:900">&#9679;</div><div><div class="stat-val" id="an-live">&mdash;</div><div class="stat-lbl">Live Now</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="color:#f59e0b;font-size:1.5rem">&#9728;</div><div><div class="stat-val" id="an-today">&mdash;</div><div class="stat-lbl">Today</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="color:#6366f1;font-size:1.3rem">&#9632;</div><div><div class="stat-val" id="an-recent">&mdash;</div><div class="stat-lbl">This Period</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="color:#14b8a6;font-size:1.3rem">&#9679;</div><div><div class="stat-val" id="an-total">&mdash;</div><div class="stat-lbl">All Time</div></div></div>
    </div>'''

# Find the entire grid section to replace
# Look for start marker
start_marker = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">'
# Find second occurrence (first is dashboard, second is analytics)
first = text.find(start_marker)
second = text.find(start_marker, first + 1)
print(f'First grid at: {first}, Second grid at: {second}')

if second > 0:
    # Find the end: next </div> after the 5 closing </div>s
    end_search = text[second:]
    # Find </div>\n    </div> pattern (closing the outer grid div)
    # The grid has structure: <div> 4x<div></div> </div>
    # Count opening/closing divs
    depth = 0
    end_pos = second
    for i, ch in enumerate(end_search):
        if end_search[i:i+4] == '<div':
            depth += 1
        elif end_search[i:i+6] == '</div>':
            depth -= 1
            if depth == 0:
                end_pos = second + i + 6
                break
    print(f'Grid ends at: {end_pos}')
    old_block = text[second:end_pos]
    print('OLD:', repr(old_block[:100]))
    text = text[:second] + new_cards + text[end_pos:]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print('SAVED')
else:
    print('Second grid not found')
