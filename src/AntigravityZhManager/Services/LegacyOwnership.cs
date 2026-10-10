using System;
using System.Collections.Generic;
using System.IO;

namespace AntigravityZhManager.Services
{
    /// <summary>
    /// 旧版遗留物的归属判定与路径边界校验。
    /// 与 WPF 无关，可独立做隔离测试；只回答“这个对象能否证明归本项目所有”，
    /// 真正的删除动作由调用方执行。
    /// </summary>
    public static class LegacyOwnership
    {
        // 已知历史补丁脚本名（精确匹配，绝不使用通配符）。
        public static readonly string[] LegacyScriptNames = {
            "install.cmd", "install.vbs", "install.ps1",
            "restore.cmd", "restore.vbs", "restore.ps1",
            "restore-en.cmd", "restore-en.vbs", "restore-en.ps1",
            "common.ps1", "launch.ps1"
        };

        // 能证明文件/目录由本项目创建的标记。
        private static readonly string[] Markers = {
            "AntigravityZhManager",
            "zh-bundle.js",
            "app.asar.bak",
            "中文补丁",
            "Antigravity 汉化"
        };

        private static readonly string MarkedDirectoryFile = "README-中文补丁.txt";

        /// <summary>目标规范化后是否仍位于 root 之内（拒绝路径逃逸）。</summary>
        public static bool IsInsideRoot(string root, string candidate)
        {
            if (string.IsNullOrWhiteSpace(root) || string.IsNullOrWhiteSpace(candidate)) return false;
            string normalizedRoot = Path.GetFullPath(root)
                .TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            string normalized = Path.GetFullPath(candidate);
            return normalized.Equals(normalizedRoot, StringComparison.OrdinalIgnoreCase)
                || normalized.StartsWith(normalizedRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase);
        }

        public static bool IsKnownLegacyScriptName(string name)
        {
            foreach (var known in LegacyScriptNames)
                if (string.Equals(name, known, StringComparison.OrdinalIgnoreCase)) return true;
            return false;
        }

        /// <summary>
        /// 判断脚本是否可证明归本项目所有。返回理由；无法证明时返回 null。
        /// </summary>
        public static string? DescribeScriptOwnership(string path)
        {
            try
            {
                var info = new FileInfo(path);
                if (!info.Exists || info.Length > 1024 * 1024) return null;
                string text = File.ReadAllText(path);
                foreach (var marker in Markers)
                    if (text.Contains(marker, StringComparison.OrdinalIgnoreCase))
                        return $"内容包含标记 “{marker}”";
            }
            catch { }
            return null;
        }

        /// <summary>
        /// 判断旧版“中文补丁”目录是否可安全删除：带项目标记文件、为空、或只含已知旧脚本名。
        /// </summary>
        public static bool CanDeleteLegacyDirectory(string directory)
        {
            try
            {
                if (!Directory.Exists(directory)) return false;
                if (File.Exists(Path.Combine(directory, MarkedDirectoryFile))) return true;
                var entries = Directory.GetFileSystemEntries(directory);
                if (entries.Length == 0) return true;
                foreach (var entry in entries)
                {
                    if (Directory.Exists(entry)) return false;
                    string name = Path.GetFileName(entry);
                    if (!IsKnownLegacyScriptName(name)) return false;
                }
                return true;
            }
            catch { return false; }
        }
    }
}
