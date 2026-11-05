import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 用例步骤（docs/04 §6 zt_case_step；版本化整套重插，parent 支持步骤组，docs/02 §7.2） */
@Entity('zt_case_step')
@Index('idx_zt_case_step_unique', ['caseId', 'version'])
export class ZtCaseStep {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  caseId: string;

  @Column({ type: 'smallint', default: 1 })
  version: number;

  /** 0=普通步骤；>0=所属步骤组 */
  @Column({ type: 'bigint', default: 0 })
  parentId: number;

  /** step | group | item */
  @Column({ type: 'varchar', length: 10, default: 'step' })
  type: string;

  @Column({ type: 'text', nullable: true })
  stepDesc: string | null;

  @Column({ type: 'text', nullable: true })
  expect: string | null;

  @Column({ type: 'int', default: 0 })
  sortNo: number;
}
