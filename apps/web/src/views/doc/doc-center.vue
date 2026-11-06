<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { MdEditor as Editor } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';
import { PERMS } from '@zentao/shared';
import { docApi, type DocContentVo, type DocVo } from '../../api/doc.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import { describeError } from '../../lib/errors.js';
import { fmtDateTime } from '../../lib/format.js';
import PageHeader from '../../components/common/page-header.vue';
import MarkdownView from '../../components/common/markdown-view.vue';

// 文档中心：空间 → 库 → 文档；Markdown 编辑 + 版本化（docs/05 §1 统一 Markdown）
const queryClient = useQueryClient();
const confirmAction = useConfirmAction();
const submitting = ref(false);

// ---- 三级导航 ----
const spaces = useQuery({ queryKey: ['doc-spaces'], queryFn: () => docApi.spaces() });
const spaceId = ref<string>('');
const libs = useQuery({
  queryKey: ['doc-libs', spaceId],
  queryFn: () => docApi.libs(spaceId.value),
  enabled: computed(() => spaceId.value !== ''),
});
const libId = ref<string>('');
const docs = useQuery({
  queryKey: ['doc-libs-docs', libId],
  queryFn: () => docApi.docs(libId.value),
  enabled: computed(() => libId.value !== ''),
});

function selectSpace(id: string): void {
  spaceId.value = id;
  libId.value = '';
  currentDoc.value = null;
}

function selectLib(id: string): void {
  libId.value = id;
  currentDoc.value = null;
}

// ---- 当前文档 ----
const currentDoc = ref<DocVo | null>(null);
const viewingVersion = ref<string>('');

const detail = useQuery({
  queryKey: ['docs', () => currentDoc.value?.id, viewingVersion],
  queryFn: () => docApi.get(currentDoc.value!.id, viewingVersion.value || undefined),
  enabled: computed(() => currentDoc.value != null),
});

function selectDoc(doc: DocVo): void {
  currentDoc.value = doc;
  viewingVersion.value = '';
  editing.value = false;
}

// ---- 编辑（md-editor-v3） ----
const editing = ref(false);
const editorContent = ref('');
const editorTitle = ref('');

function startEdit(): void {
  if (!detail.data.value) return;
  editorContent.value = detail.data.value.content ?? '';
  editorTitle.value = detail.data.value.title;
  editing.value = true;
}

async function saveEdit(): Promise<void> {
  if (!currentDoc.value) return;
  submitting.value = true;
  try {
    const result = await docApi.update(currentDoc.value.id, {
      title: editorTitle.value || undefined,
      content: editorContent.value,
    });
    ElMessage.success(`已保存（当前 v${result.version}）`);
    editing.value = false;
    void queryClient.invalidateQueries({ queryKey: ['docs'] });
    viewingVersion.value = '';
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    submitting.value = false;
  }
}

// ---- 版本历史 ----
const versionsOpen = ref(false);
const versions = useQuery({
  queryKey: ['doc-versions', () => currentDoc.value?.id],
  queryFn: () => docApi.versions(currentDoc.value!.id),
  enabled: computed(() => versionsOpen.value),
});

function viewVersion(v: DocContentVo): void {
  viewingVersion.value = String(v.version);
  versionsOpen.value = false;
  editing.value = false;
}

// ---- 新建文档 ----
const createOpen = ref(false);
const createRef = ref<FormInstance>();
const createForm = reactive({ title: '', content: '' });

const createRules: FormRules = {
  title: [{ required: true, message: '请输入文档标题', trigger: 'blur' }],
};

function openCreate(): void {
  if (!libId.value) {
    ElMessage.warning('请先选择文档库');
    return;
  }
  Object.assign(createForm, { title: '', content: '' });
  createOpen.value = true;
}

async function submitCreate(): Promise<void> {
  const valid = await createRef.value?.validate().catch(() => false);
  if (!valid || submitting.value) return;
  submitting.value = true;
  try {
    const created = await docApi.create({
      libId: libId.value,
      title: createForm.title,
      content: createForm.content || undefined,
    });
    ElMessage.success('文档已创建');
    createOpen.value = false;
    void queryClient.invalidateQueries({ queryKey: ['doc-libs-docs'] });
    selectDoc(created);
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    submitting.value = false;
  }
}

// ---- 新建库 ----
async function createLib(): Promise<void> {
  if (!spaceId.value) return;
  try {
    const { value } = await ElMessageBox.prompt('输入文档库名称', '新建文档库', {
      inputPattern: /\S+/,
      inputErrorMessage: '名称不能为空',
    });
    await docApi.createLib({ spaceId: spaceId.value, name: value });
    ElMessage.success('文档库已创建');
    void queryClient.invalidateQueries({ queryKey: ['doc-libs'] });
  } catch {
    /* 取消 */
  }
}

async function handleDelete(doc: DocVo): Promise<void> {
  await confirmAction({
    title: '删除文档',
    message: `确定删除「${doc.title}」吗？（全部正文版本一并清除）`,
    danger: true,
    run: () => docApi.remove(doc.id),
    successMsg: '已删除',
    invalidate: [() => queryClient.invalidateQueries({ queryKey: ['doc-libs-docs'] })],
  });
  if (currentDoc.value?.id === doc.id) currentDoc.value = null;
}
</script>

