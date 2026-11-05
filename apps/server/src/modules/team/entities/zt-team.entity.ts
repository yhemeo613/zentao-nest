import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 项目/执行团队成员（字段规格：docs/04 §3 zt_team；UNIQUE(root_type, root_id, user_id)） */
@Entity('zt_team')
@Index('idx_zt_team_unique', ['rootType', 'rootId', 'userId'], { unique: true })
export class ZtTeam {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  /** project | execution */
  @Column({ type: 'varchar', length: 10 })
  rootType: string;

  @Column({ type: 'varchar', length: 30 })
  rootId: string;

  @Column({ type: 'varchar', length: 30 })
  userId: string;

  /** 成员角色（PM/dev/qa 等，展示与业务回落用） */
  @Column({ type: 'varchar', length: 30, default: '' })
  role: string;

  @Column({ type: 'varchar', length: 30, default: '' })
  position: string;

  /** 受限成员标记（对齐禅道 limited） */
  @Column({ type: 'tinyint', default: 0 })
  limited: number;

  @Column({ type: 'date', nullable: true })
  joinDate: Date | null;

  @Column({ type: 'smallint', default: 0 })
  days: number;

  /** 日可用工时 */
  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  hours: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  estimate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  consumed: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  left: number;

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
}
