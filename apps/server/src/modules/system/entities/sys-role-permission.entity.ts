import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 角色-权限（对齐禅道 grouppriv 的 (group, module, method) 结构，docs/02 §2.1） */
@Entity('sys_role_permission')
@Index('idx_sys_role_permission_unique', ['roleId', 'permissionId'], {
  unique: true,
})
export class SysRolePermission {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  roleId: string;

  @Column({ type: 'bigint' })
  permissionId: string;
}
