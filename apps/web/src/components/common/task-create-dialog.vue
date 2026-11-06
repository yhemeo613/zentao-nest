<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { PERMS, TaskType } from '@zentao/shared';
import { taskApi } from '../../api/task.js';
import { describeError } from '../../lib/errors.js';
import UserSelect from './user-select.vue';

/** 任务新建弹窗（执行详情/任务列表复用，docs/10 §2） */
const props = defineProps<{
  projectId?: number | string;
  executionId?: number | string;
  storyId?: number | string;
}>();

const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ success: [taskId: number] }>();

const submitting = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({
  name: '',
  type: TaskType.Devel as string,
  pri: 3,
  estimate: undefined as number | undefined,
  assignedTo: '',
  estStarted: '',
  deadline: '',
  desc: '',
});

watch(open, (v) => {
  if (v)
    Object.assign(form, {
      name: '',
      type: TaskType.Devel,
      pri: 3,
      estimate: undefined,
      assignedTo: '',
      estStarted: '',
      deadline: '',
      desc: '',
    });
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  estimate: [{ required: true, message: '请填写预计工时', trigger: 'blur' }],
};

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || submitting.value) return;
  if (props.projectId == null || props.executionId == null) {
    ElMessage.error('缺少所属项目/执行上下文');
    return;
  }
  submitting.value = true;
  try {
    const task = await taskApi.create({
      projectId: String(props.projectId),
      executionId: String(props.executionId),
      storyId: props.storyId != null ? String(props.storyId) : undefined,
      name: form.name,
      type: form.type as never,
      pri: form.pri,
      estimate: form.estimate ?? 0,
      assignedTo: form.assignedTo || undefined,
      estStarted: form.estStarted || undefined,
      deadline: form.deadline || undefined,
      desc: form.desc || undefined,
    });
    ElMessage.success('任务已创建');
    open.value = false;
    emit('success', task.id);
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    submitting.value = false;
  }
}

const typeOptions = Object.entries({
  devel: '开发',
  test: '测试',
  design: '设计',
  study: '研究',
  discuss: '讨论',
  trans: '事务',
  misc: '其他',
} as Record<string, string>);
</script>

<template>
  <el-dialog v-model="open" title="新建任务" width="600px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" maxlength="255" />
      </el-form-item>
      <el-form-item label="类型">
        <el-select v-model="form.type" class="!w-full">
          <el-option
            v-for="[value, label] in typeOptions"
            :key="value"
            :value="value"
            :label="label"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="优先级">
        <el-radio-group v-model="form.pri">
          <el-radio :value="1">1 高</el-radio>
          <el-radio :value="2">2 中高</el-radio>
          <el-radio :value="3">3 中</el-radio>
          <el-radio :value="4">4 低</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="预计工时" prop="estimate">
        <el-input-number
          v-model="form.estimate"
          :min="0"
          :step="0.5"
          :precision="1"
          :controls="false"
          class="!w-32"
        />
      </el-form-item>
      <el-form-item label="指派给">
        <UserSelect
          v-model="form.assignedTo"
          :root-type="'execution'"
          :root-id="executionId ?? ''"
        />
      </el-form-item>
      <el-form-item label="开始日期">
        <el-date-picker v-model="form.estStarted" type="date" value-format="YYYY-MM-DD" />
      </el-form-item>
      <el-form-item label="截止日期">
        <el-date-picker v-model="form.deadline" type="date" value-format="YYYY-MM-DD" />
      </el-form-item>
      <el-form-item label="描述">
        <el-input v-model="form.desc" type="textarea" :rows="4" placeholder="支持 Markdown" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="open = false">取消</el-button>
      <el-button
        v-permission="PERMS.task.create"
        type="primary"
        :loading="submitting"
        @click="handleSubmit"
      >
        创建
      </el-button>
    </template>
  </el-dialog>
</template>
