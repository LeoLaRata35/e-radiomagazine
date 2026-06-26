param(
    [string]$ArticulosDir = (Join-Path $PSScriptRoot "..\articulos"),
    [string]$OutputPath = (Join-Path $PSScriptRoot "..\data\articles.json")
)

$monthsDisplay = @{ '01'='Jan';'02'='Feb';'03'='Mar';'04'='Apr';'05'='May';'06'='Jun';'07'='Jul';'08'='Aug';'09'='Sep';'10'='Oct';'11'='Nov';'12'='Dec' }
$categoryLabelMap = @{
    'anime'='Anime'; 'manga'='Manga'; 'videojuegos'='Videojuegos'
    'cine'='Cine'; 'musica'='Música'; 'reviews'='Reviews'; 'game'='Videojuegos'
}

function ConvertTo-DisplayDate($isoDate) {
    if ($isoDate -match '^(\d{4})-(\d{2})-(\d{2})$') {
        $day = [int]$matches[3]
        $mon = $monthsDisplay[$matches[2]]
        $year = $matches[1]
        return "$day $mon $year"
    }
    return $isoDate
}

function Get-MetaContent($html, $attrName, $attrValue) {
    $regex1 = "<meta\s+$attrName=\`"$attrValue\`"\s+content=\`"([^\`"]+)\`""
    if ($html -match $regex1) {
        $val = $matches[1]
        if ($val -and $val.Length -gt 0) { return $val }
    }
    $regex2 = "<meta\s+content=\`"([^\`"]+)\`"\s+$attrName=\`"$attrValue\`""
    if ($html -match $regex2) {
        $val = $matches[1]
        if ($val -and $val.Length -gt 0) { return $val }
    }
    # Fallback: match content with possible quotes inside by not using [^"]
    $regex3 = "<meta\s+$attrName=\`"$attrValue\`"\s+content=\`"([^>]+)\`"\s*/?>"
    if ($html -match $regex3) {
        return $matches[1]
    }
    return $null
}

$articles = @()

Get-ChildItem "$ArticulosDir\*.html" | ForEach-Object {
    $file = $_.FullName
    $html = Get-Content $file -Raw -Encoding UTF8

    $title = Get-MetaContent $html "property" "og:title"
    if (-not $title) { $title = Get-MetaContent $html "name" "og:title" }
    
    $ogDesc = Get-MetaContent $html "property" "og:description"
    if (-not $ogDesc) { $ogDesc = Get-MetaContent $html "name" "og:description" }
    
    $ogImg = Get-MetaContent $html "property" "og:image"
    if (-not $ogImg) { $ogImg = Get-MetaContent $html "name" "og:image" }
    
    $category = Get-MetaContent $html "name" "article:category"
    $published = Get-MetaContent $html "name" "article:published_time"
    $href = "articulos/$($_.Name)"

    if (-not $title) {
        Write-Host "WARN: No title in $($_.Name), skipping" -ForegroundColor Yellow
        return
    }
    if (-not $published) {
        Write-Host "WARN: No published_time in $($_.Name), using file date" -ForegroundColor Yellow
        $published = $_.LastWriteTime.ToString("yyyy-MM-dd")
    }

    $displayDate = ConvertTo-DisplayDate $published
    if (-not $category) { $category = "anime" }
    $catLabel = $categoryLabelMap[$category]
    if (-not $catLabel) { $catLabel = $category.Substring(0,1).ToUpper() + $category.Substring(1) }
    if (-not $ogImg) { $ogImg = "https://leolarata35.github.io/e-radiomagazine/assets/default.png" }

    $articles += [PSCustomObject]@{
        category = $category
        img = $ogImg
        date = $displayDate
        categoryLabel = $catLabel
        title = $title
        description = $ogDesc
        href = $href
        sortDate = $published
    }
}

if ($articles.Count -eq 0) {
    Write-Host "ERROR: No articles found!" -ForegroundColor Red
    exit 1
}

$sorted = $articles | Sort-Object { [datetime]$_.sortDate } -Descending

$result = $sorted | Select-Object category, img, date, categoryLabel, title, description, href
$json = $result | ConvertTo-Json -Depth 3
Set-Content $OutputPath -Value $json -Encoding UTF8 -NoNewline
Write-Host "OK: $($result.Count) articles -> $OutputPath" -ForegroundColor Green
