const env = process.env.NODE_ENV || 'development';

module.exports = {
  isProduction: (env === 'production'),
  isDevelopment: (env !== 'production'),

  port: process.env.PORT || 5000,

  logging: {
    level: 'info',
  },

  database: {
    dialect: 'postgres',
    host: process.env.RDS_HOST || 'localhost',
    port: process.env.RDS_PORT,
    db: process.env.RDS_DATABASE,
    user: process.env.RDS_USER,
    password: process.env.RDS_PASSWORD,
  },
};
