import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { Config } from '../config';
import { getTraceContext } from './TraceContext';

export const logger = winston.createLogger({
  level: Config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format((info) => Object.assign(info, getTraceContext()))(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.DailyRotateFile({
      dirname: 'logs',
      filename: '%DATE%.log',
      datePattern: 'YYYY-MM',
    }),
  ],
});
