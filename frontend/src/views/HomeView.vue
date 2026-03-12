<template>
  <div>
    <header class="header">
      <div class="header-inner">
        <div class="header-logo" :title="resolvedSiteName">
          <img v-if="siteIconIsUrl" :src="resolvedSiteIcon" class="logo-img" alt="" />
          <span v-else-if="siteIconText" class="logo-emoji">{{ siteIconText }}</span>
          <img v-else src="/branding/snapkeep-logo-mark.svg" class="logo-img" alt="" />
          <span>{{ resolvedSiteName }}</span>
        </div>

        <div class="header-right">
          <div class="header-search">
            <svg
              class="search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              v-model="keyword"
              type="text"
              placeholder="搜索记录内容或标签..."
              autocomplete="off"
            />
            <span v-show="keyword.trim()" class="search-count">{{ searchCount }} 条匹配</span>
          </div>

          <div class="header-actions">
            <div class="theme-switch">
              <button
                id="themeBtn"
                ref="themeButtonRef"
                class="icon-btn"
                type="button"
                title="主题"
                aria-haspopup="menu"
                :aria-expanded="isThemeMenuOpen"
                @click.stop="toggleThemeMenu"
              >
                <span class="sr-only">主题设置</span>
                <svg
                  v-show="themeMode === 'system'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <svg
                  v-show="themeMode === 'light'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
                <svg
                  v-show="themeMode === 'dark'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              </button>
              <div
                ref="themeMenuRef"
                class="theme-menu"
                role="menu"
                :class="{ open: isThemeMenuOpen }"
                aria-labelledby="themeBtn"
                @click.stop
              >
                <button
                  type="button"
                  role="menuitemradio"
                  :class="{ active: themeMode === 'system' }"
                  @click="setThemeMode('system')"
                >
                  <span class="item-left">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    <span>
                      <div class="item-title">跟随系统</div>
                      <div class="item-desc">默认推荐</div>
                    </span>
                  </span>
                  <svg
                    class="check"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <button
                  type="button"
                  role="menuitemradio"
                  :class="{ active: themeMode === 'light' }"
                  @click="setThemeMode('light')"
                >
                  <span class="item-left">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                    <span>
                      <div class="item-title">亮色模式</div>
                      <div class="item-desc">始终亮色</div>
                    </span>
                  </span>
                  <svg
                    class="check"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <button
                  type="button"
                  role="menuitemradio"
                  :class="{ active: themeMode === 'dark' }"
                  @click="setThemeMode('dark')"
                >
                  <span class="item-left">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                    <span>
                      <div class="item-title">暗色模式</div>
                      <div class="item-desc">始终暗色</div>
                    </span>
                  </span>
                  <svg
                    class="check"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              </div>
            </div>

            <button
              class="icon-btn"
              type="button"
              title="设置"
              aria-controls="drawer"
              :aria-expanded="isDrawerOpen"
              @click="toggleDrawer"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="main">
      <InputSection
        v-model:content="contentInput"
        v-model:tag-input="tagInput"
        :tag-preview="tagPreview"
        @save="handleSave"
      />

      <LoadingState :visible="isLoading" />

      <CardList
        :notes="visibleNotes"
        :format-date-time="formatDateTime"
        @copy="copyNote"
        @edit="openEdit"
        @delete="confirmDelete"
      />
      <div id="sentinel" ref="sentinelRef" style="height: 1px"></div>

      <EmptyState
        :visible="showEmpty"
        title="还没有任何记录"
        description="在上方输入框中粘贴或输入内容，开始捕获你的第一条灵感碎片"
      >
        <template #icon>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="12" x2="12" y2="18" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </template>
      </EmptyState>

      <EmptyState
        :visible="showSearchEmpty"
        title="未找到相关记录"
        description="尝试更换关键词，或清空搜索条件查看全部记录"
      >
        <template #icon>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </template>
      </EmptyState>
    </main>

    <SettingsDrawer
      :is-open="isDrawerOpen"
      :webdav-provider="webdavProvider"
      :providers="webdavProviders"
      :is-custom-provider="isCustomProvider"
      :preset-server-address="presetServerAddress"
      :webdav-server="webdavServer"
      :webdav-user="webdavUser"
      :webdav-pwd="webdavPwd"
      :encrypt-pwd="encryptPwd"
      :backup-proxy-url="backupProxyUrl"
      :show-webdav-pwd="showWebdavPwd"
      :show-encrypt-pwd="showEncryptPwd"
      :is-testing-webdav="isTestingWebdav"
      :is-backing-up="isBackingUp"
      :is-refreshing-list="isRefreshingList"
      :backup-files="backupFiles"
      :backup-list-hint="backupListHint"
      :format-backup-time="formatBackupTime"
      :site-name="siteName"
      :site-icon="siteIcon"
      :notes-count="notesCount"
      :used-storage="usedStorage"
      :last-backup-time="lastBackupTime"
      :version-text="versionText"
      @close="closeDrawer"
      @update:webdav-provider="webdavProvider = $event"
      @update:webdav-server="webdavServer = $event"
      @update:webdav-user="webdavUser = $event"
      @update:webdav-pwd="webdavPwd = $event"
      @update:encrypt-pwd="encryptPwd = $event"
      @update:backup-proxy-url="backupProxyUrl = $event"
      @toggle-webdav-pwd="showWebdavPwd = !showWebdavPwd"
      @toggle-encrypt-pwd="showEncryptPwd = !showEncryptPwd"
      @test-webdav="handleTestWebdav"
      @save-config="handleSaveConfig"
      @backup="backupNow"
      @refresh-backups="refreshBackupList"
      @restore="requestRestore"
      @delete-backup="requestDeleteBackup"
      @export="exportJSON"
      @import="triggerImport"
      @update:site-name="siteName = $event"
      @update:site-icon="siteIcon = $event"
    />

    <EditModal
      v-model:content="editContent"
      v-model:tag-input="editTagInput"
      :is-open="isEditOpen"
      :tag-preview="editTagPreview"
      @close="closeEdit"
      @save="saveEdit"
    />

    <ConfirmDialog
      :is-open="confirmState === 'delete'"
      title="确认删除"
      message="此操作将永久删除该记录，删除后无法恢复。确定要继续吗？"
      variant="danger"
      confirm-text="确认删除"
      @cancel="closeConfirm"
      @confirm="deleteNote"
    />

    <ConfirmDialog
      :is-open="confirmState === 'import'"
      title="确认导入"
      message="导入将覆盖本地全部数据，此操作不可撤销。建议先导出当前数据作为备份。"
      variant="warning"
      confirm-text="确认导入"
      @cancel="closeConfirm"
      @confirm="confirmImport"
    />

    <ConfirmDialog
      :is-open="confirmState === 'restore'"
      title="确认恢复"
      message="恢复将覆盖本地全部数据，此操作不可撤销。确定要从云端备份恢复吗？"
      variant="warning"
      confirm-text="确认恢复"
      @cancel="closeConfirm"
      @confirm="confirmRestore"
    />

    <ConfirmDialog
      :is-open="confirmState === 'delete-backup'"
      title="确认删除备份"
      message="此操作将永久删除该备份文件，删除后无法恢复。确定要继续吗？"
      variant="danger"
      confirm-text="确认删除"
      @cancel="closeConfirm"
      @confirm="deleteBackup"
    />

    <ToastNotice :toast="toast" />

    <input
      ref="importFileInput"
      type="file"
      accept="application/json"
      class="sr-only"
      @change="handleImportFile"
    />
  </div>
