import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 测试单（docs/04 §6 zt_test_task；done=已关闭语义，docs/02 §7.3） */
@Entity('zt_test_task')
@Index('idx_zt_test_task_product', ['productId'])
@Index('idx_zt_test_task_build', ['buildId'])
export class ZtTestTask {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', default: 0 })
  projectId: number;

  @Column({ type: 'bigint' })
  productId: number;

  @Column({ type: 'varchar', length: 90 })
  name: string;

  @Column({ type: 'bigint', default: 0 })
  executionId: number;

  @Column({ type: 'bigint' })
  buildId: number;

  /** 联调测试单标记 */
  @Column({ type: 'tinyint', default: 0 })
  joint: number;

  @Column({ type: 'varchar', length: 255, default: '' })
  type: string;

  @Column({ type: 'varchar', length: 30, default: '' })
  ownerId: string;

  @Column({ type: 'tinyint', default: 3 })
  pri: number;

  @Column({ type: 'date', nullable: true })
  begin: Date | null;

  @Column({ type: 'date', nullable: true })
  end: Date | null;

  @Column({ type: 'date', nullable: true })
  realBegan: Date | null;

  @Column({ type: 'datetime', nullable: true })
  realFinishedDate: Date | null;

  @Column({ type: 'text', nullable: true })
  desc: string | null;

  /** wait | doing | done(=已关闭) | blocked */
  @Column({ type: 'varchar', length: 10, default: 'wait' })
  status: string;

  @Column({ type: 'varchar', length: 10, default: 'no' })
  auto: string;

  @Column({ type: 'text', nullable: true })
  members: string | null;

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
