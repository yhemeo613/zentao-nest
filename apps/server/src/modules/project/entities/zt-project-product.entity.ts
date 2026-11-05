import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 项目-产品关联（docs/04 §3 zt_project_product；项目圈选产品入口，UNIQUE 三元组） */
@Entity('zt_project_product')
@Index('idx_zt_pp_unique', ['projectId', 'productId', 'branchId'], {
  unique: true,
})
export class ZtProjectProduct {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  projectId: number;

  @Column({ type: 'bigint' })
  productId: number;

  /** 0=主干 */
  @Column({ type: 'bigint', default: 0 })
  branchId: number;

  /** 关联计划 ID 串（逗号分隔，禅道语义） */
  @Column({ type: 'varchar', length: 255, default: '' })
  plan: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  roadmap: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
