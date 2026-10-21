/* Avara Labs — "Hyer" edition: mobile menu and contact-form redirect. */
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.nav');
  const btn = document.querySelector('.menu-btn');

  const setOpen = (open) => {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  if (nav && btn) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(!nav.classList.contains('open'));
    });
    document.addEventListener('click', (e) => {
      if (nav.classList.contains('open') && !nav.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }

  // formsubmit needs an absolute URL for _next, so resolve it against the live page.
  document.querySelectorAll('input[data-next]').forEach((input) => {
    input.value = new URL(input.dataset.next, window.location.href).href;
  });
});
