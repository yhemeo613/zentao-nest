/**
 * Socket.IO 契约（规格：docs/03-接口与契约.md §6）
 * 双端 import：后端网关与前端 lib/socket.ts 均引用本文件，事件名/payload/ack 单源。
 */

/** Client → Server 事件 */
export interface BoardJoinPayload {
  executionId: string;
}

export interface CardMovePayload {
  executionId: string;
  taskId: string;
  fromColumnId: string;
  toColumnId: string;
  fromLaneId?: string;
  toLaneId?: string;
  ordinal?: number;
  /** 幂等去重（docs/03 §6） */
  eventId: string;
}

export interface CardReorderPayload {
  executionId: string;
  columnId: string;
  taskId: string;
  ordinal: number;
  eventId: string;
}

/** Ack 结构（失败带错误码供前端按 docs/03 §2 语义回滚） */
export interface CardMoveAck {
  ok: boolean;
  code?: number;
  message?: string;
  task?: { id: string; status: string; name: string };
  column?: { id: string; type: string };
}

export interface BoardJoinAck {
  ok: boolean;
  code?: number;
  message?: string;
  board?: unknown;
}

/** Server → Client 广播事件 payload */
export interface CardMovedEvent {
  taskId: string;
  fromColumnId: string;
  toColumnId: string;
  ordinal?: number;
  actor: string;
  eventId: string;
}

export interface CardStatusChangedEvent {
  taskId: string;
  status: string;
  task: { id: string; name: string };
  action: string;
  actor: string;
  eventId: string;
}

export interface PresenceSyncEvent {
  members: Array<{ userId: string; account: string; realname: string }>;
}

export interface WipExceededEvent {
  columnId: string;
  limit: number;
  current: number;
}

export interface BoardRefreshEvent {
  reason: string;
  code?: number;
}

/** 事件名常量（唯一事实源） */
export const SocketEvents = {
  // client → server
  BoardJoin: 'board:join',
  CardMove: 'card:move',
  CardReorder: 'card:reorder',
  PresenceHeartbeat: 'presence:heartbeat',
  // server → client
  PresenceSync: 'presence:sync',
  CardMoved: 'card:moved',
  CardStatusChanged: 'card:status:changed',
  CardUpdated: 'card:updated',
  CardCreated: 'card:created',
  CardDeleted: 'card:deleted',
  ColumnUpdated: 'column:updated',
  LaneUpdated: 'lane:updated',
  BoardWipExceeded: 'board:wip:exceeded',
  BoardRefresh: 'board:refresh',
} as const;
