import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 角色（字段规格：docs/04 §2 sys_role；is_super 超管直通鉴权） */
@Entity('sys_role')
@Index('idx_sys_role_code', ['code'], { unique: true })
export class SysRole {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 30 })
  name: string;

  @Column({ type: 'varchar', length: 30 })
  code: string;

  @Column({ type: 'tinyint', default: 0 })
  isSuper: number;

  @Column({ type: 'varchar', length: 255, default: '' })
  remark: string;

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
