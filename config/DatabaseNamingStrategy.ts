import { DefaultNamingStrategy, NamingStrategyInterface, Table } from 'typeorm';

export class DatabaseNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  private toTableNameString(tableOrName: string | Table) {
    const tableName = typeof tableOrName === 'string' ? tableOrName : tableOrName.name;
    return tableName;
  }

  primaryKeyName(tableOrName: string | Table): string {
    return `${this.toTableNameString(tableOrName)}_pkey`;
  }

  uniqueConstraintName(tableOrName: string | Table, columnNames: string[]): string {
    return `${this.toTableNameString(tableOrName)}_${columnNames[0]}_key`;
  }

  defaultConstraintName(tableOrName: string | Table, columnName: string): string {
    return `${this.toTableNameString(tableOrName)}_${columnName}_key`;
  }

  foreignKeyName(tableOrName: string | Table, columnNames: string[],
    referencedTablePath?: string, referencedColumnNames?: string[]): string {
    return `${this.toTableNameString(tableOrName)}_${columnNames[0]}_`
      + `${referencedTablePath}_${referencedColumnNames[0]}_fkey`;
  }

  indexName(tableOrName: string | Table, columns: string[]): string {
    return `${this.toTableNameString(tableOrName).toString().toLowerCase()}_${columns[0]}_index`;
  }
}
