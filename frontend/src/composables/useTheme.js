import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

export const useTheme = ({ settingsOps, themeKey }) => {
  const themeMode = ref('system');
  const isThemeMenuOpen = ref(false);
  const themeMenuRef = ref(null);
  const themeButtonRef = ref(null);
  const systemTheme = ref('light');

  let mediaQuery = null;
  let handleSystemThemeChange = null;
  let isReady = false;

  const readCachedTheme = () => {
    try {
      return localStorage.getItem(themeKey) || '';
    } catch {
      return '';
    }
  };

  const writeCachedTheme = (mode) => {
    try {
      localStorage.setItem(themeKey, mode);
    } catch {
      // ignore
    }
  };

  const cachedTheme = readCachedTheme();
  if (cachedTheme) themeMode.value = cachedTheme;

  const resolvedTheme = computed(() =>
    themeMode.value === 'system' ? systemTheme.value : themeMode.value
  );

  const applyTheme = () => {
    const html = document.documentElement;
    html.setAttribute('data-theme', resolvedTheme.value);
    html.setAttribute('data-theme-mode', themeMode.value);
  };

  const toggleThemeMenu = () => {
    isThemeMenuOpen.value = !isThemeMenuOpen.value;
  };

  const setThemeMode = (mode) => {
    themeMode.value = mode;
    isThemeMenuOpen.value = false;
  };

  const handleDocumentClick = (event) => {
    const target = event.target;
    if (themeMenuRef.value?.contains(target) || themeButtonRef.value?.contains(target)) {
      return;
    }
    isThemeMenuOpen.value = false;
  };

  watch([themeMode, resolvedTheme], applyTheme, { immediate: true });

  watch(themeMode, async (mode) => {
    writeCachedTheme(mode);
    if (!isReady) return;
    await settingsOps.set(themeKey, mode);
  });

  onMounted(async () => {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    systemTheme.value = mediaQuery.matches ? 'dark' : 'light';
    handleSystemThemeChange = (event) => {
      systemTheme.value = event.matches ? 'dark' : 'light';
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    document.addEventListener('click', handleDocumentClick);

    const savedTheme = await settingsOps.get(themeKey);
    if (savedTheme) {
      themeMode.value = savedTheme.value;
      writeCachedTheme(savedTheme.value);
    }
    isReady = true;
  });

  onBeforeUnmount(() => {
    if (mediaQuery && handleSystemThemeChange) {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
    document.removeEventListener('click', handleDocumentClick);
  });

  return {
    themeMode,
    isThemeMenuOpen,
    themeMenuRef,
    themeButtonRef,
    resolvedTheme,
    toggleThemeMenu,
    setThemeMode
  };
};
