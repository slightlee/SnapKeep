import { createApp } from 'vue';
import App from './App.vue';
import './style.css';
import './assets/app.css';
import { APP_NAME, APP_VERSION_LABEL, SITE_PROFILE_KEY, THEME_KEY } from './constants/index.js';

const applyInitialTheme = () => {
  try {
    const cached = localStorage.getItem(THEME_KEY);
    if (!cached) return;
    const mode = ['light', 'dark', 'system'].includes(cached) ? cached : 'system';
    const resolved =
      mode === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : mode;
    const html = document.documentElement;
    html.setAttribute('data-theme', resolved);
    html.setAttribute('data-theme-mode', mode);
  } catch {
    // ignore
  }
};

const applyInitialTitle = () => {
  try {
    const raw = localStorage.getItem(SITE_PROFILE_KEY);
    if (!raw) {
      document.title = `${APP_NAME} ${APP_VERSION_LABEL}`;
      return;
    }
    const parsed = JSON.parse(raw);
    const name = parsed?.name ? String(parsed.name).trim() : '';
    document.title = `${name || APP_NAME} ${APP_VERSION_LABEL}`;
  } catch {
    document.title = `${APP_NAME} ${APP_VERSION_LABEL}`;
  }
};

applyInitialTheme();
applyInitialTitle();
createApp(App).mount('#app');
