const env = process.env.NODE_ENV || 'development';
const isDevelopment = env !== 'production';
if (isDevelopment) require('dotenv').config();

module.exports = {
  isDevelopment,

  port: process.env.PORT || 3000,

  logging: {
    level: 'info',
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
  },

  client: process.env.CLIENT,

  database: {
    dialect: 'postgres',
    host: process.env.RDS_HOST,
    port: process.env.RDS_PORT,
    db: process.env.RDS_DATABASE,
    user: process.env.RDS_USER,
    password: process.env.RDS_PASSWORD,
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
    MAX_PROFILE_PICTURE_FILE_SIZE: process.env.MAX_PROFILE_PICTURE_FILE_SIZE,
    MAX_EVENT_COVER_FILE_SIZE: process.env.MAX_EVENT_COVER_FILE_SIZE,
    PROFILE_PICTURE_UPLOAD_PATH: process.env.PROFILE_PICTURE_UPLOAD_PATH,
    EVENT_COVER_UPLOAD_PATH: process.env.EVENT_COVER_UPLOAD_PATH,
  },

  email: {
    user: process.env.SENDGRID_USER,
    apiKey: process.env.SENDGRID_API_KEY,
  },
};
