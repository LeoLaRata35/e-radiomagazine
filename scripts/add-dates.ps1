param()

$jsonPath = Join-Path $PSScriptRoot "..\data\articles.json"
$articulosDir = Join-Path $PSScriptRoot "..\articulos"

$articles = Get-Content $jsonPath -Raw | ConvertFrom-Json

$hrefDateMap = @{}
$hrefDataMap = @{}
foreach ($a in $articles) {
    $href = $a.href -replace '^articulos/', ''
    $dateStr = $a.date
    $parts = $dateStr -split ' '
    $months = @{Jan='01';Feb='02';Mar='03';Apr='04';May='05';Jun='06';Jul='07';Aug='08';Sep='09';Oct='10';Nov='11';Dec='12'}
    $day = $parts[0].PadLeft(2, '0')
    $mon = $months[$parts[1]]
    $year = $parts[2]
    $isoDate = "$year-$mon-$day"
    $hrefDateMap[$href] = $isoDate
    $hrefDataMap[$href] = @{
        category = $a.category
        img = $a.img
        date = $a.date
        categoryLabel = $a.categoryLabel
        title = $a.title
        description = $a.description
        href = $a.href
    }
}

# Orphaned files - assign from git commit dates
$orphanDates = @{
    'classroomelite.html' = '2026-06-24'
    'gatodragon.html' = '2026-06-25'
    'gtavi.html' = '2026-06-25'
    'gunblaze.html' = '2026-06-25'
    'hanamori-san.html' = '2026-06-24'
    'karasu.html' = '2026-06-25'
    'kimiai.html' = '2026-06-25'
    'laracroftgijoe.html' = '2026-06-25'
    'nabetama.html' = '2026-06-25'
    'nijusseiki(1).html' = '2026-06-25'
    'straydogs.html' = '2026-06-25'
    'sudachi.html' = '2026-06-25'
    'zombie.html' = '2026-06-25'
}

$updated = 0
$skipped = 0
$added = 0

Get-ChildItem "$articulosDir\*.html" | ForEach-Object {
    $file = $_.FullName
    $name = $_.Name
    $content = Get-Content $file -Raw -Encoding UTF8

    # Check if already has published_time
    if ($content -match '<meta\s+name="article:published_time"') {
        Write-Host "SKIP $name (already has date)" -ForegroundColor DarkGray
        $skipped++
        return
    }

    $isoDate = $hrefDateMap[$name]
    if (-not $isoDate) {
        $isoDate = $orphanDates[$name]
    }

    if (-not $isoDate) {
        Write-Host "WARN $name (no date found, using file lastwrite)" -ForegroundColor Yellow
        $isoDate = $_.LastWriteTime.ToString("yyyy-MM-dd")
    }

    # Insert before </head>
    $insertTag = "  <meta name=`"article:published_time`" content=`"$isoDate`">`n"
    $pattern = '(</head>)'
    if ($content -match $pattern) {
        $content = $content -replace $pattern, "$insertTag`$1"
        Set-Content $file -Value $content -Encoding UTF8 -NoNewline
        Write-Host "ADDED date $isoDate -> $name" -ForegroundColor Green
        $updated++
    }
}

Write-Host "`nDone: $updated updated, $skipped skipped, $added added"
