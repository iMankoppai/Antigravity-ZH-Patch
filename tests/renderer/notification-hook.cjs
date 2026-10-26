'use strict';
// 回归测试：验证原生桌面通知拦截与汉化（nativeNotifications.send & Notification constructor）
const fs = require('fs');
const vm = require('vm');

const translateSrc = fs.readFileSync('src/AntigravityZhManager/Assets/translate.js', 'utf8');

function createEnvironment(initialNative = true) {
  let capturedNativeSend = null;
  let capturedWebNotification = null;

  const mockNative = {
    send(opts) {
      capturedNativeSend = opts;
    }
  };

  class MockNotification {
    constructor(title, options) {
      capturedWebNotification = { title, options };
    }
  }

  const domDoc = {
    documentElement: { lang: '' },
    ownerDocument: null,
    addEventListener() {},
    removeEventListener() {},
    createElement() {
      return { style: {}, appendChild() {}, remove() {} };
    },
    body: { appendChild() {} },
    createTreeWalker() {
      return { nextNode: () => null };
    }
  };

  const sandbox = {
    window: {},
    document: domDoc,
    Node: { TEXT_NODE: 3 },
    NodeFilter: { SHOW_TEXT: 4 },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    navigator: { platform: 'Win32' },
    setTimeout: (fn) => setTimeout(fn, 100),
    clearTimeout: () => {},
    queueMicrotask: () => {},
    performance: { now: () => 0 },
    console,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    Set,
    Map,
    WeakMap
  };

  sandbox.window = sandbox;
  sandbox.window.__antigravityZhPatchDictionary = {
    ...require('../../src/AntigravityZhManager/Assets/dictionaries.json'),
    'Task Completed': '任务已完成',
    'Antigravity has finished the requested task.': 'Antigravity 已完成请求的任务。',
    'Build failed': '构建失败'
  };

  if (initialNative) {
    sandbox.window.nativeNotifications = mockNative;
  }
  sandbox.window.Notification = MockNotification;

  vm.createContext(sandbox);
  new vm.Script(translateSrc).runInContext(sandbox);

  return {
    sandbox,
    mockNative,
    getNativeSent: () => capturedNativeSend,
    getWebSent: () => capturedWebNotification
  };
}

let failures = 0;

// 测试 1：即时挂载的 nativeNotifications.send
{
  const env = createEnvironment(true);
  env.sandbox.window.nativeNotifications.send({
    title: 'Task Completed',
    body: 'Antigravity has finished the requested task.',
    silent: true
  });
  const sent = env.getNativeSent();
  if (sent && sent.title === '任务已完成' && sent.body === 'Antigravity 已完成请求的任务。' && sent.silent === true) {
    console.log('PASS  nativeNotifications.send 即时挂载拦截与汉化成功');
  } else {
    console.error('FAIL  nativeNotifications.send 即时挂载拦截失败:', sent);
    failures++;
  }
}

// 测试 2：晚绑定的 window.nativeNotifications
{
  const env = createEnvironment(false);
  let lateSent = null;
  env.sandbox.window.nativeNotifications = {
    send(opts) {
      lateSent = opts;
    }
  };
  env.sandbox.window.nativeNotifications.send({
    title: 'Task Completed',
    body: 'Antigravity has finished the requested task.'
  });
  if (lateSent && lateSent.title === '任务已完成' && lateSent.body === 'Antigravity 已完成请求的任务。') {
    console.log('PASS  window.nativeNotifications 晚绑定拦截与汉化成功');
  } else {
    console.error('FAIL  window.nativeNotifications 晚绑定拦截失败:', lateSent);
    failures++;
  }
}

// 测试 3：Web Notification API 构造拦截
{
  const env = createEnvironment(true);
  new env.sandbox.window.Notification('Build failed', {
    body: 'Antigravity has finished the requested task.'
  });
  const webSent = env.getWebSent();
  if (webSent && webSent.title === '构建失败' && webSent.options?.body === 'Antigravity 已完成请求的任务。') {
    console.log('PASS  window.Notification Web API 拦截与汉化成功');
  } else {
    console.error('FAIL  window.Notification Web API 拦截失败:', webSent);
    failures++;
  }
}

