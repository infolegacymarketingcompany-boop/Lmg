/* Yellowjacket Earthworks concept site: behaviour (no dependencies).
   This is a portfolio demo for Legacy Marketing Group, so the estimate form
   validates like the real thing but never sends anything. */

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Hero intro ---------- */
  const root = document.documentElement;
  document.querySelectorAll(".hero__contours #topo .c").forEach((group) => {
    group.querySelectorAll("path").forEach((p, i) => {
      p.setAttribute("pathLength", "1");
      p.style.setProperty("--i", i);
    });
  });
  const start = () => requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("is-loaded")));
  // wait briefly for the display font so the headline doesn't reflow mid-animation
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 700))]).then(start);

  /* ---------- Hero light: drifts slowly across the contours ---------- */
  const glow = document.querySelector("[data-glow]");
  const heroEl = document.querySelector(".hero");
  const svg = document.querySelector(".hero__contours");
  if (glow && !reduceMotion) {
    let x = 1180, y = 330, running = true;
    const toSvg = (cx, cy) => {
      const pt = svg.createSVGPoint();
      pt.x = cx; pt.y = cy;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    };
    // the svg is cropped with "slice", so keep the drift inside the part actually on screen
    let box = { x: 0, y: 0, w: 1600, h: 900 };
    const measure = () => {
      const r = heroEl.getBoundingClientRect();
      const a = toSvg(r.left, r.top), b = toSvg(r.right, r.bottom);
      box = { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
      glow.setAttribute("r", Math.max(220, box.w * 0.3).toFixed(0));
    };
    measure();
    window.addEventListener("resize", measure);
    const tick = (t) => {
      if (!running) return;
      const k = t / 1000;
      const tx = box.x + box.w * (0.5 + Math.sin(k * 0.23) * 0.36 + Math.sin(k * 0.57) * 0.08);
      const ty = box.y + box.h * (0.45 + Math.cos(k * 0.19) * 0.3 + Math.sin(k * 0.43) * 0.07);
      x += (tx - x) * 0.04;
      y += (ty - y) * 0.04;
      glow.setAttribute("cx", x.toFixed(1));
      glow.setAttribute("cy", y.toFixed(1));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => {
        const was = running;
        running = e.isIntersecting;
        if (running && !was) requestAnimationFrame(tick);
      }).observe(heroEl);
    }
  }

  /* ---------- Header state ---------- */
  const header = document.querySelector('[data-header]');
  const mobileCall = document.querySelector('[data-mobile-call]');
  const hero = document.querySelector('.hero');
  const contact = document.getElementById('contact');
  let contactVisible = false;

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    const pastHero = y > hero.offsetHeight * 0.6;
    mobileCall.classList.toggle('is-visible', pastHero && !contactVisible);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { contactVisible = e.isIntersecting; onScroll(); }, { threshold: 0.15 }).observe(contact);
  }
  onScroll();

  /* ---------- Mobile nav ---------- */
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.getElementById('site-nav');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 961px)').addEventListener('change', (m) => { if (m.matches) setMenu(false); });

  /* ---------- Active nav link ---------- */
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + entry.target.id)));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach((a) => { const s = document.querySelector(a.getAttribute('href')); if (s) spy.observe(s); });
  }

  /* ---------- Reveal on scroll ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('is-in'));
  } else {
    // stagger siblings that enter together
    document.querySelectorAll('.svc-list, .steps, .gallery').forEach((group) => {
      group.querySelectorAll(':scope > .reveal').forEach((el, i) => el.style.setProperty('--d', `${i * 0.08}s`));
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- Before & after sliders ---------- */
  document.querySelectorAll(".ba__frame").forEach((frame) => {
    const range = frame.querySelector(".ba__range");
    const set = (v) => frame.style.setProperty("--pos", v + "%");
    range.addEventListener("input", () => set(range.value));

    // one gentle sweep the first time a slider scrolls into view, to show it moves
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      let touched = false;
      range.addEventListener("pointerdown", () => { touched = true; }, { once: true });
      const keys = [[0, 50], [600, 28], [1300, 72], [2000, 50]];
      const t0 = performance.now() + 400;
      const step = (now) => {
        if (touched) return;
        const t = now - t0;
        if (t < 0) return requestAnimationFrame(step);
        let i = keys.findIndex(([k]) => k > t);
        if (i === -1) { set(50); range.value = 50; return; }
        const [ta, va] = keys[i - 1], [tb, vb] = keys[i];
        const p = (t - ta) / (tb - ta), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        set((va + (vb - va) * e).toFixed(2));
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.6 });
    io.observe(frame);
  });

  /* ---------- Gallery lightbox ---------- */
  const lb = document.querySelector("[data-lightbox]");
  const shots = [...document.querySelectorAll(".gallery__btn")];
  if (lb && typeof lb.showModal === "function") {
    const img = lb.querySelector("[data-lb-img]");
    const cap = lb.querySelector("[data-lb-cap]");
    let current = 0;
    const show = (i) => {
      current = (i + shots.length) % shots.length;
      const b = shots[current];
      img.src = b.dataset.full;
      img.alt = b.querySelector("img").alt;
      cap.textContent = b.dataset.caption;
    };
    shots.forEach((b, i) => b.addEventListener("click", () => { show(i); lb.showModal(); }));
    lb.querySelector("[data-lb-close]").addEventListener("click", () => lb.close());
    lb.querySelector("[data-lb-prev]").addEventListener("click", () => show(current - 1));
    lb.querySelector("[data-lb-next]").addEventListener("click", () => show(current + 1));
    lb.addEventListener("click", (e) => { if (e.target === lb) lb.close(); });
    lb.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") show(current - 1);
      if (e.key === "ArrowRight") show(current + 1);
    });
  }

  /* ---------- Footer year ---------- */
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Estimate form ---------- */
  const form = document.getElementById('estimate-form');
  const status = form.querySelector('[data-status]');

  const setError = (input, errId, msg) => {
    const err = document.getElementById(errId);
    err.textContent = msg;
    if (input) {
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (msg) input.setAttribute('aria-describedby', errId); else input.removeAttribute('aria-describedby');
    }
    return !msg;
  };

  const validate = () => {
    const name = form.elements.name;
    const phone = form.elements.phone;
    const email = form.elements.email;
    const location = form.elements.location;
    const services = form.querySelectorAll('input[name="service"]:checked');
    const digits = phone.value.replace(/\D/g, '');

    const results = [
      setError(name, 'f-name-err', name.value.trim() ? '' : 'Please enter your name.'),
      setError(phone, 'f-phone-err', digits.length >= 10 ? '' : 'Please enter a phone number, including area code.'),
      setError(email, 'f-email-err', !email.value.trim() || email.validity.valid ? '' : 'That email address doesn’t look right.'),
      setError(null, 'f-service-err', services.length ? '' : 'Pick at least one. “Not sure yet” is fine.'),
      setError(location, 'f-location-err', location.value.trim() ? '' : 'Let us know roughly where the property is.'),
    ];
    return results.every(Boolean);
  };

  // clear an error as soon as the field is fixed
  form.addEventListener('input', (e) => {
    if (e.target.getAttribute('aria-invalid') === 'true' || e.target.name === 'service') validate();
  });

  const showStatus = (kind, html) => {
    status.innerHTML = `<div class="notice notice--${kind}">${html}</div>`;
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    status.innerHTML = '';
    if (!validate()) {
      const firstBad = form.querySelector('[aria-invalid="true"]') || form.querySelector('input[name="service"]');
      firstBad.focus();
      return;
    }
    if (form.elements._gotcha.value) return; // bot

    // demo only: show what a real submission would look like, send nothing
    form.reset();
    showStatus('ok', `<strong>Demo form: nothing was sent.</strong>On a live site this request would go straight to the business owner. This concept was built by <a href="../../">Legacy Marketing Group</a>.`);
  });
})();
