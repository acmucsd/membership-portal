import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';
import { TableColumnOptions } from 'typeorm/schema-builder/options/TableColumnOptions';
import { ActivityType, UserAccessType, UserState } from '../types';

interface ReplacementInfo {
  table: string;
  column: string;
  tempColumnName: string;
  default?: string;
}

export class ReplaceEnumsWithStrings1602914093929 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.enumToString(queryRunner, 'Activities', 'type');
    await this.enumToString(queryRunner, 'Users', 'accessType', UserAccessType.STANDARD);
    await this.enumToString(queryRunner, 'Users', 'state', UserState.PENDING);
  }

  private async enumToString(queryRunner: QueryRunner, table: string, column: string, dfault?: string) {
    const info: ReplacementInfo = {
      table,
      column,
      tempColumnName: `${column}_string`,
      default: dfault,
    };

    await this.addNewColumn(queryRunner, info, {
      name: info.tempColumnName,
      type: 'varchar(255)',
      isNullable: true,
    });
    await this.copyEnumValuesAsText(queryRunner, info);
    await this.dropOriginalColumn(queryRunner, info);
    await this.dropEnum(queryRunner, info);
    await this.setTempColumnNotNull(queryRunner, info);
    await this.setTempColumnTextDefault(queryRunner, info);
    await this.renameColumn(queryRunner, info);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.stringToEnum(queryRunner, 'Activities', 'type', Object.keys(ActivityType));
    await this.stringToEnum(queryRunner, 'Users', 'accessType', Object.keys(UserAccessType), UserAccessType.STANDARD);
    await this.stringToEnum(queryRunner, 'Users', 'state', Object.keys(UserState), UserState.PENDING);
  }

  private async stringToEnum(queryRunner: QueryRunner, table: string, column: string, keys: string[], dfault?: string) {
    const info: ReplacementInfo = {
      table,
      column,
      tempColumnName: `${column}_enum`,
      default: dfault,
    };

    await this.addNewColumn(queryRunner, info, {
      name: info.tempColumnName,
      type: 'enum',
      isNullable: true,
      enum: keys,
      enumName: this.enumName(info),
    });
    await this.copyTextAsEnumValues(queryRunner, info);
    await this.dropOriginalColumn(queryRunner, info);
    await this.setTempColumnNotNull(queryRunner, info);
    await this.setTempColumnEnumDefault(queryRunner, info);
    await this.renameColumn(queryRunner, info);
  }

  private async addNewColumn(queryRunner: QueryRunner, info: ReplacementInfo, options: TableColumnOptions) {
    await queryRunner.addColumn(info.table, new TableColumn(options));
  }

  private async copyEnumValuesAsText(queryRunner: QueryRunner, info: ReplacementInfo) {
    await queryRunner.query(`UPDATE "${info.table}" SET "${info.tempColumnName}" = "${info.column}"::text`);
  }

  private async copyTextAsEnumValues(queryRunner: QueryRunner, info: ReplacementInfo) {
    const enumName = this.enumName(info);
    await queryRunner.query(`UPDATE "${info.table}" SET "${info.tempColumnName}" = "${info.column}"::"${enumName}"`);
  }

  private async dropOriginalColumn(queryRunner: QueryRunner, info: ReplacementInfo) {
    await queryRunner.dropColumn(info.table, info.column);
  }

  private async dropEnum(queryRunner: QueryRunner, info: ReplacementInfo) {
    await queryRunner.query(`DROP TYPE IF EXISTS "enum_${info.table}_${info.column}" CASCADE`);
  }

  private async setTempColumnNotNull(queryRunner: QueryRunner, info: ReplacementInfo) {
    await queryRunner.query(`${this.alterColumnQuery(info)} SET NOT NULL`);
  }

  private async setTempColumnEnumDefault(queryRunner: QueryRunner, info: ReplacementInfo) {
    const enumName = this.enumName(info);
    await queryRunner.query(`${this.alterColumnQuery(info)} SET DEFAULT '${info.default}'::"${enumName}"`);
  }

  private async setTempColumnTextDefault(queryRunner: QueryRunner, info: ReplacementInfo) {
    await queryRunner.query(`${this.alterColumnQuery(info)} SET DEFAULT '${info.default}'::text`);
  }

  private async renameColumn(queryRunner: QueryRunner, info: ReplacementInfo) {
    // manually rename the column because of an unnecessary query in QueryRunner::renameColumn that errors
    await queryRunner.query(`ALTER TABLE "${info.table}" RENAME COLUMN "${info.tempColumnName}" to "${info.column}"`);
  }

  private alterColumnQuery(info: ReplacementInfo) {
    return `ALTER TABLE "${info.table}" ALTER COLUMN "${info.tempColumnName}"`;
  }

  private enumName(info: ReplacementInfo) {
    return `enum_${info.table}_${info.column}`;
  }
}
