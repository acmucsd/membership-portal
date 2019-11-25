require('dotenv').config();

module.exports = {
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    ssl: true,
    dialectOptions: {
      ssl: true,
    },
  },
};
