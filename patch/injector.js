const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");

const port = Number(process.argv[2] || 9229);
const singletonPort = Number(process.argv[3] || 19229);
const patchDir = __dirname;
const dictionaryDir = path.join(patchDir, "dictionaries");
const translateSource = fs.readFileSync(path.join(patchDir, "translate.js"), "utf8");
const logPath = path.join(patchDir, "injector.log");

// 从补丁源码里读出 patchVersion，便于在日志中确认注入的是哪一版。
const patchVersion = Number((translateSource.match(/const patchVersion\s*=\s*(\d+)/) || [])[1] || 0);

// 每个页面最多尝试注入的次数，超过后不再重试，避免日志被反复刷屏。
const MAX_INJECT_ATTEMPTS = 3;
// 脚本执行后，等待页面出现安装标记的最长时间。
const VERIFY_TIMEOUT_MS = 20000;
// 应用在跑时勤快一点，没在跑时放慢，减少空转。
const POLL_ACTIVE_MS = 1500;
const POLL_IDLE_MS = 5000;
// 编辑器保存常常连发多次事件，攒一下再处理。
const RELOAD_DEBOUNCE_MS = 300;

const attached = new Map();
const injectAttempts = new Map();
let missingRounds = 0;
let polling = false;
let pollTimer = null;
let appSeen = false;

let dictionary = {};
let dictionaryRevision = 0;
let dictionarySignature = "";

function log(message) {
  const line = `${new Date().toISOString()} ${message}\n`;
  try { fs.appendFileSync(logPath, line); } catch {}
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// 词典：加载、校验、合并
// ---------------------------------------------------------------------------

// 返回 { ok, dictionary, errors, warnings, signature }。
// errors 会让本次更新整体作废（继续沿用上一份有效词典）；
// warnings 只提示，不阻止更新。
function loadDictionaries() {
  const errors = [];
  const warnings = [];

  let files;
  try {
    files = fs.readdirSync(dictionaryDir).filter((name) => name.toLowerCase().endsWith(".json")).sort();
  } catch (error) {
    return { ok: false, errors: [`无法读取词典目录 ${dictionaryDir}：${error.message}`], warnings, dictionary: {}, signature: "" };
  }
  if (files.length === 0) {
    return { ok: false, errors: [`词典目录中没有 .json 文件：${dictionaryDir}`], warnings, dictionary: {}, signature: "" };
  }

  const merged = new Map();
  const hash = crypto.createHash("sha256");

  for (const file of files) {
    const fullPath = path.join(dictionaryDir, file);
    let text;
    try {
      text = fs.readFileSync(fullPath, "utf8");
    } catch (error) {
      errors.push(`${file}：读取失败 - ${error.message}`);
      continue;
    }
    hash.update(file).update("\0").update(text).update("\0");

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      errors.push(`${file}：JSON 格式错误 - ${error.message}`);
      continue;
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      errors.push(`${file}：顶层必须是 JSON 对象`);
      continue;
    }

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== "string" || !value.trim()) {
        errors.push(`${file}：${JSON.stringify(key)} 的译文不是字符串`);
        continue;
      }
      if (key.trim() === "") {
        warnings.push(`${file}：存在空的原文字段，已忽略`);
        continue;
      }
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, { value, file });
        continue;
      }
      if (existing.value === value) {
        warnings.push(`${file}：${JSON.stringify(key)} 与 ${existing.file} 重复且译文相同，可删除其中一处`);
        continue;
      }
      errors.push(`${file}：${JSON.stringify(key)} 与 ${existing.file} 译文冲突（${existing.file}=${JSON.stringify(existing.value)} / ${file}=${JSON.stringify(value)}）`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings, dictionary: {}, signature: "" };
  }

  const result = Object.create(null);
  for (const key of [...merged.keys()].sort()) result[key] = merged.get(key).value;
  return { ok: true, errors, warnings, dictionary: result, signature: hash.digest("hex") };
}


function applyDictionary({ dictionary: next, signature }, reason) {
  dictionary = next;
  dictionaryRevision += 1;
  dictionarySignature = signature;
  const size = Object.keys(dictionary).length;
  log(`词典已加载（${reason}）：${size} 条，revision=${dictionaryRevision}`);
}

// ---------------------------------------------------------------------------
// 热更新：词典文件变化后重新注入已连接的页面
// ---------------------------------------------------------------------------

let reloadTimer = null;
let reloadPending = false;

function scheduleReload(reason) {
  reloadPending = true;
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    reloadTimer = null;
    reloadPending = false;
    reloadDictionary(reason);
  }, RELOAD_DEBOUNCE_MS);
}

function reloadDictionary(reason) {
  const loaded = loadDictionaries();
  if (!loaded.ok) {
    loaded.errors.forEach((message) => log(`词典未更新（${reason}）：${message}`));
    log(`词典未更新（${reason}）：继续沿用上一份有效词典（revision=${dictionaryRevision}）`);
    return;
  }
  loaded.warnings.forEach((message) => log(`词典提示：${message}`));

  if (loaded.signature === dictionarySignature) {
    log(`词典无变化（${reason}），跳过重新注入`);
    return;
  }

  applyDictionary(loaded, reason);
  reinjectAll(reason);
}

