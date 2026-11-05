import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 计划-需求关联（docs/04 §4 zt_plan_story；关联后需求 stage=planned，docs/02 §5.1） */
@Entity('zt_plan_story')
@Index('idx_zt_plan_story_unique', ['planId', 'storyId'], { unique: true })
export class ZtPlanStory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  planId: string;

  @Column({ type: 'bigint' })
  storyId: string;

  @Column({ type: 'int', default: 0 })
  sortNo: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
