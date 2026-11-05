import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 项目/执行-需求范围（docs/04 §3 zt_project_story；P3 需求域启用，P2 建表） */
@Entity('zt_project_story')
@Index('idx_zt_ps_unique', ['scopeType', 'scopeId', 'storyId'], {
  unique: true,
})
export class ZtProjectStory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  /** project | execution（复刻规范化：禅道单表双语义显式化） */
  @Column({ type: 'varchar', length: 10 })
  scopeType: string;

  @Column({ type: 'bigint' })
  scopeId: string;

  @Column({ type: 'bigint' })
  productId: number;

  @Column({ type: 'bigint', default: 0 })
  branchId: number;

  @Column({ type: 'bigint' })
  storyId: string;

  @Column({ type: 'smallint', default: 1 })
  storyVersion: number;

  @Column({ type: 'int', default: 0 })
  sortNo: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
