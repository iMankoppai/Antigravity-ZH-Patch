using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

namespace AntigravityZhManager.Services
{
    public sealed class ArchiveVerificationReport
    {
        public int Entries { get; init; }
        public int Packed { get; init; }
        public int UnpackedOrLink { get; init; }
        public int ChangesChecked { get; init; }
    }

    /// <summary>
    /// ASAR 临时归档回读校验。与安装流程解耦，可独立做隔离测试。
    /// 校验项：头部长度与边界、条目集合、packed 偏移连续性、内容边界、
    /// 完整性块、unpacked/link 元数据保留，以及“实际改动 == 计划改动”。
    /// </summary>
    public static class AsarArchiveVerifier
    {
        public static string Sha256(byte[] data)
        {
            using var sha = SHA256.Create();
            byte[] hash = sha.ComputeHash(data);
            var sb = new StringBuilder();
            foreach (byte b in hash) sb.Append(b.ToString("x2"));
            return sb.ToString();
        }

        private static string Sha256(ReadOnlySpan<byte> data)
        {
            using var sha = SHA256.Create();
            byte[] hash = sha.ComputeHash(data.ToArray());
            var sb = new StringBuilder();
            foreach (byte b in hash) sb.Append(b.ToString("x2"));
            return sb.ToString();
        }

        /// <param name="tmpPath">刚写入、尚未替换主文件的临时归档路径。</param>
        /// <param name="plannedChanges">计划改动的文件内容，键为归档内相对路径。</param>
        /// <param name="expectedOrder">写入前记录的文件顺序，用于校验偏移连续。</param>
        /// <param name="original">原始归档中每个条目的内容，用于验证“没有计划外改动”。</param>
        public static async Task<ArchiveVerificationReport> VerifyAsync(
            string tmpPath,
            IReadOnlyDictionary<string, byte[]> plannedChanges,
            IReadOnlyList<string> expectedOrder,
            IReadOnlyDictionary<string, byte[]>? original = null,
            Action<string>? log = null)
        {
            byte[] bytes = await File.ReadAllBytesAsync(tmpPath);
            if (bytes.Length < 16) throw new InvalidDataException("临时归档不足 16 字节。");

            uint magic = BitConverter.ToUInt32(bytes, 0);
            uint totalHeaderSize = BitConverter.ToUInt32(bytes, 4);
            uint headerDescSize = BitConverter.ToUInt32(bytes, 8);
            uint jsonLength = BitConverter.ToUInt32(bytes, 12);
            if (magic != 4 || totalHeaderSize < 8 || totalHeaderSize > bytes.Length - 8 ||
                headerDescSize != totalHeaderSize - 4 || jsonLength > totalHeaderSize - 8)
                throw new InvalidDataException("临时归档的 pickle 长度或边界不合法。");

            int payloadBase = checked(8 + (int)totalHeaderSize);
            var header = JsonNode.Parse(Encoding.UTF8.GetString(bytes, 16, (int)jsonLength)) as JsonObject
                ?? throw new InvalidDataException("临时归档头部结构无效。");
            if (header["files"] is not JsonObject filesRoot)
                throw new InvalidDataException("临时归档缺少 files 结构。");

            var written = new Dictionary<string, JsonObject>(StringComparer.Ordinal);
            void Walk(JsonObject current, string currentPath)
            {
                foreach (var kvp in current)
                {
                    if (kvp.Value is not JsonObject obj) continue;
                    if (obj["files"] is JsonObject sub) Walk(sub, currentPath + kvp.Key + "/");
                    else written[currentPath + kvp.Key] = obj;
                }
            }
            Walk(filesRoot, "");

            // 条目集合必须与写入前完全一致（既不能多也不能少）。
            if (written.Count != expectedOrder.Count)
                throw new InvalidDataException($"临时归档条目数不一致：期望 {expectedOrder.Count}，实际 {written.Count}。");

            long expectedOffset = 0;
            int packed = 0, unpackedOrLink = 0, changesChecked = 0;
            foreach (var path in expectedOrder)
            {
                if (!written.TryGetValue(path, out var actual))
                    throw new InvalidDataException($"临时归档缺少条目：{path}");

                bool isUnpacked = actual["unpacked"]?.GetValue<bool>() == true;
                bool isLink = actual.ContainsKey("link");
                if (isUnpacked || isLink)
                {
                    // unpacked/link 只存在于头部声明，且必须保留原样。
                    if (actual.ContainsKey("offset") || actual.ContainsKey("size"))
                    {
                        // 允许存在，但不得当作 packed 数据读取。
                    }
                    unpackedOrLink++;
                    continue;
                }

                if (!actual.ContainsKey("offset") || !actual.ContainsKey("size"))
                    throw new InvalidDataException($"临时归档 packed 条目缺少 offset/size：{path}");

                long offset = long.Parse(actual["offset"]!.ToString());
                int size = int.Parse(actual["size"]!.ToString());
                if (offset != expectedOffset)
                    throw new InvalidDataException($"临时归档偏移错位：{path} 期望 {expectedOffset}，实际 {offset}");
                if (offset < 0 || size < 0 || offset > bytes.Length - payloadBase || size > bytes.Length - payloadBase - offset)
                    throw new InvalidDataException($"临时归档条目越界：{path}");

                byte[] data = bytes.AsSpan(payloadBase + (int)offset, size).ToArray();

                if (actual["integrity"] is JsonObject integrity && integrity["hash"] is JsonNode hashNode)
                {
                    string expectHash = hashNode.ToString();
                    if (!string.Equals(expectHash, Sha256(data), StringComparison.OrdinalIgnoreCase))
                        throw new InvalidDataException($"临时归档完整性校验失败：{path}");
                }

                if (plannedChanges.TryGetValue(path, out var planned))
                {
                    if (!data.AsSpan().SequenceEqual(planned))
                        throw new InvalidDataException($"临时归档内容与计划不一致：{path}");
                    changesChecked++;
                }
                else if (original != null && original.TryGetValue(path, out var before))
                {
                    // 未列入计划的文件必须与原归档逐字节相同，杜绝计划外改动。
                    if (!data.AsSpan().SequenceEqual(before))
                        throw new InvalidDataException($"临时归档存在计划外改动：{path}");
                }

                expectedOffset += size;
                packed++;
            }

            if (changesChecked != plannedChanges.Count)
                throw new InvalidDataException($"计划改动 {plannedChanges.Count} 项，实际校验到 {changesChecked} 项。");

            log?.Invoke($"   条目 {written.Count}，packed {packed}，unpacked/link {unpackedOrLink}，已校验改动 {changesChecked}。");
            return new ArchiveVerificationReport { Entries = written.Count, Packed = packed, UnpackedOrLink = unpackedOrLink, ChangesChecked = changesChecked };
        }
    }
}
