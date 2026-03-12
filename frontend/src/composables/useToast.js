import { ref } from 'vue';

export const useToast = () => {
  const toast = ref(null);
  let toastTimer = null;

  const showToast = (type, message) => {
    toast.value = { type, message };
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.value = null;
    }, 2200);
  };

  return { toast, showToast };
};