<template>
  <div>
    <PageHeader title="文档" description="空间 → 库 → 文档；Markdown 正文随保存自动版本化">
      <template #actions>
        <el-button v-permission="PERMS.doc.create" type="primary" :icon="Plus" @click="openCreate"
          >新建文档</el-button
        >
      </template>
    </PageHeader>

    <div class="grid grid-cols-[300px_1fr] gap-4">
      <!-- 左：空间/库/文档 -->
      <div class="space-y-3">
        <div class="border border-border bg-card p-3">
          <div class="mb-2 text-xs text-muted-foreground">文档空间</div>
          <el-select
            v-model="spaceId"
            placeholder="选择空间"
            class="!w-full"
            @change="(v: string) => selectSpace(v)"
          >
            <el-option
              v-for="s in spaces.data.value ?? []"
              :key="s.id"
              :value="s.id"
              :label="`${s.name}（${s.objectType}）`"
            />
          </el-select>
          <div class="mt-3 text-xs text-muted-foreground">文档库</div>
          <div class="mt-1 space-y-1">
            <div
              v-for="lib in libs.data.value ?? []"
              :key="lib.id"
              class="cursor-pointer rounded px-2 py-1 text-sm hover:bg-accent"
              :class="libId === lib.id ? 'bg-accent text-primary' : ''"
              @click="selectLib(lib.id)"
            >
              {{ lib.name }}
            </div>
            <div
              v-if="spaceId && (libs.data.value ?? []).length === 0"
              class="text-xs text-muted-foreground"
            >
              暂无文档库
            </div>
          </div>
          <el-button
            v-if="spaceId"
            v-permission="PERMS.doc.manageLib"
            link
            type="primary"
            size="small"
            class="mt-2"
            @click="createLib"
            >新建文档库</el-button
          >
        </div>

        <div v-if="libId" class="border border-border bg-card p-3">
          <div class="mb-2 text-xs text-muted-foreground">文档列表</div>
          <div
            v-for="doc in docs.data.value ?? []"
            :key="doc.id"
            class="group cursor-pointer rounded px-2 py-1 text-sm hover:bg-accent"
            :class="currentDoc?.id === doc.id ? 'bg-accent text-primary' : ''"
            @click="selectDoc(doc)"
          >
            <div class="flex items-center justify-between">
              <span class="truncate">{{ doc.title }}</span>
              <el-button
                v-permission="PERMS.doc.delete"
                link
                type="danger"
                size="small"
                class="opacity-0 group-hover:opacity-100"
                @click.stop="handleDelete(doc)"
                >删</el-button
              >
            </div>
            <div class="num text-xs text-muted-foreground">
              v{{ doc.version }} · {{ doc.views }} 次浏览
            </div>
          </div>
          <div v-if="(docs.data.value ?? []).length === 0" class="text-xs text-muted-foreground">
            暂无文档
          </div>
        </div>
      </div>

      <!-- 右：正文/编辑 -->
      <div class="border border-border bg-card">
        <template v-if="currentDoc">
          <div class="flex items-center justify-between border-b border-border px-4 py-2">
            <span class="text-sm font-medium">
              {{ editing ? '编辑中：' : '' }}{{ detail.data.value?.title ?? currentDoc.title }}
              <span v-if="!editing" class="num ml-2 text-xs text-muted-foreground">
                v{{ detail.data.value?.version ?? currentDoc.version
                }}{{ viewingVersion ? `（正在查看历史版本 v${viewingVersion}）` : '' }}
              </span>
            </span>
            <div class="flex gap-2">
              <el-popover v-model:visible="versionsOpen" trigger="click" width="320">
                <template #reference>
                  <el-button v-permission="PERMS.doc.view" size="small">版本历史</el-button>
                </template>
                <div class="max-h-64 overflow-y-auto">
                  <div
                    v-for="v in versions.data.value ?? []"
                    :key="v.id"
                    class="cursor-pointer border-b border-border/60 px-1 py-1.5 text-xs hover:bg-accent"
                    @click="viewVersion(v)"
                  >
                    <span class="num font-medium">v{{ v.version }}</span>
                    <span class="num ml-2">{{ v.editedBy }}</span>
                    <span class="num ml-2 text-muted-foreground">{{
                      fmtDateTime(v.createdAt)
                    }}</span>
                  </div>
                </div>
              </el-popover>
              <el-button
                v-if="!editing && viewingVersion === ''"
                v-permission="PERMS.doc.edit"
                type="primary"
                size="small"
                @click="startEdit"
                >编辑</el-button
              >
              <el-button v-if="viewingVersion !== ''" size="small" @click="viewingVersion = ''"
                >回到最新版</el-button
              >
            </div>
          </div>

          <div v-if="editing" class="p-3">
            <el-input v-model="editorTitle" class="mb-2" placeholder="标题" />
            <Editor v-model="editorContent" :style="{ height: '420px' }" />
            <div class="mt-2 text-right">
              <el-button @click="editing = false">取消</el-button>
              <el-button
                v-permission="PERMS.doc.edit"
                type="primary"
                :loading="submitting"
                @click="saveEdit"
              >
                保存（内容变化自动 +1 版本）
              </el-button>
            </div>
          </div>
          <div v-else class="p-4" v-loading="detail.isLoading.value">
            <MarkdownView :content="detail.data.value?.content || '（空文档）'" />
          </div>
        </template>
        <el-empty v-else description="从左侧选择文档，或新建一个" :image-size="80" />
      </div>
    </div>

    <el-dialog v-model="createOpen" title="新建文档" width="640px">
      <el-form ref="createRef" :model="createForm" :rules="createRules" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="createForm.title" maxlength="90" />
        </el-form-item>
        <el-form-item label="正文">
          <el-input
            v-model="createForm.content"
            type="textarea"
            :rows="6"
            placeholder="Markdown，可留空后进入编辑"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>
