import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 项目（字段规格：docs/04 §3 zt_project；层级语义对齐禅道 type=project 行） */
@Entity('zt_project')
@Index('idx_zt_project_program', ['programId'])
@Index('idx_zt_project_code', ['code'], { unique: true })
export class ZtProject {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  /** 0=独立项目 */
  @Column({ type: 'bigint', default: 0 })
  programId: number;

  @Column({ type: 'varchar', length: 90 })
  name: string;

  @Column({ type: 'varchar', length: 45, default: '' })
  code: string;

  /** 管理模型：scrum|waterfall|kanban（开放枚举，docs/01 §4.3 / ADR D009） */
  @Column({ type: 'varchar', length: 30, default: 'scrum' })
  model: string;

  @Column({ type: 'simple-json', nullable: true })
  modelConfig: Record<string, unknown> | null;

  /** short | medium | long */
  @Column({ type: 'varchar', length: 30, default: '' })
  lifetime: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  budget: number;

  @Column({ type: 'varchar', length: 30, default: 'CNY' })
  budgetUnit: string;

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

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progress: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  estimate: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  consumed: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  left: number;

  @Column({ type: 'varchar', length: 30, default: '' })
  pmId: string;

  /** story | requirement（范围需求类型，docs/03 §4.8） */
  @Column({ type: 'varchar', length: 30, default: 'story' })
  storyType: string;

  /** 0=单执行项目（自动建影子迭代，docs/02 §3.4） */
  @Column({ type: 'tinyint', default: 1 })
  multiple: number;

  @Column({ type: 'varchar', length: 10, default: 'open' })
  acl: string;

  @Column({ type: 'simple-json', nullable: true })
  whitelist: string[] | null;

  @Column({ type: 'varchar', length: 20, default: '' })
  closedReason: string;

  @Column({ type: 'varchar', length: 30, default: '' })
  canceledById: string;

  @Column({ type: 'datetime', nullable: true })
  suspendedDate: Date | null;

  @Column({ type: 'text', nullable: true })
  desc: string | null;

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
