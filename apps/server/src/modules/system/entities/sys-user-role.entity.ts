import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 用户-角色（含项目级覆盖维度：project_id=0 全局，>0 仅该项目内生效，docs/02 §2.1） */
@Entity('sys_user_role')
@Index('idx_sys_user_role_unique', ['userId', 'roleId', 'projectId'], {
  unique: true,
})
export class SysUserRole {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  userId: string;

  @Column({ type: 'bigint' })
  roleId: string;

  @Column({ type: 'bigint', default: 0 })
  projectId: number;
}
