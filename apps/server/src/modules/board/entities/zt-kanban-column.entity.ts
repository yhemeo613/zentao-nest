import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 看板列（docs/04 §7 zt_kanban_column；parent 支持父子列；wip_limit=-1 不限） */
@Entity('zt_kanban_column')
@Index('idx_zt_column_exec', ['executionId'])
export class ZtKanbanColumn {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  executionId: number;

  /** wait | develop | developing | developed | pause | canceled | closed（枚举 KanbanColumnTypes） */
  @Column({ type: 'varchar', length: 30 })
  type: string;

  /** 父列 ID（0=顶层；developing/developed 的父=develop 列） */
  @Column({ type: 'bigint', default: 0 })
  parentId: number;

  @Column({ type: 'varchar', length: 255, default: '' })
  name: string;

  @Column({ type: 'char', length: 7, default: '' })
  color: string;

  /** WIP 限制（-1=不限；子列合计≤父列 5202；超限仅广播警告不拦截，docs/02 §8.1） */
  @Column({ type: 'int', default: -1 })
  wipLimit: number;

  @Column({ type: 'int', default: 0 })
  sortNo: number;

  @Column({ type: 'tinyint', default: 0 })
  archived: number;

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
