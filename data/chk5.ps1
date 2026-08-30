$headers = @{"Cache-Control"="no-cache";"Pragma"="no-cache"}
$a = (Invoke-WebRequest 'https://shophere.in/app.js' -UseBasicParsing -Headers $headers).Content
$s = (Invoke-WebRequest 'https://shophere.in/style.css' -UseBasicParsing -Headers $headers).Content
$r = (Invoke-WebRequest 'https://shophere.in/app.js' -UseBasicParsing -Headers $headers)
"=== CACHE HEADERS ===" | Out-File data\chk5.txt
"app.js Cache-Control: "+($r.Headers['Cache-Control']) | Add-Content data\chk5.txt
"=== SIZES ===" | Add-Content data\chk5.txt
"app.js: $($a.Length) bytes" | Add-Content data\chk5.txt
"style.css: $($s.Length) bytes" | Add-Content data\chk5.txt
"=== ZOOM CSS ===" | Add-Content data\chk5.txt
$idx = $s.IndexOf("pb-img-zoom")
if($idx -ge 0){ $s.Substring($idx,[Math]::Min(300,$s.Length-$idx)) | Add-Content data\chk5.txt }
"=== IMAGE BLOCK IN APP.JS ===" | Add-Content data\chk5.txt
$idx2 = $a.IndexOf("CLEAN IMAGE BLOCK")
if($idx2 -ge 0){ $a.Substring($idx2,[Math]::Min(600,$a.Length-$idx2)) | Add-Content data\chk5.txt }
else { "NOT FOUND - checking image-link..." | Add-Content data\chk5.txt; $idx3=$a.IndexOf("image-link"); if($idx3 -ge 0){$a.Substring($idx3,[Math]::Min(400,$a.Length-$idx3)) | Add-Content data\chk5.txt} }
