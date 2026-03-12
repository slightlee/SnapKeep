<template>
  <div class="modal-overlay" :class="{ open: isOpen }" @click.self="$emit('close')">
    <div class="modal" role="dialog" aria-modal="true" aria-label="编辑记录">
      <div class="modal-header">
        <h3>编辑记录</h3>
        <button
          class="icon-btn"
          type="button"
          title="关闭"
          aria-label="关闭编辑弹窗"
          @click="$emit('close')"
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <textarea :value="content" @input="$emit('update:content', $event.target.value)"></textarea>
        <div class="form-group">
          <label class="form-label" for="tagInputEdit">标签</label>
          <input
            id="tagInputEdit"
            class="form-input"
            type="text"
            :value="tagInput"
            placeholder="标签（空格/逗号分隔）"
            autocomplete="off"
            @input="$emit('update:tag-input', $event.target.value)"
          />
          <div
            class="tag-preview"
            :class="{ show: tagPreview.length }"
            style="margin-top: 10px"
            aria-label="标签预览"
          >
            <span v-for="tag in tagPreview" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" type="button" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" type="button" @click="$emit('save')">确认保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    isOpen: { type: Boolean, default: false },
    content: { type: String, default: '' },
    tagInput: { type: String, default: '' },
    tagPreview: { type: Array, default: () => [] }
  });

  defineEmits(['close', 'save', 'update:content', 'update:tag-input']);
</script>
