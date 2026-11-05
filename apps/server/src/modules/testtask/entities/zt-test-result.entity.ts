import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 测试结果明细（docs/04 §6 zt_test_result；每次 runCase 插一条，fail 转 Bug 溯源基础） */
@Entity('zt_test_result')
@Index('idx_zt_test_result_run', ['runId', 'caseId'])
export class ZtTestResult {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  runId: string;

  @Column({ type: 'bigint' })
  caseId: string;

  @Column({ type: 'smallint', default: 1 })
  version: number;

  /** 用例级聚合结果（任一步 fail → fail，docs/02 §7.3） */
  @Column({ type: 'varchar', length: 30 })
  caseResult: string;

  /** 步骤级明细 JSON：[{stepId, result, real}] */
  @Column({ type: 'simple-json', nullable: true })
  stepResults: Array<{ stepId: number; result: string; real?: string }> | null;

  @Column({ type: 'varchar', length: 30 })
  lastRunner: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  date: Date;
}
