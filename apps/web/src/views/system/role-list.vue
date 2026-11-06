<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { PERMS } from '@zentao/shared';
import { systemApi, type PermissionNode, type SysRoleVo } from '../../api/system.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import { describeError } from '../../lib/errors.js';
import PageHeader from '../../components/common/page-header.vue';

// 角色权限：左角色列表 + 右权限点树勾选（对齐禅道 updatePriv，docs/10 §1）
const queryClient = useQueryClient();
const confirmAction = useConfirmAction();
const submitting = ref(false);

const roles = useQuery({ queryKey: ['roles'], queryFn: () => systemApi.roles() });
const permissionTree = useQuery({
  queryKey: ['permission-tree'],
  queryFn: () => systemApi.permissionTree(),
});

const currentRole = ref<SysRoleVo | null>(null);

/** 切换角色：等树重渲染后回填勾选 */
async function selectRole(role: SysRoleVo): Promise<void> {
  currentRole.value = role;
  await nextTick();
  await watchRole(role);
}

const treeRef = ref();
const checkedLoading = ref(false);

/** 选中角色 → 拉取已授权限点并勾选 */
async function watchRole(role: SysRoleVo | null): Promise<void> {
  if (!role) return;
  checkedLoading.value = true;
  try {
    const perms = await systemApi.rolePermissions(role.id);
    // 只勾叶子（module 节点由 el-tree 半选联动）
    treeRef.value?.setCheckedKeys(perms, true);
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    checkedLoading.value = false;
  }
}

async function savePermissions(): Promise<void> {
  if (!currentRole.value) return;
  if (currentRole.value.isSuper) {
    ElMessage.warning('超级管理员角色不可显式授权');
    return;
  }
  const perms: string[] = treeRef.value?.getCheckedKeys(true) ?? [];
  submitting.value = true;
  try {
    await systemApi.setRolePermissions(currentRole.value.id, perms);
    ElMessage.success(`已保存（${perms.length} 个权限点）`);
    void queryClient.invalidateQueries({ queryKey: ['permission-tree'] });
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    submitting.value = false;
  }
}

// ---- 新建/编辑角色 ----
const dialogOpen = ref(false);
const editing = ref<SysRoleVo | null>(null);
const formRef = ref<FormInstance>();
const form = reactive({ name: '', code: '', remark: '' });

const rules: FormRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入角色编码（唯一）', trigger: 'blur' },
    { min: 2, max: 30, message: '2-30 字符', trigger: 'blur' },
  ],
};

function openCreate(): void {
  editing.value = null;
  Object.assign(form, { name: '', code: '', remark: '' });
  dialogOpen.value = true;
}

function openEdit(role: SysRoleVo): void {
  editing.value = role;
  Object.assign(form, { name: role.name, code: role.code, remark: role.remark });
  dialogOpen.value = true;
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || submitting.value) return;
  submitting.value = true;
  try {
    if (editing.value) {
      await systemApi.updateRole(editing.value.id, {
        name: form.name,
        remark: form.remark || undefined,
      });
      ElMessage.success('保存成功');
    } else {
      const created = await systemApi.createRole({ ...form, remark: form.remark || undefined });
      ElMessage.success('角色已创建');
      selectRole(created);
    }
    dialogOpen.value = false;
    void queryClient.invalidateQueries({ queryKey: ['roles'] });
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(role: SysRoleVo): Promise<void> {
  await confirmAction({
    title: '删除角色',
    message: `确定删除角色「${role.name}」吗？（已授权用户将失去对应权限）`,
    danger: true,
    run: () => systemApi.deleteRole(role.id),
    successMsg: '已删除',
    invalidate: [() => queryClient.invalidateQueries({ queryKey: ['roles'] })],
  });
}

const treeData = computed(() =>
  (permissionTree.data.value ?? []).map((node: PermissionNode) => ({
    id: node.module,
    name: node.module,
    children: node.actions.map((a) => ({
      id: a.key,
      // 种子若以 key 充当 name 则不重复展示
      name: a.name === a.key ? a.key : `${a.name}（${a.key}）`,
      status: a.status,
    })),
  })),
);

const treeProps = {
  label: 'name',
  disabled: (data: { status?: string }): boolean => data.status === 'deprecated',
};
</script>

<template>
  <div>
    <PageHeader
      title="角色权限"
      description="左侧选择角色，右侧勾选权限点（全量替换保存）；灰色项为已废弃权限点"
    >
      <template #actions>
        <el-button v-permission="PERMS.group.create" type="primary" :icon="Plus" @click="openCreate"
          >新建角色</el-button
        >
      </template>
    </PageHeader>

    <div class="grid grid-cols-[340px_1fr] gap-4">
      <!-- 角色列表 -->
      <div class="border border-border bg-card">
        <div class="border-b border-border px-4 py-2 text-sm font-medium">
          角色（{{ roles.data.value?.length ?? 0 }}）
        </div>
        <el-table
          :data="roles.data.value ?? []"
          size="small"
          class="table-hairline"
          highlight-current-row
          empty-text="暂无角色"
          @row-click="selectRole"
        >
          <el-table-column label="名称" min-width="110">
            <template #default="{ row }">
              <span>{{ row.name }}</span>
              <el-tag v-if="row.isSuper" size="small" type="warning" effect="plain" class="ml-1"
                >超管</el-tag
              >
            </template>
          </el-table-column>
          <el-table-column label="编码" min-width="90">
            <template #default="{ row }"
              ><span class="num">{{ row.code }}</span></template
            >
          </el-table-column>
          <el-table-column label="操作" width="110" fixed="right">
            <template #default="{ row }">
              <el-button
                v-permission="PERMS.group.edit"
                link
                size="small"
                @click.stop="openEdit(row)"
                >编辑</el-button
              >
              <el-button
                v-if="!row.isSuper"
                v-permission="PERMS.group.delete"
                link
                type="danger"
                size="small"
                @click.stop="handleDelete(row)"
                >删除</el-button
              >
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 权限点树 -->
      <div class="border border-border bg-card">
        <div class="flex items-center justify-between border-b border-border px-4 py-2">
          <span class="text-sm font-medium">
            权限点
            <template v-if="currentRole">— {{ currentRole.name }}</template>
            <span v-else class="ml-2 text-xs font-normal text-muted-foreground"
              >点击左侧角色查看</span
            >
          </span>
          <el-button
            v-if="currentRole"
            v-permission="PERMS.group.updatePriv"
            type="primary"
            size="small"
            :loading="submitting"
            :disabled="currentRole.isSuper"
            @click="savePermissions"
            >保存授权（全量替换）</el-button
          >
        </div>
        <div
          v-if="currentRole"
          class="max-h-[560px] overflow-y-auto p-4"
          v-loading="checkedLoading"
        >
          <el-tree
            ref="treeRef"
            :data="treeData"
            node-key="id"
            show-checkbox
            default-expand-all
            :props="treeProps"
            :key="currentRole.id"
          />
          <p class="mt-3 text-xs text-muted-foreground">
            勾选后点击「保存授权」生效；超管角色由系统锁定。
          </p>
        </div>
        <el-empty v-else description="先在左侧选择一个角色" :image-size="80" />
      </div>
    </div>

    <el-dialog v-model="dialogOpen" :title="editing ? '编辑角色' : '新建角色'" width="480px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" maxlength="30" />
        </el-form-item>
        <el-form-item label="编码" prop="code">
          <el-input v-model="form.code" :disabled="!!editing" maxlength="30" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="255" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
