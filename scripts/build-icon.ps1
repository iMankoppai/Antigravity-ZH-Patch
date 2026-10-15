[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$repoRoot = Split-Path -Parent $PSScriptRoot
$iconSourcePath = Join-Path $repoRoot 'src/AntigravityZhManager/Assets/app-icon.png'
$iconOutputPath = Join-Path $repoRoot 'src/AntigravityZhManager/Assets/app.ico'
$sourceImage = [System.Drawing.Image]::FromFile($iconSourcePath)
# Preserve the original clean tile silhouette independently of the color artwork.
$maskImage = [System.Drawing.Image]::FromFile((Join-Path $repoRoot 'src/AntigravityZhManager/Assets/app-icon-mask.png'))
$sizes = @(16, 20, 24, 32, 40, 48, 64, 256)
$frames = [System.Collections.Generic.List[byte[]]]::new()

try {
    foreach ($size in $sizes) {
        $bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $maskBitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $maskGraphics = [System.Drawing.Graphics]::FromImage($maskBitmap)
        try {
            $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $graphics.Clear([System.Drawing.Color]::Transparent)
            $graphics.DrawImage($sourceImage, [System.Drawing.Rectangle]::new(0, 0, $size, $size))
            $maskGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
            $maskGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $maskGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $maskGraphics.Clear([System.Drawing.Color]::Transparent)
            $maskGraphics.DrawImage($maskImage, [System.Drawing.Rectangle]::new(0, 0, $size, $size))
            $bitmapData = $bitmap.LockBits([System.Drawing.Rectangle]::new(0, 0, $size, $size),
                [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
            try {
                $maskStride = [int]([Math]::Ceiling($size / 32.0) * 4)
                $pixelBytes = $size * $size * 4
                $frame = [byte[]]::new(40 + $pixelBytes + $maskStride * $size)
                [BitConverter]::GetBytes([uint32]40).CopyTo($frame, 0)
                [BitConverter]::GetBytes([int32]$size).CopyTo($frame, 4)
                [BitConverter]::GetBytes([int32]($size * 2)).CopyTo($frame, 8)
                [BitConverter]::GetBytes([uint16]1).CopyTo($frame, 12)
                [BitConverter]::GetBytes([uint16]32).CopyTo($frame, 14)
                [BitConverter]::GetBytes([uint32]($pixelBytes + $maskStride * $size)).CopyTo($frame, 20)
                for ($row = 0; $row -lt $size; $row++) {
                    $destination = 40 + ($size - 1 - $row) * $size * 4
                    [System.Runtime.InteropServices.Marshal]::Copy(
                        [IntPtr]::Add($bitmapData.Scan0, $row * $bitmapData.Stride), $frame, $destination, $size * 4)
                    for ($column = 0; $column -lt $size; $column++) {
                        $pixel = $destination + $column * 4
                        $originalAlpha = $maskBitmap.GetPixel($column, $row).A
                        if ($frame[$pixel + 3] -eq 0 -and $originalAlpha -gt 0) {
                            $frame[$pixel] = 255; $frame[$pixel + 1] = 255; $frame[$pixel + 2] = 255
                        }
                        $frame[$pixel + 3] = $originalAlpha
                        if ($originalAlpha -eq 0) {
                            $frame[$pixel] = 0; $frame[$pixel + 1] = 0; $frame[$pixel + 2] = 0
                        }
                        if ($frame[$destination + $column * 4 + 3] -eq 0) {
                            # Both alpha and the legacy AND mask describe transparent corners.
                            $maskByte = 40 + $pixelBytes + ($size - 1 - $row) * $maskStride + [int][Math]::Floor($column / 8.0)
                            $frame[$maskByte] = $frame[$maskByte] -bor (128 -shr ($column % 8))
                        }
                    }
                }
                $frames.Add($frame)
            } finally { $bitmap.UnlockBits($bitmapData) }
        } finally { $graphics.Dispose(); $bitmap.Dispose(); $maskGraphics.Dispose(); $maskBitmap.Dispose() }
    }
    $outputStream = [System.IO.MemoryStream]::new()
    $writer = [System.IO.BinaryWriter]::new($outputStream)
    try {
        $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$sizes.Count)
        $offset = 6 + 16 * $sizes.Count
        for ($index = 0; $index -lt $sizes.Count; $index++) {
            $dimension = if ($sizes[$index] -eq 256) { 0 } else { $sizes[$index] }
            $writer.Write([byte]$dimension); $writer.Write([byte]$dimension)
            $writer.Write([byte]0); $writer.Write([byte]0)
            $writer.Write([uint16]1); $writer.Write([uint16]32)
            $writer.Write([uint32]$frames[$index].Length); $writer.Write([uint32]$offset)
            $offset += $frames[$index].Length
        }
        foreach ($frame in $frames) { $writer.Write($frame) }
        [System.IO.File]::WriteAllBytes($iconOutputPath, $outputStream.ToArray())
    } finally { $writer.Dispose(); $outputStream.Dispose() }
} finally { $sourceImage.Dispose(); $maskImage.Dispose() }
Write-Output "Generated 32-bit transparent ICO: $($sizes -join ', ') px"
