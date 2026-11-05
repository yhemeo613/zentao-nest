/**
 * 错误码注册表（规格：docs/03-接口与契约.md §2）
 * 段位：0 成功 ｜ 1000 系统 ｜ 2000 认证权限 ｜ 3000 参数校验 ｜ 4000-5600 业务域
 * 规则：新增错误码必须先回填 docs/03 §2，再落此处。
 */

export const ErrorCodes = {
  OK: 0,

  /** 1000 系统 */
  SYS: {
    INTERNAL_ERROR: 1001,
    SERVICE_UNAVAILABLE: 1002,
    DEPENDENCY_UNAVAILABLE: 1003,
    DATA_ACCESS_FAILED: 1004,
    RATE_LIMITED: 1010,
  },

  /** 2000 认证与权限 */
  AUTH: {
    UNAUTHENTICATED: 2001,
    TOKEN_INVALID: 2002,
    FORBIDDEN: 2003,
    DATA_FORBIDDEN: 2004,
    BAD_CREDENTIALS: 2005,
    ACCOUNT_DISABLED: 2006,
    REFRESH_TOKEN_INVALID: 2007,
    LOGIN_LOCKED: 2008,
  },

  /** 3000 参数与校验 */
  VALIDATION: {
    VALIDATION_FAILED: 3001,
    TYPE_MISMATCH: 3002,
    MISSING_REQUIRED: 3003,
    DUPLICATED: 3004,
    NOT_FOUND: 3005,
    INVALID_TRANSITION: 3006,
    BUSINESS_RULE: 3007,
    FILE_REJECTED: 3008,
    IMPORT_DATA_INVALID: 3009,
  },

  /** 4000 项目集 */
  PROGRAM: { PARENT_INVALID: 4001, HAS_UNCLOSED_CHILDREN: 4002, BUDGET_FORMAT: 4003 },
  /** 4100 产品 */
  PRODUCT: { LINE_INVALID: 4101, MODULE_TREE_CYCLE: 4102 },
  /** 4200 需求 */
  STORY: {
    REVIEW_LIST_CONFLICT: 4201,
    REVIEW_RESULT_VERSION_CONFLICT: 4202,
    HAS_UNCLOSED_CHILDREN: 4203,
    NOT_SUBDIVIDABLE: 4204,
    AFFECTED_READONLY: 4205,
  },
  /** 4300 计划 */
  PLAN: { PARENT_DATE_CONFLICT: 4301, FUTURE_DATE_INVALID: 4302 },
  /** 4400 版本/发布 */
  BUILD_RELEASE: {
    BUILD_NAME_DUPLICATED: 4401,
    RELEASE_ACTION_INVALID: 4402,
    LEFT_BUGS_UNMARKED: 4403,
  },
  /** 4500 项目 */
  PROJECT: { MODEL_INVALID: 4501, MODEL_EXECUTION_CONFLICT: 4502, PRODUCT_NOT_LINKED: 4503 },
  /** 4600 执行 */
  EXECUTION: {
    TYPE_MODEL_MISMATCH: 4601,
    BACK_TO_WAIT_REJECTED: 4602,
    CASCADE_STATUS_UNMET: 4603,
    STAGE_PERCENT_OVERFLOW: 4604,
  },
  /** 4700 任务 */
  TASK: {
    INVALID_TRANSITION: 4701,
    CONSUMED_IMMUTABLE: 4702,
    EFFORT_DATE_FUTURE: 4703,
    TEAM_MEMBER_INVALID: 4704,
    LEFT_ESTIMATE_CONFLICT: 4705,
    LEFT_REQUIRED: 4706,
  },
  /** 4800 缺陷 */
  BUG: { RESOLUTION_FIELDS_CONFLICT: 4801, NOT_RESOLVABLE: 4802, OPENED_BUILD_REQUIRED: 4803 },
  /** 4900 用例 */
  CASE: { ALREADY_REVIEWED: 4901, STEP_GROUP_INVALID: 4902 },
  /** 4950 测试单 */
  TEST_TASK: {
    FINISH_DATE_INVALID: 4951,
    CASE_VERSION_STALE: 4952,
    STEP_RESULTS_INVALID: 4953,
  },
  /** 5000 文档 */
  DOC: { LIB_TYPE_INVALID: 5001, TEMPLATE_MISSING: 5002 },
  /** 5100 事务 */
  OA: { TODO_OBJECT_CONFLICT: 5101, EFFORT_DAILY_CONFLICT: 5102 },
  /** 5200 看板 */
  BOARD: { COLUMN_PARENT_INVALID: 5201, WIP_CONFIG_INVALID: 5202, MOVE_TARGET_INVALID: 5203 },
  /** 5300 系统（用户/角色） */
  SYSTEM: {
    ACCOUNT_EXISTS: 5301,
    ROLE_CODE_DUPLICATED: 5302,
    ROLE_HAS_USERS: 5303,
    PERMISSION_NOT_FOUND: 5304,
  },
  /** 5400 文件 */
  FILE: { EXT_NOT_ALLOWED: 5401, SIZE_EXCEEDED: 5402 },
  /** 5500 webhook/配置 */
  WEBHOOK_CONFIG: {
    URL_INVALID: 5501,
    ACTION_NOT_SUBSCRIBED: 5502,
    CONFIG_READONLY: 5503,
  },
  /** 5600 统计/用例库/套件/测试报告 */
  REPORT: {
    DIMENSION_INVALID: 5601,
    SUITE_CASE_STALE: 5602,
    REPORT_NO_SOURCE: 5603,
  },
} as const;

