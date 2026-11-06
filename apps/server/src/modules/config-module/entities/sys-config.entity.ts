import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 运行时配置（docs/04 §2 sys_config；needReview/评审规则/上传白名单等键，docs/04 §9.3） */
@Entity('sys_config')
@Index(
  'idx_sys_config_unique',
  ['scope', 'owner', 'module', 'section', 'keyName'],
  { unique: true },
)
export class SysConfig {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  /** system | user */
  @Column({ type: 'varchar', length: 30, default: 'system' })
  scope: string;

  @Column({ type: 'varchar', length: 64, default: 'system' })
  owner: string;

  @Column({ type: 'varchar', length: 30 })
  module: string;

  @Column({ type: 'varchar', length: 30, default: 'common' })
  section: string;

  @Column({ type: 'varchar', length: 60 })
  keyName: string;

  @Column({ type: 'text', nullable: true })
  value: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
