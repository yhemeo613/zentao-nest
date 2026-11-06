<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import { ElMessage } from 'element-plus';
import { PERMS } from '@zentao/shared';
import { systemApi } from '../../api/system.js';
import { http } from '../../lib/http.js';
import { describeError } from '../../lib/errors.js';

/**
 * ACL 白名单编辑器（acl='custom' 的对象生效；PUT /acl 全量替换）。
 * GET 返回行数组或单对象均兼容（防御式归一）。
 */
const props = defineProps<{ objectType: string; objectId: number | string; acl: string }>();

const queryClient = useQueryClient();
const userIds = ref<string[]>([]);
const saving = ref(false);
const loaded = ref(false);

async function load(): Promise<void> {
  loaded.value = false;
  try {
    const data = (await http.get('/acl', {
      params: { objectType: props.objectType, objectId: String(props.objectId) },
    })) as unknown;
    const rows = Array.isArray(data) ? data : [data];
    const match = rows.find(
      (r) => (r as { objectType?: string }).objectType === props.objectType,
    ) as { userIds?: string[] | null } | undefined;
    userIds.value = match?.userIds ?? [];
  } catch {
    userIds.value = [];
  } finally {
    loaded.value = true;
  }
}

watch(
  () => [props.objectType, props.objectId],
  () => void load(),
  { immediate: true },
);

async function save(): Promise<void> {
  saving.value = true;
  try {
    await systemApi.setAcl({
      objectType: props.objectType,
      objectId: String(props.objectId),
      userIds: userIds.value,
    });
    ElMessage.success('白名单已保存');
    void queryClient.invalidateQueries({ queryKey: ['acl'] });
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    saving.value = false;
  }
}

const isCustom = computed(() => props.acl === 'custom');
</script>

<template>
  <div class="border border-border bg-card">
    <div class="border-b border-border px-4 py-2 text-sm font-medium">访问控制（白名单）</div>
    <div class="space-y-3 p-4" v-loading="!loaded">
      <el-alert
        v-if="!isCustom"
        type="info"
        :closable="false"
        title="当前为公开/私有控制"
        description="仅 acl=custom（自定义白名单）的对象需要维护白名单。"
      />
      <template v-else>
        <el-select
          v-model="userIds"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="输入白名单账号，回车添加"
          class="!w-full"
        />
        <div>
          <el-button
            v-permission="PERMS.acl.manage"
            type="primary"
            size="small"
            :loading="saving"
            @click="save"
          >
            保存白名单（全量替换）
          </el-button>
        </div>
      </template>
    </div>
  </div>
</template>
