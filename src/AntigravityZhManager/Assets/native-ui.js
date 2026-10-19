'use strict';

// Electron dialogs have no DOM. Clone only their UI fields, keeping window
// overloads, callback/Promise behavior, response IDs and the original options.
function createNativeUi(dictionary) {
  const installed = new WeakSet();
  function translateNative(value) {
    if (typeof value !== 'string') return value;
    if (Object.hasOwn(dictionary, value)) return dictionary[value];
    const match = value.match(/^The WSL distro "(.+)" is no longer installed\.$/);
    return match ? `WSL 发行版“${match[1]}”已不再安装。` : value;
  }
  function localizeOptions(options) {
    if (!options || typeof options !== 'object') return options;
    const next = { ...options };
    for (const key of ['title', 'message', 'detail', 'checkboxLabel']) {
      if (typeof next[key] === 'string') next[key] = translateNative(next[key]);
    }
    if (Array.isArray(next.buttons)) next.buttons = next.buttons.map(translateNative);
    return next;
  }
  function installNativeDialogs(dialog) {
    if (!dialog || installed.has(dialog)) return;
    for (const key of ['showMessageBox', 'showMessageBoxSync']) {
      const original = dialog[key];
      if (typeof original !== 'function') continue;
      dialog[key] = function (...args) {
        // Electron accepts (options) and (BrowserWindow, options).
        const index = args.length >= 2 && args[1] && typeof args[1] === 'object' ? 1 : 0;
        args[index] = localizeOptions(args[index]);
        return original.apply(this, args);
      };
    }
    installed.add(dialog);
  }
  return { translateNative, installNativeDialogs };
}

module.exports = { createNativeUi };
