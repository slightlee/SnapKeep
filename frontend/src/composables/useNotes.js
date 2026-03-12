import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

export const useNotes = ({ noteDb, parseTags, showToast, onAfterChange }) => {
  const PAGE_SIZE = 50;

  const contentInput = ref('');
  const tagInput = ref('');
  const keyword = ref('');
  const notes = ref([]);
  const isLoading = ref(false);
  const currentPage = ref(1);

  const editContent = ref('');
  const editTagInput = ref('');
  const editNoteId = ref(null);
  const isEditOpen = ref(false);

  const sentinelRef = ref(null);
  let observer = null;

  const tagPreview = computed(() => parseTags(tagInput.value));
  const editTagPreview = computed(() => parseTags(editTagInput.value));

  const filteredNotes = computed(() => {
    const key = keyword.value.trim().toLowerCase();
    if (!key) {
      return notes.value;
    }
    return notes.value.filter((note) => {
      const title = String(note.title || '').toLowerCase();
      const content = String(note.content || '').toLowerCase();
      const tags = Array.isArray(note.tags) ? note.tags : [];
      const inTitle = title.includes(key);
      const inContent = content.includes(key);
      const inTags = tags.some((tag) => String(tag).toLowerCase().includes(key));
      return inTitle || inContent || inTags;
    });
  });

  const visibleNotes = computed(() => filteredNotes.value.slice(0, currentPage.value * PAGE_SIZE));
  const hasMore = computed(() => visibleNotes.value.length < filteredNotes.value.length);
  const hasKeyword = computed(() => keyword.value.trim().length > 0);
  const searchCount = computed(() => filteredNotes.value.length);
  const showEmpty = computed(() => !isLoading.value && notes.value.length === 0 && !hasKeyword.value);
  const showSearchEmpty = computed(
    () => !isLoading.value && notes.value.length > 0 && hasKeyword.value && filteredNotes.value.length === 0
  );
  const notesCount = computed(() => notes.value.length);

  const resetPagination = () => {
    currentPage.value = 1;
  };

  const loadNotes = async () => {
    isLoading.value = true;
    try {
      notes.value = await noteDb.getAllNotes();
      resetPagination();
    } finally {
      isLoading.value = false;
    }
  };

  const handleSave = async () => {
    const content = contentInput.value.trim();
    if (!content) {
      showToast('error', '请输入内容');
      return;
    }
    try {
      const record = await noteDb.addNote({ content, tags: parseTags(tagInput.value) });
      notes.value.unshift(record);
      contentInput.value = '';
      tagInput.value = '';
      resetPagination();
      showToast('success', '记录已保存');
      if (onAfterChange) await onAfterChange();
    } catch (error) {
      showToast('error', error.message || '保存失败');
    }
  };

  const copyNote = async (note) => {
    try {
      await navigator.clipboard.writeText(note.content);
      showToast('success', '已复制到剪贴板');
    } catch {
      showToast('error', '复制失败：请检查浏览器权限');
    }
  };

  const openEdit = (note) => {
    editNoteId.value = note.id;
    editContent.value = note.content;
    editTagInput.value = (note.tags || []).join(', ');
    isEditOpen.value = true;
  };

  const closeEdit = () => {
    isEditOpen.value = false;
    editNoteId.value = null;
  };

  const saveEdit = async () => {
    const content = editContent.value.trim();
    if (!content) {
      showToast('error', '内容不能为空');
      return;
    }
    try {
      const updated = await noteDb.updateNote(editNoteId.value, {
        content,
        tags: parseTags(editTagInput.value)
      });
      const idx = notes.value.findIndex((n) => n.id === updated.id);
      if (idx >= 0) notes.value[idx] = updated;
      showToast('success', '已更新');
      closeEdit();
      if (onAfterChange) await onAfterChange();
    } catch (error) {
      showToast('error', error.message || '更新失败');
    }
  };

  const deleteNote = async () => {
    try {
      await noteDb.deleteNote(editNoteId.value);
      notes.value = notes.value.filter((note) => note.id !== editNoteId.value);
      editNoteId.value = null;
      showToast('success', '已删除');
      if (onAfterChange) await onAfterChange();
    } catch (error) {
      showToast('error', error.message || '删除失败');
    }
  };

  const setEditNoteId = (id) => {
    editNoteId.value = id;
  };

  watch([() => notes.value.length, keyword], () => {
    resetPagination();
  });

  onMounted(() => {
    observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      if (!hasMore.value) return;
      currentPage.value += 1;
    });
    if (sentinelRef.value) observer.observe(sentinelRef.value);
  });

  onBeforeUnmount(() => {
    if (observer && sentinelRef.value) observer.unobserve(sentinelRef.value);
  });

  return {
    contentInput,
    tagInput,
    keyword,
    notes,
    visibleNotes,
    hasMore,
    searchCount,
    showEmpty,
    showSearchEmpty,
    notesCount,
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
    deleteNote,
    setEditNoteId
  };
};
