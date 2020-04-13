module.exports = {
  up: (queryInterface, Sequelize) => queryInterface
    .sequelize.query('ALTER TABLE public."Users" ALTER COLUMN "accessType" SET DEFAULT'
    + '\'RESTRICTED\'::"enum_Users_accessType";'),
  down: (queryInterface, Sequelize) => queryInterface
    .sequelize.query('ALTER TABLE public."Users" ALTER COLUMN "accessType" SET DEFAULT'
    + '\'STANDARD\'::"enum_Users_accessType";'),
};
