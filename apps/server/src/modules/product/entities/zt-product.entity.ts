import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 产品（字段规格：docs/04 §3 zt_product；统计列不建——由 summary 接口聚合+Redis，docs/04 §3 差异说明） */
@Entity('zt_product')
@Index('idx_zt_product_program', ['programId'])
export class ZtProduct {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  /** 0=独立产品 */
  @Column({ type: 'bigint', default: 0 })
  programId: number;

  /** 影子产品（仅关联执行） */
  @Column({ type: 'tinyint', default: 0 })
  shadow: number;

  @Column({ type: 'varchar', length: 110 })
  name: string;

  @Column({ type: 'varchar', length: 45, default: '' })
  code: string;

  @Column({ type: 'varchar', length: 30, default: 'normal' })
  type: string;

  /** active | closed */
  @Column({ type: 'varchar', length: 30, default: 'active' })
  status: string;

  @Column({ type: 'varchar', length: 30, default: '' })
  poId: string;

  @Column({ type: 'varchar', length: 30, default: '' })
  qdId: string;

  @Column({ type: 'varchar', length: 30, default: '' })
  rdId: string;

  @Column({ type: 'varchar', length: 10, default: 'open' })
  acl: string;

  @Column({ type: 'simple-json', nullable: true })
  whitelist: string[] | null;

  @Column({ type: 'text', nullable: true })
  desc: string | null;

  @Column({ type: 'datetime', nullable: true })
  closedDate: Date | null;

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
