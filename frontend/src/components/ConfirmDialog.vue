<template>
  <div class="modal-overlay" :class="{ open: isOpen }" @click.self="$emit('cancel')">
    <div class="confirm-dialog" role="dialog" aria-modal="true" :aria-label="title">
      <div class="confirm-icon" :class="variant">
        <svg
          v-if="variant === 'danger'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polyline points="3 6 5 6 21 6" />
          <path
            d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
          />
        </svg>
        <svg
          v-else
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path
            d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
          />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
      <div class="btn-row">
        <button class="btn btn-outline" type="button" @click="$emit('cancel')">取消</button>
        <button class="btn" :class="confirmClass" type="button" @click="$emit('confirm')">
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue';

  const props = defineProps({
    isOpen: { type: Boolean, default: false },
    title: { type: String, default: '' },
    message: { type: String, default: '' },
    variant: { type: String, default: 'warning' },
    confirmText: { type: String, default: '确认' }
  });

  defineEmits(['confirm', 'cancel']);

  const confirmClass = computed(() => (props.variant === 'danger' ? 'btn-danger' : 'btn-primary'));
</script>
