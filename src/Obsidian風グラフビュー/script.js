// Author: kamekingdom (2026-10-28)
// Cosense Graph View v2 — all nodes, adaptive labels and page-matched theme. No dependencies.
// Install: import '/api/code/kamelayout/グラフビュー/script.js';
// Place style.css in the same Cosense page. It is loaded automatically.

(() => {
  'use strict';

  if (window.__kameGraphView?.installed) return;

  const CONFIG = {
    maxPages: 10000,       // API取得上限。増やす場合は描画負荷に注意
    cacheMs: 5 * 60 * 1000,
    simulationFrames: 280,
  };
  const RESERVED = new Set(['api', 'settings', 'projects', 'stream', 'pricing', 'login', 'help']);
  const app = { installed: true, close: () => {} };
  window.__kameGraphView = app;

  // Import先のscript.jsと同じCosenseページにあるstyle.cssを読む。
  const cssUrl = new URL('./style.css', import.meta.url).href;
  if (!document.querySelector('link[data-kame-graph-css]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    link.dataset.kameGraphCss = '1';
    document.head.appendChild(link);
  }

  const route = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (!parts.length || RESERVED.has(parts[0])) return null;
    try {
      return {
        project: decodeURIComponent(parts[0]),
        page: parts.length > 1 ? decodeURIComponent(parts.slice(1).join('/')) : null,
      };
    } catch {
      return null;
    }
  };
  const keyOf = (value) => String(value || '').trim().toLocaleLowerCase();
  const shortTitle = (title, limit = 18) =>
    [...title].length > limit ? [...title].slice(0, limit - 1).join('') + '…' : title;
  const pageUrl = (project, title) =>
    `/${encodeURIComponent(project)}/${encodeURIComponent(title)}`;

  let overlay = null;
  let ui = null;
  let canvas = null;
  let ctx = null;
  let resizeObserver = null;
  let fetchAbort = null;
  let frame = 0;
  let simulationStep = 0;
  const cache = new Map();

  const state = {
    project: '',
    currentPage: '',
    mode: 'global',
    pages: [],
    pageMap: new Map(),
    adjacency: new Map(),
    edgesAll: [],
    graphNodes: [],
    graphEdges: [],
    nodeMap: new Map(),
    selected: null,
    hovered: null,
    localRoot: null,
    query: '',
    panX: 0,
    panY: 0,
    zoom: 1,
    width: 0,
    height: 0,
    pointer: null,
    moveCount: 0,
    theme: null,
    labelThresholdHigh: Infinity,
    labelThresholdMid: Infinity,
  };

  // Cosenseで実際に適用されている色を読み、画面全体を同系統に揃える。
  // ユーザーがライト/ダークCSSを切り替えた場合も、Graph Viewを開き直すと反映される。
  function readRgb(value) {
    const v = String(value || '').trim();
    if (v.startsWith('#')) {
      const hex = v.slice(1);
      const norm = hex.length === 3 ? [...hex].map(c => c + c).join('') : hex;
      if (/^[a-f0-9]{6}$/i.test(norm)) return [0, 2, 4].map(i => parseInt(norm.slice(i, i + 2), 16));
    }
    const m = v.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
    if (m && !/^rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(v)) return m.slice(1, 4).map(Number);
    return null;
  }
  const blend = (a, b, t) => a.map((v, i) => Math.round(v * (1 - t) + b[i] * t));
  const rgbCss = c => `rgb(${c.map(v => Math.max(0, Math.min(255, Math.round(v)))).join(', ')})`;
  const alphaCss = (c, a) => `rgba(${c.map(Math.round).join(', ')}, ${a})`;
  const luminance = c => c.reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0) / 255;
  function syncTheme() {
    if (!overlay) return;
    const root = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const page = document.querySelector('main.page') || document.querySelector('.page');
    const pageStyle = page ? getComputedStyle(page) : null;
    const bg = [pageStyle?.backgroundColor, body.backgroundColor, root.backgroundColor]
      .map(readRgb).find(Boolean) || [246, 247, 248];
    const dark = luminance(bg) < 0.48;
    const ink = readRgb(pageStyle?.color) || readRgb(body.color) || (dark ? [238, 241, 244] : [48, 52, 59]);
    const link = document.querySelector('main.page a[href], .page .line a[href]');
    const linkColor = link ? readRgb(getComputedStyle(link).color) : null;
    const vars = ['--accent-color', '--theme-color', '--color-accent', '--link-color'];
    let accent = vars.map(name => readRgb(root.getPropertyValue(name))).find(Boolean) || linkColor;
    if (!accent || Math.max(...accent) - Math.min(...accent) < 25) accent = dark ? [112, 166, 230] : [66, 128, 195];
    const paper = dark ? blend(bg, [255, 255, 255], .055) : blend(bg, [255, 255, 255], .72);
    const stage = dark ? blend(bg, [0, 0, 0], .07) : blend(bg, [0, 0, 0], .015);
    const line = blend(stage, ink, dark ? .23 : .15);
    const subtle = blend(ink, stage, .38);
    const hub = blend(accent, ink, .08);
    const mid = blend(accent, stage, .39);
    const leaf = blend(ink, stage, dark ? .42 : .54);
    const theme = { bg: stage, paper, ink, subtle, line, accent, hub, mid, leaf,
      edge: blend(ink, stage, dark ? .56 : .60) };
    state.theme = theme;
    const tokens = { bg: stage, paper, ink, subtle, line, accent, hub, mid, leaf };
    for (const [k, v] of Object.entries(tokens)) overlay.style.setProperty(`--kgv-${k}`, rgbCss(v));
  }

  function mountButton() {
    const nav = document.querySelector('.navbar .navbar-menu');
    if (!nav || nav.querySelector('.kgv-launch')) return;
    if (!route()) return;
    const li = document.createElement('li');
    li.className = 'kgv-launch';
    const button = document.createElement('button');
    button.className = 'kgv-launch-button';
    button.type = 'button';
    button.title = 'グラフビュー (Ctrl/⌘ + Shift + G)';
    button.setAttribute('aria-label', 'グラフビューを開く');
    button.innerHTML = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="5" cy="6" r="2"/><circle cx="19" cy="7" r="2"/><circle cx="11" cy="18" r="2"/><path d="m7 7.2 10 0.7M6 8l4 8m8-7-6 7"/></svg>';
    button.addEventListener('click', open);
    li.appendChild(button);
    nav.appendChild(li);
  }

  function makeOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'kame-graph-view';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="kgv-window" role="dialog" aria-modal="true" aria-label="Cosense Graph View">
        <header class="kgv-header">
          <div class="kgv-brand"><span class="kgv-brand-icon">◉</span><strong>Graph View</strong><span class="kgv-project"></span></div>
          <div class="kgv-modes" role="group" aria-label="グラフの表示範囲">
            <button type="button" data-mode="global" class="kgv-mode is-active">Global</button>
            <button type="button" data-mode="local" class="kgv-mode">Local</button>
          </div>
          <div class="kgv-header-actions">
            <button type="button" class="kgv-icon kgv-refresh" title="最新データを再取得" aria-label="更新">↻</button>
            <button type="button" class="kgv-icon kgv-close" title="閉じる (Esc)" aria-label="閉じる">×</button>
          </div>
        </header>
        <div class="kgv-toolbar">
          <label class="kgv-search-label"><span>⌕</span><input class="kgv-search" type="search" placeholder="ページを検索して Enter で移動" autocomplete="off" spellcheck="false"/></label>
          <span class="kgv-status">読み込み待ち</span>
          <button type="button" class="kgv-reset" title="全ノードを画面に収める">全体表示</button>
        </div>
        <div class="kgv-content">
          <div class="kgv-stage">
            <canvas class="kgv-canvas" aria-label="ページ間リンクのグラフ"></canvas>
            <div class="kgv-message" hidden></div>
            <div class="kgv-hint">ドラッグ: 移動 · ホイール: 拡大縮小 · クリック: 選択 · ダブルクリック: ページを開く</div>
          </div>
          <aside class="kgv-sidebar"><div class="kgv-detail"><div class="kgv-aside-title">ページ情報</div><p>ノードを選択すると、リンク関係を表示します。</p></div></aside>
        </div>
        <footer class="kgv-footer"><span class="kgv-footnote">同じプロジェクト内の実在するページリンクのみ表示</span><span class="kgv-legend"><span><i class="kgv-swatch kgv-hub"></i>主要ページ</span><span><i class="kgv-swatch kgv-mid"></i>中程度</span><span><i class="kgv-swatch kgv-leaf"></i>少リンク</span></span><span class="kgv-count"></span></footer>
      </div>`;
    document.body.appendChild(overlay);
    ui = {
      project: overlay.querySelector('.kgv-project'),
      status: overlay.querySelector('.kgv-status'),
      search: overlay.querySelector('.kgv-search'),
      message: overlay.querySelector('.kgv-message'),
      detail: overlay.querySelector('.kgv-detail'),
      count: overlay.querySelector('.kgv-count'),
    };
    canvas = overlay.querySelector('.kgv-canvas');
    ctx = canvas.getContext('2d');
    overlay.querySelector('.kgv-close').addEventListener('click', close);
    overlay.querySelector('.kgv-refresh').addEventListener('click', () => load(true));
    overlay.querySelector('.kgv-reset').addEventListener('click', fitGraph);
    overlay.querySelectorAll('[data-mode]').forEach(button => {
      button.addEventListener('click', () => {
        state.mode = button.dataset.mode;
        if (state.mode === 'local') state.localRoot = state.selected || state.currentPage;
        buildView();
      });
    });
    ui.search.addEventListener('input', () => {
      state.query = ui.search.value.trim().toLocaleLowerCase();
      draw();
      updateStatus();
    });
    ui.search.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const found = state.pages.find(p => keyOf(p.title).includes(state.query) && state.query);
      if (!found) return;
      e.preventDefault();
      selectPage(found.title);
    });
    overlay.querySelector('.kgv-detail').addEventListener('click', e => {
      const button = e.target.closest('[data-action]');
      if (!button) return;
      if (button.dataset.action === 'open' && state.selected) navigate(state.selected);
      if (button.dataset.action === 'local' && state.selected) {
        state.mode = 'local';
        state.localRoot = state.selected;
        buildView();
      }
    });
    resizeObserver = new ResizeObserver(() => {
      if (!overlay.hidden) resizeCanvas();
    });
    resizeObserver.observe(canvas.parentElement);
    attachCanvasEvents();
  }

  function message(text, isError = false) {
    ui.message.hidden = !text;
    ui.message.textContent = text || '';
    ui.message.classList.toggle('is-error', !!isError);
  }

  function open() {
    const current = route();
    if (!current) return;
    makeOverlay();
    overlay.hidden = false;
    document.body.classList.add('kgv-open');
    if (state.project !== current.project) {
      state.pages = [];
      state.project = current.project;
    }
    state.currentPage = current.page || '';
    state.localRoot = current.page || null;
    state.mode = 'global';
    state.query = '';
    state.selected = null;
    ui.search.value = '';
    ui.project.textContent = current.project;
    ui.detail.innerHTML = '<div class="kgv-aside-title">ページ情報</div><p>ノードを選択すると、リンク関係を表示します。</p>';
    syncTheme();
    resizeCanvas();
    load(false);
  }

  function close() {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    document.body.classList.remove('kgv-open');
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (fetchAbort) fetchAbort.abort();
    state.pointer = null;
  }
  app.close = close;

  async function fetchPages(project, signal, onProgress) {
    const all = [];
    let followingId = '';
    const seen = new Set();
    for (let i = 0; i < 100 && all.length < CONFIG.maxPages; i++) {
      const url = new URL(`/api/pages/${encodeURIComponent(project)}/search/titles`, location.origin);
      if (followingId) url.searchParams.set('followingId', followingId);
      const response = await fetch(url.href, { credentials: 'same-origin', signal, headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`APIエラー: HTTP ${response.status}（閲覧権限やログイン状態を確認してください）`);
      const batch = await response.json();
      if (!Array.isArray(batch)) throw new Error('APIの応答形式が想定と異なります。');
      all.push(...batch);
      onProgress(all.length);
      const next = response.headers.get('X-Following-Id');
      if (!next || batch.length === 0 || seen.has(next)) break;
      seen.add(next);
      followingId = next;
    }
    return all.slice(0, CONFIG.maxPages);
  }

  function prepareData(rawPages) {
    const pages = [];
    const map = new Map();
    for (const raw of rawPages) {
      if (!raw || typeof raw.title !== 'string') continue;
      const key = keyOf(raw.title);
      if (!key || map.has(key)) continue;
      const page = { title: raw.title, key, links: Array.isArray(raw.links) ? raw.links : [], degree: 0 };
      pages.push(page);
      map.set(key, page);
    }
    const adjacency = new Map(pages.map(p => [p.title, new Set()]));
    const edges = [];
    const seen = new Set();
    for (const page of pages) {
      for (const link of page.links) {
        const target = map.get(keyOf(link));
        if (!target || target.title === page.title) continue;
        const edgeKey = [page.key, target.key].sort().join('\0');
        if (seen.has(edgeKey)) continue;
        seen.add(edgeKey);
        edges.push({ source: page.title, target: target.title });
        adjacency.get(page.title).add(target.title);
        adjacency.get(target.title).add(page.title);
      }
    }
    for (const page of pages) page.degree = adjacency.get(page.title).size;
    state.pages = pages;
    state.pageMap = map;
    state.adjacency = adjacency;
    state.edgesAll = edges;
    const sorted = pages.map(p => p.degree).sort((a,b) => b-a);
    state.labelThresholdHigh = sorted[Math.floor(sorted.length * .06)] ?? Infinity;
    state.labelThresholdMid = sorted[Math.floor(sorted.length * .27)] ?? Infinity;
  }

  async function load(force) {
    if (!overlay || overlay.hidden) return;
    const project = state.project;
    const cached = cache.get(project);
    if (!force && cached && Date.now() - cached.time < CONFIG.cacheMs) {
      prepareData(cached.data);
      buildView();
      return;
    }
    if (fetchAbort) fetchAbort.abort();
    const controller = new AbortController();
    fetchAbort = controller;
    message('ページとリンク情報を読み込んでいます…');
    ui.status.textContent = 'データ取得中';
    try {
      const raw = await fetchPages(project, controller.signal, count => {
        if (controller.signal.aborted || project !== state.project) return;
        message(`${count.toLocaleString()} ページを取得中…`);
      });
      if (controller.signal.aborted || project !== state.project || overlay.hidden) return;
      cache.set(project, { data: raw, time: Date.now() });
      prepareData(raw);
      buildView();
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('[Cosense Graph View]', error);
      message(`読み込みに失敗しました: ${error.message}`, true);
      ui.status.textContent = '取得エラー';
    }
  }

  function buildView(pinTitle = null) {
    if (!state.pages.length) {
      message('表示できるページがありません。');
      return;
    }
    overlay.querySelectorAll('[data-mode]').forEach(button =>
      button.classList.toggle('is-active', button.dataset.mode === state.mode));

    let candidates;
    if (state.mode === 'local') {
      const root = state.pageMap.get(keyOf(state.localRoot));
      if (!root) {
        message('現在のページがグラフ内にありません。Globalに切り替えてください。', true);
        return;
      }
      const neighbours = [...(state.adjacency.get(root.title) || [])]
        .map(title => state.pageMap.get(keyOf(title)))
        .filter(Boolean)
        .sort((a, b) => b.degree - a.degree);
      candidates = [root, ...neighbours];
    } else {
      candidates = [...state.pages].sort((a, b) => b.degree - a.degree || a.title.localeCompare(b.title));
      const required = state.pageMap.get(keyOf(pinTitle || state.selected || state.currentPage));
      if (required && !candidates.some(p => p.key === required.key)) candidates[candidates.length - 1] = required;
    }

    // 全ノードを描く一方、ラベルだけ画面密度に応じて抑制する。
    const visible = new Set(candidates.map(p => p.title));
    const edges = state.edgesAll.filter(e => visible.has(e.source) && visible.has(e.target));
    state.graphNodes = candidates.map((p, i) => {
      const angle = i * 2.3999632297;
      const radius = 16 * Math.sqrt(i + 1);
      return {
        title: p.title, degree: p.degree,
        x: Math.cos(angle) * radius, y: Math.sin(angle) * radius,
        vx: 0, vy: 0, r: Math.min(13, 4 + Math.sqrt(p.degree) * 1.7),
      };
    });
    state.nodeMap = new Map(state.graphNodes.map(node => [node.title, node]));
    state.graphEdges = edges.map(e => ({ a: state.nodeMap.get(e.source), b: state.nodeMap.get(e.target) }));
    state.selected = state.nodeMap.has(state.selected) ? state.selected : null;
    state.hovered = null;
    state.moveCount = 0;
    simulationStep = 0;
    message('');
    updateStatus();
    updateDetails();
    fitGraph();
    startAnimation();
  }

  function updateStatus() {
    const visible = state.graphNodes.length;
    const overall = state.pages.length;
    ui.status.textContent = `${visible.toLocaleString()} / ${overall.toLocaleString()} ページ · ${state.graphEdges.length.toLocaleString()} リンク`;
    ui.count.textContent = state.query
      ? `検索一致: ${state.pages.filter(p => keyOf(p.title).includes(state.query)).length.toLocaleString()} ページ`
      : overall > visible ? `${visible.toLocaleString()}ページを表示` : '全ページを描画 · ラベルのみ適応表示';
  }

  function updateDetails() {
    if (!state.selected) {
      ui.detail.innerHTML = '<div class="kgv-aside-title">ページ情報</div><p>ノードをクリックすると、接続しているページが強調表示されます。ダブルクリックでページを開けます。</p>';
      return;
    }
    const page = state.pageMap.get(keyOf(state.selected));
    const neighbors = [...(state.adjacency.get(state.selected) || [])];
    neighbors.sort((a, b) => (state.pageMap.get(keyOf(b))?.degree || 0) - (state.pageMap.get(keyOf(a))?.degree || 0));
    // 外部コンテンツをHTMLとして評価せず、DOM textContentで挿入する。
    ui.detail.replaceChildren();
    const caption = document.createElement('div'); caption.className = 'kgv-aside-title'; caption.textContent = '選択中のページ';
    const title = document.createElement('h3'); title.textContent = page?.title || state.selected;
    const count = document.createElement('p'); count.textContent = `つながり: ${neighbors.length} ページ`;
    const actions = document.createElement('div'); actions.className = 'kgv-detail-actions';
    for (const [action, label] of [['open', 'ページを開く ↗'], ['local', '周辺を表示']]) {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.action = action; button.textContent = label;
      actions.appendChild(button);
    }
    const label = document.createElement('div'); label.className = 'kgv-aside-title kgv-neighbor-heading'; label.textContent = '接続ページ';
    const list = document.createElement('div'); list.className = 'kgv-neighbor-list';
    for (const name of neighbors.slice(0, 40)) {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = name;
      button.addEventListener('click', () => selectPage(name));
      list.appendChild(button);
    }
    if (neighbors.length > 40) {
      const note = document.createElement('small'); note.textContent = `ほか ${neighbors.length - 40} ページ`;
      list.appendChild(note);
    }
    ui.detail.append(caption, title, count, actions, label, list);
  }

  function selectPage(title, center = true) {
    const page = state.pageMap.get(keyOf(title));
    if (!page) return;
    if (!state.nodeMap.has(page.title)) {
      if (state.mode === 'local') state.localRoot = page.title;
      buildView(page.title);
    }
    state.selected = page.title;
    const node = state.nodeMap.get(page.title);
    if (node && center) {
      state.panX = -node.x * state.zoom;
      state.panY = -node.y * state.zoom;
    }
    updateDetails();
    draw();
  }

  function navigate(title) {
    close();
    location.assign(pageUrl(state.project, title));
  }

  function resizeCanvas() {
    if (!canvas || overlay.hidden) return;
    const box = canvas.getBoundingClientRect();
    state.width = Math.max(1, box.width);
    state.height = Math.max(1, box.height);
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(state.width * dpr);
    canvas.height = Math.round(state.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function fitGraph() {
    if (!state.graphNodes.length) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of state.graphNodes) {
      minX = Math.min(minX, n.x - n.r); maxX = Math.max(maxX, n.x + n.r);
      minY = Math.min(minY, n.y - n.r); maxY = Math.max(maxY, n.y + n.r);
    }
    const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
    state.zoom = Math.max(0.12, Math.min(1.5,
      Math.min(state.width * 0.82 / Math.max(100, maxX - minX), state.height * 0.80 / Math.max(100, maxY - minY))));
    state.panX = -centerX * state.zoom;
    state.panY = -centerY * state.zoom;
    draw();
  }

  function simulate() {
    const nodes = state.graphNodes;
    // Spring forces along links.
    for (const { a, b } of state.graphEdges) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      const strength = (d - 64) * 0.0038;
      const fx = dx / d * strength, fy = dy / d * strength;
      a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
    }
    // Spatial hashing: nearby repulsion without O(n²) for large graphs.
    const cellSize = 85, grid = new Map();
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const gx = Math.floor(node.x / cellSize), gy = Math.floor(node.y / cellSize);
      const key = `${gx},${gy}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(i);
    }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      const gx = Math.floor(a.x / cellSize), gy = Math.floor(a.y / cellSize);
      for (let ix = gx - 1; ix <= gx + 1; ix++) {
        for (let iy = gy - 1; iy <= gy + 1; iy++) {
          for (const j of grid.get(`${ix},${iy}`) || []) {
            if (j <= i) continue;
            const b = nodes[j], dx = b.x - a.x, dy = b.y - a.y;
            const d2 = dx * dx + dy * dy + 8;
            const d = Math.sqrt(d2), force = Math.min(3.4, 1700 / d2);
            const fx = dx / d * force, fy = dy / d * force;
            a.vx -= fx; a.vy -= fy; b.vx += fx; b.vy += fy;
          }
        }
      }
    }
    for (const node of nodes) {
      node.vx = Math.max(-7, Math.min(7, (node.vx - node.x * 0.00032) * 0.84));
      node.vy = Math.max(-7, Math.min(7, (node.vy - node.y * 0.00032) * 0.84));
      if (state.pointer?.node === node) continue;
      node.x += node.vx; node.y += node.vy;
    }
  }

  function startAnimation() {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(function tick() {
      if (!overlay || overlay.hidden) { frame = 0; return; }
      if (simulationStep < CONFIG.simulationFrames) {
        simulate();
        simulationStep++;
        draw();
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
      }
    });
  }

  function draw() {
    if (!ctx || !state.width || overlay.hidden) return;
    const w = state.width, h = state.height;
    const theme = state.theme || {ink:[48,52,59], bg:[246,247,248], hub:[66,128,195],mid:[120,150,180],leaf:[155,165,175],accent:[66,128,195],edge:[140,150,165]};
    ctx.clearRect(0, 0, w, h);
    const active = state.hovered || state.selected;
    const neighbors = active ? state.adjacency.get(active) : null;
    const search = state.query;
    const edgeOpacity = state.graphEdges.length > 2000 ? .14 : .23;
    const nodeOpacity = state.graphNodes.length > 1000 ? .81 : .92;
    const highlighted = node => !active || node.title === active || neighbors?.has(node.title);

    ctx.save();
    ctx.translate(w / 2 + state.panX, h / 2 + state.panY);
    ctx.scale(state.zoom, state.zoom);
    ctx.lineWidth = Math.max(.55, .95 / state.zoom);
    for (const edge of state.graphEdges) {
      const focus = !active || edge.a.title === active || edge.b.title === active;
      ctx.strokeStyle = alphaCss(theme.edge, focus ? (active ? .56 : edgeOpacity) : .025);
      ctx.beginPath();
      ctx.moveTo(edge.a.x, edge.a.y);
      ctx.lineTo(edge.b.x, edge.b.y);
      ctx.stroke();
    }
    for (const node of state.graphNodes) {
      const focus = highlighted(node);
      const match = !search || keyOf(node.title).includes(search);
      ctx.globalAlpha = (focus ? nodeOpacity : .11) * (match ? 1 : .24);
      const major = node.degree >= state.labelThresholdHigh && node.degree > 1;
      const medium = node.degree >= state.labelThresholdMid && node.degree > 0;
      const color = node.title === active || node.title === state.currentPage
        ? theme.accent : major ? theme.hub : medium ? theme.mid : theme.leaf;
      ctx.fillStyle = rgbCss(color);
      ctx.beginPath();
      ctx.arc(node.x, node.y, major ? node.r * 1.05 : node.r * .75, 0, 2 * Math.PI);
      ctx.fill();
      if (node.title === active) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = rgbCss(theme.accent);
        ctx.lineWidth = 2 / state.zoom;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r + 6 / state.zoom, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // ラベルはスクリーン座標で描く。ズームアウト時も固定ピクセルで読める。
    // 重要度で上位を選び、衝突検出で重複テキストを防ぐ。
    const selectedLimit = state.mode === 'local' ? 200 :
      state.zoom < .32 ? 12 : state.zoom < .60 ? 22 :
      state.zoom < 1.15 ? 38 : state.zoom < 2 ? 75 : 160;
    const labels = [];
    const priorityList = [];
    for (const node of state.graphNodes) {
      const x = w / 2 + state.panX + node.x * state.zoom;
      const y = h / 2 + state.panY + node.y * state.zoom;
      if (x < -140 || x > w + 140 || y < -35 || y > h + 35) continue;
      const isFocus = node.title === state.selected || node.title === state.hovered;
      const isSearch = !!search && keyOf(node.title).includes(search);
      const isNeighbor = !!active && neighbors?.has(node.title);
      let priority = node.degree;
      if (isNeighbor) priority += 3000;
      if (isSearch) priority += 6000;
      if (isFocus) priority += 10000;
      priorityList.push({node, x, y, priority, isFocus, isSearch, isNeighbor});
    }
    priorityList.sort((a,b) => b.priority - a.priority);
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    let regular = 0;
    for (const item of priorityList) {
      const force = item.isFocus || item.isSearch;
      if (!force && regular >= selectedLimit) continue;
      if (!force && active && !item.isNeighbor && state.mode !== 'local') continue;
      const label = shortTitle(item.node.title, 24);
      const tw = Math.min(210, ctx.measureText(label).width);
      const x = item.x, y = item.y + Math.max(4, item.node.r * state.zoom) + 7;
      const box = [x-tw/2-4, y-2, x+tw/2+4, y+15];
      const collision = labels.some(other => box[0] < other[2] && box[2] > other[0] && box[1] < other[3] && box[3] > other[1]);
      if (collision && !force) continue;
      labels.push(box);
      if (!force) regular++;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = alphaCss(theme.bg, .92);
      ctx.strokeText(label, x, y);
      ctx.fillStyle = rgbCss(item.isFocus ? theme.accent : theme.ink);
      ctx.fillText(label, x, y);
    }
  }

  function hitTest(sx, sy) {
    const x = (sx - state.width / 2 - state.panX) / state.zoom;
    const y = (sy - state.height / 2 - state.panY) / state.zoom;
    for (let i = state.graphNodes.length - 1; i >= 0; i--) {
      const node = state.graphNodes[i];
      if (Math.hypot(node.x - x, node.y - y) <= Math.max(node.r, 7 / state.zoom)) return node;
    }
    return null;
  }

  function attachCanvasEvents() {
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      const box = canvas.getBoundingClientRect();
      const node = hitTest(event.clientX - box.left, event.clientY - box.top);
      state.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, sx: event.clientX, sy: event.clientY, node };
      if (node) { node.vx = 0; node.vy = 0; }
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      const box = canvas.getBoundingClientRect();
      if (state.pointer?.id === event.pointerId) {
        const dx = event.clientX - state.pointer.x, dy = event.clientY - state.pointer.y;
        if (state.pointer.node) {
          state.pointer.node.x += dx / state.zoom;
          state.pointer.node.y += dy / state.zoom;
        } else {
          state.panX += dx; state.panY += dy;
        }
        state.pointer.x = event.clientX; state.pointer.y = event.clientY;
        state.moveCount = Math.max(state.moveCount, Math.hypot(event.clientX - state.pointer.sx, event.clientY - state.pointer.sy));
        draw();
      } else {
        const hovered = hitTest(event.clientX - box.left, event.clientY - box.top);
        canvas.style.cursor = hovered ? 'pointer' : 'grab';
        if (hovered?.title !== state.hovered) { state.hovered = hovered?.title || null; draw(); }
      }
    });
    canvas.addEventListener('pointerup', event => {
      if (state.pointer?.id !== event.pointerId) return;
      if (state.moveCount < 5 && state.pointer.node) selectPage(state.pointer.node.title, false);
      state.pointer = null;
      state.moveCount = 0;
      simulationStep = Math.min(simulationStep, CONFIG.simulationFrames - 50);
      if (!frame) startAnimation();
    });
    canvas.addEventListener('pointercancel', () => { state.pointer = null; state.moveCount = 0; });
    canvas.addEventListener('pointerleave', () => { if (!state.pointer) { state.hovered = null; draw(); } });
    canvas.addEventListener('dblclick', event => {
      const box = canvas.getBoundingClientRect();
      const node = hitTest(event.clientX - box.left, event.clientY - box.top);
      if (node) navigate(node.title);
    });
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      const box = canvas.getBoundingClientRect();
      const sx = event.clientX - box.left - state.width / 2;
      const sy = event.clientY - box.top - state.height / 2;
      const oldZoom = state.zoom;
      const next = Math.max(0.08, Math.min(4, oldZoom * Math.exp(-event.deltaY * 0.0014)));
      state.panX = sx - (sx - state.panX) * next / oldZoom;
      state.panY = sy - (sy - state.panY) * next / oldZoom;
      state.zoom = next;
      draw();
    }, { passive: false });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay && !overlay.hidden) { e.preventDefault(); close(); return; }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'g') {
      e.preventDefault();
      if (!overlay || overlay.hidden) open(); else close();
    }
  });
  // CosenseのSPAナビゲーションでヘッダーが再生成されてもボタンを戻す。
  mountButton();
  const mountObserver = new MutationObserver(() => {
    if (!document.querySelector('.kgv-launch')) mountButton();
  });
  mountObserver.observe(document.documentElement, { subtree: true, childList: true });
  console.info('[Kame Graph View] ready');
})();