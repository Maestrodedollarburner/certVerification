const UI = {
  init() {
    this.highlightActiveNav();
    this.initStaggerAnimations();
    this.initCardInteractions();
  },

  highlightActiveNav() {
    const path = window.location.pathname;
    document.querySelectorAll('.sidebar .nav-link, .sidebar-offcanvas .nav-link, .navbar-app .nav-link').forEach((link) => {
      const href = link.getAttribute('href');
      if (href && (path === href || (href !== '/' && path.endsWith(href)))) {
        link.classList.add('active');
      }
    });
  },

  initStaggerAnimations() {
    document.querySelectorAll('.stagger-group').forEach((group) => {
      group.querySelectorAll('.stagger-item').forEach((el, i) => {
        el.style.animationDelay = `${i * 0.07}s`;
        el.classList.add('animate-in');
      });
    });
  },

  initCardInteractions() {
    document.querySelectorAll('.card-interactive, .certificate-card').forEach((card) => {
      card.addEventListener('mouseenter', () => card.classList.add('is-hovered'));
      card.addEventListener('mouseleave', () => card.classList.remove('is-hovered'));
    });
  },

  setButtonLoading(btn, loading, loadingText = 'Loading...') {
    if (!btn) return;
    if (loading) {
      btn.dataset.originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="loading-spinner"></span> ${loadingText}`;
    } else {
      btn.disabled = false;
      btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
    }
  },

  showPageLoader() {
    let loader = document.getElementById('pageLoader');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'pageLoader';
      loader.className = 'page-loader';
      loader.innerHTML = '<div class="loader-ring"></div>';
      document.body.appendChild(loader);
    }
    requestAnimationFrame(() => loader.classList.add('active'));
  },

  hidePageLoader() {
    const loader = document.getElementById('pageLoader');
    if (loader) loader.classList.remove('active');
  },

  renderSkeletonStats(count = 4) {
    return Array.from({ length: count }, () =>
      `<div class="col-md-3"><div class="card p-3"><div class="skeleton" style="height:2rem;width:60%;margin-bottom:0.5rem"></div><div class="skeleton" style="height:0.75rem;width:40%"></div></div></div>`
    ).join('');
  },
};

document.addEventListener('DOMContentLoaded', () => UI.init());
