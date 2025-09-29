// header.js
(() => {
  'use strict';

  // ---------- Helpers ----------
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => [...r.querySelectorAll(s)];

  const header = qs('#site-header');
  const burger = qs('#header-burger');
  const mobileMenu = qs('#mobile-menu');
  const srLive = qs('#sr-toast');

  const modals = {
    register: qs('#register-window'),
    login: qs('#login-window'),
  };

  // ---------- Toast (SweetAlert2 + aria-live fallback) ----------
  function showToast(message, type = 'success') {
    if (window.Swal) {
      Swal.fire({
        toast: true,
        icon: type,
        title: message,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2600,
        timerProgressBar: true,
        didOpen: el => {
          el.setAttribute('role', 'status');
          el.setAttribute('aria-live', 'polite');
        },
      });
    }
    if (srLive) {
      srLive.textContent = '';
      setTimeout(() => {
        srLive.textContent = message;
      }, 50);
    }
  }

  // ---------- Focus utils ----------
  const getFocusables = root =>
    qsa(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      root
    ).filter(
      el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden')
    );

  let activeModal = null;

  // ---------- Animations ----------
  function animateOpen(modal) {
    modal.hidden = false;
    modal.classList.remove('is-closing');
    modal.classList.add('is-opening');
    return new Promise(resolve => {
      const onEnd = e => {
        if (e && e.target !== modal) return;
        modal.classList.remove('is-opening');
        modal.removeEventListener('animationend', onEnd);
        resolve();
      };
      modal.addEventListener('animationend', onEnd);
    });
  }

  function animateClose(modal) {
    modal.classList.remove('is-opening');
    modal.classList.add('is-closing');
    return new Promise(resolve => {
      const onEnd = e => {
        if (e && e.target !== modal) return;
        modal.classList.remove('is-closing');
        modal.hidden = true;
        modal.removeEventListener('animationend', onEnd);
        resolve();
      };
      modal.addEventListener('animationend', onEnd);
    });
  }

  // ---------- Open / Close ----------
  async function openModal(key) {
    const modal = modals[key];
    if (!modal || activeModal) return;

    activeModal = modal;
    await animateOpen(modal);

    document.documentElement.style.overflow = 'hidden';
    header?.setAttribute('aria-hidden', 'true');

    // focus trap
    const focusables = getFocusables(modal);
    const first = focusables[0];
    const last = focusables.at(-1);

    modal._trap = e => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    };
    modal.addEventListener('keydown', modal._trap);
    first?.focus();
  }

  async function closeModal() {
    if (!activeModal) return;
    const m = activeModal;

    m.removeEventListener('keydown', m._trap || (() => {}));
    await animateClose(m);

    activeModal = null;
    document.documentElement.style.overflow = '';
    header?.removeAttribute('aria-hidden');
  }

  // ---------- Bind open/close triggers ----------
  // open buttons: [data-open="login|register"]
  qsa('[data-open]').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.open));
  });

  // close buttons: [data-close], click backdrop, Escape
  qsa('[data-close]').forEach(btn => btn.addEventListener('click', closeModal));

  qsa('.modal').forEach(m => {
    m.addEventListener('mousedown', e => {
      if (e.target === m) closeModal();
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // ---------- Mobile menu ----------
  burger?.addEventListener('click', () => {
    const expanded = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!expanded));
    mobileMenu.hidden = expanded;
  });

  // ---------- Validation ----------
  const re = {
    username: /^[a-zA-Z0-9_]{3,20}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    strong:
      /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-={}[\]:;"'<>?,.\/]{6,}$/,
  };

  function ensureErrorEl(input) {
    let err = input.closest('.field')?.querySelector('.field__error');
    if (!err) {
      err = document.createElement('small');
      err.className = 'field__error';
      err.hidden = true;
      input.closest('.field')?.appendChild(err);
    }
    if (!err.id) {
      err.id = input.name
        ? `err-${input.name}`
        : `err-${Math.random().toString(36).slice(2)}`;
    }
    return err;
  }

  function setError(input, msg) {
    const err = ensureErrorEl(input);
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', err.id);
    err.textContent = msg;
    err.hidden = false;
    input.closest('.field')?.classList.add('field--error');
  }

  function clearError(input) {
    const err = input.closest('.field')?.querySelector('.field__error');
    input.setAttribute('aria-invalid', 'false');
    if (err) {
      err.textContent = '';
      err.hidden = true;
    }
    input.closest('.field')?.classList.remove('field--error');
  }

  function validateField(input) {
    const name = input.name || '';
    const val = input.value.trim();

    if (name === 'username') {
      if (!val) return setError(input, 'Введіть ім’я користувача');
      if (!re.username.test(val))
        return setError(input, '3–20 символів, латиниця/цифри/_');
    }

    if (name === 'email') {
      if (!val) return setError(input, 'Введіть email');
      if (!re.email.test(val)) return setError(input, 'Невірний формат email');
    }

    if (name === 'password') {
      if (!val) return setError(input, 'Введіть пароль');
      if (!re.strong.test(val))
        return setError(input, 'Мінімум 6 символів, літера і цифра');
    }

    clearError(input);
  }

  function attachValidation(form) {
    if (!form) return;

    const inputs = form.querySelectorAll('.field__input[name]');
    inputs.forEach(inp => {
      inp.setAttribute('aria-invalid', 'false');
      inp.addEventListener('input', () => validateField(inp));
      inp.addEventListener('blur', () => validateField(inp));
    });

    form.addEventListener('submit', async e => {
      let hasError = false;
      inputs.forEach(inp => {
        validateField(inp);
        if (inp.getAttribute('aria-invalid') === 'true') hasError = true;
      });

      if (hasError) {
        e.preventDefault();
        // невеликий шейк (якщо є CSS .form.is-invalid .modal__dialog{ animation: shake ... })
        form.classList.add('is-invalid');
        setTimeout(() => form.classList.remove('is-invalid'), 420);
        return;
      }

      // Тут твоя реальна логіка (fetch/await). Для демо — просто успіх:
      e.preventDefault();
      await closeModal();
      showToast(
        form.closest('#register-window')
          ? 'Реєстрація успішна!'
          : 'Вхід виконано!',
        'success'
      );
    });
  }

  attachValidation(qs('#register-window form'));
  attachValidation(qs('#login-window form'));
})();
