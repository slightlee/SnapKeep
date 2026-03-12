<template>
  <section class="input-section">
    <textarea
      class="input-content"
      :value="content"
      placeholder="在此输入或粘贴内容...\n支持多行文本，系统将自动提取前 20 字作为标题"
      @input="handleContentInput"
      @keydown.meta.enter.prevent="$emit('save')"
      @keydown.ctrl.enter.prevent="$emit('save')"
    ></textarea>
    <div class="input-toolbar">
      <div class="input-footer">
        <div class="tag-area">
          <div class="tag-input-wrapper">
            <svg
              class="tag-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
              />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <input
              class="tag-input"
              type="text"
              :value="tagInput"
              placeholder="添加标签（空格/逗号均可）"
              autocomplete="off"
              @input="handleTagInput"
            />
          </div>
          <div class="tag-preview" :class="{ show: tagPreview.length }" aria-label="标签预览">
            <span v-for="tag in tagPreview" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </div>
      </div>
      <div class="toolbar-right">
        <button class="save-btn" type="button" @click="$emit('save')">保存</button>
        <div
          class="shortcut-hint"
          title="快捷键 Ctrl / Command + Enter"
          aria-label="快捷键 Ctrl / Command + Enter"
        >
          <span class="keycap">Ctrl</span>
          <span class="keycap">/</span>
          <span class="keycap">⌘</span>
          <span class="keycap">Enter</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
  defineProps({
    content: {
      type: String,
      default: ''
    },
    tagInput: {
      type: String,
      default: ''
    },
    tagPreview: {
      type: Array,
      default: () => []
    }
  });

  const emit = defineEmits(['update:content', 'update:tag-input', 'save']);

  const handleContentInput = (event) => {
    emit('update:content', event.target.value);
  };

  const handleTagInput = (event) => {
    emit('update:tag-input', event.target.value);
  };
</script>
