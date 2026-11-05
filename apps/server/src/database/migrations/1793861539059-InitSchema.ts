import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1793861539059 implements MigrationInterface {
  name = 'InitSchema1793861539059';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`sys_dept\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`parent_id\` bigint NOT NULL DEFAULT '0', \`path_str\` varchar(255) NOT NULL DEFAULT '', \`grade\` tinyint NOT NULL DEFAULT '1', \`name\` varchar(60) NOT NULL, \`manager\` varchar(30) NOT NULL DEFAULT '', \`sort_no\` int NOT NULL DEFAULT '0', \`created_by\` bigint NOT NULL DEFAULT '0', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`sys_permission\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`module\` varchar(30) NOT NULL, \`action\` varchar(30) NOT NULL, \`name\` varchar(60) NOT NULL DEFAULT '', \`path\` varchar(160) NOT NULL DEFAULT '', \`http_method\` varchar(10) NOT NULL DEFAULT '', \`sort_no\` int NOT NULL DEFAULT '0', \`status\` varchar(10) NOT NULL DEFAULT 'active', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE INDEX \`idx_sys_permission_unique\` (\`module\`, \`action\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`sys_acl\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`user_id\` bigint NOT NULL, \`object_type\` varchar(30) NOT NULL, \`object_id\` bigint NOT NULL, \`source\` varchar(30) NOT NULL DEFAULT '', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX \`idx_sys_acl_user\` (\`user_id\`), INDEX \`idx_sys_acl_object\` (\`object_type\`, \`object_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`sys_role_permission\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`role_id\` bigint NOT NULL, \`permission_id\` bigint NOT NULL, UNIQUE INDEX \`idx_sys_role_permission_unique\` (\`role_id\`, \`permission_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`sys_role\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` varchar(30) NOT NULL, \`code\` varchar(30) NOT NULL, \`is_super\` tinyint NOT NULL DEFAULT '0', \`remark\` varchar(255) NOT NULL DEFAULT '', \`created_by\` bigint NOT NULL DEFAULT '0', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', UNIQUE INDEX \`idx_sys_role_code\` (\`code\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`sys_user\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`account\` varchar(64) NOT NULL, \`password\` varchar(100) NOT NULL, \`realname\` varchar(100) NOT NULL DEFAULT '', \`nickname\` varchar(60) NOT NULL DEFAULT '', \`role\` varchar(30) NOT NULL DEFAULT '', \`dept_id\` bigint NOT NULL DEFAULT '0', \`gender\` char(1) NOT NULL DEFAULT 'f', \`email\` varchar(90) NOT NULL DEFAULT '', \`mobile\` varchar(20) NOT NULL DEFAULT '', \`avatar\` varchar(255) NOT NULL DEFAULT '', \`join_date\` date NULL, \`visits\` int NOT NULL DEFAULT '0', \`last_login_at\` datetime NULL, \`fails\` smallint NOT NULL DEFAULT '0', \`locked_until\` datetime NULL, \`client_lang\` varchar(10) NOT NULL DEFAULT 'zh-cn', \`created_by\` bigint NOT NULL DEFAULT '0', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`deleted\` tinyint NOT NULL DEFAULT '0', UNIQUE INDEX \`idx_sys_user_account\` (\`account\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`sys_user_role\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`user_id\` bigint NOT NULL, \`role_id\` bigint NOT NULL, \`project_id\` bigint NOT NULL DEFAULT '0', UNIQUE INDEX \`idx_sys_user_role_unique\` (\`user_id\`, \`role_id\`, \`project_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`idx_sys_user_role_unique\` ON \`sys_user_role\``,
    );
    await queryRunner.query(`DROP TABLE \`sys_user_role\``);
    await queryRunner.query(
      `DROP INDEX \`idx_sys_user_account\` ON \`sys_user\``,
    );
    await queryRunner.query(`DROP TABLE \`sys_user\``);
    await queryRunner.query(`DROP INDEX \`idx_sys_role_code\` ON \`sys_role\``);
    await queryRunner.query(`DROP TABLE \`sys_role\``);
    await queryRunner.query(
      `DROP INDEX \`idx_sys_role_permission_unique\` ON \`sys_role_permission\``,
    );
    await queryRunner.query(`DROP TABLE \`sys_role_permission\``);
    await queryRunner.query(`DROP INDEX \`idx_sys_acl_object\` ON \`sys_acl\``);
    await queryRunner.query(`DROP INDEX \`idx_sys_acl_user\` ON \`sys_acl\``);
    await queryRunner.query(`DROP TABLE \`sys_acl\``);
    await queryRunner.query(
      `DROP INDEX \`idx_sys_permission_unique\` ON \`sys_permission\``,
    );
    await queryRunner.query(`DROP TABLE \`sys_permission\``);
    await queryRunner.query(`DROP TABLE \`sys_dept\``);
  }
}
