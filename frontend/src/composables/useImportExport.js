import { ref } from 'vue';

export const useImportExport = ({
  noteDb,
  notes,
  showToast,
  loadNotes,
  refreshStats,
  appVersion,
  todayYYYYMMDD
}) => {
  const importFileInput = ref(null);
  const pendingImportFile = ref(null);

  const downloadTextAsFile = (text, fileName, mime) => {
    const blob = new Blob([text], { type: mime || 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = async () => {
    try {
      const data = {
        version: appVersion,
        exportTime: Date.now(),
        count: notes.value.length,
        notes: notes.value
      };
      const fileName = `snapkeep-export-${todayYYYYMMDD()}.json`;
      downloadTextAsFile(JSON.stringify(data, null, 2), fileName, 'application/json');
      showToast('success', '文件已导出至下载目录');
    } catch (error) {
      showToast('error', error.message || '导出失败');
    }
  };

  const importJSON = async (file) => {
    const text = await file.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('文件格式无效：不是 JSON');
    }
    if (!data || !Array.isArray(data.notes)) throw new Error('文件格式无效：缺少 notes 数组');
    for (const n of data.notes) {
      if (!n || !n.content) throw new Error('文件格式无效：存在缺少 content 的记录');
    }
    await noteDb.bulkReplaceAll(data.notes);
  };

  const triggerImport = () => {
    importFileInput.value?.click();
  };

  const handleImportFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return false;
    pendingImportFile.value = file;
    return true;
  };

  const confirmImport = async () => {
    if (!pendingImportFile.value) return;
    try {
      await importJSON(pendingImportFile.value);
      pendingImportFile.value = null;
      await loadNotes();
      await refreshStats();
      showToast('success', '导入完成');
    } catch (error) {
      showToast('error', error.message || '导入失败');
    }
  };

  return {
    importFileInput,
    pendingImportFile,
    triggerImport,
    handleImportFile,
    confirmImport,
    exportJSON
  };
};
