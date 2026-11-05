import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 需求评审记录（docs/04 §4 zt_story_review；每版本每评审人一行，docs/02 §4.2） */
@Entity('zt_story_review')
@Index('idx_zt_story_review_unique', ['storyId', 'version', 'reviewerId'], {
  unique: true,
})
export class ZtStoryReview {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  storyId: string;

  @Column({ type: 'smallint', default: 1 })
  version: number;

  @Column({ type: 'varchar', length: 30 })
  reviewerId: string;

  /** ''（待评）| pass | revert | clarify | reject */
  @Column({ type: 'varchar', length: 30, default: '' })
  result: string;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date | null;
}
