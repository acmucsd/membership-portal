const env = process.env.NODE_ENV || 'development';
const isDevelopment = env !== 'production';
if (isDevelopment) require('dotenv').config();

module.exports = {
  isDevelopment,

  port: process.env.PORT || 3000,

  logging: {
    level: 'info',
  },

  database: {
    dialect: 'postgres',
    host: process.env.RDS_HOST,
    port: process.env.RDS_PORT,
    db: process.env.RDS_DATABASE,
    user: process.env.RDS_USER,
    password: process.env.RDS_PASSWORD,
  },
};
