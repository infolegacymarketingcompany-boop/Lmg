/* ==========================================================================
   Legacy Marketing Group — shared settings & features (every page)
   ========================================================================== */

/* ---------- Configuration ---------- */
const CONFIG = {
  // Formspree: create a form at https://formspree.io, then paste its ID here
  // (the part after /f/ in the endpoint, e.g. "xayzabcd").
  FORMSPREE_ID: 'xkjojrqq',

  // Scheduling: paste your Calendly link (e.g. "https://calendly.com/your-name/consultation").
  // Leave empty and "Book a Consultation" opens the Start a Project page instead.
  CALENDLY_URL: 'https://calendly.com/curtismichaelgreer/30min',

  // Live chat: your Crisp website ID (crisp.chat → Settings → Website Settings → Setup).
  // Leave empty to turn the chat widget off.
  CRISP_WEBSITE_ID: 'ac32aba3-e038-4b85-93bf-061c117d62fe',
};

const root = document.documentElement;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Refresh always starts at the top ---------- */
// Browsers normally reopen a refreshed page where you left off (or at a #section in the URL).
// On a refresh we drop the #section and jump to the top instead. Shared links like
// legacymarketinggroup.net/#pricing still open at that section on a first visit.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const navEntry = performance.getEntriesByType('navigation')[0];
if (navEntry && navEntry.type === 'reload') {
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  window.scrollTo({ top: 0, behavior: 'instant' });
  window.addEventListener('load', () => window.scrollTo({ top: 0, behavior: 'instant' }));
} else if (location.hash) {
  // First visit to a link like /#pricing: land on that section once the page has laid out
  const jumpToHash = () => {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
  };
  jumpToHash();
  window.addEventListener('load', jumpToHash);
}

/* ---------- Live chat (Crisp) — loaded after the page so it never slows first view ---------- */
if (CONFIG.CRISP_WEBSITE_ID) {
  window.$crisp = [];
  window.CRISP_WEBSITE_ID = CONFIG.CRISP_WEBSITE_ID;
  window.$crisp.push(['config', 'color:theme', ['red']]);
  window.$crisp.push(['on', 'chat:opened', () => window.gtag?.('event', 'chat_opened')]);
  window.$crisp.push(['on', 'message:sent', () => window.gtag?.('event', 'chat_message_sent')]);

  const loadCrisp = () => {
    const s = document.createElement('script');
    s.src = 'https://client.crisp.chat/l.js';
    s.async = true;
    document.head.appendChild(s);
    root.classList.add('has-chat');
  };
  if (document.readyState === 'complete') loadCrisp();
  else window.addEventListener('load', loadCrisp, { once: true });
}

/* ---------- Footer year ---------- */
document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

/* ---------- Book a consultation (Calendly popup) ---------- */
function loadCalendly() {
  return new Promise((resolve, reject) => {
    if (window.Calendly) return resolve();
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://assets.calendly.com/assets/external/widget.css';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = 'https://assets.calendly.com/assets/external/widget.js';
    js.onload = resolve;
    js.onerror = reject;
    document.head.appendChild(js);
  });
}

document.querySelectorAll('[data-book]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    window.gtag?.('event', 'book_consultation_click');
    if (!CONFIG.CALENDLY_URL) {
      window.location.href = 'start.html';
      return;
    }
    try {
      await loadCalendly();
      window.Calendly.initPopupWidget({ url: CONFIG.CALENDLY_URL });
    } catch {
      window.open(CONFIG.CALENDLY_URL, '_blank', 'noopener');
    }
  });
});

