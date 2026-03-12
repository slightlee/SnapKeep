import { ref } from 'vue';

export const useStats = ({
  settingsOps,
  notes,
  showToast,
  formatBytes,
  formatDateTime,
  storageWarnThreshold,
  lastBackupKey
}) => {
  const usedStorage = ref('—');
  const lastBackupTime = ref('—');

  let storageWarned = false;
  let backupReminded = false;

  const refreshStats = async () => {
    if (navigator.storage?.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        usedStorage.value = formatBytes(used);
        if (used >= storageWarnThreshold && !storageWarned) {
          storageWarned = true;
          showToast('error', '本地存储已接近 50MB，建议导出备份或清理旧记录');
        }
      } catch {
        usedStorage.value = '—';
      }
    }
    const lastBackup = await settingsOps.get(lastBackupKey);
    lastBackupTime.value = lastBackup ? formatDateTime(lastBackup.value) : '—';
    if (!backupReminded && notes.value.length > 10 && !lastBackup) {
      backupReminded = true;
      showToast('error', `您已有 ${notes.value.length} 条记录未备份，建议尽快导出或 WebDAV 备份`);
    }
  };

  return { usedStorage, lastBackupTime, refreshStats };
};
