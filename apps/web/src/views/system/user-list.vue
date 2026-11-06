<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { PERMS } from '@zentao/shared';
import { systemApi, type DeptNode, type SysUserVo } from '../../api/system.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import { describeError } from '../../lib/errors.js';
import { fmtDateTime } from '../../lib/format.js';
import PageHeader from '../../components/common/page-header.vue';

// 用户管理（唯一真分页端点：page/pageSize + keyword/deptId，docs/03 §4.1）
const queryClient = useQueryClient();
const confirmAction = useConfirmAction();
const submitting = ref(false);

const keyword = ref('');
const deptFilter = ref<number | undefined>();
const page = ref(1);
const pageSize = ref(20);

const depts = useQuery({ queryKey: ['depts'], queryFn: () => systemApi.deptTree() });

const flatDepts = computed(() => {
  const out: Array<{ id: string; name: string }> = [];
  const walk = (nodes: DeptNode[]): void =>
    nodes.forEach((n) => {
      out.push({ id: n.id, name: n.name });
      walk(n.children);
    });
  walk(depts.data.value ?? []);
  return out;
});

const deptName = (id: string | number): string =>
  flatDepts.value.find((d) => d.id === String(id))?.name ?? '-';

const deptOptions = computed(() => [
  { id: 0, name: '未分配' },
  ...flatDepts.value.map((d) => ({ id: Number(d.id), name: d.name })),
]);

const query = useQuery({
  queryKey: ['users', keyword, deptFilter, page, pageSize],
  queryFn: () =>
    systemApi.users({
      keyword: keyword.value || undefined,
      deptId: deptFilter.value,
      page: page.value,
      pageSize: pageSize.value,
    }),
});

watch([keyword, deptFilter], () => (page.value = 1));

const rows = computed(() => query.data.value?.list ?? []);
const total = computed(() => query.data.value?.total ?? 0);

const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: () => systemApi.roles() });
const roleOptions = computed(() =>
  (rolesQuery.data.value ?? [])
    .filter((r) => !r.isSuper)
    .map((r) => ({ id: Number(r.id), name: r.name })),
);

// ---- 新建/编辑弹窗 ----
const dialogOpen = ref(false);
const editing = ref<SysUserVo | null>(null);
const formRef = ref<FormInstance>();
const form = reactive({
  account: '',
  password: '',
  realname: '',
  nickname: '',
  role: '',
  deptId: 0,
  email: '',
  mobile: '',
  roleIds: [] as number[],
});

const rules: FormRules = {
  account: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 3, max: 64, message: '3-64 字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入初始密码', trigger: 'blur' },
    { min: 6, max: 64, message: '6-64 字符', trigger: 'blur' },
  ],
  realname: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
};

function openCreate(): void {
  editing.value = null;
  Object.assign(form, {
    account: '',
    password: '',
    realname: '',
    nickname: '',
    role: '',
    deptId: 0,
    email: '',
    mobile: '',
    roleIds: [],
  });
  dialogOpen.value = true;
}

function openEdit(row: SysUserVo): void {
  editing.value = row;
  Object.assign(form, {
    account: row.account,
    password: '',
    realname: row.realname,
    nickname: row.nickname,
    role: row.role,
    deptId: Number(row.deptId) || 0,
    email: row.email,
    mobile: row.mobile,
    roleIds: [],
  });
  dialogOpen.value = true;
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || submitting.value) return;
  submitting.value = true;
  try {
    if (editing.value) {
      const { realname, nickname, role, deptId, email, mobile, password } = form;
      await systemApi.updateUser(editing.value.id, {
        realname,
        nickname: nickname || undefined,
        role: role || undefined,
        deptId,
        email: email || undefined,
        mobile: mobile || undefined,
        password: password || undefined,
      });
      ElMessage.success('保存成功');
    } else {
      await systemApi.createUser({ ...form, role: form.role || undefined });
      ElMessage.success('用户已创建');
    }
    dialogOpen.value = false;
    void queryClient.invalidateQueries({ queryKey: ['users'] });
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    submitting.value = false;
  }
}

// ---- 分配角色（弹窗打开时以 GET /users/:id 的 roleIds 回显） ----
const roleOpen = ref(false);
const roleUser = ref<SysUserVo | null>(null);
const pickedRoleIds = ref<number[]>([]);
const roleLoading = ref(false);

function openRoles(row: SysUserVo): void {
  roleUser.value = row;
  pickedRoleIds.value = [];
  roleLoading.value = true;
  roleOpen.value = true;
  systemApi
    .getUser(row.id)
    .then((detail) => (pickedRoleIds.value = detail.roleIds ?? []))
    .catch((error) => ElMessage.error(describeError(error).message))
    .finally(() => (roleLoading.value = false));
}

