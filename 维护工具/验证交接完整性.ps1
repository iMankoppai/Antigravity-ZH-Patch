$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$manifest = [IO.File]::ReadAllText((Join-Path $root '交接文件清单.json')) | ConvertFrom-Json
$failures = @()
foreach ($item in $manifest.files) {
    $file = [IO.Path]::GetFullPath((Join-Path $root $item.path))
    if (-not $file.StartsWith($root.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)) { throw '清单包含目录外路径。' }
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { $failures += ('缺少：'+$item.path); continue }
    $stream = [IO.File]::OpenRead($file)
    $hasher = [Security.Cryptography.SHA256]::Create()
    try { $digest = [BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-','').ToLower() }
    finally { $stream.Dispose(); $hasher.Dispose() }
    if ($digest -ne $item.sha256 -or (Get-Item -LiteralPath $file).Length -ne $item.bytes) { $failures += ('已变化：'+$item.path) }
}
if ($failures.Count) { throw ($failures -join [Environment]::NewLine) }
Write-Host ('交接文件完整性通过：'+$manifest.files.Count+' 个文件。')
