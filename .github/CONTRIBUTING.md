# Contributing
The membership portal is an open-source project, made for members by members, and we welcome any contributions! This project is maintained by ACM UCSD's development team.

+ [Getting Started](#getting-started)
+ [Project Structure](#project-structure)
  + [API Specification](#api-specification)
  + [API Implementation](#api-implementation)
    + [Endpoints](#endpoints)
    + [Services](#services)
    + [Database](#database)
  + [Testing](#testing)
  + [Tooling](#tooling)
  + [Other Considerations](#other-considerations)

## Getting Started
Issues in our projects are kind of like conversations; when we find a problem or propose an idea, we open an issue and discuss in the comments.  **You can look through our open issues [here](https://github.com/acmucsd/membership-portal/issues)**; if you see something you're interested in working on, feel free to leave a comment with any questions you might have, and one of our maintainers will follow up with you. **You can also message `@Development` on the ACM UCSD Discord** and ask about our current priorities.

**If you're here on behalf of another team looking to use this API, e.g. a side project or some other app, message `@Development` on the main Discord server and schedule a meeting with our backend team to discuss API use cases** so we're aware of and can plan for any incoming traffic from your app. And, when considering the entire tech architecture of our chapter, the features you're looking to build on top of the API in your app might better fit within the application boundaries of the portal itself; that's been the case for many API clients historically. Future teams can make use of that same functionality, and we can avoid disconnected apps and data siloes, as our membership data is deeply useful for building a higher-quality organization.

**Please make sure to discuss your approach with a maintainer before starting any work** so that we can catch any major issues early. **Once you're ready to start coding, check out the README for instructions on getting the API running locally.** If any of our documentation is unclear or outdated, or you think our codebase could be doing something better, please suggest changes to make things easier for the next contributor!

Once your functionality is implemented, open up a PR and a maintainer will review it as soon as possible. Anecdotally, most of our bigger PRs go through several rounds of review before merging, so if you're implementing a feature for an API client, be sure to start early, start often to meet your team's deadlines. If you're stuck or confused at any point, please don't hesitate to ask one of our maintainers for help.

## Project Structure
There're a lot of moving parts in this codebase and making simple changes can be daunting as a first-time contributor, so this section breaks down all the areas of the codebase you might need to edit to make your changes.

### API Specification
You can find our API specification [here](https://documenter.getpostman.com/view/12949536/TVRedVwQ). It'll tell you about all the endpoints our API exposes and what each does. All the types in our specification, e.g. requests, responses, user profiles, merch orders, are defined in the `types` folder, and if you're adding a route or modifying an existing one, you'll first need to edit these types and update our documentation. Message us for Postman credentials.

### API Implementation
At a high level, our API is implemented in three layers: the endpoints layer, the services layer, and the data layer. The endpoints layer calls the services layer and the servies layer calls the data layer.

#### Endpoints
If you make a request to some endpoint, that request will be received in our endpoints layer, which handles anything that has to do with our routing logic, with requests and responses. This includes
+ executing middleware (e.g. verifying the authentication token that comes attached to most requests),
+ validating requests (ensuring that the request is formatted as required by our API specification, that no fields are missing, that numeric fields are numbers and not strings, etc.),
+ checking permissions,
+ calling the services layer with any relevant request data,
+ and sending back the response.

This layer lives inside our `api` folder. In the unlikely event you'll need to write middleware, that'll go in the `middleware` folder. The `controllers` folder is where the bulk of our routing logic lives; within each controller, you'll see the API routes corresponding to that controller, e.g. `UserController` holds the routes under `/api/user`. Most of these routes require some sort of request body&mdash;the same request bodies you specified in the `types` folder&mdash;, and these request bodies need to be validated; to do so, create classes in the `validators` folder implementing the interfaces from the `types` folder. That leaves the actual endpoint code in the controllers, which should take any relevant data from the requests and call the services layer. Occasionally, requests have to be further validated in the controller, such as to ensure there're no duplicate or out-of-order elements in an array.

+ [Express](https://github.com/expressjs/express) is a web framework we use
+ [routing-controllers](https://github.com/typestack/routing-controllers) is a library we use on top of Express
+ [class-validator](https://github.com/typestack/class-validator) is a library we use for decorator-based validation

#### Services
The services layer is made up of all the actual "business logic" of the portal, the rules of the system (e.g. "a user can only attend an event once"). Each service is some grouping of functionality; for example, the `EventService` contains all code for creating events, reading events, etc. All our services can be found in the `services` folder.

Since most service methods interact with our data layer, they open a data transaction, in which all data layer calls go. For example, the service method for a user attending an event opens a transaction, checks if the user has already attended the event, creates an attendance record as appropriate, and closes the transaction. This is for concurrency reasons: membership points wouldn't mean much if a user could send multiple duplicate requests in a single second and check into the same event several times, so we push concurrency down to the database, which's better suited to handle that. Transactions can be `readOnly` or `readWrite`, substitutes for the strict `REPEATABLE_READS` and `SERIALIZABLE` isolation levels. You can technically still write data using a `readOnly` transaction, but we really discourage that; those substitutes were specifically chosen because we prioritize correctness and strong concurrency guarantees before marginal gains in performance and some of our most fundamental code is sensitive to write skews (e.g. attending events, ordering merch) so transactions must be `SERIALIZABLE` in those cases.

+ for the curious, the Wikipedia article on [isolation in database systems](https://en.wikipedia.org/wiki/Isolation_(database_systems)) (but this isn't something you need to know anything about since the `readOnly`/`readWrite` abstractions exist)

#### Database
The services layer defines all the rules of our portal statelessly&mdash;our ACM UCSD data could be replaced by another chapter's data and the portal would still function the same&mdash;, so it's our data that makes up the state of our application. As such, it's important to maintain a healthy application state and protect against data loss and general weirdness; we keep database backups as often as possible, thoroughly test any changes we make to our data, and use a relational database (PostgreSQL) to ensure our data conforms to a strict and unchanging schema (among the other usual reasons).

Modifying the schema requires not only direct edits to the data models (found in the `models` folder) but also schema migrations (found in the `migrations` folder). Schema migrations are procedures for changing the schema from an older version (such as the schema currently running in production) to your modified version. To write a schema migration, take a look at the [relevant TypeORM documentation](https://github.com/typeorm/typeorm/blob/master/docs/migrations.md) and [existing migrations](https://github.com/acmucsd/membership-portal/tree/master/migrations). Everything's already configured via [`ormconfig.ts`](https://github.com/acmucsd/membership-portal/blob/master/ormconfig.ts) so running `npm run db:migrate` will execute your migration(s). Finally, we have our data repositories, which contain predefined data queries that abstract away database interactions such as complex SQL queries and can be easily called by services, in the `repositories` folder. All data in use by the application should be immutable, and the services should not interact with the database except through repository methods. This means preferring `userRepository.update(user, changes)` to `user.field = value; user.save()`.

+ [TypeORM](https://github.com/typeorm/typeorm/) is a library we use to manage our data models

## Testing
"Software engineering is the integral of coding over time"; to build a reliable system over several years, we rely on tests to verify that we've implemented changes correctly without breaking anything unexpected in the process, that we throw errors when appropriate, and that we've handled forgettable edge cases. 

The tests we've defined can be found in the `tests` folder, and currently contain tests for the API layer. These tests are written with [Jest](https://jestjs.io/), with mocking done with [ts-mockito](https://github.com/NagRock/ts-mockito) (a TypeScript version of the popular [Mockito](https://site.mockito.org/) library in Java). We don't test specific functions in the service or repository layer, since given the heirarchical structure of our layers, correctness at the API layer implies correctness in the service and repository layers.

### Test Design

Our tests are a mix of unit and integration tests &mdash; we will often test that specific API routes work as intended and can handle different scenarios as a unit, but we also test that the API route works in tandem with other routes if a given user flow uses those routes. For example, in our merch store, we have a feature where users can cancel orders that they placed. An example unit test could be: 'cancelling an order refunds the user the amount of credits they spent on that order'. However, there are other interactions that can depend on this route, such as if a user has their order fulfilled. So a more 'integrated' test could be: 'cancelling an already fulfilled order is not allowed', which uses both the 'cancel order' and 'fulfill order' functionalities in a single test.

### Test Structure
Every test consists of 3 main parts: setup, execution, and assertion. The setup step involves creating any data and dependencies that are needed for that specific functionality to be tested. The execution step is when the code we are testing gets executed, and the assertion step checks the correctness of the executed code across any variables or models that were updated. 

#### Setup

Below is an example merch store test that ensures members earn both points and credits for attending an event. The setup involves retrieving a `Connection` object via. the `DatabaseConnection` class (so we can write data to the database later on), and creating a fake member to check into a fake event. Every test will need to start by getting a `Connection` object, because the actual operations that take place on persistent data depend on it (see section on `ControllerFactory`).

```ts
test('members can attend events for points and credits', async () => {
  const conn = await DatabaseConnection.get();
  const member = UserFactory.fake();
  const event = EventFactory.fake(EventFactory.ongoing());
```

##### Test Factories
Factories are a construct we built as a simple and ergonomic way of creating fake data needed for tests. They can be found in our `tests/data` directory. Every factory defines ways to create objects in bulk (with the `create(n)` methods), and to create individual objects but with specific values (with the `fake(substitute?: FactoryModel`) methods).

For example, the below snippet would create 10 fake users, each with their own emails, first names, last names, etc., and each with 0 points and credits (as specified in the `UserFactory::fake` implementation):
```ts
const members = UserFactory.create(10);
```
And the below snippet would create a single fake user with 10000 credits:
```ts
const member = UserFactory.fake({ credits: 10000 });
```
while the below snippet would create a single fake user with 0 points.
```ts
const member = UserFactory.fake();
```

Certain factories, like the MerchFactory, create fake data heirarchically since the data models regarding merchandise are heirarchical in fashion (with MerchCollections containing 1 or more MerchItems, each containing one or more MerchItemOptions), so it is important to be careful how you are creating fake objects with those and making sure all relationship constraints between objects are valid (e.g. a MerchItem requiring at least 1 MerchItemOption)

##### PortalState

PortalState (found in `tests/data/PortalState.ts`) is a mechanism we built to quickly write all the fake data generated to the database, as well as to perform any relevant portal operations on that data, if that level of setup is needed (such as ordering merch for making sure fulfilling merch works properly). In every test, you'll see at least one usage of PortalState, which is generally for inserting the data generated by the Factory methods into the database.  

Below is an example usage of PortalState in the same test as above:
```ts
test('members can attend events for points and credits', async () => {
  const conn = await DatabaseConnection.get();
  const member = UserFactory.fake();
  const event = EventFactory.fake(EventFactory.ongoing());

  await new PortalState()
    .createUsers(member)
    .createEvents(event)
    .write();
```
After the PortalState call is finished, the database is populated with the fake data generated above, so any API calls made will operate on data persisted in the database. This is a requirement in order to test any functionality during the execution step of a test, since any type of API functionality depends on some kind of persisted data.

#### Execution

During the execution step, we build the request for the API route we want to access, call that API route, and store the response in a variable (or alternatively, assert if that route threw an error). We use the `ControllerFactory` utility class to generate controller objects that we can directly call via. a function call, rather than needing to make an API request with a library like `fetch`.

```ts
test('members can attend events for points and credits', async () => {
  const conn = await DatabaseConnection.get();
  const member = UserFactory.fake();
  const event = EventFactory.fake(EventFactory.ongoing());

  await new PortalState()
    .createUsers(member)
    .createEvents(event)
    .write();

  // attend event
  const attendanceController = ControllerFactory.attendance(conn);
  const attendEventRequest = { attendanceCode: event.attendanceCode };
  await attendanceController.attendEvent(attendEventRequest, member);
```

##### ControllerFactory

`ControllerFactory` automatically injects any service the controller depends on, so that the test writer does not need to worry about creating any of the dependencies for that controller. If, however, you need to pass in a mocked version of a service into a controller (see the section on 'mocking' below for details), then you can do so by passing that service into the resective `ControllerFactory` generator function. 

Below is a more involved example that uses `ControllerFactory` with a mocked version of `EmailService`:

```ts
  test('members can reschedule their pickup if their current pickup event is cancelled', async () => {
    // setup
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const option = MerchFactory.fakeOption({
      quantity: 2,
      price: 2000,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();
    const anotherPickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member, merchDistributor)
      .createMerchItemOptions(option)
      .createOrderPickupEvents(pickupEvent, anotherPickupEvent)
      .write();

    // mock the EmailService to make sure that sendOrderConfirmation and sendOrderCancellation do not actually send any emails to the fake member's emails.
    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .thenResolve();
    when(emailService.sendOrderPickupUpdated(member.email, member.firstName, anything()))
      .thenResolve();

    // execution
    const order = [
      {
        option: option.uuid,
        quantity: 1,
      },
    ];
    const placeMerchOrderRequest = {
      order,
      pickupEvent: pickupEvent.uuid,
    };
    const merchController = ControllerFactory.merchStore(conn, instance(emailService)); // pass in an instance of mocked emailService here
    const placedOrderResponse = await merchController.placeMerchOrder(placeMerchOrderRequest, member);
```

##### Mocking
Mocking is a software engineering technique in testing that essentially simulates the behavior of an actual class or method in a pre-defined way. Conceptually, this might be tricky to understand, but it may help to look at an example first. In the above code snippet, the following lines demonstrate mocking:
```ts
const emailService = mock(EmailService);
when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
  .thenResolve();
when(emailService.sendOrderPickupUpdated(member.email, member.firstName, anything()))
  .thenResolve();
```
Firstly, a mock instance of `emailService` is created using the `mock()` function provided by the `ts-mockito` package. Then, we define what the behavior of the functions that *would* be called in the test should be. For the above example, since we are calling placing merch orders in our test, normally an email would be sent as confirmation that the order was placed. In tests, however, we don't want to send any emails, since the emails we are generating are most oftenly fake emails (with the small off-chance that they are real emails, in which case they might think their email was hacked). So, instead of using the implementation defined in the `EmailService::sendOrderConfirmation` method, we are specifying in the above snippet to simply resolve the function call (since the `sendOrderConfirmation` function returns a Promise), meaning the function will not do anything.

#### Assertion

In the last step of testing, we assert that the return values of the execution stage are what they should be. We use standard Jest functionality like `expect()` or standard ts-mockito functionality like `verify()` to make sure return values are what they should be, and that mocked classes ended up calling the functions that they should have.

```ts
test('members can attend events for points and credits', async () => {
  // setup
  const conn = await DatabaseConnection.get();
  const member = UserFactory.fake();
  const event = EventFactory.fake(EventFactory.ongoing());

  await new PortalState()
    .createUsers(member)
    .createEvents(event)
    .write();

  // execution
  const attendanceController = ControllerFactory.attendance(conn);
  const attendEventRequest = { attendanceCode: event.attendanceCode };
  await attendanceController.attendEvent(attendEventRequest, member);

  // assertions (this example has multiple)
  const userController = ControllerFactory.user(conn);
  const getUserResponse = await userController.getCurrentUser(member);
  expect(getUserResponse.user.points).toEqual(event.pointValue);
  expect(getUserResponse.user.credits).toEqual(event.pointValue * 100);

  // check user activities
  const getUserActivitiesResponse = await userController.getCurrentUserActivityStream(member);
  const attendanceActivity = getUserActivitiesResponse.activity[getUserActivitiesResponse.activity.length - 1];
  expect(attendanceActivity.type).toEqual(ActivityType.ATTEND_EVENT);
  expect(attendanceActivity.pointsEarned).toEqual(event.pointValue);

  // check attendances for user
  const getAttendancesForUserResponse = await attendanceController.getAttendancesForCurrentUser(member);
  const attendance = getAttendancesForUserResponse.attendances[0];
  expect(attendance.user.uuid).toEqual(member.uuid);
  expect(attendance.event.uuid).toEqual(event.uuid);
});
```

If you need to assert the specific structure of an array or specific properties of an object and are not quite sure how to do so (e.g. with the `expect().arrayContaining()` paradigm), use other tests as examples before looking anything up. We strive to keep coding conventions the same across each test, so aim to use common conventions over something more unique.


## Tooling
Our tooling is meant to keep our codebase in good health and run the portal in production with as little manual intervention as possible. Our CI/CD pipeline ties everything together, verifying that PRs meet some criteria before allowing them to merge and then deploying our updated app to its production environment and publishing it to the npm registry as needed. All PRs must be linted TypeScript code with no failing tests. See the ["Useful Commands"](https://github.com/acmucsd/membership-portal#useful-commands) section of the README for the npm scripts to compile the code, lint the code, and run the tests.

## Other Considerations
This project's been built with a few development principles in mind: we care about correctness, readability, and ease of maintenance. Performance isn't a major concern and we don't heavily optimize, given that this is a fairly simple app that can be comfortably run at decent scale, but we do care about it broadly, e.g. in establishing useful database indexes and efficient access patterns.
