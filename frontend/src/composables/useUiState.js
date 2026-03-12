import { ref, watch } from 'vue';

export const useUiState = ({ isEditOpen }) => {
  const isDrawerOpen = ref(false);
  const confirmState = ref(null);

  const toggleDrawer = () => {
    isDrawerOpen.value = !isDrawerOpen.value;
  };

  const closeDrawer = () => {
    isDrawerOpen.value = false;
  };

  const openConfirm = (type) => {
    confirmState.value = type;
  };

  const closeConfirm = () => {
    confirmState.value = null;
  };

  watch(
    () => isDrawerOpen.value || (isEditOpen?.value ?? false) || !!confirmState.value,
    (open) => {
      document.body.classList.toggle('no-scroll', open);
    },
    { immediate: true }
  );

  return {
    isDrawerOpen,
    confirmState,
    toggleDrawer,
    closeDrawer,
    openConfirm,
    closeConfirm
  };
};
