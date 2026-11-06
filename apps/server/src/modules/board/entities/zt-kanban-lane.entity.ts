import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 看板泳道（docs/04 §7 zt_kanban_lane；type=story/bug/task） */
@Entity('zt_kanban_lane')
@Index('idx_zt_lane_exec', ['executionId'])
export class ZtKanbanLane {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  executionId: number;

  /** story | bug | task */
  @Column({ type: 'varchar', length: 30 })
  type: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  name: string;

  @Column({ type: 'char', length: 7, default: '' })
  color: string;

  @Column({ type: 'int', default: 0 })
  sortNo: number;

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
