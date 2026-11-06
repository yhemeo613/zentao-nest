<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { PERMS } from '@zentao/shared';
import { oaApi, type EffortVo } from '../../api/oa.js';
import { usePagination } from '../../composables/usePagination.js';
import { describeError } from '../../lib/errors.js';
import { fmtDate } from '../../lib/format.js';
import PageHeader from '../../components/common/page-header.vue';

// 工时填报（我的流水 effort.browse；date>今天 4703；consumed>0）
const queryClient = useQueryClient();
const submitting = ref(false);

const begin = ref('');
const end = ref('');

const query = useQuery({
  queryKey: ['efforts', begin, end],
  queryFn: () => oaApi.efforts(begin.value || undefined, end.value || undefined),
});

const typeLabels: Record<string, string> = {
  task: '任务',
  story: '需求',
  bug: 'Bug',
  case: '用例',
  todo: '待办',
  custom: '自定义',
};

const totalConsumed = computed(() => (query.data.value ?? []).reduce((n, e) => n + e.consumed, 0));
const paged = usePagination(
  computed(() => query.data.value ?? []),
  20,
);

// ---- 新建 ----
const dialogOpen = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({
  objectType: 'task' as EffortVo['objectType'],
  objectId: '',
  date: new Date().toISOString().slice(0, 10),
  consumed: undefined as number | undefined,
  left: undefined as number | undefined,
  work: '',
});

const rules: FormRules = {
  date: [{ required: true, message: '请选择日期（不得晚于今天）', trigger: 'change' }],
  consumed: [{ required: true, message: '请填写消耗（>0）', trigger: 'blur' }],
  work: [{ required: true, message: '请填写工作内容', trigger: 'blur' }],
};

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || submitting.value) return;
  submitting.value = true;
  try {
    await oaApi.createEffort({
      objectType: form.objectType as 'task' | 'story' | 'bug' | 'case' | 'todo' | 'custom',
      objectId: form.objectId || undefined,
      date: form.date,
      consumed: form.consumed ?? 0,
      left: form.left,
      work: form.work,
    });
    ElMessage.success('工时已记录');
    dialogOpen.value = false;
    void queryClient.invalidateQueries({ queryKey: ['efforts'] });
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div>
    <PageHeader title="工时" description="我的工时流水（按日期区间筛选）；总计消耗">
      <template #actions>
        <el-button
          v-permission="PERMS.effort.create"
          type="primary"
          :icon="Plus"
          @click="dialogOpen = true"
          >记工时</el-button
        >
      </template>
    </PageHeader>

    <div class="mb-3 flex flex-wrap items-center gap-3">
      <el-date-picker
        v-model="begin"
        type="date"
        value-format="YYYY-MM-DD"
        placeholder="开始日期"
      />
      <span class="text-muted-foreground">至</span>
      <el-date-picker v-model="end" type="date" value-format="YYYY-MM-DD" placeholder="结束日期" />
      <span class="num text-sm text-muted-foreground"
        >区间总计：<b class="text-foreground">{{ totalConsumed }}</b> 小时</span
      >
    </div>

    <el-table
      v-loading="query.isLoading.value"
      :data="paged.paged.value"
      size="small"
      class="table-hairline"
      empty-text="暂无工时记录"
    >
      <el-table-column label="日期" width="110">
        <template #default="{ row }"
          ><span class="num">{{ fmtDate(row.date) }}</span></template
        >
      </el-table-column>
      <el-table-column label="对象类型" width="100">
        <template #default="{ row }">{{ typeLabels[row.objectType] ?? row.objectType }}</template>
      </el-table-column>
      <el-table-column label="对象" width="90">
        <template #default="{ row }"
          ><span class="num">{{ row.objectId > 0 ? '#' + row.objectId : '-' }}</span></template
        >
      </el-table-column>
      <el-table-column label="消耗" width="80">
        <template #default="{ row }"
          ><span class="num">{{ row.consumed }}</span></template
        >
      </el-table-column>
      <el-table-column label="剩余" width="80">
        <template #default="{ row }"
          ><span class="num">{{ row.left }}</span></template
        >
      </el-table-column>
      <el-table-column prop="work" label="工作内容" min-width="280" show-overflow-tooltip />
    </el-table>

    <el-pagination
      v-model:current-page="paged.page.value"
      v-model:page-size="paged.pageSize.value"
      :total="paged.total.value"
      layout="total, prev, pager, next, sizes"
      class="mt-3"
      small
    />

    <el-dialog v-model="dialogOpen" title="记工时（通用填报）" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="对象类型">
          <el-select v-model="form.objectType" class="!w-full">
            <el-option
              v-for="(label, value) in typeLabels"
              :key="value"
              :value="value"
              :label="label"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="对象 ID">
          <el-input v-model="form.objectId" placeholder="可选" class="!w-40" />
        </el-form-item>
        <el-form-item label="日期" prop="date">
          <el-date-picker
            v-model="form.date"
            type="date"
            value-format="YYYY-MM-DD"
            :disabled-date="(d: Date) => d > new Date()"
          />
        </el-form-item>
        <el-form-item label="消耗（小时）" prop="consumed">
          <el-input-number
            v-model="form.consumed"
            :min="0.1"
            :step="0.5"
            :precision="1"
            :controls="false"
            class="!w-32"
          />
        </el-form-item>
        <el-form-item label="剩余（小时）">
          <el-input-number
            v-model="form.left"
            :min="0"
            :step="0.5"
            :precision="1"
            :controls="false"
            class="!w-32"
          />
        </el-form-item>
        <el-form-item label="工作内容" prop="work">
          <el-input v-model="form.work" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">记录</el-button>
      </template>
    </el-dialog>
  </div>
</template>
