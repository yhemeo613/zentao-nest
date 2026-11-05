import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 产品计划（docs/04 §4 zt_plan；状态 wait/doing/done/closed，docs/02 §5.1） */
@Entity('zt_plan')
@Index('idx_zt_plan_product', ['productId'])
export class ZtPlan {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  productId: number;

  @Column({ type: 'varchar', length: 255, default: '0' })
  branch: string;

  @Column({ type: 'bigint', default: 0 })
  parentId: number;

  @Column({ type: 'varchar', length: 90 })
  title: string;

  @Column({ type: 'varchar', length: 10, default: 'wait' })
  status: string;

  @Column({ type: 'text', nullable: true })
  desc: string | null;

  @Column({ type: 'date', nullable: true })
  begin: Date | null;

  @Column({ type: 'date', nullable: true })
  end: Date | null;

  /** 未来计划约定日期（docs/02 §5.1 isFuture） */
  @Column({ type: 'tinyint', default: 0 })
  isFuture: number;

  @Column({ type: 'datetime', nullable: true })
  finishedDate: Date | null;

  @Column({ type: 'datetime', nullable: true })
  closedDate: Date | null;

  @Column({ type: 'varchar', length: 20, default: '' })
  closedReason: string;

  @Column({ type: 'int', default: 0 })
  sortNo: number;

  @Column({ type: 'varchar', length: 30, default: '' })
  createdBy: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @Column({ type: 'tinyint', default: 0 })
  deleted: number;
}
