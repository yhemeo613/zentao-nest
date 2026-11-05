import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 测试单-用例执行（docs/04 §6 zt_test_run；UNIQUE(task,case)，replace 语义） */
@Entity('zt_test_run')
@Index('idx_zt_test_run_unique', ['taskId', 'caseId'], { unique: true })
export class ZtTestRun {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  taskId: string;

  @Column({ type: 'bigint' })
  caseId: string;

  /** 圈选用例时的用例版本快照 */
  @Column({ type: 'smallint', default: 1 })
  caseVersion: number;

  @Column({ type: 'varchar', length: 30, default: '' })
  assignedTo: string;

  @Column({ type: 'varchar', length: 30, default: '' })
  lastRunner: string;

  @Column({ type: 'datetime', nullable: true })
  lastRunDate: Date | null;

  /** pass | fail | blocked | n/a */
  @Column({ type: 'varchar', length: 30, default: '' })
  lastRunResult: string;

  /** normal | blocked（fail 时用例级 blocked？对齐禅道：result=blocked 时 run.status=blocked） */
  @Column({ type: 'varchar', length: 30, default: 'normal' })
  status: string;
}
