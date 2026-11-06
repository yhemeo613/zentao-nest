<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { describeError } from '../../lib/errors.js';
import UserSelect from './user-select.vue';

/**
 * 行内指派单元格（禅道标志性交互，docs/10 §6.1）：点击指派人弹出下拉，直接保存，不进详情。
 */
const props = defineProps<{
  value: string | null;
  save: (userId: string) => Promise<unknown>;
  /** 下拉成员来源（可选：项目/执行团队） */
  rootType?: 'project' | 'execution';
  rootId?: number | string;
}>();

const open = ref(false);
const picked = ref('');
const saving = ref(false);
const emit = defineEmits<{ success: [] }>();

async function submit(): Promise<void> {
  if (!picked.value) return;
  saving.value = true;
  try {
    await props.save(picked.value);
    ElMessage.success('已指派');
    open.value = false;
    emit('success');
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <el-popover v-model:visible="open" trigger="click" width="260">
    <template #reference>
      <span
        class="num cursor-pointer border-b border-dashed border-transparent hover:border-primary hover:text-primary"
        @click="
          picked = props.value ?? '';
          open = true;
        "
      >
        {{ props.value || '未指派' }}
      </span>
    </template>
    <div class="space-y-2">
      <UserSelect
        v-model="picked"
        :root-type="rootType"
        :root-id="rootId"
        placeholder="选择或输入账号"
      />
      <div class="text-right">
        <el-button size="small" @click="open = false">取消</el-button>
        <el-button size="small" type="primary" :loading="saving" @click="submit">确定</el-button>
      </div>
    </div>
  </el-popover>
</template>
