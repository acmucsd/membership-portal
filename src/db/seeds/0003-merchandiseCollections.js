const TABLE_NAME = 'MerchandiseCollections';
module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.bulkInsert(TABLE_NAME, [{
    uuid: '0de9ad9d-fb30-4b27-8321-05cae445a66b',
    title: 'The Hack School Collection',
    description: 'Do you like to code? Tell the world with this Hack School inspired collection.',
  }, {
    uuid: '45ed524f-0b1b-46ee-b591-f721dfb06a67',
    title: 'Fall 2001',
    description: 'Celebrate the opening of Sixth College in style, featuring raccoon print jackets.',
  }]),

  down: (queryInterface, Sequelize) => queryInterface.bulkDelete(TABLE_NAME, null, {}),
};
