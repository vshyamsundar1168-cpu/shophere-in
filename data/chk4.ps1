$a = (Invoke-WebRequest 'https://shophere.in/app.js' -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}).Content
$s = (Invoke-WebRequest 'https://shophere.in/style.css' -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}).Content
"app.js size: $($a.Length)" | Out-File data\chk4.txt
"video+audio duplicate bug fixed: $(if($a -match 'else if.*audio'){'YES - separate'}else{'NO - still broken'})" | Add-Content data\chk4.txt
"clean image block present: $(if($a -match 'CLEAN IMAGE BLOCK'){'YES'}else{'NO'})" | Add-Content data\chk4.txt
"zoom4 in style.css: $(if($s -match 'zoom4'){'YES - new CSS'}else{'NO - old CSS'})" | Add-Content data\chk4.txt
"pb-img-zoom overflow hidden: $(if($s -match 'pb-img-zoom\{[^}]*overflow:hidden'){'YES'}else{'NO'})" | Add-Content data\chk4.txt
"bb3fb57 commit: $(if($a -match 'bb3fb57'){'YES'}else{'checking size: '+$a.Length})" | Add-Content data\chk4.txt
# Show image block section from live app.js
$idx = $a.IndexOf("CLEAN IMAGE BLOCK")
if($idx -lt 0){ $idx = $a.IndexOf("image-link") }
if($idx -ge 0){ "=== IMAGE BLOCK CODE ==="; $a.Substring($idx,[Math]::Min(400,$a.Length-$idx)) | Add-Content data\chk4.txt }
