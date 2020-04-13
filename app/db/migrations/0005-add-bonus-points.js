module.exports = {
  up: (queryInterface, Sequelize) => queryInterface
    .sequelize.query('ALTER TYPE "enum_Activities_type" ADD VALUE \'BONUS_POINTS\' BEFORE \'MILESTONE\''),
  down: (queryInterface, Sequelize) => queryInterface
    .sequelize.query('DELETE FROM pg_enum WHERE enumlabel=\'BONUS_POINTS\' AND '
      + 'enumtypid =(SELECT oid FROM pg_type WHERE typname = \'enum_Activities_type\')'),
};
