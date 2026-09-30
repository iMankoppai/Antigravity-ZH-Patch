$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$windowsModulePath = Join-Path $PSHOME 'Modules'
$env:PSModulePath = $windowsModulePath + ';' + $env:PSModulePath
function Get-PackageFileHash([string]$Path) {
    $stream = [System.IO.File]::OpenRead($Path)
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($algorithm.ComputeHash($stream)).Replace('-','') }
    finally { $stream.Dispose(); $algorithm.Dispose() }
}
function Get-PackageRoot { return $PSScriptRoot }
function Get-PatchConfig {
    $configPath = Join-Path $PSScriptRoot 'config.json'
    if (-not (Test-Path -LiteralPath $configPath)) { throw '请先双击“安装汉化.cmd”，选择 Antigravity.exe。' }
    return ([System.IO.File]::ReadAllText($configPath) | ConvertFrom-Json)
}
function Save-PatchConfig($Config) {
    [System.IO.File]::WriteAllText((Join-Path $PSScriptRoot 'config.json'), ($Config | ConvertTo-Json -Depth 5), (New-Object System.Text.UTF8Encoding($false)))
}
function Test-PackageIntegrity {
    $manifestPath = Join-Path $PSScriptRoot 'manifest.json'
    $manifest = [System.IO.File]::ReadAllText($manifestPath) | ConvertFrom-Json
    foreach ($item in $manifest.files) {
        $file = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot $item.path))
        if (-not $file.StartsWith($PSScriptRoot.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)) { throw '压缩包校验清单中的路径无效。' }
        if (-not (Test-Path -LiteralPath $file) -or (Get-PackageFileHash $file) -ne $item.sha256) { throw "文件缺失或不完整：$($item.path)。请重新解压完整压缩包。" }
    }
}
function Assert-AppClosed([string]$AppPath) {
    $running = @(Get-Process -Name 'Antigravity' -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path -eq $AppPath })
    if ($running.Count) { throw '请先完全退出 Antigravity（包括托盘中的程序），再执行安装或恢复。' }
}
function Stop-OwnInjector {
    $nodePath = Join-Path $PSScriptRoot 'runtime\node.exe'
    $scriptPath = Join-Path $PSScriptRoot 'injector.js'
    $pattern = '^\s*"?' + [Regex]::Escape($nodePath) + '"?\s+"?' + [Regex]::Escape($scriptPath) + '"?(?:\s|$)'
    $own = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.ExecutablePath -eq $nodePath -and $_.CommandLine -match $pattern })
    foreach ($process in $own) { Stop-Process -Id $process.ProcessId -ErrorAction Stop }
}
function Test-LocalPort([int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try { $pending = $client.BeginConnect('127.0.0.1', $Port, $null, $null); if (-not $pending.AsyncWaitHandle.WaitOne(500)) { return $false }; $client.EndConnect($pending); return $true } catch { return $false } finally { $client.Close() }
}
function Request-PatchPoll {
    try { Invoke-WebRequest -Uri 'http://127.0.0.1:19229/poll' -UseBasicParsing -TimeoutSec 2 | Out-Null } catch { }
}
function Invoke-PatchNative([string]$Mode, [string]$Archive, [string]$Backup, [string]$Exe) {
    $arguments = @((Join-Path $PSScriptRoot 'native-patch.js'), $Mode, $Archive)
    if ($Backup) { $arguments += $Backup }
    if ($Exe) { $arguments += $Exe }
    $start = New-Object System.Diagnostics.ProcessStartInfo
    $start.FileName = Join-Path $PSScriptRoot 'runtime\node.exe'
    $start.Arguments = (($arguments | ForEach-Object { '"' + $_ + '"' }) -join ' ')
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    $start.StandardOutputEncoding = [System.Text.Encoding]::UTF8
    $start.StandardErrorEncoding = [System.Text.Encoding]::UTF8
    $process = [System.Diagnostics.Process]::Start($start)
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    $result = [pscustomobject]@{ code = $process.ExitCode; text = $stdout.Trim(); error = $stderr.Trim() }
    $process.Dispose()
    return $result
}
