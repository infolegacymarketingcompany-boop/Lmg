/* ==========================================================================
   Legacy Marketing Group — Start a Project page (3-step inquiry form)
   Shared settings (CONFIG, prefersReducedMotion) come from common.js.
   ========================================================================== */

const form = document.querySelector('[data-inquiry-form]');
const panels = [...form.querySelectorAll('[data-step]')];
const stepNum = document.querySelector('[data-step-num]');
const stepName = document.querySelector('[data-step-name]');
const stepBar = document.querySelector('[data-step-bar]');
const stepsHead = document.querySelector('[data-steps-head]');
const successEl = document.querySelector('[data-form-success]');
const errorEl = document.querySelector('[data-form-error]');
const submitBtn = form.querySelector('[data-submit]');
const submitLabel = form.querySelector('[data-submit-label]');
const STEP_NAMES = ['Service', 'Project', 'Contact'];
let step = 1;

/* ---------- Pre-select a package from ?service=… (pricing buttons) ---------- */
const preset = new URLSearchParams(location.search).get('service');
if (preset) {
  const radio = [...form.elements.service].find((r) => r.value === preset);
  if (radio) radio.checked = true;
}

/* ---------- Validation ---------- */
const MESSAGES = {
  service: 'Please choose what you need help with.',
  name: 'Please enter your name.',
  email: 'Please enter a valid email address.',
  phone: 'Please enter a phone number we can reach you on.',
  has_website: 'Please let us know if you have a website.',
  website: 'Please enter your website address, like yourbusiness.com',
  details: 'Please tell us a little about your project.',
};

function showFieldError(id, message, input) {
  const out = document.getElementById(`e-${id}`);
  if (out) out.textContent = message;
  input?.closest('.field')?.classList.toggle('has-error', Boolean(message));
  input?.setAttribute('aria-invalid', message ? 'true' : 'false');
}

const websiteField = document.querySelector('[data-website-field]');
const websiteInput = document.getElementById('f-website');
const looksLikeDomain = (v) => /^[^\s.]+(\.[^\s.]+)+(\/\S*)?$/.test(v.trim().replace(/^https?:\/\//i, ''));

function validateInput(input) {
  let message = '';
  if (input.name === 'website') {
    if (!websiteField.hidden && !looksLikeDomain(input.value)) message = MESSAGES.website;
  } else if (input.name === 'phone' && input.value.replace(/\D/g, '').length < 7) {
    message = MESSAGES.phone;
  } else if (!input.checkValidity()) {
    message = MESSAGES[input.name] || 'Please check this field.';
  }
  showFieldError(input.name, message, input);
  return !message;
}

function validateStep(n) {
  const panel = panels[n - 1];
  let firstInvalid = null;

  if (n === 1) {
    const chosen = form.elements.service.value;
    showFieldError('service', chosen ? '' : MESSAGES.service);
    if (!chosen) firstInvalid = panel.querySelector('input[name="service"]');
  }

  panel.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], select, textarea').forEach((input) => {
    if (input.name === '_gotcha') return;
    if (!validateInput(input) && !firstInvalid) firstInvalid = input;
  });

  if (firstInvalid) firstInvalid.focus();
  return !firstInvalid;
}

form.addEventListener('change', (e) => {
  if (e.target.name === 'service') showFieldError('service', '');
  if (e.target.name === 'has_website') {
    validateInput(e.target);
    websiteField.hidden = e.target.value !== 'Yes';
    if (websiteField.hidden) {
      websiteInput.value = '';
      showFieldError('website', '', websiteInput);
    } else {
      websiteInput.focus();
    }
  }
});
form.querySelectorAll('input, textarea').forEach((input) => {
  input.addEventListener('blur', () => { if (input.value && input.type !== 'radio') validateInput(input); });
  input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') validateInput(input); });
});

/* ---------- Step navigation ---------- */
function goTo(n) {
  step = n;
  panels.forEach((p) => { p.hidden = Number(p.dataset.step) !== n; });
  stepNum.textContent = n;
  stepName.textContent = STEP_NAMES[n - 1];
  stepBar.style.width = `${(n / 3) * 100}%`;
  const panel = panels[n - 1];
  if (!prefersReducedMotion) {
    panel.classList.remove('is-entering');
    void panel.offsetWidth;
    panel.classList.add('is-entering');
  }
  panel.querySelector('.step-panel__title')?.focus({ preventScroll: true });
  const top = form.closest('.start__card').getBoundingClientRect().top;
  if (top < 0) form.closest('.start__card').scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
}

form.addEventListener('click', (e) => {
  if (e.target.closest('[data-next-step]')) {
    if (validateStep(step)) {
      if (step === 1) window.gtag?.('event', 'start_project_step', { step: 1, service: form.elements.service.value });
      goTo(step + 1);
    }
  } else if (e.target.closest('[data-prev-step]')) {
    goTo(step - 1);
  }
});

// Enter in a text field moves forward instead of submitting early
form.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT' && step < 3) {
    e.preventDefault();
    form.querySelector(`[data-step="${step}"] [data-next-step]`)?.click();
  }
});

/* ---------- Submit ---------- */
function showSuccess() {
  form.hidden = true;
  stepsHead.hidden = true;
  successEl.hidden = false;
  successEl.focus();
}

function showError(message) {
  errorEl.innerHTML = message;
  errorEl.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  if (!validateStep(3)) return;

  const data = new FormData(form);
  if (data.get('_gotcha')) return; // bot

  // Store the website as a full link (people often type it without https://)
  const site = (data.get('website') || '').trim();
  if (data.get('has_website') !== 'Yes' || !site) data.delete('website');
  else if (!/^https?:\/\//i.test(site)) data.set('website', `https://${site}`);

  // Not connected yet: preview locally, but never silently drop a real lead.
  if (!CONFIG.FORMSPREE_ID) {
    const isLocal = ['localhost', '127.0.0.1', ''].includes(location.hostname) || location.protocol === 'file:';
    if (isLocal) {
      console.warn('[Legacy] FORMSPREE_ID is not set — showing the confirmation as a preview only. Nothing was sent.');
      showSuccess();
    } else {
      showError('Our online form is being set up. Please call or text <a class="text-link" href="tel:+14232319869">423-231-9869</a> and we\'ll get right back to you.');
    }
    return;
  }

  submitBtn.disabled = true;
  submitLabel.textContent = 'Sending…';
  data.append('_subject', `New inquiry: ${data.get('service') || 'Website'} — ${data.get('name')}`);

  try {
    const res = await fetch(`https://formspree.io/f/${CONFIG.FORMSPREE_ID}`, {
      method: 'POST',
      body: data,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    window.gtag?.('event', 'generate_lead', { service: data.get('service') || 'unspecified' });
    form.reset();
    showSuccess();
  } catch (err) {
    console.error('[Legacy] Form submission failed:', err);
    showError('Something went wrong sending your inquiry. Please try again, or call or text <a class="text-link" href="tel:+14232319869">423-231-9869</a>.');
  } finally {
    submitBtn.disabled = false;
    submitLabel.textContent = 'Submit Inquiry';
  }
});
