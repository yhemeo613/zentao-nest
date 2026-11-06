<script setup lang="ts">
import { reactive, ref, computed } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { PERMS } from '@zentao/shared';
import { buildApi, type BuildVo } from '../../api/build.js';
import { storyApi } from '../../api/story.js';
import { bugApi } from '../../api/bug.js';
import { useAuthStore } from '../../stores/auth.js';
import { describeError } from '../../lib/errors.js';
import { fmtDate } from '../../lib/format.js';
import UserSelect from './user-select.vue';

/** 构建面板（产品详情页签；无状态字段，关联 Bug 自动置已解决） */
const props = defineProps<{ productId: number }>();

const auth = useAuthStore();
const queryClient = useQueryClient();
const submitting = ref(false);

const builds = useQuery({
  queryKey: ['builds', props.productId],
  queryFn: () => buildApi.list(props.productId),
});

const invalidate = [() => queryClient.invalidateQueries({ queryKey: ['builds'] })];

// ---- 新建构建 ----
const createOpen = ref(false);
const createRef = ref<FormInstance>();
const createForm = reactive({ name: '', date: '', builder: '', scmPath: '', desc: '' });

const createRules: FormRules = {
  name: [{ required: true, message: '请输入构建名称（同产品唯一）', trigger: 'blur' }],
  date: [{ required: true, message: '请选择构建日期', trigger: 'change' }],
  builder: [{ required: true, message: '请填写构建人', trigger: 'change' }],
};

function openCreate(): void {
  Object.assign(createForm, {
    name: '',
    date: new Date().toISOString().slice(0, 10),
    builder: auth.user?.account ?? '',
    scmPath: '',
    desc: '',
  });
  createOpen.value = true;
}

async function submitCreate(): Promise<void> {
  const valid = await createRef.value?.validate().catch(() => false);
  if (!valid || submitting.value) return;
  submitting.value = true;
  try {
    await buildApi.create({
      productId: String(props.productId),
      name: createForm.name,
      date: createForm.date,
      builder: createForm.builder,
      scmPath: createForm.scmPath || undefined,
      desc: createForm.desc || undefined,
    });
    ElMessage.success('构建已创建');
    createOpen.value = false;
    invalidate[0]();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    submitting.value = false;
  }
}

// ---- 关联需求 / 关联 Bug（多选弹窗） ----
const linkOpen = ref(false);
const linkKind = ref<'story' | 'bug'>('story');
const linkTarget = ref<BuildVo | null>(null);
const pickedIds = ref<string[]>([]);

const productStories = useQuery({
  queryKey: ['stories', { productId: props.productId }],
  queryFn: () => storyApi.list({ productId: props.productId }),
  enabled: computed(() => linkOpen.value && linkKind.value === 'story'),
});
const productBugs = useQuery({
  queryKey: ['bugs', { productId: props.productId }],
  queryFn: () => bugApi.list({ productId: props.productId }),
  enabled: computed(() => linkOpen.value && linkKind.value === 'bug'),
});

function openLink(build: BuildVo, kind: 'story' | 'bug'): void {
  linkTarget.value = build;
  linkKind.value = kind;
  pickedIds.value = [];
  linkOpen.value = true;
}

