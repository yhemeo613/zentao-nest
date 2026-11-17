import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 版本（docs/04 §5 zt_build；无状态机——构建是快照不是流程对象，docs/02 §5.2） */
@Entity('zt_build')
@Index('idx_zt_build_product', ['productId'])
export class ZtBuild {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', default: 0 })
  projectId: number;

  @Column({ type: 'bigint' })
  productId: number;

  @Column({ type: 'varchar', length: 255, default: '0' })
  branch: string;

  @Column({ type: 'bigint', default: 0 })
  executionId: number;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  scmPath: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  filePath: string;

  @Column({ type: 'date', nullable: true })
  date: Date | null;

  @Column({ type: 'varchar', length: 30, default: '' })
  builder: string;

  @Column({ type: 'text', nullable: true })
  desc: string | null;

  /** 范围需求/修复 Bug ID 串（禅道逗号串冗余语义；规范化关联见 zt_build_story/zt_build_bug） */
  @Column({ type: 'varchar', length: 255, default: '' })
  stories: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  bugs: string;

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
