import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 需求多分支阶段（docs/04 §4 zt_story_stage；P3 单分支主干用） */
@Entity('zt_story_stage')
@Index('idx_zt_story_stage_unique', ['storyId', 'branchId'], { unique: true })
export class ZtStoryStage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  storyId: string;

  @Column({ type: 'int', default: 0 })
  branchId: number;

  @Column({ type: 'varchar', length: 50, default: 'wait' })
  stage: string;

  @Column({ type: 'varchar', length: 30, default: '' })
  stagedBy: string;
}