function watchDictionaries() {
  try {
    fs.watch(dictionaryDir, { persistent: true }, (eventType, filename) => {
      if (filename && !String(filename).toLowerCase().endsWith(".json")) return;
      scheduleReload(`${eventType} ${filename || ""}`.trim());
    });
    log(`已监听词典目录：${dictionaryDir}`);
  } catch (error) {
    log(`无法监听词典目录：${error.message}（热更新不可用，重启注入器可加载新词典）`);
  }
}

// ---------------------------------------------------------------------------
// CDP 会话
// ---------------------------------------------------------------------------

const CDP_REQUEST_TIMEOUT_MS = 5000;
let dictionaryReady = false;

function patchSnapshot() {
  const signature = crypto.createHash("sha256").update(translateSource).update(dictionarySignature).digest("hex");
  return { signature, revision: dictionaryRevision, size: Object.keys(dictionary).length,
    guard: `${patchVersion}:${signature}`, source:
      `window.__antigravityZhPatchDictionary = ${JSON.stringify(dictionary)};\n` +
      `window.__antigravityZhPatchDictionaryRevision = ${dictionaryRevision};\n` +
      `window.__antigravityZhPatchDictionarySignature = ${JSON.stringify(signature)};\n` + translateSource };
}
function send(session, method, params = {}, timeoutMs = CDP_REQUEST_TIMEOUT_MS) {
  if (session.closed) return Promise.resolve({ error: { message: "页面连接已关闭" } });
  const id = ++session.nextId;
  return new Promise(resolve => {
    const finish = response => {
      clearTimeout(timer); session.pending.delete(id); resolve(response);
    };
    const timer = setTimeout(() => finish({ error: { message: `${method} 等待返回超时` } }), timeoutMs);
    session.pending.set(id, finish);
    try { session.ws.send(JSON.stringify({ id, method, params })); }
    catch (error) { finish({ error: { message: error.message || String(error) } }); }
  });
}
function describeFailure(response) {
  if (!response) return "调试端口没有返回结果";
  if (response.error) return response.error.message || JSON.stringify(response.error);
  if (!response.result) return "返回结果为空";
  const details = response.result.exceptionDetails;
  return details ? details.exception?.description || details.text || "脚本执行异常" : null;
}
function closeSession(session, reason = "页面连接已关闭") {
  if (session.closed) return;
  session.closed = true;
  clearTimeout(session.connectTimer);
  if (attached.get(session.target.id) === session) attached.delete(session.target.id);
  for (const finish of [...session.pending.values()]) finish({ error: { message: reason } });
  try { session.ws.close(); } catch {}
}
function targetLabel(target) {
  const url = target.url || "";
  return `${target.id} ${url.startsWith("data:") ? "内置页面" : url.slice(0, 200)}`.trim();
}
async function waitForMarker(session, snapshot) {
  const deadline = Date.now() + VERIFY_TIMEOUT_MS;
  while (!session.closed && Date.now() < deadline) {
    const response = await send(session, "Runtime.evaluate", {
      expression: `Boolean(window.__antigravityZhPatchInstalled &&
        window.__antigravityZhPatchGuard === ${JSON.stringify(snapshot.guard)} &&
        window.__antigravityZhPatchDictionarySize === ${snapshot.size} &&
        window.__antigravityZhPatchObserver &&
        window.__antigravityZhPatchController && !window.__antigravityZhPatchController.stopped)`,
      returnByValue: true,
    }, Math.min(CDP_REQUEST_TIMEOUT_MS, Math.max(1, deadline - Date.now())));
    const failure = describeFailure(response);
    if (failure) throw new Error(failure);
    if (response.result.result?.value === true) return true;
    await delay(100);
  }
  return false;
}
async function registerDocumentScript(session, snapshot) {
  if (session.scriptIdentifier) {
    const removed = await send(session, "Page.removeScriptToEvaluateOnNewDocument", { identifier: session.scriptIdentifier });
    const failure = describeFailure(removed);
    if (failure) throw new Error(failure);
    session.scriptIdentifier = null;
  }
  const response = await send(session, "Page.addScriptToEvaluateOnNewDocument", { source: snapshot.source });
  const failure = describeFailure(response);
  if (failure || !response.result.identifier) throw new Error(failure || "无法注册新文档汉化脚本");
  session.scriptIdentifier = response.result.identifier;
}
async function inject(session, snapshot, reason) {
  const target = session.target;
  const attempt = (injectAttempts.get(target.id) || 0) + 1;
  injectAttempts.set(target.id, attempt);
  try {
    await registerDocumentScript(session, snapshot);
    const response = await send(session, "Runtime.evaluate", {
      expression: snapshot.source, awaitPromise: false, returnByValue: true,
    });
    const failure = describeFailure(response);
    if (failure) throw new Error(failure);
    if (!await waitForMarker(session, snapshot)) throw new Error("页面初始汉化未在规定时间内完成");
    log(`汉化成功 ${targetLabel(target)}（patchVersion=${patchVersion}, revision=${snapshot.revision}, ${reason}）`);
  } catch (error) {
    log(`汉化失败（第 ${attempt}/${MAX_INJECT_ATTEMPTS} 次，${reason}）${targetLabel(target)}：${error.message || error}`);
    if (attempt >= MAX_INJECT_ATTEMPTS) log(`汉化失败 ${target.id}：停止重试，更新词典后可重新尝试`);
    closeSession(session, "汉化失败，关闭本次连接");
  }
}
function updateSession(session, reason) {
  // A connection has one update at a time. Capture the newest immutable snapshot
  // when its turn begins so file saves cannot mix different script revisions.
  session.updates = session.updates.then(async () => {
    if (!session.closed && dictionaryReady) await inject(session, patchSnapshot(), reason);
  }).catch(error => {
    log(`汉化失败 ${session.target.id}：${error.message || error}`);
    closeSession(session);
  });
  return session.updates;
}
function reinjectAll(reason) {
  dictionaryReady = true;
  injectAttempts.clear();
  const sessions = [...attached.values()];
  if (!sessions.length) {
    log(`词典已更新（${reason}）：当前没有已连接的页面，等下次注入时生效`); return;
  }
  for (const session of sessions) updateSession(session, `热更新 ${reason}`);
}
async function attach(target) {
  if (!dictionaryReady || !target.webSocketDebuggerUrl || attached.has(target.id) ||
      (injectAttempts.get(target.id) || 0) >= MAX_INJECT_ATTEMPTS) return;
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const session = { ws, target, nextId: 0, pending: new Map(), updates: Promise.resolve(), closed: false, scriptIdentifier: null };
  attached.set(target.id, session);
  session.connectTimer = setTimeout(() => {
    injectAttempts.set(target.id, (injectAttempts.get(target.id) || 0) + 1);
    closeSession(session, "连接调试端口超时");
  }, CDP_REQUEST_TIMEOUT_MS);
  ws.addEventListener("message", event => {
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    session.pending.get(message.id)?.(message);
  });
  ws.addEventListener("open", async () => {
    clearTimeout(session.connectTimer);
    log(`已连接调试端口 ${targetLabel(target)}`);
    for (const method of ["Page.enable", "Runtime.enable"]) {
      const failure = describeFailure(await send(session, method));
      if (failure) { closeSession(session, failure); return; }
    }
    await updateSession(session, "首次注入");
  });
  ws.addEventListener("close", () => closeSession(session));
  ws.addEventListener("error", () => closeSession(session, "调试连接异常"));
}

