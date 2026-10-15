/* Services showcase: Local SEO ranking heatmap + website before/after mockup.
   Plain JS (the site has no framework); each demo keeps its own small state object. */
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const seoRoot = document.querySelector('[data-seo]');
  if (seoRoot) initSeo(seoRoot);
  const webRoot = document.querySelector('[data-web]');
  if (webRoot) initWeb(webRoot);

  /* ================= Local SEO heatmap ================= */
  function initSeo(root) {
    const COLS = 7;
    const ROWS = 6;
    const CENTER_C = (COLS - 1) / 2;
    const CENTER_R = (ROWS - 1) / 2;
    const MILES_PER_CELL = 0.6;
    const RANK_CAP = 20;
    const ZOOM_MAX = 2.5;
    const ZOOM_STEP = 0.5;
    // [base rank at the business, how fast rank worsens with distance]
    const KEYWORDS = [
      { label: 'remodeling near me', seed: 3, before: [5, 12], after: [1, 3.2] },
      { label: 'roofing contractor', seed: 11, before: [7, 13], after: [1, 4] },
      { label: 'HVAC repair', seed: 23, before: [4, 11], after: [1, 2.6] },
    ];

    const state = { kw: 0, after: false, zoom: 1, tx: 0, ty: 0, pinned: null, avg: null };

    const stage = root.querySelector('[data-seo-stage]');
    const map = root.querySelector('[data-seo-map]');
    const grid = root.querySelector('[data-seo-grid]');
    const tip = root.querySelector('[data-seo-tip]');
    const avgEl = root.querySelector('[data-seo-avg]');
    const meterEl = root.querySelector('[data-seo-meter]');
    const coverEl = root.querySelector('[data-seo-cover]');
    const kwButtons = [...root.querySelectorAll('[data-seo-kw]')];
    const viewButtons = [...root.querySelectorAll('[data-seo-view]')];
    const zoomIn = root.querySelector('[data-seo-zoom="in"]');
    const zoomOut = root.querySelector('[data-seo-zoom="out"]');
    const zoomReset = root.querySelector('[data-seo-zoom="reset"]');

    const noise = (seed, r, c) => {
      const x = Math.sin(seed * 97.13 + r * 12.9898 + c * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };
    const tier = (rank) => (rank <= 3 ? 'good' : rank <= 10 ? 'mid' : 'bad');
    const rankLabel = (rank) => (rank >= RANK_CAP ? '20+' : String(rank));

    const compass = (dx, dy) => {
      const dirs = ['east', 'northeast', 'north', 'northwest', 'west', 'southwest', 'south', 'southeast'];
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      return dirs[Math.round(((angle + 360) % 360) / 45) % 8];
    };

    const points = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'seo-pt';
        el.style.setProperty('--x', `${((c + 0.5) / COLS) * 100}%`);
        el.style.setProperty('--y', `${((r + 0.5) / ROWS) * 100}%`);
        const dx = (c - CENTER_C) * MILES_PER_CELL;
        const dy = (CENTER_R - r) * MILES_PER_CELL;
        const miles = Math.hypot(dx, dy);
        const place = miles < 0.45 ? 'right by your business' : `${miles.toFixed(1)} mi ${compass(dx, dy)} of your business`;
        const point = { el, r, c, rank: 0, place, ripple: Math.hypot(c - CENTER_C, r - CENTER_R), timer: 0 };
        el.dataset.index = String(points.length);
        points.push(point);
        grid.append(el);
      }
    }

    const rankAt = (p) => {
      const k = KEYWORDS[state.kw];
      const [base, slope] = state.after ? k.after : k.before;
      const d = Math.hypot((p.c - CENTER_C) / CENTER_C, (p.r - CENTER_R) / CENTER_R);
      const n = noise(k.seed + (state.after ? 50 : 0), p.r, p.c);
      const jitter = (n - 0.35) * (state.after ? 3 : 8);
      return Math.max(1, Math.min(RANK_CAP, Math.round(base + d * slope + jitter)));
    };

    const applyRank = (p, rank) => {
      p.rank = rank;
      p.el.textContent = rankLabel(rank);
      p.el.dataset.tier = tier(rank);
      p.el.setAttribute('aria-label', `Rank ${rankLabel(rank)}, ${p.place}`);
    };

    const tweenAverage = (to) => {
      const from = state.avg ?? to;
      state.avg = to;
      avgEl.dataset.tier = tier(Math.round(to));
      if (reduceMotion || from === to) {
        avgEl.textContent = `#${to.toFixed(1)}`;
        return;
      }
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / 900);
        const eased = 1 - Math.pow(1 - t, 3);
        avgEl.textContent = `#${(from + (to - from) * eased).toFixed(1)}`;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const render = (animate) => {
      const ranks = points.map(rankAt);
      points.forEach((p, i) => {
        clearTimeout(p.timer);
        if (!animate || reduceMotion) {
          applyRank(p, ranks[i]);
          return;
        }
        // ripple outward from the business location
        p.timer = setTimeout(() => {
          applyRank(p, ranks[i]);
          p.el.classList.remove('is-flip');
          void p.el.offsetWidth;
          p.el.classList.add('is-flip');
          if (state.pinned === p) showTip(p);
        }, p.ripple * 75);
      });

      const avg = ranks.reduce((sum, r) => sum + r, 0) / ranks.length;
      const top3 = ranks.filter((r) => r <= 3).length;
      tweenAverage(avg);
      meterEl.style.width = `${(top3 / ranks.length) * 100}%`;
      coverEl.textContent = `Top 3 in ${top3} of ${ranks.length} map areas for “${KEYWORDS[state.kw].label}”`;
      if (state.pinned && (!animate || reduceMotion)) showTip(state.pinned);
    };

    /* ---- tooltip ---- */
    const showTip = (p) => {
      tip.innerHTML = '';
      const rank = document.createElement('b');
      rank.textContent = `#${rankLabel(p.rank)} on Google Maps`;
      const kw = document.createElement('em');
      kw.textContent = `for “${KEYWORDS[state.kw].label}”`;
      tip.append(rank, kw, document.createElement('br'), document.createTextNode(p.place));
      tip.hidden = false;

      const s = stage.getBoundingClientRect();
      const m = p.el.getBoundingClientRect();
      const half = Math.min(110, tip.offsetWidth / 2);
      const x = Math.max(half + 6, Math.min(s.width - half - 6, m.left - s.left + m.width / 2));
      const top = m.top - s.top;
      const below = top < tip.offsetHeight + 24;
      tip.classList.toggle('is-below', below);
      tip.style.left = `${x}px`;
      tip.style.top = `${below ? top + m.height : top}px`;
      points.forEach((q) => q.el.classList.toggle('is-active', q === p));
    };
    const hideTip = () => {
      tip.hidden = true;
      points.forEach((q) => q.el.classList.remove('is-active'));
    };
    const pointFrom = (target) => {
      const el = target.closest('.seo-pt');
      return el ? points[Number(el.dataset.index)] : null;
    };

    grid.addEventListener('pointerover', (e) => {
      if (e.pointerType !== 'mouse' || drag.active) return;
      const p = pointFrom(e.target);
      if (p) showTip(p);
    });
    grid.addEventListener('pointerout', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (pointFrom(e.target) && !e.relatedTarget?.closest?.('.seo-pt')) {
        state.pinned ? showTip(state.pinned) : hideTip();
      }
    });
    grid.addEventListener('focusin', (e) => {
      const p = pointFrom(e.target);
      if (p) showTip(p);
    });
    grid.addEventListener('focusout', () => {
      if (!state.pinned) hideTip();
    });
    map.addEventListener('click', (e) => {
      if (drag.suppressClick) return;
      const p = pointFrom(e.target);
      if (p && state.pinned !== p) {
        state.pinned = p;
        showTip(p);
      } else {
        state.pinned = null;
        hideTip();
      }
    });

    /* ---- zoom + pan ---- */
    const clampPan = () => {
      const maxX = ((state.zoom - 1) * map.clientWidth) / 2;
      const maxY = ((state.zoom - 1) * map.clientHeight) / 2;
      state.tx = Math.max(-maxX, Math.min(maxX, state.tx));
      state.ty = Math.max(-maxY, Math.min(maxY, state.ty));
    };
    const applyView = () => {
      clampPan();
      map.style.setProperty('--z', String(state.zoom));
      map.style.setProperty('--tx', `${state.tx}px`);
      map.style.setProperty('--ty', `${state.ty}px`);
      map.classList.toggle('is-zoomed', state.zoom > 1);
      zoomIn.disabled = state.zoom >= ZOOM_MAX;
      zoomOut.disabled = state.zoom <= 1;
      zoomReset.disabled = state.zoom === 1;
    };
    const setZoom = (z) => {
      const next = Math.max(1, Math.min(ZOOM_MAX, z));
      if (next !== state.zoom) {
        state.tx *= next / state.zoom;
        state.ty *= next / state.zoom;
      }
      state.zoom = next;
      if (next === 1) state.tx = state.ty = 0;
      state.pinned = null;
      hideTip();
      applyView();
    };
    zoomIn.addEventListener('click', () => setZoom(state.zoom + ZOOM_STEP));
    zoomOut.addEventListener('click', () => setZoom(state.zoom - ZOOM_STEP));
    zoomReset.addEventListener('click', () => setZoom(1));

    const drag = { active: false, moved: false, suppressClick: false, x: 0, y: 0, tx: 0, ty: 0, id: null };
    map.addEventListener('pointerdown', (e) => {
      if (state.zoom <= 1 || e.button !== 0) return;
      Object.assign(drag, { active: true, moved: false, x: e.clientX, y: e.clientY, tx: state.tx, ty: state.ty, id: e.pointerId });
    });
    map.addEventListener('pointermove', (e) => {
      if (!drag.active || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      if (!drag.moved) {
        drag.moved = true;
        map.setPointerCapture(e.pointerId);
        map.classList.add('is-dragging');
        state.pinned = null;
        hideTip();
      }
      state.tx = drag.tx + dx;
      state.ty = drag.ty + dy;
      applyView();
    });
    const endDrag = (e) => {
      if (!drag.active || e.pointerId !== drag.id) return;
      if (drag.moved) {
        drag.suppressClick = true;
        setTimeout(() => (drag.suppressClick = false), 0);
        if (map.hasPointerCapture(e.pointerId)) map.releasePointerCapture(e.pointerId);
      }
      drag.active = false;
      map.classList.remove('is-dragging');
    };
    map.addEventListener('pointerup', endDrag);
    map.addEventListener('pointercancel', endDrag);
    addEventListener('resize', () => {
      applyView();
      if (state.pinned) showTip(state.pinned);
    });

    /* ---- controls ---- */
    kwButtons.forEach((btn) =>
      btn.addEventListener('click', () => {
        const kw = Number(btn.dataset.seoKw);
        if (kw === state.kw) return;
        state.kw = kw;
        kwButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        render(true);
      }),
    );
    viewButtons.forEach((btn) =>
      btn.addEventListener('click', () => {
        const after = btn.dataset.seoView === 'after';
        if (after === state.after) return;
        state.after = after;
        viewButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        render(true);
      }),
    );

    applyView();
    render(false);
  }

  /* ================= Website before/after mockup ================= */
  function initWeb(root) {
    const state = { mobile: false, after: false, tab: 'home', menuOpen: false };

    const screen = root.querySelector('[data-web-screen]');
    const oldSite = root.querySelector('[data-web-old]');
    const newSite = root.querySelector('[data-web-new]');
    const wipe = root.querySelector('[data-web-wipe]');
    const head = root.querySelector('[data-ns-head]');
    const menuBtn = root.querySelector('[data-ns-menu]');
    const tabs = [...root.querySelectorAll('[data-ns-tab]')];
    const panels = [...root.querySelectorAll('[data-ns-panel]')];
    const metrics = [...root.querySelectorAll('[data-web-metric]')];
    const deviceButtons = [...root.querySelectorAll('[data-web-device]')];
    const viewButtons = [...root.querySelectorAll('[data-web-view]')];
    const form = root.querySelector('[data-ns-form]');
    const note = root.querySelector('[data-ns-note]');

    const press = (buttons, active) => buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === active)));

    // The dated site is a fixed 760px wide; on narrow screens it just shrinks to fit.
    const fitOldSite = () => screen.style.setProperty('--old-scale', String(screen.clientWidth / 760));
    new ResizeObserver(fitOldSite).observe(screen);

    const setMenu = (open) => {
      state.menuOpen = open;
      head.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    };

    const setTab = (tab) => {
      state.tab = tab;
      tabs.forEach((t) => (t.dataset.nsTab === tab ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current')));
      panels.forEach((p) => (p.hidden = p.dataset.nsPanel !== tab));
      newSite.scrollTop = 0;
      setMenu(false);
    };

    const setAfter = (after) => {
      if (after === state.after) return;
      state.after = after;
      root.classList.toggle('is-after', after);
      newSite.inert = !after;
      oldSite.inert = after;
      metrics.forEach((m) => (m.textContent = after ? m.dataset.after : m.dataset.before));
      wipe.classList.remove('wipe-in', 'wipe-out');
      void wipe.offsetWidth;
      if (!reduceMotion) wipe.classList.add(after ? 'wipe-in' : 'wipe-out');
      if (!after) {
        setMenu(false);
        setTab('home');
      }
    };

    deviceButtons.forEach((btn) =>
      btn.addEventListener('click', () => {
        state.mobile = btn.dataset.webDevice === 'mobile';
        root.classList.toggle('is-mobile', state.mobile);
        press(deviceButtons, btn);
        setMenu(false);
      }),
    );
    viewButtons.forEach((btn) =>
      btn.addEventListener('click', () => {
        setAfter(btn.dataset.webView === 'after');
        press(viewButtons, btn);
      }),
    );

    tabs.forEach((t) => t.addEventListener('click', () => setTab(t.dataset.nsTab)));
    root.querySelectorAll('[data-ns-go]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.nsGo)));
    menuBtn.addEventListener('click', () => setMenu(!state.menuOpen));
    wipe.addEventListener('animationend', () => wipe.classList.remove('wipe-in', 'wipe-out'));
    oldSite.addEventListener('click', (e) => {
      if (e.target.closest('a')) e.preventDefault();
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      note.hidden = false;
    });
  }
})();
