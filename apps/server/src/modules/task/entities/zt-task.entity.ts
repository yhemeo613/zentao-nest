import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 任务（docs/04 §5 zt_task；六态状态机 + 工时隐式迁移，docs/02 §6） */
@Entity('zt_task')
@Index('idx_zt_task_execution', ['executionId'])
@Index('idx_zt_task_story', ['storyId'])
@Index('idx_zt_task_parent', ['parentId'])
@Index('idx_zt_task_assigned', ['assignedTo'])
export class ZtTask {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  projectId: number;

  /** 父任务（0=独立；拆分后 isParent=1） */
  @Column({ type: 'bigint', default: 0 })
  parentId: number;

  @Column({ type: 'tinyint', default: 0 })
  isParent: number;

  @Column({ type: 'varchar', length: 255, default: '' })
  pathStr: string;

  @Column({ type: 'bigint' })
  executionId: number;

  @Column({ type: 'bigint', default: 0 })
  moduleId: number;

  /** 关联需求及版本快照（docs/02 §4.3 锁定语义） */
  @Column({ type: 'bigint', default: 0 })
  storyId: number;

  @Column({ type: 'smallint', default: 1 })
  storyVersion: number;

  @Column({ type: 'bigint', default: 0 })
  fromBugId: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  /** devel | test | design | study | discuss | trans | misc */
  @Column({ type: 'varchar', length: 20, default: 'devel' })
  type: string;

  /** '' 单人 | linear | multi（多人任务 P3.5） */
  @Column({ type: 'varchar', length: 10, default: '' })
  mode: string;

  @Column({ type: 'tinyint', default: 3 })
  pri: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  estimate: number;

  /** consumed=Σeffort（只增不减，docs/02 §6.4） */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  consumed: number;

  /** left=最后一条 effort 的 left（docs/02 §6.4） */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  left: number;

  @Column({ type: 'date', nullable: true })
  deadline: Date | null;

  /** wait | doing | done | pause | cancel | closed */
  @Column({ type: 'varchar', length: 10, default: 'wait' })
  status: string;

  @Column({ type: 'char', length: 7, default: '' })
  color: string;

  @Column({ type: 'text', nullable: true })
  desc: string | null;

  @Column({ type: 'varchar', length: 30, default: '' })
  openedBy: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  openedAt: Date;

  @Column({ type: 'varchar', length: 30, default: '' })
  assignedTo: string;

  @Column({ type: 'datetime', nullable: true })
  assignedAt: Date | null;

  @Column({ type: 'date', nullable: true })
  estStarted: Date | null;

  @Column({ type: 'datetime', nullable: true })
  realStarted: Date | null;

  @Column({ type: 'varchar', length: 30, default: '' })
  finishedBy: string;

  @Column({ type: 'datetime', nullable: true })
  finishedAt: Date | null;

  @Column({ type: 'varchar', length: 30, default: '' })
  canceledBy: string;

  @Column({ type: 'datetime', nullable: true })
  canceledAt: Date | null;

  @Column({ type: 'varchar', length: 30, default: '' })
  closedBy: string;

  @Column({ type: 'datetime', nullable: true })
  closedAt: Date | null;

  /** done | cancel（close 自动映射，docs/02 §6.1） */
  @Column({ type: 'varchar', length: 30, default: '' })
  closedReason: string;

  @Column({ type: 'datetime', nullable: true })
  activatedDate: Date | null;

  @Column({ type: 'int', default: 0 })
  sortNo: number;

  @Column({ type: 'bigint', default: 0 })
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
