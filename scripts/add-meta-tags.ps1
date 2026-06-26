param()

$jsonPath = Join-Path $PSScriptRoot "..\data\articles.json"
$articulosDir = Join-Path $PSScriptRoot "..\articulos"

$articles = Get-Content $jsonPath -Raw | ConvertFrom-Json

$months = @{Jan='01';Feb='02';Mar='03';Apr='04';May='05';Jun='06';Jul='07';Aug='08';Sep='09';Oct='10';Nov='11';Dec='12'}

$hrefMap = @{}
foreach ($a in $articles) {
    $href = $a.href -replace '^articulos/', ''
    $parts = $a.date -split ' '
    $day = $parts[0].PadLeft(2, '0')
    $mon = $months[$parts[1]]
    $year = $parts[2]
    $isoDate = "$year-$mon-$day"
    $hrefMap[$href] = @{
        date = $isoDate
        category = $a.category
    }
}

$orphanDates = @{
    'classroomelite.html' = '2026-06-24'; 'gatodragon.html' = '2026-06-25'
    'gtavi.html' = '2026-06-25'; 'gunblaze.html' = '2026-06-25'
    'hanamori-san.html' = '2026-06-24'; 'karasu.html' = '2026-06-25'
    'kimiai.html' = '2026-06-25'; 'laracroftgijoe.html' = '2026-06-25'
    'nabetama.html' = '2026-06-25'; 'nijusseiki(1).html' = '2026-06-25'
    'straydogs.html' = '2026-06-25'; 'sudachi.html' = '2026-06-25'
    'zombie.html' = '2026-06-25'
}

$orphanCategories = @{
    'classroomelite.html' = 'anime'; 'gatodragon.html' = 'anime'
    'gtavi.html' = 'videojuegos'; 'gunblaze.html' = 'anime'
    'hanamori-san.html' = 'anime'; 'karasu.html' = 'musica'
    'kimiai.html' = 'anime'; 'laracroftgijoe.html' = 'videojuegos'
    'nabetama.html' = 'anime'; 'nijusseiki(1).html' = 'anime'
    'straydogs.html' = 'anime'; 'sudachi.html' = 'anime'
    'zombie.html' = 'anime'
}

$updated = 0
$skipped = 0

Get-ChildItem "$articulosDir\*.html" | ForEach-Object {
    $file = $_.FullName
    $name = $_.Name
    $content = Get-Content $file -Raw -Encoding UTF8
    $changed = $false

    # Add published_time if missing
    if ($content -notmatch '<meta\s+name="article:published_time"') {
        $info = $hrefMap[$name]
        $isoDate = if ($info) { $info.date } else { $orphanDates[$name] }
        if (-not $isoDate) { $isoDate = $_.LastWriteTime.ToString("yyyy-MM-dd") }
        $tag = "  <meta name=`"article:published_time`" content=`"$isoDate`">`n"
        $content = $content -replace '(</head>)', "$tag`$1"
        $changed = $true
    }

    # Add article:category if missing
    if ($content -notmatch '<meta\s+name="article:category"') {
        $info = $hrefMap[$name]
        $cat = if ($info) { $info.category } else { $orphanCategories[$name] }
        if (-not $cat) { $cat = 'anime' }
        $tag = "  <meta name=`"article:category`" content=`"$cat`">`n"
        $content = $content -replace '(</head>)', "$tag`$1"
        $changed = $true
    }

    if ($changed) {
        Set-Content $file -Value $content -Encoding UTF8 -NoNewline
        Write-Host "UPDATED $name" -ForegroundColor Green
        $updated++
    } else {
        $skipped++
    }
}

Write-Host "`nDone: $updated updated, $skipped already had tags"
