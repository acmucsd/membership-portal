import * as moment from 'moment';
import { UserAccessType } from '../types';
import { DatabaseConnection, EventFactory, MerchFactory, PortalState, UserFactory } from './data';

function roundToHalfHour(date: moment.Moment): Date {
  const HALF_HOUR_IN_MILLISECONDS = moment.duration(30, 'minutes').asMilliseconds();
  return new Date(Math.round(date.valueOf() / HALF_HOUR_IN_MILLISECONDS) * HALF_HOUR_IN_MILLISECONDS);
}

function getGraduationYear(n: number) {
  return moment().year() + n;
}

/**
 * Our goal is to define some small system from which most actions are testable,
 * e.g. checking into events (past/future, already-attended, ongoing), ordering
 * merch (out of stock, insufficient credits, lifetime limit, successful), getting
 * a decent-sized sliding leaderboard.
 *
 * Users: an admin, a couple committees (Hack, AI) and their accompanying
 * staff, and a handful of members.
 *
 * Events: some staffed committee workshops, unstaffed general/committe socials,
 * and staffed industry events, in the past, present, and future.
 *
 * There're also some "edge cases" here and there inspired by real data, e.g.
 * admins granting bonus points to members that forgot/were unable to check-in.
 */
async function seed(): Promise<void> {
  const conn = await DatabaseConnection.get();
  await DatabaseConnection.clear();

  const ADMIN = UserFactory.fake({
    email: 'acm@ucsd.edu',
    accessType: UserAccessType.ADMIN,
    firstName: 'ACM',
    lastName: 'Admin',
  });

  const STAFF_GENERAL = UserFactory.fake({
    email: 'stl005@ucsd.edu',
    accessType: UserAccessType.STAFF,
    firstName: 'Stanley',
    lastName: 'Lee',
  });
  const STAFF_HACK = UserFactory.fake({
    email: 'smhariha@ucsd.edu',
    accessType: UserAccessType.STAFF,
    firstName: 'Shravan',
    lastName: 'Hariharan',
  });
  const STAFF_AI = UserFactory.fake({
    email: 'stao@ucsd.edu',
    accessType: UserAccessType.STAFF,
    firstName: 'Stone',
    lastName: 'Tao',
  });

  const MEMBER_FRESHMAN = UserFactory.fake({
    email: 'ssteiner@ucsd.edu',
    accessType: UserAccessType.STANDARD,
    firstName: 'Steven',
    lastName: 'Steiner',
    graduationYear: getGraduationYear(4),
  });
  const MEMBER_SOPHOMORE = UserFactory.fake({
    email: 'jpan@ucsd.edu',
    accessType: UserAccessType.STANDARD,
    firstName: 'Paul',
    lastName: 'Pan',
    graduationYear: getGraduationYear(3),
  });
  const MEMBER_JUNIOR = UserFactory.fake({
    email: 'asudhart@ucsd.edu',
    accessType: UserAccessType.STANDARD,
    firstName: 'Andrea',
    lastName: 'Sudharta',
    graduationYear: getGraduationYear(2),
  });
  const MEMBER_SENIOR = UserFactory.fake({
    email: 's3bansal@ucsd.edu',
    accessType: UserAccessType.STANDARD,
    firstName: 'Sumeet',
    graduationYear: getGraduationYear(0),
  });

  const unstaffed = { requiresStaff: false, staffPointBonus: 0 };
  const staffed = { requiresStaff: true };
  const general = { commitee: 'ACM' };
  const hack = { committee: 'Hack' };
  const ai = { committee: 'AI' };

  const daysAgo = (n: number) => ({
    start: roundToHalfHour(moment().subtract(n, 'days').hour(11)),
    end: roundToHalfHour(moment().subtract(n, 'days').hour(13)),
  });

  const PAST_AI_WORKSHOP_1 = EventFactory.fake({
    title: 'AI: Intro to Neural Nets',
    description: `Artificial neural networks (ANNs), usually simply called
    neural networks (NNs), are computing systems vaguely inspired by the
    biological neural networks that constitute animal brains. An ANN is based
    on a collection of connected units or nodes called artificial neurons,
    which loosely model the neurons in a biological brain.`,
    ...ai,
    location: 'Qualcomm Room',
    ...daysAgo(6),
    attendanceCode: 'galaxybrain',
    ...staffed,
  });
  const PAST_HACK_WORKSHOP = EventFactory.fake({
    title: 'Hack: Intro to Rust',
    description: `Rust is a multi-paradigm programming language focused on
    performance and safety, especially safe concurrency. Rust is syntactically
    similar to C++, but can guarantee memory safety by using a borrow checker
    to validate references. Unlike other safe programming languages, Rust does
    not use garbage collection. Rust has been named the "most loved programming
    language" in the Stack Overflow Developer Survey every year since 2016.`,
    ...hack,
    location: 'Qualcomm Room',
    ...daysAgo(5),
    attendanceCode: 'ferris',
    ...staffed,
  });
  const PAST_ACM_SOCIAL_1 = EventFactory.fake({
    title: 'ACM Eats: Taco Stand',
    description: `Nopal (from the Nahuatl word nohpalli [noʔˈpalːi] for the pads
    of the plant) is a common name in Spanish for Opuntia cacti (commonly referred
    to in English as prickly pear), as well as for its pads. There are approx
    one hundred and fourteen known species endemic to Mexico, where the plant is
    a common ingredient in numerous Mexican cuisine dishes.`,
    ...general,
    location: 'Taco Stand',
    ...daysAgo(4),
    attendanceCode: 'tac0',
    ...unstaffed,
  });
  const PAST_AI_WORKSHOP_2 = EventFactory.fake({
    title: 'AI: Federated Learning Workshop',
    description: `Federated learning (also known as collaborative learning)
    is a machine learning technique that trains an algorithm across multiple
    decentralized edge devices or servers holding local data samples, without
    exchanging them. This approach enables multiple actors to build a common,
    robust machine learning model without sharing data, thus allowing to address
    critical issues such as data privacy, data security, data access rights and
    access to heterogeneous data.`,
    ...ai,
    location: 'Qualcomm Room',
    ...daysAgo(3),
    attendanceCode: '4ggregate',
    ...staffed,
  });
  const PAST_ACM_PANEL = EventFactory.fake({
    title: 'Startup Intern Panel',
    description: `The unicorn is a legendary creature that has been described
    since antiquity as a beast with a single large, pointed, spiraling horn
    projecting from its forehead. The unicorn was depicted in ancient seals of
    the Indus Valley Civilization and was mentioned by the ancient Greeks in
    accounts of natural history by various writers, including Ctesias, Strabo,
    Pliny the Younger, Aelian and Cosmas Indicopleustes.`,
    ...general,
    location: 'PC East Ballroom',
    ...daysAgo(2),
    attendanceCode: 'sfsummer',
    ...unstaffed,
  });
  const PAST_ACM_SOCIAL_2 = EventFactory.fake({
    title: 'ACM Builds Mini Terrariums',
    description: `Monterey Bay Aquarium is a nonprofit public aquarium in
    Monterey, California. Known for its regional focus on the marine habitats
    of Monterey Bay, it was the first to exhibit a living kelp forest when it
    opened in October 1984. Its biologists have pioneered the animal husbandry
    of jellyfish and it was the first to successfully care for and display a
    great white shark. The organization's research and conservation efforts
    also focus on sea otters, various birds, and tunas.`,
    ...general,
    location: 'Qualcomm Room',
    ...daysAgo(1),
    attendanceCode: 'm0ssy',
    ...staffed,
  });

  const ONGOING_ACM_SOCIAL_1 = EventFactory.fake({
    title: 'ACM Watches: Planet Earth',
    description: `Sir David Frederick Attenborough (/ˈætənbərə/; born 8 May 1926)
    is an English broadcaster and natural historian. He is best known for writing
    and presenting, in conjunction with the BBC Natural History Unit, the nine
    natural history documentary series forming the Life collection that together
    constitute a comprehensive survey of animal and plant life on Earth.`,
    ...general,
    location: 'WLH 2001',
    start: roundToHalfHour(moment().subtract(90, 'minutes')),
    end: roundToHalfHour(moment().add(30, 'minutes')),
    attendanceCode: '1ife',
    ...unstaffed,
  });
  const ONGOING_ACM_SOCIAL_2 = EventFactory.fake({
    title: 'ACM Pickup Tournament',
    description: `The original American Basketball Association (ABA) was a men's
    professional basketball league, from 1967 to 1976. The ABA distinguished itself
    from the NBA with a more wide-open, flashy style of offensive play. According
    to one of the owners, its goal was to force a merger with the more established
    league. Potential investors were told that they could get an ABA team for half
    of what it cost to get an NBA expansion team at the time.`,
    ...general,
    location: 'RIMAC',
    start: roundToHalfHour(moment().subtract(30, 'minutes')),
    end: roundToHalfHour(moment().add(90, 'minutes')),
    attendanceCode: 'k0be',
    ...unstaffed,
  });
  const ONGOING_HACK_WORKSHOP = EventFactory.fake({
    title: 'Hack: Intro to Smart Contracts',
    description: `A smart contract is a computer program or a transaction protocol
    which is intended to automatically execute, control or document legally relevant
    events and actions according to the terms of a contract or an agreement. The
    objectives of smart contracts are the reduction of need in trusted intermediators,
    arbitrations and enforcement costs, fraud losses, as well as the reduction of
    malicious and accidental exceptions.`,
    ...hack,
    location: 'Hack Discord, channel #smart-contracts',
    start: roundToHalfHour(moment().subtract(45, 'minutes')),
    end: roundToHalfHour(moment().add(45, 'minutes')),
    attendanceCode: 'd3fi',
    ...staffed,
  });

  const FUTURE_AI_SOCIAL = EventFactory.fake({
    title: 'AI Plays: Chess IRL',
    description: `The Najdorf Variation (/ˈnaɪdɔːrf/ NY-dorf) of the Sicilian
    Defence is one of the most respected and deeply studied of all chess
    openings. Modern Chess Openings calls it the "Cadillac" or "Rolls Royce"
    of chess openings. The opening is named after the Polish-Argentine
    grandmaster Miguel Najdorf. Many players have lived by the Najdorf
    (notably Bobby Fischer and Garry Kasparov, although Kasparov would often
    transpose into a Scheveningen).`,
    ...ai,
    location: 'Qualcomm Room',
    ...daysAgo(-1),
    attendanceCode: 'd33pblue',
    ...unstaffed,
  });
  const FUTURE_HACK_WORKSHOP_1 = EventFactory.fake({
    title: 'Hack x DS3: Computing at Scale',
    description: `Apache Flink is an open-source, unified stream-processing and
    batch-processing framework developed by the Apache Software Foundation. The
    core of Apache Flink is a distributed streaming data-flow engine written in
    Java and Scala. Flink executes arbitrary dataflow programs in a data-parallel
    and pipelined (hence task parallel) manner. Flink's pipelined runtime system
    enables the execution of bulk/batch and stream processing programs. Furthermore,
    Flink's runtime supports the execution of iterative algorithms natively.`,
    ...hack,
    location: 'Qualcomm Room',
    ...daysAgo(-2),
    attendanceCode: 'sp4rk',
    ...staffed,
  });
  const FUTURE_HACK_WORKSHOP_2 = EventFactory.fake({
    title: 'Hack: Contributing to Open Source',
    description: `Git is a distributed version-control system for tracking changes
    in source code during software development. It is designed for coordinating
    work among programmers, but it can be used to track changes in any set of files.
    Its goals include speed, data integrity, and support for distributed, non-linear
    workflows.`,
    ...hack,
    location: 'Qualcomm Room',
    ...daysAgo(-3),
    attendanceCode: 'f0rk',
    ...staffed,
  });

  const MERCH_COLLECTION_1 = MerchFactory.fakeCollection({
    title: 'The Hack School Collection',
    description: 'Do you like to code? Tell the world with this Hack School inspired collection.',
  });
  const MERCH_ITEM_1 = MerchFactory.fakeItem({
    collection: MERCH_COLLECTION_1,
    itemName: 'Unisex Hack School Anorak',
    picture: '',
    description: 'San Diego has an average annual precipitation less than 12 inches,'
    + 'but that doesn\'t mean you don\'t need one of these.',
    monthlyLimit: 1,
    lifetimeLimit: 1,
    hidden: false,
  });
  const MERCH_ITEM_1_OPTION = MerchFactory.fakeOption({
    item: MERCH_ITEM_1,
    quantity: 5,
    price: 22500,
    discountPercentage: 0,
    metadata: {
      size: 'XL',
    },
  });
  MERCH_ITEM_1.options = [MERCH_ITEM_1_OPTION];
  const MERCH_ITEM_2 = MerchFactory.fakeItem({
    collection: MERCH_COLLECTION_1,
    itemName: 'Hack School Sticker Pack (4)',
    picture: '',
    description: 'Make space on your laptop cover for these stickers. Pack of 4, size in inches.',
    monthlyLimit: 5,
    lifetimeLimit: 25,
    hidden: false,
  });
  const MERCH_ITEM_2_CYAN = MerchFactory.fakeOption({
    item: MERCH_ITEM_2,
    quantity: 35,
    price: 1500,
    discountPercentage: 15,
    metadata: {
      color: 'CYAN',
      size: '4x4',
    },
  });
  const MERCH_ITEM_2_PINK = MerchFactory.fakeOption({
    item: MERCH_ITEM_2,
    quantity: 20,
    price: 1500,
    discountPercentage: 5,
    metadata: {
      color: 'LIGHT PINK',
      size: '2x2',
    },
  });
  const MERCH_ITEM_2_GREEN = MerchFactory.fakeOption({
    item: MERCH_ITEM_2,
    quantity: 80,
    price: 1500,
    discountPercentage: 55,
    metadata: {
      color: 'SEA GREEN',
      size: '3x3',
    },
  });
  MERCH_ITEM_2.options = [MERCH_ITEM_2_CYAN, MERCH_ITEM_2_PINK, MERCH_ITEM_2_GREEN];
  MERCH_COLLECTION_1.items = [MERCH_ITEM_1, MERCH_ITEM_2];
  const MERCH_COLLECTION_2 = MerchFactory.fakeCollection({
    title: 'Fall 2001',
    description: 'Celebrate the opening of Sixth College in style, featuring raccoon print jackets.',
  });
  const MERCH_ITEM_3 = MerchFactory.fakeItem({
    collection: MERCH_COLLECTION_2,
    itemName: 'Camp Snoopy Snapback',
    picture: '',
    description: 'Guaranteed 2x return on Grailed.',
    monthlyLimit: 2,
    lifetimeLimit: 5,
    hidden: false,
  });
  const MERCH_ITEM_3_OPTION = MerchFactory.fakeOption({
    item: MERCH_ITEM_3,
    quantity: 1,
    price: 8000,
    discountPercentage: 5,
  });
  MERCH_ITEM_3.options = [MERCH_ITEM_3_OPTION];
  const MERCH_ITEM_4 = MerchFactory.fakeItem({
    collection: MERCH_COLLECTION_2,
    itemName: 'Salt & Pepper (Canyon) Shakers',
    picture: '',
    description: 'Salt and pepper not included.',
    monthlyLimit: 3,
    lifetimeLimit: 10,
    hidden: false,
  });
  const MERCH_ITEM_4_OPTION = MerchFactory.fakeOption({
    item: MERCH_ITEM_4,
    quantity: 10,
    price: 2000,
    discountPercentage: 20,
  });
  MERCH_ITEM_4.options = [MERCH_ITEM_4_OPTION];
  const MERCH_ITEM_5 = MerchFactory.fakeItem({
    collection: MERCH_COLLECTION_2,
    itemName: 'Unisex Raccoon Print Shell Jacket',
    picture: '',
    description: 'Self-explanatory.',
    monthlyLimit: 1,
    lifetimeLimit: 2,
    hidden: false,
  });
  const MERCH_ITEM_5_MEDIUM = MerchFactory.fakeOption({
    item: MERCH_ITEM_5,
    quantity: 10,
    price: 19500,
    discountPercentage: 0,
    metadata: {
      size: 'M',
    },
  });
  const MERCH_ITEM_5_LARGE = MerchFactory.fakeOption({
    item: MERCH_ITEM_5,
    quantity: 10,
    price: 20500,
    discountPercentage: 0,
    metadata: {
      size: 'L',
    },
  });
  MERCH_ITEM_5.options = [MERCH_ITEM_5_MEDIUM, MERCH_ITEM_5_LARGE];
  MERCH_COLLECTION_2.items = [MERCH_ITEM_3, MERCH_ITEM_4, MERCH_ITEM_5];

  await new PortalState()
    .createUsers([
      ADMIN,
      STAFF_AI,
      STAFF_GENERAL,
      STAFF_HACK,
      MEMBER_FRESHMAN,
      MEMBER_SOPHOMORE,
      MEMBER_JUNIOR,
      MEMBER_SENIOR,
    ])
    .createEvents([
      PAST_AI_WORKSHOP_1,
      PAST_HACK_WORKSHOP,
      PAST_ACM_SOCIAL_1,
      PAST_AI_WORKSHOP_2,
      PAST_ACM_PANEL,
      PAST_ACM_SOCIAL_2,
    ])
    .attendEvents([
      STAFF_AI,
      STAFF_GENERAL,
      MEMBER_FRESHMAN,
      MEMBER_SOPHOMORE,
      MEMBER_JUNIOR,
      MEMBER_SENIOR,
    ], [PAST_AI_WORKSHOP_1], true)
    .attendEvents([
      STAFF_HACK,
      STAFF_AI,
      MEMBER_SOPHOMORE,
      MEMBER_JUNIOR,
      MEMBER_SENIOR,
    ], [PAST_HACK_WORKSHOP], true)
    .attendEvents([
      STAFF_GENERAL,
      STAFF_HACK,
      MEMBER_FRESHMAN,
      MEMBER_SOPHOMORE,
    ], [PAST_ACM_SOCIAL_1], false)
    .attendEvents([
      STAFF_AI,
      STAFF_HACK,
      MEMBER_SOPHOMORE,
      MEMBER_SENIOR,
    ], [PAST_AI_WORKSHOP_2], true)
    .attendEvents([
      STAFF_GENERAL,
      MEMBER_FRESHMAN,
      MEMBER_SOPHOMORE,
      MEMBER_JUNIOR,
    ], [PAST_ACM_PANEL], true)
    .attendEvents([
      STAFF_GENERAL,
      STAFF_AI,
      MEMBER_FRESHMAN,
      MEMBER_JUNIOR,
      MEMBER_SENIOR,
    ], [PAST_ACM_SOCIAL_2], true)
    .createEvents([
      ONGOING_ACM_SOCIAL_1,
      ONGOING_ACM_SOCIAL_2,
      ONGOING_HACK_WORKSHOP,
    ])
    .attendEvents([
      STAFF_GENERAL,
      MEMBER_FRESHMAN,
      MEMBER_SENIOR,
    ], [ONGOING_ACM_SOCIAL_1], false)
    .attendEvents([
      STAFF_AI,
      STAFF_HACK,
      MEMBER_SOPHOMORE,
      MEMBER_JUNIOR,
    ], [ONGOING_ACM_SOCIAL_2], true)
    .createEvents([
      FUTURE_AI_SOCIAL,
      FUTURE_HACK_WORKSHOP_1,
      FUTURE_HACK_WORKSHOP_2,
    ])
    .createMerch([
      MERCH_COLLECTION_1,
      MERCH_COLLECTION_2,
    ])
    .write();
}

seed();
