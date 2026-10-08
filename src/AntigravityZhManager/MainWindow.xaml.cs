using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Media;
using AntigravityZhManager.Services;
using Microsoft.Win32;

namespace AntigravityZhManager
{
    public partial class MainWindow : Window
    {
        private AntigravityInfo _currentInfo = new();

        public MainWindow()
        {
            InitializeComponent();
            Loaded += MainWindow_Loaded;
        }

        private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            AppendLog("🚀 欢迎使用 Antigravity 汉化管理器！");
            AppendLog("💡 提示：若 Antigravity 正在前台运行，可直接点击【⚡ 立即热加载】免重启生效。");
            await RefreshAppStatusAsync();
        }

        private void AppendLog(string message)
        {
            Dispatcher.Invoke(() =>
            {
                string time = DateTime.Now.ToString("HH:mm:ss");
                TxtLogs.AppendText($"[{time}] {message}\n");
                LogScrollViewer.ScrollToEnd();
            });
        }

        private async Task RefreshAppStatusAsync(string? explicitPath = null)
        {
            AppendLog("🔍 正在全方位自动扫描 Antigravity 运行状态、安装目录及备份状态...");
            _currentInfo = await Task.Run(() => AntigravityDetector.Detect(explicitPath));

            Dispatcher.Invoke(() =>
            {
                // 运行状态指示灯
                if (_currentInfo.IsRunning)
                {
                    StatusDot.Fill = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#10B981"));
                    TxtAppRunningStatus.Text = $"Antigravity 运行中 (PID: {_currentInfo.ProcessId})";
                    TxtAppRunningStatus.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#F8FAFC"));
                    BtnHotInject.IsEnabled = true;
                }
                else
                {
                    StatusDot.Fill = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#94A3B8"));
                    TxtAppRunningStatus.Text = "Antigravity 未运行";
                    TxtAppRunningStatus.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#94A3B8"));
                    BtnHotInject.IsEnabled = false;
                }

                // 路径展示（完整显示）
                if (!string.IsNullOrEmpty(_currentInfo.InstallDir))
                {
                    TxtInstallPath.Text = _currentInfo.InstallDir;
                    TxtInstallPath.ToolTip = $"完整程序路径: {_currentInfo.ExePath}\n扫描命中来源: {_currentInfo.DetectSource}";
                }
                else
                {
                    TxtInstallPath.Text = "未自动检测到，请点击右侧【自动扫描】或【手动选择】";
                    TxtInstallPath.ToolTip = null;
                }

                // 还原按钮永远保持可用
                BtnRestoreEnglish.IsEnabled = true;

                string patchDesc = _currentInfo.IsCleanPatched ? "已安装汉化" : (_currentInfo.IsOfficialOriginal ? "官方英文原版" : "未安装汉化");
                AppendLog($"📊 扫描完成：目录=[{_currentInfo.InstallDir}]，来源=[{_currentInfo.DetectSource}]，状态=[{patchDesc}]，备份=[{(_currentInfo.HasBackup ? "已就绪" : "未发现")}]");
            });

            // 自动同步前台实时中文开关状态
            if (_currentInfo.IsRunning)
            {
                bool isHot = await CdpHotPatcher.CheckIsHotInjectedAsync();
                UpdateHotButtonState(isHot);
            }
            else
            {
                UpdateHotButtonState(false);
            }
        }

