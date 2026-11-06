<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { PERMS } from '@zentao/shared';
import { bugApi } from '../../api/bug.js';
import { productApi } from '../../api/product.js';
import { describeError } from '../../lib/errors.js';
import UserSelect from './user-select.vue';

/** Bug 新建弹窗（提 Bug / 测试单失败转 Bug 复用；prefill 传入预填内容，docs/10 §2） */
const props = defineProps<{
  /** 失败转 Bug 预填（bug-prefill 契约） */
  prefill?: {
    productId?: number;
    title: string;
    steps: string;
    openedBuild?: string;
    projectId?: number;
    executionId?: number;
    storyId?: number;
    caseId?: number;
    resultId?: number;
    testtaskId?: number;
  } | null;
}>();

const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ success: [bugId: number] }>();

const queryClient = useQueryClient();
const submitting = ref(false);
const formRef = ref<FormInstance>();

const form = reactive({
  productId: '' as string,
  title: '',
  steps: '',
  openedBuild: '',
  severity: 3,
  pri: 3,
  assignedTo: '',
});

const productList = useQuery({
  queryKey: ['products'],
  queryFn: () => productApi.list(),
  enabled: computed(() => open.value),
});

watch(
  open,
  (v) => {
    if (!v) return;
    Object.assign(form, {
      productId: props.prefill?.productId ? String(props.prefill.productId) : '',
      title: props.prefill?.title ?? '',
      steps: props.prefill?.steps ?? '',
      openedBuild: props.prefill?.openedBuild ?? '',
      severity: 3,
      pri: 3,
      assignedTo: '',
    });
  },
  { immediate: true },
);

const rules: FormRules = {
  productId: [{ required: true, message: '请选择所属产品', trigger: 'change' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  steps: [{ required: true, message: '请填写重现步骤', trigger: 'blur' }],
  openedBuild: [{ required: true, message: '请输入发现构建（ID）', trigger: 'blur' }],
};

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || submitting.value) return;
  submitting.value = true;
  try {
    const bug = await bugApi.create({
      productId: form.productId,
      title: form.title,
      steps: form.steps,
      openedBuild: form.openedBuild,
      severity: form.severity,
      pri: form.pri,
      assignedTo: form.assignedTo || undefined,
      projectId: props.prefill?.projectId ? String(props.prefill.projectId) : undefined,
      executionId: props.prefill?.executionId ? String(props.prefill.executionId) : undefined,
      storyId: props.prefill?.storyId ? String(props.prefill.storyId) : undefined,
      caseId: props.prefill?.caseId ? String(props.prefill.caseId) : undefined,
      resultId: props.prefill?.resultId,
      testtaskId: props.prefill?.testtaskId,
    });
    ElMessage.success('Bug 已提交');
    open.value = false;
    void queryClient.invalidateQueries({ queryKey: ['bugs'] });
    emit('success', bug.id);
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <el-dialog v-model="open" title="提交 Bug" width="680px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="所属产品" prop="productId">
        <el-select v-model="form.productId" filterable class="!w-full">
          <el-option
            v-for="p in productList.data.value ?? []"
            :key="p.id"
            :value="String(p.id)"
            :label="p.name"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="标题" prop="title">
        <el-input v-model="form.title" maxlength="255" />
      </el-form-item>
      <el-form-item label="重现步骤" prop="steps">
        <el-input v-model="form.steps" type="textarea" :rows="6" placeholder="支持 Markdown" />
      </el-form-item>
      <el-form-item label="发现构建" prop="openedBuild">
        <el-input v-model="form.openedBuild" placeholder="构建 ID" class="!w-56" />
      </el-form-item>
      <el-form-item label="严重程度">
        <el-radio-group v-model="form.severity">
          <el-radio :value="1">1 致命</el-radio>
          <el-radio :value="2">2 严重</el-radio>
          <el-radio :value="3">3 一般</el-radio>
          <el-radio :value="4">4 轻微</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="优先级">
        <el-radio-group v-model="form.pri">
          <el-radio :value="1">1</el-radio>
          <el-radio :value="2">2</el-radio>
          <el-radio :value="3">3</el-radio>
          <el-radio :value="4">4</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="指派给">
        <UserSelect v-model="form.assignedTo" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="open = false">取消</el-button>
      <el-button
        v-permission="PERMS.bug.create"
        type="primary"
        :loading="submitting"
        @click="handleSubmit"
      >
        提交
      </el-button>
    </template>
  </el-dialog>
</template>
