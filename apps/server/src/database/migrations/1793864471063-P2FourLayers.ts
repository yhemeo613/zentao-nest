import { MigrationInterface, QueryRunner } from 'typeorm';

export class P2FourLayers1793864471063 implements MigrationInterface {
  name = 'P2FourLayers1793864471063';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`zt_execution\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`project_id\` bigint NOT NULL, \`type\` varchar(30) NOT NULL DEFAULT 'sprint', \`grade\` tinyint NOT NULL DEFAULT '1', \`parent_id\` bigint NOT NULL DEFAULT '0', \`path_str\` varchar(255) NOT NULL DEFAULT '', \`name\` varchar(90) NOT NULL, \`attribute\` varchar(30) NOT NULL DEFAULT '', \`begin\` date NULL, \`end\` date NULL, \`real_began\` date NULL, \`real_end\` date NULL, \`days\` smallint NOT NULL DEFAULT '0', \`status\` varchar(10) NOT NULL DEFAULT 'wait', \`sprint_goal\` varchar(255) NOT NULL DEFAULT '', \`milestone\` tinyint NOT NULL DEFAULT '0', \`percent\` decimal(5,2) NOT NULL DEFAULT '0.00', \`progress\` decimal(5,2) NOT NULL DEFAULT '0.00', \`estimate\` decimal(12,2) NOT NULL DEFAULT '0.00', \`consumed\` decimal(12,2) NOT NULL DEFAULT '0.00', \`left\` decimal(12,2) NOT NULL DEFAULT '0.00', \`sort_no\` int NOT NULL DEFAULT '0', \`created_by\` bigint NOT NULL DEFAULT '0', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_execution_project\` (\`project_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_module\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`root_type\` varchar(10) NOT NULL DEFAULT 'product', \`root_id\` varchar(30) NOT NULL, \`branch_id\` bigint NOT NULL DEFAULT '0', \`parent_id\` bigint NOT NULL DEFAULT '0', \`path_str\` text NULL, \`grade\` tinyint NOT NULL DEFAULT '1', \`name\` varchar(60) NOT NULL, \`owner_id\` varchar(30) NOT NULL DEFAULT '', \`sort_no\` int NOT NULL DEFAULT '0', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_module_root\` (\`root_type\`, \`root_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_project_product\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`project_id\` bigint NOT NULL, \`product_id\` bigint NOT NULL, \`branch_id\` bigint NOT NULL DEFAULT '0', \`plan\` varchar(255) NOT NULL DEFAULT '', \`roadmap\` varchar(255) NOT NULL DEFAULT '', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE INDEX \`idx_zt_pp_unique\` (\`project_id\`, \`product_id\`, \`branch_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_product\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`program_id\` bigint NOT NULL DEFAULT '0', \`shadow\` tinyint NOT NULL DEFAULT '0', \`name\` varchar(110) NOT NULL, \`code\` varchar(45) NOT NULL DEFAULT '', \`type\` varchar(30) NOT NULL DEFAULT 'normal', \`status\` varchar(30) NOT NULL DEFAULT 'active', \`po_id\` varchar(30) NOT NULL DEFAULT '', \`qd_id\` varchar(30) NOT NULL DEFAULT '', \`rd_id\` varchar(30) NOT NULL DEFAULT '', \`acl\` varchar(10) NOT NULL DEFAULT 'open', \`whitelist\` text NULL, \`desc\` text NULL, \`closed_date\` datetime NULL, \`sort_no\` int NOT NULL DEFAULT '0', \`created_by\` bigint NOT NULL DEFAULT '0', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_product_program\` (\`program_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_program\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`parent_id\` bigint NOT NULL DEFAULT '0', \`grade\` tinyint NOT NULL DEFAULT '1', \`path_str\` varchar(255) NOT NULL DEFAULT '', \`sort_no\` int NOT NULL DEFAULT '0', \`name\` varchar(90) NOT NULL, \`code\` varchar(45) NOT NULL DEFAULT '', \`pm_id\` varchar(30) NOT NULL DEFAULT '', \`budget\` decimal(14,2) NOT NULL DEFAULT '0.00', \`budget_unit\` varchar(30) NOT NULL DEFAULT 'CNY', \`begin\` date NULL, \`end\` date NULL, \`real_began\` date NULL, \`real_end\` date NULL, \`days\` smallint NOT NULL DEFAULT '0', \`status\` varchar(10) NOT NULL DEFAULT 'wait', \`closed_reason\` varchar(20) NOT NULL DEFAULT '', \`canceled_by_id\` varchar(30) NOT NULL DEFAULT '', \`suspended_date\` datetime NULL, \`acl\` varchar(10) NOT NULL DEFAULT 'open', \`whitelist\` text NULL, \`desc\` text NULL, \`created_by\` bigint NOT NULL DEFAULT '0', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_program_parent\` (\`parent_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_project\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`program_id\` bigint NOT NULL DEFAULT '0', \`name\` varchar(90) NOT NULL, \`code\` varchar(45) NOT NULL DEFAULT '', \`model\` varchar(30) NOT NULL DEFAULT 'scrum', \`model_config\` text NULL, \`lifetime\` varchar(30) NOT NULL DEFAULT '', \`budget\` decimal(14,2) NOT NULL DEFAULT '0.00', \`budget_unit\` varchar(30) NOT NULL DEFAULT 'CNY', \`begin\` date NULL, \`end\` date NULL, \`real_began\` date NULL, \`real_end\` date NULL, \`days\` smallint NOT NULL DEFAULT '0', \`status\` varchar(10) NOT NULL DEFAULT 'wait', \`progress\` decimal(5,2) NOT NULL DEFAULT '0.00', \`estimate\` decimal(12,2) NOT NULL DEFAULT '0.00', \`consumed\` decimal(12,2) NOT NULL DEFAULT '0.00', \`left\` decimal(12,2) NOT NULL DEFAULT '0.00', \`pm_id\` varchar(30) NOT NULL DEFAULT '', \`story_type\` varchar(30) NOT NULL DEFAULT 'story', \`multiple\` tinyint NOT NULL DEFAULT '1', \`acl\` varchar(10) NOT NULL DEFAULT 'open', \`whitelist\` text NULL, \`closed_reason\` varchar(20) NOT NULL DEFAULT '', \`canceled_by_id\` varchar(30) NOT NULL DEFAULT '', \`suspended_date\` datetime NULL, \`desc\` text NULL, \`sort_no\` int NOT NULL DEFAULT '0', \`created_by\` bigint NOT NULL DEFAULT '0', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', UNIQUE INDEX \`idx_zt_project_code\` (\`code\`), INDEX \`idx_zt_project_program\` (\`program_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_project_story\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`scope_type\` varchar(10) NOT NULL, \`scope_id\` bigint NOT NULL, \`product_id\` bigint NOT NULL, \`branch_id\` bigint NOT NULL DEFAULT '0', \`story_id\` bigint NOT NULL, \`story_version\` smallint NOT NULL DEFAULT '1', \`sort_no\` int NOT NULL DEFAULT '0', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE INDEX \`idx_zt_ps_unique\` (\`scope_type\`, \`scope_id\`, \`story_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_team\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`root_type\` varchar(10) NOT NULL, \`root_id\` varchar(30) NOT NULL, \`user_id\` varchar(30) NOT NULL, \`role\` varchar(30) NOT NULL DEFAULT '', \`position\` varchar(30) NOT NULL DEFAULT '', \`limited\` tinyint NOT NULL DEFAULT '0', \`join_date\` date NULL, \`days\` smallint NOT NULL DEFAULT '0', \`hours\` decimal(3,1) NOT NULL DEFAULT '0.0', \`estimate\` decimal(10,2) NOT NULL DEFAULT '0.00', \`consumed\` decimal(10,2) NOT NULL DEFAULT '0.00', \`left\` decimal(10,2) NOT NULL DEFAULT '0.00', \`sort_no\` int NOT NULL DEFAULT '0', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE INDEX \`idx_zt_team_unique\` (\`root_type\`, \`root_id\`, \`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`idx_zt_team_unique\` ON \`zt_team\``);
    await queryRunner.query(`DROP TABLE \`zt_team\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_ps_unique\` ON \`zt_project_story\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_project_story\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_project_program\` ON \`zt_project\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_zt_project_code\` ON \`zt_project\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_project\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_program_parent\` ON \`zt_program\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_program\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_product_program\` ON \`zt_product\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_product\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_pp_unique\` ON \`zt_project_product\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_project_product\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_module_root\` ON \`zt_module\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_module\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_execution_project\` ON \`zt_execution\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_execution\``);
  }
}
