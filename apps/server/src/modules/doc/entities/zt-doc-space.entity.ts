import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 文档空间（docs/04 §8 zt_doc_space；product/project/execution/personal 四类） */
@Entity('zt_doc_space')
@Index('idx_zt_doc_space_object', ['objectType', 'objectId'])
export class ZtDocSpace {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  /** product | project | execution | personal */
  @Column({ type: 'varchar', length: 20 })
  objectType: string;

  @Column({ type: 'bigint', default: 0 })
  objectId: number;

  @Column({ type: 'varchar', length: 90 })
  name: string;

  /** open | private | custom */
  @Column({ type: 'varchar', length: 10, default: 'open' })
  acl: string;

  @Column({ type: 'simple-json', nullable: true })
  whitelist: string[] | null;

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
