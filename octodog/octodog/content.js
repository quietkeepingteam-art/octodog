// OctoDog: a small circular hub with 4 extendable click arrows (keys 1-4).
// Each arrow's crosshair can sprout 2 baby arrows (keys Q W / E R / A S / D F).
(() => {
  if (window.__octoDogLoaded) return;
  window.__octoDogLoaded = true;

  const NS = 'http://www.w3.org/2000/svg';
  const C = 32, R_OUT = 30, R_IN = 13;      // hub geometry (64px total)
  const DEFAULT_LEN = 110, BABY_LEN = 70, MARGIN = 12, DRAG_PX = 4;

  // Arrow 1 = up, 2 = right, 3 = down, 4 = left. Each has 2 baby arrows with their own keys.
  const ARROWS = [
    { deg: -90, color: '#ff5a5f', babies: [{ deg: -135, key: 'Q' }, { deg: -45, key: 'W' }] },
    { deg: 0,   color: '#00c2a8', babies: [{ deg: -45,  key: 'E' }, { deg: 45,  key: 'R' }] },
    { deg: 90,  color: '#ffb400', babies: [{ deg: 135,  key: 'A' }, { deg: 45,  key: 'S' }] },
    { deg: 180, color: '#8b7bff', babies: [{ deg: -135, key: 'D' }, { deg: 135, key: 'F' }] },
  ];
  const BABY_KEYS = {};                      // 'KeyQ' -> [arrowIndex, babyIndex]
  ARROWS.forEach((a, i) => a.babies.forEach((b, j) => { BABY_KEYS['Key' + b.key] = [i, j]; }));

  const tips = [null, null, null, null];     // main click targets (viewport-fixed)
  const babyOff = [null, null, null, null];  // per arrow: 2 offsets from the main target
  const babiesOpen = [false, false, false, false];
  let hubX = Math.max(4, window.innerWidth - 64 - 24);
  let hubY = Math.max(4, window.innerHeight - 64 - 24);
  let visible = false;

  // ---------- DOM (inside a shadow root so page CSS can't touch it) ----------
  const host = document.createElement('div');
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;display:none;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      svg { display:block; }
      #layer { position:fixed; inset:0; width:100%; height:100%; pointer-events:none; overflow:visible; }
      #hub { position:fixed; width:64px; height:64px; pointer-events:none; user-select:none;
             -webkit-user-select:none; touch-action:none; filter:drop-shadow(0 2px 6px rgba(0,0,0,.35)); }
      .wedge { fill:rgba(24,26,33,.92); stroke:var(--c); stroke-width:1.5; stroke-opacity:0;
               pointer-events:auto; cursor:pointer; transition:fill .12s; touch-action:none; }
      .wedge:hover { fill:rgba(52,56,70,.96); }
      .wedge.on { stroke-opacity:1; }
      .num { font:700 11px system-ui,-apple-system,"Segoe UI",sans-serif; fill:#c9ccd6;
             text-anchor:middle; dominant-baseline:central; pointer-events:none; }
      .num.on { fill:var(--c); }
      #center { fill:#fff; pointer-events:auto; cursor:grab; touch-action:none; }
      #center:active { cursor:grabbing; }
      .halo { fill:none; stroke:rgba(0,0,0,.45); stroke-width:4; }
      .ring { fill:none; stroke-width:2; r:10px; transition:r .18s; }
      .ring.baby { r:8px; }
      .pulse .ring { r:18px; }
      .pulse .ring.baby { r:15px; }
      .hint { fill:none; stroke-width:1.5; stroke-dasharray:2 3; opacity:.85; }
      .hit { fill:none; pointer-events:all; cursor:pointer; touch-action:none; }
      :host(.probe) .wedge, :host(.probe) #center, :host(.probe) .hit { pointer-events:none; }
      .tnum { font:700 9px system-ui,-apple-system,"Segoe UI",sans-serif; fill:#111;
              text-anchor:middle; dominant-baseline:central; }
      @media (prefers-reduced-motion: reduce) { .ring { transition:none; } }
    </style>
    <svg id="layer" xmlns="${NS}"></svg>
    <div id="hub"><svg id="hubsvg" width="64" height="64" viewBox="0 0 64 64" xmlns="${NS}"></svg></div>`;
  document.documentElement.appendChild(host);

  const layer = root.getElementById('layer');
  const hubEl = root.getElementById('hub');
  const hubSvg = root.getElementById('hubsvg');

  const mk = (name, attrs, parent) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const polar = (r, deg) => [C + r * Math.cos(deg * Math.PI / 180), C + r * Math.sin(deg * Math.PI / 180)];
  const wedgePath = (mid) => {
    const a1 = mid - 45 + 2, a2 = mid + 45 - 2;
    const [x1, y1] = polar(R_OUT, a1), [x2, y2] = polar(R_OUT, a2);
    const [x3, y3] = polar(R_IN, a2),  [x4, y4] = polar(R_IN, a1);
    return `M${x1} ${y1} A${R_OUT} ${R_OUT} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${R_IN} ${R_IN} 0 0 0 ${x4} ${y4}Z`;
  };

  // One on-page target: line + head + crosshair with alias badge (+ hit area)
  function makeTarget(color, ringR, label, isBaby) {
    const line = mk('line', { stroke: color, 'stroke-width': isBaby ? 1.5 : 2, 'stroke-linecap': 'round' }, layer);
    const head = mk('polygon', { fill: color }, layer);
    const g = mk('g', {}, layer);
    mk('circle', { r: ringR, class: 'halo' }, g);
    mk('circle', { class: isBaby ? 'ring baby' : 'ring', stroke: color }, g);
    mk('circle', { r: isBaby ? 2 : 2.5, fill: color }, g);
    mk('circle', { cx: 11, cy: -11, r: 7.5, fill: color }, g);
    mk('text', { x: 11, y: -11, class: 'tnum' }, g).textContent = label;
    const hint = isBaby ? null : mk('circle', { r: 16, class: 'hint', stroke: color }, g);
    const hit = mk('circle', { r: isBaby ? 14 : 15, class: 'hit' }, g);
    return { line, head, g, hint, hit };
  }

  const parts = ARROWS.map((a, i) => {
    const main = makeTarget(a.color, 10, String(i + 1), false);
    const babies = a.babies.map((b) => makeTarget(a.color, 8, b.key, true));
    const wedge = mk('path', { d: wedgePath(a.deg), class: 'wedge' }, hubSvg);
    wedge.style.setProperty('--c', a.color);
    const [nx, ny] = polar(21, a.deg);
    const num = mk('text', { x: nx, y: ny, class: 'num' }, hubSvg);
    num.style.setProperty('--c', a.color);
    num.textContent = String(i + 1);
    return { main, babies, wedge, num };
  });
  const center = mk('circle', { id: 'center', cx: C, cy: C, r: 11 }, hubSvg);

  // Octopus icon in the middle (drawn around 0,0, then moved to the hub center)
  const octo = mk('g', { transform: `translate(${C} ${C}) scale(.95)`, 'pointer-events': 'none' }, hubSvg);
  mk('path', { d: 'M-6 1 C-6 -6 -3.5 -8 0 -8 C3.5 -8 6 -6 6 1 Z', fill: '#181a21' }, octo);
  [
    'M-4.6 0 C-6.6 3.5 -7 5.5 -5 7.5',
    'M-1.7 0 C-2.6 4 -1.4 6 -3 8',
    'M1.7 0 C2.6 4 1.4 6 3 8',
    'M4.6 0 C6.6 3.5 7 5.5 5 7.5',
  ].forEach((d) => mk('path', { d, fill: 'none', stroke: '#181a21', 'stroke-width': 2, 'stroke-linecap': 'round' }, octo));
  mk('circle', { cx: -2.2, cy: -3, r: 1.3, fill: '#fff' }, octo);
  mk('circle', { cx: 2.2, cy: -3, r: 1.3, fill: '#fff' }, octo);
  mk('circle', { cx: -2.2, cy: -2.8, r: .55, fill: '#181a21' }, octo);
  mk('circle', { cx: 2.2, cy: -2.8, r: .55, fill: '#181a21' }, octo);

  // ---------- helpers ----------
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));
  const clampX = (x, m) => clamp(x, m, window.innerWidth - m);
  const clampY = (y, m) => clamp(y, m, window.innerHeight - m);

  // Baby positions are offsets from the main target, so they follow it when it moves.
  function babyPos(i, j) {
    const t = tips[i], o = babyOff[i];
    if (!t || !o || !babiesOpen[i]) return null;
    return { x: clampX(t.x + o[j].dx, MARGIN), y: clampY(t.y + o[j].dy, MARGIN) };
  }
  const targetPos = (i, j) => (j < 0 ? tips[i] : babyPos(i, j));
  const targetPart = (i, j) => (j < 0 ? parts[i].main : parts[i].babies[j]);

  function drawTarget(p, pos, fx, fy, startGap, stopGap, headLen, headHalf) {
    const hideArrow = () => { p.line.style.display = 'none'; p.head.style.display = 'none'; };
    if (!pos) { p.g.style.display = 'none'; hideArrow(); return; }
    p.g.style.display = '';
    p.g.setAttribute('transform', `translate(${pos.x} ${pos.y})`);
    const dx = pos.x - fx, dy = pos.y - fy, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    if (len < startGap + stopGap + headLen + 6) return hideArrow();
    const ex = pos.x - ux * stopGap, ey = pos.y - uy * stopGap;      // arrow tip stops at the ring
    const bx = ex - ux * headLen, by = ey - uy * headLen, nx = -uy, ny = ux;
    p.line.style.display = ''; p.head.style.display = '';
    p.line.setAttribute('x1', fx + ux * startGap); p.line.setAttribute('y1', fy + uy * startGap);
    p.line.setAttribute('x2', bx); p.line.setAttribute('y2', by);
    p.head.setAttribute('points',
      `${ex},${ey} ${bx + nx * headHalf},${by + ny * headHalf} ${bx - nx * headHalf},${by - ny * headHalf}`);
  }

  function render() {
    hubX = clamp(hubX, 4, window.innerWidth - 68);
    hubY = clamp(hubY, 4, window.innerHeight - 68);
    hubEl.style.left = hubX + 'px';
    hubEl.style.top = hubY + 'px';
    const cx = hubX + C, cy = hubY + C;
    parts.forEach((p, i) => {
      const t = tips[i];
      p.wedge.classList.toggle('on', !!t);
      p.num.classList.toggle('on', !!t);
      drawTarget(p.main, t, cx, cy, R_OUT, 12, 9, 5);
      p.main.hint.style.display = t && !babiesOpen[i] ? '' : 'none';   // dashed ring = "tap for babies"
      p.babies.forEach((b, j) => {
        const pos = babyPos(i, j);
        if (pos) drawTarget(b, pos, t.x, t.y, 12, 10, 7, 4);
        else drawTarget(b, null);
      });
    });
  }

  function setTip(i, x, y) { tips[i] = { x: clampX(x, MARGIN), y: clampY(y, MARGIN) }; render(); }
  function extendDefault(i) {
    const a = ARROWS[i].deg * Math.PI / 180;
    setTip(i, hubX + C + Math.cos(a) * DEFAULT_LEN, hubY + C + Math.sin(a) * DEFAULT_LEN);
  }
  function retract(i) { tips[i] = null; babyOff[i] = null; babiesOpen[i] = false; render(); }
  function toggleBabies(i) {
    if (!tips[i]) return;
    if (!babyOff[i]) {
      babyOff[i] = ARROWS[i].babies.map((b) => ({
        dx: Math.cos(b.deg * Math.PI / 180) * BABY_LEN,
        dy: Math.sin(b.deg * Math.PI / 180) * BABY_LEN,
      }));
    }
    babiesOpen[i] = !babiesOpen[i];
    render();
  }
  function aimBaby(i, j, x, y) {
    const t = tips[i]; if (!t || !babyOff[i]) return;
    babyOff[i][j] = { dx: clampX(x, MARGIN) - t.x, dy: clampY(y, MARGIN) - t.y };
    render();
  }
  function pulse(g) {
    g.classList.add('pulse');
    setTimeout(() => g.classList.remove('pulse'), 180);
  }

  // ---------- firing a click at a target ----------
  function deepElementFromPoint(x, y) {
    let el = document.elementFromPoint(x, y);
    while (el && el !== host && el.shadowRoot) {
      const inner = el.shadowRoot.elementFromPoint(x, y);
      if (!inner || inner === el) break;
      el = inner;
    }
    return el;
  }
  function fire(i, j = -1) {
    const t = targetPos(i, j); if (!t) return;
    pulse(targetPart(i, j).g);
    host.classList.add('probe');                       // make our own controls click-through while probing
    let el;
    try { el = deepElementFromPoint(t.x, t.y); } finally { host.classList.remove('probe'); }
    if (!el || el === host) return;
    const base = { bubbles: true, cancelable: true, composed: true, view: window,
      clientX: t.x, clientY: t.y, screenX: t.x + window.screenX, screenY: t.y + window.screenY, button: 0 };
    const ptr = (type, buttons) => el.dispatchEvent(new PointerEvent(type,
      { ...base, buttons, pointerId: 1, pointerType: 'mouse', isPrimary: true }));
    const mouse = (type, buttons) => el.dispatchEvent(new MouseEvent(type, { ...base, buttons }));
    ptr('pointerdown', 1); mouse('mousedown', 1);
    try { el.focus({ preventScroll: true }); } catch (_) {}
    ptr('pointerup', 0); mouse('mouseup', 0);
    mouse('click', 0);
  }
  function fireAll() {
    let n = 0;
    ARROWS.forEach((a, i) => {
      if (!tips[i]) return;
      setTimeout(() => fire(i, -1), n++ * 80);
      a.babies.forEach((b, j) => { if (babyPos(i, j)) setTimeout(() => fire(i, j), n++ * 80); });
    });
  }

  // ---------- pointer helper: tap / drag / right-click on any control ----------
  function interact(node, h) {
    let st = null;
    node.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      node.setPointerCapture(e.pointerId);
      st = { sx: e.clientX, sy: e.clientY, dragged: false };
      if (h.onStart) h.onStart(e);
      e.preventDefault(); e.stopPropagation();
    });
    node.addEventListener('pointermove', (e) => {
      if (!st) return;
      if (!st.dragged && Math.hypot(e.clientX - st.sx, e.clientY - st.sy) > DRAG_PX) st.dragged = true;
      if (st.dragged && h.onDrag) h.onDrag(e.clientX, e.clientY, st);
    });
    node.addEventListener('pointerup', (e) => {
      if (!st) return;
      const s = st; st = null;
      try { node.releasePointerCapture(e.pointerId); } catch (_) {}
      if (s.dragged) { if (h.onDragEnd) h.onDragEnd(); }
      else if (h.onTap) h.onTap(e);
    });
    node.addEventListener('pointercancel', () => { st = null; });
    node.addEventListener('contextmenu', (e) => { e.preventDefault(); if (h.onContext) h.onContext(); });
  }

  parts.forEach((p, i) => {
    // wedge: tap = extend / fire, drag = aim, Shift+tap or right-click = retract
    interact(p.wedge, {
      onDrag: (x, y) => setTip(i, x, y),
      onTap: (e) => { if (e.shiftKey) retract(i); else if (tips[i]) fire(i); else extendDefault(i); },
      onContext: () => retract(i),
    });
    // main crosshair: tap = show / hide baby arrows, drag = re-aim, right-click = retract
    interact(p.main.hit, {
      onDrag: (x, y) => setTip(i, x, y),
      onTap: () => toggleBabies(i),
      onContext: () => retract(i),
    });
    // baby crosshairs: tap = fire, drag = aim, right-click = hide the babies
    p.babies.forEach((b, j) => interact(b.hit, {
      onDrag: (x, y) => aimBaby(i, j, x, y),
      onTap: () => fire(i, j),
      onContext: () => { babiesOpen[i] = false; render(); },
    }));
  });

  // center octopus: tap = fire everything, drag = move hub, right-click = retract all
  (() => {
    let o = null;
    interact(center, {
      onStart: () => { o = { x: hubX, y: hubY }; },
      onDrag: (x, y, s) => { hubX = o.x + (x - s.sx); hubY = o.y + (y - s.sy); render(); },
      onDragEnd: () => { try { chrome.storage.local.set({ octoDogPos: { x: hubX, y: hubY } }); } catch (_) {} },
      onTap: fireAll,
      onContext: () => { for (let i = 0; i < 4; i++) { tips[i] = null; babyOff[i] = null; babiesOpen[i] = false; } render(); },
    });
  })();

  // ---------- keyboard: 1-4 main, Q W / E R / A S / D F babies, Alt/Option+Shift+M toggles ----------
  function aliasTarget(e) {
    if (!visible || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return null;   // keeps Cmd/Ctrl+1 tab switching intact
    let hit = null;
    const d = /^(?:Digit|Numpad)([1-4])$/.exec(e.code);
    if (d) hit = [+d[1] - 1, -1];
    else if (BABY_KEYS[e.code]) hit = BABY_KEYS[e.code];
    if (!hit || !targetPos(hit[0], hit[1])) return null;
    const t = e.composedPath()[0];
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return null;
    return hit;
  }
  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && e.code === 'KeyM') { e.preventDefault(); toggle(); return; }
    const h = aliasTarget(e);
    if (!h) return;
    e.preventDefault(); e.stopPropagation();
    if (!e.repeat) fire(h[0], h[1]);
  }, true);
  window.addEventListener('keyup', (e) => {
    if (aliasTarget(e)) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  // ---------- show / hide ----------
  function toggle() {
    visible = !visible;
    host.style.display = visible ? '' : 'none';
    if (visible) render();
  }
  try {
    chrome.runtime.onMessage.addListener((m) => { if (m && m.type === 'toggle') toggle(); });
    chrome.storage.local.get('octoDogPos').then((r) => {
      if (r && r.octoDogPos) { hubX = r.octoDogPos.x; hubY = r.octoDogPos.y; render(); }
    });
  } catch (_) {}

  window.addEventListener('resize', () => {
    tips.forEach((t, i) => { if (t) tips[i] = { x: clampX(t.x, MARGIN), y: clampY(t.y, MARGIN) }; });
    render();
  });
  render();
})();
