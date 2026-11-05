import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 发布-关联对象（docs/04 §6 zt_release_related 规范化） */
@Entity('zt_release_related')
@Index('idx_zt_release_related', ['releaseId', 'objectType', 'objectId'])
export class ZtReleaseRelated {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  releaseId: string;

  @Column({ type: 'varchar', length: 30 })
  objectType: string;

  @Column({ type: 'bigint' })
  objectId: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
