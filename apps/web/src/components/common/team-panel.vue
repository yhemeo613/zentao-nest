<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { PERMS } from '@zentao/shared';
import { teamApi, type TeamVo } from '../../api/team.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import { describeError } from '../../lib/errors.js';
import UserSelect from './user-select.vue';

/** 团队面板（project/execution 复用，docs/10 §2 业务通用组件） */
const props = defineProps<{ rootType: 'project' | 'execution'; rootId: number }>();

const queryClient = useQueryClient();
const confirmAction = useConfirmAction();
const submitting = ref(false);

const members = useQuery({
  queryKey: ['team', props.rootType, props.rootId],
  queryFn: () => teamApi.list(props.rootType, props.rootId),
  enabled: computed(() => props.rootId > 0),
});

const invalidate = [
  () => queryClient.invalidateQueries({ queryKey: ['team', props.rootType, props.rootId] }),
];

// ---- 添加成员 ----
const addOpen = ref(false);
const addRef = ref<FormInstance>();
const addForm = reactive({
  userId: '',
  role: '',
  position: '',
  limited: 0 as 0 | 1,
  days: undefined as number | undefined,
  hours: 7 as number | undefined,
});
const addRules: FormRules = {
  userId: [{ required: true, message: '请选择或输入账号', trigger: 'change' }],
};

async function submitAdd(): Promise<void> {
  const valid = await addRef.value?.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    await teamApi.add({ rootType: props.rootType, rootId: String(props.rootId), ...addForm });
    ElMessage.success('已添加');
    addOpen.value = false;
    invalidate[0]();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    submitting.value = false;
  }
}

// ---- 编辑成员 ----
const editOpen = ref(false);
const editRef = ref<FormInstance>();
const editing = ref<TeamVo | null>(null);
const editForm = reactive({
  role: '',
  position: '',
  days: undefined as number | undefined,
  hours: undefined as number | undefined,
});

function openEdit(row: TeamVo): void {
  editing.value = row;
  Object.assign(editForm, {
    role: row.role ?? '',
    position: row.position ?? '',
    days: row.days ?? undefined,
    hours: row.hours ?? undefined,
  });
  editOpen.value = true;
}

async function submitEdit(): Promise<void> {
  if (!editing.value) return;
  submitting.value = true;
  try {
    await teamApi.update(editing.value.id, { ...editForm });
    ElMessage.success('已保存');
    editOpen.value = false;
    invalidate[0]();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    submitting.value = false;
  }
}

async function removeMember(row: TeamVo): Promise<void> {
  await confirmAction({
    title: '移除成员',
    message: `确定移除成员「${row.userId}」吗？`,
    danger: true,
    run: () => teamApi.remove(row.id),
    successMsg: '已移除',
    invalidate,
  });
}
</script>

<template>
  <div>
    <div class="mb-3">
      <el-button
        v-permission="PERMS.project.teamManage"
        type="primary"
        size="small"
        :icon="Plus"
        @click="addOpen = true"
      >
        添加成员
      </el-button>
    </div>

    <el-table
      :data="members.data.value ?? []"
      size="small"
      class="table-hairline"
      empty-text="暂无成员"
    >
      <el-table-column label="账号" min-width="120">
        <template #default="{ row }"
          ><span class="num">{{ row.userId }}</span></template
        >
      </el-table-column>
      <el-table-column label="角色" width="110">
        <template #default="{ row }">{{ row.role || '-' }}</template>
      </el-table-column>
      <el-table-column label="职位" width="110">
        <template #default="{ row }">{{ row.position || '-' }}</template>
      </el-table-column>
      <el-table-column label="受限" width="80">
        <template #default="{ row }">
          <el-tag v-if="row.limited" size="small" type="warning" effect="plain">limited</el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="可用工时/日" width="110">
        <template #default="{ row }"
          ><span class="num">{{ row.hours ?? '-' }}</span></template
        >
      </el-table-column>
      <el-table-column label="工时(预计/消耗/剩余)" width="170">
        <template #default="{ row }">
          <span class="num">{{ row.estimate }} / {{ row.consumed }} / {{ row.left }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="130" fixed="right">
        <template #default="{ row }">
          <el-button
            v-permission="PERMS.project.teamManage"
            link
            size="small"
            @click="openEdit(row)"
            >编辑</el-button
          >
          <el-button
            v-permission="PERMS.project.teamManage"
            link
            size="small"
            type="danger"
            @click="removeMember(row)"
            >移除</el-button
          >
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="addOpen" title="添加成员" width="460px">
      <el-form ref="addRef" :model="addForm" :rules="addRules" label-width="100px">
        <el-form-item label="账号" prop="userId">
          <UserSelect
            v-model="addForm.userId"
            :root-type="rootType"
            :root-id="rootId"
            placeholder="选择或输入账号"
          />
        </el-form-item>
        <el-form-item label="角色">
          <el-input v-model="addForm.role" placeholder="可选" />
        </el-form-item>
        <el-form-item label="职位">
          <el-input v-model="addForm.position" placeholder="可选" />
        </el-form-item>
        <el-form-item label="受限成员">
          <el-switch v-model="addForm.limited" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="可用工时/日">
          <el-input-number v-model="addForm.hours" :min="0" :max="9.9" :step="0.5" :precision="1" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitAdd">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editOpen" title="编辑成员" width="460px">
      <el-form ref="editRef" :model="editForm" label-width="100px">
        <el-form-item label="账号">
          <span class="num">{{ editing?.userId }}</span>
        </el-form-item>
        <el-form-item label="角色">
          <el-input v-model="editForm.role" />
        </el-form-item>
        <el-form-item label="职位">
          <el-input v-model="editForm.position" />
        </el-form-item>
        <el-form-item label="可用工时/日">
          <el-input-number
            v-model="editForm.hours"
            :min="0"
            :max="9.9"
            :step="0.5"
            :precision="1"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
