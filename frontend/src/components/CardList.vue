<template>
  <div v-show="notes.length" class="card-list">
    <div v-for="note in notes" :key="note.id" class="card">
      <div class="card-header">
        <div class="card-title" :title="note.title">{{ note.title }}</div>
        <div class="card-actions">
          <button
            class="card-action-btn"
            type="button"
            title="复制内容"
            @click="$emit('copy', note)"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          <button class="card-action-btn" type="button" title="编辑" @click="$emit('edit', note)">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            class="card-action-btn danger"
            type="button"
            title="删除"
            @click="$emit('delete', note)"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path
                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
              />
            </svg>
          </button>
        </div>
      </div>
      <div class="card-body">{{ note.content }}</div>
      <div class="card-footer">
        <div class="card-tags">
          <span v-for="tag in note.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>
        <span class="card-time">{{ formatDateTime(note.createdAt) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    notes: {
      type: Array,
      default: () => []
    },
    formatDateTime: {
      type: Function,
      required: true
    }
  });

  defineEmits(['copy', 'edit', 'delete']);
</script>
