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

  email: {
    user: process.env.SENDGRID_USER,
    apiKey: process.env.SENDGRID_API_KEY,
  },

  rateLimits: {
    attendance: {
      windowMs: 15 * 60 * 1000, // 15 minutes in ms
      max: 25,
    },
    leaderboard: {
      windowMs: 15 * 60 * 1000,
      max: 25,
    },
    user: {
      windowMs: 15 * 60 * 1000,
      max: 25,
    },
    auth: {
      windowMs: 24 * 60 * 60 * 1000, // 1 day in ms
      max: 25,
    },
    event: {
      windowMs: 15 * 60 * 1000,
      max: 25,
    },
  },
};
