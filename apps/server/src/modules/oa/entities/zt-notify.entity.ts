import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 站内信/通知（docs/04 §8 zt_notify；动作矩阵见 docs/02 §9.2，收件人优先 assignedTo） */
@Entity('zt_notify')
@Index('idx_zt_notify_to', ['toUserId', 'status'])
export class ZtNotify {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 30 })
  objectType: string;

  @Column({ type: 'bigint' })
  objectId: string;

  /** 动作（assigned/finished/resolved 等，动作矩阵 docs/02 §9.2） */
  @Column({ type: 'varchar', length: 50 })
  action: string;

  /** 收件人用户 ID（单值；禅道 toList 逗号串，一期简化单收件人） */
  @Column({ type: 'varchar', length: 30 })
  toUserId: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  subject: string;

  @Column({ type: 'simple-json', nullable: true })
  data: Record<string, unknown> | null;

  /** wait | done（已读语义：done=已读） */
  @Column({ type: 'varchar', length: 10, default: 'wait' })
  status: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  readAt: Date | null;
}
