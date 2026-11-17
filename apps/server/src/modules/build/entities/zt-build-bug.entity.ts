import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 版本-Bug 关联（docs/04 §5 zt_build_bug；关联未解决 Bug 自动置 resolved/fixed，docs/02 §5.2） */
@Entity('zt_build_bug')
@Index('idx_zt_build_bug_unique', ['buildId', 'bugId'], { unique: true })
export class ZtBuildBug {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  buildId: string;

  @Column({ type: 'bigint' })
  bugId: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
