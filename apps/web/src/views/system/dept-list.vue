<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { PERMS } from '@zentao/shared';
import { systemApi, type DeptNode } from '../../api/system.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import { describeError } from '../../lib/errors.js';
import PageHeader from '../../components/common/page-header.vue';

// 部门树（sys_dept 物化路径；有子部门/挂靠用户时删除被拒）
const queryClient = useQueryClient();
const confirmAction = useConfirmAction();
const submitting = ref(false);

const tree = useQuery({ queryKey: ['depts'], queryFn: () => systemApi.deptTree() });

const invalidate = [() => queryClient.invalidateQueries({ queryKey: ['depts'] })];

// ---- 新建/编辑弹窗 ----
const dialogOpen = ref(false);
const editing = ref<DeptNode | null>(null);
const parent = ref<DeptNode | null>(null);
const formRef = ref<FormInstance>();
const form = reactive({ name: '', manager: '', sortNo: undefined as number | undefined });

const rules: FormRules = { name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }] };

function openCreate(node?: DeptNode): void {
  editing.value = null;
  parent.value = node ?? null;
  Object.assign(form, { name: '', manager: '', sortNo: undefined });
  dialogOpen.value = true;
}

function openEdit(node: DeptNode): void {
  editing.value = node;
  parent.value = null;
  Object.assign(form, { name: node.name, manager: node.manager, sortNo: node.sortNo });
  dialogOpen.value = true;
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || submitting.value) return;
  submitting.value = true;
  try {
    if (editing.value) {
      await systemApi.updateDept(editing.value.id, { ...form });
      ElMessage.success('已保存');
    } else {
      await systemApi.createDept({
        name: form.name,
        parentId: parent.value ? Number(parent.value.id) : 0,
        manager: form.manager || undefined,
        sortNo: form.sortNo,
      });
      ElMessage.success('已创建');
    }
    dialogOpen.value = false;
    invalidate[0]();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(node: DeptNode): Promise<void> {
  await confirmAction({
    title: '删除部门',
    message: `确定删除「${node.name}」吗？（存在子部门或挂靠用户时将被拒绝）`,
    danger: true,
    run: () => systemApi.deleteDept(node.id),
    successMsg: '已删除',
    invalidate,
  });
}

const totalCount = computed(() => {
  let n = 0;
  const walk = (nodes: DeptNode[]): void =>
    nodes.forEach((d) => {
      n += 1;
      walk(d.children);
    });
  walk(tree.data.value ?? []);
  return n;
});
</script>

<template>
  <div>
    <PageHeader title="部门" description="部门树（物化路径）；用户归属部门后在用户页筛选">
      <template #actions>
        <el-button
          v-permission="PERMS.dept.manage"
          type="primary"
          :icon="Plus"
          @click="openCreate()"
          >新建根部门</el-button
        >
      </template>
    </PageHeader>

    <div class="border border-border bg-card" style="max-width: 720px">
      <el-tree
        :data="tree.data.value ?? []"
        node-key="id"
        default-expand-all
        :expand-on-click-node="false"
        v-loading="tree.isLoading.value"
        empty-text="暂无部门"
      >
        <template #default="{ data }">
          <div class="flex w-full items-center justify-between pr-2">
            <span>
              {{ data.name }}
              <span v-if="data.manager" class="num ml-2 text-xs text-muted-foreground">{{
                data.manager
              }}</span>
            </span>
            <span class="flex gap-1">
              <el-button
                v-permission="PERMS.dept.manage"
                link
                size="small"
                type="primary"
                @click.stop="openCreate(data)"
              >
                子部门
              </el-button>
              <el-button
                v-permission="PERMS.dept.manage"
                link
                size="small"
                @click.stop="openEdit(data)"
                >编辑</el-button
              >
              <el-button
                v-permission="PERMS.dept.manage"
                link
                size="small"
                type="danger"
                @click.stop="handleDelete(data)"
              >
                删除
              </el-button>
            </span>
          </div>
        </template>
      </el-tree>
    </div>
    <p class="mt-2 text-xs text-muted-foreground">共 {{ totalCount }} 个部门</p>

    <el-dialog
      v-model="dialogOpen"
      :title="editing ? '编辑部门' : parent ? `新建子部门 — ${parent.name}` : '新建根部门'"
      width="460px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" maxlength="60" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="form.manager" placeholder="账号，可选" maxlength="30" />
        </el-form-item>
        <el-form-item label="排序号">
          <el-input-number v-model="form.sortNo" :min="0" :controls="false" class="!w-32" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
