## Contributing
The membership portal is an open-source project, for members by members, and we welcome any contributions! This project is maintained by ACM UCSD's development team.

### Getting Started
Issues in our projects are kind of like conversations; when we find a problem or propose an idea, we open an issue and discuss in the comments.  **You can look through our open issues [here](https://github.com/acmucsd/membership-portal/issues)**; if you see something you're interested in working on, feel free to leave a comment with any questions you might have, and one of our maintainers will follow up with you. **You can also message `@Development` on the ACM UCSD Discord** and ask about our current priorities.

**If you're here on behalf of another team looking to use this API, e.g. a side project or some other app, message `@Development` on the main Discord server and schedule a meeting with our backend team to discuss API use cases** so we're aware of and can plan for any incoming traffic from your app. And, when considering the entire tech architecture of our chapter, the features you're looking to build on top of the API in your app might better fit within the application boundaries of the portal itself; that's been the case for many API clients historically. Future teams can make use of that same functionality, and we can avoid disconnected apps and data siloes, as our membership data is deeply useful for building a higher-quality organization.

**Please make sure to discuss your approach with a maintainer before starting any work** so that we can catch any major issues early. **Once you're ready to start coding, check out the README for instructions on getting the API running locally.** If any of our documentation is unclear or outdated, or you think our codebase could be doing something better, please suggest changes to make things easier for the next contributor!

Once your functionality is implemented, open up a PR and a maintainer will review it as soon as possible. Anecdotally, most of our bigger PRs go through several rounds of review before merging, so if you're implementing a feature for an API client, be sure to start early, start often to meet your team's deadlines. If you're stuck or confused at any point, please don't hesitate to ask one of our maintainers for help.

### Project Structure
There're a lot of moving parts in this codebase and making simple changes can be daunting as a first-time contributor, so this section breaks down all the areas of the codebase you might need to edit to make your changes.

#### API Specification
You can find our API specification [here](https://documenter.getpostman.com/view/12949536/TVRedVwQ). It'll tell you about all the endpoints our API exposes and what each does. All the types in our specification, e.g. requests, responses, user profiles, merch orders, are defined in the `types` folder, and if you're adding a route or modifying an existing one, you'll first need to edit these types.

#### API Implementation
At a high level, our API is implemented in three layers: the endpoints layer, the services layer, and the data layer. The endpoints layer calls the services layer and the servies layer calls the data layer.

##### Endpoints
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

##### Services
The services layer is made up of all the actual "business logic" of the portal, the rules of the system (e.g. "a user can only attend an event once"). Each service is some grouping of functionality; for example, the `EventService` contains all code for creating events, reading events, etc. All our services can be found in the `services` folder.

Since most service methods interact with our data layer, they open a data transaction, in which all data layer calls go. For example, the service method for a user attending an event opens a transaction, checks if the user has already attended the event, creates an attendance record as appropriate, and closes the transaction. This is for concurrency reasons: membership points wouldn't mean much if a user could send multiple duplicate requests in a single second and check into the same event several times, so we push concurrency down to the database, which's better suited to handle that. Transactions can be `readOnly` or `readWrite`, substitutes for the strict `REPEATABLE_READS` and `SERIALIZABLE` isolation levels. You can technically still write data using a `readOnly` transaction, but we really discourage that; those substitutes were specifically chosen because we prioritize correctness and strong concurrency guarantees before marginal gains in performance and some of our most fundamental code is sensitive to write skews (e.g. attending events, ordering merch) so transactions must be `SERIALIZABLE` in those cases.

+ for the curious, the Wikipedia article on [isolation in database systems](https://en.wikipedia.org/wiki/Isolation_(database_systems)) (but this isn't something you need to know anything about since the `readOnly`/`readWrite` abstractions exist)

##### Database
The services layer defines all the rules of our portal statelessly&mdash;our ACM UCSD data could be replaced by another chapter's data and the portal would still function the same&mdash;, so it's our data that makes up the state of our application. As such, it's important to maintain a healthy application state and protect against data loss and general weirdness; we keep database backups as often as possible, thoroughly test any changes we make to our data, and use a relational database (PostgreSQL) to ensure our data conforms to a strict and unchanging schema (among the other usual reasons).

Modifying the schema requires not only direct edits to the data models (found in the `models` folder) but also schema migrations (found in the `migrations` folder). Schema migrations are procedures for changing the schema from an older version (such as the schema currently running in production) to your modified version. Finally, we have our data repositories, which contain predefined data queries that abstract away database interactions such as complex SQL queries and can be easily called by services, in the `repositories` folder. All data in use by the application should be immutable, and the services should not interact with the database except through repository methods. This means preferring `userRepository.update(user, changes)` to `user.field = value; user.save()`.

+ [TypeORM](https://github.com/typeorm/typeorm/) is a library we use to manage our data models

#### Testing
"Software engineering is the integral of coding over time"; to build a reliable system over several years, we rely on tests to verify that we've implemented changes correctly without breaking anything unexpected in the process, that we throw errors when appropriate, and that we've handled forgettable edge cases. This is currently a bit of a work in progress, but it's something to keep in mind as you're developing&mdash;the use cases to be tested&mdash;and once we've established some examples and work towards testing the entire system, we'll expect you to write tests for your own PRs.

#### Other Considerations
This project's been built with a few development principles in mind: we care about correctness, readability, and ease of maintenance. Performance isn't a major concern and we don't heavily optimize, given that this is a fairly simple app that can be comfortably run at decent scale, but we do care about it broadly, e.g. in establishing useful database indexes and efficient access patterns.
