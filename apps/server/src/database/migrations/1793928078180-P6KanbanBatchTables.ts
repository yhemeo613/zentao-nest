import { MigrationInterface, QueryRunner } from 'typeorm';

export class P6KanbanBatchTables1793928078180 implements MigrationInterface {
  name = 'P6KanbanBatchTables1793928078180';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`zt_kanban_cell\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`execution_id\` bigint NOT NULL, \`lane_id\` bigint NOT NULL, \`column_id\` bigint NOT NULL, \`type\` varchar(30) NOT NULL DEFAULT 'task', \`cards\` text NULL, \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE INDEX \`idx_zt_cell_unique\` (\`execution_id\`, \`lane_id\`, \`column_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_kanban_column\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`execution_id\` bigint NOT NULL, \`type\` varchar(30) NOT NULL, \`parent_id\` bigint NOT NULL DEFAULT '0', \`name\` varchar(255) NOT NULL DEFAULT '', \`color\` char(7) NOT NULL DEFAULT '', \`wip_limit\` int NOT NULL DEFAULT '-1', \`sort_no\` int NOT NULL DEFAULT '0', \`archived\` tinyint NOT NULL DEFAULT '0', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_column_exec\` (\`execution_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_kanban_lane\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`execution_id\` bigint NOT NULL, \`type\` varchar(30) NOT NULL, \`name\` varchar(255) NOT NULL DEFAULT '', \`color\` char(7) NOT NULL DEFAULT '', \`sort_no\` int NOT NULL DEFAULT '0', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_lane_exec\` (\`execution_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`sys_config\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`scope\` varchar(30) NOT NULL DEFAULT 'system', \`owner\` varchar(64) NOT NULL DEFAULT 'system', \`module\` varchar(30) NOT NULL, \`section\` varchar(30) NOT NULL DEFAULT 'common', \`key_name\` varchar(60) NOT NULL, \`value\` text NULL, \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE INDEX \`idx_sys_config_unique\` (\`scope\`, \`owner\`, \`module\`, \`section\`, \`key_name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_file\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`storage_key\` varchar(255) NOT NULL, \`title\` varchar(255) NOT NULL DEFAULT '', \`extension\` varchar(30) NOT NULL DEFAULT '', \`size\` bigint NOT NULL DEFAULT '0', \`object_type\` varchar(30) NOT NULL DEFAULT '', \`object_id\` bigint NOT NULL DEFAULT '0', \`created_by\` varchar(30) NOT NULL DEFAULT '', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_file_object\` (\`object_type\`, \`object_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_branch\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`product_id\` bigint NOT NULL, \`name\` varchar(45) NOT NULL, \`sort_no\` int NOT NULL DEFAULT '0', \`created_by\` varchar(30) NOT NULL DEFAULT '', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_branch_product\` (\`product_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_product_line\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` varchar(60) NOT NULL, \`sort_no\` int NOT NULL DEFAULT '0', \`created_by\` varchar(30) NOT NULL DEFAULT '', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`zt_product_line\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_branch_product\` ON \`zt_branch\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_branch\``);
    await queryRunner.query(`DROP INDEX \`idx_zt_file_object\` ON \`zt_file\``);
    await queryRunner.query(`DROP TABLE \`zt_file\``);
    await queryRunner.query(
      `DROP INDEX \`idx_sys_config_unique\` ON \`sys_config\``,
    );
    await queryRunner.query(`DROP TABLE \`sys_config\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_lane_exec\` ON \`zt_kanban_lane\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_kanban_lane\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_column_exec\` ON \`zt_kanban_column\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_kanban_column\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_cell_unique\` ON \`zt_kanban_cell\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_kanban_cell\``);
  }
}
