<script setup lang="ts">
import { MdPreview } from 'md-editor-v3';
import 'md-editor-v3/lib/preview.css';

/** Markdown 只读预览（md-editor-v3，docs/05 §1 统一 Markdown：spec/verify/steps/desc） */
const props = defineProps<{ content: string }>();
void props;
</script>

<template>
  <div class="md-view">
    <MdPreview :model-value="props.content" preview-theme="github" :code-foldable="false" />
  </div>
</template>

<style scoped>
.md-view :deep(.md-editor-previewWrapper) {
  padding: 0;
  font-size: 13.5px;
  color: var(--foreground);
}
.md-view :deep(.md-editor-preview) {
  word-break: break-word;
}
</style>
