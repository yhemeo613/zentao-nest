/**
 * @zentao/shared —— 双端同源契约包（零运行时依赖，仅常量与类型）
 *
 * 规格来源与映射表：docs/03-接口与契约.md §12（packages/shared 契约同源包）
 * 规则：改本包任何文件 → 同步回填 docs/03 §12，且 pnpm build 双端通过。
 */

export * from './error-codes.js';
export * from './dto/http.js';
export * from './permissions.js';

export const SHARED_VERSION = '0.1.0';
