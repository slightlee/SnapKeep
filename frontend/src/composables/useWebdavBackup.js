import { computed, onMounted, ref, watch } from 'vue';

export const useWebdavBackup = ({
  noteDb,
  settingsOps,
  showToast,
  decryptText,
  encryptText,
  listBackups,
  putTextFile,
  getTextFile,
  deleteTextFile,
  testConnection,
  notes,
  refreshStats,
  loadNotes,
  appVersion,
  timestampYYYYMMDDHHmmss,
  formatDateTime,
  lastBackupKey,
  setBackupProxyBaseUrl
}) => {
  const WEBDAV_PROVIDERS = [
    { key: 'jianguoyun', label: '坚果云', address: 'https://dav.jianguoyun.com/dav/' },
    { key: 'aliyun', label: '阿里云盘', address: 'https://dav.aliyundrive.com/' },
    { key: 'custom', label: '自建 / 自定义', address: '' }
  ];

  const webdavProvider = ref('jianguoyun');
  const webdavServer = ref(WEBDAV_PROVIDERS[0].address);
  const customWebdavServer = ref('');
  const webdavUser = ref('');
  const webdavPwd = ref('');
  const encryptPwd = ref('');
  const backupProxyUrl = ref('');
  const showWebdavPwd = ref(false);
  const showEncryptPwd = ref(false);

  const WEBDAV_CONFIG_KEY = 'webDavConfig';

  const saveWebdavConfig = async () => {
    const config = {
      provider: webdavProvider.value,
      server: isCustomProvider.value ? webdavServer.value : WEBDAV_PROVIDERS.find(p => p.key === webdavProvider.value)?.address || '',
      username: webdavUser.value,
      password: webdavPwd.value,
      encryptPwd: encryptPwd.value,
      backupProxyUrl: backupProxyUrl.value.trim()
    };
    await settingsOps.set(WEBDAV_CONFIG_KEY, config);
  };

  const loadWebdavConfig = async () => {
    const saved = await settingsOps.get(WEBDAV_CONFIG_KEY);
    if (saved) {
      const config = saved.value;
      webdavProvider.value = config.provider || 'jianguoyun';
      webdavUser.value = config.username || '';
      
      // 检测密码是否是加密的（加密的密码通常是较长的 base64 字符串）
      if (config.password) {
        // 加密的密码长度通常在 100 字符以上
        if (config.password.length > 50) {
          // 是加密的，留空让用户重新输入
          webdavPwd.value = '';
        } else {
          // 是明文，直接使用
          webdavPwd.value = config.password;
        }
      } else {
        webdavPwd.value = '';
      }
      
      // 加载数据加密密码
      encryptPwd.value = config.encryptPwd || '';
      backupProxyUrl.value = config.backupProxyUrl || '';
      
      if (config.provider === 'custom') {
        webdavServer.value = config.server || '';
        customWebdavServer.value = config.server || '';
      } else {
        const provider = WEBDAV_PROVIDERS.find(p => p.key === config.provider);
        if (provider) {
          webdavServer.value = provider.address;
        }
      }
    }
    setBackupProxyBaseUrl?.(backupProxyUrl.value);
  };

  const backupFiles = ref([]);
  const backupListHint = ref('通过同源备份代理服务连接 WebDAV，规避跨域限制。');
  const isTestingWebdav = ref(false);
  const isBackingUp = ref(false);
  const isRefreshingList = ref(false);

  const selectedWebdavProvider = computed(
    () => WEBDAV_PROVIDERS.find((p) => p.key === webdavProvider.value) || WEBDAV_PROVIDERS[0]
  );
  const isCustomProvider = computed(() => webdavProvider.value === 'custom');
  const presetServerAddress = computed(() => selectedWebdavProvider.value.address || '');

  watch(webdavProvider, (next, prev) => {
    // 切换提供方时清空用户名和密码
    webdavUser.value = '';
    webdavPwd.value = '';
    
    if (prev === 'custom') customWebdavServer.value = webdavServer.value;
    if (next === 'custom') {
      webdavServer.value = customWebdavServer.value || '';
    } else {
      const provider = WEBDAV_PROVIDERS.find((p) => p.key === next) || WEBDAV_PROVIDERS[0];
      webdavServer.value = provider.address;
    }
  });

  watch(backupProxyUrl, (next) => {
    setBackupProxyBaseUrl?.(next);
  });

  const getWebdavAuth = async () => {
    const password = webdavPwd.value;
    if (!password) {
      throw new Error('请填写 WebDAV 密码');
    }
    const server = isCustomProvider.value ? webdavServer.value : presetServerAddress.value;
    return {
      server,
      username: webdavUser.value,
      password
    };
  };

  const formatBackupTime = (value) => {
    if (!value) return '—';
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) return value;
    return formatDateTime(time);
  };

  const handleTestWebdav = async () => {
    isTestingWebdav.value = true;
    try {
      const auth = await getWebdavAuth();
      await testConnection(auth);
      await saveWebdavConfig();
      showToast('success', '连接成功');
    } catch (error) {
      showToast('error', error.message || '连接失败');
    } finally {
      isTestingWebdav.value = false;
    }
  };

  const handleSaveConfig = async () => {
    try {
      await saveWebdavConfig();
      showToast('success', '配置保存成功');
    } catch (error) {
      showToast('error', error.message || '保存失败');
    }
  };

  const refreshBackupList = async () => {
    isRefreshingList.value = true;
    backupListHint.value = '正在加载备份列表...';
    backupFiles.value = [];
    try {
      const auth = await getWebdavAuth();
      const items = await listBackups(auth);
      backupFiles.value = items;
      if (!items.length) {
        backupListHint.value = '未找到备份文件。';
      } else {
        backupListHint.value = '选择备份文件后可恢复。';
      }
    } catch (error) {
      backupListHint.value = error.message || '备份列表加载失败。';
      showToast('error', error.message || '备份列表加载失败');
    } finally {
      isRefreshingList.value = false;
    }
  };

  const backupNow = async () => {
    isBackingUp.value = true;
    try {
      const auth = await getWebdavAuth();
      // 备份前保存配置
      await saveWebdavConfig();
      const payload = { version: appVersion, createTime: Date.now(), notes: notes.value };
      const encrypted = await encryptText(JSON.stringify(payload), encryptPwd.value);
      const fileName = `snapkeep-backup-${timestampYYYYMMDDHHmmss()}.encrypted`;
      await putTextFile({
        ...auth,
        fileName,
        contentType: 'text/plain; charset=utf-8',
        text: encrypted
      });
      await settingsOps.set(lastBackupKey, Date.now());
      showToast('success', '备份成功');
    } catch (error) {
      showToast('error', error.message || '备份失败');
    } finally {
      isBackingUp.value = false;
      await refreshStats();
    }
  };

  const pendingRestoreFile = ref(null);
  const pendingDeleteFile = ref(null);

  const requestRestore = (fileName) => {
    pendingRestoreFile.value = fileName;
  };

  const confirmRestore = async () => {
    if (!pendingRestoreFile.value) return;
    try {
      if (!encryptPwd.value) throw new Error('请填写加密密码（用于备份文件解密）');
      const auth = await getWebdavAuth();
      const encryptedText = await getTextFile({ 
        ...auth,
        fileName: pendingRestoreFile.value 
      });
      const json = await decryptText(encryptedText, encryptPwd.value);
      let data;
      try {
        data = JSON.parse(json);
      } catch {
        throw new Error('备份文件格式无效');
      }
      if (!data || !Array.isArray(data.notes)) throw new Error('备份文件格式无效：缺少 notes');
      await noteDb.bulkReplaceAll(data.notes);
      await settingsOps.set(lastBackupKey, Date.now());
      pendingRestoreFile.value = null;
      await loadNotes();
      await refreshStats();
      showToast('success', '恢复成功');
    } catch (error) {
      showToast('error', error.message || '恢复失败');
    }
  };

  const requestDeleteBackup = (fileName) => {
    pendingDeleteFile.value = fileName;
  };

  const deleteBackup = async () => {
    if (!pendingDeleteFile.value) return;
    try {
      const auth = await getWebdavAuth();
      await deleteTextFile({
        ...auth,
        fileName: pendingDeleteFile.value
      });
      pendingDeleteFile.value = null;
      await refreshBackupList();
      showToast('success', '删除成功');
    } catch (error) {
      showToast('error', error.message || '删除失败');
    }
  };

  onMounted(async () => {
    await loadWebdavConfig();
  });

  return {
    WEBDAV_PROVIDERS,
    webdavProvider,
    webdavServer,
    webdavUser,
    webdavPwd,
    encryptPwd,
    backupProxyUrl,
    showWebdavPwd,
    showEncryptPwd,
    isCustomProvider,
    presetServerAddress,
    backupFiles,
    backupListHint,
    isTestingWebdav,
    isBackingUp,
    isRefreshingList,
    pendingRestoreFile,
    handleTestWebdav,
    handleSaveConfig,
    refreshBackupList,
    backupNow,
    requestRestore,
    confirmRestore,
    requestDeleteBackup,
    deleteBackup,
    formatBackupTime
  };
};
