module.exports = {
  up: (queryInterface, Sequelize) => queryInterface
    .sequelize.query('ALTER TYPE "enum_Activities_type" ADD VALUE \'ATTEND_EVENT_AS_STAFF\' AFTER \'ATTEND_EVENT\''),
  down: (queryInterface, Sequelize) => queryInterface
    .sequelize.query('DELETE FROM pg_enum WHERE enumlabel=\'ATTEND_EVENT_AS_STAFF\' AND '
      + 'enumtypid =(SELECT oid FROM pg_type WHERE typname = \'enum_Activities_type\')'),
};
