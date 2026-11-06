import { computed, ref, watch } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage } from 'element-plus';
import { SocketEvents } from '@zentao/shared';
import type { KanbanColumnVo, KanbanLaneVo, KanbanCellVo, BoardViewVo } from '../api/board.js';
import { boardApi } from '../api/board.js';
import { getSocket, closeSocket } from '../lib/socket.js';
import { useAuthStore } from '../stores/auth.js';
import { describeError } from '../lib/errors.js';
import type { TaskVo } from '../api/task.js';

/**
 * 看板状态（docs/05 §6：乐观更新 + Socket ack 回滚；广播同步他人操作；WIP 仅警示不拦截）。
 * 泳道行 × 顶层列；父列（develop）渲染其子列。
 */
export function useBoard(executionId: number) {
  const queryClient = useQueryClient();
  const auth = useAuthStore();

  const query = useQuery({
    queryKey: ['board', executionId],
    queryFn: () => boardApi.getBoard(executionId),
  });

  const board = ref<BoardViewVo | null>(null);
  const wipExceededColumns = ref<string[]>([]);
  const presence = ref<Array<{ userId: string; account: string; realname: string }>>([]);

  function adopt(data: BoardViewVo): void {
    board.value = data;
    wipExceededColumns.value = data.wipExceeded
      .filter((w) => w.current > w.limit)
      .map((w) => w.columnId);
  }
  watch(
    () => query.data.value,
    (d) => {
      if (d) adopt(d);
    },
    { immediate: true },
  );

  const topColumns = computed<KanbanColumnVo[]>(() =>
    (board.value?.columns ?? []).filter((c) => c.parentId === 0),
  );
  const lanes = computed<KanbanLaneVo[]>(() => board.value?.lanes ?? []);

  function childColumns(parentId: string): KanbanColumnVo[] {
    return (board.value?.columns ?? []).filter((c) => String(c.parentId) === parentId);
  }

  function cellOf(laneId: string, columnId: string): KanbanCellVo | undefined {
    return board.value?.cells.find((c) => c.laneId === laneId && c.columnId === columnId);
  }

  function tasksOf(laneId: string, columnId: string): TaskVo[] {
    const cell = cellOf(laneId, columnId);
    if (!cell) return [];
    const order = (cell.cards ? cell.cards.split(',').filter(Boolean) : []).map(String);
    return [...cell.cardTasks].sort((a, b) => {
      const ia = order.indexOf(String(a.id));
      const ib = order.indexOf(String(b.id));
      return (ia < 0 ? 9999 : ia) - (ib < 0 ? 9999 : ib);
    });
  }

  /** 本地移动卡片（乐观）；返回回滚函数 */
  function moveLocal(
    taskId: string,
    from: { laneId: string; columnId: string },
    to: { laneId: string; columnId: string },
  ): () => void {
    const src = cellOf(from.laneId, from.columnId);
    const dst = cellOf(to.laneId, to.columnId);
    if (!src || !dst || !board.value) return () => undefined;
    const task = src.cardTasks.find((t) => String(t.id) === taskId);
    if (!task) return () => undefined;
    const prevSrc = src.cards;
    const prevDst = dst.cards;
    const prevSrcTasks = [...src.cardTasks];
    const prevDstTasks = [...dst.cardTasks];
    src.cards = (src.cards ?? '')
      .split(',')
      .filter((id) => id && id !== taskId)
      .join(',');
    src.cardTasks = src.cardTasks.filter((t) => String(t.id) !== taskId);
    dst.cards = (dst.cards ?? '').split(',').filter(Boolean).concat(taskId).join(',');
    dst.cardTasks = [...dst.cardTasks, task];
    return () => {
      src.cards = prevSrc;
      dst.cards = prevDst;
      src.cardTasks = prevSrcTasks;
      dst.cardTasks = prevDstTasks;
    };
  }

  function updateTaskStatus(taskId: string, status: string): void {
    for (const cell of board.value?.cells ?? []) {
      const t = cell.cardTasks.find((x) => String(x.id) === taskId);
      if (t) t.status = status as TaskVo['status'];
    }
  }

  let socketBound = false;
  function connectSocket(): void {
    if (!auth.accessToken) return;
    const socket = getSocket(auth.accessToken);
    socket.emit(SocketEvents.BoardJoin, { executionId: String(executionId) });
    if (socketBound) return;
    socketBound = true;

    socket.on(
      SocketEvents.CardMoved,
      (evt: { taskId: string; fromColumnId: string; toColumnId: string; actor: string }) => {
        if (evt.actor === auth.user?.account) return;
        const from = findLaneColumn(evt.fromColumnId);
        const to = findLaneColumn(evt.toColumnId);
        if (from && to) moveLocal(evt.taskId, from, to);
      },
    );
    socket.on(SocketEvents.CardStatusChanged, (evt: { taskId: string; status: string }) => {
      updateTaskStatus(evt.taskId, evt.status);
    });
    socket.on(
      SocketEvents.PresenceSync,
      (evt: { members: Array<{ userId: string; account: string; realname: string }> }) => {
        presence.value = evt.members;
      },
    );
    socket.on(
      SocketEvents.BoardWipExceeded,
      (evt: { columnId: string; limit: number; current: number }) => {
        if (evt.current > evt.limit && !wipExceededColumns.value.includes(evt.columnId)) {
          wipExceededColumns.value = [...wipExceededColumns.value, evt.columnId];
          ElMessage.warning(`列 WIP 超限（${evt.current}/${evt.limit}），仅警示不拦截`);
        }
      },
    );
    socket.on('connect_error', (err: Error) => {
      if (err.message.includes('auth')) {
        ElMessage.error('看板实时连接鉴权失败，已断开（拖拽将走 REST）');
        closeSocket();
      }
    });
  }

  function findLaneColumn(columnId: string): { laneId: string; columnId: string } | null {
    for (const cell of board.value?.cells ?? []) {
      if (cell.columnId === columnId) return { laneId: cell.laneId, columnId: cell.columnId };
    }
    return null;
  }

  /** 拖拽落定：乐观更新 → socket card:move（eventId 幂等）；ack 失败回滚；socket 断连走 REST 兜底 */
  async function handleDrop(
    taskId: string,
    from: { laneId: string; columnId: string },
    to: { laneId: string; columnId: string },
  ): Promise<void> {
    if (from.columnId === to.columnId && from.laneId === to.laneId) return;
    const rollback = moveLocal(taskId, from, to);
    const eventId = crypto.randomUUID();
    const payload = {
      executionId: String(executionId),
      taskId,
      fromColumnId: from.columnId,
      toColumnId: to.columnId,
      fromLaneId: from.laneId,
      toLaneId: to.laneId,
      eventId,
    };

    if (auth.accessToken) {
      const socket = getSocket(auth.accessToken);
      if (socket.connected) {
        socket.emit(
          SocketEvents.CardMove,
          payload,
          (ack: {
            ok: boolean;
            code?: number;
            message?: string;
            task?: { id: string; status: string };
          }) => {
            if (ack.ok) {
              if (ack.task?.status) updateTaskStatus(taskId, ack.task.status);
              ElMessage.success('卡片已移动');
            } else {
              rollback();
              ElMessage.error(
                ack.message ?? describeError(new Error(`移动被拒绝（${ack.code}）`)).message,
              );
            }
          },
        );
        return;
      }
    }
    // Socket 不可用 → REST 兜底
    try {
      const result = await boardApi.moveTask(executionId, taskId, to.columnId);
      updateTaskStatus(taskId, result.task.status);
      if (result.wipExceeded) ElMessage.warning('目标列 WIP 超限（仅警示）');
      ElMessage.success('卡片已移动');
    } catch (error) {
      rollback();
      ElMessage.error(describeError(error).message);
    }
  }

  function refresh(): void {
    void queryClient.invalidateQueries({ queryKey: ['board', executionId] });
  }

  return {
    query,
    board,
    adopt,
    topColumns,
    lanes,
    childColumns,
    cellOf,
    tasksOf,
    handleDrop,
    connectSocket,
    refresh,
    presence,
    wipExceededColumns,
  };
}
