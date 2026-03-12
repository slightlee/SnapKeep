<template>
  <div v-show="visible" class="loading-state" role="status" aria-live="polite">
    <div class="loading-spinner" aria-hidden="true"></div>
    <div>
      <div class="loading-title">{{ title }}</div>
      <div class="loading-desc">{{ description }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '正在加载'
  },
  description: {
    type: String,
    default: '正在读取本地数据，请稍候'
  }
});
</script>
