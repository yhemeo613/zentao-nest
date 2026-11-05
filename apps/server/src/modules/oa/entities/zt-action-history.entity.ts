import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 变更字段明细（docs/04 §8 zt_action_history；一主多从，docs/02 §9.1） */
@Entity('zt_action_history')
@Index('idx_zt_action_history', ['actionId'])
export class ZtActionHistory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  actionId: string;

  @Column({ type: 'varchar', length: 50 })
  field: string;

  @Column({ type: 'text', nullable: true })
  oldValue: string | null;

  @Column({ type: 'text', nullable: true })
  newValue: string | null;
}
