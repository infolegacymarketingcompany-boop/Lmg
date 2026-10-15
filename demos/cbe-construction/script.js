/* CBE Construction LLC mockup: header state, menu, reveals, form demo. No scroll listeners. */
(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  requestAnimationFrame(() => root.classList.add('is-loaded'));

  // Header turns solid once the page moves off the top (watched with an observer, not a scroll listener)
  const header = document.querySelector('[data-header]');
  const marker = document.createElement('div');
  marker.setAttribute('aria-hidden', 'true');
  marker.style.cssText = 'position:absolute;top:8px;left:0;width:1px;height:1px;pointer-events:none';
  document.body.prepend(marker);
  new IntersectionObserver(([e]) => header.classList.toggle('is-scrolled', !e.isIntersecting)).observe(marker);

  // Mobile menu
  const toggle = document.querySelector('[data-nav-toggle]');
  const links = document.getElementById('site-nav');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    links.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  links.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  // Reveal sections as they arrive; the process line draws once its list is in view
  const targets = [...document.querySelectorAll('.rv'), ...document.querySelectorAll('[data-steps]')];
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    targets.forEach((el) => io.observe(el));
  }

  // Quote form: validates, then shows the mockup confirmation (nothing is sent)
  const form = document.getElementById('quote-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    form.querySelectorAll('.field').forEach((f) => {
      const input = f.querySelector('input, textarea');
      if (!input) return;
      let bad = input.required && !input.value.trim();
      if (!bad && input.type === 'email' && input.value) bad = !/^\S+@\S+\.\S+$/.test(input.value);
      f.classList.toggle('has-error', bad);
      if (bad) ok = false;
    });
    if (!ok) { form.querySelector('.has-error input, .has-error textarea')?.focus(); return; }
    form.classList.add('is-sent');
  });
})();
