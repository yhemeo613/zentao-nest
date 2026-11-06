import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 测试报告（docs/03 §4.22；从 testtask 聚合生成，docs/04 §6） */
@Entity('zt_test_report')
@Index('idx_zt_test_report_task', ['taskId'])
export class ZtTestReport {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', default: 0 })
  productId: number;

  @Column({ type: 'bigint', default: 0 })
  projectId: number;

  @Column({ type: 'bigint', default: 0 })
  taskId: number;

  @Column({ type: 'varchar', length: 90 })
  title: string;

  @Column({ type: 'varchar', length: 30, default: '' })
  owner: string;

  @Column({ type: 'date', nullable: true })
  begin: Date | null;

  @Column({ type: 'date', nullable: true })
  end: Date | null;

  @Column({ type: 'text', nullable: true })
  goal: string | null;

  /** 聚合结果 JSON：{total, passed, failed, blocked, passRate, cases[], bugs[]} */
  @Column({ type: 'simple-json', nullable: true })
  results: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 30, default: '' })
  createdBy: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'tinyint', default: 0 })
  deleted: number;
}

/** Webhook 配置（docs/03 §4.24；一期配置管理，投递随 P7 通道） */
@Entity('zt_webhook')
export class ZtWebhook {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  /** dinggroup/dinguser/wechatgroup/wechatuser/feishugroup/feishuuser/default */
  @Column({ type: 'varchar', length: 30, default: 'default' })
  type: string;

  @Column({ type: 'varchar', length: 90 })
  name: string;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  secret: string;

  /** 订阅动作矩阵（objectType.action 数组，docs/02 §9.2） */
  @Column({ type: 'simple-json', nullable: true })
  actions: string[] | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'tinyint', default: 0 })
  deleted: number;
}

/** Webhook 投递日志 */
@Entity('zt_webhook_log')
@Index('idx_zt_webhook_log', ['webhookId'])
export class ZtWebhookLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  webhookId: string;

  @Column({ type: 'bigint', default: 0 })
  actionId: number;

  @Column({ type: 'varchar', length: 20, default: '' })
  result: string;

  @Column({ type: 'text', nullable: true })
  response: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  date: Date;
}

/** 自定义查询（docs/03 §7 queryID 机制） */
@Entity('zt_query')
@Index('idx_zt_query_user', ['userId', 'module'])
export class ZtQuery {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 30 })
  userId: string;

  @Column({ type: 'varchar', length: 30 })
  module: string;

  @Column({ type: 'varchar', length: 90 })
  title: string;

  /** filter DSL 参数（docs/03 §7） */
  @Column({ type: 'simple-json' })
  params: Record<string, unknown>;
}
