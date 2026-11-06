<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { PERMS, ReleaseStatus } from '@zentao/shared';
import { releaseApi, type ReleaseVo } from '../../api/release.js';
import { buildApi } from '../../api/build.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import { describeError } from '../../lib/errors.js';
import { fmtDate } from '../../lib/format.js';
import StatusDot from './status-dot.vue';

/** 发布面板（产品详情页签；发布置需求 stage=released；normal 不可删须先停止维护） */
const props = defineProps<{ productId: number }>();

const queryClient = useQueryClient();
const confirmAction = useConfirmAction();
const submitting = ref(false);

const releases = useQuery({
  queryKey: ['releases', props.productId],
  queryFn: () => releaseApi.list(props.productId),
});
const builds = useQuery({
  queryKey: ['builds', props.productId],
  queryFn: () => buildApi.list(props.productId),
});

const invalidate = [() => queryClient.invalidateQueries({ queryKey: ['releases'] })];

const createOpen = ref(false);
const createRef = ref<FormInstance>();
const createForm = reactive({ name: '', buildIds: [] as string[], date: '', desc: '' });

const createRules: FormRules = {
  name: [{ required: true, message: '请输入发布名称', trigger: 'blur' }],
  buildIds: [{ required: true, message: '请选择包含的构建', trigger: 'change' }],
  date: [{ required: true, message: '请选择计划发布日期', trigger: 'change' }],
};

function openCreate(): void {
  Object.assign(createForm, {
    name: '',
    buildIds: [],
    date: new Date().toISOString().slice(0, 10),
    desc: '',
  });
  createOpen.value = true;
}

async function submitCreate(): Promise<void> {
  const valid = await createRef.value?.validate().catch(() => false);
  if (!valid || submitting.value) return;
  submitting.value = true;
  try {
    await releaseApi.create({
      productId: String(props.productId),
      name: createForm.name,
      buildIds: createForm.buildIds,
      date: createForm.date,
      desc: createForm.desc || undefined,
    });
    ElMessage.success('发布已创建（自动汇总构建的需求/Bug）');
    createOpen.value = false;
    invalidate[0]();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    submitting.value = false;
  }
}

async function publish(row: ReleaseVo): Promise<void> {
  await confirmAction({
    title: '发布',
    message: `确定发布「${row.name}」吗？包含需求将进入已发布（released）阶段。`,
    run: () => releaseApi.publish(row.id),
    successMsg: '发布成功',
    invalidate,
  });
}

async function terminate(row: ReleaseVo): Promise<void> {
  await confirmAction({
    title: '停止维护',
    message: `确定将「${row.name}」置为停止维护吗？`,
    run: () => releaseApi.changeStatus(row.id, 'terminate'),
    successMsg: '已停止维护',
    invalidate,
  });
}

async function activate(row: ReleaseVo): Promise<void> {
  await confirmAction({
    title: '重新激活',
    message: `确定恢复「${row.name}」为已发布状态吗？`,
    run: () => releaseApi.changeStatus(row.id, 'activate'),
    successMsg: '已重新激活',
    invalidate,
  });
}

async function handleDelete(row: ReleaseVo): Promise<void> {
  await confirmAction({
    title: '删除发布',
    message: `确定删除「${row.name}」吗？（已发布状态须先停止维护）`,
    danger: true,
    run: () => releaseApi.remove(row.id),
    successMsg: '已删除',
    invalidate,
  });
}

const buildCount = (r: ReleaseVo): number =>
  r.buildIds ? r.buildIds.split(',').filter(Boolean).length : 0;
</script>

<template>
  <div>
    <div class="mb-3">
      <el-button
        v-permission="PERMS.release.create"
        type="primary"
        size="small"
        :icon="Plus"
        @click="openCreate"
      >
        新建发布
      </el-button>
    </div>

    <el-table
      :data="releases.data.value ?? []"
      size="small"
      class="table-hairline"
      empty-text="暂无发布"
    >
      <el-table-column prop="name" label="名称" min-width="200" show-overflow-tooltip />
      <el-table-column label="状态" width="90">
        <template #default="{ row }"><StatusDot entity="release" :status="row.status" /></template>
      </el-table-column>
      <el-table-column label="包含构建" width="80">
        <template #default="{ row }"
          ><span class="num">{{ buildCount(row) }}</span></template
        >
      </el-table-column>
      <el-table-column label="发布日期" width="110">
        <template #default="{ row }"
          ><span class="num">{{ fmtDate(row.releasedDate) }}</span></template
        >
      </el-table-column>
      <el-table-column label="剩余 Bug" width="80">
        <template #default="{ row }">
          <span
            class="num"
            :class="
              (row.leftBugs?.split(',').filter(Boolean).length ?? 0) > 0 ? 'text-destructive' : ''
            "
          >
            {{ row.leftBugs ? row.leftBugs.split(',').filter(Boolean).length : 0 }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.status === ReleaseStatus.Wait || row.status === ReleaseStatus.Fail"
            v-permission="PERMS.release.publish"
            link
            type="primary"
            size="small"
            @click="publish(row)"
            >发布</el-button
          >
          <el-button
            v-if="row.status === ReleaseStatus.Normal"
            v-permission="PERMS.release.changeStatus"
            link
            type="warning"
            size="small"
            @click="terminate(row)"
            >停止维护</el-button
          >
          <el-button
            v-if="row.status === ReleaseStatus.Terminate"
            v-permission="PERMS.release.changeStatus"
            link
            type="primary"
            size="small"
            @click="activate(row)"
            >重新激活</el-button
          >
          <el-button
            v-if="row.status !== ReleaseStatus.Normal"
            v-permission="PERMS.release.delete"
            link
            type="danger"
            size="small"
            @click="handleDelete(row)"
            >删除</el-button
          >
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="createOpen" title="新建发布" width="560px">
      <el-form ref="createRef" :model="createForm" :rules="createRules" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="createForm.name" maxlength="255" />
        </el-form-item>
        <el-form-item label="包含构建" prop="buildIds">
          <el-select v-model="createForm.buildIds" multiple filterable class="!w-full">
            <el-option
              v-for="b in builds.data.value ?? []"
              :key="b.id"
              :value="String(b.id)"
              :label="`#${b.id} ${b.name}`"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="计划日期" prop="date">
          <el-date-picker v-model="createForm.date" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="createForm.desc" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>
