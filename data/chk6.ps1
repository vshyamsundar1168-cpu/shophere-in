$a = (Invoke-WebRequest 'https://shophere.in/app.js' -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}).Content
$h = (Invoke-WebRequest 'https://shophere.in/admin.html' -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}).Content
"=== APP.JS CHECKS ===" | Out-File data\chk6.txt
"pb-block-title present: $(if($a -match 'pb-block-title'){'YES'}else{'NO'})" | Add-Content data\chk6.txt
"pb-block-caption present: $(if($a -match 'pb-block-caption'){'YES'}else{'NO'})" | Add-Content data\chk6.txt
"titleHtml present: $(if($a -match 'titleHtml'){'YES'}else{'NO'})" | Add-Content data\chk6.txt
"=== ADMIN.HTML CHECKS ===" | Add-Content data\chk6.txt
"pb_caption present: $(if($h -match 'pb_caption'){'YES'}else{'NO'})" | Add-Content data\chk6.txt
"admin only REMOVED: $(if($h -match 'admin only'){'NO - still there'}else{'YES - removed'})" | Add-Content data\chk6.txt
"Block Title label: $(if($h -match 'Block Title.*shown on store'){'NEW'}else{'OLD'})" | Add-Content data\chk6.txt
# Show live blocks from API
$b = (Invoke-WebRequest 'https://shophere.in/api/pageblocks' -UseBasicParsing).Content
"=== LIVE BLOCKS ===" | Add-Content data\chk6.txt
$b | Add-Content data\chk6.txt
