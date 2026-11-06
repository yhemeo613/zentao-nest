import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 附件（docs/04 §8 zt_file；本地磁盘存储 + 元数据） */
@Entity('zt_file')
@Index('idx_zt_file_object', ['objectType', 'objectId'])
export class ZtFile {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  /** uuid 存储键（不可预测，docs/03 §8） */
  @Column({ type: 'varchar', length: 255 })
  storageKey: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  title: string;

  @Column({ type: 'varchar', length: 30, default: '' })
  extension: string;

  @Column({ type: 'bigint', default: 0 })
  size: number;

  @Column({ type: 'varchar', length: 30, default: '' })
  objectType: string;

  @Column({ type: 'bigint', default: 0 })
  objectId: number;

  @Column({ type: 'varchar', length: 30, default: '' })
  createdBy: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'tinyint', default: 0 })
  deleted: number;
}
