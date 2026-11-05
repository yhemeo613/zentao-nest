import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 通用工时流水（docs/04 §5 zt_effort；v22 统一表，taskestimate 已废弃） */
@Entity('zt_effort')
@Index('idx_zt_effort_object', ['objectType', 'objectId'])
@Index('idx_zt_effort_user_date', ['userId', 'date'])
export class ZtEffort {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  /** task | story | bug | case | todo | custom */
  @Column({ type: 'varchar', length: 30 })
  objectType: string;

  @Column({ type: 'bigint' })
  objectId: string;

  @Column({ type: 'bigint', default: 0 })
  projectId: number;

  @Column({ type: 'bigint', default: 0 })
  executionId: number;

  @Column({ type: 'varchar', length: 30 })
  userId: string;

  @Column({ type: 'date' })
  date: Date;

  /** 本次消耗（>0，4703 日期≤今天） */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  consumed: number;

  /** 记录后剩余（聚合规则：task.left=最后一条，docs/02 §6.4） */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  left: number;

  @Column({ type: 'text', nullable: true })
  work: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'tinyint', default: 0 })
  deleted: number;
}