async function submitRoles(): Promise<void> {
  if (!roleUser.value) return;
  try {
    await systemApi.assignRoles(roleUser.value.id, pickedRoleIds.value);
    ElMessage.success('授权已更新');
    roleOpen.value = false;
    void queryClient.invalidateQueries({ queryKey: ['users'] });
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}

async function handleDelete(row: SysUserVo): Promise<void> {
  await confirmAction({
    title: '删除用户',
    message: `确定删除用户「${row.realname}（${row.account}）」吗？`,
    danger: true,
    run: () => systemApi.deleteUser(row.id),
    successMsg: '已删除',
    invalidate: [() => queryClient.invalidateQueries({ queryKey: ['users'] })],
  });
}

const positionLabels: Record<string, string> = {
  dev: '研发',
  qa: '测试',
  pm: '项目经理',
  po: '产品经理',
  td: '技术总监',
  pd: '产品总监',
  qd: '测试总监',
  top: '高管',
};
</script>

<template>
  <div>
    <PageHeader title="用户" description="账号 / 姓名 / 部门 / 角色授权">
      <template #actions>
        <el-button v-permission="PERMS.user.create" type="primary" :icon="Plus" @click="openCreate"
          >新建用户</el-button
        >
      </template>
    </PageHeader>

    <div class="mb-3 flex flex-wrap items-center gap-3">
      <el-input v-model="keyword" placeholder="搜索账号 / 姓名 / 昵称" clearable class="!w-64" />
      <el-select v-model="deptFilter" placeholder="按部门筛选" clearable class="!w-48">
        <el-option v-for="d in deptOptions" :key="d.id" :value="d.id" :label="d.name" />
      </el-select>
    </div>

    <el-table
      v-loading="query.isLoading.value"
      :data="rows"
      size="small"
      class="table-hairline"
      empty-text="暂无用户"
    >
      <el-table-column label="账号" width="140">
        <template #default="{ row }"
          ><span class="num">{{ row.account }}</span></template
        >
      </el-table-column>
      <el-table-column prop="realname" label="姓名" width="120" />
      <el-table-column label="昵称" width="110">
        <template #default="{ row }">{{ row.nickname || '-' }}</template>
      </el-table-column>
      <el-table-column label="职位" width="100">
        <template #default="{ row }">{{ positionLabels[row.role] ?? (row.role || '-') }}</template>
      </el-table-column>
      <el-table-column label="部门" min-width="130">
        <template #default="{ row }">{{ deptName(row.deptId) }}</template>
      </el-table-column>
      <el-table-column label="邮箱" min-width="160">
        <template #default="{ row }">{{ row.email || '-' }}</template>
      </el-table-column>
      <el-table-column label="最后登录" width="150">
        <template #default="{ row }"
          ><span class="num">{{ fmtDateTime(row.lastLoginAt) }}</span></template
        >
      </el-table-column>
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="{ row }">
          <el-button v-permission="PERMS.user.edit" link size="small" @click="openEdit(row)"
            >编辑</el-button
          >
          <el-button v-permission="PERMS.user.edit" link size="small" @click="openRoles(row)"
            >分配角色</el-button
          >
          <el-button
            v-permission="PERMS.user.delete"
            link
            type="danger"
            size="small"
            @click="handleDelete(row)"
            >删除</el-button
          >
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next, sizes"
      class="mt-3"
      small
    />

    <el-dialog v-model="dialogOpen" :title="editing ? '编辑用户' : '新建用户'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="账号" prop="account">
          <el-input v-model="form.account" :disabled="!!editing" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :placeholder="editing ? '留空则不修改' : '初始密码（6-64 位）'"
          />
        </el-form-item>
        <el-form-item label="真实姓名" prop="realname">
          <el-input v-model="form.realname" maxlength="100" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="form.nickname" maxlength="60" />
        </el-form-item>
        <el-form-item label="职位">
          <el-select v-model="form.role" class="!w-full" clearable>
            <el-option
              v-for="(label, value) in positionLabels"
              :key="value"
              :value="value"
              :label="label"
            />
            <el-option value="others" label="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="form.deptId" class="!w-full">
            <el-option v-for="d in deptOptions" :key="d.id" :value="d.id" :label="d.name" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!editing" label="初始角色">
          <el-select v-model="form.roleIds" multiple class="!w-full">
            <el-option v-for="r in roleOptions" :key="r.id" :value="r.id" :label="r.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" maxlength="90" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.mobile" maxlength="20" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="roleOpen" :title="`分配角色 — ${roleUser?.realname ?? ''}`" width="440px">
      <div v-loading="roleLoading">
        <el-select
          v-model="pickedRoleIds"
          multiple
          class="!w-full"
          placeholder="选择角色（清空保存 = 撤销全部全局角色）"
        >
          <el-option v-for="r in roleOptions" :key="r.id" :value="r.id" :label="r.name" />
        </el-select>
        <p class="mt-2 text-xs text-muted-foreground">保存为全量替换（projectId=0 全局授权）。</p>
      </div>
      <template #footer>
        <el-button @click="roleOpen = false">取消</el-button>
        <el-button type="primary" @click="submitRoles">保存授权</el-button>
      </template>
    </el-dialog>
  </div>
</template>
