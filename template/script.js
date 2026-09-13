// Mobile nav
document.documentElement.classList.add('js');
const toggle = document.getElementById('navToggle');
const links = document.getElementById('navLinks');
if (toggle && links) {
toggle.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
});
links.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => links.classList.remove('open')));
}

// Scroll reveal (with fallback if IntersectionObserver missing)
try {
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('visible')),
  { threshold: 0.12 }
);
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
} catch (err) {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
}

// Hero stats are static numbers in HTML — just ensure final values show, no zero-flash
document.querySelectorAll('[data-count]').forEach((el) => {
  el.textContent = (el.dataset.count || el.textContent.trim()) + (el.dataset.suffix || '');
});

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Click to open popups for toolkit + teardown cards
function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.add('open');
  m.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  lastTrigger = document.activeElement;
  const closeBtn = m.querySelector('[data-close]');
  if (closeBtn) closeBtn.focus();
}
let lastTrigger = null;
function closeModal(m) {
  m.classList.remove('open');
  m.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  lastTrigger = null;
}
document.querySelectorAll('[data-modal]').forEach((el) => {
  if (el.classList.contains('modal')) return;
  el.setAttribute('tabindex', '0');
  el.setAttribute('role', 'button');
  const open = (e) => { e.preventDefault(); openModal(el.getAttribute('data-modal')); };
  el.addEventListener('click', open);
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') open(e); });
});
document.querySelectorAll('.modal').forEach((m) => {
  m.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeModal(m)));
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.querySelectorAll('.modal.open').forEach(closeModal);
});
