import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZtActionLog } from './entities/zt-action-log.entity.js';
import { ZtActionHistory } from './entities/zt-action-history.entity.js';
import { ZtNotify } from './entities/zt-notify.entity.js';

export interface HistoryEntry {
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
}

/**
 * 操作日志 + 站内通知（docs/02 §9.1/§9.2，docs/01 §6.8）：
 * - log()：全站关键实体变更审计（objectType/objectId/actor/action + history 字段明细）；
 * - notify()：站内信（收件人优先 assignedTo，动作矩阵 docs/02 §9.2）。
 * 调用纪律：业务流转方法显式调用（P5 简化，不做 AOP）。
 */
@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ZtActionLog)
    private readonly logRepo: Repository<ZtActionLog>,
    @InjectRepository(ZtActionHistory)
    private readonly historyRepo: Repository<ZtActionHistory>,
    @InjectRepository(ZtNotify)
    private readonly notifyRepo: Repository<ZtNotify>,
  ) {}

  /** 写操作日志（含字段级明细），返回 actionId */
  async log(params: {
    objectType: string;
    objectId: string;
    actor: string;
    action: string;
    comment?: string;
    extra?: string;
    projectId?: number;
    executionId?: number;
    history?: HistoryEntry[];
  }): Promise<string | null> {
    try {
      const log = await this.logRepo.save(
        this.logRepo.create({
          objectType: params.objectType,
          objectId: params.objectId,
          projectId: params.projectId ?? 0,
          executionId: params.executionId ?? 0,
          actor: params.actor,
          action: params.action,
          comment: params.comment ?? null,
          extra: params.extra ?? '',
        }),
      );
      if (params.history?.length) {
        await this.historyRepo.save(
          params.history.map((h) =>
            this.historyRepo.create({
              actionId: log.id,
              field: h.field,
              oldValue: h.oldValue ?? null,
              newValue: h.newValue ?? null,
            }),
          ),
        );
      }
      return log.id;
    } catch {
      // 审计失败不阻断业务主流程（docs/06 §1 兜底显式：调用方自有业务结果，日志缺失由监控告警）
      return null;
    }
  }

  /** 写站内通知（动作矩阵内调用） */
  async notify(params: {
    toUserId: string;
    objectType: string;
    objectId: string;
    action: string;
    subject: string;
    data?: Record<string, unknown>;
  }): Promise<void> {
    if (!params.toUserId || params.toUserId === 'closed') return;
    try {
      await this.notifyRepo.save(
        this.notifyRepo.create({
          objectType: params.objectType,
          objectId: params.objectId,
          action: params.action,
          toUserId: params.toUserId,
          subject: params.subject,
          data: params.data ?? null,
        }),
      );
    } catch {
      // 通知失败不阻断主流程
    }
  }

  /** 动态流查询（docs/03 §4.0 /actions） */
  async listActions(objectType: string, objectId: string) {
    return this.logRepo.find({
      where: { objectType, objectId },
      order: { id: 'DESC' },
      take: 100,
    });
  }

  /** 动作明细（含 history） */
  async getAction(actionId: string) {
    const log = await this.logRepo.findOneBy({ id: actionId });
    if (!log) return null;
    const history = await this.historyRepo.find({
      where: { actionId },
      order: { id: 'ASC' },
    });
    return { ...log, history };
  }
}
