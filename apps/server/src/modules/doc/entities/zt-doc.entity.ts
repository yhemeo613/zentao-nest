import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 文档（docs/04 §8 zt_doc；Markdown 正文版本化在 zt_doc_content） */
@Entity('zt_doc')
@Index('idx_zt_doc_lib', ['libId'])
export class ZtDoc {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  libId: string;

  @Column({ type: 'bigint', default: 0 })
  moduleId: number;

  @Column({ type: 'varchar', length: 90 })
  title: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  keywords: string;

  /** text | markdown | link（一期 markdown） */
  @Column({ type: 'varchar', length: 20, default: 'markdown' })
  type: string;

  /** link 类型时的 URL */
  @Column({ type: 'varchar', length: 500, default: '' })
  url: string;

  @Column({ type: 'smallint', default: 1 })
  version: number;

  @Column({ type: 'int', default: 0 })
  views: number;

  /** 挂载业务对象（uploadDocs 语义） */
  @Column({ type: 'varchar', length: 30, default: '' })
  objectType: string;

  @Column({ type: 'bigint', default: 0 })
  objectId: number;

  @Column({ type: 'int', default: 0 })
  sortNo: number;

  @Column({ type: 'varchar', length: 30, default: '' })
  openedBy: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  openedAt: Date;

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
