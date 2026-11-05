import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 项目集（字段规格：docs/04 §3 zt_program；层级语义对齐禅道 type=program 行） */
@Entity('zt_program')
@Index('idx_zt_program_parent', ['parentId'])
export class ZtProgram {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', default: 0 })
  parentId: number;

  /** 层级深度：顶级=1，=父 grade+1（docs/02 §3.1） */
  @Column({ type: 'tinyint', default: 1 })
  grade: number;

  /** 物化路径：,1,5, 语义 */
  @Column({ type: 'varchar', length: 255, default: '' })
  pathStr: string;

  @Column({ type: 'int', default: 0 })
  sortNo: number;

  @Column({ type: 'varchar', length: 90 })
  name: string;

  @Column({ type: 'varchar', length: 45, default: '' })
  code: string;

  @Column({ type: 'varchar', length: 30, default: '' })
  pmId: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  budget: number;

  @Column({ type: 'varchar', length: 30, default: 'CNY' })
  budgetUnit: string;

  @Column({ type: 'date', nullable: true })
  begin: Date | null;

  @Column({ type: 'date', nullable: true })
  end: Date | null;

  @Column({ type: 'date', nullable: true })
  realBegan: Date | null;

  @Column({ type: 'date', nullable: true })
  realEnd: Date | null;

  @Column({ type: 'smallint', default: 0 })
  days: number;

  /** wait | doing | suspended | closed（docs/02 §3.5 状态机） */
  @Column({ type: 'varchar', length: 10, default: 'wait' })
  status: string;

  @Column({ type: 'varchar', length: 20, default: '' })
  closedReason: string;

  @Column({ type: 'varchar', length: 30, default: '' })
  canceledById: string;

  @Column({ type: 'datetime', nullable: true })
  suspendedDate: Date | null;

  /** open | private | custom */
  @Column({ type: 'varchar', length: 10, default: 'open' })
  acl: string;

  /** 白名单 user_id 数组（同时写 sys_acl，双写策略 docs/04 §3） */
  @Column({ type: 'simple-json', nullable: true })
  whitelist: string[] | null;

  @Column({ type: 'text', nullable: true })
  desc: string | null;

  @Column({ type: 'bigint', default: 0 })
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
