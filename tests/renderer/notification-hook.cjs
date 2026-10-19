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

// Hot reload must refresh the already-installed native bridge's dictionary.
{
  const env = createEnvironment(true);
  const before = env.mockNative.send;
  env.sandbox.__antigravityZhPatchDictionary = { 'New phrase': '新文案' };
  new vm.Script(translateSrc).runInContext(env.sandbox);
  env.mockNative.send({title:'New phrase'});
  if (env.getNativeSent()?.title === '新文案' && env.mockNative.send === before) console.log('PASS  热加载更新既有通知翻译器且不重复包装');
  else { console.error('FAIL 热加载通知词库'); failures++; }
  env.sandbox.__antigravityZhPatchController.stop();
  env.mockNative.send({title:'New phrase'});
  new env.sandbox.Notification('New phrase', {body:'New phrase'});
  if (env.getNativeSent()?.title === 'New phrase' && env.getWebSent()?.title === 'New phrase') console.log('PASS  停用后通知恢复原文');
  else { console.error('FAIL 通知停用还原'); failures++; }
}
console.log(failures === 0 ? '\nnotification hook: ALL PASS' : `\nnotification hook: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
