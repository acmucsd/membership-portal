module.exports = (User, Event) => Promise.all([
  User.create({
    email: 's3bansal@ucsd.edu',
    accessType: 'STANDARD',
    state: 'ACTIVE',
    firstName: 'Sumeet',
    lastName: 'Bansal',
    hash: '$2b$10$WNZRaGHvj3blWAtosHrSDeH4wuSkpwmEVq4obpKr4nujs4XavIgmG', // password
    points: 125,
    graduationYear: 2020,
    major: 'Computer Science',
  }),

  User.create({
    email: 'jrpadua@ucsd.edu',
    accessType: 'STANDARD',
    state: 'ACTIVE',
    firstName: 'Jaden',
    lastName: 'Padua',
    hash: '$2b$10$WNZRaGHvj3blWAtosHrSDeH4wuSkpwmEVq4obpKr4nujs4XavIgmG', // password
    points: 205,
    graduationYear: 2022,
    major: 'Computer Science',
  }),

  User.create({
    email: 'yix220@ucsd.edu',
    accessType: 'STANDARD',
    state: 'ACTIVE',
    firstName: 'Cora',
    lastName: 'Xing',
    hash: '$2b$10$WNZRaGHvj3blWAtosHrSDeH4wuSkpwmEVq4obpKr4nujs4XavIgmG', // password
    points: 195,
    graduationYear: 2021,
    major: 'Computer Science',
  }),

  User.create({
    email: 'clp013@ucsd.edu',
    accessType: 'STANDARD',
    state: 'ACTIVE',
    firstName: 'Clark',
    lastName: 'Phan',
    hash: '$2b$10$WNZRaGHvj3blWAtosHrSDeH4wuSkpwmEVq4obpKr4nujs4XavIgmG', // password
    graduationYear: 2020,
    major: 'Mathematics - Computer Science',
  }),

  User.create({
    email: 'stl005@ucsd.edu',
    accessType: 'STANDARD',
    state: 'ACTIVE',
    firstName: 'Stanley',
    lastName: 'Lee',
    hash: '$2b$10$WNZRaGHvj3blWAtosHrSDeH4wuSkpwmEVq4obpKr4nujs4XavIgmG', // password
    points: 55,
    graduationYear: 2020,
    major: 'Data Science',
  }),

  User.create({
    email: 'kenakai@ucsd.edu',
    accessType: 'STANDARD',
    state: 'ACTIVE',
    firstName: 'Kendall',
    lastName: 'Nakai',
    hash: '$2b$10$WNZRaGHvj3blWAtosHrSDeH4wuSkpwmEVq4obpKr4nujs4XavIgmG', // password
    points: 160,
    graduationYear: 2020,
    major: 'Computer Engineering',
  }),

  Event.create({
    title: 'Fall 2019 GBM',
    description: 'Inaugural GBM.',
    committee: '',
    location: 'PC East Ball Room',
    start: new Date(2019, 8, 29, 18),
    end: new Date(2019, 8, 29, 20),
    attendanceCode: '@cmuc5d',
    pointValue: 20,
  }),

  Event.create({
    title: 'Pool and Ping Pong',
    description: 'Game night.',
    committee: '',
    location: 'PC Game Room',
    start: new Date(2019, 9, 8, 19),
    end: new Date(2019, 9, 8, 21),
    attendanceCode: 'p0ng',
    pointValue: 10,
  }),

  Event.create({
    title: 'Hack School - NodeJS',
    description: 'Learn Node.',
    committee: '',
    location: 'PC ERC Room',
    start: new Date(2019, 9, 15, 14),
    end: new Date(2019, 9, 15, 18),
    attendanceCode: 'n0d3',
    pointValue: 30,
  }),
]);
