import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 需求版本化描述（docs/04 §4 zt_story_spec；变更产生新版本，docs/02 §4.3） */
@Entity('zt_story_spec')
@Index('idx_zt_story_spec_unique', ['storyId', 'version'], { unique: true })
export class ZtStorySpec {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  storyId: string;

  @Column({ type: 'smallint', default: 1 })
  version: number;

  @Column({ type: 'varchar', length: 255, default: '' })
  title: string;

  @Column({ type: 'text', nullable: true })
  spec: string | null;

  @Column({ type: 'text', nullable: true })
  verify: string | null;
}
