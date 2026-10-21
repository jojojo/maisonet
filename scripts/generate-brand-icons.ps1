# Regenerate platform renditions from public/icon.png. The original artwork is unchanged.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$brandRoot = Split-Path $PSScriptRoot -Parent
$source = [System.Drawing.Bitmap]::new((Join-Path $brandRoot 'public/icon.png'))

try {
    # Fit the visible artwork consistently despite transparent export margins.
    $left = $source.Width; $top = $source.Height; $right = -1; $bottom = -1
    for ($y = 0; $y -lt $source.Height; $y++) {
        for ($x = 0; $x -lt $source.Width; $x++) {
            if ($source.GetPixel($x, $y).A -gt 24) {
                $left = [Math]::Min($left, $x); $right = [Math]::Max($right, $x)
                $top = [Math]::Min($top, $y); $bottom = [Math]::Max($bottom, $y)
            }
        }
    }
    if ($right -lt $left) { throw 'The icon artwork is empty.' }
    $sourceRect = [System.Drawing.Rectangle]::new($left, $top, $right - $left + 1, $bottom - $top + 1)
    $background = [System.Drawing.ColorTranslator]::FromHtml('#b9efeb')
    function Write-BrandIcon([string]$RelativePath, [int]$Size, [double]$Padding = 0.1) {
        $bitmap = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
            $graphics.Clear($background)
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $scale = $Size * (1 - 2 * $Padding) / [Math]::Max($sourceRect.Width, $sourceRect.Height)
            $width = [int][Math]::Round($sourceRect.Width * $scale); $height = [int][Math]::Round($sourceRect.Height * $scale)
            $targetRect = [System.Drawing.Rectangle]::new([int](($Size - $width) / 2), [int](($Size - $height) / 2), $width, $height)
            $graphics.DrawImage($source, $targetRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
            $bitmap.Save((Join-Path $brandRoot $RelativePath), [System.Drawing.Imaging.ImageFormat]::Png)
        } finally { $graphics.Dispose(); $bitmap.Dispose() }
    }
    Write-BrandIcon 'public/pwa-icons/icon-192.png' 192
    Write-BrandIcon 'public/pwa-icons/icon-512.png' 512
    Write-BrandIcon 'public/pwa-icons/apple-touch-icon.png' 180
    Write-BrandIcon 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png' 1024
    # The adaptive foreground has its own inset in XML.
    Write-BrandIcon 'android/app/src/main/res/drawable/maisonet_icon.png' 512 0
    $densities = @{ldpi=36; mdpi=48; hdpi=72; xhdpi=96; xxhdpi=144; xxxhdpi=192}
    foreach ($density in $densities.GetEnumerator()) {
        Write-BrandIcon "android/app/src/main/res/mipmap-$($density.Key)/ic_launcher.png" $density.Value
        Write-BrandIcon "android/app/src/main/res/mipmap-$($density.Key)/ic_launcher_round.png" $density.Value
    }
    Write-Output 'PWA, Android and iOS icons regenerated.'
} finally { $source.Dispose() }
