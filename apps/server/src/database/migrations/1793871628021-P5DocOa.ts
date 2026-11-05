import { MigrationInterface, QueryRunner } from 'typeorm';

export class P5DocOa1793871628021 implements MigrationInterface {
  name = 'P5DocOa1793871628021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`zt_doc_content\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`doc_id\` bigint NOT NULL, \`version\` smallint NOT NULL DEFAULT '1', \`content\` longtext NULL, \`edited_by\` varchar(30) NOT NULL DEFAULT '', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE INDEX \`idx_zt_doc_content_unique\` (\`doc_id\`, \`version\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_doc_space\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`object_type\` varchar(20) NOT NULL, \`object_id\` bigint NOT NULL DEFAULT '0', \`name\` varchar(90) NOT NULL, \`acl\` varchar(10) NOT NULL DEFAULT 'open', \`whitelist\` text NULL, \`created_by\` varchar(30) NOT NULL DEFAULT '', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_doc_space_object\` (\`object_type\`, \`object_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_doc_lib\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`space_id\` bigint NOT NULL, \`name\` varchar(60) NOT NULL, \`main\` tinyint NOT NULL DEFAULT '0', \`sort_no\` int NOT NULL DEFAULT '0', \`created_by\` varchar(30) NOT NULL DEFAULT '', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_doc_lib_space\` (\`space_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_doc\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`lib_id\` bigint NOT NULL, \`module_id\` bigint NOT NULL DEFAULT '0', \`title\` varchar(90) NOT NULL, \`keywords\` varchar(255) NOT NULL DEFAULT '', \`type\` varchar(20) NOT NULL DEFAULT 'markdown', \`url\` varchar(500) NOT NULL DEFAULT '', \`version\` smallint NOT NULL DEFAULT '1', \`views\` int NOT NULL DEFAULT '0', \`object_type\` varchar(30) NOT NULL DEFAULT '', \`object_id\` bigint NOT NULL DEFAULT '0', \`sort_no\` int NOT NULL DEFAULT '0', \`opened_by\` varchar(30) NOT NULL DEFAULT '', \`opened_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`created_by\` varchar(30) NOT NULL DEFAULT '', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_doc_lib\` (\`lib_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_action_history\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`action_id\` bigint NOT NULL, \`field\` varchar(50) NOT NULL, \`old_value\` text NULL, \`new_value\` text NULL, INDEX \`idx_zt_action_history\` (\`action_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_action_log\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`object_type\` varchar(30) NOT NULL, \`object_id\` bigint NOT NULL, \`project_id\` bigint NOT NULL DEFAULT '0', \`execution_id\` bigint NOT NULL DEFAULT '0', \`actor\` varchar(30) NOT NULL, \`action\` varchar(50) NOT NULL, \`action_date\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`comment\` text NULL, \`extra\` varchar(255) NOT NULL DEFAULT '', \`is_read\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_action_date\` (\`action_date\`), INDEX \`idx_zt_action_actor\` (\`actor\`), INDEX \`idx_zt_action_object\` (\`object_type\`, \`object_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_todo\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`user_id\` varchar(30) NOT NULL, \`date\` date NULL, \`type\` varchar(15) NOT NULL DEFAULT 'custom', \`object_id\` bigint NOT NULL DEFAULT '0', \`pri\` tinyint NOT NULL DEFAULT '3', \`name\` varchar(150) NOT NULL DEFAULT '', \`desc\` text NULL, \`status\` varchar(10) NOT NULL DEFAULT 'wait', \`private_flag\` tinyint NOT NULL DEFAULT '0', \`assigned_to\` varchar(30) NOT NULL DEFAULT '', \`finished_by\` varchar(30) NOT NULL DEFAULT '', \`finished_at\` datetime NULL, \`closed_by\` varchar(30) NOT NULL DEFAULT '', \`closed_at\` datetime NULL, \`created_by\` varchar(30) NOT NULL DEFAULT '', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', INDEX \`idx_zt_todo_date\` (\`date\`), INDEX \`idx_zt_todo_user\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`zt_notify\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`object_type\` varchar(30) NOT NULL, \`object_id\` bigint NOT NULL, \`action\` varchar(50) NOT NULL, \`to_user_id\` varchar(30) NOT NULL, \`subject\` varchar(255) NOT NULL DEFAULT '', \`data\` text NULL, \`status\` varchar(10) NOT NULL DEFAULT 'wait', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`read_at\` datetime NULL, INDEX \`idx_zt_notify_to\` (\`to_user_id\`, \`status\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`idx_zt_notify_to\` ON \`zt_notify\``);
    await queryRunner.query(`DROP TABLE \`zt_notify\``);
    await queryRunner.query(`DROP INDEX \`idx_zt_todo_user\` ON \`zt_todo\``);
    await queryRunner.query(`DROP INDEX \`idx_zt_todo_date\` ON \`zt_todo\``);
    await queryRunner.query(`DROP TABLE \`zt_todo\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_action_object\` ON \`zt_action_log\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_zt_action_actor\` ON \`zt_action_log\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_zt_action_date\` ON \`zt_action_log\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_action_log\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_action_history\` ON \`zt_action_history\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_action_history\``);
    await queryRunner.query(`DROP INDEX \`idx_zt_doc_lib\` ON \`zt_doc\``);
    await queryRunner.query(`DROP TABLE \`zt_doc\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_doc_lib_space\` ON \`zt_doc_lib\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_doc_lib\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_doc_space_object\` ON \`zt_doc_space\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_doc_space\``);
    await queryRunner.query(
      `DROP INDEX \`idx_zt_doc_content_unique\` ON \`zt_doc_content\``,
    );
    await queryRunner.query(`DROP TABLE \`zt_doc_content\``);
  }
}