function scheduleNextPoll() {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(poll, appSeen ? POLL_ACTIVE_MS : POLL_IDLE_MS);
}
async function poll() {
  if (polling) return;
  polling = true;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(1200) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const targets = await response.json();
    if (!Array.isArray(targets)) throw new Error("页面列表格式错误");
    if (!appSeen) log(`检测到 Antigravity（端口 ${port}），开始注入`);
    appSeen = true; missingRounds = 0;
    const currentIds = new Set(targets.map(target => target.id));
    for (const session of [...attached.values()]) if (!currentIds.has(session.target.id)) closeSession(session);
    for (const id of injectAttempts.keys()) if (!currentIds.has(id)) injectAttempts.delete(id);
    for (const target of targets) if (target.type === "page") await attach(target);
  } catch (error) {
    missingRounds++;
    if (appSeen) log(`Antigravity 调试端口已关闭（端口 ${port}），回到慢速检测`);
    appSeen = false;
    for (const session of [...attached.values()]) closeSession(session);
    if (missingRounds === 1) log(`waiting for Antigravity on port ${port}`);
  } finally { polling = false; scheduleNextPoll(); }
}
const singleton = http.createServer((request, response) => {
  if (request.url === "/poll") {
    response.writeHead(200, { "content-type": "text/plain" }); response.end("ok");
    clearTimeout(pollTimer); poll();
  } else { response.writeHead(404); response.end(); }
});
singleton.on("error", error => {
  if (error.code === "EADDRINUSE") process.exit(0);
  log(`injector singleton error: ${error.message || error}`); process.exit(1);
});
singleton.listen(singletonPort, "127.0.0.1", () => log(`injector singleton listening on ${singletonPort}`));
const initial = loadDictionaries();
if (initial.ok) {
  initial.warnings.forEach(message => log(`词典提示：${message}`));
  applyDictionary(initial, "启动"); dictionaryReady = true;
} else {
  initial.errors.forEach(message => log(`词典加载失败：${message}`));
  log("词典加载失败：暂停注入，修正 JSON 后自动恢复");
}
watchDictionaries();
log(`injector started on port ${port} (patchVersion=${patchVersion})`);
poll();