// Real YEa notifications use the brand as title and an arbitrary summary as body.
// Localize the completion status while preserving the whole conversation name.
{
  const assert = require('node:assert/strict');
  const env = createEnvironment(true);
  for (const summary of ['GitHub Repository Analysis Lemo Opusoar', 'Settings', '1 archived conversation', '中文会话']) {
    const options = { id: 'agent-finished-cascade-123', title: 'Antigravity', body: summary,
      payload: { cascadeId: 'cascade', type: 'request_action' }, silent: true };
    const before = JSON.stringify(options);
    env.mockNative.send(options);
    assert.equal(env.getNativeSent().body, '任务已完成：' + summary);
    assert.equal(env.getNativeSent().title, 'Antigravity');
    assert.equal(env.getNativeSent().payload, options.payload);
    assert.equal(JSON.stringify(options), before, '不修改调用方数据');
    new env.sandbox.Notification('Antigravity', { body: summary, tag: options.id, silent: true });
    assert.equal(env.getWebSent().options.body, '任务已完成：' + summary);
    assert.equal(env.getWebSent().options.tag, options.id);
  }
  env.mockNative.send({ id: 'agent-finished-empty-1', title: 'Antigravity', body: 'Agent finished' });
  assert.equal(env.getNativeSent().body, '任务已完成');
  const actionCases = [
    ['Requesting your permission in Terminal:', 'Command: echo Settings && git status', '命令：echo Settings && git status'],
    ['Requesting your permission to execute JavaScript:', 'Code: window.title = "Settings"', '代码：window.title = "Settings"'],
    ['Requesting your permission to open URL:', 'URL: https://example.com/Settings?q=High', '网址：https://example.com/Settings?q=High'],
    ['The agent has a question for you:', 'Settings', 'Settings'],
    ['The agent has questions for you:', 'Click to respond to the questions.', '点击以回答这些问题。'],
    ['Requesting your permission:', 'Settings', 'Settings'],
    ['Action requires your attention', 'The agent is waiting for your input.', '智能体正在等待您的输入。']
  ];
  for (const [title, body, expected] of actionCases) {
    env.mockNative.send({ title, body, payload: { type: 'request_action' } });
    assert.equal(env.getNativeSent().body, expected, title);
    assert.notEqual(env.getNativeSent().title, title, '固定通知标题已翻译');
    new env.sandbox.Notification(title, { body });
    assert.equal(env.getWebSent().options.body, expected, 'Web 通知：' + title);
  }
  env.sandbox.__antigravityZhPatchController.stop();
  env.mockNative.send({ id: 'agent-finished-disabled-1', title: 'Antigravity', body: 'Settings' });
  assert.equal(env.getNativeSent().body, 'Settings', '停用后不再添加中文状态');
  console.log('PASS  真实任务完成、权限、问题通知及动态内容保护（原生与 Web）');
}

// Hot reload must refresh the already-installed native bridge's dictionary.
{
  const env = createEnvironment(true);
  const before = env.mockNative.send;
  const beforeWeb = env.sandbox.Notification;
  env.sandbox.__antigravityZhPatchDictionary = { 'New phrase': '新文案' };
  new vm.Script(translateSrc).runInContext(env.sandbox);
  env.mockNative.send({title:'New phrase'});
  if (env.getNativeSent()?.title === '新文案' && env.mockNative.send === before) console.log('PASS  热加载更新既有通知翻译器且不重复包装');
  else { console.error('FAIL 热加载通知词库'); failures++; }
  env.mockNative.send({ id: 'agent-finished-reload-1', title: 'Antigravity', body: 'Settings' });
  new env.sandbox.Notification('Antigravity', { tag: 'agent-finished-reload-1', body: 'Settings' });
  if (env.getNativeSent()?.body === '任务已完成：Settings' && env.getWebSent()?.options.body === '任务已完成：Settings' && env.sandbox.Notification === beforeWeb)
    console.log('PASS  热加载原生与 Web 通知只添加一次状态且保留标题');
  else { console.error('FAIL 热加载通知重复前缀'); failures++; }
  env.sandbox.__antigravityZhPatchController.stop();
  env.mockNative.send({title:'New phrase'});
  new env.sandbox.Notification('New phrase', {body:'New phrase'});
  if (env.getNativeSent()?.title === 'New phrase' && env.getWebSent()?.title === 'New phrase') console.log('PASS  停用后通知恢复原文');
  else { console.error('FAIL 通知停用还原'); failures++; }
}
console.log(failures === 0 ? '\nnotification hook: ALL PASS' : `\nnotification hook: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
