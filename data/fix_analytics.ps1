$path = "C:\Users\Yadadri Manufacturer\Desktop\Kiro 1\admin.html"
$text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# Find and replace the 4 stat cards that have garbled emojis
# Pattern: any stat-card that contains an-live, an-today, an-recent, an-total with garbled chars

$start = $text.IndexOf('<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">')
# Find the end (closing </div> of the grid)
$gridContent = $text.Substring($start)
$end = $gridContent.IndexOf('</div>' + "`n" + '    </div>')
if($end -lt 0){ $end = $gridContent.IndexOf("</div>`n    </div>") }
if($end -lt 0){ 
  # try to find next major section
  $end = $gridContent.IndexOf('<div style="background:linear-gradient') 
}

Write-Host "start: $start, relative end: $end"

$newCards = @'
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
      <div class="stat-card"><div class="stat-icon" style="color:#22c55e;font-size:1.5rem">&#x25CF;</div><div><div class="stat-val" id="an-live">&#x2014;</div><div class="stat-lbl">Live Now (5min)</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="color:#f59e0b;font-size:1.5rem">&#x2600;</div><div><div class="stat-val" id="an-today">&#x2014;</div><div class="stat-lbl">Today</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="color:#6366f1;font-size:1.5rem">&#x25A0;</div><div><div class="stat-val" id="an-recent">&#x2014;</div><div class="stat-lbl">This Period</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="color:#14b8a6;font-size:1.5rem">&#x2218;</div><div><div class="stat-val" id="an-total">&#x2014;</div><div class="stat-lbl">All Time</div></div></div>
    </div>
'@

# Replace old grid with new
$oldPattern = [regex]::Escape('<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">')
# Find exact old block
$idx1 = $text.IndexOf('<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">')
$idx2 = $text.IndexOf('<div style="background:linear-gradient(135deg,#e0f2fe')
if($idx1 -ge 0 -and $idx2 -gt $idx1){
  $oldBlock = $text.Substring($idx1, $idx2 - $idx1)
  Write-Host "OLD BLOCK length: $($oldBlock.Length)"
  Write-Host "OLD BLOCK: $oldBlock"
  $text = $text.Replace($oldBlock, $newCards + "`n    ")
  [System.IO.File]::WriteAllText($path, $text, [System.Text.Encoding]::UTF8)
  Write-Host "DONE"
} else {
  Write-Host "NOT FOUND idx1=$idx1 idx2=$idx2"
}
