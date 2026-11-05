import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** 部门树（字段规格：docs/04 §2 sys_dept；path 物化路径 ",1,5," 语义） */
@Entity('sys_dept')
export class SysDept {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', default: 0 })
  parentId: number;

  @Column({ type: 'varchar', length: 255, default: '' })
  pathStr: string;

  @Column({ type: 'tinyint', default: 1 })
  grade: number;

  @Column({ type: 'varchar', length: 60 })
  name: string;

  @Column({ type: 'varchar', length: 30, default: '' })
  manager: string;

  @Column({ type: 'int', default: 0 })
  sortNo: number;

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
