$r = Invoke-WebRequest -Uri "https://shophere.in/admin.html" -UseBasicParsing
$c = $r.Content
# Find the serverAlert check
$idx = $c.IndexOf('serverAlert')
"serverAlert idx: $idx" | Out-File data\check3.txt
if($idx -ge 0){ $c.Substring([Math]::Max(0,$idx-10),[Math]::Min(500,$c.Length-$idx)) | Add-Content data\check3.txt }
# Find login/auth check
"=== AUTH CHECK ===" | Add-Content data\check3.txt
$idx2 = $c.IndexOf('sh_user')
if($idx2 -ge 0){ $c.Substring([Math]::Max(0,$idx2-50),[Math]::Min(300,$c.Length-$idx2+50)) | Add-Content data\check3.txt }
# Find DOMContentLoaded
"=== DOM LOADED ===" | Add-Content data\check3.txt
$idx3 = $c.IndexOf('DOMContentLoaded')
if($idx3 -ge 0){ $c.Substring([Math]::Max(0,$idx3-10),[Math]::Min(600,$c.Length-$idx3)) | Add-Content data\check3.txt }
