<script setup lang="ts">
import { computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { teamApi } from '../../api/team.js';

/**
 * 人员选择（docs/05 §9 UserPicker）：
 * - 提供 rootType/rootId 时拉团队成员作为选项；
 * - 否则降级为可输入账号的 allow-create 选择（系统 /users 仅 user.browse 可见，非管理角色不可枚举）。
 */
const props = defineProps<{
  rootType?: 'project' | 'execution';
  rootId?: number | string;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
}>();

const model = defineModel<string>({ default: '' });

const memberQuery = useQuery({
  queryKey: ['team', () => props.rootType, () => props.rootId],
  queryFn: () => teamApi.list(props.rootType!, props.rootId!),
  enabled: computed(() => Boolean(props.rootType && props.rootId)),
});

const options = computed(() =>
  (memberQuery.data.value ?? []).map((m) => ({ value: m.userId, label: m.userId })),
);
</script>

<template>
  <el-select
    v-model="model"
    :placeholder="placeholder ?? '选择或输入账号'"
    :clearable="clearable ?? true"
    :disabled="disabled"
    filterable
    allow-create
    default-first-option
    :loading="memberQuery.isLoading.value"
    class="w-full"
  >
    <el-option v-for="opt in options" :key="opt.value" :value="opt.value" :label="opt.label" />
  </el-select>
</template>
