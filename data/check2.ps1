$r = Invoke-WebRequest -Uri "https://shophere.in/admin.html" -UseBasicParsing -Headers @{"Cache-Control"="no-cache";"Pragma"="no-cache"}
$c = $r.Content
# Write first 300 chars of head
"=== FIRST 400 CHARS ===" | Out-File data\check2.txt
$c.Substring(0,[Math]::Min(400,$c.Length)) | Add-Content data\check2.txt
# Check for key strings
"=== KEY CHECKS ===" | Add-Content data\check2.txt
"cancelOrder present: $(if($c -match 'cancelOrder'){'YES'}else{'NO'})" | Add-Content data\check2.txt
"overlay.open present: $(if($c -match 'overlay\.open'){'YES'}else{'NO'})" | Add-Content data\check2.txt
"pbSaveBlock direct onclick: $(if($c -match 'onclick..pbSaveBlock'){'YES'}else{'NO'})" | Add-Content data\check2.txt
"pbModal div present: $(if($c -match 'id=.pbModal'){'YES'}else{'NO'})" | Add-Content data\check2.txt
"Size: $($c.Length)" | Add-Content data\check2.txt
# Show section around pbModal
$idx = $c.IndexOf('id="pbModal"')
"=== pbModal context (idx=$idx) ===" | Add-Content data\check2.txt
if($idx -ge 0){ $c.Substring([Math]::Max(0,$idx-20),[Math]::Min(300,$c.Length-$idx+20)) | Add-Content data\check2.txt }
