import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 数据权限白名单（对齐禅道 zt_acl，docs/02 §2.2；可见集计算源之一） */
@Entity('sys_acl')
@Index('idx_sys_acl_object', ['objectType', 'objectId'])
@Index('idx_sys_acl_user', ['userId'])
export class SysAcl {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  userId: string;

  @Column({ type: 'varchar', length: 30 })
  /** program | product | project | execution | kanban */
  objectType: string;

  @Column({ type: 'bigint' })
  objectId: string;

  /** 白名单来源（手工/流程），对齐禅道 source 字段 */
  @Column({ type: 'varchar', length: 30, default: '' })
  source: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
