export const useBootstrapUI = () => {
  const initBootstrapDropdowns = () => {
    const dropdownToggles = document.querySelectorAll('[data-bs-toggle="dropdown"]');
    dropdownToggles.forEach((toggle) => {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        const menu = toggle.nextElementSibling;
        if (!menu || !menu.classList.contains('dropdown-menu')) return;

        const isShown = menu.classList.contains('show');
        closeAllDropdowns();

        if (!isShown) {
          toggle.setAttribute('aria-expanded', 'true');
          menu.classList.add('show');
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (!e.target || !(e.target as Element).closest('.dropdown')) {
        closeAllDropdowns();
      }
    });

    function closeAllDropdowns() {
      document.querySelectorAll('.dropdown-menu.show').forEach((menu) => {
        menu.classList.remove('show');
        const toggle = menu.previousElementSibling;
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      });
    }
  };

  const initBootstrapModals = () => {
    document.querySelectorAll('[data-bs-toggle="modal"]').forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const targetSelector = trigger.getAttribute('data-bs-target');
        if (!targetSelector) return;

        const modal = document.querySelector(targetSelector);
        if (!modal) return;

        modal.classList.add('show');
        (modal as HTMLElement).style.display = 'block';
        document.body.classList.add('modal-open');
      });
    });

    document.querySelectorAll('.modal .btn-close, .modal [data-bs-dismiss="modal"]').forEach((closeBtn) => {
      closeBtn.addEventListener('click', () => {
        const modal = closeBtn.closest('.modal');
        if (!modal) return;

        modal.classList.remove('show');
        (modal as HTMLElement).style.display = 'none';
        document.body.classList.remove('modal-open');
      });
    });
  };

  const initAllBootstrapUI = () => {
    initBootstrapDropdowns();
    initBootstrapModals();
  };

  return {
    initAllBootstrapUI
  };
};
