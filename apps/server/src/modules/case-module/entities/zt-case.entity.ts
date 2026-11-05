import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 用例（docs/04 §6 zt_case；默认免评审直接 normal，docs/02 §7.2） */
@Entity('zt_case')
@Index('idx_zt_case_product', ['productId'])
@Index('idx_zt_case_story', ['storyId'])
export class ZtCase {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', default: 0 })
  projectId: number;

  @Column({ type: 'bigint' })
  productId: number;

  @Column({ type: 'bigint', default: 0 })
  executionId: number;

  @Column({ type: 'int', default: 0 })
  branchId: number;

  @Column({ type: 'bigint', default: 0 })
  moduleId: number;

  @Column({ type: 'bigint', default: 0 })
  storyId: number;

  /** 需求版本快照（storyChanged 确认机制，docs/02 §7.2） */
  @Column({ type: 'smallint', default: 1 })
  storyVersion: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  precondition: string | null;

  @Column({ type: 'varchar', length: 255, default: '' })
  keywords: string;

  @Column({ type: 'tinyint', default: 3 })
  pri: number;

  @Column({ type: 'varchar', length: 30, default: 'feature' })
  type: string;

  /** no | auto | unit（自动化预留） */
  @Column({ type: 'varchar', length: 10, default: 'no' })
  auto: string;

  /** wait | normal | blocked | investigate */
  @Column({ type: 'varchar', length: 30, default: 'normal' })
  status: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  stage: string;

  @Column({ type: 'smallint', default: 1 })
  version: number;

  @Column({ type: 'varchar', length: 255, default: '' })
  linkCase: string;

  @Column({ type: 'bigint', default: 0 })
  fromBugId: number;

  @Column({ type: 'varchar', length: 30, default: '' })
  lastRunner: string;

  @Column({ type: 'datetime', nullable: true })
  lastRunDate: Date | null;

  /** pass | fail | blocked | n/a */
  @Column({ type: 'varchar', length: 30, default: '' })
  lastRunResult: string;

  @Column({ type: 'varchar', length: 30, default: '' })
  openedBy: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  openedAt: Date;

  @Column({ type: 'varchar', length: 255, default: '' })
  reviewedBy: string;

  @Column({ type: 'date', nullable: true })
  reviewedDate: Date | null;

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
