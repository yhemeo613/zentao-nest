import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 执行（字段规格：docs/04 §3 zt_execution；层级语义对齐禅道 type=sprint|stage|kanban 行） */
@Entity('zt_execution')
@Index('idx_zt_execution_project', ['projectId'])
export class ZtExecution {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  projectId: number;

  /** sprint | stage | kanban（由项目 model 映射，docs/02 §3.1 execution/config） */
  @Column({ type: 'varchar', length: 30, default: 'sprint' })
  type: string;

  /** 1=普通执行，>1=瀑布子阶段 */
  @Column({ type: 'tinyint', default: 1 })
  grade: number;

  /** 父节点 ID（普通执行=项目 ID；子阶段=父阶段 ID） */
  @Column({ type: 'bigint', default: 0 })
  parentId: number;

  @Column({ type: 'varchar', length: 255, default: '' })
  pathStr: string;

  @Column({ type: 'varchar', length: 90 })
  name: string;

  /** 瀑布工序属性（request/design/dev/qa/release/review/other/mix） */
  @Column({ type: 'varchar', length: 30, default: '' })
  attribute: string;

  @Column({ type: 'date', nullable: true })
  begin: Date | null;

  @Column({ type: 'date', nullable: true })
  end: Date | null;

  @Column({ type: 'date', nullable: true })
  realBegan: Date | null;

  @Column({ type: 'date', nullable: true })
  realEnd: Date | null;

  @Column({ type: 'smallint', default: 0 })
  days: number;

  /** wait | doing | suspended | closed */
  @Column({ type: 'varchar', length: 10, default: 'wait' })
  status: string;

  /** Scrum 冲刺目标 */
  @Column({ type: 'varchar', length: 255, default: '' })
  sprintGoal: string;

  /** 里程碑（瀑布） */
  @Column({ type: 'tinyint', default: 0 })
  milestone: number;

  /** 阶段工时占比（瀑布，合计≤100，错误码 4604） */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  percent: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progress: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  estimate: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  consumed: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  left: number;

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
