import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 用例历史版本摘要（docs/04 §6 zt_case_spec） */
@Entity('zt_case_spec')
@Index('idx_zt_case_spec_unique', ['caseId', 'version'], { unique: true })
export class ZtCaseSpec {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  caseId: string;

  @Column({ type: 'smallint', default: 1 })
  version: number;

  @Column({ type: 'varchar', length: 255, default: '' })
  title: string;

  @Column({ type: 'text', nullable: true })
  precondition: string | null;
}
