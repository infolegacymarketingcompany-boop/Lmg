/* ==========================================================================
   Legacy Marketing Group — homepage script (no dependencies)
   ========================================================================== */

// Shared settings (CONFIG, prefersReducedMotion, chat, booking) live in common.js, loaded first.

/* ---------- Hero entrance ---------- */
requestAnimationFrame(() => root.classList.add('is-loaded'));

/* ---------- Hero red lines: gentle flowing waves ---------- */
const waves = document.querySelector('[data-waves]');
if (waves && !prefersReducedMotion) {
  const paths = [...waves.querySelectorAll('path')];
  const W = 1440;
  const STEP = 30; // horizontal spacing of the points that make up each line
  let t = 0;
  let running = false;

  // The resting curve: low on the left, dipping in the middle, sweeping up on the right
  const base = (x) => {
    const u = x / W;
    return 720 + 110 * Math.sin(u * Math.PI * 1.15) - 400 * u * u;
  };

  function linePath(i) {
    const offset = i * 22;
    const pts = [];
    for (let x = -40; x <= W + 40; x += STEP) {
      const y = base(x) + offset
        + 18 * Math.sin(x * 0.0045 + t * 0.9 + i * 0.55)
        + 10 * Math.sin(x * 0.011 - t * 0.6 + i * 1.3);
      pts.push([x, y]);
    }
    // Smooth curve through the points (quadratic segments between midpoints)
    let d = `M${pts[0][0]} ${pts[0][1].toFixed(1)}`;
    for (let k = 1; k < pts.length - 1; k++) {
      const mx = (pts[k][0] + pts[k + 1][0]) / 2;
      const my = (pts[k][1] + pts[k + 1][1]) / 2;
      d += ` Q${pts[k][0]} ${pts[k][1].toFixed(1)} ${mx} ${my.toFixed(1)}`;
    }
    return d;
  }

  function frame() {
    if (!running) return;
    t += 0.012;
    paths.forEach((p, i) => p.setAttribute('d', linePath(i)));
    requestAnimationFrame(frame);
  }

  paths.forEach((p, i) => p.setAttribute('d', linePath(i)));
  new IntersectionObserver(([entry]) => {
    const was = running;
    running = entry.isIntersecting;
    if (running && !was) requestAnimationFrame(frame);
  }).observe(waves.closest('.hero'));
}


/* ---------- Hero: Smoky Mountain ridges ---------- */
// Four ridgelines built from layered sine waves. Each repeats every 1600 units and is drawn twice side by side,
// so sliding it left by 1600 (in styles.css) loops seamlessly.
const ridgeGroup = document.querySelector('[data-ridges]');
if (ridgeGroup) {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1600;
  const layers = [
    { seed: 1.3, base: 330, amp: 120, rough: 1.0, fill: '#1C0809' },
    { seed: 2.1, base: 410, amp: 110, rough: 1.2, fill: '#250A0C' },
    { seed: 0.4, base: 480, amp: 100, rough: 1.4, fill: '#30090C' },
    { seed: 2.8, base: 555, amp: 90, rough: 1.6, fill: '#12090A' },
  ];
  const tau = Math.PI * 2;
  layers.forEach((L, i) => {
    let d = '';
    for (const dx of [0, W]) {
      for (let x = 0; x <= W; x += 20) {
        const u = x / W;
        const y = L.base
          - (Math.sin(u * tau + L.seed) * 0.5 + 0.5) * L.amp
          - Math.sin(u * tau * 3 + L.seed * 2) * L.amp * 0.25 * L.rough
          - Math.sin(u * tau * 7 + L.seed * 3) * L.amp * 0.08 * L.rough;
        d += `${x === 0 ? 'M' : 'L'}${x + dx} ${y.toFixed(1)} `;
      }
      d += `L${W + dx} 600 L${dx} 600 Z `;
    }
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', L.fill);
    path.setAttribute('class', `ridge ridge--${i + 1}`);
    // wrapper that handles the page-load rise, so it doesn't fight the endless sideways drift on the path
    const lift = document.createElementNS(NS, 'g');
    lift.setAttribute('class', `ridge-lift ridge-lift--${i + 1}`);
    lift.appendChild(path);
    ridgeGroup.appendChild(lift);
    if (i === 1) {
      const mist = document.createElementNS(NS, 'rect');
      Object.entries({ x: -100, y: 360, width: 1800, height: 140, fill: 'url(#ridgeMist)', class: 'ridge-mist' })
        .forEach(([k, v]) => mist.setAttribute(k, v));
      ridgeGroup.appendChild(mist);
    }
  });
}

/* Pause the ridge drift (and other hero loops) while the hero is scrolled out of view */
const heroEl = document.querySelector('.hero');
if (heroEl) new IntersectionObserver(([e]) => heroEl.classList.toggle('is-offscreen', !e.isIntersecting)).observe(heroEl);

