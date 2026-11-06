import { MigrationInterface, QueryRunner } from 'typeorm';

export class P6WebhookCaselib1793929497613 implements MigrationInterface {
  name = 'P6WebhookCaselib1793929497613';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`zt_test_report\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`product_id\` bigint NOT NULL DEFAULT '0', \`project_id\` bigint NOT NULL DEFAULT '0', \`task_id\` bigint NOT NULL DEFAULT '0', \`title\` varchar(90) NOT NULL, \`owner\` varchar(30) NOT NULL DEFAULT '', \`begin\` date NULL, \`end\` date NULL, \`goal\` text NULL, \`results\` text NULL, \`created_by\` varchar(30) NOT NULL DEFAULT '', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_test_report_task\` (\`task_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_webhook\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`type\` varchar(30) NOT NULL DEFAULT 'default', \`name\` varchar(90) NOT NULL, \`url\` varchar(500) NOT NULL, \`secret\` varchar(255) NOT NULL DEFAULT '', \`actions\` text NULL, \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_webhook_log\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`webhook_id\` bigint NOT NULL, \`action_id\` bigint NOT NULL DEFAULT '0', \`result\` varchar(20) NOT NULL DEFAULT '', \`response\` text NULL, \`date\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX \`idx_zt_webhook_log\` (\`webhook_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_query\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`user_id\` varchar(30) NOT NULL, \`module\` varchar(30) NOT NULL, \`title\` varchar(90) NOT NULL, \`params\` text NOT NULL, INDEX \`idx_zt_query_user\` (\`user_id\`, \`module\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_case_lib\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` varchar(90) NOT NULL, \`desc\` text NULL, \`owner_id\` varchar(30) NOT NULL DEFAULT '', \`created_by\` varchar(30) NOT NULL DEFAULT '', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_testsuite\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`product_id\` bigint NOT NULL, \`name\` varchar(90) NOT NULL, \`type\` varchar(30) NOT NULL DEFAULT 'feature', \`desc\` text NULL, \`created_by\` varchar(30) NOT NULL DEFAULT '', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_suite_case\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`suite_id\` bigint NOT NULL, \`case_id\` bigint NOT NULL, \`case_version\` smallint NOT NULL DEFAULT '1', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE INDEX \`idx_zt_suite_case_unique\` (\`suite_id\`, \`case_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`idx_zt_suite_case_unique\` ON \`zt_suite_case\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_suite_case\``);
    await queryRunner.query(`DROP TABLE \`zt_testsuite\``);
    await queryRunner.query(`DROP TABLE \`zt_case_lib\``);
    await queryRunner.query(`DROP INDEX \`idx_zt_query_user\` ON \`zt_query\``);
    await queryRunner.query(`DROP TABLE \`zt_query\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_webhook_log\` ON \`zt_webhook_log\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_webhook_log\``);
    await queryRunner.query(`DROP TABLE \`zt_webhook\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_test_report_task\` ON \`zt_test_report\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_test_report\``);
  }
}
