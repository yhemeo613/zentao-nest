import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 产品模块树（docs/04 §8 zt_module；需求/用例共用 root_type=product） */
@Entity('zt_module')
@Index('idx_zt_module_root', ['rootType', 'rootId'])
export class ZtModule {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 10, default: 'product' })
  rootType: string;

  @Column({ type: 'varchar', length: 30 })
  rootId: string;

  @Column({ type: 'bigint', default: 0 })
  branchId: number;

  @Column({ type: 'bigint', default: 0 })
  parentId: number;

  @Column({ type: 'text', nullable: true })
  pathStr: string | null;

  @Column({ type: 'tinyint', default: 1 })
  grade: number;

  @Column({ type: 'varchar', length: 60 })
  name: string;

  @Column({ type: 'varchar', length: 30, default: '' })
  ownerId: string;

  @Column({ type: 'int', default: 0 })
  sortNo: number;

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
