. (Join-Path $PSScriptRoot 'common.ps1')
$config = Get-PatchConfig
if ($config.installationRoot -and [IO.Path]::GetFullPath($config.installationRoot) -ne [IO.Path]::GetFullPath($PSScriptRoot)) {
    $expected = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetDirectoryName($config.appPath)) '中文补丁'))
    if ([IO.Path]::GetFullPath($config.installationRoot) -ne $expected) { throw '安装记录路径无效。' }
    & (Join-Path $expected 'restore-close.ps1')
    return
}
Assert-AppClosed $config.appPath
Stop-OwnInjector
$archive = Join-Path ([IO.Path]::GetDirectoryName($config.appPath)) 'resources\app.asar'
$result = Invoke-PatchNative 'restore-close' $archive (Join-Path $PSScriptRoot 'backups')
if ($result.code -ne 0) { throw $result.error }
Write-Host '已恢复原来的关闭方式，托盘菜单和汉化仍保留。'
