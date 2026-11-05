import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 操作日志（docs/04 §8 zt_action_log；全站动作审计，history 明细另表） */
@Entity('zt_action_log')
@Index('idx_zt_action_object', ['objectType', 'objectId'])
@Index('idx_zt_action_actor', ['actor'])
@Index('idx_zt_action_date', ['actionDate'])
export class ZtActionLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 30 })
  objectType: string;

  @Column({ type: 'bigint' })
  objectId: string;

  @Column({ type: 'bigint', default: 0 })
  projectId: number;

  @Column({ type: 'bigint', default: 0 })
  executionId: number;

  /** 操作者用户 ID */
  @Column({ type: 'varchar', length: 30 })
  actor: string;

  /** 动作（opened/started/finished/resolved/assigned…动作矩阵 docs/02 §9.2） */
  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  actionDate: Date;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  /** 附加信息（原状态恢复/错误码语义等，docs/02 §9.1 extra） */
  @Column({ type: 'varchar', length: 255, default: '' })
  extra: string;

  @Column({ type: 'tinyint', default: 0 })
  isRead: number;
}
