<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { ArrowLeft, Plus } from '@element-plus/icons-vue';
import { PERMS } from '@zentao/shared';
import { productApi, type ModuleNode } from '../../api/product.js';
import { storyApi } from '../../api/story.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import { describeError } from '../../lib/errors.js';
import StatusTag from '../../components/common/status-tag.vue';
import ActionToolbar, { type ToolbarAction } from '../../components/common/action-toolbar.vue';
import BuildPanel from '../../components/common/build-panel.vue';
import ReleasePanel from '../../components/common/release-panel.vue';
import AclEditor from '../../components/common/acl-editor.vue';
import ActionLogPanel from '../../components/common/action-log.vue';

// 产品详情：概览 / 模块树 / 需求池（docs/10 §4）
const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const confirmAction = useConfirmAction();
const productId = computed(() => Number(route.params.id));
const activeTab = ref('overview');

const detail = useQuery({
  queryKey: ['products', productId.value],
  queryFn: () => productApi.get(productId.value),
  enabled: computed(() => Number.isFinite(productId.value) && productId.value > 0),
});
const modules = useQuery({
  queryKey: ['products', productId.value, 'modules'],
  queryFn: () => productApi.modules(productId.value),
  enabled: detail.isEnabled,
});
const stories = useQuery({
  queryKey: ['stories', { productId: productId.value }],
  queryFn: () => storyApi.list({ productId: productId.value }),
  enabled: computed(() => activeTab.value === 'stories'),
});

const invalidate = [() => queryClient.invalidateQueries({ queryKey: ['products'] })];

const actions = computed<ToolbarAction[]>(() => {
  const p = detail.data.value;
  if (!p) return [];
  const list: ToolbarAction[] = [];
  if (p.status === 'active')
    list.push({
      key: 'close',
      label: '关闭产品',
      permission: PERMS.product.close,
      type: 'danger',
      run: () =>
        confirmAction({ title: '关闭产品', run: () => productApi.close(p.id), invalidate }),
    });
  else
    list.push({
      key: 'activate',
      label: '激活产品',
      permission: PERMS.product.close,
      type: 'primary',
      run: () =>
        confirmAction({ title: '激活产品', run: () => productApi.activate(p.id), invalidate }),
    });
  return list;
});

// ---- 模块管理 ----
const moduleDialogOpen = ref(false);
const moduleEditing = ref<ModuleNode | null>(null);
const moduleParent = ref<ModuleNode | null>(null);
const moduleFormRef = ref<FormInstance>();
const moduleForm = reactive({ name: '', ownerId: '' });
const moduleRules: FormRules = {
  name: [{ required: true, message: '请输入模块名', trigger: 'blur' }],
};

function openModuleCreate(parent?: ModuleNode): void {
  moduleEditing.value = null;
  moduleParent.value = parent ?? null;
  Object.assign(moduleForm, { name: '', ownerId: '' });
  moduleDialogOpen.value = true;
}

function openModuleEdit(node: ModuleNode): void {
  moduleEditing.value = node;
  moduleParent.value = null;
  Object.assign(moduleForm, { name: node.name, ownerId: node.ownerId ?? '' });
  moduleDialogOpen.value = true;
}

