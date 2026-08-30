$a = (Invoke-WebRequest 'https://shophere.in/app.js' -UseBasicParsing).Content
$s = (Invoke-WebRequest 'https://shophere.in/style.css' -UseBasicParsing).Content
"app.js size: $($a.Length)" | Out-File data\chk.txt
"pb-img-zoom in app.js: $(if($a -match 'pb-img-zoom'){'YES'}else{'NO'})" | Add-Content data\chk.txt
"openLightbox in app.js: $(if($a -match 'openLightbox'){'YES'}else{'NO'})" | Add-Content data\chk.txt
"style.css size: $($s.Length)" | Add-Content data\chk.txt
"pb-img-zoom in style.css: $(if($s -match 'pb-img-zoom'){'YES'}else{'NO'})" | Add-Content data\chk.txt
"scale(1.07) in style.css: $(if($s -match 'scale\(1\.07\)'){'YES'}else{'NO'})" | Add-Content data\chk.txt
# Show the pb-img-zoom CSS rule
$idx = $s.IndexOf('pb-img-zoom')
if($idx -ge 0){ "CSS rule: "+$s.Substring($idx, [Math]::Min(200,$s.Length-$idx)) | Add-Content data\chk.txt }
# Show image block code
$idx2 = $a.IndexOf('pb-img-zoom')
if($idx2 -ge 0){ "JS code: "+$a.Substring([Math]::Max(0,$idx2-100),[Math]::Min(300,$a.Length-$idx2+100)) | Add-Content data\chk.txt }
