$outFile = "C:\Users\Yadadri Manufacturer\Desktop\Kiro 1\data\live_check2.txt"
$results = [System.Collections.Generic.List[string]]::new()

$results.Add("=== FETCHING https://shophere.in/index.html ===")
try {
    $resp = Invoke-WebRequest -Uri "https://shophere.in/index.html" -Headers @{"Cache-Control"="no-cache";"Pragma"="no-cache"} -UseBasicParsing -TimeoutSec 30
    $html = $resp.Content
    $html | Out-File "C:\Users\Yadadri Manufacturer\Desktop\Kiro 1\data\live_index.txt" -Encoding utf8
    $results.Add("Status: $($resp.StatusCode)")
    $results.Add("File size: $($html.Length) chars")
    $results.Add("")
    $results.Add("--- First 500 chars ---")
    $results.Add($html.Substring(0, [Math]::Min(500, $html.Length)))
    $results.Add("")
    $psCount = ([regex]::Matches($html, 'productsSection')).Count
    $spCount = ([regex]::Matches($html, 'showProducts')).Count
    $fcCount = ([regex]::Matches($html, 'filterCat')).Count
    $results.Add("--- Occurrence Counts ---")
    $results.Add("productsSection: $psCount")
    $results.Add("showProducts: $spCount")
    $results.Add("filterCat: $fcCount")
    $results.Add("")
    $results.Add("--- Nav Section (300 chars after mainNav) ---")
    $navIdx = $html.IndexOf('mainNav')
    if ($navIdx -ge 0) {
        $results.Add($html.Substring($navIdx, [Math]::Min(300, $html.Length - $navIdx)))
    } else {
        $results.Add("(mainNav not found)")
        $navIdx2 = $html.IndexOf('<nav')
        if ($navIdx2 -ge 0) {
            $results.Add("Found nav at index $navIdx2 :")
            $results.Add($html.Substring($navIdx2, [Math]::Min(300, $html.Length - $navIdx2)))
        }
    }
} catch {
    $results.Add("ERROR fetching index.html: $_")
}

$results.Add("")
$results.Add("============================================")
$results.Add("")
$results.Add("=== FETCHING https://shophere.in/app.js ===")
try {
    $resp2 = Invoke-WebRequest -Uri "https://shophere.in/app.js" -Headers @{"Cache-Control"="no-cache";"Pragma"="no-cache"} -UseBasicParsing -TimeoutSec 30
    $appjs = $resp2.Content
    $results.Add("Status: $($resp2.StatusCode)")
    $results.Add("File size: $($appjs.Length) chars")
    $results.Add("")
    $results.Add("--- Function Checks ---")
    $hasSP = [bool]([regex]::IsMatch($appjs, 'function showProducts'))
    $hasFC = [bool]([regex]::IsMatch($appjs, 'function filterCat'))
    $hasRP = [bool]([regex]::IsMatch($appjs, 'function renderProducts'))
    $results.Add("Contains 'function showProducts': $hasSP")
    $results.Add("Contains 'function filterCat': $hasFC")
    $results.Add("Contains 'function renderProducts': $hasRP")
    $results.Add("")
    $results.Add("--- Extra Counts ---")
    $results.Add("productsSection occurrences: $(([regex]::Matches($appjs,'productsSection')).Count)")
    $results.Add("showProducts occurrences: $(([regex]::Matches($appjs,'showProducts')).Count)")
    $results.Add("filterCat occurrences: $(([regex]::Matches($appjs,'filterCat')).Count)")
    $results.Add("")
    $results.Add("--- First 300 chars of app.js ---")
    $results.Add($appjs.Substring(0, [Math]::Min(300, $appjs.Length)))
} catch {
    $results.Add("ERROR fetching app.js: $_")
}

$results | Out-File $outFile -Encoding utf8
Get-Content $outFile
