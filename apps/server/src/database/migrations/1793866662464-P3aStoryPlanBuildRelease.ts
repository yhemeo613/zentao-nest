import { MigrationInterface, QueryRunner } from 'typeorm';

export class P3aStoryPlanBuildRelease1793866662464 implements MigrationInterface {
  name = 'P3aStoryPlanBuildRelease1793866662464';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`zt_build_bug\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`build_id\` bigint NOT NULL, \`bug_id\` bigint NOT NULL, \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE INDEX \`idx_zt_build_bug_unique\` (\`build_id\`, \`bug_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_build_story\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`build_id\` bigint NOT NULL, \`story_id\` bigint NOT NULL, \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE INDEX \`idx_zt_build_story_unique\` (\`build_id\`, \`story_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_build\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`project_id\` bigint NOT NULL DEFAULT '0', \`product_id\` bigint NOT NULL, \`branch\` varchar(255) NOT NULL DEFAULT '0', \`execution_id\` bigint NOT NULL DEFAULT '0', \`name\` varchar(150) NOT NULL, \`scm_path\` varchar(255) NOT NULL DEFAULT '', \`file_path\` varchar(255) NOT NULL DEFAULT '', \`date\` date NULL, \`builder\` varchar(30) NOT NULL DEFAULT '', \`desc\` text NULL, \`stories\` varchar(255) NOT NULL DEFAULT '', \`bugs\` varchar(255) NOT NULL DEFAULT '', \`created_by\` varchar(30) NOT NULL DEFAULT '', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_build_product\` (\`product_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_plan\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`product_id\` bigint NOT NULL, \`branch\` varchar(255) NOT NULL DEFAULT '0', \`parent_id\` bigint NOT NULL DEFAULT '0', \`title\` varchar(90) NOT NULL, \`status\` varchar(10) NOT NULL DEFAULT 'wait', \`desc\` text NULL, \`begin\` date NULL, \`end\` date NULL, \`is_future\` tinyint NOT NULL DEFAULT '0', \`finished_date\` datetime NULL, \`closed_date\` datetime NULL, \`closed_reason\` varchar(20) NOT NULL DEFAULT '', \`sort_no\` int NOT NULL DEFAULT '0', \`created_by\` varchar(30) NOT NULL DEFAULT '', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_plan_product\` (\`product_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_plan_story\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`plan_id\` bigint NOT NULL, \`story_id\` bigint NOT NULL, \`sort_no\` int NOT NULL DEFAULT '0', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE INDEX \`idx_zt_plan_story_unique\` (\`plan_id\`, \`story_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_release_related\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`release_id\` bigint NOT NULL, \`object_type\` varchar(30) NOT NULL, \`object_id\` bigint NOT NULL, \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX \`idx_zt_release_related\` (\`release_id\`, \`object_type\`, \`object_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_release\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`project_ids\` varchar(255) NOT NULL DEFAULT '0', \`product_id\` bigint NOT NULL, \`branch\` varchar(255) NOT NULL DEFAULT '0', \`build_ids\` varchar(255) NOT NULL DEFAULT '', \`name\` varchar(255) NOT NULL, \`marker\` tinyint NOT NULL DEFAULT '0', \`date\` date NULL, \`released_date\` datetime NULL, \`stories\` text NULL, \`bugs\` text NULL, \`left_bugs\` text NULL, \`desc\` text NULL, \`status\` varchar(20) NOT NULL DEFAULT 'wait', \`created_by\` varchar(30) NOT NULL DEFAULT '', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_release_product\` (\`product_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_story_review\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`story_id\` bigint NOT NULL, \`version\` smallint NOT NULL DEFAULT '1', \`reviewer_id\` varchar(30) NOT NULL, \`result\` varchar(30) NOT NULL DEFAULT '', \`reviewed_at\` datetime NULL, UNIQUE INDEX \`idx_zt_story_review_unique\` (\`story_id\`, \`version\`, \`reviewer_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_story_spec\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`story_id\` bigint NOT NULL, \`version\` smallint NOT NULL DEFAULT '1', \`title\` varchar(255) NOT NULL DEFAULT '', \`spec\` text NULL, \`verify\` text NULL, UNIQUE INDEX \`idx_zt_story_spec_unique\` (\`story_id\`, \`version\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_story_stage\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`story_id\` bigint NOT NULL, \`branch_id\` int NOT NULL DEFAULT '0', \`stage\` varchar(50) NOT NULL DEFAULT 'wait', \`staged_by\` varchar(30) NOT NULL DEFAULT '', UNIQUE INDEX \`idx_zt_story_stage_unique\` (\`story_id\`, \`branch_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_story\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`parent_id\` bigint NOT NULL DEFAULT '0', \`is_parent\` tinyint NOT NULL DEFAULT '0', \`root_id\` bigint NOT NULL DEFAULT '0', \`path_str\` text NULL, \`grade\` tinyint NOT NULL DEFAULT '0', \`product_id\` bigint NOT NULL, \`branch_id\` int NOT NULL DEFAULT '0', \`module_id\` bigint NOT NULL DEFAULT '0', \`plan\` varchar(255) NOT NULL DEFAULT '', \`source\` varchar(20) NOT NULL DEFAULT '', \`source_note\` varchar(255) NOT NULL DEFAULT '', \`from_bug_id\` bigint NOT NULL DEFAULT '0', \`title\` varchar(255) NOT NULL, \`keywords\` varchar(255) NOT NULL DEFAULT '', \`type\` varchar(20) NOT NULL DEFAULT 'story', \`category\` varchar(30) NOT NULL DEFAULT 'feature', \`pri\` tinyint NOT NULL DEFAULT '3', \`estimate\` decimal(10,2) NOT NULL DEFAULT '0.00', \`status\` varchar(10) NOT NULL DEFAULT 'draft', \`stage\` varchar(10) NOT NULL DEFAULT 'wait', \`staged_by\` varchar(30) NOT NULL DEFAULT '', \`mailto\` varchar(255) NOT NULL DEFAULT '', \`version\` smallint NOT NULL DEFAULT '1', \`color\` char(7) NOT NULL DEFAULT '', \`opened_by\` varchar(30) NOT NULL DEFAULT '', \`opened_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`assigned_to\` varchar(30) NOT NULL DEFAULT '', \`assigned_at\` datetime NULL, \`changed_by\` varchar(30) NOT NULL DEFAULT '', \`changed_at\` datetime NULL, \`reviewed_by\` varchar(255) NOT NULL DEFAULT '', \`reviewed_at\` datetime NULL, \`released_date\` date NULL, \`closed_by\` varchar(30) NOT NULL DEFAULT '', \`closed_at\` datetime NULL, \`closed_reason\` varchar(20) NOT NULL DEFAULT '', \`activated_date\` datetime NULL, \`to_bug_id\` bigint NOT NULL DEFAULT '0', \`link_stories\` varchar(255) NOT NULL DEFAULT '', \`duplicate_story_id\` bigint NOT NULL DEFAULT '0', \`final_result\` varchar(30) NOT NULL DEFAULT '', \`created_by\` bigint NOT NULL DEFAULT '0', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_story_status\` (\`status\`), INDEX \`idx_zt_story_parent\` (\`parent_id\`), INDEX \`idx_zt_story_product\` (\`product_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`idx_zt_story_product\` ON \`zt_story\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_zt_story_parent\` ON \`zt_story\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_zt_story_status\` ON \`zt_story\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_story\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_story_stage_unique\` ON \`zt_story_stage\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_story_stage\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_story_spec_unique\` ON \`zt_story_spec\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_story_spec\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_story_review_unique\` ON \`zt_story_review\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_story_review\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_release_product\` ON \`zt_release\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_release\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_release_related\` ON \`zt_release_related\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_release_related\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_plan_story_unique\` ON \`zt_plan_story\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_plan_story\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_plan_product\` ON \`zt_plan\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_plan\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_build_product\` ON \`zt_build\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_build\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_build_story_unique\` ON \`zt_build_story\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_build_story\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_build_bug_unique\` ON \`zt_build_bug\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_build_bug\``);
  }
}
