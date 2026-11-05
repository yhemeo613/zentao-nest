import { MigrationInterface, QueryRunner } from 'typeorm';

export class P3bTaskBugCaseTesttask1793867193746 implements MigrationInterface {
  name = 'P3bTaskBugCaseTesttask1793867193746';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`zt_bug\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`product_id\` bigint NOT NULL, \`branch_id\` int NOT NULL DEFAULT '0', \`module_id\` bigint NOT NULL DEFAULT '0', \`project_id\` bigint NOT NULL DEFAULT '0', \`execution_id\` bigint NOT NULL DEFAULT '0', \`story_id\` bigint NOT NULL DEFAULT '0', \`story_version\` smallint NOT NULL DEFAULT '1', \`task_id\` bigint NOT NULL DEFAULT '0', \`to_story_id\` bigint NOT NULL DEFAULT '0', \`case_id\` bigint NOT NULL DEFAULT '0', \`case_version\` smallint NOT NULL DEFAULT '0', \`result_id\` bigint NOT NULL DEFAULT '0', \`testtask_id\` bigint NOT NULL DEFAULT '0', \`opened_build\` varchar(255) NOT NULL DEFAULT '', \`resolved_build_id\` varchar(30) NOT NULL DEFAULT '', \`injection\` varchar(30) NOT NULL DEFAULT '', \`identify\` varchar(30) NOT NULL DEFAULT '', \`duplicate_bug_id\` bigint NOT NULL DEFAULT '0', \`related_bug\` varchar(255) NOT NULL DEFAULT '', \`title\` varchar(255) NOT NULL, \`keywords\` varchar(255) NOT NULL DEFAULT '', \`severity\` tinyint NOT NULL DEFAULT '3', \`pri\` tinyint NOT NULL DEFAULT '3', \`type\` varchar(30) NOT NULL DEFAULT 'code', \`os\` varchar(255) NOT NULL DEFAULT '', \`browser\` varchar(255) NOT NULL DEFAULT '', \`steps\` text NULL, \`status\` varchar(10) NOT NULL DEFAULT 'active', \`confirmed\` tinyint NOT NULL DEFAULT '0', \`activated_count\` smallint NOT NULL DEFAULT '0', \`opened_by\` varchar(30) NOT NULL DEFAULT '', \`opened_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`assigned_to\` varchar(30) NOT NULL DEFAULT '', \`assigned_at\` datetime NULL, \`deadline\` date NULL, \`resolved_by\` varchar(30) NOT NULL DEFAULT '', \`resolution\` varchar(20) NOT NULL DEFAULT '', \`resolved_at\` datetime NULL, \`closed_by\` varchar(30) NOT NULL DEFAULT '', \`closed_at\` datetime NULL, \`created_by\` bigint NOT NULL DEFAULT '0', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_bug_status\` (\`status\`), INDEX \`idx_zt_bug_story\` (\`story_id\`), INDEX \`idx_zt_bug_product\` (\`product_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_test_result\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`run_id\` bigint NOT NULL, \`case_id\` bigint NOT NULL, \`version\` smallint NOT NULL DEFAULT '1', \`case_result\` varchar(30) NOT NULL, \`step_results\` text NULL, \`last_runner\` varchar(30) NOT NULL, \`date\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX \`idx_zt_test_result_run\` (\`run_id\`, \`case_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_test_run\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`task_id\` bigint NOT NULL, \`case_id\` bigint NOT NULL, \`case_version\` smallint NOT NULL DEFAULT '1', \`assigned_to\` varchar(30) NOT NULL DEFAULT '', \`last_runner\` varchar(30) NOT NULL DEFAULT '', \`last_run_date\` datetime NULL, \`last_run_result\` varchar(30) NOT NULL DEFAULT '', \`status\` varchar(30) NOT NULL DEFAULT 'normal', UNIQUE INDEX \`idx_zt_test_run_unique\` (\`task_id\`, \`case_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_test_task\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`project_id\` bigint NOT NULL DEFAULT '0', \`product_id\` bigint NOT NULL, \`name\` varchar(90) NOT NULL, \`execution_id\` bigint NOT NULL DEFAULT '0', \`build_id\` bigint NOT NULL, \`joint\` tinyint NOT NULL DEFAULT '0', \`type\` varchar(255) NOT NULL DEFAULT '', \`owner_id\` varchar(30) NOT NULL DEFAULT '', \`pri\` tinyint NOT NULL DEFAULT '3', \`begin\` date NULL, \`end\` date NULL, \`real_began\` date NULL, \`real_finished_date\` datetime NULL, \`desc\` text NULL, \`status\` varchar(10) NOT NULL DEFAULT 'wait', \`auto\` varchar(10) NOT NULL DEFAULT 'no', \`members\` text NULL, \`created_by\` varchar(30) NOT NULL DEFAULT '', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_test_task_build\` (\`build_id\`), INDEX \`idx_zt_test_task_product\` (\`product_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_case_step\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`case_id\` bigint NOT NULL, \`version\` smallint NOT NULL DEFAULT '1', \`parent_id\` bigint NOT NULL DEFAULT '0', \`type\` varchar(10) NOT NULL DEFAULT 'step', \`step_desc\` text NULL, \`expect\` text NULL, \`sort_no\` int NOT NULL DEFAULT '0', INDEX \`idx_zt_case_step_unique\` (\`case_id\`, \`version\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_case_spec\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`case_id\` bigint NOT NULL, \`version\` smallint NOT NULL DEFAULT '1', \`title\` varchar(255) NOT NULL DEFAULT '', \`precondition\` text NULL, UNIQUE INDEX \`idx_zt_case_spec_unique\` (\`case_id\`, \`version\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_case\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`project_id\` bigint NOT NULL DEFAULT '0', \`product_id\` bigint NOT NULL, \`execution_id\` bigint NOT NULL DEFAULT '0', \`branch_id\` int NOT NULL DEFAULT '0', \`module_id\` bigint NOT NULL DEFAULT '0', \`story_id\` bigint NOT NULL DEFAULT '0', \`story_version\` smallint NOT NULL DEFAULT '1', \`title\` varchar(255) NOT NULL, \`precondition\` text NULL, \`keywords\` varchar(255) NOT NULL DEFAULT '', \`pri\` tinyint NOT NULL DEFAULT '3', \`type\` varchar(30) NOT NULL DEFAULT 'feature', \`auto\` varchar(10) NOT NULL DEFAULT 'no', \`status\` varchar(30) NOT NULL DEFAULT 'normal', \`stage\` varchar(255) NOT NULL DEFAULT '', \`version\` smallint NOT NULL DEFAULT '1', \`link_case\` varchar(255) NOT NULL DEFAULT '', \`from_bug_id\` bigint NOT NULL DEFAULT '0', \`last_runner\` varchar(30) NOT NULL DEFAULT '', \`last_run_date\` datetime NULL, \`last_run_result\` varchar(30) NOT NULL DEFAULT '', \`opened_by\` varchar(30) NOT NULL DEFAULT '', \`opened_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`reviewed_by\` varchar(255) NOT NULL DEFAULT '', \`reviewed_date\` date NULL, \`sort_no\` int NOT NULL DEFAULT '0', \`created_by\` bigint NOT NULL DEFAULT '0', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_case_story\` (\`story_id\`), INDEX \`idx_zt_case_product\` (\`product_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_effort\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`object_type\` varchar(30) NOT NULL, \`object_id\` bigint NOT NULL, \`project_id\` bigint NOT NULL DEFAULT '0', \`execution_id\` bigint NOT NULL DEFAULT '0', \`user_id\` varchar(30) NOT NULL, \`date\` date NOT NULL, \`consumed\` decimal(10,2) NOT NULL, \`left\` decimal(10,2) NOT NULL DEFAULT '0.00', \`work\` text NULL, \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_effort_user_date\` (\`user_id\`, \`date\`), INDEX \`idx_zt_effort_object\` (\`object_type\`, \`object_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_task\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`project_id\` bigint NOT NULL, \`parent_id\` bigint NOT NULL DEFAULT '0', \`is_parent\` tinyint NOT NULL DEFAULT '0', \`path_str\` varchar(255) NOT NULL DEFAULT '', \`execution_id\` bigint NOT NULL, \`module_id\` bigint NOT NULL DEFAULT '0', \`story_id\` bigint NOT NULL DEFAULT '0', \`story_version\` smallint NOT NULL DEFAULT '1', \`from_bug_id\` bigint NOT NULL DEFAULT '0', \`name\` varchar(255) NOT NULL, \`type\` varchar(20) NOT NULL DEFAULT 'devel', \`mode\` varchar(10) NOT NULL DEFAULT '', \`pri\` tinyint NOT NULL DEFAULT '3', \`estimate\` decimal(10,2) NOT NULL DEFAULT '0.00', \`consumed\` decimal(10,2) NOT NULL DEFAULT '0.00', \`left\` decimal(10,2) NOT NULL DEFAULT '0.00', \`deadline\` date NULL, \`status\` varchar(10) NOT NULL DEFAULT 'wait', \`color\` char(7) NOT NULL DEFAULT '', \`desc\` text NULL, \`opened_by\` varchar(30) NOT NULL DEFAULT '', \`opened_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`assigned_to\` varchar(30) NOT NULL DEFAULT '', \`assigned_at\` datetime NULL, \`est_started\` date NULL, \`real_started\` datetime NULL, \`finished_by\` varchar(30) NOT NULL DEFAULT '', \`finished_at\` datetime NULL, \`canceled_by\` varchar(30) NOT NULL DEFAULT '', \`canceled_at\` datetime NULL, \`closed_by\` varchar(30) NOT NULL DEFAULT '', \`closed_at\` datetime NULL, \`closed_reason\` varchar(30) NOT NULL DEFAULT '', \`activated_date\` datetime NULL, \`sort_no\` int NOT NULL DEFAULT '0', \`created_by\` bigint NOT NULL DEFAULT '0', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_task_assigned\` (\`assigned_to\`), INDEX \`idx_zt_task_parent\` (\`parent_id\`), INDEX \`idx_zt_task_story\` (\`story_id\`), INDEX \`idx_zt_task_execution\` (\`execution_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`idx_zt_task_execution\` ON \`zt_task\``,
    );
    await queryRunner.query(`DROP INDEX \`idx_zt_task_story\` ON \`zt_task\``);
    await queryRunner.query(`DROP INDEX \`idx_zt_task_parent\` ON \`zt_task\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_task_assigned\` ON \`zt_task\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_task\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_effort_object\` ON \`zt_effort\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_zt_effort_user_date\` ON \`zt_effort\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_effort\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_case_product\` ON \`zt_case\``,
    );
    await queryRunner.query(`DROP INDEX \`idx_zt_case_story\` ON \`zt_case\``);
    await queryRunner.query(`DROP TABLE \`zt_case\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_case_spec_unique\` ON \`zt_case_spec\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_case_spec\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_case_step_unique\` ON \`zt_case_step\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_case_step\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_test_task_product\` ON \`zt_test_task\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_zt_test_task_build\` ON \`zt_test_task\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_test_task\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_test_run_unique\` ON \`zt_test_run\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_test_run\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_test_result_run\` ON \`zt_test_result\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_test_result\``);
    await queryRunner.query(`DROP INDEX \`idx_zt_bug_product\` ON \`zt_bug\``);
    await queryRunner.query(`DROP INDEX \`idx_zt_bug_story\` ON \`zt_bug\``);
    await queryRunner.query(`DROP INDEX \`idx_zt_bug_status\` ON \`zt_bug\``);
    await queryRunner.query(`DROP TABLE \`zt_bug\``);
  }
}
