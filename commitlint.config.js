/**
 * 提交信息规范（docs/06-代码规范 §2.2）
 * 格式：type: 中文描述 —— type 英文枚举，描述中文
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    // 描述使用中文，不做英文大小写约束
    'subject-case': [0],
    'header-max-length': [2, 'always', 100],
  },
};
