import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

function snakeCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * camelCase 属性 → snake_case 列/表名（docs/04 §1 全局约定）
 * 注：TypeORM 1.x 已移除内置 SnakeNamingStrategy，此处自实现等价行为。
 */
export class ZentaoSnakeNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  tableName(className: string, customName?: string): string {
    return customName ?? snakeCase(className);
  }

  columnName(
    propertyName: string,
    customName?: string,
    embeddedPrefixes: string[] = [],
  ): string {
    const prefix = embeddedPrefixes.map(snakeCase).join('_');
    const col = customName ?? snakeCase(propertyName);
    return prefix ? `${prefix}_${col}` : col;
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return `${snakeCase(relationName)}_${referencedColumnName === 'id' ? 'id' : snakeCase(referencedColumnName)}`;
  }

  joinTableColumnName(
    tableName: string,
    propertyName: string,
    columnName?: string,
  ): string {
    return `${snakeCase(tableName)}_${columnName ?? snakeCase(propertyName)}`;
  }
}
