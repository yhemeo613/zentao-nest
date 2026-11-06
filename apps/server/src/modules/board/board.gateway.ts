import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../common/redis/redis.service.js';
import { BoardService } from './board.service.js';
import { TaskService } from '../task/task.service.js';
import {
  BoardJoinAck,
  BoardJoinPayload,
  CardMoveAck,
  CardMovePayload,
  CardReorderPayload,
  SocketEvents,
} from '@zentao/shared';
import type { Server } from 'socket.io';
import type { Socket } from 'socket.io';

/**
 * 看板 Socket.IO 网关（docs/03 §6 契约）：
 * - 握手 auth.token JWT 校验（失败断连）；
 * - room = execution:{id}；board:join ack 返回全量；
 * - card:move → 按列映射任务动作（服务端唯一事实源）→ 广播 card:moved/status:changed + WIP 警告；
 * - presence：连接即入 presence 集合，断开移除，广播 presence:sync；
 * - 单实例模式（多实例 Redis adapter 随 P7 部署启用）。
 */
@WebSocketGateway({
  namespace: '/ws',
  cors: { origin: '*' },
  transports: ['websocket'],
})
export class BoardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(BoardGateway.name);

  @WebSocketServer()
  server: Server;

  /** socket.id → {userId, account, executionId?} */
  private sessions = new Map<
    string,
    { userId: string; account: string; executionId?: string }
  >();

  constructor(
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly board: BoardService,
    private readonly tasks: TaskService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = await this.jwt.verifyAsync(token);
      if (payload.typ !== 'access') throw new Error('token type');
      const denied = await this.redis.get(`token:denylist:${payload.jti}`);
      if (denied) throw new Error('denied');
      this.sessions.set(client.id, {
        userId: payload.sub,
        account: payload.account,
      });
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const session = this.sessions.get(client.id);
    if (session?.executionId) {
      void this.broadcastPresence(session.executionId);
    }
    this.sessions.delete(client.id);
  }

  @SubscribeMessage(SocketEvents.BoardJoin)
  async onBoardJoin(
    client: Socket,
    payload: { executionId: string },
  ): Promise<BoardJoinAck> {
    const session = this.sessions.get(client.id);
    if (!session) return { ok: false, code: 2001, message: '未登录' };
    await client.join(`execution:${payload.executionId}`);
    session.executionId = payload.executionId;
    const board = await this.board.getBoard(payload.executionId);
    await this.broadcastPresence(payload.executionId);
    return { ok: true, board };
  }

  @SubscribeMessage(SocketEvents.CardMove)
  async onCardMove(
    client: Socket,
    payload: {
      executionId: string;
      taskId: string;
      fromColumnId: string;
      toColumnId: string;
      ordinal?: number;
      eventId: string;
    },
  ): Promise<CardMoveAck> {
    const session = this.sessions.get(client.id);
    if (!session) return { ok: false, code: 2001, message: '未登录' };
    try {
      const { task, wipExceeded } = await this.board.moveCard(
        session.userId,
        payload.executionId,
        payload.taskId,
        payload.toColumnId,
      );
      const eventId = payload.eventId ?? '';
      this.server
        .to(`execution:${payload.executionId}`)
        .emit(SocketEvents.CardMoved, {
          taskId: task.id,
          fromColumnId: payload.fromColumnId,
          toColumnId: payload.toColumnId,
          ordinal: payload.ordinal,
          actor: session.account,
          eventId,
        });
      this.server
        .to(`execution:${payload.executionId}`)
        .emit(SocketEvents.CardStatusChanged, {
          taskId: task.id,
          status: task.status,
          task: { id: task.id, name: task.name },
          action: 'moved',
          actor: session.account,
          eventId,
        });
      if (wipExceeded) {
        const col = await this.board.getColumn(payload.toColumnId);
        this.server
          .to(`execution:${payload.executionId}`)
          .emit(SocketEvents.BoardWipExceeded, {
            columnId: payload.toColumnId,
            limit: col?.wipLimit ?? -1,
            current: (col?.wipLimit ?? -1) + 1,
          });
      }
      return {
        ok: true,
        task: { id: task.id, status: task.status, name: task.name },
      };
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      return {
        ok: false,
        code: e.code ?? 3007,
        message: e.message ?? '移动失败',
      };
    }
  }

  @SubscribeMessage(SocketEvents.CardReorder)
  async onCardReorder(
    client: Socket,
    payload: {
      executionId: string;
      columnId: string;
      taskId: string;
      ordinal: number;
      eventId: string;
    },
  ): Promise<{ ok: boolean }> {
    const session = this.sessions.get(client.id);
    if (!session) return { ok: false };
    await this.board.reorder(
      payload.executionId,
      payload.columnId,
      payload.taskId,
      payload.ordinal,
    );
    this.server
      .to(`execution:${payload.executionId}`)
      .emit(SocketEvents.CardMoved, {
        taskId: payload.taskId,
        fromColumnId: payload.columnId,
        toColumnId: payload.columnId,
        ordinal: payload.ordinal,
        actor: session.account,
        eventId: payload.eventId,
      });
    return { ok: true };
  }

  /** 广播执行在线成员（presence 集合存 Redis set） */
  private async broadcastPresence(executionId: string): Promise<void> {
    const members: Array<{
      userId: string;
      account: string;
      realname: string;
    }> = [];
    for (const session of this.sessions.values()) {
      if (session.executionId === executionId) {
        members.push({
          userId: session.userId,
          account: session.account,
          realname: session.account,
        });
      }
    }
    this.server
      .to(`execution:${executionId}`)
      .emit(SocketEvents.PresenceSync, { members });
  }
}
