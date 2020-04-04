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
    email: 'acm@ucsd.edu',
    accessType: 'ADMIN',
    state: 'ACTIVE',
    firstName: 'ACM',
    lastName: 'Admin',
    hash: '$2b$10$vvmimV6gjhO0edbKAfbdB.Tkfp5roGcFUPEbedDJxsdVZahvkIVzW',
    graduationYear: 2020,
    major: 'Computer Science',
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
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
    },
    bucket: process.env.S3_BUCKET,
  },

  email: {
    user: process.env.SENDGRID_USER,
    apiKey: process.env.SENDGRID_API_KEY,
  },
};
