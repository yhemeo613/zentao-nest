import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 文档库（docs/04 §8 zt_doc_lib；main=对象默认库） */
@Entity('zt_doc_lib')
@Index('idx_zt_doc_lib_space', ['spaceId'])
export class ZtDocLib {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  spaceId: string;

  @Column({ type: 'varchar', length: 60 })
  name: string;

  @Column({ type: 'tinyint', default: 0 })
  main: number;

  @Column({ type: 'int', default: 0 })
  sortNo: number;

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
