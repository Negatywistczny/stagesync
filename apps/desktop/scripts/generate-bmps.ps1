Add-Type -AssemblyName System.Drawing

$outDir = "C:\Users\kacpe\Documents\GitHub\stagesync\apps\desktop\src-tauri\assets\installer"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir }

$sidebar = New-Object System.Drawing.Bitmap(164, 314)
$sgraph = [System.Drawing.Graphics]::FromImage($sidebar)
$sgraph.Clear([System.Drawing.Color]::FromArgb(255, 0, 0, 0))
$sidebar.Save("$outDir\sidebar.bmp", [System.Drawing.Imaging.ImageFormat]::Bmp)

$header = New-Object System.Drawing.Bitmap(150, 57)
$hgraph = [System.Drawing.Graphics]::FromImage($header)
$hgraph.Clear([System.Drawing.Color]::FromArgb(255, 0, 0, 0))
$header.Save("$outDir\header.bmp", [System.Drawing.Imaging.ImageFormat]::Bmp)

Write-Host "Generated bitmaps in $outDir"
