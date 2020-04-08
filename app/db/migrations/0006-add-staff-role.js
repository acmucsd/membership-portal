module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize
    .query('ALTER TYPE "enum_Users_accessType" ADD VALUE \'STAFF\' BEFORE \'ADMIN\''),

  down: (queryInterface, Sequelize) => queryInterface.sequelize
    .query('DELETE FROM pg_enum WHERE enumlabel=\'STAFF\' AND '
      + 'enumtypid =(SELECT oid FROM pg_type WHERE typname = \'enum_Users_accessType\')'),
};