async function submitModule(): Promise<void> {
  const valid = await moduleFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  try {
    if (moduleEditing.value) {
      await productApi.updateModule(moduleEditing.value.id, { ...moduleForm });
    } else {
      await productApi.createModule({
        rootId: String(productId.value),
        name: moduleForm.name,
        parentId: moduleParent.value?.id ?? 0,
        ownerId: moduleForm.ownerId || undefined,
      });
    }
    ElMessage.success('已保存');
    moduleDialogOpen.value = false;
    void queryClient.invalidateQueries({ queryKey: ['products', productId.value, 'modules'] });
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}

async function removeModule(node: ModuleNode): Promise<void> {
  await confirmAction({
    title: '删除模块',
    message: `确定删除模块「${node.name}」吗？`,
    danger: true,
    run: () => productApi.removeModule(node.id),
    invalidate: [
      () => queryClient.invalidateQueries({ queryKey: ['products', productId.value, 'modules'] }),
    ],
  });
}
</script>

<template>
  <div v-if="detail.data.value" class="space-y-4">
    <el-breadcrumb class="mb-1">
      <el-breadcrumb-item :to="{ path: '/products' }">产品</el-breadcrumb-item>
      <el-breadcrumb-item>{{ '#' + detail.data.value.id }}</el-breadcrumb-item>
    </el-breadcrumb>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <el-button link @click="router.push('/products')"
          ><el-icon><ArrowLeft /></el-icon
        ></el-button>
        <h1 class="text-lg font-semibold">{{ detail.data.value.name }}</h1>
        <StatusTag entity="product" :status="detail.data.value.status" />
      </div>
      <ActionToolbar :actions="actions" />
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="概览" name="overview">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="ID"
            ><span class="num">{{ detail.data.value.id }}</span></el-descriptions-item
          >
          <el-descriptions-item label="编码"
            ><span class="num">{{ detail.data.value.code || '-' }}</span></el-descriptions-item
          >
          <el-descriptions-item label="产品经理"
            ><span class="num">{{ detail.data.value.poId || '-' }}</span></el-descriptions-item
          >
          <el-descriptions-item label="测试负责人"
            ><span class="num">{{ detail.data.value.qdId || '-' }}</span></el-descriptions-item
          >
          <el-descriptions-item label="研发负责人"
            ><span class="num">{{ detail.data.value.rdId || '-' }}</span></el-descriptions-item
          >
          <el-descriptions-item label="访问控制">
            {{
              detail.data.value.acl === 'open'
                ? '公开'
                : detail.data.value.acl === 'private'
                  ? '私有'
                  : '自定义白名单'
            }}
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            <div class="whitespace-pre-wrap">{{ detail.data.value.desc || '-' }}</div>
          </el-descriptions-item>
        </el-descriptions>
        <ActionLogPanel class="mt-4" object-type="product" :object-id="productId" />
        <AclEditor
          class="mt-4"
          object-type="product"
          :object-id="productId"
          :acl="detail.data.value.acl"
        />
      </el-tab-pane>

      <el-tab-pane label="模块" name="modules">
        <div class="mb-3">
          <el-button
            v-permission="PERMS.product.manage"
            type="primary"
            size="small"
            :icon="Plus"
            @click="openModuleCreate()"
            >新建根模块</el-button
          >
        </div>
        <el-tree
          :data="modules.data.value ?? []"
          node-key="id"
          default-expand-all
          :expand-on-click-node="false"
          v-loading="modules.isLoading.value"
        >
          <template #default="{ data }">
            <div class="flex w-full items-center justify-between pr-2">
              <span>{{ data.name }}</span>
              <span class="flex gap-1">
                <el-button
                  v-permission="PERMS.product.manage"
                  link
                  size="small"
                  type="primary"
                  @click.stop="openModuleCreate(data)"
                >
                  子模块
                </el-button>
                <el-button
                  v-permission="PERMS.product.manage"
                  link
                  size="small"
                  @click.stop="openModuleEdit(data)"
                  >编辑</el-button
                >
                <el-button
                  v-permission="PERMS.product.manage"
                  link
                  size="small"
                  type="danger"
                  @click.stop="removeModule(data)"
                >
                  删除
                </el-button>
              </span>
            </div>
          </template>
        </el-tree>
      </el-tab-pane>

      <el-tab-pane label="构建" name="builds" lazy>
        <BuildPanel :product-id="productId" />
      </el-tab-pane>

      <el-tab-pane label="发布" name="releases" lazy>
        <ReleasePanel :product-id="productId" />
      </el-tab-pane>

      <el-tab-pane label="需求池" name="stories">
        <el-table
          v-loading="stories.isLoading.value"
          :data="stories.data.value ?? []"
          size="small"
          class="table-hairline"
          empty-text="暂无需求"
        >
          <el-table-column label="ID" width="70">
            <template #default="{ row }">
              <span
                class="num cursor-pointer text-primary"
                @click="router.push(`/stories/${row.id}`)"
                >#{{ row.id }}</span
              >
            </template>
          </el-table-column>
          <el-table-column prop="title" label="标题" min-width="260" show-overflow-tooltip />
          <el-table-column label="阶段" width="90">
            <template #default="{ row }"
              ><StatusTag entity="storyStage" :status="row.stage"
            /></template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }"
              ><StatusTag entity="story" :status="row.status"
            /></template>
          </el-table-column>
          <el-table-column label="预计" width="80">
            <template #default="{ row }"
              ><span class="num">{{ row.estimate }}</span></template
            >
          </el-table-column>
          <el-table-column label="指派给" width="110">
            <template #default="{ row }"
              ><span class="num">{{ row.assignedTo || '-' }}</span></template
            >
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="moduleDialogOpen"
      :title="moduleEditing ? '编辑模块' : '新建模块'"
      width="440px"
    >
      <el-form ref="moduleFormRef" :model="moduleForm" :rules="moduleRules" label-width="80px">
        <el-form-item label="模块名" prop="name">
          <el-input v-model="moduleForm.name" maxlength="60" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="moduleForm.ownerId" placeholder="账号，可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="moduleDialogOpen = false">取消</el-button>
        <el-button type="primary" @click="submitModule">确定</el-button>
      </template>
    </el-dialog>
  </div>
  <el-empty v-else-if="!detail.isLoading.value" description="产品不存在" />
</template>