/* ---------- Header state on scroll ---------- */
// Watched with an IntersectionObserver on a 1px marker 8px down the page instead of a scroll listener:
// reading scrollY on every scroll event forced a style recalculation mid-scroll and made scrolling stutter.
const header = document.querySelector('[data-header]');
const topMarker = document.createElement('div');
topMarker.setAttribute('aria-hidden', 'true');
topMarker.style.cssText = 'position:absolute;top:8px;left:0;width:1px;height:1px;pointer-events:none';
document.body.prepend(topMarker);
new IntersectionObserver(([e]) => header.classList.toggle('is-scrolled', !e.isIntersecting)).observe(topMarker);

/* ---------- Mobile menu ---------- */
const menuToggle = document.querySelector('[data-menu-toggle]');
const menu = document.querySelector('[data-menu]');

// Freeze the page behind the menu (works on iOS too) and restore the exact spot on close
let lockedY = 0;
function lockPage(lock) {
  const b = document.body.style;
  if (lock) {
    lockedY = window.scrollY;
    Object.assign(b, { position: 'fixed', top: `-${lockedY}px`, left: '0', right: '0', width: '100%' });
  } else {
    Object.assign(b, { position: '', top: '', left: '', right: '', width: '' });
    window.scrollTo({ top: lockedY, behavior: 'instant' });
  }
}

function setMenu(open) {
  if (open === !menu.hidden) return;
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menu.hidden = !open;
  document.body.classList.toggle('menu-open', open);
  lockPage(open);
  if (open) menu.querySelector('a')?.focus({ preventScroll: true });
}

menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !menu.hidden) {
    setMenu(false);
    menuToggle.focus();
  }
});
window.matchMedia('(min-width: 1181px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

/* ---------- Scroll reveal ---------- */
// Sibling reveals cascade (--i), list items inside them cascade (--s).
document.querySelectorAll('[data-reveal]').forEach((el) => {
  const siblings = [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal'));
  if (siblings.length > 1) el.style.setProperty('--i', Math.min(siblings.indexOf(el), 5));
});
document.querySelectorAll('.stagger').forEach((list) => {
  [...list.children].forEach((item, i) => item.style.setProperty('--s', Math.min(i, 14)));
});

const revealEls = document.querySelectorAll('[data-reveal], [data-observe]');
const onReveal = (el) => {
  el.classList.add('is-visible');
  el.querySelectorAll('[data-count]').forEach(countUp);
};

// Numbers tick up to their value the first time they appear (e.g. the $99 care price)
function countUp(el) {
  if (el.dataset.counted || prefersReducedMotion) return;
  el.dataset.counted = 'true';
  const target = Number(el.dataset.count);
  const t0 = performance.now();
  const tick = (now) => {
    const p = Math.min((now - t0) / 1100, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
if (prefersReducedMotion || !('IntersectionObserver' in window)) {
  revealEls.forEach((el) => el.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      onReveal(entry.target);
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  revealEls.forEach((el) => revealObserver.observe(el));
}

/* ---------- Scroll progress bar ---------- */
// Browsers with scroll-driven animations run the bar entirely in CSS, off the main thread (styles.css).
// Older ones fall back to this, with the page height cached so nothing reads layout while scrolling.
const progressBar = document.querySelector('[data-progress]');
if (progressBar && !CSS.supports('animation-timeline: scroll()')) {
  let ticking = false;
  let max = 1;
  const measure = () => { max = Math.max(1, document.documentElement.scrollHeight - innerHeight); };
  const setProgress = () => {
    progressBar.style.transform = `scaleX(${Math.min(1, scrollY / max).toFixed(4)})`;
    ticking = false;
  };
  measure();
  new ResizeObserver(measure).observe(document.body);
  window.addEventListener('resize', measure);
  setProgress();
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(setProgress); }
  }, { passive: true });
}

/* ---------- Pointer effects (mouse / trackpad only) ---------- */
/* ---------- Intro video: swap the thumbnail for the YouTube player when played ---------- */
// Nothing from YouTube loads until then (faster page, no third-party cookies). Without JS the button is a plain link.
document.querySelectorAll('[data-yt]').forEach((box) => {
  const play = box.querySelector('[data-yt-play]');
  if (!play) return;
  play.addEventListener('click', (e) => {
    e.preventDefault();
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${box.dataset.yt}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    frame.title = box.dataset.ytTitle || 'Video';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    box.replaceChildren(frame);
    frame.focus();
  });
});

const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
if (finePointer && !prefersReducedMotion) {
  // Cursor-follow spotlight on cards
  document.querySelectorAll('.spot').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  // Magnetic primary buttons
  document.querySelectorAll('.btn--primary.btn--lg, .nav .btn--primary').forEach((btn) => {
    btn.classList.add('is-magnetic');
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty('--bx', `${((e.clientX - r.left) / r.width - 0.5) * 10}px`);
      btn.style.setProperty('--by', `${((e.clientY - r.top) / r.height - 0.5) * 8}px`);
    });
    btn.addEventListener('pointerleave', () => {
      btn.style.setProperty('--bx', '0px');
      btn.style.setProperty('--by', '0px');
    });
  });
}

/* ---------- Mobile sticky CTA: show after the hero, hide over the contact section ---------- */
const stickyCta = document.querySelector('[data-sticky-cta]');
const hero = document.querySelector('.hero');
const inquireSection = document.getElementById('inquire');
if (stickyCta && 'IntersectionObserver' in window) {
  let pastHero = false;
  let atForm = false;
  const update = () => stickyCta.classList.toggle('is-visible', pastHero && !atForm);
  new IntersectionObserver(([entry]) => { pastHero = !entry.isIntersecting; update(); }).observe(hero);
  new IntersectionObserver(([entry]) => { atForm = entry.isIntersecting; update(); }, { threshold: 0.05 }).observe(inquireSection);
}

/* ---------- Concept projects: spotlight ---------- */
// The concept card(s) crossing the middle of the screen light up in their brand colour; the rest dim.
// On phones the grid is a swipe row, so the card centred in the row lights up instead. Hover / focus also spotlights.
const spotGrid = document.querySelector('.concept-grid');
if (spotGrid && 'IntersectionObserver' in window) {
  const cards = [...spotGrid.querySelectorAll('.cc')];
  const inBand = new Set();
  let held = null;      // card under the pointer or keyboard focus
  let lastLit = [];     // keep the last lit card(s) when the band falls between rows
  let observer = null;

  const paint = () => {
    let lit = held ? [held] : [...inBand];
    if (!lit.length) lit = lastLit; else if (!held) lastLit = lit;
    cards.forEach((c) => c.classList.toggle('lit', lit.includes(c)));
  };

  const watch = () => {
    observer?.disconnect();
    inBand.clear();
    const swipeRow = window.matchMedia('(max-width: 760px)').matches;
    observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? inBand.add(e.target) : inBand.delete(e.target)));
      paint();
    }, swipeRow ? { root: spotGrid, rootMargin: '0px -38% 0px -38%' } : { rootMargin: '-40% 0px -40% 0px' });
    cards.forEach((c) => observer.observe(c));
  };

  // Hover only on real pointers: a tap on a phone fires mouseenter and would pin the spotlight to that card
  const canHover = window.matchMedia('(hover: hover)');
  cards.forEach((c) => {
    c.addEventListener('mouseenter', () => { if (!canHover.matches) return; held = c; paint(); });
    c.addEventListener('mouseleave', () => { held = null; paint(); });
    c.addEventListener('focusin', () => { held = c; paint(); });
    c.addEventListener('focusout', () => { held = null; paint(); });
  });

  lastLit = [cards[0]];
  spotGrid.classList.add('has-spot');
  watch();
  window.matchMedia('(max-width: 760px)').addEventListener('change', watch);
}

