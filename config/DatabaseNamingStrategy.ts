import { DefaultNamingStrategy, NamingStrategyInterface, Table } from 'typeorm';

export class DatabaseNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  primaryKeyName(tableOrName: string | Table): string {
    return `${tableOrName}_pkey`;
  }

  uniqueConstraintName(tableOrName: string | Table, columnNames: string[]): string {
    return `${tableOrName}_${columnNames[0]}_key`;
  }

  defaultConstraintName(tableOrName: string | Table, columnName: string): string {
    return `${tableOrName}_${columnName}_key`;
  }

  foreignKeyName(tableOrName: string | Table, columnNames: string[],
    referencedTablePath?: string, referencedColumnNames?: string[]): string {
    return `${tableOrName}_${columnNames[0]}_${referencedTablePath}_${referencedColumnNames[0]}_fkey`;
  }

  indexName(tableOrName: string | Table, columns: string[]): string {
    return `${tableOrName.toString().toLowerCase()}_${columns[0]}_index`;
  }
}
