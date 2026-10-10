'use strict';
// ASAR 最小只读工具。仅解析头部 JSON 与 packed payload，不解包、不写入。
// ASAR 头部是 V8 Pickle：前 8 字节为 pickle 头，随后 4 字节总头长、
// 4 字节 desc 长、4 字节 JSON 长，JSON 紧跟在第 16 字节。payload 起点
// 为 8 + 总头长。这里用 JSON 标记定位，兼容不同实现写出的对齐差异。
const fs = require('fs');
const crypto = require('crypto');

function parse(buf) {
  if (buf.length < 16) throw new Error('ASAR 文件头不足 16 字节');
  const magic = buf.readUInt32LE(0);
  const totalHeaderSize = buf.readUInt32LE(4);
  const jsonLength = buf.readUInt32LE(12);
  if (magic !== 4) throw new Error('ASAR magic 非 4：' + magic);
  if (totalHeaderSize < 8 || totalHeaderSize > buf.length - 8) throw new Error('ASAR 头部长度越界');
  if (jsonLength > totalHeaderSize - 8) throw new Error('ASAR JSON 长度越界');
  // 与 Electron 引擎一致：payload 起点是 8 + 头部总长（含 4 字节对齐填充）。
  // 不要用“JSON 结束位置 + 2”之类的启发式，未对齐归档会差字节。
  const dataStart = 8 + totalHeaderSize;
  const json = JSON.parse(buf.slice(16, 16 + jsonLength).toString('utf8'));
  return { json, dataStart, totalHeaderSize, jsonLength };
}

function list(node, prefix = '', out = []) {
  for (const [name, value] of Object.entries(node.files || {})) {
    const p = prefix + '/' + name;
    if (value.files) list(value, p, out);
    else out.push({ path: p, size: value.size, offset: Number(value.offset), unpacked: !!value.unpacked, link: !!value.link });
  }
  return out;
}

function readFile(buf, parsed, target) {
  let cur = parsed.json;
  // 接受带或不带前导斜杠的路径：list() 产出的是 "/dist/x.js" 形式。
  for (const seg of target.split('/').filter(Boolean)) {
    if (!cur.files || !cur.files[seg]) return null;
    cur = cur.files[seg];
  }
  if (cur.files || cur.unpacked || cur.link) return null;
  const start = parsed.dataStart + Number(cur.offset);
  return buf.slice(start, start + Number(cur.size));
}

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

function open(path) {
  const buf = fs.readFileSync(path);
  const parsed = parse(buf);
  return {
    path, buf, parsed, bytes: buf.length, sha256: sha256(buf),
    entries: list(parsed.json),
    read: (target) => readFile(buf, parsed, target),
  };
}

module.exports = { open, parse, list, readFile, sha256 };
