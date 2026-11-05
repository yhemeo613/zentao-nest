import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 发布（docs/04 §6 zt_release；状态 wait/normal/fail/terminate，docs/02 §5.3） */
@Entity('zt_release')
@Index('idx_zt_release_product', ['productId'])
export class ZtRelease {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  /** 多项目 ID 串（禅道 varchar 语义） */
  @Column({ type: 'varchar', length: 255, default: '0' })
  projectIds: string;

  @Column({ type: 'bigint' })
  productId: number;

  @Column({ type: 'varchar', length: 255, default: '0' })
  branch: string;

  /** 关联构建 ID 串（禅道 build varchar 语义） */
  @Column({ type: 'varchar', length: 255, default: '' })
  buildIds: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'tinyint', default: 0 })
  marker: number;

  @Column({ type: 'date', nullable: true })
  date: Date | null;

  @Column({ type: 'datetime', nullable: true })
  releasedDate: Date | null;

  /** 范围需求/修复 Bug/遗留 Bug ID 串（禅道 text 冗余语义） */
  @Column({ type: 'text', nullable: true })
  stories: string | null;

  @Column({ type: 'text', nullable: true })
  bugs: string | null;

  @Column({ type: 'text', nullable: true })
  leftBugs: string | null;

  @Column({ type: 'text', nullable: true })
  desc: string | null;

  /** normal | terminate（wait/fail 在状态机内流转） */
  @Column({ type: 'varchar', length: 20, default: 'wait' })
  status: string;

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
