import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 文档版本化正文（docs/04 §8 zt_doc_content；编辑生成新版本） */
@Entity('zt_doc_content')
@Index('idx_zt_doc_content_unique', ['docId', 'version'], { unique: true })
export class ZtDocContent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  docId: string;

  @Column({ type: 'smallint', default: 1 })
  version: number;

  @Column({ type: 'longtext', nullable: true })
  content: string | null;

  @Column({ type: 'varchar', length: 30, default: '' })
  editedBy: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
