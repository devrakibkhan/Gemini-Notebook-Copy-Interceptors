Add-Type -AssemblyName System.Drawing

$sizes = @(16, 48, 128)
$basePath = $PSScriptRoot

foreach ($size in $sizes) {
    $bitmap = New-Object System.Drawing.Bitmap $size, $size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # 1. & 3. Ensure transparency by clearing the background with a transparent color
    $graphics.Clear([System.Drawing.Color]::Transparent)
    
    # Enable high quality rendering for crisp scaling
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    # 4. Draw an edge-to-edge geometric logo.
    # We will draw a stylish "G" or circle to represent the extension.
    # To make it edge-to-edge, we use the full canvas dimensions.
    
    $rect = New-Object System.Drawing.RectangleF (0, 0, $size, $size)
    
    # Draw an edge-to-edge dark rounded shape with a blue accent
    $primaryColor = [System.Drawing.Color]::FromArgb(255, 66, 133, 244) # Blue
    $darkColor = [System.Drawing.Color]::FromArgb(255, 32, 33, 36) # Dark
    
    $brushDark = New-Object System.Drawing.SolidBrush $darkColor
    $graphics.FillEllipse($brushDark, $rect)
    
    # Inner blue circle
    $innerOffset = $size * 0.2
    $innerSize = $size * 0.6
    $innerRect = New-Object System.Drawing.RectangleF ($innerOffset, $innerOffset, $innerSize, $innerSize)
    $brushBlue = New-Object System.Drawing.SolidBrush $primaryColor
    $graphics.FillEllipse($brushBlue, $innerRect)
    
    # Clean up
    $brushDark.Dispose()
    $brushBlue.Dispose()
    $graphics.Dispose()
    
    # 1. & 2. Save as true PNG format
    $filename = "icon$size.png"
    $filepath = Join-Path $PWD $filename
    $bitmap.Save($filepath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    
    Write-Host "Generated: $filename"
}
Write-Host "Done."
