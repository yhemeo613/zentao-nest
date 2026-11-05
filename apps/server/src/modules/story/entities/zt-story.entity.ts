import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 需求（字段规格：docs/04 §4 zt_story；spec/verify 正文在 zt_story_spec 版本表） */
@Entity('zt_story')
@Index('idx_zt_story_product', ['productId'])
@Index('idx_zt_story_parent', ['parentId'])
@Index('idx_zt_story_status', ['status'])
export class ZtStory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', default: 0 })
  parentId: number;

  @Column({ type: 'tinyint', default: 0 })
  isParent: number;

  @Column({ type: 'bigint', default: 0 })
  rootId: number;

  @Column({ type: 'text', nullable: true })
  pathStr: string | null;

  @Column({ type: 'tinyint', default: 0 })
  grade: number;

  @Column({ type: 'bigint' })
  productId: number;

  @Column({ type: 'int', default: 0 })
  branchId: number;

  @Column({ type: 'bigint', default: 0 })
  moduleId: number;

  /** 关联计划 ID（冗余首计划，权威在 zt_plan_story） */
  @Column({ type: 'varchar', length: 255, default: '' })
  plan: string;

  @Column({ type: 'varchar', length: 20, default: '' })
  source: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  sourceNote: string;

  @Column({ type: 'bigint', default: 0 })
  fromBugId: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  keywords: string;

  /** story | requirement | epic（一期 story） */
  @Column({ type: 'varchar', length: 20, default: 'story' })
  type: string;

  @Column({ type: 'varchar', length: 30, default: 'feature' })
  category: string;

  @Column({ type: 'tinyint', default: 3 })
  pri: number;

  /** 预估（父需求=子需求求和，docs/02 §4.5 computeEstimate） */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  estimate: number;

  /** draft | reviewing | active | changing | closed（docs/02 §4.2） */
  @Column({ type: 'varchar', length: 10, default: 'draft' })
  status: string;

  /** 15 值 stage（docs/02 §4.4 setStage 引擎维护） */
  @Column({ type: 'varchar', length: 10, default: 'wait' })
  stage: string;

  /** 人工设阶段者：非空则跳过自动计算（docs/02 §4.4） */
  @Column({ type: 'varchar', length: 30, default: '' })
  stagedBy: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  mailto: string;

  /** spec 版本号（变更 +1，docs/02 §4.3） */
  @Column({ type: 'smallint', default: 1 })
  version: number;

  @Column({ type: 'char', length: 7, default: '' })
  color: string;

  @Column({ type: 'varchar', length: 30, default: '' })
  openedBy: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  openedAt: Date;

  @Column({ type: 'varchar', length: 30, default: '' })
  assignedTo: string;

  @Column({ type: 'datetime', nullable: true })
  assignedAt: Date;

  @Column({ type: 'varchar', length: 30, default: '' })
  changedBy: string;

  @Column({ type: 'datetime', nullable: true })
  changedAt: Date;

  /** 历史评审人（逗号分隔账号语义 → P3 存用户 ID 串） */
  @Column({ type: 'varchar', length: 255, default: '' })
  reviewedBy: string;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date;

  @Column({ type: 'date', nullable: true })
  releasedDate: Date | null;

  @Column({ type: 'varchar', length: 30, default: '' })
  closedBy: string;

  @Column({ type: 'datetime', nullable: true })
  closedAt: Date;

  @Column({ type: 'varchar', length: 20, default: '' })
  closedReason: string;

  @Column({ type: 'datetime', nullable: true })
  activatedDate: Date | null;

  /** Bug 转需求回写（docs/02 §4.5） */
  @Column({ type: 'bigint', default: 0 })
  toBugId: number;

  @Column({ type: 'varchar', length: 255, default: '' })
  linkStories: string;

  @Column({ type: 'bigint', default: 0 })
  duplicateStoryId: number;

  /** 评审最终结果（extra 语义） */
  @Column({ type: 'varchar', length: 30, default: '' })
  finalResult: string;

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