        private async void BtnAutoScan_Click(object sender, RoutedEventArgs e)
        {
            AppendLog("🔄 用户触发全盘/注册表/环境变量深度扫描...");
            await RefreshAppStatusAsync();
            if (!string.IsNullOrEmpty(_currentInfo.InstallDir))
            {
                MessageBox.Show($"成功扫描到 Antigravity 安装目录：\n\n{_currentInfo.InstallDir}\n\n来源：{_currentInfo.DetectSource}", "自动扫描完成", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            else
            {
                MessageBox.Show("未能自动检测到 Antigravity，请点击【手动选择...】定位 Antigravity.exe 所在路径。", "未找到安装路径", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }

        private void BtnOpenFolder_Click(object sender, RoutedEventArgs e)
        {
            if (!string.IsNullOrEmpty(_currentInfo.InstallDir) && Directory.Exists(_currentInfo.InstallDir))
            {
                try
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = "explorer.exe",
                        Arguments = $"\"{_currentInfo.InstallDir}\"",
                        UseShellExecute = true
                    });
                    AppendLog($"📂 已在资源管理器中打开安装目录: {_currentInfo.InstallDir}");
                }
                catch (Exception ex)
                {
                    MessageBox.Show("打开目录失败: " + ex.Message, "错误", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
            else
            {
                MessageBox.Show("当前安装目录无效或尚未定位。", "提示", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }

        private bool _isHotInjected = false;

        private void UpdateHotButtonState(bool active)
        {
            _isHotInjected = active;
            Dispatcher.Invoke(() =>
            {
                if (active)
                {
                    BtnHotInject.Content = "⏹️ 恢复英文";
                    BtnHotInject.Style = (Style)FindResource("DangerSolidButtonStyle");
                    BadgeHotStatus.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#064E3B"));
                    TxtHotStatusBadge.Text = "🟢 汉化已开启";
                    TxtHotStatusBadge.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#34D399"));
                }
                else
                {
                    BtnHotInject.Content = "⚡ 开启汉化";
                    BtnHotInject.Style = (Style)FindResource("SuccessButtonStyle");
                    BadgeHotStatus.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
                    TxtHotStatusBadge.Text = "汉化已关闭";
                    TxtHotStatusBadge.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#94A3B8"));
                }
            });
        }

        private async void BtnHotInject_Click(object sender, RoutedEventArgs e)
        {
            if (!_currentInfo.IsRunning)
            {
                MessageBox.Show("当前未检测到 Antigravity 正在运行，无法切换实时语言。\n请先启动软件或点击【永久固化安装】。", "提示", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            BtnHotInject.IsEnabled = false;

            try
            {
                if (_isHotInjected)
                {
                    // 当前已是中文 -> 执行关闭（恢复英文）
                    AppendLog("⏹️ 用户触发恢复英文，正在向窗口发送重载指令...");
                    bool ok = await CdpHotPatcher.RestoreLiveWindowAsync(AppendLog);
                    if (ok)
                    {
                        UpdateHotButtonState(false);
                        AppendLog("✨ 临时汉化已关闭，前台窗口已恢复纯净英文！");
                    }
                    else
                    {
                        MessageBox.Show("恢复英文失败，请确认 Antigravity 窗口是否正常运行。", "提示", MessageBoxButton.OK, MessageBoxImage.Warning);
                    }
                }
                else
                {
                    // 当前未开启 -> 执行开启（注入中文）
                    AppendLog("⚡ 用户触发开启实时中文，正在向窗口注入中文汉化引擎...");
                    var result = await CdpHotPatcher.InjectAsync(AppendLog);
                    if (result.Success)
                    {
                        UpdateHotButtonState(true);
                        AppendLog("✨ " + result.Message);
                    }
                    else
                    {
                        MessageBox.Show(result.Message, "开启失败", MessageBoxButton.OK, MessageBoxImage.Warning);
                    }
                }
            }
            finally
            {
                BtnHotInject.IsEnabled = _currentInfo.IsRunning;
            }
        }

        private async void BtnInstallClean_Click(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrEmpty(_currentInfo.AsarPath) || !File.Exists(_currentInfo.AsarPath))
            {
                MessageBox.Show("未找到 Antigravity resources\\app.asar 文件，请先点击【手动选择】定位软件位置。", "提示", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            var confirm = MessageBox.Show(
                "即将把汉化内核与全量翻译引擎完整嵌入 app.asar（终极洁癖模式，零外部文件夹）。\n\n" +
                "• 首次安装将自动备份官方原版 app.asar.bak\n" +
                "• 安装后无需外部“中文补丁”文件夹，程序目录干干净净\n\n是否立即开始？",
                "确认永久安装汉化",
                MessageBoxButton.YesNo,
                MessageBoxImage.Question);

            if (confirm != MessageBoxResult.Yes) return;

            BtnInstallClean.IsEnabled = false;
            try
            {
                bool closeToTray = ChkCloseToTray.IsChecked == true;
                bool trayMenu = ChkTrayMenu.IsChecked == true;

                var result = await AsarCleanPatcher.InstallCleanPatchAsync(_currentInfo.AsarPath, closeToTray, trayMenu, AppendLog);
                if (result.Success)
                {
                    string extraPrompt = "";
                    if (_currentInfo.HasLegacyFolder)
                    {
                        extraPrompt = "\n\n检测到您的安装目录下遗留有旧版的【中文补丁】文件夹，您可点击右侧【一键清理旧脚本与残留目录】进行清理。";
                    }

                    MessageBox.Show(result.Message + extraPrompt, "安装成功", MessageBoxButton.OK, MessageBoxImage.Information);
                }
                else
                {
                    MessageBox.Show(result.Message, "安装失败", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
            finally
            {
                BtnInstallClean.IsEnabled = true;
                await RefreshAppStatusAsync();
            }
        }

        private async void BtnRestoreEnglish_Click(object sender, RoutedEventArgs e)
        {
            var confirm = MessageBox.Show(
                "确定要恢复官方纯净英文吗？\n\n• 若当前前台软件正在运行，将实时重载清除热加载并恢复纯净英文\n• 若已永久安装汉化，将自动从备份还原官方原版 resources\\app.asar\n\n是否立即执行还原？",
                "确认恢复官方英文",
                MessageBoxButton.YesNo,
                MessageBoxImage.Question);

            if (confirm != MessageBoxResult.Yes) return;

            BtnRestoreEnglish.IsEnabled = false;
            try
            {
                bool windowReloaded = false;
                bool asarRestored = false;
                string extraMsg = "";

                // 1. 若当前软件正在运行，优先执行前台窗口热重载还原，清除内存中的热注入
                if (_currentInfo.IsRunning)
                {
                    AppendLog("🔄 正在向当前前台窗口发送重载指令，清除热加载并恢复英文...");
                    windowReloaded = await CdpHotPatcher.RestoreLiveWindowAsync(AppendLog);
                }

                // 2. 检查磁盘资源文件是否需要还原
                if (!_currentInfo.IsOfficialOriginal && File.Exists(_currentInfo.AsarPath))
                {
                    if (_currentInfo.HasBackup)
                    {
                        var res = await AsarCleanPatcher.RestoreEnglishAsync(_currentInfo.AsarPath, AppendLog);
                        asarRestored = res.Success;
                    }
                    else
                    {
                        extraMsg = "\n（提示：未找到磁盘备份文件，但前台窗口已刷新）";
                    }
                }
                else
                {
                    AppendLog("ℹ️ 磁盘上的 app.asar 已是官方纯净状态，无需覆盖。");
                }

                string successMsg = "🎉 官方纯净英文已恢复成功！\n\n";
                if (windowReloaded) successMsg += "• 前台运行窗口已实时重载并恢复英文界面\n";
                if (asarRestored) successMsg += "• 磁盘 resources\\app.asar 已从官方备份还原\n";
                if (!windowReloaded && !asarRestored) successMsg += "• 磁盘资源与当前状态均已确认为官方纯净英文原版\n";
                successMsg += extraMsg;

                UpdateHotButtonState(false);
                MessageBox.Show(successMsg, "恢复英文成功", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            finally
            {
                BtnRestoreEnglish.IsEnabled = true;
                await RefreshAppStatusAsync();
            }
        }

        private async void BtnHealthCheck_Click(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrEmpty(_currentInfo.InstallDir))
            {
                MessageBox.Show("请先定位 Antigravity 安装目录。", "提示", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            BtnHealthCheck.IsEnabled = false;
            try
            {
                AppendLog("==================================================");
                var report = await HealthChecker.RunDiagnosticsAsync(_currentInfo, AppendLog);
                AppendLog("==================================================");

                // 更新徽标
                if (report.OverallHealthy)
                {
                    BadgeHealthStatus.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#064E3B"));
                    TxtHealthStatusBadge.Text = "🟢 环境健康";
                    TxtHealthStatusBadge.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#34D399"));
                }
                else
                {
                    BadgeHealthStatus.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#78350F"));
                    TxtHealthStatusBadge.Text = "🟡 发现异常";
                    TxtHealthStatusBadge.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FBBF24"));
                }

                // 组装结构化报告弹窗
                var sb = new StringBuilder();
                sb.AppendLine(report.OverallHealthy ? "🎉 运行环境体检通过，所有核心指标均处于良好状态！" : "⚠️ 体检完成，发现部分指标需要关注：");
                sb.AppendLine();
                foreach (var item in report.Items)
                {
                    string icon = item.IsOk ? "✅" : (item.IsWarning ? "⚠️" : "❌");
                    sb.AppendLine($"{icon} 【{item.Title}】：{item.Details}");
                    if (!string.IsNullOrEmpty(item.FixSuggestion))
                    {
                        sb.AppendLine($"   👉 建议: {item.FixSuggestion}");
                    }
                }

                MessageBox.Show(sb.ToString(), "运行环境健康诊断报告", MessageBoxButton.OK, 
                    report.OverallHealthy ? MessageBoxImage.Information : MessageBoxImage.Warning);
            }
            finally
            {
                BtnHealthCheck.IsEnabled = true;
                await RefreshAppStatusAsync();
            }
        }

        private async void BtnCheckUpdate_Click(object sender, RoutedEventArgs e)
        {
            BtnCheckUpdate.IsEnabled = false;
            try
            {
                var info = await UpdateChecker.CheckUpdateAsync(AppendLog);
                MessageBox.Show(info.Message, "更新状态", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            finally
            {
                BtnCheckUpdate.IsEnabled = true;
            }
        }

        private async void BtnBrowsePath_Click(object sender, RoutedEventArgs e)
        {
            var dialog = new OpenFileDialog
            {
                Filter = "Antigravity 主程序 (Antigravity.exe)|Antigravity.exe|所有文件 (*.*)|*.*",
                Title = "请选择 Antigravity.exe 所在路径"
            };

            if (dialog.ShowDialog() == true)
            {
                AppendLog($"📁 用户手动指定路径: {dialog.FileName}");
                await RefreshAppStatusAsync(dialog.FileName);
            }
        }

        private void BtnClearLogs_Click(object sender, RoutedEventArgs e)
        {
            TxtLogs.Clear();
        }
    }
}