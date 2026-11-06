import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 用例库（docs/03 §4.20 caselib；复刻规范化独立表，docs/04 §6） */
@Entity('zt_case_lib')
export class ZtCaseLib {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 90 })
  name: string;

  @Column({ type: 'text', nullable: true })
  desc: string | null;

  @Column({ type: 'varchar', length: 30, default: '' })
  ownerId: string;

  @Column({ type: 'varchar', length: 30, default: '' })
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

/** 用例套件（docs/03 §4.21；P5 表延后至此落地） */
@Entity('zt_testsuite')
export class ZtTestSuite {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  productId: number;

  @Column({ type: 'varchar', length: 90 })
  name: string;

  /** unit | feature | ... */
  @Column({ type: 'varchar', length: 30, default: 'feature' })
  type: string;

  @Column({ type: 'text', nullable: true })
  desc: string | null;

  @Column({ type: 'varchar', length: 30, default: '' })
  createdBy: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'tinyint', default: 0 })
  deleted: number;
}

/** 套件-用例（带版本快照，UNIQUE） */
@Entity('zt_suite_case')
@Index('idx_zt_suite_case_unique', ['suiteId', 'caseId'], { unique: true })
export class ZtSuiteCase {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  suiteId: string;

  @Column({ type: 'bigint' })
  caseId: string;

  @Column({ type: 'smallint', default: 1 })
  caseVersion: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
