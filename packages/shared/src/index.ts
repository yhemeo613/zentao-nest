/**
 * @zentao/shared —— 双端同源契约包（零运行时依赖，仅常量与类型）
 *
 * 规格来源：docs/03-接口与契约.md §12（packages/shared 契约同源包）
 *
 * 规划文件（随 P0-P3 逐步落地，每落地一个须先回填 docs/03 §12 映射表）：
 * - enums/          全实体状态/类型枚举 + 中文 label 映射（docs/02 各枚举表）
 * - permissions.ts  权限点常量 PERMS（docs/03 §3/§4）
 * - socket-contract.ts  Socket.IO 事件与 payload/ack 类型（docs/03 §6）
 * - kanban-map.ts   任务状态↔看板列映射（docs/02 §8.1）
 * - error-codes.ts  错误码枚举 + 默认中文文案（docs/03 §2）
 * - dto/            API 入参出参类型（docs/03 §5 + docs/04 字段级规格）
 * - filters.ts      filter DSL 字段白名单注册表（docs/03 §7）
 */

export const SHARED_VERSION = '0.1.0';
