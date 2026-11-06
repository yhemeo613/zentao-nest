import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 产品分支（docs/03 §4.19；branch_id=0 主干不可删） */
@Entity('zt_branch')
@Index('idx_zt_branch_product', ['productId'])
export class ZtBranch {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  productId: number;

  @Column({ type: 'varchar', length: 45 })
  name: string;

  @Column({ type: 'int', default: 0 })
  sortNo: number;

  @Column({ type: 'varchar', length: 30, default: '' })
  createdBy: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'tinyint', default: 0 })
  deleted: number;
}

/** 产品线（docs/04 §3 zt_product_line 复刻规范化） */
@Entity('zt_product_line')
export class ZtProductLine {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 60 })
  name: string;

  @Column({ type: 'int', default: 0 })
  sortNo: number;

  @Column({ type: 'varchar', length: 30, default: '' })
  createdBy: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'tinyint', default: 0 })
  deleted: number;
}
