// Simple SPA bootstrap
const THEME_KEY = 'mp-theme';

/* ========== Theme (Light/Dark) ========== */
const getCSS = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function setChartDefaults() {
  if (!window.Chart) return;

  Chart.defaults.color = getCSS('--fg');
  Chart.defaults.borderColor = getCSS('--border');

  Chart.defaults.scale = Chart.defaults.scale || {};
  Chart.defaults.scale.grid = Chart.defaults.scale.grid || {};
  Chart.defaults.scale.ticks = Chart.defaults.scale.ticks || {};
  Chart.defaults.scale.grid.color = getCSS('--border');
  Chart.defaults.scale.ticks.color = getCSS('--muted');

  Chart.defaults.plugins = Chart.defaults.plugins || {};
  Chart.defaults.plugins.legend = Chart.defaults.plugins.legend || {};
  Chart.defaults.plugins.legend.labels = Chart.defaults.plugins.legend.labels || {};
  Chart.defaults.plugins.legend.labels.color = getCSS('--fg');
}

function applyTheme(mode) {
  const isDark = mode === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.setItem(THEME_KEY, mode);
  setChartDefaults();

  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.textContent = isDark ? '☀️' : '🌙';
    btn.setAttribute('aria-label', isDark ? 'Switch to light' : 'Switch to dark');
  }

  // re-render current page so charts refresh with theme colors
  const active = document.querySelector('[data-page].active');
  if (active) setPage(active.dataset.page);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));

  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
      applyTheme(next);
    });
  }
}

/* ============================ */
const $app = document.getElementById('app');
document.querySelectorAll('[data-page]').forEach(btn =>
  btn.addEventListener('click', () => setPage(btn.dataset.page))
);
