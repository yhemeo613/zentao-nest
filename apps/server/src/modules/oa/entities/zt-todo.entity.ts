import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 待办（docs/04 §8 zt_todo；四态 wait→doing→done→closed，docs/02 §11） */
@Entity('zt_todo')
@Index('idx_zt_todo_user', ['userId'])
@Index('idx_zt_todo_date', ['date'])
export class ZtTodo {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 30 })
  userId: string;

  @Column({ type: 'date', nullable: true })
  date: Date | null;

  /** custom | task | bug | story | test | cycle */
  @Column({ type: 'varchar', length: 15, default: 'custom' })
  type: string;

  /** type≠custom 时的关联对象 ID */
  @Column({ type: 'bigint', default: 0 })
  objectId: number;

  @Column({ type: 'tinyint', default: 3 })
  pri: number;

  /** custom 类型必填；关联类型取对象标题 */
  @Column({ type: 'varchar', length: 150, default: '' })
  name: string;

  @Column({ type: 'text', nullable: true })
  desc: string | null;

  /** wait | doing | done | closed */
  @Column({ type: 'varchar', length: 10, default: 'wait' })
  status: string;

  @Column({ type: 'tinyint', default: 0 })
  privateFlag: number;

  @Column({ type: 'varchar', length: 30, default: '' })
  assignedTo: string;

  @Column({ type: 'varchar', length: 30, default: '' })
  finishedBy: string;

  @Column({ type: 'datetime', nullable: true })
  finishedAt: Date | null;

  @Column({ type: 'varchar', length: 30, default: '' })
  closedBy: string;

  @Column({ type: 'datetime', nullable: true })
  closedAt: Date | null;

  @Column({ type: 'varchar', length: 30, default: '' })
  createdBy: string;

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
