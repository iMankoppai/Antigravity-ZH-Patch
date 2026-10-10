using System;
using System.IO;

namespace AntigravityZhManager.Services
{
    public sealed class LegacyCleanResult
    {
        public bool Success { get; init; }
        public int Removed { get; init; }
        public int Kept { get; init; }
        public string Message { get; init; } = string.Empty;
    }

    /// <summary>
    /// 旧版遗留物清理编排。与 WPF 无关，可独立做隔离测试。
    /// 只删除经 LegacyOwnership 证明归属的对象，未知内容一律保留。
    /// </summary>
    public static class LegacyCleaner
    {
        public static LegacyCleanResult Clean(string installDir, Action<string>? log = null)
        {
            if (string.IsNullOrWhiteSpace(installDir) || !Directory.Exists(installDir))
            {
                const string invalid = "安装目录无效，未执行清理。";
                log?.Invoke("❌ " + invalid);
                return new LegacyCleanResult { Success = false, Message = invalid };
            }

            string root = Path.GetFullPath(installDir)
                .TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            int removed = 0, kept = 0;

            try
            {
                // 1) 旧版“中文补丁”外部文件夹：能证明归属才删除。
                string legacyDir = Path.Combine(root, "中文补丁");
                if (Directory.Exists(legacyDir) && LegacyOwnership.IsInsideRoot(root, legacyDir))
                {
                    if (LegacyOwnership.CanDeleteLegacyDirectory(legacyDir))
                    {
                        log?.Invoke($"🧹 正在清理旧版外部文件夹（已确认归属）: {legacyDir} ...");
                        Directory.Delete(legacyDir, true);
                        removed++;
                    }
                    else
                    {
                        kept++;
                        log?.Invoke($"⏭️ 已保留目录 {legacyDir}：其中包含无法确认为本项目所有的文件，未删除。");
                    }
                }

                // 2) 根目录旧脚本：精确匹配 + 内容归属确认。
                foreach (var scriptName in LegacyOwnership.LegacyScriptNames)
                {
                    string scriptFile = Path.Combine(root, scriptName);
                    if (!File.Exists(scriptFile) || !LegacyOwnership.IsInsideRoot(root, scriptFile)) continue;
                    string? reason = LegacyOwnership.DescribeScriptOwnership(scriptFile);
                    if (reason == null)
                    {
                        kept++;
                        log?.Invoke($"⏭️ 已保留 {scriptName}：无法确认是本项目创建的旧脚本，未删除。");
                        continue;
                    }
                    try
                    {
                        File.Delete(scriptFile);
                        log?.Invoke($"🧹 已清理旧脚本: {scriptName}（{reason}）");
                        removed++;
                    }
                    catch (Exception ex)
                    {
                        kept++;
                        log?.Invoke($"⏭️ 无法删除 {scriptName}：{ex.Message}");
                    }
                }

                string message = $"清理完成！已清理 {removed} 处可确认归属的旧文件，保留 {kept} 处无法确认的文件。";
                log?.Invoke("✨ " + message);
                return new LegacyCleanResult { Success = true, Removed = removed, Kept = kept, Message = message };
            }
            catch (Exception ex)
            {
                string message = "清理失败: " + ex.Message;
                log?.Invoke("❌ " + message);
                return new LegacyCleanResult { Success = false, Removed = removed, Kept = kept, Message = message };
            }
        }
    }
}
