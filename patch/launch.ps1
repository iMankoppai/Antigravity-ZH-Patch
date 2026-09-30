. (Join-Path $PSScriptRoot 'common.ps1')
try {
    $config = Get-PatchConfig
    if (-not $config.enabled) { throw '这份补丁已停用。需要重新启用时，请再次运行“安装汉化.cmd”。' }
    $appPath = $config.appPath
    if (-not (Test-Path -LiteralPath $appPath)) { throw '找不到软件；安装位置变化后请重新运行“安装汉化.cmd”。' }
    foreach ($name in @('ELECTRON_RUN_AS_NODE','NODE_OPTIONS')) { if (Test-Path -LiteralPath ('Env:' + $name)) { Remove-Item -LiteralPath ('Env:' + $name) } }
    $nodePath = Join-Path $PSScriptRoot 'runtime\node.exe'
    $injector = Join-Path $PSScriptRoot 'injector.js'
    if (Test-LocalPort 19229) {
        $listeners = @(Get-NetTCPConnection -LocalPort 19229 -State Listen -ErrorAction SilentlyContinue)
        $owners = @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)
        $pattern = '^\s*"?' + [Regex]::Escape($nodePath) + '"?\s+"?' + [Regex]::Escape($injector) + '"?(?:\s|$)'
        $own = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.ProcessId -in $owners -and $_.ExecutablePath -eq $nodePath -and $_.CommandLine -match $pattern })
        if (-not $own.Count) { throw '另一份补丁或其他程序正在使用 19229 端口。请先退出旧补丁，再使用本包启动；不要同时运行两份汉化补丁。' }
    } else {
        $helper = Start-Process -FilePath $nodePath -ArgumentList @(('"' + $injector + '"'),'9229','19229') -WindowStyle Hidden -PassThru
        Start-Sleep -Milliseconds 400
        if ($helper.HasExited) { throw '补丁后台启动失败，请查看 injector.log。' }
    }
    $running = @(Get-Process -Name 'Antigravity' -ErrorAction SilentlyContinue)
    if ($running.Count) {
        if (-not (Test-LocalPort 9229)) { throw 'Antigravity 已通过英文入口运行。请完全退出它（包括托盘），再从“Antigravity 中文版 v26”启动。' }
        $targetRunning = @($running | Where-Object { $_.Path -eq $appPath })
        if (-not $targetRunning.Count) { throw '当前运行的是另一份 Antigravity 安装，请先完全退出，再启动所选安装。' }
        Request-PatchPoll
        Start-Process -FilePath $appPath
    } else {
        if (Test-LocalPort 9229) { throw '9229 调试端口被其他程序占用，请关闭使用该端口的程序后重试。' }
        Start-Process -FilePath $appPath -ArgumentList @('--remote-debugging-address=127.0.0.1','--remote-debugging-port=9229')
        Start-Sleep -Milliseconds 800
        Request-PatchPoll
    }
} catch {
    Add-Content -LiteralPath (Join-Path $PSScriptRoot 'launcher-error.log') -Value $_.Exception.Message -Encoding UTF8
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show($_.Exception.Message,'Antigravity 中文补丁','OK','Error') | Out-Null
    exit 1
}