/* ---------- Phone card rows (concept projects, pricing): back / forward buttons instead of swiping ---------- */
// One card at a time; the counter and button states follow the row. `centre` centres the card (pricing) instead of
// lining it up on the left edge, and `start` is the card the row opens on.
function stepper(row, nav, { centre = false, start = 0 } = {}) {
  if (!row || !nav) return;
  const cards = [...row.children];
  const [prev, next] = nav.querySelectorAll('.cc-nav__btn');
  const count = nav.querySelector('.cc-nav__count b');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let index = start;

  const offsetOf = (card) => card.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft
    - (centre ? (row.clientWidth - card.offsetWidth) / 2 : parseFloat(getComputedStyle(row).paddingLeft));
  const show = (i) => {
    index = Math.max(0, Math.min(cards.length - 1, i));
    count.textContent = index + 1;
    prev.disabled = index === 0;
    next.disabled = index === cards.length - 1;
  };
  const go = (i, smooth = true) => {
    show(i);
    row.scrollTo({ left: offsetOf(cards[index]), behavior: smooth && !reduce.matches ? 'smooth' : 'auto' });
  };
  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));
  // Keep the counter right if the row moves another way (keyboard focus scrolling a card into view)
  let t = 0;
  row.addEventListener('scroll', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      let best = 0;
      cards.forEach((c, i) => { if (Math.abs(offsetOf(c) - row.scrollLeft) < Math.abs(offsetOf(cards[best]) - row.scrollLeft)) best = i; });
      show(best);
    }, 120);
  }, { passive: true });
  const reset = () => go(start, false);
  reset();
  window.addEventListener('load', reset);
}

stepper(spotGrid, document.querySelector('.concepts .cc-nav'));
// Pricing runs cheapest to most expensive and opens centred on the recommended plan
const plansRow = document.querySelector('.plans');
stepper(plansRow, document.querySelector('.plans-nav'), {
  centre: true,
  start: Math.max(0, [...(plansRow?.children ?? [])].findIndex((p) => p.classList.contains('plan--featured'))),
});

