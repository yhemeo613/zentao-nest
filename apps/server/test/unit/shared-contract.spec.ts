import { describe, it, expect } from 'vitest';
import { allPermKeys, splitPermKey, PERMS } from '@zentao/shared';
import {
  DefaultErrorMessages,
  ErrorCodes,
  httpStatusFor,
} from '@zentao/shared';

/** 权限点与错误码契约测试（docs/03 §2/§3；shared 单源完整性守卫） */

describe('权限点常量（PERMS）', () => {
  it('覆盖 P1-P6 全部域分组', () => {
    const groups = Object.keys(PERMS);
    for (const g of [
      'user',
      'dept',
      'group',
      'acl',
      'program',
      'product',
      'project',
      'execution',
      'story',
      'plan',
      'build',
      'release',
      'task',
      'bug',
      'case',
      'testtask',
      'effort',
      'doc',
      'todo',
      'config',
      'board',
      'file',
      'caselib',
      'testsuite',
      'testreport',
      'report',
      'search',
      'webhook',
      'productline',
      'branch',
    ]) {
      expect(groups).toContain(g);
    }
  });

  it('allPermKeys 展平无重复', () => {
    const keys = allPermKeys();
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBeGreaterThan(100);
  });

  it('全部权限点符合 module.action 格式', () => {
    for (const key of allPermKeys()) {
      expect(key).toMatch(/^[a-z]+\.[a-zA-Z.]+$/);
      expect(() => splitPermKey(key)).not.toThrow();
    }
  });

  it('splitPermKey 拆分正确且拒绝非法格式', () => {
    expect(splitPermKey('story.create')).toEqual(['story', 'create']);
    expect(splitPermKey('project.team.browse')).toEqual([
      'project',
      'team.browse',
    ]);
    expect(() => splitPermKey('nodot')).toThrow();
  });
});

describe('错误码注册表（docs/03 §2）', () => {
  it('关键错误码存在且默认文案为中文', () => {
    const samples: Array<[number, string]> = [
      [ErrorCodes.OK, 'ok'],
      [ErrorCodes.AUTH.UNAUTHENTICATED, '未登录'],
      [ErrorCodes.AUTH.FORBIDDEN, '无功能权限'],
      [ErrorCodes.AUTH.DATA_FORBIDDEN, '无数据权限'],
      [ErrorCodes.VALIDATION.INVALID_TRANSITION, '状态'],
      [ErrorCodes.AUTH.REFRESH_TOKEN_INVALID, '重新登录'],
      [ErrorCodes.AUTH.LOGIN_LOCKED, '锁定'],
    ];
    for (const [code, keyword] of samples) {
      expect(DefaultErrorMessages[code]).toContain(keyword);
    }
  });

  it('httpStatusFor 段位推导正确', () => {
    expect(httpStatusFor(0)).toBe(200);
    expect(httpStatusFor(2001)).toBe(401);
    expect(httpStatusFor(2002)).toBe(401);
    expect(httpStatusFor(2007)).toBe(401);
    expect(httpStatusFor(2003)).toBe(403);
    expect(httpStatusFor(2004)).toBe(403);
    expect(httpStatusFor(3005)).toBe(404);
    expect(httpStatusFor(3001)).toBe(400);
    expect(httpStatusFor(4701)).toBe(400);
    expect(httpStatusFor(1010)).toBe(429);
    expect(httpStatusFor(1001)).toBe(500);
  });
});
