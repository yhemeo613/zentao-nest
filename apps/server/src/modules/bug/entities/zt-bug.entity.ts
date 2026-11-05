import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 缺陷（docs/04 §6 zt_bug；全关联字段保留，docs/02 §7.1） */
@Entity('zt_bug')
@Index('idx_zt_bug_product', ['productId'])
@Index('idx_zt_bug_story', ['storyId'])
@Index('idx_zt_bug_status', ['status'])
export class ZtBug {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  productId: number;

  @Column({ type: 'int', default: 0 })
  branchId: number;

  @Column({ type: 'bigint', default: 0 })
  moduleId: number;

  @Column({ type: 'bigint', default: 0 })
  projectId: number;

  @Column({ type: 'bigint', default: 0 })
  executionId: number;

  @Column({ type: 'bigint', default: 0 })
  storyId: number;

  @Column({ type: 'smallint', default: 1 })
  storyVersion: number;

  @Column({ type: 'bigint', default: 0 })
  taskId: number;

  /** 转需求回写（docs/02 §4.5 closeBugWhenToStory） */
  @Column({ type: 'bigint', default: 0 })
  toStoryId: number;

  @Column({ type: 'bigint', default: 0 })
  caseId: number;

  @Column({ type: 'smallint', default: 0 })
  caseVersion: number;

  /** 溯源测试结果（fail 转 Bug，docs/02 §7.3） */
  @Column({ type: 'bigint', default: 0 })
  resultId: number;

  @Column({ type: 'bigint', default: 0 })
  testtaskId: number;

  /** 发现构建（多值逗号串） */
  @Column({ type: 'varchar', length: 255, default: '' })
  openedBuild: string;

  /** 解决构建（fixed 必填，4801） */
  @Column({ type: 'varchar', length: 30, default: '' })
  resolvedBuildId: string;

  @Column({ type: 'varchar', length: 30, default: '' })
  injection: string;

  @Column({ type: 'varchar', length: 30, default: '' })
  identify: string;

  @Column({ type: 'bigint', default: 0 })
  duplicateBugId: number;

  @Column({ type: 'varchar', length: 255, default: '' })
  relatedBug: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  keywords: string;

  @Column({ type: 'tinyint', default: 3 })
  severity: number;

  @Column({ type: 'tinyint', default: 3 })
  pri: number;

  @Column({ type: 'varchar', length: 30, default: 'code' })
  type: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  os: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  browser: string;

  @Column({ type: 'text', nullable: true })
  steps: string | null;

  /** active | resolved | closed */
  @Column({ type: 'varchar', length: 10, default: 'active' })
  status: string;

  /** confirm 仅标记（docs/02 §7.1） */
  @Column({ type: 'tinyint', default: 0 })
  confirmed: number;

  @Column({ type: 'smallint', default: 0 })
  activatedCount: number;

  @Column({ type: 'varchar', length: 30, default: '' })
  openedBy: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  openedAt: Date;

  @Column({ type: 'varchar', length: 30, default: '' })
  assignedTo: string;

  @Column({ type: 'datetime', nullable: true })
  assignedAt: Date | null;

  @Column({ type: 'date', nullable: true })
  deadline: Date | null;

  @Column({ type: 'varchar', length: 30, default: '' })
  resolvedBy: string;

  @Column({ type: 'varchar', length: 20, default: '' })
  resolution: string;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'varchar', length: 30, default: '' })
  closedBy: string;

  @Column({ type: 'datetime', nullable: true })
  closedAt: Date | null;

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
