// Antigravity 会话统计状态条 —— 渲染端脚本。
// 由 zh-bundle 主进程（永久安装后随客户端启动）或管理器运行时注入；主进程每 2 秒调用 window.__agStatsRender(data)。
// 形态：内联在输入框底栏空白处，分三组（⏱ 轮/步·tok/s ｜ 🗄 总量·缓存命中 ｜ ◔ 上下文%）。
// 交互：点击某一组只弹出对应的那一张卡片（分块显示，互不连体），再点收起；点击空白处也收起。
(() => {
  if (window.__agStatsHudInstalled) return;
  window.__agStatsHudInstalled = true;
  window.__agStatsPanel = 'none'; // 'none' | 'stats' | 'tokens' | 'ctx'

  // 一次性挂钩 fetch，捕获 App 自己的 GetUserStatus 响应（配额/积分），不额外发请求。
  if (!window.__agUserStatusHook) {
    try {
      var _f = window.fetch;
      window.fetch = function () {
        var p = _f.apply(this, arguments);
        try {
          var a0 = arguments[0], url = typeof a0 === 'string' ? a0 : (a0 && a0.url) || '';
          if (url && url.indexOf('GetUserStatus') >= 0 && p && p.then) {
            p.then(function (r) {
              try {
                r.clone().arrayBuffer().then(function (ab) {
                  try {
                    var bb = new Uint8Array(ab);
                    var ln = (bb[1] << 24) | (bb[2] << 16) | (bb[3] << 8) | bb[4];
                    var tx = new TextDecoder().decode(bb.slice(5, 5 + ln));
                    var o = JSON.parse(tx);
                    window.__agUserStatus = o.userStatus || o;
                  } catch (e) { }
                });
              } catch (e) { }
            });
          }
        } catch (e) { }
        return p;
      };
      window.__agUserStatusHook = true;
    } catch (e) { }
  }

  function isDark() { try { return document.body.classList.contains('theme-dark'); } catch (e) { return false; } }
  function fmt(n) { n = Number(n) || 0; return n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(Math.round(n)); }
  function modelName() { try { var e = document.querySelector('[data-testid="model-selector-trigger"]'); return e ? ((e.innerText || e.textContent || '').trim().split('\n')[0]) : ''; } catch (e) { return ''; } }
  function limitOf(name) { var n = (name || '').toLowerCase(); if (/gpt-oss|gpt oss/.test(n)) return 80000; if (n.indexOf('claude') >= 0) return n.indexOf('4.6') >= 0 ? 160000 : 256000; return 256000; }
  function pricingOf(name) {
    var n = (name || '').toLowerCase();
    if (/gpt-oss|gpt oss/.test(n)) return null;
    if (n.indexOf('gemini') >= 0 && n.indexOf('3.8') >= 0) return { inp: 0.75, out: 3.75, cache: 0.075 };
    if (n.indexOf('gemini') >= 0 && n.indexOf('argon') >= 0) return { inp: 2.0, out: 10.0, cache: 0.10 };
    if (n.indexOf('claude') >= 0) return n.indexOf('opus') >= 0 ? { inp: 4.0, out: 20.0, cache: 0.20 } : { inp: 2.0, out: 10.0, cache: 0.20 };
    return null;
  }
  function fmtCost(c) { if (c == null) return '—'; if (c <= 0) return '$0.00'; if (c < 0.001) return '<$0.001'; return '$' + c.toFixed(3); }
  function num(n) { n = Math.round(Number(n) || 0); return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function cacheStateZh(t) {
    if (t === 'COLD') return '已过期';
    var m = /^HOT\s*(.*)$/.exec(t || '');
    if (m) return '有效 ' + m[1];
    return t || '—';
  }
  function statusZh(s) {
    var k = String(s || '').trim().toUpperCase();
    var map = { DONE: '已完成', RUNNING: '生成中', GENERATING: '生成中', THINKING: '思考中', PENDING: '等待中', IDLE: '空闲', ERROR: '出错', FAILED: '失败', CANCELLED: '已取消', CANCELED: '已取消', STOPPED: '已停止' };
    return map[k] || (s || '');
  }

  function ensureInline(el) {
    try {
      var speed = document.querySelector('[data-testid="permissions-selector-trigger"]');
      var right = speed ? speed.parentElement : null;
      var footer = right ? right.parentElement : null;
      if (footer && footer.className && String(footer.className).indexOf('input-footer') >= 0) {
        if (el.parentElement !== footer) footer.insertBefore(el, right);
        try { if (getComputedStyle(footer).position === 'static') footer.style.position = 'relative'; } catch (e) { }
        // 保护左侧模型选择器：不让 HUD 抢空间把模型名挤成「Gemini…」
        try {
          var mt = footer.querySelector('[data-testid="model-selector-trigger"]');
          if (mt) { mt.style.flex = '0 0 auto'; mt.style.minWidth = 'max-content'; mt.style.whiteSpace = 'nowrap'; }
        } catch (e) { }
        return true;
      }
    } catch (e) { }
    if (el.parentElement !== document.body) document.body.appendChild(el);
    return false;
  }

  function applyStyle(el, inline) {
    var dark = isDark();
    if (inline) {
      el.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:inline-flex;align-items:center;padding:0;color:' + (dark ? '#cbd5e1' : '#64748b') + ';font:12px/1.4 "Microsoft YaHei UI",system-ui,sans-serif;white-space:nowrap;cursor:pointer;pointer-events:auto;user-select:none;';
    } else {
      el.style.cssText = 'position:fixed;left:16px;bottom:56px;z-index:2147483000;display:flex;flex-direction:column;gap:3px;align-items:flex-start;padding:6px 10px;border-radius:10px;background:transparent;color:' + (dark ? '#cbd5e1' : '#334155') + ';font:12px/1.5 "Microsoft YaHei UI",system-ui,sans-serif;cursor:pointer;pointer-events:auto;user-select:none;';
    }
  }

  function removePop() { var p = document.getElementById('ag-stats-hud-pop'); if (p) p.remove(); }

  // 在「模型选择器右边、右侧控件左边」的中间空白区居中
  function positionInline(el) {
    try {
      var footer = el.parentElement;
      if (!footer || String(footer.className).indexOf('input-footer') < 0) return;
      var m = footer.querySelector('[data-testid="model-selector-trigger"]');
      var p = footer.querySelector('[data-testid="permissions-selector-trigger"]');
      var fr = footer.getBoundingClientRect();
      var left = m ? m.getBoundingClientRect().right : fr.left;
      var right = p ? p.getBoundingClientRect().left : fr.right;
      var center = (left + right) / 2;
      el.style.left = Math.round(center - fr.left) + 'px';
      el.style.transform = 'translate(-50%,-50%)';
    } catch (e) { }
  }

  // 单卡定位：贴在该组上方（分块显示，互不连体）
  function posPop(el, groupEl) {
    var p = document.getElementById('ag-stats-hud-pop'); if (!p) return;
    try {
      var footer = (el.parentElement && String(el.parentElement.className).indexOf('input-footer') >= 0) ? el.parentElement : el;
      var fr = footer.getBoundingClientRect();
      var left = fr.left;
      if (groupEl) { var gr = groupEl.getBoundingClientRect(); left = gr.left; }
      left = Math.max(8, Math.min(left, window.innerWidth - 372));
      p.style.left = left + 'px';
      p.style.bottom = (window.innerHeight - fr.top + 8) + 'px';
    } catch (e) { }
  }

  function row(label, valueHtml) {
    return '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:3px 0">' +
      '<span style="color:#6b7280;font-size:11.5px;white-space:nowrap">' + label + '</span>' +
      '<span style="color:#111827;font-weight:500;font-size:12.5px;white-space:nowrap;text-align:right">' + valueHtml + '</span>' +
      '</div>';
  }
  // 独立卡片：自带浅灰底、圆角、阴影，三张卡片各成一卡，不连体。
  function cardBox(title, headRight, bodyHtml) {
    return '<div style="display:inline-block;vertical-align:top;min-width:250px;max-width:360px;background:#f7f8fa;border:1px solid #edf0f4;border-radius:12px;padding:12px 14px;box-shadow:0 10px 30px rgba(0,0,0,.14)">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">' +
        '<span style="font-size:12.5px;font-weight:700;color:#1f2937;white-space:nowrap">' + title + '</span>' +
        (headRight ? '<span style="font-size:12px;font-weight:700;color:#111827;white-space:nowrap">' + headRight + '</span>' : '') +
      '</div>' +
      '<div style="border-top:1px solid #e8ebf0;padding-top:6px">' + bodyHtml + '</div>' +
      '</div>';
  }
  // 按面板类型生成对应的单张卡片
  function panelHtml(panel, b, d, ctx, limit, ctxPct, hit, total, cacheTxt, stepsTxt, costTxt, quotaTxt) {
    if (panel === 'stats') {
      return cardBox('⏱ 会话统计', '',
        row('对话轮次', b(d.turns) + ' 轮') +
        row('完成步数', b(d.steps) + ' 步') +
        row('输出速度', b((d.tokPerSec || 0).toFixed(0)) + ' tok/s') +
        row('平均每步', d.avgGrowth > 0 ? '+ ' + fmt(d.avgGrowth) + ' tok' : '—') +
        row('会话状态', statusZh(d.status) || '—'));
    }
    if (panel === 'tokens') {
      var inTok = d.inTok || 0, cacheTok = d.cacheTok || 0, outTok = d.outTok || 0;
      return cardBox('🗄 Token 用量', b(num(total)) + ' tok',
        row('缓存命中', b(hit.toFixed(1) + '%')) +
        row('未缓存输入', num(inTok) + ' tok') +
        row('缓存读取', num(cacheTok) + ' tok') +
        row('输出', num(outTok) + ' tok') +
        row('缓存状态', cacheStateZh(cacheTxt)));
    }
    var pct = Math.max(0, Math.min(100, ctxPct));
    var bar = '<div style="height:6px;border-radius:3px;background:#e5e7eb;overflow:hidden;margin:2px 0 9px">' +
      '<div style="height:100%;width:' + pct.toFixed(1) + '%;background:linear-gradient(90deg,#60a5fa,#3b82f6);border-radius:3px"></div></div>';
    return cardBox('◔ 上下文已用', b(ctxPct.toFixed(1) + '%'),
      bar +
      row('已用 / 上限', fmt(ctx) + ' / ' + fmt(limit)) +
      row('距自动压缩', stepsTxt) +
      row('预估成本', costTxt) +
      row('配额积分', quotaTxt));
  }

  window.__agStatsRender = function (d) {
    if (!d) return false;
    window.__agStatsHudData = d;
    var el = document.getElementById('ag-stats-hud');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ag-stats-hud';
      // 事件委托：点击某一组只切换对应面板
      el.onclick = function (e) {
        var t = e.target && e.target.closest ? e.target.closest('[data-ag-panel]') : null;
        if (!t) return;
        e.stopPropagation();
        var key = t.getAttribute('data-ag-panel');
        window.__agStatsPanel = (window.__agStatsPanel === key) ? 'none' : key;
        if (window.__agStatsHudData) window.__agStatsRender(window.__agStatsHudData);
      };
    }
    var inline = ensureInline(el);
    applyStyle(el, inline);
    if (inline) positionInline(el);

    var dark = isDark(), strong = dark ? '#f8fafc' : '#0f172a';
    var b = function (t, c) { return '<b style="color:' + (c || strong) + ';font-weight:600">' + t + '</b>'; };
    var bi = function (t) { return '<b style="color:' + (dark ? '#cbd5e1' : '#475569') + ';font-weight:400">' + t + '</b>'; };
    var inTok = d.inTok || 0, cacheTok = d.cacheTok || 0, outTok = d.outTok || 0;
    var total = inTok + cacheTok + outTok, inputSide = inTok + cacheTok;
    var hit = inputSide ? (cacheTok / inputSide * 100) : 0;
    var model = modelName(), limit = limitOf(model), ctx = d.ctx || 0;
    var ctxPct = limit ? (ctx / limit * 100) : 0;

    var ttlMs = 5 * 60 * 1000, cacheTxt = '—';
    if (d.lastAtMs > 0) {
      var rem = ttlMs - (Date.now() - d.lastAtMs);
      if (rem > 0) { var mm = Math.floor(rem / 60000), ss = Math.floor((rem % 60000) / 1000); cacheTxt = 'HOT ' + mm + ':' + (ss < 10 ? '0' : '') + ss; }
      else cacheTxt = 'COLD';
    }
    var stepsTxt = '—';
    if (d.avgGrowth > 0 && ctx < limit) stepsTxt = '≈' + Math.max(0, Math.floor((limit - ctx) / d.avgGrowth)) + ' 步';
    var pr = pricingOf(model), costTxt = '—';
    if (pr) costTxt = fmtCost((inTok * pr.inp + outTok * pr.out + cacheTok * pr.cache) / 1e6);
    var quotaTxt = '—', us = window.__agUserStatus;
    if (us) {
      var plan = (us.userTier && us.userTier.planName) || (us.planStatus && us.planStatus.planInfo && us.planStatus.planInfo.planName) || '';
      var credit = null;
      try { if (us.userTier && us.userTier.availableCredits && us.userTier.availableCredits.length) credit = us.userTier.availableCredits[0].creditAmount; } catch (e) { }
      if (credit == null && us.planStatus) credit = us.planStatus.availablePromptCredits;
      if (credit != null) quotaTxt = (plan ? plan + ' ' : '') + '积分 ' + Number(credit).toLocaleString();
      else if (plan) quotaTxt = plan;
    }

    var panel = window.__agStatsPanel || 'none';
    var grp = function (key, inner) {
      var active = (panel === key);
      var color = active ? (dark ? '#f1f5f9' : '#1f2937') : (dark ? '#9aa4b2' : '#7b8698');
      return '<span data-ag-panel="' + key + '" style="cursor:pointer;display:inline-block;white-space:nowrap;color:' + color + '">' + inner + (active ? ' ▴' : '') + '</span>';
    };
    el.innerHTML = '<span style="display:inline-flex;align-items:center;gap:26px;white-space:nowrap">' +
      grp('stats', '⏱ ' + bi(d.turns) + ' 轮 ' + bi(d.steps) + ' 步 · ' + bi((d.tokPerSec || 0).toFixed(0)) + ' tok/s') +
      grp('tokens', '🗄 ' + bi(fmt(total)) + ' tok · 缓存命中 ' + bi(hit.toFixed(1) + '%')) +
      grp('ctx', '◔ ' + bi(ctxPct.toFixed(0) + '%')) +
      '</span>';

    if (panel === 'none') { removePop(); return true; }

    var pop = document.getElementById('ag-stats-hud-pop');
    if (!pop) {
      pop = document.createElement('div'); pop.id = 'ag-stats-hud-pop';
      pop.style.cssText = 'position:fixed;z-index:2147483001;box-sizing:border-box;background:transparent;padding:0;pointer-events:none;';
      document.body.appendChild(pop);
    }
    var bp = function (t, c) { return '<b style="color:' + (c || '#0f172a') + ';font-weight:600">' + t + '</b>'; };
    pop.innerHTML = panelHtml(panel, bp, d, ctx, limit, ctxPct, hit, total, cacheTxt, stepsTxt, costTxt, quotaTxt);
    posPop(el, el.querySelector('[data-ag-panel="' + panel + '"]'));
    return true;
  };

  window.__agStatsRemove = function () {
    var e = document.getElementById('ag-stats-hud'); if (e) e.remove();
    removePop(); delete window.__agStatsHudData; window.__agStatsPanel = 'none'; return true;
  };

  // 点击空白处收起
  document.addEventListener('click', function (e) {
    if (!window.__agStatsPanel || window.__agStatsPanel === 'none') return;
    var p = document.getElementById('ag-stats-hud-pop'), el = document.getElementById('ag-stats-hud');
    if (p && !p.contains(e.target) && el && !el.contains(e.target)) {
      window.__agStatsPanel = 'none';
      if (window.__agStatsHudData) window.__agStatsRender(window.__agStatsHudData);
    }
  }, true);
})();