</template>
<script setup>
  import { computed, onMounted } from 'vue';
  import { noteDb, settingsOps } from '../core/db/index.js';
  import {
    APP_EDITION_LABEL,
    APP_STAGE_LABEL,
    APP_VERSION,
    APP_VERSION_LABEL,
    DEFAULT_SITE_NAME,
    LAST_BACKUP_KEY,
    SITE_PROFILE_KEY,
    STORAGE_WARN_THRESHOLD,
    THEME_KEY
  } from '../constants/index.js';
  import { decryptText, encryptText } from '../core/encrypt/crypto.js';
  import {
    deleteTextFile,
    getTextFile,
    listBackups,
    putTextFile,
    setBackupProxyBaseUrl,
    testConnection
  } from '../core/webdav/index.js';
  import {
    formatBytes,
    formatDateTime,
    parseTags,
    timestampYYYYMMDDHHmmss,
    todayYYYYMMDD
  } from '../utils/index.js';
  import {
    CardList,
    ConfirmDialog,
    EditModal,
    EmptyState,
    InputSection,
    LoadingState,
    SettingsDrawer,
    ToastNotice
  } from '../components/index.js';
  import {
    useImportExport,
    useNotes,
    useSiteProfile,
    useStats,
    useTheme,
    useToast,
    useUiState,
    useWebdavBackup
  } from '../composables/index.js';

  const { toast, showToast } = useToast();

  let statsApi;

  const notesApi = useNotes({
    noteDb,
    parseTags,
    showToast,
    onAfterChange: () => statsApi?.refreshStats?.()
  });

  statsApi = useStats({
    settingsOps,
    notes: notesApi.notes,
    showToast,
    formatBytes,
    formatDateTime,
    storageWarnThreshold: STORAGE_WARN_THRESHOLD,
    lastBackupKey: LAST_BACKUP_KEY
  });

  const importExportApi = useImportExport({
    noteDb,
    notes: notesApi.notes,
    showToast,
    loadNotes: notesApi.loadNotes,
    refreshStats: () => statsApi.refreshStats(),
    appVersion: APP_VERSION,
    todayYYYYMMDD
  });

  const webdavApi = useWebdavBackup({
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
    notes: notesApi.notes,
    refreshStats: () => statsApi.refreshStats(),
    loadNotes: notesApi.loadNotes,
    appVersion: APP_VERSION,
    timestampYYYYMMDDHHmmss,
    formatDateTime,
    lastBackupKey: LAST_BACKUP_KEY,
    setBackupProxyBaseUrl
  });

  const {
    themeMode,
    isThemeMenuOpen,
    themeMenuRef,
    themeButtonRef,
    toggleThemeMenu,
    setThemeMode
  } = useTheme({
    settingsOps,
    themeKey: THEME_KEY
  });

  const { siteName, siteIcon, siteIconIsUrl, siteIconText, resolvedSiteIcon, resolvedSiteName } =
    useSiteProfile({
      settingsOps,
      key: SITE_PROFILE_KEY,
      defaultName: DEFAULT_SITE_NAME,
      appVersionLabel: APP_VERSION_LABEL
    });

  const {
    contentInput,
    tagInput,
    keyword,
    visibleNotes,
    searchCount,
    showEmpty,
    showSearchEmpty,
    tagPreview,
    editTagPreview,
    isEditOpen,
    isLoading,
    editContent,
    editTagInput,
    sentinelRef,
    loadNotes,
    handleSave,
    copyNote,
    openEdit,
    closeEdit,
    saveEdit,
    notesCount
  } = notesApi;

  const { usedStorage, lastBackupTime, refreshStats } = statsApi;

  const {
    WEBDAV_PROVIDERS: webdavProviders,
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
    handleTestWebdav,
    handleSaveConfig,
    refreshBackupList,
    backupNow,
    formatBackupTime
  } = webdavApi;

  const { importFileInput, triggerImport, exportJSON } = importExportApi;

  const { isDrawerOpen, confirmState, toggleDrawer, closeDrawer, openConfirm, closeConfirm } =
    useUiState({
      isEditOpen: notesApi.isEditOpen
    });

  const versionText = computed(
    () => `版本 ${APP_VERSION_LABEL}（${APP_STAGE_LABEL}）· ${APP_EDITION_LABEL}`
  );

  const confirmDelete = (note) => {
    notesApi.setEditNoteId(note.id);
    openConfirm('delete');
  };

  const handleImportFile = (event) => {
    const shouldOpen = importExportApi.handleImportFile(event);
    if (shouldOpen) openConfirm('import');
  };

  const confirmImport = async () => {
    await importExportApi.confirmImport();
    closeConfirm();
  };

  const requestRestore = (fileName) => {
    webdavApi.requestRestore(fileName);
    openConfirm('restore');
  };

  const requestDeleteBackup = (fileName) => {
    webdavApi.requestDeleteBackup(fileName);
    openConfirm('delete-backup');
  };

  const confirmRestore = async () => {
    await webdavApi.confirmRestore();
    closeConfirm();
  };

  const deleteBackup = async () => {
    await webdavApi.deleteBackup();
    closeConfirm();
  };

  const deleteNote = async () => {
    await notesApi.deleteNote();
    closeConfirm();
  };

  onMounted(async () => {
    await loadNotes();
    await refreshStats();
  });
</script>
