import { computed, onMounted, ref, watch } from 'vue';

export const useSiteProfile = ({ settingsOps, key, defaultName, appVersionLabel }) => {
  const siteName = ref('');
  const siteIcon = ref('');
  const siteProfileReady = ref(false);

  const readCachedProfile = () => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        name: parsed.name || '',
        icon: parsed.icon || ''
      };
    } catch {
      return null;
    }
  };

  const writeCachedProfile = () => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ name: siteName.value.trim(), icon: siteIcon.value.trim() })
      );
    } catch {
      // ignore
    }
  };

  const cachedProfile = readCachedProfile();
  if (cachedProfile) {
    siteName.value = cachedProfile.name;
    siteIcon.value = cachedProfile.icon;
  }

  const normalizedSiteIcon = computed(() => siteIcon.value.trim());
  const siteIconIsUrl = computed(() =>
    /^(https?:\/\/|data:image\/)/i.test(normalizedSiteIcon.value)
  );
  const siteIconText = computed(() =>
    !siteIconIsUrl.value && normalizedSiteIcon.value ? normalizedSiteIcon.value : ''
  );
  const resolvedSiteIcon = computed(() => (siteIconIsUrl.value ? normalizedSiteIcon.value : ''));
  const resolvedSiteName = computed(() => siteName.value.trim() || defaultName);

  const updateDocumentTitle = () => {
    document.title = `${resolvedSiteName.value} ${appVersionLabel}`;
  };

  watch([siteName, siteIcon], async () => {
    if (!siteProfileReady.value) return;
    writeCachedProfile();
    await settingsOps.set(key, {
      name: siteName.value.trim(),
      icon: siteIcon.value.trim()
    });
  });

  watch(resolvedSiteName, updateDocumentTitle, { immediate: true });

  onMounted(async () => {
    const savedSiteProfile = await settingsOps.get(key);
    if (savedSiteProfile) {
      siteName.value = savedSiteProfile.value.name || '';
      siteIcon.value = savedSiteProfile.value.icon || '';
    }
    siteProfileReady.value = true;
    writeCachedProfile();
    updateDocumentTitle();
  });

  return {
    siteName,
    siteIcon,
    siteIconIsUrl,
    siteIconText,
    resolvedSiteIcon,
    resolvedSiteName
  };
};
