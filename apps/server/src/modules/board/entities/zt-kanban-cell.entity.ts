import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 看板单元格（docs/04 §7 zt_kanban_cell；UNIQUE(execution,lane,column)；cards 存任务 ID 串） */
@Entity('zt_kanban_cell')
@Index('idx_zt_cell_unique', ['executionId', 'laneId', 'columnId'], {
  unique: true,
})
export class ZtKanbanCell {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  executionId: number;

  @Column({ type: 'bigint' })
  laneId: string;

  @Column({ type: 'bigint' })
  columnId: string;

  /** 单元格对象类型（跟随泳道：story/bug/task） */
  @Column({ type: 'varchar', length: 30, default: 'task' })
  type: string;

  /** 任务 ID 逗号串（顺序即列内排序；服务端维护，docs/02 §8.1） */
  @Column({ type: 'text', nullable: true })
  cards: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
