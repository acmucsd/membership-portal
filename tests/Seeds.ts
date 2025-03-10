import * as moment from 'moment';
import { UserAccessType, SocialMediaType, FeedbackStatus, FeedbackType } from '../types';
import { DatabaseConnection, EventFactory, MerchFactory,
  PortalState, UserFactory, ResumeFactory, UserSocialMediaFactory } from './data';
import { FeedbackFactory } from './data/FeedbackFactory';

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
    email: 'tkwan@ucsd.edu',
    accessType: UserAccessType.STAFF,
    firstName: 'Trevor',
    lastName: 'Kwan',
  });

  const MEMBER_FRESHMAN = UserFactory.fake({
    email: 'sisteine@ucsd.edu',
    accessType: UserAccessType.STANDARD,
    firstName: 'Steven',
    lastName: 'Steiner',
    points: 675,
    graduationYear: getGraduationYear(4),
  });
  const MEMBER_SOPHOMORE = UserFactory.fake({
    email: 'r1truong@ucsd.edu',
    accessType: UserAccessType.STANDARD,
    firstName: 'Ryan',
    lastName: 'Truong',
    points: 800,
    graduationYear: getGraduationYear(3),
  });
  const MEMBER_JUNIOR = UserFactory.fake({
    email: 'rzsun@ucsd.edu',
    accessType: UserAccessType.STANDARD,
    firstName: 'Raymond',
    lastName: 'Sun',
    graduationYear: getGraduationYear(2),
  });
  const MEMBER_SENIOR = UserFactory.fake({
    email: 's3bansal@ucsd.edu',
    accessType: UserAccessType.STANDARD,
    firstName: 'Sumeet',
    graduationYear: getGraduationYear(0),
  });

  // Used for testing out user view of the merch store
  const USER_STORE = UserFactory.fake({
    email: 'acm_store@ucsd.edu',
    points: 500,
  });

  // Used for testing out user access types
  const USER_RESTRICTED = UserFactory.fake({
    email: 'acm_restricted@ucsd.edu',
    accessType: UserAccessType.RESTRICTED,
  });
  const USER_STANDARD = UserFactory.fake({
    email: 'acm_standard@ucsd.edu',
    accessType: UserAccessType.STANDARD,
  });
  const USER_STAFF = UserFactory.fake({
    email: 'acm_staff@ucsd.edu',
    accessType: UserAccessType.STAFF,
  });
  const USER_ADMIN = UserFactory.fake({
    email: 'acm_admin@ucsd.edu',
    accessType: UserAccessType.ADMIN,
  });
  const USER_MARKETING = UserFactory.fake({
    email: 'acm_marketing@ucsd.edu',
    accessType: UserAccessType.MARKETING,
  });
  const USER_MERCH_STORE_MANAGER = UserFactory.fake({
    email: 'acm_store_manager@ucsd.edu',
    accessType: UserAccessType.MERCH_STORE_MANAGER,
  });
  const USER_MERCH_STORE_DISTRIBUTOR = UserFactory.fake({
    email: 'acm_store_distributor@ucsd.edu',
    accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR,
  });
  const USER_SPONSORSHIP_MANAGER = UserFactory.fake({
    email: 'acm_sponsorship_manager@ucsd.edu',
    accessType: UserAccessType.SPONSORSHIP_MANAGER,
  });

  // Used for testing feedback
  const USER_FEEDBACK_1 = UserFactory.fake({ firstName: 'FeedbackerOne', lastName: 'Jones' });
  const USER_FEEDBACK_2 = UserFactory.fake({ firstName: 'FeedbackerTwo', lastName: 'Patel' });
  const USER_FEEDBACK_3 = UserFactory.fake({ firstName: 'FeedbackerThree', lastName: 'Smith' });

  // Used for testing various User Social Media
  const USER_SOCIAL_MEDIA_1 = UserFactory.fake();
  const USER_SOCIAL_MEDIA_1_FACEBOOK = UserSocialMediaFactory.fake(
    { user: USER_SOCIAL_MEDIA_1, type: SocialMediaType.FACEBOOK },
  );

  const USER_SOCIAL_MEDIA_2 = UserFactory.fake();
  const USER_SOCIAL_MEDIA_2_FACEBOOK = UserSocialMediaFactory.fake(
    { user: USER_SOCIAL_MEDIA_2, type: SocialMediaType.FACEBOOK },
  );
  const USER_SOCIAL_MEDIA_2_GITHUB = UserSocialMediaFactory.fake(
    { user: USER_SOCIAL_MEDIA_2, type: SocialMediaType.GITHUB },
  );

  const USER_SOCIAL_MEDIA_3 = UserFactory.fake();
  const USER_SOCIAL_MEDIA_3_FACEBOOK = UserSocialMediaFactory.fake(
    { user: USER_SOCIAL_MEDIA_3, type: SocialMediaType.FACEBOOK },
  );
  const USER_SOCIAL_MEDIA_3_INSTAGRAM = UserSocialMediaFactory.fake(
    { user: USER_SOCIAL_MEDIA_3, type: SocialMediaType.INSTAGRAM },
  );
  const USER_SOCIAL_MEDIA_3_LINKEDIN = UserSocialMediaFactory.fake(
    { user: USER_SOCIAL_MEDIA_3, type: SocialMediaType.LINKEDIN },
  );

  const USER_SOCIAL_MEDIA_ALL = UserFactory.fake();
  const USER_SOCIAL_MEDIA_ALL_FACEBOOK = UserSocialMediaFactory.fake(
    { user: USER_SOCIAL_MEDIA_ALL, type: SocialMediaType.FACEBOOK },
  );
  const USER_SOCIAL_MEDIA_ALL_GITHUB = UserSocialMediaFactory.fake(
    { user: USER_SOCIAL_MEDIA_ALL, type: SocialMediaType.GITHUB },
  );
  const USER_SOCIAL_MEDIA_ALL_INSTAGRAM = UserSocialMediaFactory.fake(
    { user: USER_SOCIAL_MEDIA_ALL, type: SocialMediaType.INSTAGRAM },
  );
  const USER_SOCIAL_MEDIA_ALL_LINKEDIN = UserSocialMediaFactory.fake(
    { user: USER_SOCIAL_MEDIA_ALL, type: SocialMediaType.LINKEDIN },
  );
  const USER_SOCIAL_MEDIA_ALL_DEVPOST = UserSocialMediaFactory.fake(
    { user: USER_SOCIAL_MEDIA_ALL, type: SocialMediaType.DEVPOST },
  );
  const USER_SOCIAL_MEDIA_ALL_TWITTER = UserSocialMediaFactory.fake(
    { user: USER_SOCIAL_MEDIA_ALL, type: SocialMediaType.TWITTER },
  );
  const USER_SOCIAL_MEDIA_ALL_PORTFOLIO = UserSocialMediaFactory.fake(
    { user: USER_SOCIAL_MEDIA_ALL, type: SocialMediaType.PORTFOLIO },
  );
  const USER_SOCIAL_MEDIA_ALL_EMAIL = UserSocialMediaFactory.fake(
    { user: USER_SOCIAL_MEDIA_ALL, type: SocialMediaType.EMAIL },
  );
  const RESUME_URL = 'https://acmucsd-local.s3.us-west-1.amazonaws.com/resumeSeedingData/alexface.pdf';

  const USER_VISIBLE_RESUME = UserFactory.fake();
  const RESUME_1 = ResumeFactory.fake({ user: USER_VISIBLE_RESUME, isResumeVisible: true, url: RESUME_URL });

  const USER_HIDDEN_RESUME = UserFactory.fake();
  const RESUME_2 = ResumeFactory.fake({ user: USER_HIDDEN_RESUME, isResumeVisible: false, url: RESUME_URL });

  // create members in bulk for testing things like sliding leaderboard in a realistic manner
  const otherMembers = UserFactory.create(200);
  const highAttendanceMembers = otherMembers.slice(0, 50);
  const moderateAttendanceMembers = otherMembers.slice(50, 125);
  const lowAttendanceMembers = otherMembers.slice(125, 150);

  const unstaffed = { requiresStaff: false, staffPointBonus: 0 };
  const staffed = { requiresStaff: true };
  const general = { commitee: 'ACM' };
  const hack = { committee: 'Hack' };
  const ai = { committee: 'AI' };

  const PAST_AI_WORKSHOP_1 = EventFactory.fake({
    title: 'AI: Intro to Neural Nets',
    description: `Artificial neural networks (ANNs), usually simply called
    neural networks (NNs), are computing systems vaguely inspired by the
    biological neural networks that constitute animal brains. An ANN is based
    on a collection of connected units or nodes called artificial neurons,
    which loosely model the neurons in a biological brain.`,
    ...ai,
    location: 'Qualcomm Room',
    ...EventFactory.daysBefore(6),
    attendanceCode: 'galaxybrain',
    ...staffed,
    foodItems: 'Boba',
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
    ...EventFactory.daysBefore(5),
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
    ...EventFactory.daysBefore(4),
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
    ...EventFactory.daysBefore(3),
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
    ...EventFactory.daysBefore(2),
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
    ...EventFactory.daysBefore(1),
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
    ...EventFactory.ongoing(90, 30),
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
    ...EventFactory.ongoing(30, 90),
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
    ...EventFactory.ongoing(45, 45),
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
    ...EventFactory.daysAfter(1),
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
    ...EventFactory.daysAfter(2),
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
    ...EventFactory.daysAfter(3),
    attendanceCode: 'f0rk',
    ...staffed,
  });
  const LONG_ACM_EVENT = EventFactory.fake({
    title: 'Winter 2022 Census',
    description: `Fill out our Winter 2022 census at https://acmurl.com/census! We
    appreciate your input and will continue to take your feedback to improve ACM.
    After checking in, you will automatically be entered into a raffle for a winter
    gift set!`,
    ...general,
    location: 'Online',
    ...EventFactory.daysLong(7),
    attendanceCode: 'c3nsus',
  });

  const MERCH_COLLECTION_1 = MerchFactory.fakeCollection({
    title: 'The Hack School Collection',
    description: 'Do you like to code? Tell the world with this Hack School inspired collection.',
    themeColorHex: '#EB8C34',
  });

  const MERCH_COLLECTION_1_PHOTO_1 = MerchFactory.fakeCollectionPhoto({
    merchCollection: MERCH_COLLECTION_1,
    position: 0,
  });
  const MERCH_COLLECTION_1_PHOTO_2 = MerchFactory.fakeCollectionPhoto({
    merchCollection: MERCH_COLLECTION_1,
    uploadedPhoto: 'https://www.fakepicture.com/',
    position: 1,
  });
  const MERCH_COLLECTION_1_PHOTO_3 = MerchFactory.fakeCollectionPhoto({
    merchCollection: MERCH_COLLECTION_1,
    uploadedPhoto: 'https://i.imgur.com/pSZ921P.png',
    position: 2,
  });

  MERCH_COLLECTION_1.collectionPhotos = [
    MERCH_COLLECTION_1_PHOTO_1,
    MERCH_COLLECTION_1_PHOTO_2,
    MERCH_COLLECTION_1_PHOTO_3,
  ];

  const MERCH_ITEM_1 = MerchFactory.fakeItem({
    collection: MERCH_COLLECTION_1,
    itemName: 'Unisex Hack School Anorak',
    description: 'San Diego has an average annual precipitation less than 12 inches,'
    + 'but that doesn\'t mean you don\'t need one of these.',
    monthlyLimit: 1,
    lifetimeLimit: 1,
    hidden: false,
    hasVariantsEnabled: true,
  });
  const MERCH_ITEM_1_OPTION_XS = MerchFactory.fakeOption({
    item: MERCH_ITEM_1,
    quantity: 5,
    price: 22500,
    discountPercentage: 20,
    metadata: {
      type: 'SIZE',
      value: 'XS',
      position: 0,
    },
  });
  const MERCH_ITEM_1_OPTION_S = MerchFactory.fakeOption({
    item: MERCH_ITEM_1,
    quantity: 5,
    price: 22500,
    discountPercentage: 0,
    metadata: {
      type: 'SIZE',
      value: 'S',
      position: 1,
    },
  });
  const MERCH_ITEM_1_OPTION_M = MerchFactory.fakeOption({
    item: MERCH_ITEM_1,
    quantity: 5,
    price: 22500,
    discountPercentage: 0,
    metadata: {
      type: 'SIZE',
      value: 'M',
      position: 2,
    },
  });
  const MERCH_ITEM_1_OPTION_L = MerchFactory.fakeOption({
    item: MERCH_ITEM_1,
    quantity: 5,
    price: 22500,
    discountPercentage: 10,
    metadata: {
      type: 'SIZE',
      value: 'L',
      position: 3,
    },
  });
  const MERCH_ITEM_1_OPTION_XL = MerchFactory.fakeOption({
    item: MERCH_ITEM_1,
    quantity: 5,
    price: 22500,
    discountPercentage: 0,
    metadata: {
      type: 'SIZE',
      value: 'XL',
      position: 4,
    },
  });
  MERCH_ITEM_1.options = [
    MERCH_ITEM_1_OPTION_XS,
    MERCH_ITEM_1_OPTION_S,
    MERCH_ITEM_1_OPTION_M,
    MERCH_ITEM_1_OPTION_L,
    MERCH_ITEM_1_OPTION_XL,
  ];
  // uploadedPhoto is 'https://www.fakepicture.com/' by default, test if this applies
  const MERCH_ITEM_1_PHOTO_0 = MerchFactory.fakePhoto({
    merchItem: MERCH_ITEM_1,
    position: 0,
  });
  const MERCH_ITEM_1_PHOTO_1 = MerchFactory.fakePhoto({
    merchItem: MERCH_ITEM_1,
    position: 1,
  });
  const MERCH_ITEM_1_PHOTO_2 = MerchFactory.fakePhoto({
    merchItem: MERCH_ITEM_1,
    uploadedPhoto: 'https://i.imgur.com/pSZ921P.png',
    position: 2,
  });
  MERCH_ITEM_1.merchPhotos = [
    MERCH_ITEM_1_PHOTO_0,
    MERCH_ITEM_1_PHOTO_1,
    MERCH_ITEM_1_PHOTO_2,
  ];

  const MERCH_ITEM_2 = MerchFactory.fakeItem({
    collection: MERCH_COLLECTION_1,
    itemName: 'Hack School Sticker Pack (4) - Cyan',
    description: 'Make space on your laptop cover for these Cyan stickers. Pack of 4, size in inches.',
    monthlyLimit: 5,
    lifetimeLimit: 25,
    hidden: false,
    hasVariantsEnabled: true,
  });
  const MERCH_ITEM_2_OPTION_2X2 = MerchFactory.fakeOption({
    item: MERCH_ITEM_2,
    quantity: 35,
    price: 1500,
    discountPercentage: 15,
    metadata: {
      type: 'SIZE',
      value: '2x2',
      position: 0,
    },
  });
  const MERCH_ITEM_2_OPTION_3X3 = MerchFactory.fakeOption({
    item: MERCH_ITEM_2,
    quantity: 20,
    price: 1500,
    discountPercentage: 5,
    metadata: {
      type: 'SIZE',
      value: '3x3',
      position: 1,
    },
  });
  const MERCH_ITEM_2_OPTION_4X4 = MerchFactory.fakeOption({
    item: MERCH_ITEM_2,
    quantity: 80,
    price: 1500,
    discountPercentage: 55,
    metadata: {
      type: 'SIZE',
      value: '4x4',
      position: 2,
    },
  });
  MERCH_ITEM_2.options = [
    MERCH_ITEM_2_OPTION_2X2,
    MERCH_ITEM_2_OPTION_3X3,
    MERCH_ITEM_2_OPTION_4X4,
  ];
  const MERCH_ITEM_2_PHOTO_0 = MerchFactory.fakePhoto({
    merchItem: MERCH_ITEM_2,
    position: 0,
  });
  const MERCH_ITEM_2_PHOTO_1 = MerchFactory.fakePhoto({
    merchItem: MERCH_ITEM_2,
    uploadedPhoto: 'https://i.imgur.com/pSZ921P.png',
    position: 1,
  });
  MERCH_ITEM_2.merchPhotos = [
    MERCH_ITEM_2_PHOTO_0,
    MERCH_ITEM_2_PHOTO_1,
  ];
  MERCH_COLLECTION_1.items = [MERCH_ITEM_1, MERCH_ITEM_2];

  const MERCH_COLLECTION_2 = MerchFactory.fakeCollection({
    title: 'Fall 2001',
    description: 'Celebrate the opening of Sixth College in style, featuring raccoon print jackets.',
  });

  const MERCH_COLLECTION_2_PHOTO_1 = MerchFactory.fakeCollectionPhoto({
    merchCollection: MERCH_COLLECTION_2,
    uploadedPhoto: 'https://www.fakepicture.com/',
    position: 1,
  });
  MERCH_COLLECTION_2.collectionPhotos = [MERCH_COLLECTION_2_PHOTO_1];

  const MERCH_ITEM_3 = MerchFactory.fakeItem({
    collection: MERCH_COLLECTION_2,
    itemName: 'Camp Snoopy Snapback',
    description: 'Guaranteed 2x return on Grailed.',
    monthlyLimit: 2,
    lifetimeLimit: 5,
    hidden: false,
    hasVariantsEnabled: false,
  });
  const MERCH_ITEM_3_OPTION = MerchFactory.fakeOption({
    item: MERCH_ITEM_3,
    quantity: 1,
    price: 8000,
    discountPercentage: 5,
  });
  MERCH_ITEM_3.options = [MERCH_ITEM_3_OPTION];
  const MERCH_ITEM_3_PHOTO_0 = MerchFactory.fakePhoto({
    merchItem: MERCH_ITEM_3,
    uploadedPhoto: 'https://i.imgur.com/QNdhfuO.png',
    position: 0,
  });
  const MERCH_ITEM_3_PHOTO_1 = MerchFactory.fakePhoto({
    merchItem: MERCH_ITEM_3,
    position: 1,
  });
  const MERCH_ITEM_3_PHOTO_2 = MerchFactory.fakePhoto({
    merchItem: MERCH_ITEM_3,
    uploadedPhoto: 'https://i.imgur.com/pSZ921P.png',
    position: 2,
  });
  const MERCH_ITEM_3_PHOTO_3 = MerchFactory.fakePhoto({
    merchItem: MERCH_ITEM_3,
    position: 3,
  });
  const MERCH_ITEM_3_PHOTO_4 = MerchFactory.fakePhoto({
    merchItem: MERCH_ITEM_3,
    position: 4,
  });
  MERCH_ITEM_3.merchPhotos = [
    MERCH_ITEM_3_PHOTO_0,
    MERCH_ITEM_3_PHOTO_1,
    MERCH_ITEM_3_PHOTO_2,
    MERCH_ITEM_3_PHOTO_3,
    MERCH_ITEM_3_PHOTO_4,
  ];

  const MERCH_ITEM_4 = MerchFactory.fakeItem({
    collection: MERCH_COLLECTION_2,
    itemName: 'Salt & Pepper (Canyon) Shakers',
    description: 'Salt and pepper not included.',
    monthlyLimit: 3,
    lifetimeLimit: 10,
    hidden: false,
    hasVariantsEnabled: false,
  });
  const MERCH_ITEM_4_OPTION = MerchFactory.fakeOption({
    item: MERCH_ITEM_4,
    quantity: 10,
    price: 2000,
    discountPercentage: 20,
  });
  MERCH_ITEM_4.options = [MERCH_ITEM_4_OPTION];
  const MERCH_ITEM_4_PHOTO_0 = MerchFactory.fakePhoto({
    merchItem: MERCH_ITEM_4,
    position: 0,
    uploadedPhoto: 'https://i.pinimg.com/originals/df/c5/72/dfc5729a0dea666c31c5f4daea851619.jpg',
  });
  MERCH_ITEM_4.merchPhotos = [MERCH_ITEM_4_PHOTO_0];
  const MERCH_ITEM_5 = MerchFactory.fakeItem({
    collection: MERCH_COLLECTION_2,
    itemName: 'Unisex Raccoon Print Shell Jacket',
    description: 'Self-explanatory.',
    monthlyLimit: 1,
    lifetimeLimit: 2,
    hidden: false,
    hasVariantsEnabled: true,
  });
  const MERCH_ITEM_5_MEDIUM = MerchFactory.fakeOption({
    item: MERCH_ITEM_5,
    quantity: 10,
    price: 19500,
    discountPercentage: 0,
    metadata: {
      type: 'SIZE',
      value: 'M',
      position: 1,
    },
  });
  const MERCH_ITEM_5_LARGE = MerchFactory.fakeOption({
    item: MERCH_ITEM_5,
    quantity: 10,
    price: 20500,
    discountPercentage: 0,
    metadata: {
      type: 'SIZE',
      value: 'L',
      position: 2,
    },
  });
  MERCH_ITEM_5.options = [MERCH_ITEM_5_MEDIUM, MERCH_ITEM_5_LARGE];
  const MERCH_ITEM_5_PHOTO_0 = MerchFactory.fakePhoto({
    merchItem: MERCH_ITEM_5,
    position: 0,
    uploadedPhoto: 'https://i.etsystatic.com/8812670/r/il/655afa/3440382093/il_340x270.3440382093_cbui.jpg',
  });
  MERCH_ITEM_5.merchPhotos = [MERCH_ITEM_5_PHOTO_0];
  MERCH_COLLECTION_2.items = [MERCH_ITEM_3, MERCH_ITEM_4, MERCH_ITEM_5];

  const PAST_ORDER_PICKUP_EVENT = MerchFactory.fakeOrderPickupEvent({
    title: 'ACM Merch Distribution Event 1',
    description: 'This is a test event to pickup orders from. It has already passed :(',
    orderLimit: 10,
    start: moment().subtract(3, 'days').subtract(2, 'hours').toDate(),
    end: moment().subtract(3, 'days').toDate(),
  });
  const ONGOING_ORDER_PICKUP_EVENT = MerchFactory.fakeOrderPickupEvent({
    title: 'ACM Merch Distribution Event 2',
    description: 'Another test event',
    orderLimit: 10,
    start: moment().subtract(30, 'minutes').toDate(),
    end: moment().add(90, 'minutes').toDate(),
  });
  const FUTURE_ORDER_PICKUP_EVENT = MerchFactory.fakeFutureOrderPickupEvent({
    title: 'Example Other Order Pickup Event',
    description: 'This is another test event to pickup orders from.',
    orderLimit: 10,
  });

  // FEEDBACK SEEDING

  // Event with multiple feedbacks: PAST_AI_WORKSHOP_1
  const FEEDBACK_SAME_EVENT_1 = FeedbackFactory.fake({ user: USER_FEEDBACK_1,
    event: PAST_AI_WORKSHOP_1,
    description: 'Man this #$%& sucks',
    type: FeedbackType.AI });
  const FEEDBACK_SAME_EVENT_2 = FeedbackFactory.fake({ user: USER_FEEDBACK_2,
    event: PAST_AI_WORKSHOP_1,
    type: FeedbackType.AI });

  // User with multiple feedbacks: USER_FEEDBACK_3
  const FEEDBACK_SAME_USER_1 = FeedbackFactory.fake({ user: USER_FEEDBACK_3,
    event: PAST_AI_WORKSHOP_1,
    type: FeedbackType.CYBER });

  const FEEDBACK_SAME_USER_2 = FeedbackFactory.fake({ user: USER_FEEDBACK_3,
    event: PAST_AI_WORKSHOP_2,
    type: FeedbackType.GENERAL });

  const FEEDBACK_SUBMITTED = FeedbackFactory.fake({ user: USER_FEEDBACK_3,
    event: PAST_AI_WORKSHOP_1,
    status: FeedbackStatus.SUBMITTED,
    type: FeedbackType.INNOVATE });

  const FEEDBACK_IGNORED = FeedbackFactory.fake({ user: USER_FEEDBACK_3,
    event: PAST_AI_WORKSHOP_1,
    status: FeedbackStatus.IGNORED,
    type: FeedbackType.GENERAL });

  const FEEDBACK_ACKNOWLEDGED = FeedbackFactory.fake({ user: USER_FEEDBACK_3,
    event: PAST_AI_WORKSHOP_1,
    status: FeedbackStatus.ACKNOWLEDGED,
    type: FeedbackType.BIT_BYTE });

  await new PortalState()
    .createUsers(
      ADMIN,
      STAFF_AI,
      STAFF_GENERAL,
      STAFF_HACK,
      MEMBER_FRESHMAN,
      MEMBER_SOPHOMORE,
      MEMBER_JUNIOR,
      MEMBER_SENIOR,
      USER_STORE,
      USER_RESTRICTED,
      USER_STANDARD,
      USER_STAFF,
      USER_ADMIN,
      USER_MARKETING,
      USER_MERCH_STORE_MANAGER,
      USER_MERCH_STORE_DISTRIBUTOR,
      USER_SPONSORSHIP_MANAGER,
      USER_SOCIAL_MEDIA_1,
      USER_SOCIAL_MEDIA_2,
      USER_SOCIAL_MEDIA_3,
      USER_SOCIAL_MEDIA_ALL,
      USER_FEEDBACK_1,
      USER_FEEDBACK_2,
      USER_FEEDBACK_3,
      USER_VISIBLE_RESUME,
      USER_HIDDEN_RESUME,
      ...otherMembers,
    )
    .createEvents(
      PAST_AI_WORKSHOP_1,
      PAST_HACK_WORKSHOP,
      PAST_ACM_SOCIAL_1,
      PAST_AI_WORKSHOP_2,
      PAST_ACM_PANEL,
      PAST_ACM_SOCIAL_2,
      LONG_ACM_EVENT,
    )
    .attendEvents([
      STAFF_AI,
      STAFF_GENERAL,
      MEMBER_FRESHMAN,
      MEMBER_SOPHOMORE,
      MEMBER_JUNIOR,
      MEMBER_SENIOR,
      ...highAttendanceMembers,
    ], [PAST_AI_WORKSHOP_1], true)
    .attendEvents([
      STAFF_HACK,
      STAFF_AI,
      MEMBER_SOPHOMORE,
      MEMBER_JUNIOR,
      MEMBER_SENIOR,
      ...highAttendanceMembers,
      ...moderateAttendanceMembers,
    ], [PAST_HACK_WORKSHOP], true)
    .attendEvents([
      STAFF_GENERAL,
      STAFF_HACK,
      MEMBER_FRESHMAN,
      MEMBER_SOPHOMORE,
      ...highAttendanceMembers,
    ], [PAST_ACM_SOCIAL_1], false)
    .attendEvents([
      STAFF_AI,
      STAFF_HACK,
      MEMBER_SOPHOMORE,
      MEMBER_SENIOR,
      ...moderateAttendanceMembers,
    ], [PAST_AI_WORKSHOP_2], true)
    .attendEvents([
      STAFF_GENERAL,
      MEMBER_FRESHMAN,
      MEMBER_SOPHOMORE,
      MEMBER_JUNIOR,
      ...highAttendanceMembers,
    ], [PAST_ACM_PANEL], true)
    .attendEvents([
      STAFF_GENERAL,
      STAFF_AI,
      MEMBER_FRESHMAN,
      MEMBER_JUNIOR,
      MEMBER_SENIOR,
      ...lowAttendanceMembers,
    ], [PAST_ACM_SOCIAL_2], true)
    .createEvents(
      ONGOING_ACM_SOCIAL_1,
      ONGOING_ACM_SOCIAL_2,
      ONGOING_HACK_WORKSHOP,
    )
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
    .createEvents(
      FUTURE_AI_SOCIAL,
      FUTURE_HACK_WORKSHOP_1,
      FUTURE_HACK_WORKSHOP_2,
    )
    .createMerchCollections(
      MERCH_COLLECTION_1,
      MERCH_COLLECTION_2,
    )
    .createOrderPickupEvents(PAST_ORDER_PICKUP_EVENT, ONGOING_ORDER_PICKUP_EVENT, FUTURE_ORDER_PICKUP_EVENT)
    .orderMerch(USER_STORE, [{ option: MERCH_ITEM_1_OPTION_M, quantity: 1 }], PAST_ORDER_PICKUP_EVENT)
    .orderMerch(USER_STORE, [{ option: MERCH_ITEM_1_OPTION_L, quantity: 1 }], PAST_ORDER_PICKUP_EVENT)
    .orderMerch(MEMBER_JUNIOR, [{ option: MERCH_ITEM_2_OPTION_4X4, quantity: 2 }], PAST_ORDER_PICKUP_EVENT)
    .orderMerch(USER_STORE, [{ option: MERCH_ITEM_2_OPTION_3X3, quantity: 1 }], ONGOING_ORDER_PICKUP_EVENT)
    .orderMerch(MEMBER_FRESHMAN, [{ option: MERCH_ITEM_2_OPTION_3X3, quantity: 1 }], ONGOING_ORDER_PICKUP_EVENT)
    .orderMerch(MEMBER_SOPHOMORE, [{ option: MERCH_ITEM_2_OPTION_2X2, quantity: 1 }], ONGOING_ORDER_PICKUP_EVENT)
    .orderMerch(MEMBER_SOPHOMORE, [{ option: MERCH_ITEM_2_OPTION_2X2, quantity: 1 }], ONGOING_ORDER_PICKUP_EVENT)
    .orderMerch(MEMBER_JUNIOR, [{ option: MERCH_ITEM_2_OPTION_4X4, quantity: 2 }], ONGOING_ORDER_PICKUP_EVENT)
    .orderMerch(MEMBER_SENIOR, [{ option: MERCH_ITEM_2_OPTION_3X3, quantity: 1 }], ONGOING_ORDER_PICKUP_EVENT)
    .createUserSocialMedia(USER_SOCIAL_MEDIA_1, USER_SOCIAL_MEDIA_1_FACEBOOK)
    .createUserSocialMedia(USER_SOCIAL_MEDIA_2, USER_SOCIAL_MEDIA_2_FACEBOOK, USER_SOCIAL_MEDIA_2_GITHUB)
    .createUserSocialMedia(USER_SOCIAL_MEDIA_3, USER_SOCIAL_MEDIA_3_FACEBOOK, USER_SOCIAL_MEDIA_3_INSTAGRAM,
      USER_SOCIAL_MEDIA_3_LINKEDIN)
    .createUserSocialMedia(USER_SOCIAL_MEDIA_ALL, USER_SOCIAL_MEDIA_ALL_FACEBOOK, USER_SOCIAL_MEDIA_ALL_GITHUB,
      USER_SOCIAL_MEDIA_ALL_INSTAGRAM,
      USER_SOCIAL_MEDIA_ALL_LINKEDIN, USER_SOCIAL_MEDIA_ALL_DEVPOST, USER_SOCIAL_MEDIA_ALL_TWITTER,
      USER_SOCIAL_MEDIA_ALL_PORTFOLIO, USER_SOCIAL_MEDIA_ALL_EMAIL)
    .createResumes(USER_VISIBLE_RESUME, RESUME_1)
    .createResumes(USER_HIDDEN_RESUME, RESUME_2)
    .createFeedback(FEEDBACK_SAME_EVENT_1, FEEDBACK_SAME_EVENT_2, FEEDBACK_SAME_USER_1, FEEDBACK_SAME_USER_2,
      FEEDBACK_ACKNOWLEDGED, FEEDBACK_IGNORED, FEEDBACK_SUBMITTED)
    .write();
}

seed();