async function submitLink(): Promise<void> {
  if (!linkTarget.value || pickedIds.value.length === 0) return;
  try {
    if (linkKind.value === 'story') {
      const n = await buildApi.linkStories(linkTarget.value.id, pickedIds.value);
      ElMessage.success(`已关联 ${n} 条需求`);
    } else {
      const n = await buildApi.linkBugs(linkTarget.value.id, pickedIds.value);
      ElMessage.success(`已关联 ${n} 个 Bug（未解决的已自动置已解决并回指开单人）`);
    }
    linkOpen.value = false;
    invalidate[0]();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}

// ---- 构建详情（需求/Bug 关联清单） ----
const detailOpen = ref(false);
const detail = useQuery({
  queryKey: ['builds', () => linkTarget.value?.id, 'detail'],
  queryFn: () => buildApi.get(linkTarget.value!.id),
  enabled: computed(() => detailOpen.value && linkTarget.value != null),
});

function openDetail(build: BuildVo): void {
  linkTarget.value = build;
  detailOpen.value = true;
}

const storyCount = (b: BuildVo): number =>
  b.stories ? b.stories.split(',').filter(Boolean).length : 0;
const bugCount = (b: BuildVo): number => (b.bugs ? b.bugs.split(',').filter(Boolean).length : 0);
</script>

<template>
  <div>
    <div class="mb-3">
      <el-button
        v-permission="PERMS.build.create"
        type="primary"
        size="small"
        :icon="Plus"
        @click="openCreate"
      >
        新建构建
      </el-button>
    </div>

    <el-table
      :data="builds.data.value ?? []"
      size="small"
      class="table-hairline"
      empty-text="暂无构建"
    >
      <el-table-column prop="name" label="名称" min-width="220" show-overflow-tooltip />
      <el-table-column label="构建日期" width="110">
        <template #default="{ row }"
          ><span class="num">{{ fmtDate(row.date) }}</span></template
        >
      </el-table-column>
      <el-table-column label="构建人" width="110">
        <template #default="{ row }"
          ><span class="num">{{ row.builder }}</span></template
        >
      </el-table-column>
      <el-table-column label="关联需求" width="90">
        <template #default="{ row }"
          ><span class="num">{{ storyCount(row) }}</span></template
        >
      </el-table-column>
      <el-table-column label="关联 Bug" width="90">
        <template #default="{ row }"
          ><span class="num">{{ bugCount(row) }}</span></template
        >
      </el-table-column>
      <el-table-column label="操作" width="190" fixed="right">
        <template #default="{ row }">
          <el-button
            v-permission="PERMS.build.linkStory"
            link
            size="small"
            type="primary"
            @click="openLink(row, 'story')"
            >关联需求</el-button
          >
          <el-button
            v-permission="PERMS.build.linkBug"
            link
            size="small"
            type="primary"
            @click="openLink(row, 'bug')"
            >关联 Bug</el-button
          >
          <el-button v-permission="PERMS.build.view" link size="small" @click="openDetail(row)"
            >详情</el-button
          >
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="createOpen" title="新建构建" width="560px">
      <el-form ref="createRef" :model="createForm" :rules="createRules" label-width="90px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="createForm.name" maxlength="150" />
        </el-form-item>
        <el-form-item label="构建日期" prop="date">
          <el-date-picker v-model="createForm.date" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="构建人" prop="builder">
          <UserSelect v-model="createForm.builder" />
        </el-form-item>
        <el-form-item label="代码路径">
          <el-input v-model="createForm.scmPath" placeholder="可选，如 repo tag/commit" />
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

    <el-dialog
      v-model="linkOpen"
      :title="linkKind === 'story' ? '关联需求' : '关联 Bug'"
      width="640px"
    >
      <el-select
        v-model="pickedIds"
        multiple
        filterable
        class="!w-full"
        placeholder="选择要关联的对象"
      >
        <template v-if="linkKind === 'story'">
          <el-option
            v-for="s in productStories.data.value ?? []"
            :key="s.id"
            :value="String(s.id)"
            :label="`#${s.id} ${s.title}`"
          />
        </template>
        <template v-else>
          <el-option
            v-for="b in productBugs.data.value ?? []"
            :key="b.id"
            :value="String(b.id)"
            :label="`#${b.id} ${b.title}`"
          />
        </template>
      </el-select>
      <p v-if="linkKind === 'bug'" class="mt-2 text-xs text-muted-foreground">
        未解决的 Bug 关联后将自动置为「已解决/fixed」，解决构建=本构建，指派回开单人验证。
      </p>
      <template #footer>
        <el-button @click="linkOpen = false">取消</el-button>
        <el-button type="primary" @click="submitLink">确定关联</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailOpen" :title="`构建详情 — ${linkTarget?.name ?? ''}`" width="720px">
      <div v-loading="detail.isLoading.value">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="构建日期"
            ><span class="num">{{ fmtDate(detail.data.value?.date) }}</span></el-descriptions-item
          >
          <el-descriptions-item label="构建人"
            ><span class="num">{{ detail.data.value?.builder }}</span></el-descriptions-item
          >
          <el-descriptions-item label="代码路径" :span="2">
            <span class="num">{{ detail.data.value?.scmPath || '-' }}</span>
          </el-descriptions-item>
        </el-descriptions>
        <div class="mt-3 text-sm font-medium">
          关联需求（{{ detail.data.value?.stories.length ?? 0 }}）
        </div>
        <div class="mt-1 max-h-40 space-y-1 overflow-y-auto">
          <div v-for="s in detail.data.value?.stories ?? []" :key="s.id" class="text-sm">
            <span class="num text-muted-foreground">#{{ s.id }}</span>
            <span class="ml-2">{{ s.title }}</span>
          </div>
          <div
            v-if="(detail.data.value?.stories.length ?? 0) === 0"
            class="text-xs text-muted-foreground"
          >
            无
          </div>
        </div>
        <div class="mt-3 text-sm font-medium">
          关联 Bug（{{ detail.data.value?.bugs.length ?? 0 }}）
        </div>
        <div class="mt-1 max-h-40 space-y-1 overflow-y-auto">
          <div v-for="b in detail.data.value?.bugs ?? []" :key="b.id" class="text-sm">
            <span class="num text-muted-foreground">#{{ b.id }}</span>
            <span class="ml-2">{{ b.title }}</span>
          </div>
          <div
            v-if="(detail.data.value?.bugs.length ?? 0) === 0"
            class="text-xs text-muted-foreground"
          >
            无
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>
