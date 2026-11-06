<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue';
import Sortable from 'sortablejs';
import { useQuery } from '@tanstack/vue-query';
import { Refresh } from '@element-plus/icons-vue';
import { useBoard } from '../../composables/useBoard.js';
import { executionApi } from '../../api/execution.js';
import PageHeader from '../../components/common/page-header.vue';

/** 看板页（docs/05 §8 /executions/:id/board）：泳道行 × 顶层列；拖拽乐观更新；WIP 角标；在线成员 */
const props = defineProps<{ executionId: number }>();

const board = useBoard(props.executionId);

const execution = useQuery({
  queryKey: ['executions', props.executionId],
  queryFn: () => executionApi.get(props.executionId),
});

const wipExceeded = (columnId: string): boolean =>
  board.wipExceededColumns.value.includes(columnId);

const gridStyle = computed(() => ({
  gridTemplateColumns: `64px repeat(${board.topColumns.value.length}, minmax(150px, 1fr))`,
}));

const wipOf = (columnId: string): { limit: number; current: number } | null =>
  board.board.value?.wipExceeded.find((x) => x.columnId === columnId) ?? null;

// ---- 拖拽（sortablejs；vuedraggable-plus 不在私有镜像源，直接用其底层库） ----
const disposers: Array<() => void> = [];

onMounted(() => {
  board.connectSocket();
});

onBeforeUnmount(() => {
  disposers.forEach((fn) => fn());
  disposers.length = 0;
});

/** 数据重绘后重新绑定列容器（容器随数据生成；sort=false：列内顺序不持久化，仅跨列移动） */
watch(
  () => board.board.value,
  async () => {
    disposers.forEach((fn) => fn());
    disposers.length = 0;
    await nextTick();
    document.querySelectorAll<HTMLElement>('[data-cell-drop]').forEach((el) => {
      const laneId = el.dataset.laneId!;
      const columnId = el.dataset.columnId!;
      const sortable = Sortable.create(el, {
        group: 'cards',
        sort: false,
        animation: 120,
        ghostClass: 'opacity-40',
        onEnd: (evt) => {
          const taskId = evt.item.dataset.taskId!;
          const fromColumnId = evt.from.dataset.columnId!;
          const fromLaneId = evt.from.dataset.laneId!;
          void board.handleDrop(
            taskId,
            { laneId: fromLaneId, columnId: fromColumnId },
            { laneId, columnId },
          );
        },
      });
      disposers.push(() => sortable.destroy());
    });
  },
  { immediate: true },
);
</script>

<template>
  <div>
    <PageHeader
      :title="`看板 — ${execution.data.value?.name ?? executionId}`"
      description="拖拽卡片即映射任务动作（研发中=开始/继续，研发完毕=完成，已取消=取消）；WIP 超限仅警示"
    >
      <template #actions>
        <div v-if="board.presence.value.length" class="mr-2 flex items-center gap-1">
          <el-tooltip
            v-for="m in board.presence.value"
            :key="m.userId"
            :content="m.realname || m.account"
          >
            <span
              class="num inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary"
            >
              {{ (m.realname || m.account).slice(0, 2) }}
            </span>
          </el-tooltip>
        </div>
        <el-button :icon="Refresh" size="small" @click="board.refresh()">刷新</el-button>
      </template>
    </PageHeader>

    <div v-loading="board.query.isLoading.value" class="overflow-x-auto pb-2">
      <div v-if="board.board.value" class="min-w-[1000px]">
        <!-- 列头 -->
        <div class="board-grid mb-1" :style="gridStyle">
          <div class="lane-head"></div>
          <div v-for="col in board.topColumns.value" :key="col.id" class="lane-head text-center">
            <div>
              {{ col.name }}
              <span
                v-if="wipOf(col.id)"
                class="num ml-1 rounded px-1 text-xs"
                :class="
                  wipExceeded(col.id)
                    ? 'bg-destructive text-white'
                    : 'bg-muted text-muted-foreground'
                "
              >
                {{ wipOf(col.id)!.current }}/{{ wipOf(col.id)!.limit }}
              </span>
            </div>
            <div v-if="board.childColumns(col.id).length" class="mt-1 flex gap-1">
              <div
                v-for="child in board.childColumns(col.id)"
                :key="child.id"
                class="flex-1 text-xs text-muted-foreground"
              >
                {{ child.name }}
              </div>
            </div>
          </div>
        </div>

        <!-- 泳道行 -->
        <div
          v-for="lane in board.lanes.value"
          :key="lane.id"
          class="board-grid mb-2"
          :style="gridStyle"
        >
          <div
            class="lane-head flex items-center justify-center rounded text-xs font-medium text-white"
            :style="{ background: lane.color || '#4169e1' }"
          >
            {{ lane.name }}
          </div>
          <div v-for="col in board.topColumns.value" :key="col.id" class="board-parent">
            <div v-if="board.childColumns(col.id).length" class="grid flex-1 grid-cols-2 gap-1">
              <div v-for="child in board.childColumns(col.id)" :key="child.id" class="board-cell">
                <div
                  class="cell-drop"
                  :class="{ 'wip-over': wipExceeded(child.id) }"
                  data-cell-drop
                  :data-lane-id="lane.id"
                  :data-column-id="child.id"
                >
                  <div
                    v-for="t in board.tasksOf(lane.id, child.id)"
                    :key="t.id"
                    :data-task-id="String(t.id)"
                    class="board-card"
                    :title="t.name"
                  >
                    <div class="line-clamp-2 text-xs leading-4">{{ t.name }}</div>
                    <div
                      class="num mt-1 flex items-center justify-between text-[10px] text-muted-foreground"
                    >
                      <span>#{{ t.id }}</span>
                      <span>P{{ t.pri }} · {{ t.assignedTo || '未指派' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="board-cell">
              <div
                class="cell-drop"
                :class="{ 'wip-over': wipExceeded(col.id) }"
                data-cell-drop
                :data-lane-id="lane.id"
                :data-column-id="col.id"
              >
                <div
                  v-for="t in board.tasksOf(lane.id, col.id)"
                  :key="t.id"
                  :data-task-id="String(t.id)"
                  class="board-card"
                  :title="t.name"
                >
                  <div class="line-clamp-2 text-xs leading-4">{{ t.name }}</div>
                  <div
                    class="num mt-1 flex items-center justify-between text-[10px] text-muted-foreground"
                  >
                    <span>#{{ t.id }}</span>
                    <span>P{{ t.pri }} · {{ t.assignedTo || '未指派' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <el-empty v-else-if="!board.query.isLoading.value" description="看板数据为空" />
    </div>
  </div>
</template>

<style scoped>
.board-grid {
  display: grid;
  gap: 6px;
}
.lane-head {
  min-height: 40px;
  padding: 6px;
  font-size: 12px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 4px;
}
.board-parent {
  display: flex;
  min-height: 120px;
}
.board-cell {
  display: flex;
  flex: 1;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 4px;
}
.cell-drop {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-height: 60px;
  padding: 4px;
}
.cell-drop.wip-over {
  border: 1px dashed var(--destructive);
  background: #fef2f2;
}
.board-card {
  padding: 6px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: grab;
}
.board-card:active {
  cursor: grabbing;
}
</style>