/** 默认中文文案（与 docs/03 §2 一致；业务侧可覆盖 message） */
export const DefaultErrorMessages: Record<number, string> = {
  [ErrorCodes.OK]: 'ok',
  [ErrorCodes.SYS.INTERNAL_ERROR]: '系统内部错误',
  [ErrorCodes.SYS.SERVICE_UNAVAILABLE]: '服务暂不可用',
  [ErrorCodes.SYS.DEPENDENCY_UNAVAILABLE]: '依赖服务（数据库/缓存）异常',
  [ErrorCodes.SYS.DATA_ACCESS_FAILED]: '数据操作失败',
  [ErrorCodes.SYS.RATE_LIMITED]: '请求过于频繁，请稍后再试',
  [ErrorCodes.AUTH.UNAUTHENTICATED]: '未登录或凭证缺失',
  [ErrorCodes.AUTH.TOKEN_INVALID]: '登录状态无效或已过期',
  [ErrorCodes.AUTH.FORBIDDEN]: '无功能权限',
  [ErrorCodes.AUTH.DATA_FORBIDDEN]: '无数据权限',
  [ErrorCodes.AUTH.BAD_CREDENTIALS]: '账号或密码错误',
  [ErrorCodes.AUTH.ACCOUNT_DISABLED]: '账号已被禁用',
  [ErrorCodes.AUTH.REFRESH_TOKEN_INVALID]: '登录已失效，请重新登录',
  [ErrorCodes.AUTH.LOGIN_LOCKED]: '登录失败次数过多，账号已临时锁定',
  [ErrorCodes.VALIDATION.VALIDATION_FAILED]: '参数校验失败',
  [ErrorCodes.VALIDATION.TYPE_MISMATCH]: '参数类型错误',
  [ErrorCodes.VALIDATION.MISSING_REQUIRED]: '缺少必填字段',
  [ErrorCodes.VALIDATION.DUPLICATED]: '数据已存在（唯一性冲突）',
  [ErrorCodes.VALIDATION.NOT_FOUND]: '资源不存在或已删除',
  [ErrorCodes.VALIDATION.INVALID_TRANSITION]: '当前状态不允许该操作',
  [ErrorCodes.VALIDATION.BUSINESS_RULE]: '业务校验失败',
  [ErrorCodes.VALIDATION.FILE_REJECTED]: '文件校验失败',
  [ErrorCodes.VALIDATION.IMPORT_DATA_INVALID]: '导入数据校验失败',
};

/** 按错误码段位推导 HTTP 状态码（docs/03 §1：HTTP 语义 + 业务 code 双层） */
export function httpStatusFor(code: number): number {
  if (code === ErrorCodes.OK) return 200;
  if (code === ErrorCodes.SYS.RATE_LIMITED) return 429;
  if (code >= 1000 && code < 2000) return 500;
  if (code === 2001 || code === 2002 || code === 2007) return 401;
  if (code === 2003 || code === 2004) return 403;
  if (code === 3005) return 404;
  if (code >= 3000 && code < 4000) return 400;
  if (code >= 4000) return 400;
  return 500;
}
