const TABLE_NAME = 'Events';
const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;
const DAY_IN_MILLISECONDS = 24 * HOUR_IN_MILLISECONDS;
const roundToHour = (date) => new Date(Math.round(date.getTime() / HOUR_IN_MILLISECONDS) * HOUR_IN_MILLISECONDS);

module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.bulkInsert(TABLE_NAME, [{
    uuid: 'f9de28ca-80cc-4aeb-b8ed-ee9a92954e24',
    title: 'Bit-Byte Allocation',
    description: 'The big reveal is here!',
    committee: '',
    location: 'Qualcomm Room',
    start: roundToHour(new Date(Date.now() - DAY_IN_MILLISECONDS)),
    end: roundToHour(new Date(Date.now() - (DAY_IN_MILLISECONDS - HOUR_IN_MILLISECONDS))),
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
    start: roundToHour(new Date(Date.now() - HOUR_IN_MILLISECONDS)),
    end: roundToHour(new Date(Date.now() + HOUR_IN_MILLISECONDS)),
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
    start: roundToHour(new Date(Date.now() - HOUR_IN_MILLISECONDS)),
    end: roundToHour(new Date(Date.now() + HOUR_IN_MILLISECONDS)),
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
    start: roundToHour(new Date(Date.now() + (DAY_IN_MILLISECONDS - HOUR_IN_MILLISECONDS))),
    end: roundToHour(new Date(Date.now() + DAY_IN_MILLISECONDS)),
    attendanceCode: 'p0ng',
    pointValue: 10,
    requiresStaff: false,
    staffPointBonus: 0,
  }]),

  down: (queryInterface, Sequelize) => queryInterface.bulkDelete(TABLE_NAME, null, {}),
};
