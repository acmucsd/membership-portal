import { config } from 'dotenv';

config();

const env = process.env.NODE_ENV || 'development';
const isDevelopment = env !== 'production';

const BYTES_PER_KILOBYTE = 1024;

const TWO_WEEKS_IN_SECONDS = 14 * 24 * 60 * 60;

export const Config = {
  port: Number(process.env.PORT) || 3000,

  isDevelopment,

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  admin: {
    uuid: '45b4b5b6-9e9e-48b4-9cd6-7952d642c3e7',
    email: 'acm@ucsd.edu',
    accessType: 'ADMIN',
    state: 'ACTIVE',
    firstName: 'ACM',
    lastName: 'Admin',
    hash: '$2b$10$vvmimV6gjhO0edbKAfbdB.Tkfp5roGcFUPEbedDJxsdVZahvkIVzW',
    graduationYear: 2020,
    major: 'Computing Machinery',
  },

  auth: {
    secret: process.env.AUTH_SECRET,
    tokenLifespan: process.env.TOKEN_LIFESPAN || TWO_WEEKS_IN_SECONDS,
  },

  client: process.env.CLIENT,

  database: {
    host: process.env.RDS_HOST,
    port: Number(process.env.RDS_PORT),
    name: process.env.RDS_DATABASE,
    user: process.env.RDS_USER,
    pass: process.env.RDS_PASSWORD,
    uri: process.env.RDS_URI,
  },

  s3: {
    region: process.env.S3_REGION,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    bucket: process.env.S3_BUCKET,
  },

  file: {
    MAX_PROFILE_PICTURE_FILE_SIZE: Number(process.env.MAX_PROFILE_PICTURE_FILE_SIZE) * BYTES_PER_KILOBYTE,
    MAX_EVENT_COVER_FILE_SIZE: Number(process.env.MAX_EVENT_COVER_FILE_SIZE) * BYTES_PER_KILOBYTE,
    MAX_BANNER_FILE_SIZE: Number(process.env.MAX_BANNER_FILE_SIZE) * BYTES_PER_KILOBYTE,
    PROFILE_PICTURE_UPLOAD_PATH: process.env.BASE_UPLOAD_PATH + process.env.PROFILE_PICTURE_UPLOAD_PATH,
    EVENT_COVER_UPLOAD_PATH: process.env.BASE_UPLOAD_PATH + process.env.EVENT_COVER_UPLOAD_PATH,
    BANNER_UPLOAD_PATH: process.env.BASE_UPLOAD_PATH + process.env.BANNER_UPLOAD_PATH,
  },

  email: {
    user: process.env.SENDGRID_USER,
    apiKey: process.env.SENDGRID_API_KEY,
  },

  metrics: {
    apiKey: process.env.DATADOG_API_KEY,
  },

  pointReward: {
    FEEDBACK_POINT_REWARD: Number(process.env.FEEDBACK_POINT_REWARD),
    EVENT_FEEDBACK_POINT_REWARD: Number(process.env.EVENT_FEEDBACK_POINT_REWARD),
  },
};