/* ---------- Floating connected-dots background (founder block, quieter sections, terms page) ---------- */
// Any element with data-net gets a network behind it. data-net="faint" is the lighter section version,
// data-net="soft" sits between faint and the full founder version;
// data-net="page" pins one full-window layer behind a long page.
function initNet(wrap) {
  const faint = wrap.dataset.net === 'faint';
  const soft = wrap.dataset.net === 'soft';
  const page = wrap.dataset.net === 'page';
  let canvas = wrap.querySelector(':scope > canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = page ? 'page-net' : 'section-net';
    canvas.setAttribute('aria-hidden', 'true');
    wrap.prepend(canvas);
  }
  const ctx = canvas.getContext('2d');
  const LINK = 110; // px: dots closer than this get a line
  const PUSH = 110; // px: cursor influence radius
  const dotAlpha = faint ? [0.28, 0.14] : soft ? [0.42, 0.2] : [0.4, 0.22];
  const lineAlpha = faint ? 0.1 : soft ? 0.16 : 0.18;
  const density = faint ? 22000 : soft ? 17000 : 16000;
  let dots = [];
  let w = 0;
  let h = 0;
  let running = false;
  const mouse = { x: -9999, y: -9999 };

  // Performance: these canvases cover whole sections, so they draw at 1x pixel density (the soft dots and hairlines
  // look the same) and redraw at most 30 times a second, with motion scaled by elapsed time so the speed is the same
  // on 60 Hz and high-refresh monitors.
  const FRAME = 1000 / 30;
  let lastDraw = 0;
  let speed = 2; // elapsed time in 60 fps frames since the last draw

  function resize() {
    const dpr = 1;
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(faint ? 45 : soft ? 50 : 55, Math.round((w * h) / density));
    dots = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 0.8 + 0.6,
      red: Math.random() < 0.6,
    }));
    if (!running) draw();
  }

  function step() {
    for (const d of dots) {
      const dx = d.x - mouse.x;
      const dy = d.y - mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < PUSH && dist > 0) {
        const f = (1 - dist / PUSH) * 0.6;
        d.x += (dx / dist) * f;
        d.y += (dy / dist) * f;
      }
      d.x += d.vx * speed;
      d.y += d.vy * speed;
      if (d.x < 0 || d.x > w) d.vx *= -1;
      if (d.y < 0 || d.y > h) d.vy *= -1;
      d.x = Math.max(0, Math.min(w, d.x));
      d.y = Math.max(0, Math.min(h, d.y));
    }
  }

  // Lines are grouped into a few opacity levels and each level is stroked once; dots are filled in two batches (red / white)
  const LEVELS = 4;
  const levelStyle = Array.from({ length: LEVELS }, (_, k) => `rgba(230, 40, 40, ${(((k + 0.5) / LEVELS) * lineAlpha).toFixed(3)})`);
  const redFill = `rgba(255, 74, 61, ${dotAlpha[0]})`;
  const whiteFill = `rgba(244, 243, 240, ${dotAlpha[1]})`;
  function draw() {
    ctx.clearRect(0, 0, w, h);
    const buckets = Array.from({ length: LEVELS }, () => []);
    for (let a = 0; a < dots.length; a++) {
      for (let b = a + 1; b < dots.length; b++) {
        const dx = dots[a].x - dots[b].x;
        const dy = dots[a].y - dots[b].y;
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK * LINK) buckets[Math.min(LEVELS - 1, Math.floor((1 - Math.sqrt(d2) / LINK) * LEVELS))].push(a, b);
      }
    }
    ctx.lineWidth = 1;
    buckets.forEach((pairs, k) => {
      if (!pairs.length) return;
      ctx.strokeStyle = levelStyle[k];
      ctx.beginPath();
      for (let i = 0; i < pairs.length; i += 2) {
        ctx.moveTo(dots[pairs[i]].x, dots[pairs[i]].y);
        ctx.lineTo(dots[pairs[i + 1]].x, dots[pairs[i + 1]].y);
      }
      ctx.stroke();
    });
    for (const red of [true, false]) {
      ctx.fillStyle = red ? redFill : whiteFill;
      ctx.beginPath();
      for (const d of dots) {
        if (d.red !== red) continue;
        ctx.moveTo(d.x + d.r, d.y);
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  }

  function loop(now = performance.now()) {
    if (!running) return;
    if (now - lastDraw >= FRAME - 1) {
      speed = lastDraw ? Math.min((now - lastDraw) / (1000 / 60), 4) : 2;
      lastDraw = now;
      step();
      draw();
    }
    requestAnimationFrame(loop);
  }

  new ResizeObserver(resize).observe(canvas);

  if (!prefersReducedMotion) {
    // Only animate while the section is on screen
    new IntersectionObserver(([entry]) => {
      const wasRunning = running;
      running = entry.isIntersecting;
      if (running && !wasRunning) { lastDraw = 0; requestAnimationFrame(loop); }
    }).observe(wrap);

    wrap.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    wrap.addEventListener('pointerleave', () => { mouse.x = -9999; mouse.y = -9999; });
  }
}
document.querySelectorAll('[data-net]').forEach(initNet);

/* ---------- Services background: a faint dot grid with a few dots that slowly brighten and fade ---------- */
function initPing(wrap) {
  const canvas = document.createElement('canvas');
  canvas.className = 'section-net';
  canvas.setAttribute('aria-hidden', 'true');
  wrap.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const GRID = 46;
  const FRAME = 1000 / 30;
  let w = 0;
  let h = 0;
  let pins = [];
  let running = false;
  let lastDraw = 0;

  function resize() {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w;
    canvas.height = h;
    const cols = Math.max(1, Math.floor(w / GRID));
    const rows = Math.max(1, Math.floor(h / GRID));
    const count = Math.max(5, Math.min(14, Math.round((w * h) / 90000)));
    // A few grid dots that slowly brighten and fade; the rest of the grid stays still
    pins = Array.from({ length: count }, () => ({
      x: (Math.floor(Math.random() * cols) + 0.5) * GRID,
      y: (Math.floor(Math.random() * rows) + 0.5) * GRID,
      phase: Math.random() * Math.PI * 2,
      speed: 0.00045 + Math.random() * 0.0004,
    }));
    if (!running) draw(performance.now());
  }

  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(244, 243, 240, 0.07)';
    ctx.beginPath();
    for (let x = GRID / 2; x < w; x += GRID) {
      for (let y = GRID / 2; y < h; y += GRID) { ctx.moveTo(x + 1, y); ctx.arc(x, y, 1, 0, Math.PI * 2); }
    }
    ctx.fill();

    for (const p of pins) {
      const glow = 0.5 - 0.5 * Math.cos(now * p.speed + p.phase);
      ctx.fillStyle = `rgba(255, 74, 61, ${(0.06 + 0.4 * glow).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop(now = performance.now()) {
    if (!running) return;
    if (now - lastDraw >= FRAME - 1) { lastDraw = now; draw(now); }
    requestAnimationFrame(loop);
  }

  new ResizeObserver(resize).observe(canvas);

  if (!prefersReducedMotion) {
    new IntersectionObserver(([entry]) => {
      const wasRunning = running;
      running = entry.isIntersecting;
      if (running && !wasRunning) requestAnimationFrame(loop);
    }).observe(wrap);
  }
}
document.querySelectorAll('[data-ping]').forEach(initPing);
