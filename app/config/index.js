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

  database: {
    dialect: 'postgres',
    host: process.env.RDS_HOST,
    port: process.env.RDS_PORT,
    db: process.env.RDS_DATABASE,
    user: process.env.RDS_USER,
    password: process.env.RDS_PASSWORD,
  },

  email: {
    apiKey: process.env.SENDGRID_API_KEY,
    from: 'acmucsd.portal@gmail.com',
  },
};
