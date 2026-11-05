// codemod：seed 脚本给 qa 角色追加 todo 域全量权限（docs/04 §9.2 矩阵随模块演进刷新）
const fs = require('fs');
const p = 'apps/server/src/modules/system/permission-seed.service.ts';
let s = fs.readFileSync(p, 'utf8');

const anchor = '    }\n  }\n\n  private async seedAdmin()';
const addition = `    }
    // qa 角色：追加 todo 域全量动作（测试人员日常待办，docs/04 §9.2 矩阵注：随模块演进刷新）
    const qaRole = codeToRole.get('qa');
    if (qaRole) {
      const todoPerms = allPerms.filter((perm) => perm.module === 'todo');
      const qaExisting = await this.rolePermRepo.find({ where: { roleId: qaRole.id } });
      const qaIds = new Set(qaExisting.map((e) => e.permissionId));
      const qaAdd = todoPerms.filter((perm) => !qaIds.has(perm.id));
      if (qaAdd.length > 0) {
        await this.rolePermRepo.save(
          qaAdd.map((perm) => this.rolePermRepo.create({ roleId: qaRole.id, permissionId: perm.id })),
        );
        this.logger.log(\`[seed] qa 角色追加 \${qaAdd.length} 个 todo 权限点\`);
      }
    }
  }

  private async seedAdmin()`;

if (s.includes(anchor)) {
  s = s.replace(anchor, addition);
  fs.writeFileSync(p, s);
  console.log('qa todo grant added');
} else {
  console.log('anchor MISS — show tail:');
  console.log(s.slice(-800));
  process.exit(1);
}
