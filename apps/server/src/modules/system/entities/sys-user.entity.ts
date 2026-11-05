import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 用户（字段规格：docs/04 §2 sys_user；role 仅展示不参与鉴权） */
@Entity('sys_user')
@Index('idx_sys_user_account', ['account'], { unique: true })
export class SysUser {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 64 })
  account: string;

  /** bcrypt(cost12) */
  @Column({ type: 'varchar', length: 100 })
  password: string;

  @Column({ type: 'varchar', length: 100, default: '' })
  realname: string;

  @Column({ type: 'varchar', length: 60, default: '' })
  nickname: string;

  /** 职位展示字段（dev/qa/pm/po/td/pd/qd/top/others），不参与鉴权（docs/02 §2.1） */
  @Column({ type: 'varchar', length: 30, default: '' })
  role: string;

  @Column({ type: 'bigint', default: 0 })
  deptId: string;

  @Column({ type: 'char', length: 1, default: 'f' })
  gender: string;

  @Column({ type: 'varchar', length: 90, default: '' })
  email: string;

  @Column({ type: 'varchar', length: 20, default: '' })
  mobile: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  avatar: string;

  @Column({ type: 'date', nullable: true })
  joinDate: Date | null;

  @Column({ type: 'int', default: 0 })
  visits: number;

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  /** 连续登录失败次数（≥5 锁定 15 分钟，docs/03 §8） */
  @Column({ type: 'smallint', default: 0 })
  fails: number;

  @Column({ type: 'datetime', nullable: true })
  lockedUntil: Date | null;

  @Column({ type: 'varchar', length: 10, default: 'zh-cn' })
  clientLang: string;

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

  /** 软删除标志（docs/04 §1 全局约定） */
  @Column({ type: 'tinyint', default: 0 })
  deleted: number;
}
