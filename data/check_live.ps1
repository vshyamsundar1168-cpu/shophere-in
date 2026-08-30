$r = Invoke-WebRequest -Uri "https://shophere.in/admin.html" -UseBasicParsing
$c = $r.Content
"SIZE: $($c.Length)" | Out-File data\live_check.txt
if($c -match "cancelOrder"){"HAS cancelOrder: YES" | Add-Content data\live_check.txt}else{"HAS cancelOrder: NO" | Add-Content data\live_check.txt}
if($c -match "pbSaveBtn"){"HAS old pbSaveBtn ID: YES" | Add-Content data\live_check.txt}else{"HAS old pbSaveBtn ID: NO" | Add-Content data\live_check.txt}
if($c -match "onclick=`"pbSaveBlock"){"HAS direct onclick pbSaveBlock: YES" | Add-Content data\live_check.txt}else{"HAS direct onclick pbSaveBlock: NO" | Add-Content data\live_check.txt}
if($c -match "overlay.open"){"HAS overlay CSS: YES" | Add-Content data\live_check.txt}else{"HAS overlay CSS: NO" | Add-Content data\live_check.txt}
# Show 500 chars around pbModal
$idx = $c.IndexOf("pbModal")
if($idx -ge 0){$c.Substring([Math]::Max(0,$idx-50), 200) | Add-Content data\live_check.txt}
