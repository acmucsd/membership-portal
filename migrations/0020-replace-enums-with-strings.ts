import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';
import { TableColumnOptions } from 'typeorm/schema-builder/options/TableColumnOptions';
import { ActivityType, UserAccessType, UserState } from '../types';

export class ReplaceEnumsWithStrings1602914093929 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.enumToString(queryRunner, 'Activities', 'type');
    await this.enumToString(queryRunner, 'Users', 'accessType', UserAccessType.STANDARD);
    await this.enumToString(queryRunner, 'Users', 'state', UserState.PENDING);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.stringToEnum(queryRunner, 'Activities', 'type', Object.keys(ActivityType));
    await this.stringToEnum(queryRunner, 'Users', 'accessType', Object.keys(UserAccessType), UserAccessType.STANDARD);
    await this.stringToEnum(queryRunner, 'Users', 'state', Object.keys(UserState), UserState.PENDING);
  }

  private async enumToString(queryRunner: QueryRunner, table: string, column: string, dfault?: string) {
    const tempColumnName = `${column}_string`;
    const tableColumnOptions: TableColumnOptions = {
      name: tempColumnName,
      type: 'varchar(255)',
      isNullable: true,
    };
    await this.changeType(queryRunner, table, column, tableColumnOptions, dfault);
    await queryRunner.query(`DROP TYPE "enum_${table}_${column}" CASCADE`);
  }

  private async stringToEnum(queryRunner: QueryRunner, table: string, column: string, keys: string[], dfault?: string) {
    const tempColumnName = `${column}_enum`;
    const tableColumnOptions: TableColumnOptions = {
      name: tempColumnName,
      type: 'enum',
      isNullable: true,
      enum: keys,
      enumName: `enum_${table}_${column}`,
    };
    await this.changeType(queryRunner, table, column, tableColumnOptions, dfault);
  }

  private async changeType(queryRunner: QueryRunner, table: string, column: string, options: TableColumnOptions, dfault?: string) {
    const tempColumnName = options.name;
    const enumName = `enum_${table}_${column}`;
    await queryRunner.addColumn(table, new TableColumn(options));
    // cast the strings to their enum equivalents
    await queryRunner.query(`UPDATE "${table}" SET "${tempColumnName}" = "${column}"::"${enumName}"`);
    await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "${tempColumnName}" SET NOT NULL`);
    if (dfault) {
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "${tempColumnName}" SET DEFAULT '${dfault}'::"${enumName}"`);
    }
    await queryRunner.dropColumn(table, column);
    // manually rename the column because of an unnecessary query in QueryRunner::renameColumn that errors
    await queryRunner.query(`ALTER TABLE "${table}" RENAME COLUMN "${tempColumnName}" to "${column}"`);
  }
}
