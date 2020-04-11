module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.bulkInsert('Events', [{
    uuid: 'f9de28ca-80cc-4aeb-b8ed-ee9a92954e24',
    title: 'Bit-Byte Allocation',
    description: 'The big reveal is here!',
    committee: '',
    location: 'Qualcomm Room',
    start: new Date(Date.now() - 86400000),
    end: new Date(Date.now() - 82800000),
    attendanceCode: 'malloc',
    pointValue: 20,
    requiresStaff: false,
    staffPointBonus: 0,
  }, {
    uuid: '67f5223d-f721-402f-a536-2998101d7cd0',
    title: 'Hack School - NodeJS',
    description: 'Learn Node.',
    committee: '',
    location: 'PC ERC Room',
    start: new Date(Date.now() - 3600000),
    end: new Date(Date.now() + 3600000),
    attendanceCode: 'n0d3',
    pointValue: 30,
    requiresStaff: true,
    staffPointBonus: 5,
  }, {
    uuid: 'bb95dea5-e9d4-4b65-8606-0286dbff4c05',
    title: 'ACM Eats: Taco Stand',
    description: 'Taco Tuesday.',
    committee: '',
    location: 'PC Loop',
    start: new Date(Date.now() - 3600000),
    end: new Date(Date.now() + 3600000),
    attendanceCode: 'tac0',
    pointValue: 15,
    requiresStaff: false,
    staffPointBonus: 0,
  }, {
    uuid: 'c00b5de1-fffb-42a9-bf06-94a4022d016d',
    title: 'Pool and Ping Pong',
    description: 'Game night.',
    committee: '',
    location: 'PC Game Room',
    start: new Date(Date.now() + 82800000),
    end: new Date(Date.now() + 86400000),
    attendanceCode: 'p0ng',
    pointValue: 10,
    requiresStaff: false,
    staffPointBonus: 0,
  }]),

  down: (queryInterface, Sequelize) => queryInterface.bulkDelete('Events', null, {}),
};
