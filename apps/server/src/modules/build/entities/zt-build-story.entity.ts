import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 版本-需求关联（docs/04 §5 zt_build_story；禅道逗号串的规范化复刻，语义不变） */
@Entity('zt_build_story')
@Index('idx_zt_build_story_unique', ['buildId', 'storyId'], { unique: true })
export class ZtBuildStory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  buildId: string;

  @Column({ type: 'bigint' })
  storyId: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
