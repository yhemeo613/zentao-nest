import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 权限点（docs/04 §2 sys_permission；来源=种子脚本扫描 @Permissions 装饰器，docs/03 §3.1） */
@Entity('sys_permission')
@Index('idx_sys_permission_unique', ['module', 'action'], { unique: true })
export class SysPermission {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 30 })
  module: string;

  @Column({ type: 'varchar', length: 30 })
  action: string;

  @Column({ type: 'varchar', length: 60, default: '' })
  name: string;

  @Column({ type: 'varchar', length: 160, default: '' })
  path: string;

  @Column({ type: 'varchar', length: 10, default: '' })
  httpMethod: string;

  @Column({ type: 'int', default: 0 })
  sortNo: number;

  /** active | deprecated（种子扫描时对缺失项标记，不物理删除） */
  @Column({ type: 'varchar', length: 10, default: 'active' })
  status: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
